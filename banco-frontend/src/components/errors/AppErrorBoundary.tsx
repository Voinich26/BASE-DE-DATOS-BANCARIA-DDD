"use client";

import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary boundaryName="App">{children}</ErrorBoundary>;
}
