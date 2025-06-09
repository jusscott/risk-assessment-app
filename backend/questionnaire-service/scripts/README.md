# Questionnaire Service Diagnostic and Fix Scripts

This directory contains various diagnostic and fix scripts for common issues with the Questionnaire Service.

## Database Connection Scripts

- **fix-database-connection.js**: Diagnoses and fixes database connection issues.
  - Detects whether running in Docker or on host machine
  - Automatically adjusts DATABASE_URL configuration
  - Creates `.env.local` for local development environments
  - Tests database connection
  - Usage: `npm run fix-database`

## Template Management Scripts

- **diagnose-and-fix-templates.js**: Diagnoses and fixes template loading issues.
  - Checks template availability in the database
  - Loads templates from framework files if missing
  - Fixes DNS and service resolution issues
  - Usage: `npm run fix-templates`

- **fix-template-issues.sh**: User-friendly wrapper script that:
  - First checks/fixes database connection issues
  - Then runs the template diagnosis and fix script
  - Provides color-coded output for better readability
  - Usage: `npm run fix-templates-ui`

## Connectivity Scripts

- **fix-connectivity.sh**: Fixes basic connectivity issues.
  - Usage: `npm run fix-connectivity`

- **enhanced-connectivity-fix.js**: Advanced connectivity troubleshooting.
  - Usage: `npm run enhanced-fix`

## Service Management

- **restart-services.sh**: Restarts microservices in the correct order.
  - Usage: `npm run restart-services`

## Data Management

- **seed-frameworks.js**: Seeds the database with framework templates.
  - Usage: `npm run seed-frameworks`

## Troubleshooting Questionnaire Template Loading

If you're experiencing the "Failed to load questionnaire templates" error with DNS issues:

1. First, run the database connection fix:
   ```
   npm run fix-database
   ```

2. Then run the template issues fix script:
   ```
   npm run fix-templates-ui
   ```

3. If problems persist, check:
   - PostgreSQL is running and accessible
   - All microservices are running (especially the questionnaire service)
   - DNS resolution is working correctly
   - Your `.env` files have the correct configuration

## Common Issues and Solutions

### Database Connection Errors

- **Error**: "Database connection failed. Cannot proceed with template checks."
  - **Solution**: Run `npm run fix-database` to diagnose and fix the connection issues.
  - The script will detect whether you're running in Docker or locally and adjust the database URL accordingly.
  - For detailed information, see the [Database Connectivity documentation](../docs/DATABASE-CONNECTIVITY.md).

#### Development Mode Bypass

For development environments, we've added tools to bypass database validation:

- **mock-env-setup.js**: Sets up environment variables and development mode flags.
  - Usage: `node scripts/mock-env-setup.js`

- **bypass-db-check.js**: Patches database checks to work in development mode.
  - Usage: `node scripts/bypass-db-check.js`

### Template Loading Errors

- **Error**: "Failed to load questionnaire templates"
  - **Solution**: Run `npm run fix-templates-ui` to fix template issues.
  - This will verify templates exist in the database and load them if missing.

### DNS Resolution Errors

- **Error**: DNS resolution failures when trying to connect to services
  - **Solution**: The `fix-database` script includes fixes for common DNS issues by converting Docker hostnames to localhost when running outside of Docker.
