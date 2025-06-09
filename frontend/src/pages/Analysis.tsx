import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchAnalysisById,
  generateReport,
  selectCurrentAnalysis,
  selectAnalysisLoading,
  selectAnalysisError,
  selectGeneratedReportId
} from '../store/slices/analysisSlice';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress as MuiCircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Chip,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  createTheme,
  ThemeProvider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  DonutLarge as DonutLargeIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Area,
  AreaChart,
  LineChart,
  Line
} from 'recharts';

// Define chart colors
const CHART_COLORS = {
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
  primary: '#1976d2',
  secondary: '#dc004e',
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#4caf50',
  safe: '#2e7d32'
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: CHART_COLORS.critical,
  high: CHART_COLORS.high,
  medium: CHART_COLORS.medium,
  low: CHART_COLORS.low,
  none: CHART_COLORS.safe
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
  },
});

// Custom Gauge Chart Component
const GaugeChart: React.FC<{ value: number; size?: number }> = ({ value, size = 200 }) => {
  const gaugeValue = Math.min(Math.max(value, 0), 100);
  const theme = useTheme();
  
  const getColor = (value: number) => {
    if (value >= 80) return theme.palette.success.main;
    if (value >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <Box position="relative" width={size} height={size} mx="auto">
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {/* Background Circle */}
        <path
          d="M 50,50 m 0,-40 a 40,40 0 1 1 0,80 a 40,40 0 1 1 0,-80"
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="10"
        />
        
        {/* Value Arc - calculated based on the score */}
        <path
          d={`M 50,50 m 0,-40 a 40,40 0 ${gaugeValue / 100 <= 0.5 ? 0 : 1} 1 ${
            40 * Math.sin((Math.PI * 2 * gaugeValue) / 100)
          },${40 * (1 - Math.cos((Math.PI * 2 * gaugeValue) / 100))}`}
          fill="none"
          stroke={getColor(gaugeValue)}
          strokeWidth="10"
          strokeLinecap="round"
        />
        
        {/* Center Text */}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontWeight="bold"
          fill={getColor(gaugeValue)}
        >
          {Math.round(gaugeValue)}
        </text>
        
        <text
          x="50"
          y="65"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fill="#666"
        >
          SECURITY SCORE
        </text>
      </svg>
    </Box>
  );
};

// Severity Distribution Pie Chart
const SeverityPieChart: React.FC<{ findings: any[] }> = ({ findings }) => {
  // Count findings by severity
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      none: 0
    };
    
    findings.forEach(finding => {
      const impact = finding.impact as string;
      if (Object.prototype.hasOwnProperty.call(counts, impact)) {
        counts[impact]++;
      }
    });
    
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([severity, count]) => ({ 
        name: severity.charAt(0).toUpperCase() + severity.slice(1), 
        value: count 
      }));
  }, [findings]);
  
  // Early return after useMemo to avoid conditional hook call
  if (severityCounts.length === 0) return null;

  return (
    <Box height={230} width="100%">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={severityCounts}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            labelLine={true}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            dataKey="value"
          >
            {severityCounts.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={SEVERITY_COLORS[entry.name.toLowerCase()] || CHART_COLORS.medium}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} Findings`, 'Count']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

// Category Score Radar Chart
const CategoryRadarChart: React.FC<{ categories: any[] }> = ({ categories }) => {
  // Always call useMemo first before any conditional returns
  const data = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    
    return categories.map(cat => ({
      subject: cat.name,
      score: cat.score,
      fullMark: 100
    }));
  }, [categories]);
  
  // Early return after useMemo
  if (!categories || categories.length === 0) return null;

  return (
    <Box height={350} width="100%">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart outerRadius={90} data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar
            name="Security Score"
            dataKey="score"
            stroke="#1976d2"
            fill="#1976d2"
            fillOpacity={0.6}
          />
          <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </Box>
  );
};

// Horizontal Bar Chart for Category Scores
const CategoryBarChart: React.FC<{ categories: any[] }> = ({ categories }) => {
  // Always call useMemo first before any conditional returns
  const data = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    
    return categories.map(cat => ({
      name: cat.name,
      score: cat.score
    }));
  }, [categories]);
  
  // Early return after useMemo
  if (!categories || categories.length === 0) return null;

  const getBarColor = (score: number) => {
    if (score >= 80) return CHART_COLORS.success;
    if (score >= 60) return CHART_COLORS.warning;
    return CHART_COLORS.error;
  };

  return (
    <Box height={40 * data.length + 80} width="100%">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 30, left: 150, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
          <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

// Trend Chart Component (mock data for now)
const TrendChart: React.FC = () => {
  // Mock data for historical trend - in a real app, this would come from API
  const trendData = useMemo(() => [
    { month: 'Jan', score: 62 },
    { month: 'Feb', score: 65 },
    { month: 'Mar', score: 68 },
    { month: 'Apr', score: 73 },
    { month: 'May', score: 78 },
    { month: 'Jun', score: 82 }
  ], []);

  return (
    <Box height={200} width="100%">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={trendData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(value: number) => [`${value}%`, 'Security Score']} />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke={CHART_COLORS.primary} 
            fillOpacity={1} 
            fill="url(#scoreGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

const Analysis: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const analysis = useAppSelector(selectCurrentAnalysis);
  const loading = useAppSelector(selectAnalysisLoading);
  const error = useAppSelector(selectAnalysisError);
  const generatedReportId = useAppSelector(selectGeneratedReportId);
  const [reportGenerating, setReportGenerating] = useState(false);

  useEffect(() => {
    if (analysisId) {
      dispatch(fetchAnalysisById(parseInt(analysisId)));
    }
  }, [analysisId, dispatch]);

  useEffect(() => {
    if (generatedReportId) {
      setReportGenerating(false);
      navigate(`/reports/${generatedReportId}`);
    }
  }, [generatedReportId, navigate]);

  const handleGenerateReport = () => {
    if (analysisId) {
      setReportGenerating(true);
      dispatch(generateReport(parseInt(analysisId)));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <WarningIcon color="action" />;
      case 'low':
        return <InfoIcon color="info" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <MuiCircularProgress />
        <Typography ml={2} variant="h6" color="textSecondary">
          Loading analysis...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">Error loading analysis: {error}</Alert>
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Box p={3}>
        <Alert severity="info">Analysis not found</Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Analysis Results</Typography>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            disabled={reportGenerating}
            onClick={handleGenerateReport}
          >
            {reportGenerating ? 'Generating Report...' : 'Generate Report'}
          </Button>
        </Box>

        {/* Overview and Score Section - Enhanced with gauge chart */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={7}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Overview</Typography>
                <Typography variant="body1" paragraph>
                  {analysis.summary}
                </Typography>
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status: 
                    <Chip
                      label={analysis.status}
                      color={analysis.status === 'completed' ? 'success' : analysis.status === 'processing' ? 'warning' : 'error'}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="subtitle2">
                    Completed: {analysis.completedAt ? new Date(analysis.completedAt).toLocaleString() : 'In Progress'}
                  </Typography>
                </Box>
                
                {/* Trend chart showing historical security score - mock data for now */}
                <Box mt={3}>
                  <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <TimelineIcon sx={{ mr: 1 }} />
                    Security Score Trend
                  </Typography>
                  <TrendChart />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={5}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" align="center" gutterBottom>Security Score</Typography>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                  {/* Enhanced Gauge Chart for Security Score */}
                  <GaugeChart value={analysis.score} />
                  
                  <Box mt={3}>
                    <Chip
                      label={
                        analysis.score >= 80 ? "Excellent" :
                        analysis.score >= 70 ? "Good" :
                        analysis.score >= 60 ? "Fair" :
                        analysis.score >= 50 ? "Needs Improvement" : "At Risk"
                      }
                      color={
                        analysis.score >= 80 ? "success" :
                        analysis.score >= 60 ? "warning" : "error"
                      }
                      sx={{ fontWeight: 'bold', fontSize: '1rem', px: 2 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Category Assessment Section - Enhanced with Radar Chart and Bar Chart */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Category Assessment
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" align="center" gutterBottom>
                  Security by Category
                </Typography>
                <CategoryRadarChart categories={analysis.categories} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} lg={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" align="center" gutterBottom>
                  Category Scores
                </Typography>
                <CategoryBarChart categories={analysis.categories} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Key Recommendations */}
        <Typography variant="h5" gutterBottom>
          Key Recommendations
        </Typography>
        <Paper sx={{ mb: 4, p: 2 }}>
          <List>
            {analysis.recommendations.map((rec, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <SecurityIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={rec} />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Findings by Category - Enhanced with Pie Charts */}
        <Typography variant="h5" gutterBottom>
          Detailed Findings
        </Typography>
        {analysis.categories.map((category) => (
          <Accordion 
            key={`findings-${category.name}`} 
            defaultExpanded={category.findings.some(f => f.impact === 'critical')} 
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" width="100%">
                <Typography variant="h6">{category.name}</Typography>
                <Box ml="auto" mr={2} display="flex" gap={1}>
                  {category.findings.some(f => f.impact === 'critical') && (
                    <Chip label="Critical Issues" color="error" size="small" />
                  )}
                  {category.findings.some(f => f.impact === 'high') && (
                    <Chip label="High Issues" color="warning" size="small" />
                  )}
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* Only show pie chart if there are findings */}
                {category.findings.length > 0 && (
                  <Grid item xs={12} md={4}>
                    <Box p={2}>
                      <Typography variant="subtitle1" align="center" gutterBottom>
                        <DonutLargeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Finding Severity Distribution
                      </Typography>
                      <SeverityPieChart findings={category.findings} />
                    </Box>
                  </Grid>
                )}
                
                <Grid item xs={12} md={category.findings.length > 0 ? 8 : 12}>
                  {category.findings.map((finding, idx) => (
                    <Box key={idx} mb={2}>
                      <Box display="flex" alignItems="center" mb={1}>
                        {getSeverityIcon(finding.impact)}
                        <Typography variant="subtitle1" ml={1} fontWeight="bold">
                          Finding #{idx + 1} - 
                          <Chip
                            label={finding.impact}
                            color={getSeverityColor(finding.impact)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Box>
                      <Typography variant="body1" paragraph>
                        {finding.description}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        <strong>Recommendation:</strong> {finding.recommendation}
                      </Typography>
                      {idx < category.findings.length - 1 && <Divider sx={{ my: 2 }} />}
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Action Buttons */}
        <Box display="flex" justifyContent="center" mt={4}>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            sx={{ mr: 2 }}
            disabled={reportGenerating}
            onClick={handleGenerateReport}
          >
            {reportGenerating ? 'Generating Report...' : 'Generate Full Report'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => window.print()}
          >
            Download Analysis
          </Button>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Analysis;
