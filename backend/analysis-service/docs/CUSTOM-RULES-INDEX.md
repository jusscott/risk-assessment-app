# Custom Rules Feature Documentation

## Overview

The Custom Rules feature allows users to define and implement their own security assessment rules tailored to their organization's specific compliance requirements and security policies. This feature enhances the risk assessment platform by enabling customization beyond the standard security frameworks.

## Documentation Index

This document serves as the main index for all Custom Rules documentation. It provides links to detailed documentation on each aspect of the feature and summarizes the key components.

### Key Documentation

1. [**Custom Rules Core Concepts**](./CUSTOM-RULES.md)
   - Fundamental concepts and architecture
   - Rule structure and components
   - Rule evaluation process

2. [**Custom Rules Visualization**](./CUSTOM-RULES-VISUALIZATION.md)
   - Dashboard integration
   - Visualization types
   - Data interpretation

3. [**Custom Rules User Guide**](./CUSTOM-RULES-USER-GUIDE.md)
   - Step-by-step usage instructions
   - Rule creation workflow
   - Management and maintenance

4. [**API Reference**](#api-reference)
   - REST API endpoints
   - Request/response formats
   - Authentication requirements

5. [**Integration Guide**](#integration-guide)
   - Integration with assessment workflow
   - Integration with reporting
   - Custom rules in the overall system architecture

## System Architecture

The Custom Rules feature is implemented primarily in the Analysis Service, with UI components in the frontend application and integration points with other services.

### Component Diagram

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    Frontend     │      │  API Gateway    │      │  Auth Service   │
│                 │──────▶                 │──────▶                 │
│  - Rule Editor  │      │ - Auth Routing  │      │ - Permissions   │
│  - Visualization│      │ - API Routing   │      │ - User Context  │
└────────┬────────┘      └────────┬────────┘      └─────────────────┘
         │                        │                        
         │                        │                        
         │                        ▼                        
         │               ┌─────────────────┐               
         └──────────────▶│ Analysis Service│               
                         │                 │               
                         │ - Rule Engine   │               
                         │ - Rule Storage  │               
                         │ - Evaluation    │               
                         └────────┬────────┘               
                                  │                        
                                  │                        
                                  ▼                        
                         ┌─────────────────┐               
                         │ Report Service  │               
                         │                 │               
                         │ - Results       │               
                         │ - PDF Generation│               
                         └─────────────────┘               
```

## Core Concepts

### Rule Structure

Each custom rule consists of:

- **Metadata**: Name, description, category, severity, etc.
- **Conditions**: Logic that determines when a rule passes or fails
- **Actions**: Steps to take when a rule is triggered
- **Remediation**: Guidance for addressing rule violations

### Rule Types

1. **Simple Rules**: Basic pass/fail conditions based on questionnaire answers
2. **Composite Rules**: Multiple conditions with logical operators (AND, OR, NOT)
3. **Weighted Rules**: Rules that contribute to a weighted score
4. **Temporal Rules**: Rules that evaluate changes over time

### Rule Evaluation

Rules are evaluated in the Analysis Service using the following process:

1. Fetch rule definitions from the database
2. Gather input data from questionnaires and system state
3. Execute rule conditions against input data
4. Generate compliance status and detailed results
5. Store results for reporting and visualization

## API Reference

### Endpoints

#### Rule Management

- `GET /api/rules` - List all custom rules
- `GET /api/rules/:id` - Get a specific rule
- `POST /api/rules` - Create a new rule
- `PUT /api/rules/:id` - Update a rule
- `DELETE /api/rules/:id` - Delete a rule

#### Rule Evaluation

- `POST /api/analysis/:analysisId/evaluate` - Evaluate rules for an analysis
- `GET /api/analysis/:analysisId/results` - Get rule evaluation results

### Request/Response Examples

#### Creating a Rule

```json
// POST /api/rules
{
  "name": "Password Complexity Rule",
  "description": "Ensures password policies require sufficient complexity",
  "category": "Authentication",
  "severity": 4,
  "conditions": {
    "type": "composite",
    "operator": "AND",
    "conditions": [
      {
        "type": "simple",
        "questionId": "auth-q-12",
        "expectedAnswer": "yes"
      },
      {
        "type": "simple",
        "questionId": "auth-q-13",
        "expectedAnswer": "yes"
      }
    ]
  },
  "remediation": "Update password policy to require at least 12 characters with a mix of character types"
}
```

#### Rule Result

```json
// GET /api/analysis/123/results
{
  "analysisId": 123,
  "evaluatedAt": "2025-05-25T14:32:00Z",
  "results": [
    {
      "ruleId": 42,
      "ruleName": "Password Complexity Rule",
      "compliant": false,
      "severity": 4,
      "category": "Authentication",
      "message": "Password policy does not meet complexity requirements",
      "details": {
        "questionId": "auth-q-12",
        "answer": "no",
        "expectedAnswer": "yes"
      },
      "remediation": "Update password policy to require at least 12 characters with a mix of character types"
    }
  ]
}
```

## Integration Guide

### Frontend Integration

Custom rules are integrated into the frontend through:

1. **Rule Management UI** (`/rules` route):
   - Create, edit, and delete custom rules
   - Import/export rules in JSON format

2. **Assessment Results** (`/reports` route):
   - Display rule compliance status
   - Show detailed information about rule violations

3. **Advanced Dashboard** (`/dashboard` route):
   - Visualize rule compliance by category
   - Track compliance trends over time

### Database Schema

Custom rules are stored in the Analysis Service database using the following schema:

```prisma
model CustomRule {
  id          Int      @id @default(autoincrement())
  name        String
  description String
  category    String
  severity    Int      @default(3)
  conditions  Json
  remediation String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   Int
  
  // Relationships
  user        User     @relation(fields: [createdBy], references: [id])
  results     RuleResult[]
}

model RuleResult {
  id          Int      @id @default(autoincrement())
  analysisId  Int
  ruleId      Int
  compliant   Boolean
  message     String?
  details     Json?
  evaluatedAt DateTime @default(now())
  
  // Relationships
  analysis    Analysis @relation(fields: [analysisId], references: [id])
  rule        CustomRule @relation(fields: [ruleId], references: [id])
}
```

## Implementation Details

### Rule Engine

The rule engine is implemented in the Analysis Service using:

- **Rule Parser**: Converts JSON rule definitions into executable conditions
- **Evaluation Context**: Provides data and functions for rule evaluation
- **Result Generator**: Produces detailed evaluation results

### Performance Considerations

- Rules are evaluated asynchronously for large assessments
- Rule results are cached to prevent redundant evaluations
- Complex rules may impact analysis performance

## Best Practices

1. **Rule Creation**:
   - Use descriptive names and detailed descriptions
   - Assign appropriate severity levels
   - Provide clear remediation guidance

2. **Rule Management**:
   - Review and update rules regularly
   - Archive obsolete rules rather than deleting them
   - Test rules before applying to production assessments

3. **Rule Evaluation**:
   - Monitor performance impacts of complex rules
   - Consider rule dependencies and evaluation order
   - Validate results against expected outcomes

## Troubleshooting

### Common Issues

1. **Rule Not Evaluating**:
   - Verify rule is active
   - Check question IDs referenced in conditions
   - Ensure assessment has required data

2. **Unexpected Results**:
   - Review rule conditions for logical errors
   - Check questionnaire answers for unexpected values
   - Verify complex condition operators (AND/OR/NOT)

3. **Performance Issues**:
   - Simplify complex rules
   - Reduce the number of conditions per rule
   - Optimize database queries for rule evaluation

## Roadmap

Future enhancements planned for the Custom Rules feature:

1. **Rule Templates**: Pre-defined templates for common security controls
2. **Rule Sharing**: Ability to share rules between organizations
3. **Advanced Conditions**: Support for more complex condition types
4. **Machine Learning**: AI-assisted rule creation and optimization
5. **Compliance Mapping**: Automatic mapping of rules to compliance frameworks

## Conclusion

The Custom Rules feature provides a powerful way to tailor security assessments to your organization's specific needs. By following the documentation and best practices outlined here, you can effectively implement, manage, and evaluate custom rules that enhance your security assessment process.
