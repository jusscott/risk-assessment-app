# Custom Rules: Core Concepts

This document explains the fundamental concepts and architecture of the Custom Rules feature in the Risk Assessment Application.

## Introduction

Custom Rules are user-defined security assessment criteria that complement standard compliance frameworks. They allow organizations to implement specific security requirements tailored to their unique operational needs, industry-specific requirements, or internal policies.

## Key Concepts

### Rule Definition

A custom rule is defined by the following components:

- **Identifier**: A unique ID to reference the rule
- **Metadata**: Descriptive information about the rule
- **Condition Logic**: The criteria for rule compliance
- **Remediation Guidance**: Instructions for addressing non-compliance

#### Metadata

Rule metadata includes:

- **Name**: A short, descriptive name for the rule
- **Description**: A detailed explanation of what the rule checks for
- **Category**: The security domain the rule belongs to (e.g., Authentication, Data Protection)
- **Severity**: The impact level if the rule is violated (scale of 1-5)
- **Tags**: Optional labels for organizing and filtering rules
- **Author**: The user who created the rule
- **Creation/Modification Dates**: Timestamps for rule lifecycle tracking

#### Condition Logic

Conditions define the logical criteria that determine rule compliance. The system supports:

- **Simple Conditions**: Basic equality, comparison, or existence checks
- **Composite Conditions**: Multiple conditions joined by logical operators (AND, OR, NOT)
- **Function-based Conditions**: Custom JavaScript functions that implement complex logic

Example condition structure:

```json
{
  "type": "composite",
  "operator": "AND",
  "conditions": [
    {
      "type": "simple",
      "field": "passwordPolicy.minLength",
      "operator": ">=",
      "value": 12
    },
    {
      "type": "simple",
      "field": "passwordPolicy.requiresSpecialChars",
      "operator": "==",
      "value": true
    }
  ]
}
```

#### Remediation Guidance

Each rule includes recommended actions to address non-compliance:

- **Description**: Explanation of the remediation steps
- **Resources**: Links to relevant documentation or tools
- **Effort Level**: Estimated effort required (Low, Medium, High)
- **Impact**: Potential impact of implementing the remediation

### Rule Categories

Rules are organized into categories that align with common security domains:

1. **Access Control**: Rules related to authorization, permissions, and privilege management
2. **Authentication**: Rules for identity verification and credential management
3. **Data Protection**: Rules governing data encryption, storage, and handling
4. **Network Security**: Rules for securing network communications and boundaries
5. **Application Security**: Rules specific to application development and maintenance
6. **Compliance**: Rules that map to specific regulatory requirements
7. **Incident Response**: Rules related to security incident handling and recovery
8. **Physical Security**: Rules addressing physical access and environmental controls
9. **Business Continuity**: Rules for ensuring service availability and disaster recovery
10. **Security Governance**: Rules related to policies, procedures, and organizational structure

### Rule Severity Levels

Severity levels indicate the potential impact of a rule violation:

1. **Low (1)**: Minimal security impact, represents best practices
2. **Low-Medium (2)**: Minor security concern with limited exposure
3. **Medium (3)**: Moderate security risk that should be addressed
4. **Medium-High (4)**: Significant security risk requiring prompt attention
5. **High (5)**: Critical security vulnerability requiring immediate remediation

## Architecture

### System Components

The Custom Rules feature is implemented through these key components:

1. **Rule Storage**: Database tables for storing rule definitions
2. **Rule Engine**: Core logic for evaluating rules against assessment data
3. **Rule API**: RESTful endpoints for managing and evaluating rules
4. **Rule UI**: Frontend components for creating and managing rules

### Data Flow

The rule evaluation process follows this sequence:

1. Assessment data is collected through questionnaires or automated scanning
2. The rule engine retrieves applicable custom rules from the database
3. Each rule's conditions are evaluated against the assessment data
4. Results are calculated and stored in the database
5. Compliance status and remediation guidance are presented in reports and dashboards

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│ Assessment Data  │────▶│   Rule Engine    │────▶│  Results Storage │
│                  │     │                  │     │                  │
└──────────────────┘     └─────────┬────────┘     └──────────────────┘
                                   │
                                   │
                         ┌─────────▼────────┐
                         │                  │
                         │   Rule Storage   │
                         │                  │
                         └──────────────────┘
```

### Database Schema

The database schema for custom rules consists of these main tables:

**CustomRule Table**:
- `id`: Primary key
- `name`: Rule name
- `description`: Detailed description
- `category`: Security category
- `severity`: Impact level (1-5)
- `conditions`: JSON structure defining rule logic
- `remediation`: Guidance text
- `isActive`: Boolean flag
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `createdBy`: Reference to user

**RuleResult Table**:
- `id`: Primary key
- `analysisId`: Reference to security assessment
- `ruleId`: Reference to custom rule
- `compliant`: Boolean compliance status
- `message`: Explanation of result
- `details`: Additional JSON data
- `evaluatedAt`: Evaluation timestamp

## Rule Evaluation Logic

### Evaluation Process

Rules are evaluated following these steps:

1. **Initialization**: Load rule definitions and assessment data
2. **Context Creation**: Build evaluation context with data and helper functions
3. **Condition Evaluation**: Process rule conditions recursively
   - For simple conditions: Apply comparison operators
   - For composite conditions: Evaluate child conditions and apply logical operators
   - For function conditions: Execute custom JavaScript logic
4. **Result Generation**: Create result records with compliance status and details
5. **Post-processing**: Calculate aggregate metrics and related insights

### Context Data

The evaluation context includes:

- **Questionnaire Responses**: Answers to assessment questions
- **System Configuration**: Technical settings and parameters
- **Historical Data**: Previous assessment results for trend analysis
- **Environmental Data**: Organization profile and contextual information
- **Helper Functions**: Utility methods for complex evaluations

### Expression Language

The rule engine supports a flexible expression language for condition evaluation:

- **Path Expressions**: Dot notation for accessing nested properties
- **Comparison Operators**: ==, !=, >, >=, <, <=, contains, startsWith, endsWith
- **Logical Operators**: AND, OR, NOT
- **Functions**: regex(), count(), sum(), avg(), exists(), etc.

Example expressions:

```
// Check if password length is sufficient
questionnaire.responses.passwordLength >= 12

// Verify multi-factor authentication is enabled for privileged accounts
users.filter(u => u.isAdmin).every(u => u.mfaEnabled == true)

// Ensure sensitive data is encrypted
dataStores.filter(ds => ds.sensitivity == "high").every(ds => ds.encryption == "AES-256")
```

## Custom Rule Creation Workflow

The typical workflow for creating custom rules is:

1. **Planning**: Identify the security requirement and evaluation criteria
2. **Definition**: Create the rule with metadata and conditions
3. **Testing**: Validate the rule against sample assessment data
4. **Publication**: Activate the rule for use in assessments
5. **Monitoring**: Track rule effectiveness and update as needed

## Integration with Compliance Frameworks

Custom rules can be mapped to standard compliance frameworks:

- **Framework Mapping**: Associate rules with specific framework controls
- **Gap Analysis**: Identify areas where custom rules enhance standard frameworks
- **Compliance Reporting**: Include custom rule results in compliance reports

Example mappings:

- ISO 27001: A.9.4.3 (Password management system)
- NIST 800-53: IA-5 (Authenticator Management)
- PCI DSS: Requirement 8.2.3 (Password requirements)

## Performance Considerations

When creating and managing custom rules, consider these performance factors:

- **Rule Complexity**: Complex conditions may impact evaluation time
- **Rule Quantity**: Large numbers of rules can affect overall assessment performance
- **Data Volume**: Rules that process large datasets may require optimization
- **Caching Strategy**: Frequently used evaluation results can be cached

## Extensions and Advanced Features

The Custom Rules framework supports these advanced capabilities:

- **Rule Templates**: Pre-defined rule structures for common use cases
- **Rule Versioning**: Tracking changes to rules over time
- **Rule Dependencies**: Defining relationships between related rules
- **Rule Scheduling**: Time-based activation and evaluation of rules
- **Custom Scoring**: Weighted scoring systems for rule compliance

## Conclusion

Custom Rules provide a powerful mechanism for implementing organization-specific security requirements within the Risk Assessment Application. By understanding these core concepts, users can effectively create, manage, and leverage custom rules to enhance their security assessment process.

## See Also

- [Custom Rules User Guide](./CUSTOM-RULES-USER-GUIDE.md)
- [Custom Rules Visualization](./CUSTOM-RULES-VISUALIZATION.md)
- [Custom Rules Index](./CUSTOM-RULES-INDEX.md)
