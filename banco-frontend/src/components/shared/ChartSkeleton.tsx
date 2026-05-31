import React from "react";

export function ChartSkeleton() {
  return (
    <div className="h-64 w-full overflow-hidden rounded-3xl bg-secondary/70 shimmer" aria-hidden="true" />
  );
}
