"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  rows?: number;
  showHeader?: boolean;
  showAvatar?: boolean;
  className?: string;
}

export function SkeletonCard({
  rows = 3,
  showHeader = true,
  showAvatar = false,
  className,
}: SkeletonCardProps) {
  return (
    <div className={cn("p-6 rounded-xl border border-border bg-card space-y-4", className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {showAvatar && <Skeleton className="h-9 w-9 rounded-xl shrink-0" />}
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5" style={{ width: `${70 + (i % 3) * 10}%` }} />
              <Skeleton className="h-3" style={{ width: `${40 + (i % 2) * 15}%` }} />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-secondary/60 border-b border-border px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${60 + (i % 3) * 20}px` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border/50 last:border-0 flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-3.5" style={{ width: `${50 + ((i + j) % 4) * 20}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
