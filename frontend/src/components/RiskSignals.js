import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

/**
 * RiskSignals Component
 * Displays list of risk indicators with severity badges
 */
const RiskSignals = ({ signals = [] }) => {
  const severityConfig = {
    high: {
      emoji: '🔴',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
      label: 'HIGH'
    },
    medium: {
      emoji: '🟡',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)',
      label: 'MEDIUM'
    },
    low: {
      emoji: '🟢',
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.3)',
      label: 'LOW'
    }
  };

  if (!signals || signals.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, bgcolor: '#1e293b', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          🛡️ Risk Signals
        </Typography>
        <Box sx={{
          p: 3,
          bgcolor: 'rgba(34, 197, 94, 0.08)',
          borderRadius: 2,
          border: '1px solid rgba(34, 197, 94, 0.2)',
          textAlign: 'center'
        }}>
          <Typography color="text.secondary">
            ✅ No significant risk signals detected
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, bgcolor: '#1e293b', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🛡️ Risk Signals
        <Typography
          component="span"
          variant="caption"
          sx={{
            bgcolor: signals.some(s => s.severity === 'high') ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
            color: signals.some(s => s.severity === 'high') ? '#ef4444' : '#f59e0b',
            px: 1.5,
            py: 0.3,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: '0.65rem'
          }}
        >
          {signals.length} DETECTED
        </Typography>
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        {signals.map((signal, index) => {
          const cfg = severityConfig[signal.severity] || severityConfig.medium;
          return (
            <Box
              key={index}
              className="risk-signal-card"
              sx={{
                p: 2,
                bgcolor: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                transition: 'all 0.2s ease',
                animation: `fadeSlideIn 0.4s ease ${index * 0.1}s both`,
                '&:hover': {
                  transform: 'translateX(4px)',
                  borderColor: cfg.color,
                  boxShadow: `0 2px 12px ${cfg.border}`
                }
              }}
            >
              {/* Severity indicator */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 50,
                pt: 0.3
              }}>
                <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>{cfg.emoji}</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: cfg.color,
                    fontWeight: 800,
                    fontSize: '0.55rem',
                    letterSpacing: 1,
                    mt: 0.5
                  }}
                >
                  {cfg.label}
                </Typography>
              </Box>

              {/* Signal details */}
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: '#e2e8f0', fontWeight: 700, mb: 0.3 }}
                >
                  {signal.signal}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.4 }}
                >
                  {signal.description}
                </Typography>
              </Box>

              {/* Value badge */}
              {signal.value !== undefined && (
                <Box sx={{
                  bgcolor: cfg.border,
                  color: cfg.color,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  alignSelf: 'center'
                }}>
                  {typeof signal.value === 'number' ? signal.value.toFixed(1) : signal.value}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default RiskSignals;
