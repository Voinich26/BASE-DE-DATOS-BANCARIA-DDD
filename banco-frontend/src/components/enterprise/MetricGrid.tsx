"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface MetricItem {
  label: string;
  value: string | number;
  subValue?: string;
  color?: "blue" | "green" | "orange" | "red" | "purple" | "cyan" | "default";
  icon?: React.ElementType;
}

interface MetricGridProps {
  metrics: MetricItem[];
  columns?: 2 | 3 | 4;
  loading?: boolean;
  className?: string;
}

const COLOR_MAP = {
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  red: "text-red-400 bg-red-500/10 border-red-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  default: "text-foreground bg-secondary border-border",
};

const COLS_MAP = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

export function MetricGrid({
  metrics,
  columns = 4,
  loading = false,
  className,
}: MetricGridProps) {
  if (loading) {
    return (
      <div className={cn("grid gap-3", COLS_MAP[columns], className)}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-secondary/30">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-28 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", COLS_MAP[columns], className)}>
      {metrics.map((metric, i) => {
        const Icon = metric.icon;
        const colorClass = COLOR_MAP[metric.color ?? "default"];

        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className={cn(
              "p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5",
              colorClass
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className="w-3.5 h-3.5 opacity-70" />}
              <p className="text-[11px] font-medium uppercase tracking-wider opacity-70">
                {metric.label}
              </p>
            </div>
            <p className="text-xl font-bold font-numeric tracking-tight">
              {metric.value}
            </p>
            {metric.subValue && (
              <p className="text-xs opacity-60 mt-0.5">{metric.subValue}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
