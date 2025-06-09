# Usage-Based Billing

This document provides information about the usage-based billing feature in the Risk Assessment Application.

## Overview

Usage-based billing allows charging customers based on their actual usage of the system resources. In addition to subscription-based billing, the system now supports tracking and charging for resource consumption exceeding the subscription plan limits.

## Key Components

### Database Schema

The usage-based billing system uses the following tables (as defined in `prisma/schema.prisma`):

- `Usage`: Records usage events from various services
- `UsageQuota`: Defines usage limits for subscription plans
- `UsageSummary`: Aggregates usage data for billing purposes
- `UsageInvoiceItem`: Links usage charges to invoices

### API Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/usage/record` | POST | Record a usage event | Required |
| `/api/usage/user/:userId` | GET | Get usage summary for a user | Required |
| `/api/usage/subscription/:subscriptionId` | GET | Get usage for a subscription | Required |
| `/api/usage/process-billing` | POST | Process billing for all pending usage records | Required (Admin/Internal) |

### Services

- `usage.service.js`: Core service for tracking and managing usage data
- `invoice.service.js`: Enhanced to support usage-based charges

## Usage Recording Flow

1. A service performs a billable action (e.g., report generation, analysis)
2. The service calls `/api/usage/record` with details:
   - User ID
   - Subscription ID
   - Usage type (e.g., "report", "assessment", "analysis")
   - Quantity
   - Metadata (optional details about the usage)
3. The usage is recorded in the database
4. Usage is compared against the user's subscription plan limits
5. If the usage exceeds limits, it's marked for billing

## Billing Process

Usage-based billing runs on a scheduled basis (typically daily) to:

1. Aggregate usage data for all users
2. Calculate charges for usage exceeding subscription limits
3. Generate invoice items for billable usage
4. Link usage charges to the appropriate invoices
5. Mark processed usage records to prevent double-billing

## Setting Up Usage-Based Billing

### 1. Database Migrations

The necessary database tables have been created with the migration:
```
npx prisma migrate dev --name add_usage_billing
```

### 2. Configure Usage Quotas

Usage quotas define the limits for each subscription plan. Configure these in the database to set the thresholds for when billing should occur.

Example quota structure:
```json
{
  "planId": "business",
  "usageType": "assessment",
  "monthlyLimit": 50,
  "unitPrice": 10.00,
  "unitName": "assessment"
}
```

### 3. Set Up Scheduled Processing

Usage-based billing should be processed regularly. Use the provided script to set up a cron job:

```bash
# Set up a daily cron job at midnight
cd /path/to/risk-assessment-app/backend/payment-service/scripts
./setup-usage-billing-cron.sh

# To customize the schedule
./setup-usage-billing-cron.sh --schedule="0 0 * * *" --user=appuser
```

### 4. API Gateway Configuration

The API Gateway has been configured to route usage-related requests to the Payment Service.

## Testing Usage-Based Billing

A test script is provided to simulate usage recording and billing processing:

```bash
# Set required environment variables
export TEST_AUTH_TOKEN="your-jwt-token"
export TEST_USER_ID="user-id"
export TEST_SUBSCRIPTION_ID="subscription-id"

# Run the test
cd /path/to/risk-assessment-app/backend/payment-service/scripts
node test-usage-billing.js
```

## Monitoring and Troubleshooting

- Logs are stored in `/logs/usage-billing-YYYYMMDD.log`
- Common issues:
  - Database connectivity problems
  - Authentication failures when calling APIs
  - Missing usage quota configurations
  - Incorrect subscription plan associations

## Integration with Other Services

Services that need to record usage should:

1. Import the usage recording utility
2. Call the usage recording function at appropriate points
3. Pass the necessary user, subscription, and usage details

Example integration:
```javascript
// In a service that needs to record usage
const axios = require('axios');

async function recordUsage(userId, subscriptionId, usageType, quantity, metadata = {}) {
  try {
    await axios.post(
      'http://payment-service:5003/api/usage/record',
      {
        userId,
        subscriptionId,
        usageType,
        quantity,
        metadata
      },
      {
        headers: {
          'x-api-key': process.env.INTERNAL_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    return true;
  } catch (error) {
    console.error('Failed to record usage:', error);
    return false;
  }
}

// Example usage
// recordUsage('user123', 'sub456', 'report', 1, { reportId: 'abc123' });
```

## Future Enhancements

Planned improvements for the usage-based billing system:

- Real-time usage dashboards for customers
- Pre-paid usage packages
- Usage alerts and notifications
- More granular usage tracking
- Customizable billing cycles
