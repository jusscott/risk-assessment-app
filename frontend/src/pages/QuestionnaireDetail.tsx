import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Question, 
  Answer, 
  Submission,
  TemplateDetail
} from '../services/questionnaire.service';
import questionnaireWrapper from '../services/questionnaire-wrapper';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Alert,
  IconButton,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  Help as HelpIcon
} from '@mui/icons-material';

interface RouteParams {
  id: string;
}

const QuestionnaireDetail: React.FC = () => {
  const { id } = useParams<keyof RouteParams>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const frameworkId = queryParams.get('framework');
  const isNewQuestionnaire = !id || id === 'new';
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // Ensure the navigation flag is set immediately on component mount 
  // This prevents unwanted redirects from useAuthNavigation
  useEffect(() => {
    console.log("QuestionnaireDetail component mounted");
    console.log("Setting startingQuestionnaire flag as failsafe");
    sessionStorage.setItem('startingQuestionnaire', 'true');
    
    // Clean up the flag when the component unmounts
    return () => {
      console.log("QuestionnaireDetail component unmounting, clearing flag");
      sessionStorage.removeItem('startingQuestionnaire');
    };
  }, []);

  // Load questions for the current page
  const loadQuestionsForPage = async (templateId: number, page: number, size: number) => {
    try {
      setLoadingQuestions(true);
      const response = await questionnaireWrapper.getTemplateById(templateId, page, size);
      if (response.success) {
        // Update template with new questions from this page
        setTemplate(prev => {
          if (!prev) return response.data;
          return {
            ...prev,
            questions: response.data.questions,
            pagination: response.data.pagination
          };
        });
        
        console.log(`Loaded ${response.data.questions.length} questions for page ${page}`);
        return response.data.questions;
      } else {
        throw new Error("Failed to load questions");
      }
    } catch (err) {
      console.error("Error loading questions for page:", err);
      setError("Failed to load questions. Please try again.");
      return [];
    } finally {
      setLoadingQuestions(false);
    }
  };
  
  // Fetch submission details or initialize new questionnaire
  useEffect(() => {
    const initializeQuestionnaire = async () => {
      try {
        setLoading(true);
        console.log("Initializing questionnaire, ID:", id);
        
        // Check if user is authenticated by checking for token
        const token = localStorage.getItem('token');
        if (!token) {
          console.log("User not authenticated. Redirecting to login...");
          navigate('/login?redirectTo=' + encodeURIComponent(location.pathname + location.search));
          return;
        }
        
        // Case 1: Creating a new questionnaire
        if (isNewQuestionnaire) {
          // If a framework ID is provided, fetch that framework's template
          if (frameworkId) {
            // For framework-specific template, we'd need an API endpoint
            // Using getTemplateById as a fallback
            const response = await questionnaireWrapper.getTemplateById(parseInt(frameworkId));
            setTemplate(response.data);
            
            // Create a real submission instead of mocking
            try {
              console.log("Creating new submission for template ID:", response.data.id);
              const submissionRes = await questionnaireWrapper.startSubmission(response.data.id);
              console.log("Submission response:", submissionRes);
              
              if (submissionRes.success && submissionRes.data) {
                setSubmission(submissionRes.data);
                console.log("New submission created with ID:", submissionRes.data.id);
              } else {
                throw new Error("Failed to create submission");
              }
            } catch (submissionError: any) {
              // Handle specific 401 errors from API
              if (submissionError.status === 401) {
                console.log("Authentication required for this action. Redirecting to login...");
                navigate('/login?redirectTo=' + encodeURIComponent(location.pathname + location.search));
                return;
              } else {
                console.error("Error creating submission:", submissionError);
                setError("Failed to create a new submission. Please try again.");
                return;
              }
            }
            
            setSuccess('New assessment created successfully');
          } else {
            // Without frameworkId, fetch available templates
            const templatesRes = await questionnaireWrapper.getTemplates();
            if (templatesRes.data && templatesRes.data.length > 0) {
              // Get full template details
              const templateDetailRes = await questionnaireWrapper.getTemplateById(templatesRes.data[0].id);
              setTemplate(templateDetailRes.data);
              
              // Create a real submission using the first available template
              try {
                console.log("Creating new submission for template ID:", templateDetailRes.data.id);
                const submissionRes = await questionnaireWrapper.startSubmission(templateDetailRes.data.id);
                console.log("Submission response:", submissionRes);
                
                if (submissionRes.success && submissionRes.data) {
                  setSubmission(submissionRes.data);
                  console.log("New submission created with ID:", submissionRes.data.id);
                } else {
                  throw new Error("Failed to create submission");
                }
              } catch (submissionError: any) {
                // Handle specific 401 errors from API
                if (submissionError.status === 401) {
                  console.log("Authentication required for this action. Redirecting to login...");
                  navigate('/login?redirectTo=' + encodeURIComponent(location.pathname + location.search));
                  return;
                } else {
                  console.error("Error creating submission:", submissionError);
                  setError("Failed to create a new submission. Please try again.");
                  return;
                }
              }
            } else {
              setError('No assessment templates available');
            }
          }
        } 
        // Case 2: Opening an existing questionnaire
        else {
          try {
            const response = await questionnaireWrapper.getSubmissionById(parseInt(id));
            setSubmission(response.data);
            
            // If the submission has a template, set it (handle both uppercase and lowercase)
            // Use type assertion to handle Prisma's uppercase naming vs interface lowercase naming
            const submissionData = response.data as any;
            let currentTemplate = null;
            
            if (submissionData.Template) {
              // Transform the data structure to match frontend expectations
              currentTemplate = {
                ...submissionData.Template,
                questions: submissionData.Template.Question || submissionData.Template.questions || []
              };
              setTemplate(currentTemplate);
            } else if (submissionData.template) {
              currentTemplate = submissionData.template;
              setTemplate(currentTemplate);
            }
            
            // Initialize answers from existing submission data (handle both uppercase and lowercase)
            const answersData = submissionData.Answer || submissionData.answers || [];
            if (answersData && answersData.length > 0) {
              const answerMap: { [key: number]: string } = {};
              answersData.forEach((answer: Answer) => {
                answerMap[answer.questionId] = answer.value;
              });
              setAnswers(answerMap);
              
              // Calculate the starting step based on answered questions using the current template
              if (currentTemplate && currentTemplate.questions) {
                const sortedQuestions = [...currentTemplate.questions].sort((a, b) => a.order - b.order);
                const answeredCount = Object.keys(answerMap).length;
                const totalCount = sortedQuestions.length;
                
                // Find the first unanswered question to continue from
                let nextUnansweredIndex = 0;
                for (let i = 0; i < sortedQuestions.length; i++) {
                  if (!answerMap[sortedQuestions[i].id]) {
                    nextUnansweredIndex = i;
                    break;
                  }
                  // If all questions are answered, stay at the last question
                  nextUnansweredIndex = i;
                }
                
                // Calculate progress percentage
                const progressPercentage = Math.min(100, Math.round((answeredCount / totalCount) * 100));
                
                // CRITICAL FIX: Ensure activeStep is set AFTER answers are loaded
                // Use setTimeout to ensure state updates are processed
                setTimeout(() => {
                  setActiveStep(nextUnansweredIndex);
                  setProgress(progressPercentage);
                  console.log(`📍 Restored to question ${nextUnansweredIndex + 1} (index ${nextUnansweredIndex})`);
                  console.log(`📊 Final progress update: ${answeredCount}/${totalCount} = ${progressPercentage}%`);
                }, 150);
                
                console.log(`Restored questionnaire progress: ${answeredCount}/${totalCount} questions answered (${progressPercentage}%), starting at question ${nextUnansweredIndex + 1}`);
              }
            } else {
              // No existing answers, start from the beginning
              setActiveStep(0);
              setProgress(0);
              console.log('🆕 Starting new questionnaire from the beginning');
            }
          } catch (err: any) {
            // Handle specific 401 errors from API
            if (err.status === 401) {
              console.log("Authentication required for this action. Redirecting to login...");
              navigate('/login?redirectTo=' + encodeURIComponent(location.pathname));
              return;
            } else {
              throw err;
            }
          }
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error initializing questionnaire:', err);
        setError('Failed to load questionnaire. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    initializeQuestionnaire();
  }, [id, isNewQuestionnaire, frameworkId, navigate, location.pathname, location.search]);
  
  // Check if we need to load a new page of questions
  const checkAndLoadNextPage = async () => {
    if (!template || !submission) return;
    
    // Check if we have pagination info
    if (template.pagination) {
      const { pageSize, totalPages } = template.pagination;
      
      // Calculate which page we're navigating to based on activeStep
      const currentIndex = activeStep;
      const nextIndex = currentIndex + 1;
      const questionsPerPage = pageSize;
      const currentPage = Math.floor(currentIndex / questionsPerPage) + 1;
      const nextPage = Math.floor(nextIndex / questionsPerPage) + 1;
      
      // If moving to next page, load that page's questions
      if (nextPage > currentPage && nextPage <= totalPages) {
        console.log(`Loading questions for page ${nextPage}`);
        await loadQuestionsForPage(template.id, nextPage, pageSize);
      }
    }
  };
  
  // Handle next step
  const handleNext = async () => {
    if (template && activeStep < template.questions.length - 1) {
      // Check if we need to load the next page of questions
      await checkAndLoadNextPage();
      
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
      updateProgress();
    }
  };
  
  // Handle back step
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Handle answer change
  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear any previous success message
    setSuccess(null);
  };
  
  // Update progress based on answered questions
  const updateProgress = useCallback(() => {
    if (template) {
      const answeredCount = Object.keys(answers).length;
      const totalCount = template.questions.length;
      const progressPercentage = Math.min(100, Math.round((answeredCount / totalCount) * 100));
      setProgress(progressPercentage);
      console.log(`📊 Updated progress: ${answeredCount}/${totalCount} questions answered (${progressPercentage}%)`);
    }
  }, [answers, template]);
  
  // Call updateProgress whenever answers change
  useEffect(() => {
    updateProgress();
  }, [answers, template, updateProgress]);
  
  // Save current progress
  const handleSave = async () => {
    if (!submission || !template) return;
    
    try {
      setSaving(true);
      
      // Format answers for API
      const answersArray: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
        questionId: parseInt(questionId),
        submissionId: submission.id,
        value: value as string
      }));
      
      await questionnaireWrapper.updateSubmission(submission.id, answersArray);
      
      setSuccess('Progress saved successfully');
      updateProgress();
      setSaving(false);
    } catch (err: any) {
      console.error('Error saving answers:', err);
      setError('Failed to save progress. Please try again.');
      setSaving(false);
    }
  };
  
  // Submit the completed questionnaire
  const handleSubmit = async () => {
    if (!submission || !template) return;
    
    // Check if all required questions are answered
    const unansweredRequired = template.questions
      .filter((q: Question) => q.required)
      .filter((q: Question) => !answers[q.id]);
      
    if (unansweredRequired.length > 0) {
      setError(`Please answer all required questions before submitting. You have ${unansweredRequired.length} required questions unanswered.`);
      return;
    }
    
    try {
      setSubmitting(true);
      
      // First save the current answers
      const answersArray: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
        questionId: parseInt(questionId),
        submissionId: submission.id,
        value: value as string
      }));
      
      await questionnaireWrapper.updateSubmission(submission.id, answersArray);
      
      // Then submit the questionnaire
      await questionnaireWrapper.submitQuestionnaire(submission.id);
      
      setSuccess('Questionnaire submitted successfully.');
      setSubmitting(false);
      
      // Redirect to the reports page for this submission
      setTimeout(() => {
        navigate(`/reports/${submission.id}`);
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting questionnaire:', err);
      setError('Failed to submit questionnaire. Please try again.');
      setSubmitting(false);
    }
  };
  
  // Render question input based on question type
  const renderQuestionInput = (question: Question) => {
    const value = answers[question.id] || '';
    
    switch (question.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer..."
            required={question.required}
            margin="normal"
          />
        );
        
      case 'radio':
        return (
          <FormControl component="fieldset" margin="normal" required={question.required}>
            <RadioGroup
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            >
              {question.options.map((option, index) => (
                <FormControlLabel 
                  key={index} 
                  value={option} 
                  control={<Radio />} 
                  label={option} 
                />
              ))}
            </RadioGroup>
          </FormControl>
        );
        
      case 'select':
        return (
          <FormControl fullWidth margin="normal" required={question.required}>
            <Select
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                <em>Select an option</em>
              </MenuItem>
              {question.options.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
        
      case 'checkbox':
        const checkboxValues = value ? value.split(',') : [];
        return (
          <FormControl component="fieldset" margin="normal" required={question.required}>
            <FormGroup>
              {question.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={checkboxValues.includes(option)}
                      onChange={(e) => {
                        let newValues;
                        if (e.target.checked) {
                          newValues = [...checkboxValues, option];
                        } else {
                          newValues = checkboxValues.filter((v: string) => v !== option);
                        }
                        handleAnswerChange(question.id, newValues.join(','));
                      }}
                    />
                  }
                  label={option}
                />
              ))}
            </FormGroup>
          </FormControl>
        );
        
      default:
        return (
          <TextField
            fullWidth
            variant="outlined"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer..."
            required={question.required}
            margin="normal"
          />
        );
    }
  };
  
  // Return loading view if data is still loading
  if (loading) {
    return (
      <Box p={3}>
        <Typography variant="h5" gutterBottom>Loading questionnaire...</Typography>
        <LinearProgress />
      </Box>
    );
  }
  
  // Return error view if there's an error
  if (error && !submission && !template) {
    return (
      <Box p={3}>
        <Alert severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/questionnaires')}>
              Back to Questionnaires
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }
  
  // Return view if data is loaded
  return (
    <Box p={3}>
      {/* Header with template name and progress */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {template?.name || 'Questionnaire'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/questionnaires')}
        >
          Back to Questionnaires
        </Button>
      </Box>
      
      {/* Status alerts */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setSuccess(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {success}
        </Alert>
      )}
      
      {/* Progress bar */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="textSecondary">
            Completion: {progress}%
          </Typography>
          <Chip 
            label={`Question ${activeStep + 1} of ${template?.questions.length || 0}`} 
            color="primary" 
            variant="outlined" 
            size="small" 
          />
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ height: 8, borderRadius: 4 }} 
        />
      </Box>
      
      {/* Main questionnaire content */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        {loadingQuestions && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>Loading questions...</Typography>
            <LinearProgress />
          </Box>
        )}
        
        {template && template.questions && template.questions.length > 0 ? (
          <>
            {/* Current question */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                {template.questions[activeStep].text}
                {template.questions[activeStep].required && 
                  <Box component="span" sx={{ color: 'error.main', ml: 1 }}>*</Box>
                }
              </Typography>
              
              {/* Question input */}
              {renderQuestionInput(template.questions[activeStep])}
            </Box>
            
            {/* Navigation buttons */}
            <Box display="flex" justifyContent="space-between">
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
              >
                Previous
              </Button>
              
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ mr: 1 }}
                >
                  Save Progress
                </Button>
                
                {activeStep === template.questions.length - 1 ? (
                  <Button
                    variant="contained"
                    color="primary"
                    endIcon={<SendIcon />}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    Submit
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    endIcon={<ArrowForwardIcon />}
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </>
        ) : (
          <Typography variant="body1">
            No questions found for this questionnaire.
          </Typography>
        )}
      </Paper>
      
      {/* Additional instructions */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center">
            <HelpIcon sx={{ mr: 1 }} color="primary" />
            Instructions
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" gutterBottom>
            • Answer all questions to the best of your ability
          </Typography>
          <Typography variant="body2" gutterBottom>
            • Questions marked with an asterisk (*) are required
          </Typography>
          <Typography variant="body2" gutterBottom>
            • Click "Save Progress" to save your answers at any time
          </Typography>
          <Typography variant="body2" gutterBottom>
            • You can leave and return to this questionnaire later
          </Typography>
          <Typography variant="body2">
            • When all questions are answered, click "Submit" to complete the assessment
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuestionnaireDetail;
