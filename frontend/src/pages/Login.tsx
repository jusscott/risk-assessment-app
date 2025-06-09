import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Paper, 
  Grid,
  Link,
  Checkbox,
  FormControlLabel,
  Avatar,
  Alert,
  CircularProgress
} from '@mui/material';
import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { login } from '../store/slices/authSlice';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const location = useLocation();
  const [redirectPath, setRedirectPath] = useState('/dashboard');
  
  // Parse redirect path from URL query parameters when component mounts
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const redirectParam = queryParams.get('redirectTo');
    if (redirectParam) {
      setRedirectPath(redirectParam);
    }
  }, [location]);
  
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      console.log('🔐 Login form submitted');
      await dispatch(login({ email, password })).unwrap();
      
      console.log('✅ Login dispatch completed successfully');
      
      // Verify tokens are available before navigation
      setTimeout(() => {
        const tokenCheck = localStorage.getItem('token');
        console.log('🔍 Pre-navigation token check:', {
          hasToken: !!tokenCheck,
          tokenLength: tokenCheck?.length || 0,
          timestamp: new Date().toISOString()
        });
      }, 100); // Allow time for token storage
      
      // Check if there's a pending questionnaire to start
      const pendingQuestionnaireId = localStorage.getItem('pendingQuestionnaireId');
      
      if (pendingQuestionnaireId && redirectPath === '/questionnaires') {
        // Clear the stored ID so it's not used again
        localStorage.removeItem('pendingQuestionnaireId');
        console.log('🧭 Redirecting to questionnaires page after login with pending ID:', pendingQuestionnaireId);
        navigate('/questionnaires');
      } else {
        // Otherwise navigate to the standard redirect path
        console.log('🧭 Redirecting to:', redirectPath);
        navigate(redirectPath);
      }
    } catch (error) {
      // Error is handled in the Redux slice
      console.error('❌ Login failed:', error);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
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
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <FormControlLabel
            control={
              <Checkbox 
                value="remember" 
                color="primary" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
            }
            label="Remember me"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          <Grid container>
            <Grid item xs>
          <Link component={RouterLink} to="/auth/forgot-password" variant="body2">
            Forgot password?
          </Link>
            </Grid>
            <Grid item>
              <Link component={RouterLink} to="/register" variant="body2">
                {"Don't have an account? Sign Up"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      <Box sx={{ mt: 8, textAlign: 'center' }}>
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

export default Login;
