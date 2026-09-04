import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper
} from '@mui/material';

import LiveRecorder from '../components/LiveRecorder';
import ConfidenceChart from '../components/ConfidenceChart';

/**
 * LivePage Component
 * Real-time audio detection from microphone
 */
const LivePage = () => {
  const [predictions, setPredictions] = useState([]);

  /**
   * Handle new prediction from live recorder
   */
  const handlePrediction = (data) => {
    if (data.prediction) {
      setPredictions(prev => {
        // Keep last 20 predictions
        const newPredictions = [...prev, {
          prediction: data.prediction,
          timestamp: data.timestamp,
          start_time: prev.length * 0.5 // Approximate timing
        }];
        return newPredictions.slice(-20);
      });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Live Audio Detection
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Record audio in real-time and get instant AI detection results.
      </Typography>

      <Grid container spacing={3}>
        {/* Live recorder */}
        <Grid item xs={12} md={8}>
          <LiveRecorder
            onPrediction={handlePrediction}
            {...(process.env.REACT_APP_WS_URL ? { wsUrl: `${process.env.REACT_APP_WS_URL}/ws/live` } : {})}
          />
        </Grid>

        {/* Stats panel */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: '#1e293b', borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Live Statistics
            </Typography>

            {predictions.length > 0 ? (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Analyzed
                  </Typography>
                  <Typography variant="h4">
                    {predictions.length} chunks
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    AI Detections
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#ef4444' }}>
                    {predictions.filter(p => p.prediction.is_ai_generated).length}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Human Detections
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#22c55e' }}>
                    {predictions.filter(p => !p.prediction.is_ai_generated).length}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Start recording to see statistics...
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Real-time chart */}
        {predictions.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, bgcolor: '#1e293b', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Real-time Confidence History
              </Typography>
              <ConfidenceChart data={predictions} height={200} />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default LivePage;