"use client";

import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary boundaryName="Auth">{children}</ErrorBoundary>;
}
