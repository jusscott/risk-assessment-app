# Enterprise Billing System

This document provides an overview of the Enterprise Billing System, which is a key component of Phase 4 implementation for the Risk Assessment Application.

## Overview

The Enterprise Billing System enables organizations to manage billing at an enterprise level with advanced features such as:

- Organization and department management
- Enterprise plans with custom pricing and volume discounts
- Usage quotas with pooled or per-seat allocation
- Departmental usage tracking and reporting
- Enterprise subscription management
- Usage-based billing with overage charging
- Custom invoice generation

## Architecture

The Enterprise Billing System extends the existing payment service with new models and APIs:

```
┌─────────────────────┐
│    Payment Service  │
│                     │
│  ┌───────────────┐  │
│  │ Standard      │  │
│  │ Billing       │◄─┼────┐
│  └───────────────┘  │    │
│                     │    │
│  ┌───────────────┐  │    │
│  │ Usage-Based   │◄─┼────┤
│  │ Billing       │  │    │
│  └───────────────┘  │    │ Shared
│                     │    │ Components
│  ┌───────────────┐  │    │
│  │ Enterprise    │◄─┼────┘
│  │ Billing       │  │
│  └───────────────┘  │
│                     │
└─────────────────────┘
```

### Key Components

1. **Organization Management**: Create and manage organizations that represent enterprise customers
2. **Department Management**: Create departments within organizations for fine-grained billing
3. **Enterprise Plans**: Special pricing plans with volume discounts and seat allocations
4. **Enterprise Subscriptions**: User subscriptions tied to enterprise plans
5. **Usage Quotas**: Define usage limits for different operations, either pooled or per-seat
6. **Usage Tracking**: Record and monitor usage across departments and users
7. **Enterprise Invoicing**: Generate consolidated invoices for organizations

## Database Schema

The following new models have been added to the database schema:

- `Organization`: Represents an enterprise customer
- `Department`: Subdivisions within an organization
- `EnterprisePlan`: Custom plan for an organization based on standard plans
- `EnterpriseSubscription`: User subscriptions to enterprise plans
- `EnterpriseUsageQuota`: Usage limits for enterprise plans
- `EnterpriseUsageSummary`: Aggregated usage by department and type
- `EnterpriseInvoice`: Organization-level invoices

These models work with existing models such as `Plan`, `Subscription`, and `UsageRecord`.

## API Endpoints

### Organization Endpoints

- `POST /api/enterprise/organizations`: Create a new organization
- `GET /api/enterprise/organizations/:id`: Get organization details
- `PUT /api/enterprise/organizations/:id`: Update organization details

### Department Endpoints

- `POST /api/enterprise/departments`: Create a department
- `GET /api/enterprise/departments/:id`: Get department details

### Enterprise Plan Endpoints

- `POST /api/enterprise/plans`: Create an enterprise plan
- `GET /api/enterprise/plans/:id`: Get enterprise plan details

### Usage Quota Endpoints

- `POST /api/enterprise/quotas`: Create a usage quota for an enterprise plan

### Enterprise Subscription Endpoints

- `POST /api/enterprise/subscriptions`: Create a subscription for a user

### Usage Tracking Endpoints

- `POST /api/enterprise/usage`: Record usage for an enterprise user

### Invoice Endpoints

- `POST /api/enterprise/invoices`: Generate an invoice for an organization

## Security

Enterprise billing endpoints are secured with role-based authentication:

- Most endpoints require admin privileges
- Internal API key authentication is supported for service-to-service communication
- User context is preserved for usage tracking

## Usage Workflow

### Organization Setup

1. Create an organization
2. Add departments
3. Create an enterprise plan
4. Define usage quotas
5. Add user subscriptions

### Usage Tracking

1. Record usage events as they occur
2. Aggregate usage by department and type
3. Apply quotas to determine overage

### Invoicing

1. Generate invoices for billing periods
2. Include base subscription costs
3. Add usage-based charges for overages
4. Provide itemized breakdown by department

## Testing

A test script is provided to validate the enterprise billing functionality:

```
node backend/payment-service/scripts/test-enterprise-billing.js
```

This script creates a test organization, departments, plan, usage quotas, and subscriptions, then simulates usage and generates an invoice.

## Integration

The enterprise billing system integrates with:

- Authentication service for user validation
- API Gateway for request routing
- Other services to track usage events (report generation, analysis, etc.)

## Monitoring

Usage and billing statistics can be monitored through:

- Usage summaries by department and type
- Invoice history and projections
- Seat utilization and allocation

## Future Enhancements

Planned enhancements for the enterprise billing system include:

- Advanced reporting dashboard for enterprise admins
- Proactive usage alerts and notifications
- Budget controls and spending limits
- Customizable billing cycles
- Multi-currency support
- Tax calculation and compliance
