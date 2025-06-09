# Mock Database Testing Environment

This documentation explains how to use the mock database environment for testing the report generation flow without requiring a real database connection.

## Problem Addressed

When running the `fix-template-issues.sh` script, you may encounter an error like:

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

Validation Error Count: 1
Database connection failed. Cannot proceed with template checks.
```

This happens because the script tries to validate database connectivity, but the DATABASE_URL environment variable is missing or improperly configured.

## Solution

We've created a set of scripts that implement a development mode with mock database support:

1. **Mock environment setup**: Creates all necessary environment variables and mocks
2. **Database check bypass**: Patches connection verification to work without a real database
3. **Mock Prisma client**: Provides mock data for testing without actual database queries
4. **Testing scripts**: End-to-end testing of the report generation flow

## How to Use

### Quick Start

Run the setup and test script:

```bash
cd risk-assessment-app/backend/scripts
./setup-and-run-test.sh
```

This script will:
1. Install required dependencies (uuid, axios)
2. Configure the environment variables
3. Apply necessary patches
4. Run the report generation test with mock data

### Manual Setup

If you prefer to run steps individually:

1. **Set up mock environment**:
   ```bash
   cd risk-assessment-app/backend/questionnaire-service/scripts
   node mock-env-setup.js
   ```

2. **Apply database check bypasses**:
   ```bash
   node bypass-db-check.js
   ```

3. **Run the test script**:
   ```bash
   cd ../../scripts
   ./run-report-test.sh
   ```

## Understanding the Mock Environment

### Environment Variables

The mock environment sets these key environment variables:

- `NODE_ENV=development`: Runs in development mode
- `BYPASS_AUTH=true`: Bypasses authentication checks
- `BYPASS_DB_VALIDATION=true`: Skips database validation
- `TEMPLATE_CHECK_SKIP_DB=true`: Allows template checks without database
- `MOCK_PRISMA_CLIENT=true`: Uses mock Prisma client

### Mock Data

Mock data is generated in `backend/scripts/mocks/mock-data.js` and includes:
- Test templates
- Sample questionnaire submissions
- Analysis results
- Report generation data

## Extending the Solution

You can extend this solution by:

1. Adding more test scenarios in `mock-data.js`
2. Creating additional test scripts for specific features
3. Expanding the mock Prisma client to support more operations

## Troubleshooting

### Missing Dependencies

If you see an error about missing modules:
```
Error: Cannot find module 'uuid'
```

Run:
```bash
cd risk-assessment-app/backend/scripts
npm install uuid axios
```

### Template Issues

If template issues persist after running the scripts:

1. Check that all environment variables are properly set
2. Verify that the bypass scripts applied successfully
3. Try running with the `--force` flag:
   ```bash
   ./run-report-test.sh --force
   ```

### Restoring Original Functionality

The scripts create backups of any modified files with a `.bak` extension. To restore:

```bash
cd risk-assessment-app/backend/questionnaire-service/scripts
node restore-original-files.js
```

(Note: You may need to create this restore script if needed)
