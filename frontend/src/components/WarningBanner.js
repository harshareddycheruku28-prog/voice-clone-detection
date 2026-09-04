import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  Warning as WarningIcon,
  GppBad as CriticalIcon,
  Info as InfoIcon,
  VerifiedUser as SafeIcon
} from '@mui/icons-material';

/**
 * WarningBanner Component
 * Prominent color-coded alert banner based on detection severity
 */
const WarningBanner = ({ message, level = 'safe' }) => {
  const config = {
    critical: {
      icon: <CriticalIcon sx={{ fontSize: 28 }} />,
      gradient: 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ef4444 100%)',
      borderColor: '#ef4444',
      glowColor: 'rgba(239, 68, 68, 0.3)',
      textColor: '#fecaca',
      animate: true
    },
    warning: {
      icon: <WarningIcon sx={{ fontSize: 28 }} />,
      gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
      borderColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.25)',
      textColor: '#fef3c7',
      animate: false
    },
    caution: {
      icon: <InfoIcon sx={{ fontSize: 28 }} />,
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #3b82f6 100%)',
      borderColor: '#3b82f6',
      glowColor: 'rgba(59, 130, 246, 0.2)',
      textColor: '#bfdbfe',
      animate: false
    },
    safe: {
      icon: <SafeIcon sx={{ fontSize: 28 }} />,
      gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 50%, #22c55e 100%)',
      borderColor: '#22c55e',
      glowColor: 'rgba(34, 197, 94, 0.2)',
      textColor: '#bbf7d0',
      animate: false
    }
  };

  const c = config[level] || config.safe;

  return (
    <Box
      className={c.animate ? 'warning-banner-pulse' : ''}
      sx={{
        background: c.gradient,
        border: `1px solid ${c.borderColor}`,
        borderRadius: 2,
        p: 2,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        boxShadow: `0 4px 20px ${c.glowColor}`,
        transition: 'all 0.3s ease'
      }}
    >
      <Box sx={{ color: c.textColor, display: 'flex', alignItems: 'center' }}>
        {c.icon}
      </Box>
      <Typography
        variant="body1"
        sx={{
          color: c.textColor,
          fontWeight: 600,
          letterSpacing: 0.3
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default WarningBanner;
