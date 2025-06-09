import React from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery,
  Skeleton,
  Container
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  paper?: boolean;
}

/**
 * A responsive container for page content with consistent styling
 * and built-in support for loading states, error handling and page titles.
 */
const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  breadcrumbs,
  action,
  maxWidth = 'lg',
  paper = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;
    
    return (
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return isLast || !item.href ? (
            <Typography 
              key={index} 
              color="text.primary"
              variant="body2"
            >
              {item.label}
            </Typography>
          ) : (
            <Link 
              key={index}
              component={RouterLink} 
              to={item.href}
              underline="hover" 
              color="inherit"
              variant="body2"
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  const renderHeader = () => {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center',
          mb: subtitle ? 1 : 3,
          gap: isMobile ? 2 : 0
        }}
      >
        <Box>
          {loading ? (
            <Skeleton width={isMobile ? 200 : 300} height={40} />
          ) : (
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="h1" 
              fontWeight="500"
            >
              {title}
            </Typography>
          )}
          
          {subtitle && (
            loading ? (
              <Skeleton width={isMobile ? 150 : 200} height={24} sx={{ mt: 1 }} />
            ) : (
              <Typography 
                variant="subtitle1" 
                color="text.secondary"
                sx={{ mt: 0.5, mb: 2 }}
              >
                {subtitle}
              </Typography>
            )
          )}
        </Box>
        
        {action && (
          <Box sx={{ mt: isMobile ? 1 : 0 }}>
            {action}
          </Box>
        )}
      </Box>
    );
  };

  const content = (
    <>
      {renderBreadcrumbs()}
      {renderHeader()}
      
      {error ? (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      ) : loading ? (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px'
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      ) : (
        children
      )}
    </>
  );

  return (
    <Container maxWidth={maxWidth} sx={{ py: { xs: 2, sm: 3 } }}>
      {paper ? (
        <Paper 
          elevation={0}
          variant="outlined"
          sx={{ 
            p: { xs: 2, sm: 3 },
            borderRadius: 2
          }}
        >
          {content}
        </Paper>
      ) : content}
    </Container>
  );
};

export default PageContainer;
