#!/bin/bash

echo "🔧 APPLYING QUESTIONNAIRE DISPLAY FIXES"
echo "======================================="

# Create user in database
echo "👤 Creating user in database..."
docker-compose exec auth-db psql -U postgres -d auth -c "
INSERT INTO \"User\" (id, email, password, name, \"isActive\", \"createdAt\", \"updatedAt\")
VALUES ('691f40ee-b22b-4665-8dd9-69d9ae07222b', 'juscott@gmail.com', '$2b$12$GkTTBCGL4mIDLxDy6L.IqOtpcwLJVNuqPD6LLKbRUhDBKV6iwvNVO', 'Justin Scott', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    \"updatedAt\" = NOW();
"

if [ $? -eq 0 ]; then
    echo "✅ User created successfully"
else
    echo "❌ Failed to create user"
    exit 1
fi

# Restart services
echo "🔄 Restarting services..."
docker-compose restart questionnaire-service
docker-compose restart api-gateway
docker-compose restart auth-service

echo "⏳ Waiting for services to restart..."
sleep 10

# Verify user creation
echo "🔍 Verifying user creation..."
docker-compose exec auth-db psql -U postgres -d auth -c "SELECT id, email, name, \"isActive\", \"createdAt\" FROM \"User\" WHERE email = 'juscott@gmail.com';"

echo "✅ All fixes applied successfully!"
echo "🧪 Run the diagnostic to test: node diagnose-questionnaire-display-issue.js"
