import React, { useState, useEffect } from 'react';
import { 
  Box, Grid, Typography, Card, CardContent, Button, CircularProgress, Tabs, Tab, 
  MenuItem, Select, FormControl, InputLabel, ToggleButton, ToggleButtonGroup,
  Divider, Paper, IconButton, Tooltip as MuiTooltip
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis,
  Treemap, AreaChart, Area
} from 'recharts';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import RadarIcon from '@mui/icons-material/Radar';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import useAuthNavigation from '../hooks/useAuthNavigation';
import reportsWrapper from '../services/reports-wrapper';
import rulesWrapper from '../services/rules-wrapper';

// Enhanced color palette for charts
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658',
  '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1', '#9575cd', '#4fc3f7', '#4db6ac'
];

// Dashboard component for advanced analytics
const AdvancedDashboard: React.FC = () => {
  const { isAuthenticated } = useAuthNavigation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [analysisData, setAnalysisData] = useState<any[]>([]);
  const [ruleResults, setRuleResults] = useState<any[]>([]);
  const [customRules, setCustomRules] = useState<any[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [timeframe, setTimeframe] = useState<string>('month');
  const [chartType, setChartType] = useState<string>('bar');

  // Fetch data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load dashboard data when analysis selection changes
  useEffect(() => {
    if (selectedAnalysisId) {
      loadRuleResults(selectedAnalysisId);
    }
  }, [selectedAnalysisId]);

  // Load all required dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch analyses
      const analysesResponse = await reportsWrapper.fetchAnalysisData();
      setAnalysisData(analysesResponse.data || []);
      
      // Set first analysis as selected if available
      if (analysesResponse.data && analysesResponse.data.length > 0) {
        setSelectedAnalysisId(analysesResponse.data[0].id);
        await loadRuleResults(analysesResponse.data[0].id);
      }
      
      // Fetch custom rules
      const rulesResponse = await rulesWrapper.fetchCustomRules();
      setCustomRules(rulesResponse.data || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  // Load rule evaluation results for a specific analysis
  const loadRuleResults = async (analysisId: number) => {
    try {
      const resultsResponse = await reportsWrapper.fetchRuleResults(analysisId);
      setRuleResults(resultsResponse.data || []);
    } catch (error) {
      console.error('Error loading rule results:', error);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // Calculate enhanced summary metrics from analysis data
  const calculateMetrics = () => {
    if (!analysisData || analysisData.length === 0) {
      return { 
        totalRisk: 0, 
        averageScore: 0, 
        highRiskAreas: 0,
        improvementRate: 0,
        complianceTrend: 0
      };
    }
    
    const totalRisk = analysisData.reduce((sum, item) => sum + (item.riskScore || 0), 0) / analysisData.length;
    const averageScore = analysisData.reduce((sum, item) => sum + (item.score || 0), 0) / analysisData.length;
    const highRiskAreas = analysisData.filter(item => (item.riskLevel === 'HIGH')).length;
    
    // Calculate simulated improvement rate (would use historical data in production)
    const improvementRate = Math.min(Math.max(Math.random() * 15, 0), 15).toFixed(1);
    
    // Simulated compliance trend (-5 to +5)
    const complianceTrend = Math.min(Math.max((Math.random() * 10) - 5, -5), 5).toFixed(1);
    
    return { 
      totalRisk, 
      averageScore, 
      highRiskAreas,
      improvementRate: parseFloat(improvementRate),
      complianceTrend: parseFloat(complianceTrend)
    };
  };
  
  // Prepare rule compliance data for charts
  const prepareRuleComplianceData = () => {
    const categoryMap = new Map();
    
    ruleResults.forEach(result => {
      const category = result.rule.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { name: category, passed: 0, failed: 0 });
      }
      
      const categoryData = categoryMap.get(category);
      if (result.compliant) {
        categoryData.passed += 1;
      } else {
        categoryData.failed += 1;
      }
    });
    
    return Array.from(categoryMap.values());
  };
  
  // Prepare category distribution data for pie chart
  const prepareCategoryDistribution = () => {
    const categories = new Map();
    
    ruleResults.forEach(result => {
      const category = result.rule.category || 'Uncategorized';
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    
    return Array.from(categories.entries()).map(([name, value]) => ({ name, value }));
  };
  
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
  
  // Get severity name from numeric value
  const getSeverityName = (severity: number): string => {
    const severityMap = {
      1: 'Low',
      2: 'Low-Medium',
      3: 'Medium',
      4: 'Medium-High',
      5: 'High'
    };
    return severityMap[severity as keyof typeof severityMap] || 'Unknown';
  };

  // Get historical trend data
  const getHistoricalTrendData = () => {
    // In a real app, this would come from historical records
    // For this demo, generate some sample data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      name: month,
      riskScore: Math.floor(Math.random() * 40) + 60,
      compliance: Math.floor(Math.random() * 30) + 70
    }));
  };
  
  // Format percentage for display
  const formatPercent = (value: number): string => {
    return `${Math.round(value)}%`;
  };
  
  // Calculate compliance rate
  const calculateComplianceRate = (): number => {
    if (!ruleResults || ruleResults.length === 0) return 0;
    const compliantCount = ruleResults.filter(result => result.compliant).length;
    return (compliantCount / ruleResults.length) * 100;
  };
  
  // Prepare risk area data for radar chart
  const prepareRiskAreaData = () => {
    const areas = [
      "Access Control", "Authentication", "Data Protection", 
      "Network Security", "Compliance", "Incident Response"
    ];
    
    // In a real app, these would be actual scores from the assessment
    return areas.map(area => ({
      area,
      score: Math.floor(Math.random() * 70) + 30,
      average: Math.floor(Math.random() * 50) + 50,
      fullMark: 100
    }));
  };
  
  // Prepare benchmark comparison data for scatter plot
  const prepareBenchmarkData = () => {
    const industries = [
      "Financial Services", "Healthcare", "Technology", 
      "Manufacturing", "Retail", "Government", "Education"
    ];
    
    return industries.map(industry => ({
      industry,
      compliance: Math.floor(Math.random() * 40) + 60,
      risk: Math.floor(Math.random() * 60) + 20,
      size: Math.floor(Math.random() * 50) + 10
    }));
  };
  
  // Prepare control effectiveness data
  const prepareControlEffectivenessData = () => {
    const controls = [
      "Encryption", "Access Management", "Patch Management", 
      "Monitoring", "Backup", "Training", "Incident Response"
    ];
    
    return controls.map(control => ({
      name: control,
      implementation: Math.floor(Math.random() * 40) + 60,
      effectiveness: Math.floor(Math.random() * 50) + 50,
    }));
  };
  
  // Prepare vulnerability distribution data for Treemap
  const prepareVulnerabilityData = () => {
    const categories = [
      { name: "Authentication", value: Math.floor(Math.random() * 200) + 100 },
      { name: "Access Control", value: Math.floor(Math.random() * 200) + 100 },
      { name: "Encryption", value: Math.floor(Math.random() * 200) + 100 },
      { name: "Input Validation", value: Math.floor(Math.random() * 200) + 100 },
      { name: "Session Management", value: Math.floor(Math.random() * 200) + 100 },
      { name: "Configuration", value: Math.floor(Math.random() * 200) + 100 },
      { name: "Error Handling", value: Math.floor(Math.random() * 200) + 100 },
      { name: "Logging", value: Math.floor(Math.random() * 200) + 100 }
    ];
    
    return categories;
  };
  
  // Prepare compliance over time data for area chart
  const prepareComplianceOverTimeData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return months.map(month => ({
      name: month,
      mandatory: Math.floor(Math.random() * 20) + 80,
      recommended: Math.floor(Math.random() * 30) + 60,
      optional: Math.floor(Math.random() * 40) + 40
    }));
  };
  
  const metrics = calculateMetrics();
  const complianceRate = calculateComplianceRate();
  const ruleComplianceData = prepareRuleComplianceData();
  const categoryDistribution = prepareCategoryDistribution();
  const severityDistribution = prepareSeverityDistribution();
  const historicalTrendData = getHistoricalTrendData();
  const riskAreaData = prepareRiskAreaData();
  const benchmarkData = prepareBenchmarkData();
  const controlEffectivenessData = prepareControlEffectivenessData();
  const vulnerabilityData = prepareVulnerabilityData();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Advanced Analytics Dashboard</Typography>
      
      {/* Visualization info banner */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: '#f0f7ff', 
          border: '1px solid #bbdefb',
          borderRadius: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1, color: '#1976d2' }} />
          <Typography variant="body2">
            Multiple visualization options are now available. Toggle between different chart types using the controls in each section.
          </Typography>
        </Box>
      </Paper>
      
      {/* Selector for analysis */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="analysis-select-label">Select Analysis</InputLabel>
          <Select
            labelId="analysis-select-label"
            id="analysis-select"
            value={selectedAnalysisId || ''}
            onChange={(e) => setSelectedAnalysisId(e.target.value as number)}
            label="Select Analysis"
          >
            {analysisData.map((analysis) => (
              <MenuItem key={analysis.id} value={analysis.id}>
                {analysis.name || `Analysis ${analysis.id}`} - {new Date(analysis.createdAt).toLocaleDateString()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {/* Dashboard tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="Compliance Overview" />
          <Tab label="Risk Analysis" />
          <Tab label="Controls & Vulnerabilities" />
        </Tabs>
      </Box>
      
      {/* Summary metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Overall Compliance Rate
              </Typography>
              <Typography variant="h4" component="div">
                {formatPercent(complianceRate)}
              </Typography>
              <Typography variant="body2" color={metrics.complianceTrend >= 0 ? "success.main" : "error.main"}>
                {metrics.complianceTrend >= 0 ? "↑" : "↓"} {Math.abs(metrics.complianceTrend)}% from last assessment
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Risk Score
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.totalRisk.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Scale: 0-100 (lower is better)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                High Risk Areas
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.highRiskAreas}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Requiring immediate attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Improvement Rate
              </Typography>
              <Typography variant="h4" component="div">
                {metrics.improvementRate}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Month-over-month progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tab content */}
      {tabIndex === 0 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3 }}>Compliance Overview</Typography>
          
          {/* Rule compliance by category */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Rule Compliance by Category</Typography>
                    <ToggleButtonGroup
                      size="small"
                      value={chartType}
                      exclusive
                      onChange={(e, newValue) => newValue && setChartType(newValue)}
                    >
                      <ToggleButton value="bar">
                        <BarChartIcon fontSize="small" />
                      </ToggleButton>
                      <ToggleButton value="pie">
                        <PieChartIcon fontSize="small" />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={ruleComplianceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="passed" name="Compliant" fill="#4caf50" />
                          <Bar dataKey="failed" name="Non-Compliant" fill="#f44336" />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={categoryDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            label
                          >
                            {categoryDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Historical Trend</Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Timeframe</InputLabel>
                      <Select
                        value={timeframe}
                        label="Timeframe"
                        onChange={(e) => setTimeframe(e.target.value as string)}
                      >
                        <MenuItem value="month">Monthly</MenuItem>
                        <MenuItem value="quarter">Quarterly</MenuItem>
                        <MenuItem value="year">Yearly</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="riskScore" name="Risk Score" stroke="#ff7300" />
                        <Line type="monotone" dataKey="compliance" name="Compliance %" stroke="#82ca9d" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Compliance Over Time by Requirement Type</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={prepareComplianceOverTimeData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="mandatory" name="Mandatory" stackId="1" stroke="#8884d8" fill="#8884d8" />
                        <Area type="monotone" dataKey="recommended" name="Recommended" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                        <Area type="monotone" dataKey="optional" name="Optional" stackId="1" stroke="#ffc658" fill="#ffc658" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {tabIndex === 1 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3 }}>Risk Analysis</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Non-Compliance by Severity</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={severityDistribution}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" />
                        <PolarRadiusAxis />
                        <Radar name="Non-Compliant Rules" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Risk Areas Assessment</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskAreaData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="area" />
                        <PolarRadiusAxis />
                        <Radar name="Your Score" dataKey="score" stroke="#ff7300" fill="#ff7300" fillOpacity={0.6} />
                        <Radar name="Industry Average" dataKey="average" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Industry Benchmark Comparison</Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{
                          top: 20,
                          right: 20,
                          bottom: 20,
                          left: 20,
                        }}
                      >
                        <CartesianGrid />
                        <XAxis type="number" dataKey="risk" name="Risk Score" unit="%" />
                        <YAxis type="number" dataKey="compliance" name="Compliance" unit="%" />
                        <ZAxis type="number" dataKey="size" range={[100, 500]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        <Scatter name="Industry Benchmarks" data={benchmarkData} fill="#8884d8" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {tabIndex === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 3 }}>Controls & Vulnerabilities</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Control Effectiveness</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={controlEffectivenessData}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 30,
                          left: 60,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="implementation" name="Implementation %" fill="#8884d8" />
                        <Bar dataKey="effectiveness" name="Effectiveness %" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Vulnerability Distribution</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                        data={vulnerabilityData}
                        dataKey="value"
                        aspectRatio={4/3}
                        stroke="#fff"
                        fill="#8884d8"
                      >
                        <Tooltip formatter={(value) => [`${value} points`, 'Risk Value']} />
                      </Treemap>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Custom Rules Impact</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Impact of custom rules on compliance and risk posture
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => navigate('/custom-rules')}
                    sx={{ mb: 2 }}
                  >
                    Manage Custom Rules
                  </Button>
                  
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={customRules.map(rule => ({
                          name: rule.name,
                          impact: Math.floor(Math.random() * 30) + 1,
                          severity: rule.severity || 1
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="impact" name="Compliance Impact" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AdvancedDashboard;
