import React from 'react';
import { cn } from '../ui/utils';

interface GaugeChartProps {
  value: number; // 0 to 100
  label: string;
  sublabel?: string;
  size?: number;
  color?: string;
  className?: string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  label,
  sublabel,
  size = 200,
  color = 'var(--color-primary)',
  className,
}) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  // We only want a semi-circle (180 degrees), so we treat the "full" circle as partial
  // Actually, standard gauge is usually 180deg (half circle) or 270deg.
  // Let's do a 180deg semi-circle for simplicity like the mockup.
  
  // For a 180 degree gauge:
  // We draw a strokeDasharray where the first value is the visible part.
  // Circumference of semi-circle is PI * radius.
  // The SVG circle usually starts at 3 o'clock. We rotate it.
  
  // Alternative simpler approach for SVG:
  // Stroke is the border.
  // stroke-dasharray = "current, total"
  // For a semi-circle gauge, total length is approx 251 (if r=40).
  // Let's stick to a standard full circle masked or rotated.
  
  // Using a cleaner approach: viewBox 0 0 100 50 (half height).
  
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const strokeWidth = 12;
  const center = size / 2;
  const r = (size - strokeWidth) / 2;
  const c = Math.PI * r;
  // We want visible arc to be 180deg (half circle).
  const halfC = c; 
  const dashOffset = halfC - (normalizedValue / 100) * halfC;

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative" style={{ width: size, height: size / 2 }}>
        <svg
          width={size}
          height={size / 2}
          viewBox={`0 0 ${size} ${size / 2}`}
          className="overflow-visible"
        >
          {/* Background Track */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Active Value */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDashoffset={dashOffset + c/2} // +c/2 because we only show half? 
            // Wait, standard dashoffset trick for gauges:
            // DashArray: [arcLength, circumference]
            strokeDasharray={`${halfC} ${c}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4 text-center">
          <span className="text-3xl font-bold text-foreground">{Math.round(normalizedValue)}%</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-lg font-semibold text-foreground">{label}</p>
        {sublabel && <p className="text-sm text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
};
