import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Avatar,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import PageContainer from '../components/common/PageContainer';
import { useAppSelector, useAppDispatch } from '../store';
import { selectCurrentUser, getCurrentUser } from '../store/slices/authSlice';
import profileWrapper from '../services/profile-wrapper';

const Profile: React.FC = () => {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    company: user?.company || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Submit only the profile fields (not password fields)
      const profileData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        company: formData.company,
      };
      
      // Use the profile wrapper to ensure token freshness before updating
      await profileWrapper.updateProfile(profileData);
      
      // Show success message
      setSuccess(true);
      
      // Refresh the user data in the Redux store
      dispatch(getCurrentUser());
      
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const passwordData = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      };
      
      // Use the profile wrapper to ensure token freshness before changing password
      await profileWrapper.changePassword(passwordData);
      
      // Show success message
      setSuccess(true);
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      
    } catch (err) {
      setError('Failed to change password. Please verify your current password.');
      console.error('Password change error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSuccess(false);
  };
  
  if (!user) {
    return (
      <PageContainer title="Profile" loading={true}>
        <Typography>Loading profile...</Typography>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer 
      title="Your Profile" 
      subtitle="Manage your account information and password"
      loading={loading}
      error={error}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile' }
      ]}
    >
      <Grid container spacing={3}>
        {/* Profile Overview */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{ p: 3, height: '100%', borderRadius: 2 }}
          >
            <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mb: 2,
                  bgcolor: 'primary.main' 
                }}
              >
                {user.firstName && user.lastName ? 
                  `${user.firstName[0]}${user.lastName[0]}` : 
                  <PersonIcon />
                }
              </Avatar>
              <Typography variant="h6" gutterBottom>
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              {user.company && (
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {user.company}
                </Typography>
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Account Details
              </Typography>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Account ID
                </Typography>
                <Typography variant="body2">
                  {user.id?.substring(0, 8) || 'N/A'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Role
                </Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {user.role || 'User'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Member Since
                </Typography>
                <Typography variant="body2">
                  {user.createdAt ? 
                    new Date(user.createdAt).toLocaleDateString() : 
                    'N/A'
                  }
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        {/* Profile Form */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            variant="outlined"
            sx={{ p: 3, borderRadius: 2 }}
          >
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Update your personal information
            </Typography>
            
            <Box component="form" onSubmit={handleProfileUpdate} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    variant="outlined"
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    variant="outlined"
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    variant="outlined"
                    margin="normal"
                    disabled  // Email changes typically require verification
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    variant="outlined"
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      color="primary"
                      disabled={loading}
                    >
                      Update Profile
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            <Divider sx={{ my: 4 }} />
            
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Ensure your account is using a secure password
            </Typography>
            
            <Box component="form" onSubmit={handlePasswordChange} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    variant="outlined"
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    variant="outlined"
                    margin="normal"
                    required
                    helperText="Password must be at least 8 characters"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    variant="outlined"
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      color="primary"
                      disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                    >
                      Change Password
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          sx={{ width: '100%' }}
          variant="filled"
        >
          Your changes have been saved successfully.
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default Profile;
