import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent, 
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Card,
  CardContent,
  CardActions,
  Grid,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import useAuthNavigation from '../hooks/useAuthNavigation';
import rulesWrapper, { CustomRule } from '../services/rules-wrapper';

// Categories for rules
const RULE_CATEGORIES = [
  'Access Control',
  'Authentication',
  'Data Protection',
  'Network Security',
  'Compliance',
  'Incident Response',
  'Business Continuity',
  'Application Security',
  'Infrastructure Security',
  'IoT Security',
  'Cloud Security',
  'Other'
];

// Severity levels
const SEVERITY_LEVELS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Low-Medium' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Medium-High' },
  { value: 5, label: 'High' }
];

// Fields that can have validation errors
type FormField = 'name' | 'description' | 'category' | 'condition' | 'action' | 'severity';

interface FormErrors {
  name?: string;
  description?: string;
  category?: string;
  condition?: string;
  action?: string;
  severity?: string;
}

const CustomRules: React.FC = () => {
  const { isAuthenticated } = useAuthNavigation();
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [currentRule, setCurrentRule] = useState<Partial<CustomRule> | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch rules on component mount
  useEffect(() => {
    fetchRules();
  }, []);

  // Fetch all custom rules
  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await rulesWrapper.fetchCustomRules();
      setRules(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rules:', error);
      setLoading(false);
      showSnackbar('Failed to load custom rules', 'error');
    }
  };

  // Open dialog for creating a new rule
  const handleOpenCreateDialog = () => {
    setCurrentRule({
      name: '',
      description: '',
      category: '',
      severity: 3,
      condition: '',
      action: '',
      isActive: true
    });
    setIsEditing(false);
    setFormErrors({});
    setOpenDialog(true);
  };

  // Open dialog for editing an existing rule
  const handleOpenEditDialog = (rule: CustomRule) => {
    setCurrentRule({ ...rule });
    setIsEditing(true);
    setFormErrors({});
    setOpenDialog(true);
  };

  // Close the dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentRule(null);
  };

  // Handle form field changes
  const handleFormChange = (field: keyof CustomRule, value: any) => {
    if (currentRule) {
      setCurrentRule({
        ...currentRule,
        [field]: value
      });
      
      // Clear the error for this field if it exists
      // Only check fields that can have validation errors
      if (isFormField(field) && formErrors[field]) {
        setFormErrors({
          ...formErrors,
          [field]: undefined
        });
      }
    }
  };
  
  // Type guard to check if a field is a form field with validation
  const isFormField = (field: keyof CustomRule): field is FormField => {
    return ['name', 'description', 'category', 'condition', 'action', 'severity'].includes(field as string);
  };

  // Validate the rule form
  const validateRuleForm = (): boolean => {
    const errors: FormErrors = {};

    if (!currentRule?.name) errors.name = 'Rule name is required';
    if (!currentRule?.description) errors.description = 'Description is required';
    if (!currentRule?.category) errors.category = 'Category is required';
    if (!currentRule?.condition) errors.condition = 'Condition is required';
    if (!currentRule?.action) errors.action = 'Action is required';
    if (!currentRule?.severity) errors.severity = 'Severity is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save the current rule (create or update)
  const handleSaveRule = async () => {
    if (!validateRuleForm() || !currentRule) return;

    try {
      if (isEditing && currentRule.id) {
        // Update existing rule
        await rulesWrapper.updateRule(currentRule.id, currentRule);
        showSnackbar('Rule updated successfully', 'success');
      } else {
        // Create new rule
        await rulesWrapper.createRule(currentRule as Omit<CustomRule, 'id' | 'createdAt' | 'updatedAt'>);
        showSnackbar('Rule created successfully', 'success');
      }
      
      handleCloseDialog();
      fetchRules(); // Refresh the rules list
    } catch (error) {
      console.error('Error saving rule:', error);
      showSnackbar(isEditing ? 'Failed to update rule' : 'Failed to create rule', 'error');
    }
  };

  // Delete a rule
  const handleDeleteRule = async (ruleId: number) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      await rulesWrapper.deleteRule(ruleId);
      showSnackbar('Rule deleted successfully', 'success');
      fetchRules(); // Refresh the rules list
    } catch (error) {
      console.error('Error deleting rule:', error);
      showSnackbar('Failed to delete rule', 'error');
    }
  };

  // Toggle rule activation status
  const handleToggleStatus = async (ruleId: number, isActive: boolean) => {
    try {
      await rulesWrapper.toggleRuleStatus(ruleId, isActive);
      showSnackbar(`Rule ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
      fetchRules(); // Refresh the rules list
    } catch (error) {
      console.error('Error toggling rule status:', error);
      showSnackbar(`Failed to ${isActive ? 'activate' : 'deactivate'} rule`, 'error');
    }
  };

  // Show a snackbar message
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Handle closing the snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Custom Security Rules</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpenCreateDialog}
        >
          Create New Rule
        </Button>
      </Box>

      {rules.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No custom rules have been created yet. Create your first rule to get started.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {rules.map(rule => (
            <Grid item xs={12} md={6} key={rule.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  opacity: rule.isActive ? 1 : 0.7,
                  borderLeft: '4px solid',
                  borderLeftColor: rule.severity >= 4 ? '#d32f2f' : 
                                  rule.severity >= 3 ? '#ed6c02' : 
                                  '#2e7d32'
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {rule.name}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={rule.isActive}
                          onChange={(e) => handleToggleStatus(rule.id, e.target.checked)}
                          color="primary"
                        />
                      }
                      label={rule.isActive ? "Active" : "Inactive"}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Category: {rule.category} | Severity: {SEVERITY_LEVELS.find(s => s.value === rule.severity)?.label || rule.severity}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {rule.description}
                  </Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    Condition:
                  </Typography>
                  <Typography variant="body2" paragraph sx={{ pl: 1 }}>
                    {rule.condition}
                  </Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    Action:
                  </Typography>
                  <Typography variant="body2" paragraph sx={{ pl: 1 }}>
                    {rule.action}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                    <Tooltip title="Edit Rule">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenEditDialog(rule)}
                        aria-label="edit rule"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Rule">
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteRule(rule.id)}
                        aria-label="delete rule"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Rule Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>{isEditing ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Rule Name"
                  fullWidth
                  value={currentRule?.name || ''}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth error={!!formErrors.severity} required>
                  <InputLabel id="severity-select-label">Severity</InputLabel>
                  <Select
                    labelId="severity-select-label"
                    value={currentRule?.severity || ''}
                    label="Severity"
                    onChange={(e) => handleFormChange('severity', e.target.value)}
                  >
                    {SEVERITY_LEVELS.map(level => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.severity && <FormHelperText>{formErrors.severity}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!formErrors.category} required>
                  <InputLabel id="category-select-label">Category</InputLabel>
                  <Select
                    labelId="category-select-label"
                    value={currentRule?.category || ''}
                    label="Category"
                    onChange={(e) => handleFormChange('category', e.target.value)}
                  >
                    {RULE_CATEGORIES.map(category => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.category && <FormHelperText>{formErrors.category}</FormHelperText>}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={currentRule?.description || ''}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Condition"
                  fullWidth
                  multiline
                  rows={3}
                  value={currentRule?.condition || ''}
                  onChange={(e) => handleFormChange('condition', e.target.value)}
                  error={!!formErrors.condition}
                  helperText={formErrors.condition || "The condition that will be evaluated (e.g., 'passwordLength < 8')"}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Action"
                  fullWidth
                  multiline
                  rows={3}
                  value={currentRule?.action || ''}
                  onChange={(e) => handleFormChange('action', e.target.value)}
                  error={!!formErrors.action}
                  helperText={formErrors.action || "The action to take when the condition is met"}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentRule?.isActive || false}
                      onChange={(e) => handleFormChange('isActive', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveRule} color="primary" variant="contained">
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomRules;
