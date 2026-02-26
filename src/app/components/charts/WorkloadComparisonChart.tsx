import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface WorkloadData {
  name: string;
  planned: number;
  actual: number;
}

interface WorkloadComparisonChartProps {
  data: WorkloadData[];
}

export const WorkloadComparisonChart: React.FC<WorkloadComparisonChartProps> = ({ data }) => {
  return (
    <Card className="border-border/80 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-4 w-4 text-primary" />
          Planned vs Actual Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)' }} />
              <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="planned" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="actual" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
