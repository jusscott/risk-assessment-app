# Database Connectivity Issues and Solutions

## Overview

This document explains how to resolve database connectivity issues when running the questionnaire service, particularly when executing the `fix-template-issues.sh` script.

## Common Error

The most common error encountered is:

```
=== Step 2: Checking Database Connectivity ===
✗ Database connection failed: 
Invalid `prisma.$queryRaw()` invocation:

error: Environment variable not found: DATABASE_URL.
  -->  schema.prisma:10
   | 
 9 |   provider = "postgresql"
10 |   url      = env("DATABASE_URL")
   | 
```

## Solutions

### 1. Development Mode with Database Bypass

For development and testing purposes, you can run the application in a mock environment that bypasses the database connectivity checks:

```bash
# Set up the mock environment
node scripts/mock-env-setup.js

# Apply the database check bypass patch
node scripts/bypass-db-check.js

# Run the template fix script
./scripts/fix-template-issues.sh
```

This approach:
- Creates proper environment files with the DATABASE_URL variable
- Sets development mode flags like BYPASS_DB_VALIDATION
- Patches the template check script to bypass database validation in development mode

### 2. Fix PostgreSQL Connection (Production)

For production environments, you should properly configure PostgreSQL:

1. Ensure PostgreSQL is running:
   ```bash
   # Check if PostgreSQL service is running
   ps aux | grep postgres
   
   # Start PostgreSQL if not running (commands may vary based on installation)
   sudo service postgresql start
   # or
   brew services start postgresql
   ```

2. Create the required database:
   ```bash
   createdb -U postgres questionnaires
   ```

3. Verify the database connection:
   ```bash
   psql -U postgres -d questionnaires -c "SELECT 1"
   ```

4. Update environment variables:
   ```bash
   # Update .env files with the correct DATABASE_URL
   node scripts/simple-env-fix.js
   ```

### 3. Docker Environment 

If you're using Docker:

1. Ensure all services are running:
   ```bash
   docker-compose ps
   ```

2. Check PostgreSQL container logs:
   ```bash
   docker-compose logs postgres
   ```

3. Connect to PostgreSQL within Docker:
   ```bash
   docker-compose exec postgres psql -U postgres
   ```

4. Create the database if needed:
   ```sql
   CREATE DATABASE questionnaires;
   ```

## Environment Variables

The key environment variables for database connectivity are:

```
# Main database connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/questionnaires"

# Development mode flags
NODE_ENV="development"
BYPASS_DB_VALIDATION="true"  # Only for development
TEMPLATE_CHECK_SKIP_DB="true"  # Only for development
```

## Troubleshooting Steps

1. Check if PostgreSQL is running
2. Verify the database exists
3. Confirm the username and password are correct
4. Check if the port is correct (default is 5432)
5. Verify the `.env` files contain the correct `DATABASE_URL`
6. For Docker setups, ensure the container networking is properly configured

## Relevant Files

- `.env`, `.env.development`, `.env.local` - Environment configuration files
- `prisma/schema.prisma` - Prisma schema with database connection settings
- `scripts/mock-env-setup.js` - Script to set up mock environment
- `scripts/bypass-db-check.js` - Script to patch database checks
- `scripts/fix-template-issues.sh` - Template issues repair script
- `scripts/diagnose-and-fix-templates.js` - Main template diagnosis script
