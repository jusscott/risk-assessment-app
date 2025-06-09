#!/bin/bash
# Wait for the database to be ready
echo "Waiting for PostgreSQL to be ready..."

# Function to check if PostgreSQL is ready
check_postgres() {
  echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1
  return $?
}

# Wait for PostgreSQL to be ready with retries
postgres_ready=false
retries=30
count=0

while [ $count -lt $retries ] && [ "$postgres_ready" = false ]; do
  if check_postgres; then
    postgres_ready=true
    echo "PostgreSQL is ready!"
  else
    echo "PostgreSQL is not ready yet. Waiting... ($count/$retries)"
    sleep 2
    count=$((count + 1))
  fi
done

if [ "$postgres_ready" = false ]; then
  echo "Error: PostgreSQL did not become ready in time. Exiting."
  exit 1
fi

# Check if migrations directory exists
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "No migrations found. Creating initial migration..."
    # Create migrations directory if it doesn't exist
    mkdir -p prisma/migrations
    
    # Create and apply initial migration
    npx prisma migrate dev --name init --create-only
    npx prisma generate
fi

# Apply migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Ensure the Prisma client is properly generated with correct binary targets
echo "Regenerating Prisma client with correct binary targets..."
npx prisma generate

# Ensure all dependencies are installed
echo "Installing dependencies..."
npm install --quiet
npm install --quiet --save bcryptjs
npm install --quiet --save-dev @types/bcryptjs

# Start the application
echo "Starting Auth Service..."
exec npx ts-node src/index.ts
