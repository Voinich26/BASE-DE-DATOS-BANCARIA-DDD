"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, AlertCircle, Circle } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

export interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  timestamp?: string;
  actor?: string;
  comment?: string;
  status: "completed" | "current" | "pending" | "rejected" | "skipped";
}

interface TimelineEnterpriseProps {
  steps: TimelineStep[];
  className?: string;
}

const STEP_ICONS = {
  completed: CheckCircle2,
  current: Clock,
  pending: Circle,
  rejected: XCircle,
  skipped: AlertCircle,
};

const STEP_COLORS = {
  completed: {
    icon: "text-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-500/30",
    line: "bg-emerald-500/40",
    label: "text-emerald-400",
  },
  current: {
    icon: "text-blue-400",
    bg: "bg-blue-500/15 border-blue-500/30",
    line: "bg-border",
    label: "text-blue-400",
  },
  pending: {
    icon: "text-muted-foreground",
    bg: "bg-secondary border-border",
    line: "bg-border",
    label: "text-muted-foreground",
  },
  rejected: {
    icon: "text-red-400",
    bg: "bg-red-500/15 border-red-500/30",
    line: "bg-red-500/40",
    label: "text-red-400",
  },
  skipped: {
    icon: "text-orange-400",
    bg: "bg-orange-500/15 border-orange-500/30",
    line: "bg-border",
    label: "text-orange-400",
  },
};

export function TimelineEnterprise({ steps, className }: TimelineEnterpriseProps) {
  return (
    <div className={cn("relative", className)}>
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[step.status];
        const colors = STEP_COLORS[step.status];
        const isLast = index === steps.length - 1;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
            className="relative flex gap-4"
          >
            {/* Line connector */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[18px] top-10 w-0.5 bottom-0",
                  colors.line
                )}
                style={{ height: "calc(100% - 8px)" }}
              />
            )}

            {/* Icon */}
            <div className="relative z-10 shrink-0 mt-0.5">
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full border-2",
                  colors.bg
                )}
              >
                <Icon className={cn("w-4 h-4", colors.icon)} />
              </div>
              {step.status === "current" && (
                <span className="absolute inset-0 rounded-full animate-ping bg-blue-500/20" />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6 flex-1 min-w-0", isLast && "pb-0")}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className={cn("text-sm font-semibold", colors.label)}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
                {step.timestamp && (
                  <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                    {formatDateTime(step.timestamp)}
                  </span>
                )}
              </div>

              {(step.actor || step.comment) && (
                <div className="mt-2 p-2.5 rounded-lg bg-secondary/50 border border-border space-y-1">
                  {step.actor && (
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">Por:</span>{" "}
                      {step.actor}
                    </p>
                  )}
                  {step.comment && (
                    <p className="text-xs text-muted-foreground italic">
                      "{step.comment}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
