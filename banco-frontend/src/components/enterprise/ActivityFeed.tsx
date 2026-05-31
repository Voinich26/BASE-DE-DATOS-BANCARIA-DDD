"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  CreditCard,
  Landmark,
  FileStack,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn, formatRelativeTime, formatCurrency } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

export interface ActivityItem {
  id: string | number;
  type: "transfer" | "account" | "loan" | "batch" | "auth" | "system";
  action: string;
  description: string;
  amount?: number;
  status?: "success" | "pending" | "error" | "warning";
  timestamp: string;
  actor?: string;
  isNew?: boolean;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
  className?: string;
  realtimeEnabled?: boolean;
  onRefresh?: () => void;
}

const TYPE_ICONS = {
  transfer: ArrowLeftRight,
  account: CreditCard,
  loan: Landmark,
  batch: FileStack,
  auth: CheckCircle2,
  system: AlertCircle,
};

const STATUS_STYLES = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const STATUS_ICONS = {
  success: CheckCircle2,
  pending: Clock,
  error: XCircle,
  warning: AlertCircle,
};

export function ActivityFeed({
  items,
  loading = false,
  maxItems = 10,
  className,
  realtimeEnabled = false,
  onRefresh,
}: ActivityFeedProps) {
  const [localItems, setLocalItems] = useState<ActivityItem[]>(items);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync local items with props
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Realtime polling
  const { metrics } = usePolling(async () => {
    if (realtimeEnabled && onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  }, {
    interval: 15000,
    enabled: realtimeEnabled,
    immediate: false,
  });

  const displayed = localItems.slice(0, maxItems);

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-secondary shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-secondary rounded w-3/4" />
              <div className="h-2.5 bg-secondary rounded w-1/2" />
            </div>
            <div className="h-3 bg-secondary rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!displayed.length) {
    return (
      <div className={cn("py-8 text-center text-muted-foreground", className)}>
        <AlertCircle className="w-8 h-8 opacity-30 mx-auto mb-2" />
        <p className="text-sm">Sin actividad reciente</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header with realtime indicator */}
      {realtimeEnabled && (
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="text-xs text-muted-foreground">
            Actualización en tiempo real
          </span>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "h-2 w-2 rounded-full",
              isRefreshing ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
            )} />
            <span className="text-xs text-muted-foreground">
              {isRefreshing ? "Actualizando..." : "Conectado"}
            </span>
          </div>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {displayed.map((item, i) => {
          const TypeIcon = TYPE_ICONS[item.type] ?? AlertCircle;
          const statusStyle = item.status ? STATUS_STYLES[item.status] : STATUS_STYLES.pending;
          const StatusIcon = item.status ? STATUS_ICONS[item.status] : Clock;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/40 transition-colors group",
                item.isNew && "bg-primary/10 border border-primary/20"
              )}
            >
            {/* Type icon */}
            <div className={cn("flex items-center justify-center w-9 h-9 rounded-xl border shrink-0", statusStyle)}>
              <TypeIcon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.action}
                </p>
                {item.status && (
                  <StatusIcon className={cn("w-3 h-3 shrink-0", statusStyle.split(" ")[1])} />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {item.description}
                {item.actor && (
                  <span className="text-muted-foreground/60"> · {item.actor}</span>
                )}
              </p>
            </div>

            {/* Right side */}
            <div className="text-right shrink-0">
              {item.amount !== undefined && (
                <p className="text-sm font-semibold font-numeric text-foreground">
                  {formatCurrency(item.amount)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {formatRelativeTime(item.timestamp)}
              </p>
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
}
