"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

interface BarChartWidgetProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  className?: string;
  formatY?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  highlightMax?: boolean;
  horizontal?: boolean;
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

export function BarChartWidget({
  data,
  xKey,
  yKey,
  color = "#1a8fe6",
  height = 200,
  className,
  formatY,
  formatTooltip,
  highlightMax = false,
  horizontal = false,
}: BarChartWidgetProps) {
  const maxValue = highlightMax
    ? Math.max(...data.map((d) => Number(d[yKey]) || 0))
    : null;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={!horizontal}
            horizontal={horizontal}
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatY}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
            </>
          ) : (
            <>
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
            </>
          )}
          <Tooltip
            content={<CustomTooltip formatTooltip={formatTooltip} />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar
            dataKey={yKey}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          >
            {data.map((entry, index) => {
              const val = Number(entry[yKey]) || 0;
              const isMax = highlightMax && val === maxValue;
              return (
                <Cell
                  key={index}
                  fill={isMax ? "#22d3ee" : color}
                  fillOpacity={isMax ? 1 : 0.75}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
