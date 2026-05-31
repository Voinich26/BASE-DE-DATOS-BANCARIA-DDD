"use client";

import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export function ChartErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary boundaryName="Chart">{children}</ErrorBoundary>;
}
