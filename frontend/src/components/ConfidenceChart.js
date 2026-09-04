import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

/**
 * ConfidenceChart Component
 * Displays detection confidence over time using Recharts
 */
const ConfidenceChart = ({ data, height = 200 }) => {
  // Transform data for chart
  const chartData = data.map((item, index) => ({
    name: `Chunk ${index + 1}`,
    aiProbability: Math.round(item.prediction?.ai_probability * 100) || 0,
    humanProbability: Math.round(item.prediction?.human_probability * 100) || 0,
    confidence: Math.round(item.prediction?.confidence * 100) || 0,
    timestamp: item.start_time?.toFixed(1) || index
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#1e293b',
          padding: '10px',
          border: '1px solid #334155',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0, color: '#94a3b8' }}>{label}</p>
          <p style={{ margin: '5px 0', color: '#ef4444' }}>
            AI Probability: {payload[0].value}%
          </p>
          <p style={{ margin: '5px 0', color: '#22c55e' }}>
            Human Probability: {payload[1]?.value || 100 - payload[0].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155',
        color: '#64748b'
      }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
            domain={[0, 100]}
            label={{
              value: 'Confidence %',
              angle: -90,
              position: 'insideLeft',
              fill: '#64748b'
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="aiProbability" name="AI Probability" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.aiProbability > 50 ? '#ef4444' : '#3b82f6'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConfidenceChart;