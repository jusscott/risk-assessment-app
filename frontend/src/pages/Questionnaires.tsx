import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Template, 
  InProgressSubmission,
  CompletedSubmission
} from '../services/questionnaire.service';
import questionnaireWrapper from '../services/questionnaire-wrapper';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  ArrowForward as ArrowForwardIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Pause as PauseIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import authTokens from '../utils/auth-tokens';
// Use window.location for navigation since we're having issues with react-router-dom types

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
      id={`questionnaires-tabpanel-${index}`}
      aria-labelledby={`questionnaires-tab-${index}`}
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
    id: `questionnaires-tab-${index}`,
    'aria-controls': `questionnaires-tabpanel-${index}`,
  };
}

const Questionnaires: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);

  // State for API data
  const [inProgressQuestionnaires, setInProgressQuestionnaires] = useState<InProgressSubmission[]>([]);
  const [completedQuestionnaires, setCompletedQuestionnaires] = useState<CompletedSubmission[]>([]);
  const [availableQuestionnaires, setAvailableQuestionnaires] = useState<Template[]>([]);
  const [loading, setLoading] = useState<{
    inProgress: boolean;
    completed: boolean;
    templates: boolean;
    startingQuestionnaire: Record<number, boolean>;
  }>({
    inProgress: false,
    completed: false,
    templates: false,
    startingQuestionnaire: {}
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch questionnaire data function
  const fetchQuestionnaires = async () => {
    console.log('🔄 fetchQuestionnaires called - loading all questionnaire data');
    
    try {
      // Load templates (available questionnaires)
      setLoading(prev => ({ ...prev, templates: true }));
      console.log('📊 Loading available templates...');
      const templatesResponse = await questionnaireWrapper.getTemplates();
      setAvailableQuestionnaires(templatesResponse.data || []);
      console.log('✅ Templates loaded:', templatesResponse.data?.length || 0);
      
      // Load in-progress submissions
      setLoading(prev => ({ ...prev, inProgress: true }));
      console.log('📊 Loading in-progress submissions...');
      const inProgressResponse = await questionnaireWrapper.getInProgressSubmissions();
      setInProgressQuestionnaires(inProgressResponse.data || []);
      console.log('✅ In-progress submissions loaded:', inProgressResponse.data?.length || 0);
      
      // Load completed submissions
      setLoading(prev => ({ ...prev, completed: true }));
      console.log('📊 Loading completed submissions...');
      const completedResponse = await questionnaireWrapper.getCompletedSubmissions();
      setCompletedQuestionnaires(completedResponse.data || []);
      console.log('✅ Completed submissions loaded:', completedResponse.data?.length || 0);
      
    } catch (error: any) {
      console.error('❌ Error fetching questionnaires:', error);
      setError(`Failed to load questionnaires: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading({
        inProgress: false,
        completed: false,
        templates: false,
        startingQuestionnaire: {}
      });
    }
  };

  // Set initial tab value based on URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 2) {
        setTabValue(tabIndex);
      }
    }
  }, [searchParams]);

  // Fetch data from API
  useEffect(() => {
    // ENHANCED: Add comprehensive token availability check at component mount
    const tokenCheck = {
      authTokensResult: authTokens.getAccessToken(),
      localStorageResult: localStorage.getItem('token'),
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Questionnaires component mounted - token status:', {
      authTokensHasToken: !!tokenCheck.authTokensResult,
      localStorageHasToken: !!tokenCheck.localStorageResult,
      tokensMatch: tokenCheck.authTokensResult === tokenCheck.localStorageResult,
      authTokenLength: tokenCheck.authTokensResult?.length || 0,
      localStorageTokenLength: tokenCheck.localStorageResult?.length || 0
    });
    
    if (!tokenCheck.authTokensResult && !tokenCheck.localStorageResult) {
      console.error('🚨 CRITICAL: No tokens available when Questionnaires component mounted!');
      console.error('This indicates the token storage regression is active');
      
      // Check if user is supposed to be authenticated according to Redux
      console.log('🔍 Checking Redux auth state...');
    } else if (!tokenCheck.authTokensResult && tokenCheck.localStorageResult) {
      console.warn('⚠️ Token mismatch: localStorage has token but authTokens does not');
      console.warn('Attempting to sync authTokens with localStorage...');
      
      // Force sync authTokens with localStorage
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        authTokens.storeTokens(tokenCheck.localStorageResult, refreshToken || '');
        console.log('🔄 Attempted authTokens sync with localStorage');
      } catch (syncError) {
        console.error('❌ Failed to sync authTokens:', syncError);
      }
    }
    
    fetchQuestionnaires();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const navigate = useNavigate();

  const handleStartQuestionnaire = async (id: number) => {
    console.log("--- Start Questionnaire Flow Begin ---");
    
    // Set the flag FIRST, before any operations
    // This prevents useAuthNavigation from redirecting during this transition
    console.log("Setting startingQuestionnaire flag in sessionStorage");
    sessionStorage.setItem('startingQuestionnaire', 'true');
    
    try {
      // Check if user is authenticated by checking for token
      const token = localStorage.getItem('token');
      if (!token) {
        console.log("User not authenticated. Redirecting to login...");
        // Store the template ID they were trying to start in localStorage
        localStorage.setItem('pendingQuestionnaireId', id.toString());
        // Redirect to login page with explicit return URL
        navigate('/login?redirectTo=/questionnaires');
        
        // Clear the flag if we're redirecting to login (different flow)
        sessionStorage.removeItem('startingQuestionnaire');
        return;
      }
      
      // Set loading state for this specific questionnaire
      setLoading(prev => ({ 
        ...prev, 
        startingQuestionnaire: { ...prev.startingQuestionnaire, [id]: true } 
      }));
      
      try {
        console.log("Making API call to start submission:", id);
        const response = await questionnaireWrapper.startSubmission(id);
        console.log("API response received, starting questionnaire with ID:", response.data.id);
        
        // Use React Router's navigate instead of window.location for SPA navigation
        console.log("Navigating to questionnaire detail:", `/questionnaires/${response.data.id}`);
        navigate(`/questionnaires/${response.data.id}`);
        
        // Don't clear the flag immediately to ensure the navigation completes
        // The flag will be cleared after navigation using window.addEventListener
        window.addEventListener('load', function clearFlagOnceLoaded() {
          console.log("Page loaded, clearing startingQuestionnaire flag");
          sessionStorage.removeItem('startingQuestionnaire');
          window.removeEventListener('load', clearFlagOnceLoaded);
        });
        
        // Backup timeout to clear the flag in case the load event doesn't fire
        setTimeout(() => {
          console.log("Backup timeout clearing startingQuestionnaire flag");
          sessionStorage.removeItem('startingQuestionnaire');
        }, 3000);  // Longer timeout to ensure navigation completes
      } catch (apiError: any) {
        // Handle specific 401 errors from API
        if (apiError.status === 401) {
          console.log("Authentication required for this action. Redirecting to login...");
          // Store the template ID they were trying to start
          localStorage.setItem('pendingQuestionnaireId', id.toString());
          // Use React Router's navigate instead of window.location
          navigate('/login?redirectTo=/questionnaires');
          return;
        } else {
          // For other errors, show detailed error message but stay on current page
          console.error('Error starting questionnaire:', apiError);
          const errorDetails = apiError.isQuestionnaireEndpoint ? 
            ' (Questionnaire Service Error)' : '';
          setError('Failed to start questionnaire' + errorDetails + ': ' + 
            (apiError.message || 'Please try again.'));
          // Make sure we explicitly return here to prevent any default redirects
          return;
        }
      }
      // Add explicit return after the inner try-catch to ensure we exit the function
      // completely when there's an error or successful navigation
      return;
    } catch (err: any) {
      console.error('Unexpected error in handleStartQuestionnaire:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      // Clear loading state for this specific questionnaire
      setLoading(prev => ({ 
        ...prev, 
        startingQuestionnaire: { ...prev.startingQuestionnaire, [id]: false } 
      }));
    }
  };

  const handleContinueQuestionnaire = (id: number) => {
    console.log("Continuing questionnaire with ID:", id);
    
    // Set a flag in sessionStorage to indicate we're continuing a questionnaire
    // This prevents useAuthNavigation from redirecting during this transition
    sessionStorage.setItem('startingQuestionnaire', 'true');
    
    // Navigate to the questionnaire
    navigate(`/questionnaires/${id}`);
    
    // Clear the flag after navigation
    setTimeout(() => {
      sessionStorage.removeItem('startingQuestionnaire');
    }, 1000);
  };

  const handleViewResults = async (id: number) => {
    console.log("Viewing results for ID:", id);
    
    // Ensure we have a fresh token before navigating to report
    const token = localStorage.getItem('token');
    if (!token) {
      console.log("User not authenticated. Redirecting to login...");
      navigate('/login?redirectTo=' + encodeURIComponent(`/reports/${id}`));
      return;
    }
    
    try {
      // Import auth-tokens dynamically to avoid circular dependencies
      const authTokens = await import('../utils/auth-tokens').then(module => module.default);
      console.log("Ensuring fresh token before viewing report");
      const success = await authTokens.ensureFreshToken();
      
      if (success) {
        console.log("Token refreshed successfully, navigating to report");
        navigate(`/reports/${id}`);
      } else {
        console.error("Failed to refresh token");
        setError("Authentication error. Please log in again.");
        navigate('/login?redirectTo=' + encodeURIComponent(`/reports/${id}`));
      }
    } catch (err) {
      console.error("Error ensuring fresh token:", err);
      setError("Authentication error. Please try again.");
    }
  };

  return (
    <Box p={3}>
      {/* Error Alert */}
      <Collapse in={!!error}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      </Collapse>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Questionnaires</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            sx={{ mr: 1 }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            sx={{ mr: 1 }}
          >
            Filter
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setTabValue(2)}
          >
            New Assessment
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="In Progress" {...a11yProps(0)} />
          <Tab label="Completed" {...a11yProps(1)} />
          <Tab label="Start New" {...a11yProps(2)} />
        </Tabs>

        {/* In Progress Questionnaires */}
        <TabPanel value={tabValue} index={0}>
          {inProgressQuestionnaires.length > 0 ? (
            <Grid container spacing={3}>
              {inProgressQuestionnaires.map((questionnaire) => (
                <Grid item xs={12} md={6} key={questionnaire.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box>
                          <Typography variant="h6">{questionnaire.name}</Typography>
                          <Chip 
                            label={questionnaire.framework} 
                            color="primary" 
                            size="small" 
                            sx={{ mr: 1 }} 
                          />
                          <Chip 
                            icon={<PauseIcon />} 
                            label="In Progress" 
                            color="warning" 
                            size="small" 
                          />
                        </Box>
                        <IconButton
                          aria-label="edit"
                          onClick={() => handleContinueQuestionnaire(questionnaire.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>
                      
                      <Box mb={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="textSecondary">
                            Progress
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {questionnaire.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={questionnaire.progress} 
                          sx={{ height: 8, borderRadius: 4, mt: 1 }} 
                        />
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="textSecondary">
                          Started: {new Date(questionnaire.startDate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Last updated: {new Date(questionnaire.lastUpdated).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        color="primary" 
                        fullWidth
                        onClick={() => handleContinueQuestionnaire(questionnaire.id)}
                      >
                        Continue
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box textAlign="center" p={3}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No in-progress questionnaires
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setTabValue(2)}
              >
                Start a New Assessment
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* Completed Questionnaires */}
        <TabPanel value={tabValue} index={1}>
          {completedQuestionnaires.length > 0 ? (
            <Grid container spacing={3}>
              {completedQuestionnaires.map((questionnaire) => (
                <Grid item xs={12} md={6} key={questionnaire.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box>
                          <Typography variant="h6">{questionnaire.name}</Typography>
                          <Chip 
                            label={questionnaire.framework} 
                            color="primary" 
                            size="small" 
                            sx={{ mr: 1 }} 
                          />
                          <Chip 
                            icon={<CheckCircleIcon />} 
                            label="Completed" 
                            color="success" 
                            size="small" 
                          />
                        </Box>
                        <Typography 
                          variant="h5" 
                          color={questionnaire.score > 80 ? "success.main" : 
                                 questionnaire.score > 60 ? "warning.main" : "error.main"}
                        >
                          {questionnaire.score}%
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="textSecondary">
                        Completed on: {new Date(questionnaire.completionDate).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        color="primary" 
                        fullWidth
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => handleViewResults(questionnaire.id)}
                      >
                        View Report
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box textAlign="center" p={3}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No completed questionnaires
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setTabValue(2)}
              >
                Start a New Assessment
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* Available Questionnaires */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Available Compliance Frameworks
          </Typography>
          <List>
            {availableQuestionnaires.map((questionnaire, index) => (
              <React.Fragment key={questionnaire.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem>
                  <ListItemText
                    primary={questionnaire.name}
                    secondary={
                      <React.Fragment>
                        <Typography
                          component="span"
                          variant="body2"
                          color="textPrimary"
                        >
                          {questionnaire.description}
                        </Typography>
                        {` — ${questionnaire.questions} questions • Estimated time: ${questionnaire.estimatedTime}`}
                      </React.Fragment>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      endIcon={loading.startingQuestionnaire[questionnaire.id] ? null : <ArrowForwardIcon />}
                      onClick={() => handleStartQuestionnaire(questionnaire.id)}
                      disabled={loading.startingQuestionnaire[questionnaire.id]}
                    >
                      {loading.startingQuestionnaire[questionnaire.id] ? 'Starting...' : 'Start'}
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default Questionnaires;
