#!/bin/sh

# Wait for database to be ready
echo "Waiting for report database to be ready..."
MAX_RETRIES=30
COUNT=0
until pg_isready -h report-db -U postgres || [ $COUNT -eq $MAX_RETRIES ]; do
    echo "Waiting for report database to be ready... ($COUNT/$MAX_RETRIES)"
    sleep 2
    COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
    echo "Error: Timed out waiting for database to be ready"
    exit 1
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Apply database migrations with retries
echo "Applying database migrations for report-service..."
MAX_MIGRATION_RETRIES=5
MIGRATION_COUNT=0
until npx prisma migrate deploy || [ $MIGRATION_COUNT -eq $MAX_MIGRATION_RETRIES ]; do
    MIGRATION_COUNT=$((MIGRATION_COUNT+1))
    echo "Migration attempt $MIGRATION_COUNT of $MAX_MIGRATION_RETRIES failed, retrying in 5 seconds..."
    sleep 5
done

if [ $MIGRATION_COUNT -eq $MAX_MIGRATION_RETRIES ]; then
    echo "Error: Failed to apply migrations after $MAX_MIGRATION_RETRIES attempts"
    # Continue anyway - we'll check the database connection in the app
fi

# Set NODE_ENV for proper error handling
export NODE_ENV=${NODE_ENV:-development}

# Start the application
echo "Starting report-service..."
exec npm start
