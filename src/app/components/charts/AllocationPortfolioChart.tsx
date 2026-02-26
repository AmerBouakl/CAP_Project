import React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface AllocationData {
  name: string;
  value: number;
}

interface AllocationPortfolioChartProps {
  data: AllocationData[];
  palette: string[];
}

export const AllocationPortfolioChart: React.FC<AllocationPortfolioChartProps> = ({
  data,
  palette,
}) => {
  return (
    <Card className="border-border/80 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-4 w-4 text-primary" />
          Allocation by Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                }}
              />
              <Legend />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={68}
                outerRadius={104}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={palette[index % palette.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
