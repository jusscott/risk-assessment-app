import React from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Grid, 
  Typography, 
  Card, 
  CardContent,
  CardActions,
  AppBar,
  Toolbar
} from '@mui/material';
import { 
  Security as SecurityIcon, 
  Assessment as AssessmentIcon, 
  Timeline as TimelineIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Security Risk Assessment
          </Typography>
          <Button color="inherit" onClick={handleLogin}>Login</Button>
          <Button 
            color="inherit" 
            variant="outlined" 
            sx={{ ml: 1 }} 
            onClick={handleRegister}
          >
            Register
          </Button>
        </Toolbar>
      </AppBar>

      <Box 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          py: 8
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                Assess Your Security Risk
              </Typography>
              <Typography variant="h5" paragraph>
                Comprehensive security assessments based on industry-standard frameworks
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                sx={{ 
                  bgcolor: 'secondary.main',
                  '&:hover': {
                    bgcolor: 'secondary.dark',
                  },
                  mr: 2,
                  mt: 2
                }}
                onClick={handleRegister}
              >
                Get Started
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                  mt: 2
                }}
                onClick={handleLogin}
              >
                Login
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <SecurityIcon sx={{ fontSize: 200, opacity: 0.8 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" align="center" gutterBottom>
          How It Works
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
          Our platform makes security risk assessment simple and actionable
        </Typography>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <AssessmentIcon color="primary" sx={{ fontSize: 60 }} />
                </Box>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  Complete Questionnaires
                </Typography>
                <Typography variant="body1" align="center">
                  Answer questions tailored to your selected compliance frameworks (ISO, SOC, HIPAA, PCI, NIST)
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <TimelineIcon color="primary" sx={{ fontSize: 60 }} />
                </Box>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  AI-Powered Analysis
                </Typography>
                <Typography variant="body1" align="center">
                  Our AI engine analyzes your responses to identify security risks and compliance gaps
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <PaymentIcon color="primary" sx={{ fontSize: 60 }} />
                </Box>
                <Typography variant="h5" component="h3" align="center" gutterBottom>
                  Receive Detailed Reports
                </Typography>
                <Typography variant="body1" align="center">
                  Get comprehensive reports with actionable recommendations to improve your security posture
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
                <Button size="small" onClick={handleRegister}>Get Started</Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ bgcolor: 'background.paper', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="space-between">
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Security Risk Assessment
              </Typography>
              <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} Security Risk Assessment. All rights reserved.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button color="primary" sx={{ mr: 2 }}>Privacy Policy</Button>
              <Button color="primary">Terms of Service</Button>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
