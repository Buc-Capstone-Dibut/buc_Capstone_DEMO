"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type TrendDatum = { name: string; value: number; fill: string };
type ImpactDatum = { name: string; value: number; fill: string };
type RadarDatum = { subject: string; value: number };

export function TrendAreaChart({
  data,
  accent,
  mutedColor,
  gradientId,
}: {
  data: TrendDatum[];
  accent: string;
  mutedColor: string;
  gradientId: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor={accent} stopOpacity={0.42} />
            <stop offset="95%" stopColor={accent} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: mutedColor }} />
        <YAxis hide domain={[0, 100]} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={accent}
          strokeWidth={3}
          fill={`url(#${gradientId})`}
          dot={{ r: 4, strokeWidth: 2, fill: "#ffffff", stroke: accent }}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ImpactBarChart({
  data,
  mutedColor,
}: {
  data: ImpactDatum[];
  mutedColor: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 10, top: 4, bottom: 4 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: mutedColor }} width={46} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={14}>
          {data.map((item) => (
            <Cell key={item.name} fill={item.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MetricRadarChart({
  data,
  accent,
  mutedColor,
}: {
  data: RadarDatum[];
  accent: string;
  mutedColor: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="72%" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
        <PolarGrid stroke="#dbe5d0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: mutedColor }} />
        <Radar dataKey="value" stroke={accent} fill={accent} fillOpacity={0.28} strokeWidth={2.5} dot />
      </RadarChart>
    </ResponsiveContainer>
  );
}
