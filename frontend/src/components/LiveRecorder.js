import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Chip
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  GraphicEq as WaveIcon
} from '@mui/icons-material';

import AudioWaveform from './AudioWaveform';

const getDefaultWsUrl = () => {
  if (process.env.REACT_APP_WS_URL) {
    return `${process.env.REACT_APP_WS_URL}/ws/live`;
  }
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (process.env.NODE_ENV === 'production' || (window.location.port && window.location.port !== '3000')) {
      return `${protocol}//${window.location.host}/ws/live`;
    }
  }
  return 'ws://localhost:8000/ws/live';
};

const LiveRecorder = ({ onPrediction, wsUrl = getDefaultWsUrl() }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [audioData, setAudioData] = useState(null);

  const websocketRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  /**
   * Initialize WebSocket connection
   */
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'prediction') {
          setLatestPrediction(data.prediction);
          setAudioData(data.waveform);
          if (onPrediction) {
            onPrediction(data);
          }
        } else if (data.type === 'error') {
          setError(data.message);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
      };

      websocketRef.current = ws;
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    }
  }, [wsUrl, onPrediction]);

  /**
   * Start recording
   */
  const startRecording = async () => {
    try {
      // Connect WebSocket first
      connectWebSocket();

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;

      // Set up audio context for processing
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (!isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Send audio data to WebSocket
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          // Convert float32 to bytes
          const buffer = new ArrayBuffer(inputData.length * 4);
          const view = new DataView(buffer);
          for (let i = 0; i < inputData.length; i++) {
            view.setFloat32(i * 4, inputData[i], true);
          }
          websocketRef.current.send(buffer);
        }
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Send start command
      setTimeout(() => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({ action: 'start' }));
        }
      }, 100);

      setIsRecording(true);
      setError(null);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  /**
   * Stop recording
   */
  const stopRecording = () => {
    // Send stop command
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ action: 'stop' }));
    }

    // Stop processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }

    setIsRecording(false);
    setIsConnected(false);
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <Paper elevation={0} sx={{ p: 3, bgcolor: '#1e293b', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Live Audio Detection
      </Typography>

      {/* Status indicators */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Chip
          icon={<WaveIcon />}
          label={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'success' : 'default'}
          size="small"
        />
        {isRecording && (
          <Chip
            icon={<Box component="span" className="recording-indicator" />}
            label="Recording"
            color="error"
            size="small"
          />
        )}
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Waveform visualization */}
      <Box sx={{ mb: 3 }}>
        <AudioWaveform
          isRecording={isRecording}
          audioData={audioData}
          width={600}
          height={150}
        />
      </Box>

      {/* Control buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {!isRecording ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<MicIcon />}
            onClick={startRecording}
            size="large"
          >
            Start Recording
          </Button>
        ) : (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={stopRecording}
            size="large"
          >
            Stop Recording
          </Button>
        )}
      </Box>

      {/* Latest prediction */}
      {latestPrediction && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#0f172a', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Latest Detection Result
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">
              {latestPrediction.is_ai_generated ? (
                <span style={{ color: '#ef4444' }}>AI-Generated</span>
              ) : (
                <span style={{ color: '#22c55e' }}>Human Voice</span>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Confidence: {Math.round(latestPrediction.confidence * 100)}%
            </Typography>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              AI Probability: {Math.round(latestPrediction.ai_probability * 100)}%
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default LiveRecorder;