import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchPlans, 
  fetchCurrentSubscription, 
  selectPlans, 
  selectCurrentSubscription, 
  selectPaymentLoading,
  selectPaymentError
} from '../store/slices/paymentSlice';
import { Plan } from '../services/payment.service';

const Plans: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const plans = useAppSelector(selectPlans);
  const currentSubscription = useAppSelector(selectCurrentSubscription);
  const isLoading = useAppSelector(selectPaymentLoading);
  const error = useAppSelector(selectPaymentError);

  useEffect(() => {
    // Fetch plans and current subscription on component mount
    dispatch(fetchPlans());
    dispatch(fetchCurrentSubscription());
  }, [dispatch]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(price / 100); // Convert cents to dollars
  };

  const handleSelectPlan = (planId: string) => {
    navigate(`/checkout/${planId}`);
  };

  const renderPlanCard = (plan: Plan) => {
    const isCurrentPlan = currentSubscription?.planId === plan.id;
    
    return (
      <Card 
        key={plan.id} 
        elevation={3} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          borderTop: isCurrentPlan ? '4px solid #4caf50' : 'none',
        }}
      >
        {isCurrentPlan && (
          <Box sx={{ backgroundColor: '#e8f5e9', py: 1, textAlign: 'center' }}>
            <Chip 
              label="Current Plan" 
              color="success" 
              size="small" 
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
        )}
        
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            {plan.name}
          </Typography>
          
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ mb: 2, fontWeight: 'bold' }}
          >
            {formatPrice(plan.price, plan.currency)}
            <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
              /{plan.interval}
            </Typography>
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {plan.description}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <List sx={{ mb: 2 }}>
            {plan.features.map((feature, index) => (
              <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <CheckIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={feature} />
              </ListItem>
            ))}
          </List>
        </CardContent>
        
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth
            disabled={isCurrentPlan}
            onClick={() => handleSelectPlan(plan.id)}
          >
            {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Subscription Plans
      </Typography>
      
      <Typography variant="body1" gutterBottom sx={{ mb: 4 }}>
        Choose the right plan for your security risk assessment needs
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
      ) : plans.length > 0 ? (
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid item xs={12} sm={6} md={4} key={plan.id}>
              {renderPlanCard(plan)}
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No subscription plans are currently available. Please check back later.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Plans;
