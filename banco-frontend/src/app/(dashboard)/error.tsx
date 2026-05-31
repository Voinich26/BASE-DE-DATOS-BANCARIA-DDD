"use client";

import { ErrorFallback } from "@/components/errors/ErrorFallback";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return <ErrorFallback error={error} reset={reset} context="Dashboard" />;
}
