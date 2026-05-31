"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialChartCardProps {
  title: string;
  description?: string;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FinancialChartCard({
  title,
  description,
  trend,
  trendLabel,
  loading = false,
  children,
  actions,
  className,
}: FinancialChartCardProps) {
  return (
    <Card glass hover className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-0.5">{description}</CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {trend !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full",
                  trend > 0
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : trend < 0
                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                    : "bg-secondary text-muted-foreground border border-border"
                )}
              >
                {trend > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {trendLabel ?? `${Math.abs(trend)}%`}
              </div>
            )}
            {actions}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
