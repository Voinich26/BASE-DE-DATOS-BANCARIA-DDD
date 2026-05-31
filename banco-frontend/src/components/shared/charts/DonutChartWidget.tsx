"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface DonutChartWidgetProps {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
  showLegend?: boolean;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-glass border border-border">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="text-muted-foreground">{item.name}</span>
      </div>
      <p className="font-semibold text-foreground mt-0.5">
        {item.value.toLocaleString("es-CO")}
      </p>
    </div>
  );
};

export function DonutChartWidget({
  data,
  height = 180,
  innerRadius = 55,
  outerRadius = 80,
  className,
  showLegend = true,
}: DonutChartWidgetProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-bold text-foreground font-numeric">
            {total.toLocaleString("es-CO")}
          </p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
      </div>

      {showLegend && (
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground truncate">{item.name}</span>
              </div>
              <span className="text-xs font-semibold text-foreground font-numeric shrink-0">
                {item.value.toLocaleString("es-CO")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
