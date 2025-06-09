import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Grid,
  Link,
  Avatar,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { register } from '../store/slices/authSlice';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  organizationName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Interface that matches the backend API expectations
interface RegistrationData {
  firstName?: string;
  lastName?: string;
  organizationName: string;
  email: string;
  password: string;
  jobTitle?: string;
  phone?: string;
}

// Validation schema using Yup
const validationSchema = Yup.object({
  firstName: Yup.string().trim().max(50, 'First name cannot exceed 50 characters'),
  lastName: Yup.string().trim().max(50, 'Last name cannot exceed 50 characters'),
  organizationName: Yup.string().required('Organization name is required')
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name cannot exceed 100 characters'),
  email: Yup.string().email('Enter a valid email').required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required')
});

const Register: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state: any) => state.auth);

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      organizationName: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema,
    onSubmit: async (values: RegisterFormValues) => {
      try {
        // Register with user and organization details
        const { confirmPassword, ...userData } = values;
        
        // Add optional fields explicitly to ensure they're included even if empty
        const registrationData: RegistrationData = {
          ...userData,
          jobTitle: '',  // Optional field the backend expects
          phone: '',     // Optional field the backend expects
        };
        
        // Include organizationName in the API call
        await dispatch(register(registrationData)).unwrap();
        navigate('/dashboard');
      } catch (error) {
        // Error is handled in the Redux slice
        console.error('Registration failed:', error);
      }
    },
  });

  return (
    <Container component="main" maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          my: 8,
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <PersonAddIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Create an Account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3, width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Personal Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoComplete="given-name"
                name="firstName"
                fullWidth
                id="firstName"
                label="First Name"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                helperText={formik.touched.firstName && formik.errors.firstName}
                disabled={isLoading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                autoComplete="family-name"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                helperText={formik.touched.lastName && formik.errors.lastName}
                disabled={isLoading}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Organization Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="organizationName"
                label="Organization Name"
                name="organizationName"
                value={formik.values.organizationName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.organizationName && Boolean(formik.errors.organizationName)}
                helperText={formik.touched.organizationName && formik.errors.organizationName}
                disabled={isLoading}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Account Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                disabled={isLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                disabled={isLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                disabled={isLoading}
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Register'}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="outlined"
          color="primary"
          component={RouterLink}
          to="/"
        >
          Back to Home
        </Button>
      </Box>
    </Container>
  );
};

export default Register;
