"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface AreaChartWidgetProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  color?: string;
  gradientId?: string;
  height?: number;
  className?: string;
  formatY?: (value: number) => string;
  formatTooltip?: (value: number) => string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatTooltip,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  formatTooltip?: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-glass border border-border">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-foreground">
        {formatTooltip ? formatTooltip(value) : value.toLocaleString("es-CO")}
      </p>
    </div>
  );
};

export function AreaChartWidget({
  data,
  xKey,
  yKey,
  color = "#1a8fe6",
  gradientId = "areaGradient",
  height = 200,
  className,
  formatY,
  formatTooltip,
}: AreaChartWidgetProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatY}
          />
          <Tooltip
            content={<CustomTooltip formatTooltip={formatTooltip} />}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
