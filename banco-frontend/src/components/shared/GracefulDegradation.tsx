"use client";

import { ReactNode, useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export interface GracefulDegradationProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  showRetryButton?: boolean;
  retryLabel?: string;
  className?: string;
}

/**
 * Graceful degradation wrapper for critical components
 * Provides fallback UIs when components fail to load or render
 */
export function GracefulDegradation({
  children,
  fallback,
  loadingFallback,
  errorFallback,
  isLoading = false,
  error = null,
  onRetry,
  showRetryButton = true,
  retryLabel = "Reintentar",
  className,
}: GracefulDegradationProps) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (error) {
      setHasError(true);
    }
  }, [error]);

  const handleRetry = () => {
    setHasError(false);
    setRetryCount((prev) => prev + 1);
    onRetry?.();
  };

  // Loading state
  if (isLoading) {
    return (
      loadingFallback || (
        <div className={className}>
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )
    );
  }

  // Error state
  if (hasError || error) {
    return (
      errorFallback || (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={className}
        >
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-secondary/50 p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Servicio no disponible
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Este componente está temporalmente unavailable. Intente nuevamente o contacte soporte si el problema persiste.
            </p>
            {showRetryButton && onRetry && (
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                disabled={retryCount >= 3}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {retryLabel}
                {retryCount > 0 && ` (${retryCount})`}
              </Button>
            )}
          </div>
        </motion.div>
      )
    );
  }

  // Normal state
  return <>{children}</>;
}

/**
 * HOC for adding graceful degradation to any component
 */
export function withGracefulDegradation<P extends object>(
  Component: React.ComponentType<P>,
  options?: Partial<GracefulDegradationProps>
) {
  return function WrappedComponent(props: P) {
    return (
      <GracefulDegradation {...options}>
        <Component {...props} />
      </GracefulDegradation>
    );
  };
}

/**
 * Banking-specific fallback for financial data
 */
export function FinancialDataFallback({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-secondary/50 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Datos financieros no disponibles
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          No se pudieron cargar los datos financieros en este momento. Por favor, actualice la página.
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>
    </div>
  );
}

/**
 * Chart fallback for when charts fail to load
 */
export function ChartFallback({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-secondary/50 p-8 text-center min-h-[300px]">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Gráfico no disponible
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          El gráfico no pudo cargarse. Los datos están disponibles en formato tabular.
        </p>
      </div>
    </div>
  );
}

/**
 * Table fallback for when tables fail to load
 */
export function TableFallback({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-secondary/50 p-8 text-center min-h-[200px]">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Tabla no disponible
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          La tabla no pudo cargarse. Intente actualizar la página.
        </p>
      </div>
    </div>
  );
}
