# Advanced Dashboard Visualization Guide

This document provides guidance on the visualization options available in the Advanced Dashboard and how to implement additional visualizations.

## Available Visualization Types

The Advanced Dashboard supports multiple visualization types for displaying security and risk assessment data:

### Basic Chart Types
- **Bar Charts**: For comparing values across categories
- **Pie Charts**: For showing proportions of a whole
- **Line Charts**: For displaying trends over time
- **Area Charts**: For emphasizing volume under a line
- **Radar Charts**: For comparing multiple variables
- **Treemaps**: For displaying hierarchical data as nested rectangles
- **Scatter Plots**: For showing correlation between variables

### Implementation Details

The dashboard uses React with Material-UI for UI components and Recharts for visualization rendering.

```tsx
// Required imports
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
  Treemap, AreaChart, Area
} from 'recharts';
import { 
  ToggleButton, ToggleButtonGroup, Tooltip as MuiTooltip
} from '@mui/material';
```

## Visualization Selection UI

To allow users to toggle between different visualization types, implement a toggle button group:

```tsx
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

## Implementing Different Visualization Types

### Bar Chart Example

```tsx
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

### Pie Chart Example

```tsx
<PieChart>
  <Pie
    data={categoryDistribution}
    dataKey="value"
    nameKey="name"
    cx="50%"
    cy="50%"
    outerRadius={120}
    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
  >
    {categoryDistribution.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

### Radar Chart Example

```tsx
<RadarChart outerRadius={120} data={riskAreaData}>
  <PolarGrid />
  <PolarAngleAxis dataKey="area" />
  <PolarRadiusAxis angle={90} domain={[0, 100]} />
  <Radar
    name="Score"
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

### Scatter Plot Example

```tsx
<ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
  <CartesianGrid />
  <XAxis type="number" dataKey="compliance" name="Compliance Score" unit="%" />
  <YAxis type="number" dataKey="risk" name="Risk Score" unit="" />
  <ZAxis type="number" dataKey="size" range={[50, 400]} name="Size" />
  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
  <Legend />
  <Scatter name="Industries" data={benchmarkData} fill="#8884d8" />
</ScatterChart>
```

### Treemap Example

```tsx
<Treemap
  data={vulnerabilityData}
  dataKey="value"
  nameKey="name"
  stroke="#fff"
  fill="#8884d8"
>
  {vulnerabilityData.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
  ))}
  <Tooltip formatter={(value, name) => [`Count: ${value}`, name]} />
</Treemap>
```

### Area Chart Example

```tsx
<AreaChart data={complianceOverTimeData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Area type="monotone" dataKey="mandatory" name="Mandatory Controls" stackId="1" stroke="#8884d8" fill="#8884d8" />
  <Area type="monotone" dataKey="recommended" name="Recommended Controls" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
  <Area type="monotone" dataKey="optional" name="Optional Controls" stackId="1" stroke="#ffc658" fill="#ffc658" />
</AreaChart>
```

## Adding New Visualization Tabs

To add new visualization tabs to the dashboard:

1. Create a data preparation function for the new visualization
2. Add a new tab in the Tabs component
3. Add a new tab content section with the visualization

Example for adding a new tab:

```tsx
<Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
  <Tab label="Rule Analysis" />
  <Tab label="Category Breakdown" />
  <Tab label="Historical Trends" />
  <Tab label="Risk Mapping" />
  <Tab label="Benchmark Comparison" />
  <Tab label="Your New Tab" />
</Tabs>

{/* New Tab Content */}
{tabIndex === 5 && (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Your New Visualization</Typography>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(e, newType) => newType && setChartType(newType)}
          size="small"
        >
          {/* Visualization toggle options */}
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Your new visualization here */}
        </ResponsiveContainer>
      </Box>
    </CardContent>
  </Card>
)}
```

## Best Practices

1. **Data Transformation**: Always prepare and transform your data specifically for each visualization type
2. **Responsive Design**: Always wrap charts in a `ResponsiveContainer` to ensure they adapt to different screen sizes
3. **User Controls**: Provide toggle options for users to switch between visualization types
4. **Consistent Styling**: Use a consistent color palette across visualizations
5. **Performance**: Be mindful of rendering performance with large datasets

## Color Palette

The dashboard uses an enhanced color palette for visualizations:

```tsx
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658',
  '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1', '#9575cd', '#4fc3f7', '#4db6ac'
];
