import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import authTokens from '../utils/auth-tokens';
import { 
  fetchReports, 
  fetchReportById, 
  fetchReportIssues, 
  generateReportDownloadUrl, 
  selectReports, 
  selectReportIssues, 
  selectReportLoading, 
  selectDownloadUrl 
} from '../store/slices/reportSlice';
import { Report, ReportIssue, BrandingOptions } from '../services/report.service';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  TextField,
  FormControlLabel,
  Switch,
  FormLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  BugReport as BugReportIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Compare as CompareIcon,
  Brush as BrushIcon,
  Style as StyleIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `reports-tab-${index}`,
    'aria-controls': `reports-tabpanel-${index}`,
  };
}

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { reportId } = useParams<{ reportId?: string }>();
  
  // Set initial tab based on route
  const getInitialTab = () => {
    if (location.pathname.includes('/issues')) return 1;
    return 0;
  };

  const [tabValue, setTabValue] = useState(getInitialTab());
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(
    reportId ? parseInt(reportId, 10) : null
  );

  const dispatch = useAppDispatch();
  const reports = useAppSelector(selectReports);
  const reportIssues = useAppSelector(selectReportIssues);
  const loading = useAppSelector(selectReportLoading);
  const downloadUrl = useAppSelector(selectDownloadUrl);
  
  useEffect(() => {
    dispatch(fetchReports());
    
    // If we have a report ID in the URL, fetch that specific report
    if (reportId) {
      const id = parseInt(reportId, 10);
      dispatch(fetchReportById(id));
      setSelectedReportId(id);
    }
    
    // If we're on the issues page, fetch all issues
    if (location.pathname.includes('/issues')) {
      setTabValue(1);
    }
  }, [dispatch, reportId, location.pathname]);

  // Transform reports to include missing properties
  const recentReports = reports.map(report => ({
    ...report,
    name: report.title || '',
    framework: report.framework || report.categories?.[0]?.name || 'Unknown',
    date: report.createdAt || '',
    overallScore: report.score || 0,
    criticalIssues: report.criticalIssues || report.categories?.filter(c => c.score < 40).length || 0,
    highIssues: report.highIssues || report.categories?.filter(c => c.score >= 40 && c.score < 70).length || 0,
    mediumIssues: report.mediumIssues || report.categories?.filter(c => c.score >= 70 && c.score < 90).length || 0
  }));

  // Transform issues to ensure all properties exist
  const criticalIssues = reportIssues;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, reportId: number) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedReportId(reportId);
  };
  
  const handleViewReport = (reportId: number) => {
    console.log(`Attempting to view report with ID: ${reportId}`);
    
    // Log auth token status
    const token = authTokens.getAccessToken();
    const isExpired = token ? authTokens.isTokenExpired(token) : true;
    console.log(`Token status - exists: ${!!token}, expired: ${isExpired}`);
    
    // Ensure fresh token before fetching report
    authTokens.ensureFreshToken().then(success => {
      console.log(`Token refresh status: ${success ? 'success' : 'failed'}`);
      
      // Dispatch action to fetch the report
      console.log(`Dispatching fetchReportById for report ${reportId}`);
      dispatch(fetchReportById(reportId));
      
      // Navigate to report detail page
      navigate(`/reports/${reportId}`);
    });
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const [compareReportId, setCompareReportId] = useState<number | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showBrandingDialog, setShowBrandingDialog] = useState(false);
  const [brandingOptions, setBrandingOptions] = useState<BrandingOptions>({
    companyName: '',
    companyLogo: '',
    primaryColor: '#1976d2',
    secondaryColor: '#f5f5f5',
    headerText: '',
    footerText: '',
    contactInfo: '',
    includeLegalDisclaimer: false
  });

  const handleReportAction = (action: string) => {
    if (!selectedReportId) return;
    
    console.log(`Performing ${action} on report ${selectedReportId}`);
    handleMenuClose();

    // Ensure fresh token before performing any report action
    authTokens.ensureFreshToken().then(success => {
      console.log(`Token refresh status for ${action} action: ${success ? 'success' : 'failed'}`);
      
      if (action === 'download') {
        console.log(`Generating download URL for report ${selectedReportId}`);
        dispatch(generateReportDownloadUrl(selectedReportId))
          .unwrap()
          .then(url => {
            console.log(`Opening download URL: ${url}`);
            window.open(url, '_blank');
          })
          .catch(error => {
            console.error(`Error generating download URL: ${error}`);
          });
      } else if (action === 'email') {
        // Open email modal would be implemented here
        window.alert(`Email report ${selectedReportId} functionality would open here`);
      } else if (action === 'print') {
        console.log(`Generating print URL for report ${selectedReportId}`);
        dispatch(generateReportDownloadUrl(selectedReportId))
          .unwrap()
          .then(url => {
            console.log(`Opening print URL: ${url}`);
            const printWindow = window.open(url, '_blank');
            if (printWindow) {
              printWindow.addEventListener('load', () => {
                printWindow.print();
              });
            }
          })
          .catch(error => {
            console.error(`Error generating print URL: ${error}`);
          });
      } else if (action === 'view-issues') {
        console.log(`Fetching issues for report ${selectedReportId}`);
        dispatch(fetchReportIssues(selectedReportId));
        navigate('/reports/issues');
        setTabValue(1);
      } else if (action === 'compare') {
        // Open compare dialog
        setShowCompareDialog(true);
      } else if (action === 'customize-branding') {
        // Fetch current branding options and show dialog
        const reportId = selectedReportId;
        // In a real implementation, we would fetch the current branding options
        // For now, we'll just show the dialog with default options
        setShowBrandingDialog(true);
      }
    });
  };

  const handleCompareReports = () => {
    if (!selectedReportId || !compareReportId) return;
    
    // Call API to generate comparative report
    console.log(`Comparing reports ${selectedReportId} and ${compareReportId}`);
    // In a real implementation, we would call the API and navigate to the new report
    window.alert(`Generating comparative report between reports ${selectedReportId} and ${compareReportId}`);
    setShowCompareDialog(false);
  };

  const handleBrandingUpdate = () => {
    if (!selectedReportId) return;
    
    // Call API to update branding
    console.log(`Updating branding for report ${selectedReportId}`, brandingOptions);
    // In a real implementation, we would call the API
    window.alert(`Branding updated for report ${selectedReportId}`);
    setShowBrandingDialog(false);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <WarningIcon color="action" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Reports</Typography>
        {loading && (
          <Typography variant="body2" color="textSecondary">
            Loading reports...
          </Typography>
        )}
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="reports tab"
        >
          <Tab label="Recent Reports" icon={<FileIcon />} {...a11yProps(0)} />
          <Tab label="Critical Issues" icon={<BugReportIcon />} {...a11yProps(1)} />
          <Tab label="Compliance Summary" icon={<TrendingUpIcon />} {...a11yProps(2)} />
        </Tabs>

        {/* Recent Reports Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {recentReports.map((report) => (
              <Grid item xs={12} md={6} key={report.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {report.name}
                        </Typography>
                        <Chip
                          label={report.framework}
                          color="primary"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          icon={<SecurityIcon />}
                          label={`Score: ${report.overallScore}%`}
                          color={report.overallScore >= 80 ? "success" : report.overallScore >= 60 ? "warning" : "error"}
                          size="small"
                        />
                      </Box>
                      <IconButton 
                        aria-label="report options"
                        onClick={(e) => handleMenuClick(e, report.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      Generated on: {new Date(report.date).toLocaleDateString()}
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Issues Found:
                      </Typography>
                      <Box display="flex" gap={1}>
                        <Chip
                          icon={<ErrorIcon />}
                          label={`${report.criticalIssues} Critical`}
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<WarningIcon />}
                          label={`${report.highIssues} High`}
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<WarningIcon />}
                          label={`${report.mediumIssues} Medium`}
                          color="info"
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      startIcon={<DownloadIcon />}
                      size="small"
                      onClick={() => handleReportAction('download')}
                    >
                      Download
                    </Button>
                    <Button
                      startIcon={<ShareIcon />}
                      size="small"
                      onClick={() => handleReportAction('share')}
                    >
                      Share
                    </Button>
                    <Button
                      startIcon={<BugReportIcon />}
                      size="small"
                      onClick={() => handleReportAction('view-issues')}
                    >
                      View Issues
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {/* Report options menu */}
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleReportAction('download')}>
              <PdfIcon fontSize="small" sx={{ mr: 2 }} />
              Download PDF
            </MenuItem>
            <MenuItem onClick={() => handleReportAction('email')}>
              <EmailIcon fontSize="small" sx={{ mr: 2 }} />
              Email Report
            </MenuItem>
            <MenuItem onClick={() => handleReportAction('print')}>
              <PrintIcon fontSize="small" sx={{ mr: 2 }} />
              Print Report
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => handleReportAction('compare')}>
              <CompareIcon fontSize="small" sx={{ mr: 2 }} />
              Compare With Other Report
            </MenuItem>
            <MenuItem onClick={() => handleReportAction('customize-branding')}>
              <StyleIcon fontSize="small" sx={{ mr: 2 }} />
              Customize Branding
            </MenuItem>
          </Menu>
        </TabPanel>

        {/* Critical Issues Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Issue</TableCell>
                  <TableCell>Framework</TableCell>
                  <TableCell>Control</TableCell>
                  <TableCell align="center">Severity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {criticalIssues.map((issue) => (
                  <TableRow key={issue.id} hover>
                    <TableCell>
                      <Typography variant="body1">{issue.title}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {issue.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{issue.framework}</TableCell>
                    <TableCell>{issue.control}</TableCell>
                    <TableCell align="center">
                      <Tooltip title={issue.severity}>
                        {getSeverityIcon(issue.severity)}
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Compliance Summary Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {recentReports.map((report) => (
              <Grid item xs={12} md={4} key={`summary-${report.id}`}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">{report.framework}</Typography>
                    <Box display="flex" justifyContent="center" alignItems="center" mt={2} mb={2}>
                      <Typography variant="h3" sx={{ color: getScoreColor(report.overallScore) }}>
                        {report.overallScore}%
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Assessment Date" 
                          secondary={new Date(report.date).toLocaleDateString()} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Critical Issues" 
                          secondary={report.criticalIssues} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="High Issues" 
                          secondary={report.highIssues} 
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Report Comparison Dialog */}
      <Dialog open={showCompareDialog} onClose={() => setShowCompareDialog(false)}>
        <DialogTitle>Compare Reports</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Select a report to compare with the current report.
          </DialogContentText>
          <FormControl fullWidth margin="normal">
            <InputLabel id="compare-report-label">Compare with</InputLabel>
            <Select
              labelId="compare-report-label"
              value={compareReportId || ''}
              onChange={(e) => setCompareReportId(Number(e.target.value) || null)}
              label="Compare with"
            >
              {recentReports
                .filter(report => report.id !== selectedReportId)
                .map(report => (
                  <MenuItem key={report.id} value={report.id}>
                    {report.name} ({report.framework})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompareDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCompareReports}
            variant="contained"
            disabled={!compareReportId}
          >
            Generate Comparative Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Branding Customization Dialog */}
      <Dialog open={showBrandingDialog} onClose={() => setShowBrandingDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Customize Report Branding</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Customize the branding options for this report.
          </DialogContentText>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Name"
                fullWidth
                margin="normal"
                value={brandingOptions.companyName || ''}
                onChange={(e) => setBrandingOptions({...brandingOptions, companyName: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Logo URL"
                fullWidth
                margin="normal"
                value={brandingOptions.companyLogo || ''}
                onChange={(e) => setBrandingOptions({...brandingOptions, companyLogo: e.target.value})}
                helperText="Enter URL for logo or Base64 encoded image"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Primary Color"
                fullWidth
                margin="normal"
                value={brandingOptions.primaryColor || '#1976d2'}
                onChange={(e) => setBrandingOptions({...brandingOptions, primaryColor: e.target.value})}
                type="color"
                InputProps={{ sx: { height: 56 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Secondary Color"
                fullWidth
                margin="normal"
                value={brandingOptions.secondaryColor || '#f5f5f5'}
                onChange={(e) => setBrandingOptions({...brandingOptions, secondaryColor: e.target.value})}
                type="color"
                InputProps={{ sx: { height: 56 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Header Text"
                fullWidth
                margin="normal"
                value={brandingOptions.headerText || ''}
                onChange={(e) => setBrandingOptions({...brandingOptions, headerText: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Footer Text"
                fullWidth
                margin="normal"
                value={brandingOptions.footerText || ''}
                onChange={(e) => setBrandingOptions({...brandingOptions, footerText: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Contact Information"
                fullWidth
                margin="normal"
                multiline
                rows={3}
                value={brandingOptions.contactInfo || ''}
                onChange={(e) => setBrandingOptions({...brandingOptions, contactInfo: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={brandingOptions.includeLegalDisclaimer || false} 
                    onChange={(e) => setBrandingOptions({
                      ...brandingOptions, 
                      includeLegalDisclaimer: e.target.checked
                    })}
                  />
                }
                label="Include Legal Disclaimer"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBrandingDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBrandingUpdate}
            variant="contained"
          >
            Save Branding
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
