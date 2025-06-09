import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
} from '@mui/material';
import {
  Check as CheckIcon,
  ChevronLeft as BackIcon,
  ChevronRight as NextIcon,
  Payment as PaymentIcon,
  ReceiptLong as ReceiptIcon,
  Done as DoneIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchPlans, 
  createSubscription, 
  selectPlans, 
  selectCheckoutSession, 
  selectPaymentLoading, 
  selectPaymentError,
  clearCheckoutSession
} from '../store/slices/paymentSlice';
import { Plan } from '../services/payment.service';

const steps = ['Plan Selection', 'Payment Details', 'Confirmation'];

const Checkout: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const plans = useAppSelector(selectPlans);
  const checkoutSession = useAppSelector(selectCheckoutSession);
  const isLoading = useAppSelector(selectPaymentLoading);
  const error = useAppSelector(selectPaymentError);
  
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Form state for card details (this is just for UI - in production we use Stripe Elements)
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    // Clear any existing checkout sessions
    dispatch(clearCheckoutSession());
    
    // Fetch plans if not loaded
    if (plans.length === 0) {
      dispatch(fetchPlans());
    } 
    // Select the plan from the URL parameter
    else if (planId) {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
      } else {
        // Plan not found, redirect to plans page
        navigate('/plans');
      }
    }
  }, [dispatch, plans, planId, navigate]);

  // Handle redirect to Stripe checkout when session URL is available
  useEffect(() => {
    if (checkoutSession && checkoutSession.sessionUrl) {
      window.location.href = checkoutSession.sessionUrl;
    }
  }, [checkoutSession]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleProceedToPayment = () => {
    if (selectedPlan) {
      dispatch(createSubscription(selectedPlan.id));
    }
  };

  const handleBackToPlans = () => {
    navigate('/plans');
  };

  const renderPlanDetails = () => {
    if (!selectedPlan) return null;

    return (
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            {selectedPlan.name}
          </Typography>
          
          <Typography variant="h4" component="div" sx={{ mb: 2, fontWeight: 'bold' }}>
            {formatPrice(selectedPlan.price, selectedPlan.currency)}
            <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
              /{selectedPlan.interval}
            </Typography>
          </Typography>
          
          <Typography variant="body1" paragraph>
            {selectedPlan.description}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Features:
          </Typography>
          
          <List disablePadding>
            {selectedPlan.features.map((feature, index) => (
              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={feature} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  const renderPaymentForm = () => {
    return (
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
        <Typography variant="subtitle1" gutterBottom>
          Enter your payment details:
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Note: In a production app, we would use Stripe Elements for secure card processing.
            This is a placeholder form for demonstration purposes only.
          </Typography>
        </Alert>
        
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            required
            label="Name on Card"
            fullWidth
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
          
          <TextField
            required
            label="Card Number"
            fullWidth
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            inputProps={{ maxLength: 19 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              required
              label="Expiry Date"
              placeholder="MM/YY"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              inputProps={{ maxLength: 5 }}
              sx={{ flex: 1 }}
            />
            
            <TextField
              required
              label="CVV"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              inputProps={{ maxLength: 3 }}
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>
      </Box>
    );
  };

  const renderConfirmation = () => {
    return (
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <DoneIcon color="success" sx={{ fontSize: 60 }} />
        </Box>
        
        <Typography variant="h5" gutterBottom>
          Ready to Complete Your Order
        </Typography>
        
        <Typography variant="body1" paragraph>
          You're about to subscribe to {selectedPlan?.name} at {selectedPlan ? formatPrice(selectedPlan.price, selectedPlan.currency) : ''}
          /{selectedPlan?.interval}.
        </Typography>
        
        <Typography variant="body2" paragraph color="text.secondary">
          Click "Complete Payment" to be redirected to our secure payment processor.
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleProceedToPayment}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <PaymentIcon />}
          >
            {isLoading ? 'Processing...' : 'Complete Payment'}
          </Button>
        </Box>
      </Box>
    );
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderPlanDetails();
      case 1:
        return renderPaymentForm();
      case 2:
        return renderConfirmation();
      default:
        return 'Unknown step';
    }
  };

  if (isLoading && !checkoutSession) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Checkout
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }} elevation={3}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box sx={{ mt: 2, mb: 4 }}>
          {getStepContent(activeStep)}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            color="inherit"
            startIcon={activeStep === 0 ? null : <BackIcon />}
            onClick={activeStep === 0 ? handleBackToPlans : handleBack}
          >
            {activeStep === 0 ? 'Back to Plans' : 'Back'}
          </Button>
          
          {activeStep < 2 && (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Checkout;
