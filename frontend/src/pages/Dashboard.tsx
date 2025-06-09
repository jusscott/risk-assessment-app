import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Typography, 
  Box, 
  Button, 
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/common/PageContainer';
import DataCard from '../components/common/DataCard';
import { 
  Assessment, 
  Description, 
  AddCircleOutline, 
  BarChart, 
  Security, 
  CheckCircle, 
  Warning,
  ArrowForward
} from '@mui/icons-material';
import { useAppSelector } from 'store';
import { selectCurrentUser } from 'store/slices/authSlice';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const user = useAppSelector(selectCurrentUser);
  
  // Initialize with empty arrays and null objects, will fetch from API
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [securityStats, setSecurityStats] = useState<{
    overallScore: number;
    criticalIssues: number;
    highRiskIssues: number;
    mediumRiskIssues: number;
    lowRiskIssues: number;
    total: number;
  }>({
    overallScore: 0,
    criticalIssues: 0,
    highRiskIssues: 0,
    mediumRiskIssues: 0,
    lowRiskIssues: 0,
    total: 0
  });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Define interface for assessment items
  interface AssessmentItem {
    id: number;
    name: string;
    date: string;
    status: 'in-progress' | 'completed';
  }

  // Fetch user assessments from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's in-progress assessments/submissions
        const inProgressResponse = await api.get('/questionnaires/submissions/in-progress');
        console.log('In-progress submissions response:', inProgressResponse);
        
        // Fetch user's completed assessments/submissions
        const completedResponse = await api.get('/questionnaires/submissions/completed');
        console.log('Completed submissions response:', completedResponse);
        
        // Combine both types of submissions for recent assessments
        let recentSubmissions: AssessmentItem[] = [];
        
        // Process in-progress submissions
        if (inProgressResponse.success && inProgressResponse.data) {
          const inProgressData = Array.isArray(inProgressResponse.data) ? inProgressResponse.data : [];
          
          const inProgressAssessments = inProgressData.map((submission: any) => ({
            id: submission.id,
            name: submission.name || `${submission.framework || 'Framework'} Assessment`,
            date: submission.lastUpdated || submission.startDate || new Date().toISOString(),
            status: 'in-progress' as 'in-progress' // Type assertion for TypeScript
          }));
          
          recentSubmissions = [...recentSubmissions, ...inProgressAssessments];
        }
        
        // Process completed submissions
        if (completedResponse.success && completedResponse.data) {
          const completedData = Array.isArray(completedResponse.data) ? completedResponse.data : [];
          
          const completedAssessments = completedData.map((submission: any) => ({
            id: submission.id,
            name: submission.name || `${submission.framework || 'Framework'} Assessment`,
            date: submission.completionDate || new Date().toISOString(),
            status: 'completed' as 'completed' // Type assertion for TypeScript
          }));
          
          recentSubmissions = [...recentSubmissions, ...completedAssessments];
        }
        
        // Sort by date (most recent first) and take the first few
        recentSubmissions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentAssessments(recentSubmissions.slice(0, 5)); // Limit to 5 most recent

        // Fetch security stats from analysis service
        try {
          const statsResponse = await api.get('/analysis/summary');
          if (statsResponse.success && statsResponse.data) {
            // Safely get values with fallbacks
            const responseData = statsResponse.data as Record<string, any>;
            
            // Map the API response to our security stats format
            const stats = {
              overallScore: typeof responseData.overallScore === 'number' ? responseData.overallScore : 0,
              criticalIssues: typeof responseData.criticalCount === 'number' ? responseData.criticalCount : 0,
              highRiskIssues: typeof responseData.highRiskCount === 'number' ? responseData.highRiskCount : 0,
              mediumRiskIssues: typeof responseData.mediumRiskCount === 'number' ? responseData.mediumRiskCount : 0,
              lowRiskIssues: typeof responseData.lowRiskCount === 'number' ? responseData.lowRiskCount : 0,
              total: typeof responseData.totalRequirements === 'number' ? responseData.totalRequirements : 0
            };
            
            setSecurityStats(stats);
          }
        } catch (statsError) {
          console.error('Error fetching security stats:', statsError);
          // Keep the default stats if there's an error
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <PageContainer 
      title={`Welcome, ${user?.firstName || 'User'}`} 
      subtitle="Your security risk dashboard provides an overview of your compliance status"
      loading={loading}
    >
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: { xs: 1, sm: 2 } }}>
        
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <DataCard
            title="Quick Actions"
            icon={<Assessment />}
            variant="elevation"
            fullHeight
          >
            <List disablePadding>
              <ListItem button onClick={() => navigate('/questionnaires?tab=2')}>
                <ListItemIcon>
                  <AddCircleOutline />
                </ListItemIcon>
                <ListItemText primary="Start New Assessment" />
              </ListItem>
              <Divider />
              <ListItem button onClick={() => navigate('/reports')}>
                <ListItemIcon>
                  <BarChart />
                </ListItemIcon>
                <ListItemText primary="View Reports" />
              </ListItem>
              <Divider />
              <ListItem button onClick={() => navigate('/questionnaires')}>
                <ListItemIcon>
                  <Assessment />
                </ListItemIcon>
                <ListItemText primary="Continue Assessment" />
              </ListItem>
            </List>
          </DataCard>
        </Grid>
        
        {/* Security Score */}
        <Grid item xs={12} md={4}>
          <DataCard
            title="Security Score"
            icon={<Security />}
            subtitle="Based on your most recent assessments"
            variant="elevation"
            color={securityStats.overallScore > 80 ? 'success' : 
                   securityStats.overallScore > 60 ? 'warning' : 'error'}
            fullHeight
          >
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
              <Box position="relative" display="inline-flex" sx={{ my: 2 }}>
                <CircularProgress 
                  variant="determinate" 
                  value={securityStats.overallScore} 
                  size={120} 
                  thickness={5} 
                  sx={{ 
                    color: securityStats.overallScore > 80 ? 'success.main' : 
                          securityStats.overallScore > 60 ? 'warning.main' : 'error.main' 
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" component="div" color="text.primary">
                    {securityStats.overallScore}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="error" sx={{ mt: 1, fontWeight: 'medium' }}>
                {securityStats.criticalIssues} critical issues need attention
              </Typography>
            </Box>
          </DataCard>
        </Grid>
        
        {/* Risk Summary */}
        <Grid item xs={12} md={4}>
          <DataCard
            title="Risk Summary"
            icon={<Warning />}
            variant="elevation"
            fullHeight
            footer={
              <Button 
                variant="outlined" 
                color="primary" 
                fullWidth
                endIcon={<ArrowForward />}
                onClick={() => {
                  navigate('/reports/issues');
                }}
                size={isMobile ? "small" : "medium"}
              >
                View All Issues
              </Button>
            }
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: 'error.main', mr: 1.5, fontSize: 28 }} />
                <Typography variant="body1" color="error.main" fontWeight="medium">
                  {securityStats.highRiskIssues} High Risk Issues
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: 'warning.main', mr: 1.5, fontSize: 28 }} />
                <Typography variant="body1" color="warning.main" fontWeight="medium">
                  {securityStats.mediumRiskIssues} Medium Risk Issues
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: 'info.main', mr: 1.5, fontSize: 28 }} />
                <Typography variant="body1" color="info.main" fontWeight="medium">
                  {securityStats.lowRiskIssues} Low Risk Issues
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ color: 'success.main', mr: 1.5, fontSize: 28 }} />
                <Typography variant="body1" color="success.main" fontWeight="medium">
                  {securityStats.total - (securityStats.highRiskIssues + securityStats.mediumRiskIssues + securityStats.lowRiskIssues)} Requirements Met
                </Typography>
              </Box>
            </Box>
          </DataCard>
        </Grid>
        
        {/* Recent Assessments */}
        <Grid item xs={12} md={12}>
          <DataCard
            title="Recent Assessments"
            icon={<Description />}
            variant="elevation"
            footer={
              recentAssessments.length > 0 ? (
                <Button 
                  variant="text" 
                  color="primary"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/questionnaires')}
                  size={isMobile ? "small" : "medium"}
                >
                  View All Assessments
                </Button>
              ) : undefined
            }
          >
            {recentAssessments.length > 0 ? (
              <List sx={{ px: 0 }} disablePadding>
                {recentAssessments.map((assessment) => (
                  <React.Fragment key={assessment.id}>
                    <ListItem 
                      button 
                      onClick={() => navigate(`/questionnaires/${assessment.id}`)}
                      secondaryAction={
                        <Box display="flex" alignItems="center">
                          {assessment.status === 'completed' ? 
                            <CheckCircle color="success" sx={{ mr: 1 }} /> : 
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                          }
                          <Typography variant="body2" color="text.secondary">
                            {assessment.status === 'completed' ? 'Completed' : 'In Progress'}
                          </Typography>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText 
                        primary={assessment.name} 
                        secondary={new Date(assessment.date).toLocaleDateString()} 
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body1" color="text.secondary" paragraph>
                  No recent assessments found.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddCircleOutline />}
                  onClick={() => navigate('/questionnaires?tab=2')}
                >
                  Start an Assessment
                </Button>
              </Box>
            )}
          </DataCard>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Dashboard;
