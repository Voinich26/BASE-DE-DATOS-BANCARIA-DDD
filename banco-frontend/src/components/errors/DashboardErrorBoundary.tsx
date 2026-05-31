"use client";

import { usePathname } from "next/navigation";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ErrorBoundary boundaryName="Dashboard" resetKey={pathname}>
      {children}
    </ErrorBoundary>
  );
}
