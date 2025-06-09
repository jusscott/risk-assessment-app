# Custom Rules User Guide

This guide provides step-by-step instructions for creating, managing, and using custom rules in the Risk Assessment Application.

## Table of Contents

1. [Introduction](#introduction)
2. [Accessing Custom Rules](#accessing-custom-rules)
3. [Creating a New Rule](#creating-a-new-rule)
4. [Managing Existing Rules](#managing-existing-rules)
5. [Rule Evaluation](#rule-evaluation)
6. [Viewing Results](#viewing-results)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Topics](#advanced-topics)

## Introduction

The Custom Rules feature allows you to define organization-specific security assessment criteria that complement standard compliance frameworks. This guide will walk you through the practical aspects of working with custom rules.

### Prerequisites

To use the Custom Rules feature, you need:

- Access to the Risk Assessment Application with appropriate permissions
- Basic understanding of security assessment concepts
- Familiarity with your organization's security policies

## Accessing Custom Rules

To access the Custom Rules interface:

1. Log in to the Risk Assessment Application
2. Navigate to the main menu
3. Select **Rules Management** from the sidebar
4. Click on the **Custom Rules** tab

The Custom Rules page displays a list of all existing custom rules with their basic information:

- Rule name
- Category
- Severity
- Status (Active/Inactive)
- Creation date
- Last modified date

## Creating a New Rule

To create a new custom rule:

1. On the Custom Rules page, click the **Create New Rule** button
2. In the rule editor form, provide the following information:

### Basic Information

![Rule Editor - Basic Information](../../../frontend/src/assets/docs/images/rule-editor-basic.png)

- **Name**: Enter a descriptive name for the rule
- **Description**: Provide a detailed explanation of what the rule checks for
- **Category**: Select the security domain this rule belongs to
- **Severity**: Choose the impact level (1-5) if the rule is violated
- **Tags** (optional): Add labels for easier filtering and organization

### Condition Definition

![Rule Editor - Conditions](../../../frontend/src/assets/docs/images/rule-editor-conditions.png)

You can define rule conditions in several ways:

#### Simple Condition

For a basic check:

1. Select **Simple Condition** from the condition type dropdown
2. Choose the **Field** to evaluate (e.g., `passwordPolicy.minLength`)
3. Select the **Operator** (e.g., `>=`, `==`, `contains`)
4. Enter the **Value** to compare against (e.g., `12`)

#### Composite Condition

For multiple criteria:

1. Select **Composite Condition** from the condition type dropdown
2. Choose the **Logical Operator** (AND, OR, NOT)
3. Click **Add Condition** to add nested conditions
4. Configure each nested condition as needed
5. Use the drag handles to reorder conditions
6. Click the delete icon to remove a condition

#### Advanced Function

For complex logic:

1. Select **Function Condition** from the condition type dropdown
2. Write a JavaScript function that returns `true` (compliant) or `false` (non-compliant)
3. Use the provided context variables to access assessment data

Example function:

```javascript
function evaluatePasswordPolicy(context) {
  const { passwordPolicy } = context.questionnaire.responses;
  
  // Check if password policy meets all requirements
  return passwordPolicy.minLength >= 12 &&
         passwordPolicy.requiresUppercase &&
         passwordPolicy.requiresLowercase &&
         passwordPolicy.requiresNumbers &&
         passwordPolicy.requiresSpecialChars;
}
```

### Remediation Guidance

![Rule Editor - Remediation](../../../frontend/src/assets/docs/images/rule-editor-remediation.png)

- **Remediation Description**: Provide instructions for addressing non-compliance
- **Resources** (optional): Add links to relevant documentation or tools
- **Effort Level** (optional): Indicate the estimated effort required (Low, Medium, High)
- **Impact** (optional): Describe the potential impact of implementing the remediation

### Testing the Rule

Before saving, you can test your rule against sample data:

1. Click the **Test Rule** button
2. Select a sample assessment or upload test data
3. Review the evaluation result
4. Adjust the rule definition if needed

### Saving the Rule

Once you're satisfied with your rule definition:

1. Click the **Save Rule** button
2. Confirm the action in the dialog
3. Your new rule will be added to the Custom Rules list

## Managing Existing Rules

### Viewing Rule Details

To view detailed information about a rule:

1. On the Custom Rules page, click on a rule name
2. The Rule Details page displays all information about the rule, including:
   - Basic information
   - Condition definition
   - Remediation guidance
   - Evaluation history

### Editing a Rule

To modify an existing rule:

1. On the Rule Details page, click the **Edit** button
2. Make your changes in the rule editor
3. Click **Save Changes** to update the rule

### Duplicating a Rule

To create a new rule based on an existing one:

1. On the Rule Details page, click the **Duplicate** button
2. Modify the copy as needed
3. Save it as a new rule

### Activating/Deactivating a Rule

To change a rule's active status:

1. On the Custom Rules page, find the rule in the list
2. Toggle the **Active** switch next to the rule
3. Confirm the action in the dialog

Inactive rules will not be evaluated during assessments but remain available for future use.

### Deleting a Rule

To permanently remove a rule:

1. On the Rule Details page, click the **Delete** button
2. Confirm the deletion in the dialog

> **Note**: Deleting a rule will remove all its evaluation history. Consider deactivating rules instead of deleting them.

## Rule Evaluation

Custom rules are evaluated automatically during security assessments. You can also trigger manual evaluations:

### Evaluating Rules for an Assessment

To evaluate rules for a specific assessment:

1. Navigate to the **Assessments** page
2. Select an assessment from the list
3. Click the **Evaluate Rules** button
4. Choose which rule sets to include:
   - Standard framework rules
   - Custom rules
   - Both
5. Click **Start Evaluation**
6. Wait for the evaluation to complete

### Batch Evaluation

To evaluate rules across multiple assessments:

1. Navigate to the **Rule Management** page
2. Click the **Batch Evaluate** button
3. Select the assessments to include
4. Choose which rules to evaluate
5. Click **Start Batch Evaluation**
6. Monitor the progress on the Batch Operations page

## Viewing Results

Rule evaluation results are available in several locations:

### Assessment Reports

To view rule results in an assessment report:

1. Navigate to the **Reports** page
2. Select a report from the list
3. Open the **Custom Rules** section
4. Review the compliance status for each rule

### Advanced Dashboard

To view rule visualization on the dashboard:

1. Navigate to the **Dashboard** page
2. Select the **Advanced** tab
3. Review the rule compliance charts and metrics
4. Use the visualization controls to change chart types and filters

For more details, see the [Custom Rules Visualization](./CUSTOM-RULES-VISUALIZATION.md) documentation.

### Rule Details Page

To view evaluation history for a specific rule:

1. Navigate to the **Rule Management** page
2. Select a rule from the list
3. Open the **Evaluation History** tab
4. Review the compliance status across different assessments

## Troubleshooting

### Common Issues

#### Rule Not Evaluating

If a rule isn't being evaluated:

1. Verify the rule is active
2. Check if the rule's category is included in the assessment scope
3. Ensure the assessment contains the required data fields
4. Review the rule conditions for syntax errors

#### Unexpected Results

If a rule produces unexpected results:

1. Check the rule conditions for logical errors
2. Verify the field paths match the actual data structure
3. Test the rule against sample data
4. Review the evaluation logs for errors

### Error Messages

| Error | Possible Cause | Solution |
|-------|---------------|----------|
| "Field not found" | The rule references a non-existent field | Update the field path to match the actual data structure |
| "Invalid operator" | The rule uses an unsupported operator | Replace with a supported operator |
| "Syntax error in function" | Custom function has JavaScript errors | Fix the syntax errors in the function code |
| "Evaluation timeout" | Rule processing exceeded the time limit | Simplify the rule logic or split into multiple rules |

### Logging and Debugging

For advanced troubleshooting:

1. Navigate to the **System** page
2. Select the **Logs** tab
3. Filter logs by "Rules Engine"
4. Review error messages and stack traces

## Advanced Topics

### Rule Templates

To create a rule template:

1. Create a new rule or select an existing one
2. Click the **Save as Template** button
3. Provide a template name and description
4. Select which parts to templatize
5. Save the template

To use a template:

1. Click **Create New Rule**
2. Select the **From Template** option
3. Choose a template from the list
4. Customize the rule as needed
5. Save the new rule

### Bulk Operations

To perform operations on multiple rules:

1. On the Custom Rules page, select rules using the checkboxes
2. Click the **Bulk Actions** button
3. Choose an action:
   - Activate/Deactivate
   - Change Category
   - Change Severity
   - Export
   - Delete
4. Configure the action parameters
5. Confirm the operation

### Import/Export

To export rules:

1. On the Custom Rules page, click the **Export** button
2. Select the rules to export
3. Choose the export format (JSON, CSV, YAML)
4. Click **Export** and save the file

To import rules:

1. On the Custom Rules page, click the **Import** button
2. Select the import file
3. Review the rules to be imported
4. Resolve any conflicts
5. Click **Import Rules**

### Rule Dependencies

To define rule dependencies:

1. Edit a rule
2. Open the **Advanced Options** section
3. Click **Add Dependency**
4. Select the prerequisite rule
5. Choose the dependency type:
   - Required: This rule is evaluated only if the prerequisite rule passes
   - Informational: The prerequisite rule's result is available but doesn't block evaluation
6. Save the rule

### API Integration

Custom rules can be managed programmatically using the API:

```javascript
// Example: Create a new rule via API
const newRule = {
  name: "Password Complexity Rule",
  description: "Ensures password policies require sufficient complexity",
  category: "Authentication",
  severity: 4,
  conditions: {
    type: "composite",
    operator: "AND",
    conditions: [
      {
        type: "simple",
        field: "passwordPolicy.minLength",
        operator: ">=",
        value: 12
      },
      {
        type: "simple",
        field: "passwordPolicy.requiresSpecialChars",
        operator: "==",
        value: true
      }
    ]
  },
  remediation: "Update password policy to require at least 12 characters with a mix of character types"
};

fetch('/api/rules', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(newRule)
})
.then(response => response.json())
.then(data => console.log('Rule created:', data))
.catch(error => console.error('Error:', error));
```

For full API documentation, see the [API Reference](../../../api-docs/rules-api.md).

## Conclusion

Custom rules provide a powerful way to implement organization-specific security requirements in your risk assessments. By following this guide, you can effectively create, manage, and leverage custom rules to enhance your security assessment process.

## See Also

- [Custom Rules Core Concepts](./CUSTOM-RULES.md)
- [Custom Rules Visualization](./CUSTOM-RULES-VISUALIZATION.md)
- [Custom Rules Index](./CUSTOM-RULES-INDEX.md)
