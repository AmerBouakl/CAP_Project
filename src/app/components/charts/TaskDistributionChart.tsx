import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KanbanSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface StatusData {
  status: string;
  count: number;
}

interface TaskDistributionChartProps {
  data: StatusData[];
  palette: string[];
}

export const TaskDistributionChart: React.FC<TaskDistributionChartProps> = ({ data, palette }) => {
  return (
    <Card className="border-border/80 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KanbanSquare className="h-4 w-4 text-primary" />
          Task Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--color-border)" />
              <XAxis dataKey="status" tick={{ fill: 'var(--color-muted-foreground)' }} />
              <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 2, 2]}>
                {data.map((entry, index) => (
                  <Cell key={`${entry.status}-${index}`} fill={palette[index % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
