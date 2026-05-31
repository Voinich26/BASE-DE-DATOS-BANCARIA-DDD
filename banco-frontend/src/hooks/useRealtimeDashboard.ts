import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePolling } from "./usePolling";
import { accountService } from "@/services/account.service";
import { transferService } from "@/services/transfer.service";
import { loanService } from "@/services/loan.service";
import type { DashboardFinancieroResponse, TransferenciaResponse, PrestamoResponse } from "@/types/api.types";

interface UseRealtimeDashboardOptions {
  /** Polling interval in milliseconds. Default: 15000 (15s) */
  interval?: number;
  /** Whether realtime updates are enabled. Default: true */
  enabled?: boolean;
}

interface RealtimeDashboardData {
  dashboard: DashboardFinancieroResponse | null;
  recentTransfers: TransferenciaResponse[];
  recentLoans: PrestamoResponse[];
  isLoading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  refresh: () => void;
}

/**
 * Realtime dashboard hook with live KPIs and recent activity.
 * Uses intelligent polling with visibility-aware pausing and retry logic.
 */
export function useRealtimeDashboard(options: UseRealtimeDashboardOptions = {}) {
  const { interval = 15000, enabled = true } = options;
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Dashboard data with TanStack Query
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => accountService.getDashboard(),
    enabled,
    staleTime: 10000, // Consider data stale after 10s
    refetchOnWindowFocus: false, // We handle this manually with polling
  });

  // Recent transfers
  const {
    data: transfersData,
    isLoading: transfersLoading,
    error: transfersError,
    refetch: refetchTransfers,
  } = useQuery({
    queryKey: ["transfers", "recent"],
    queryFn: () => transferService.getHistory({ page: 0, size: 5 }),
    enabled,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  // Recent loans
  const {
    data: loansData,
    isLoading: loansLoading,
    error: loansError,
    refetch: refetchLoans,
  } = useQuery({
    queryKey: ["loans", "recent"],
    queryFn: () => loanService.getAll(0, 5),
    enabled,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      refetchDashboard(),
      refetchTransfers(),
      refetchLoans(),
    ]);
    setLastUpdate(new Date());
  }, [refetchDashboard, refetchTransfers, refetchLoans]);

  // Polling with intelligent pausing
  const { metrics } = usePolling(refresh, {
    interval,
    enabled,
    immediate: true,
    retryCount: 3,
    pauseOnOffline: true,
    onSuccess: () => {
      setLastUpdate(new Date());
    },
    onError: (error) => {
      console.error("Dashboard polling error:", error);
    },
  });

  const recentTransfers = transfersData?.content ?? [];
  const recentLoans = loansData?.content ?? [];

  const isLoading = dashboardLoading || transfersLoading || loansLoading;
  const error = dashboardError || transfersError || loansError;

  return {
    dashboard: dashboard ?? null,
    recentTransfers,
    recentLoans,
    isLoading,
    error: error as Error | null,
    lastUpdate,
    refresh,
    pollingMetrics: metrics,
  };
}

/**
 * Hook for realtime transfer status updates
 */
export function useRealtimeTransfers(transferId?: number, options: UseRealtimeDashboardOptions = {}) {
  const { interval = 10000, enabled = !!transferId } = options;

  const {
    data: transfer,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["transfer", transferId],
    queryFn: async () => {
      const history = await transferService.getHistory({ page: 0, size: 1 });
      return history.content.find(t => t.idTransferencia === transferId) || null;
    },
    enabled: enabled && !!transferId,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  const { metrics } = usePolling(async () => { await refetch(); }, {
    interval,
    enabled,
    immediate: true,
    retryCount: 3,
  });

  return {
    transfer,
    isLoading,
    error: error as Error | null,
    refresh: () => refetch(),
    pollingMetrics: metrics,
  };
}

/**
 * Hook for realtime loan status updates
 */
export function useRealtimeLoans(loanId?: number, options: UseRealtimeDashboardOptions = {}) {
  const { interval = 10000, enabled = !!loanId } = options;

  const {
    data: loan,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => loanService.getById(loanId!),
    enabled: enabled && !!loanId,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  const { metrics } = usePolling(async () => { await refetch(); }, {
    interval,
    enabled,
    immediate: true,
    retryCount: 3,
  });

  return {
    loan,
    isLoading,
    error: error as Error | null,
    refresh: () => refetch(),
    pollingMetrics: metrics,
  };
}
