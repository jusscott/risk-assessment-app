# Custom Rules Visualization

This document provides detailed information about the visualization of custom rules in the Risk Assessment Application, explaining how rule evaluation results are displayed and interpreted.

## Overview

The Risk Assessment Application offers multiple visualization options for custom rules data to help users understand their security posture at a glance. These visualizations transform complex rule evaluation results into intuitive graphical representations that highlight areas of concern and track compliance trends.

## Dashboard Integration

Custom rules data is integrated into the Advanced Dashboard, providing a high-level overview of rule compliance status and highlighting critical issues.

### Key Metrics

The dashboard displays these key metrics related to custom rules:

1. **Compliance Rate**: The percentage of custom rules that pass evaluation
2. **Risk Score**: A weighted score based on failed rules and their severity
3. **Critical Findings**: Count of high-severity rule violations
4. **Improvement Rate**: Change in compliance rate over time
5. **Category Distribution**: Breakdown of rules by security category

### Visualization Types

The dashboard supports multiple visualization types for presenting custom rules data:

#### 1. Rule Compliance by Category

This visualization shows the compliance status of rules grouped by security category:

![Rule Compliance by Category](../../../frontend/src/assets/docs/images/rule-compliance-by-category.png)

**Available Chart Types**:
- **Bar Chart**: Side-by-side bars showing compliant vs. non-compliant rules for each category
- **Pie Chart**: Distribution of categories with compliant/non-compliant segments
- **Radar Chart**: Multi-axis chart showing compliance percentage by category

**Implementation**:
```jsx
// Bar Chart Example
<BarChart data={ruleComplianceData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="passed" name="Compliant" fill="#00C49F" />
  <Bar dataKey="failed" name="Non-compliant" fill="#FF8042" />
</BarChart>
```

#### 2. Severity Distribution

This visualization shows the distribution of rule violations by severity level:

![Severity Distribution](../../../frontend/src/assets/docs/images/severity-distribution.png)

**Available Chart Types**:
- **Pie Chart**: Distribution of failures by severity level
- **Bar Chart**: Count of failures for each severity level
- **Treemap**: Hierarchical view of failures by severity and category

**Implementation**:
```jsx
// Pie Chart Example
<PieChart>
  <Pie
    data={severityDistribution}
    dataKey="value"
    nameKey="name"
    cx="50%"
    cy="50%"
    outerRadius={120}
    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
  >
    {severityDistribution.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

#### 3. Historical Trends

This visualization shows changes in rule compliance over time:

![Historical Trends](../../../frontend/src/assets/docs/images/historical-trends.png)

**Available Chart Types**:
- **Line Chart**: Tracking compliance percentage and risk score over time
- **Area Chart**: Stacked areas showing compliance by category over time
- **Bar Chart**: Side-by-side bars showing compliance metrics by time period

**Implementation**:
```jsx
// Line Chart Example
<LineChart data={historicalTrendData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="riskScore" name="Risk Score" stroke="#8884d8" activeDot={{ r: 8 }} />
  <Line type="monotone" dataKey="compliance" name="Compliance %" stroke="#82ca9d" />
</LineChart>
```

#### 4. Risk Mapping

This visualization maps security risks across different control areas:

![Risk Mapping](../../../frontend/src/assets/docs/images/risk-mapping.png)

**Available Chart Types**:
- **Radar Chart**: Multi-axis chart showing risk scores by security domain
- **Heat Map**: Color-coded grid showing risk levels by category and subcategory
- **Bubble Chart**: Risk areas positioned by impact and likelihood

**Implementation**:
```jsx
// Radar Chart Example
<RadarChart outerRadius={120} data={riskAreaData}>
  <PolarGrid />
  <PolarAngleAxis dataKey="area" />
  <PolarRadiusAxis angle={90} domain={[0, 100]} />
  <Radar
    name="Current Score"
    dataKey="score"
    stroke="#8884d8"
    fill="#8884d8"
    fillOpacity={0.6}
  />
  <Radar
    name="Industry Average"
    dataKey="average"
    stroke="#82ca9d"
    fill="#82ca9d"
    fillOpacity={0.6}
  />
  <Legend />
  <Tooltip />
</RadarChart>
```

#### 5. Benchmark Comparison

This visualization compares your organization's compliance with industry benchmarks:

![Benchmark Comparison](../../../frontend/src/assets/docs/images/benchmark-comparison.png)

**Available Chart Types**:
- **Scatter Plot**: Positioning organizations by compliance and risk scores
- **Bar Chart**: Side-by-side comparison with industry averages
- **Radar Chart**: Multi-axis comparison of different compliance areas

**Implementation**:
```jsx
// Scatter Plot Example
<ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
  <CartesianGrid />
  <XAxis type="number" dataKey="compliance" name="Compliance Score" unit="%" />
  <YAxis type="number" dataKey="risk" name="Risk Score" unit="" />
  <ZAxis type="number" dataKey="size" range={[50, 400]} name="Size" />
  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
  <Legend />
  <Scatter name="Organizations" data={benchmarkData} fill="#8884d8" />
  <Scatter name="Your Organization" data={[yourOrgData]} fill="#ff7300" shape="star" />
</ScatterChart>
```

## Detailed Results View

In addition to the dashboard visualizations, the application provides a detailed view of rule evaluation results:

### Rule Violation Cards

Each rule violation is displayed as a card with:

- Rule name and description
- Severity indicator (color-coded)
- Category and tags
- Failure message
- Remediation guidance

**Implementation**:
```jsx
<Card sx={{ 
  borderLeft: '4px solid', 
  borderLeftColor: result.rule.severity >= 4 ? '#d32f2f' : result.rule.severity >= 3 ? '#ed6c02' : '#2e7d32'
}}>
  <CardContent>
    <Typography variant="h6" color="primary">{result.rule.name}</Typography>
    <Typography variant="body2" color="textSecondary" gutterBottom>
      Category: {result.rule.category} | Severity: {getSeverityName(result.rule.severity)}
    </Typography>
    <Typography variant="body1">{result.message || 'Rule criteria not met'}</Typography>
    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
      Remediation: {result.remediation}
    </Typography>
  </CardContent>
</Card>
```

### Filtering and Sorting

The detailed view supports:

- Filtering by severity, category, and compliance status
- Sorting by severity, category, and rule name
- Searching by rule name or description

## Report Integration

Custom rules results are included in generated security assessment reports:

### Executive Summary

The executive summary includes:

- Overall compliance rate for custom rules
- Count of critical findings
- Key risk areas identified by custom rules

### Detailed Findings Section

The detailed findings section includes:

- List of failed rules grouped by category
- Severity and impact for each finding
- Remediation recommendations
- Supporting evidence

### Compliance Mapping

When custom rules are mapped to compliance frameworks:

- Rules are linked to specific compliance controls
- Compliance status is reported for each control
- Gaps in compliance are highlighted

## Data Preparation

Rule visualization data is prepared through these steps:

### 1. Data Collection

- Rule definitions are retrieved from the database
- Rule results are fetched from assessment data
- Historical data is loaded for trend analysis

### 2. Data Transformation

- Results are grouped by category, severity, etc.
- Compliance rates are calculated
- Time-series data is formatted for trend charts

### 3. Visualization Formatting

- Data is restructured to match chart requirements
- Color coding is applied based on severity and status
- Labels and tooltips are generated

**Example data preparation function**:
```javascript
// Prepare severity distribution data
const prepareSeverityDistribution = () => {
  const severities = new Map();
  
  ruleResults.forEach(result => {
    if (!result.compliant) {
      const severity = result.rule.severity || 1;
      const severityName = getSeverityName(severity);
      severities.set(severityName, (severities.get(severityName) || 0) + 1);
    }
  });
  
  return Array.from(severities.entries()).map(([name, value]) => ({ 
    name, 
    value,
    fullMark: ruleResults.length / 3 // For radar chart scaling
  }));
};
```

## Interactive Features

The visualizations include interactive features:

### 1. Chart Type Toggle

Users can switch between visualization types:

```jsx
<ToggleButtonGroup
  value={chartType}
  exclusive
  onChange={(e, newType) => newType && setChartType(newType)}
  size="small"
>
  <ToggleButton value="bar" aria-label="bar chart">
    <MuiTooltip title="Bar Chart">
      <BarChartIcon />
    </MuiTooltip>
  </ToggleButton>
  <ToggleButton value="pie" aria-label="pie chart">
    <MuiTooltip title="Pie Chart">
      <PieChartIcon />
    </MuiTooltip>
  </ToggleButton>
  <ToggleButton value="radar" aria-label="radar chart">
    <MuiTooltip title="Radar Chart">
      <RadarIcon />
    </MuiTooltip>
  </ToggleButton>
</ToggleButtonGroup>
```

### 2. Time Range Selection

Users can select different time ranges for historical data:

```jsx
<FormControl variant="outlined" size="small">
  <InputLabel id="timeframe-label">Timeframe</InputLabel>
  <Select
    labelId="timeframe-label"
    value={timeframe}
    onChange={(e) => setTimeframe(e.target.value)}
    label="Timeframe"
  >
    <MenuItem value="month">Last 6 Months</MenuItem>
    <MenuItem value="quarter">Last 4 Quarters</MenuItem>
    <MenuItem value="year">Last 2 Years</MenuItem>
  </Select>
</FormControl>
```

### 3. Drill-Down Capabilities

Users can click on chart elements to:

- View detailed rule information
- Filter by specific categories
- See all rules in a severity level

## Color Coding

The visualization system uses consistent color coding:

- **Severity Levels**:
  - High (5): #d32f2f (Red)
  - Medium-High (4): #f57c00 (Orange)
  - Medium (3): #ffb74d (Light Orange)
  - Low-Medium (2): #4caf50 (Light Green)
  - Low (1): #2e7d32 (Green)

- **Compliance Status**:
  - Compliant: #00C49F (Teal)
  - Non-compliant: #FF8042 (Orange-Red)

- **Chart Elements**:
  - Enhanced color palette for chart elements:
  ```javascript
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
    '#82ca9d', '#ffc658', '#a4de6c', '#d0ed57', '#83a6ed', 
    '#8dd1e1', '#9575cd', '#4fc3f7', '#4db6ac'
  ];
  ```

## Responsive Design

The visualizations are designed to be responsive:

- Charts resize based on container dimensions
- Mobile-friendly layouts for small screens
- Simplified views for limited display space

**Implementation**:
```jsx
<Box sx={{ height: 400 }}>
  <ResponsiveContainer width="100%" height="100%">
    {/* Chart components */}
  </ResponsiveContainer>
</Box>
```

## Accessibility

The visualization system includes accessibility features:

- Screen reader support for chart data
- Keyboard navigation for interactive elements
- High-contrast mode compatibility
- Text alternatives for graphical elements

## Best Practices

When working with custom rules visualizations:

1. **Focus on Clarity**: Prioritize clear communication of critical issues
2. **Use Appropriate Charts**: Choose visualization types that best represent the data
3. **Provide Context**: Include benchmark data or historical trends for context
4. **Highlight Priorities**: Emphasize high-severity issues that need attention
5. **Enable Action**: Link visualizations to detailed information and remediation guidance

## Integration with Advanced Dashboard

The custom rules visualizations are integrated into the Advanced Dashboard component (`AdvancedDashboard.tsx`). This component:

- Fetches rule data from the backend
- Prepares visualization datasets
- Renders appropriate charts based on user selection
- Provides interactive controls for visualization options

See the [Advanced Dashboard Visualizations](../../../frontend/src/docs/ADVANCED-DASHBOARD-VISUALIZATIONS.md) documentation for more details on the dashboard implementation.

## Conclusion

The custom rules visualization system transforms complex security assessment data into intuitive graphical representations that help users understand their security posture, identify critical issues, and track improvements over time. By leveraging these visualizations, users can more effectively manage their custom security rules and enhance their overall security program.

## See Also

- [Custom Rules Core Concepts](./CUSTOM-RULES.md)
- [Custom Rules User Guide](./CUSTOM-RULES-USER-GUIDE.md)
- [Custom Rules Index](./CUSTOM-RULES-INDEX.md)
- [Advanced Dashboard Visualizations](../../../frontend/src/docs/ADVANCED-DASHBOARD-VISUALIZATIONS.md)
