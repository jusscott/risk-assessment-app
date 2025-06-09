import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { 
  CalendarToday as CalendarIcon,
  CreditCard as CreditCardIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchCurrentSubscription, 
  cancelCurrentSubscription, 
  selectCurrentSubscription, 
  selectPaymentLoading,
  selectPaymentError
} from '../store/slices/paymentSlice';

const Subscriptions: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentSubscription = useAppSelector(selectCurrentSubscription);
  const isLoading = useAppSelector(selectPaymentLoading);
  const error = useAppSelector(selectPaymentError);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);

  useEffect(() => {
    dispatch(fetchCurrentSubscription());
  }, [dispatch]);

  const handleViewPlans = () => {
    navigate('/plans');
  };

  const handleOpenCancelDialog = () => {
    setCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
  };

  const handleCancelSubscription = async () => {
    await dispatch(cancelCurrentSubscription());
    setCancelDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'canceled':
      case 'unpaid':
        return 'error';
      case 'trialing':
        return 'info';
      case 'past_due':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderSubscriptionDetails = () => {
    if (!currentSubscription) return null;

    return (
      <Card elevation={3}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h5" component="h2">
              {currentSubscription.plan?.name || 'Subscription'}
            </Typography>
            <Chip 
              label={currentSubscription.status.replace('_', ' ')} 
              color={getStatusChipColor(currentSubscription.status) as any}
              sx={{ textTransform: 'capitalize' }}
            />
          </Box>

          {currentSubscription.cancelAtPeriodEnd && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Your subscription is scheduled to be canceled on {formatDate(currentSubscription.currentPeriodEnd)}. 
              You will continue to have access until that date.
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Current Period
                  </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body1">
                    {formatDate(currentSubscription.currentPeriodStart)} - {formatDate(currentSubscription.currentPeriodEnd)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CreditCardIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Plan Details
                  </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body1">
                    {currentSubscription.plan?.price 
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currentSubscription.plan.currency.toUpperCase(),
                          minimumFractionDigits: 0,
                        }).format(currentSubscription.plan.price / 100)
                      : 'N/A'} / {currentSubscription.plan?.interval || 'N/A'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {currentSubscription.plan?.features && currentSubscription.plan.features.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" gutterBottom>
                Features Included
              </Typography>
              <List disablePadding>
                {currentSubscription.plan.features.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </CardContent>
        
        <Divider />
        
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<CancelIcon />}
            onClick={handleOpenCancelDialog}
            disabled={currentSubscription.cancelAtPeriodEnd || currentSubscription.status !== 'active'}
          >
            Cancel Subscription
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Subscription Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      {isLoading ? (
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      ) : currentSubscription ? (
        renderSubscriptionDetails()
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Active Subscription
          </Typography>
          <Typography variant="body1" paragraph>
            You don't have an active subscription at the moment. Subscribe to a plan to access premium features.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleViewPlans}
          >
            View Plans
          </Button>
        </Paper>
      )}
      
      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCloseCancelDialog}
      >
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period on {currentSubscription && formatDate(currentSubscription.currentPeriodEnd)}.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} color="primary">
            Keep Subscription
          </Button>
          <Button onClick={handleCancelSubscription} color="error">
            Cancel Subscription
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Subscriptions;
