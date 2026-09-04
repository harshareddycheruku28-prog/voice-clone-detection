import React, { useEffect, useRef, useCallback } from 'react';

/**
 * AudioWaveform Component
 * Real-time waveform visualization using Web Audio API and Canvas
 */
const AudioWaveform = ({
  audioData,
  isRecording,
  width = 700,
  height = 150,
  color = '#3b82f6',
  backgroundColor = '#0f172a'
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);

  /**
   * Draw waveform on canvas
   */
  const draw = useCallback((data) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = data.length;
    const sliceWidth = width / bufferLength;
    let x = 0;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();

    for (let i = 0; i < bufferLength; i++) {
      const v = data[i] / 128.0; // Normalize to 0-1
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [width, height, color, backgroundColor]);

  /**
   * Animation loop for real-time visualization
   */
  const animate = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
    draw(dataArrayRef.current);
    animationRef.current = requestAnimationFrame(animate);
  }, [draw]);

  /**
   * Initialize audio context and analyser
   */
  useEffect(() => {
    if (isRecording && !audioContextRef.current) {
      const initAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();

          analyserRef.current.fftSize = 2048;
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);

          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          sourceRef.current.connect(analyserRef.current);

          animate();
        } catch (err) {
          console.error('Error accessing microphone:', err);
        }
      };

      initAudio();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isRecording, animate]);

  /**
   * Draw static waveform when audioData is provided
   */
  useEffect(() => {
    if (!isRecording && audioData && audioData.length > 0) {
      // Normalize data to 0-255 range for visualization
      const maxVal = Math.max(...audioData.map(Math.abs));
      const normalizedData = audioData.map(val =>
        ((val / maxVal) * 128) + 128
      );
      draw(normalizedData);
    }
  }, [audioData, isRecording, draw]);

  /**
   * Draw empty waveform on mount
   */
  useEffect(() => {
    if (!audioData && !isRecording) {
      const emptyData = new Uint8Array(1024).fill(128);
      draw(emptyData);
    }
  }, [audioData, isRecording, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor,
        borderRadius: '8px',
        border: '1px solid #334155'
      }}
    />
  );
};

export default AudioWaveform;