import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Divider,
  Skeleton,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  SvgIcon,
  Button
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface DataCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactElement;
  action?: React.ReactNode;
  loading?: boolean;
  footer?: React.ReactNode;
  tooltip?: string;
  variant?: 'default' | 'outlined' | 'elevation';
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  minHeight?: number | string;
  children: React.ReactNode;
  onCardClick?: () => void;
  fullHeight?: boolean;
  headerDivider?: boolean;
}

/**
 * A responsive card component for displaying data with consistent styling.
 * Optimized for mobile and desktop views.
 */
const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  icon,
  action,
  loading = false,
  footer,
  tooltip,
  variant = 'default',
  color = 'default',
  minHeight,
  children,
  onCardClick,
  fullHeight = false,
  headerDivider = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Determine card styling based on variant and color
  const getCardStyle = () => {
    let style: any = {
      height: fullHeight ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      cursor: onCardClick ? 'pointer' : 'default',
      minHeight: minHeight || 'auto'
    };
    
    if (variant === 'outlined') {
      style.border = `1px solid ${theme.palette.divider}`;
      style.borderRadius = theme.shape.borderRadius;
    } else if (variant === 'elevation') {
      style.boxShadow = theme.shadows[2];
    }

    if (color !== 'default') {
      if (variant === 'outlined') {
        style.borderColor = theme.palette[color].main;
      } else {
        style.backgroundColor = theme.palette[color].light;
      }
    }

    return style;
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
    }
  };

  const renderHeader = () => {
    return (
      <>
        <CardHeader
          avatar={icon && (
            <Box 
              sx={{ 
                color: color !== 'default' ? `${color}.main` : 'primary.main',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {icon}
            </Box>
          )}
          title={
            loading ? (
              <Skeleton width={isMobile ? "80%" : "60%"} height={28} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography 
                  variant={isMobile ? "subtitle1" : "h6"} 
                  sx={{ fontWeight: 500 }}
                >
                  {title}
                </Typography>
                {tooltip && (
                  <Tooltip title={tooltip} arrow>
                    <IconButton size="small" sx={{ ml: 0.5 }}>
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )
          }
          subheader={
            subtitle && (
              loading ? (
                <Skeleton width={isMobile ? "60%" : "40%"} height={20} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )
            )
          }
          action={
            action || (
              loading ? (
                <Skeleton width={24} height={24} variant="circular" />
              ) : null
            )
          }
          sx={{ 
            py: isMobile ? 1.5 : 2,
            px: isMobile ? 2 : 2.5,
          }}
        />
        {headerDivider && <Divider />}
      </>
    );
  };

  const renderContent = () => {
    return (
      <CardContent 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          px: isMobile ? 2 : 2.5,
          py: isMobile ? 2 : 2.5,
        }}
      >
        {loading ? (
          <>
            <Skeleton width="100%" height={24} />
            <Skeleton width="80%" height={24} sx={{ mt: 1 }} />
            <Skeleton width="60%" height={24} sx={{ mt: 1 }} />
          </>
        ) : (
          children
        )}
      </CardContent>
    );
  };

  const renderFooter = () => {
    if (!footer) return null;
    
    return (
      <>
        <Divider />
        <CardActions sx={{ px: isMobile ? 2 : 2.5, py: 1.5 }}>
          {loading ? (
            <Skeleton width="100%" height={36} />
          ) : (
            footer
          )}
        </CardActions>
      </>
    );
  };

  return (
    <Card 
      sx={getCardStyle()} 
      onClick={handleCardClick}
      elevation={variant === 'elevation' ? 2 : 0}
    >
      {renderHeader()}
      {renderContent()}
      {renderFooter()}
    </Card>
  );
};

export default DataCard;
