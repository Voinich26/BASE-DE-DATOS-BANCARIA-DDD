"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: "blue" | "cyan" | "green" | "purple" | "orange" | "red";
  loading?: boolean;
  className?: string;
  index?: number;
}

const COLOR_MAP = {
  blue: {
    icon: "bg-blue-500/15 text-blue-400",
    glow: "hover:shadow-glow-blue",
    accent: "text-blue-400",
    bar: "bg-blue-500/30",
  },
  cyan: {
    icon: "bg-cyan-500/15 text-cyan-400",
    glow: "hover:shadow-glow-cyan",
    accent: "text-cyan-400",
    bar: "bg-cyan-500/30",
  },
  green: {
    icon: "bg-emerald-500/15 text-emerald-400",
    glow: "",
    accent: "text-emerald-400",
    bar: "bg-emerald-500/30",
  },
  purple: {
    icon: "bg-purple-500/15 text-purple-400",
    glow: "",
    accent: "text-purple-400",
    bar: "bg-purple-500/30",
  },
  orange: {
    icon: "bg-orange-500/15 text-orange-400",
    glow: "",
    accent: "text-orange-400",
    bar: "bg-orange-500/30",
  },
  red: {
    icon: "bg-red-500/15 text-red-400",
    glow: "",
    accent: "text-red-400",
    bar: "bg-red-500/30",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  loading = false,
  className,
  index = 0,
}: StatCardProps) {
  const colors = COLOR_MAP[color];

  if (loading) {
    return (
      <div className={cn("bank-card", className)}>
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={cn(
        "bank-card group cursor-default",
        colors.glow,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>

        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend.value > 0
                ? "bg-emerald-500/15 text-emerald-400"
                : trend.value < 0
                ? "bg-red-500/15 text-red-400"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {trend.value > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend.value < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground font-numeric tracking-tight">
          {value}
        </p>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70">{subtitle}</p>
        )}
        {trend && (
          <p className="text-xs text-muted-foreground">{trend.label}</p>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className={cn("mt-4 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300", colors.bar)} />
    </motion.div>
  );
}
