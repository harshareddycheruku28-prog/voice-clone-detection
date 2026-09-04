import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Box, Typography } from '@mui/material';

/**
 * AudioGraph Component
 * Full waveform area chart with color-coded AI/Human regions
 */
const AudioGraph = ({ waveform = [], chunks = [], duration = 0 }) => {
  // Build chart data from waveform points with time mapping
  const chartData = waveform.map((amplitude, index) => {
    const time = duration > 0 ? (index / waveform.length) * duration : index;
    const chunkDuration = duration / (chunks.length || 1);
    const chunkIndex = Math.min(Math.floor(time / chunkDuration), chunks.length - 1);
    const chunk = chunks[chunkIndex] || {};
    const isAI = chunk.prediction?.is_ai_generated || false;
    const aiProb = chunk.prediction?.ai_probability || 0;

    return {
      time: parseFloat(time.toFixed(2)),
      amplitude: parseFloat(amplitude.toFixed(3)),
      isAI,
      aiProb: Math.round(aiProb * 100),
      humanProb: Math.round((1 - aiProb) * 100),
      // Split into two series for color coding
      aiAmplitude: isAI ? amplitude : null,
      humanAmplitude: !isAI ? amplitude : null
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#1e293b',
          padding: '12px 16px',
          border: '1px solid #334155',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>
            ⏱ {d.time.toFixed(2)}s
          </p>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
            Amplitude: {d.amplitude.toFixed(3)}
          </p>
          <p style={{
            margin: '4px 0 0',
            color: d.isAI ? '#ef4444' : '#22c55e',
            fontWeight: 700,
            fontSize: '0.8rem'
          }}>
            {d.isAI ? `🤖 AI Voice: ${d.aiProb}%` : `👤 Human Voice: ${d.humanProb}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Box sx={{
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0f172a',
        borderRadius: 2,
        border: '1px solid #334155',
        color: '#64748b'
      }}>
        No waveform data available
      </Box>
    );
  }

  return (
    <Box>
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mb: 1.5, justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{
            width: 14,
            height: 14,
            borderRadius: '3px',
            background: 'linear-gradient(135deg, #ef444480, #ef4444)'
          }} />
          <Typography variant="caption" color="text.secondary">AI-Generated Region</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{
            width: 14,
            height: 14,
            borderRadius: '3px',
            background: 'linear-gradient(135deg, #22c55e80, #22c55e)'
          }} />
          <Typography variant="caption" color="text.secondary">Human Voice Region</Typography>
        </Box>
      </Box>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="humanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 11 }}
              label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 11 }}
              label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#334155" />

            {/* AI regions */}
            <Area
              type="monotone"
              dataKey="aiAmplitude"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#aiGradient)"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4, fill: '#ef4444', stroke: '#0f172a', strokeWidth: 2 }}
            />
            {/* Human regions */}
            <Area
              type="monotone"
              dataKey="humanAmplitude"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#humanGradient)"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e', stroke: '#0f172a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Box>
  );
};

export default AudioGraph;
