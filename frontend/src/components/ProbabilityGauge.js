import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';

/**
 * ProbabilityGauge Component
 * Circular donut chart showing AI vs Human probability
 */
const ProbabilityGauge = ({ aiProbability = 0, humanProbability = 0, size = 220 }) => {
  const aiPct = Math.round(aiProbability * 100);
  const humanPct = Math.round(humanProbability * 100);
  const isAI = aiProbability > 0.5;

  const data = [
    { name: 'AI', value: aiPct },
    { name: 'Human', value: humanPct }
  ];

  const COLORS = ['#ef4444', '#22c55e'];

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      <Box sx={{ width: size, height: size, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.32}
              outerRadius={size * 0.44}
              startAngle={90}
              endAngle={-270}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index]}
                  style={{
                    filter: `drop-shadow(0 0 6px ${COLORS[index]}80)`,
                    transition: 'all 0.6s ease'
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: isAI ? '#ef4444' : '#22c55e',
              lineHeight: 1,
              textShadow: `0 0 20px ${isAI ? '#ef444480' : '#22c55e80'}`
            }}
          >
            {isAI ? aiPct : humanPct}%
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#94a3b8',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            {isAI ? 'AI Voice' : 'Human Voice'}
          </Typography>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
          <Typography variant="caption" color="text.secondary">AI {aiPct}%</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e' }} />
          <Typography variant="caption" color="text.secondary">Human {humanPct}%</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ProbabilityGauge;
