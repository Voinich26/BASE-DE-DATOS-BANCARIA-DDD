"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: { icon: "w-8 h-8", iconWrap: "w-14 h-14", title: "text-sm", desc: "text-xs", py: "py-8" },
  md: { icon: "w-10 h-10", iconWrap: "w-18 h-18", title: "text-base", desc: "text-sm", py: "py-12" },
  lg: { icon: "w-12 h-12", iconWrap: "w-24 h-24", title: "text-lg", desc: "text-sm", py: "py-16" },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const s = SIZE_MAP[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        s.py,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-secondary/50 border border-border mb-4",
          s.iconWrap
        )}
      >
        <Icon className={cn(s.icon, "text-muted-foreground opacity-40")} />
      </div>
      <p className={cn("font-semibold text-foreground mb-1", s.title)}>{title}</p>
      {description && (
        <p className={cn("text-muted-foreground max-w-xs", s.desc)}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
