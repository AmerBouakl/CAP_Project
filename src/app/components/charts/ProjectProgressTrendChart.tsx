import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface TrendData {
  month: string;
  progress: number;
}

interface ProjectProgressTrendChartProps {
  data: TrendData[];
}

export const ProjectProgressTrendChart: React.FC<ProjectProgressTrendChartProps> = ({ data }) => {
  return (
    <Card className="border-border/80 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-4 w-4 text-primary" />
          Project Progress Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--color-muted-foreground)' }} />
              <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="progress"
                stroke="var(--color-chart-1)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
