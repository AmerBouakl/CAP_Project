import React from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface SkillsRadarChartProps {
  data: { axis: string; value: number; fullMark: number }[];
  color?: string;
  className?: string;
}

export const SkillsRadarChart: React.FC<SkillsRadarChartProps> = ({
  data,
  color = 'var(--color-primary)',
  className,
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
            tickCount={6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value.toFixed(2)} / 5`, 'Score']}
          />
          <Radar
            name="Compétences"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
