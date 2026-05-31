"use client";

import React, { Suspense } from "react";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { AuthErrorBoundary } from "@/components/errors/AuthErrorBoundary";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

// Dynamic imports para componentes pesados
const ObservabilityProvider = React.lazy(() => 
  import("@/components/providers/ObservabilityProvider").then(mod => ({ default: mod.ObservabilityProvider }))
);
const ServiceWorkerProvider = React.lazy(() => 
  import("@/components/providers/ServiceWorkerProvider").then(mod => ({ default: mod.ServiceWorkerProvider }))
);
const SessionTimeoutProvider = React.lazy(() => 
  import("@/components/providers/SessionTimeoutProvider").then(mod => ({ default: mod.SessionTimeoutProvider }))
);
const CommandPalette = React.lazy(() => 
  import("@/components/enterprise/CommandPalette").then(mod => ({ default: mod.CommandPalette }))
);

// Loading fallback
function ProvidersLoading() {
  return null;
}

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <AuthErrorBoundary>
            <AuthProvider>
              <OfflineBanner />
              <Suspense fallback={<ProvidersLoading />}>
                <ObservabilityProvider />
                <ServiceWorkerProvider />
                <SessionTimeoutProvider />
                <CommandPalette />
              </Suspense>
              {children}
            </AuthProvider>
          </AuthErrorBoundary>
        </ThemeProvider>
      </QueryProvider>
    </AppErrorBoundary>
  );
}
