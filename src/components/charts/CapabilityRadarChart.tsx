import React from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip, Legend
} from 'recharts';

interface RadarDataItem {
  subject: string;
  value: number;
  fullMark?: number;
}

interface CapabilityRadarChartProps {
  data: RadarDataItem[];
  color?: string;
  compareData?: RadarDataItem[];
  compareColor?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-sm text-sm">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function CapabilityRadarChart({
  data,
  color = 'hsl(217, 72%, 38%)',
  compareData,
  compareColor = 'hsl(22, 89%, 54%)',
  height = 300,
}: CapabilityRadarChartProps) {
  const mergedData = data.map((item, i) => ({
    subject: item.subject,
    个人能力: item.value,
    ...(compareData && compareData[i] ? { 岗位要求: compareData[i].value } : {}),
    fullMark: item.fullMark || 100,
  }));

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={mergedData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Radar
            name="个人能力"
            dataKey="个人能力"
            stroke={color}
            fill={color}
            fillOpacity={0.2}
          />
          {compareData && (
            <Radar
              name="岗位要求"
              dataKey="岗位要求"
              stroke={compareColor}
              fill={compareColor}
              fillOpacity={0.15}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {compareData && <Legend wrapperStyle={{ paddingTop: 8 }} layout="horizontal" />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
