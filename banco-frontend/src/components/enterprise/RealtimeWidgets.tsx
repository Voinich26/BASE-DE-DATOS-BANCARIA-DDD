"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  AlertTriangle,
  FileStack,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePolling } from "@/hooks/usePolling";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

interface PendingApproval {
  id: number;
  type: "transfer" | "loan";
  description: string;
  amount: number;
  createdAt: string;
  requiresApproval: boolean;
}

interface SuspiciousActivity {
  id: string;
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
}

interface BatchStatus {
  id: number;
  name: string;
  totalItems: number;
  processedItems: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
}

interface RealtimeWidgetsProps {
  className?: string;
}

export function RealtimeWidgets({ className }: RealtimeWidgetsProps) {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [batchStatuses, setBatchStatuses] = useState<BatchStatus[]>([]);

  // Polling for pending approvals
  const { metrics: approvalMetrics } = usePolling(async () => {
    // Simular fetch de aprobaciones pendientes
    // En producción: const data = await transferService.getPending();
  }, {
    interval: 10000,
    enabled: true,
    immediate: false,
  });

  // Polling for suspicious activity
  const { metrics: activityMetrics } = usePolling(async () => {
    // Simular fetch de actividad sospechosa
    // En producción: const data = await auditService.getSuspiciousActivity();
  }, {
    interval: 15000,
    enabled: true,
    immediate: false,
  });

  // Polling for batch status
  const { metrics: batchMetrics } = usePolling(async () => {
    // Simular fetch de estado de lotes
    // En producción: const data = await batchService.getActiveBatches();
  }, {
    interval: 5000,
    enabled: true,
    immediate: false,
  });

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Pending Approvals Widget */}
        <PendingApprovalsWidget 
          approvals={pendingApprovals} 
          metrics={approvalMetrics}
        />

        {/* Suspicious Activity Widget */}
        <SuspiciousActivityWidget 
          activities={suspiciousActivities}
          metrics={activityMetrics}
        />

        {/* Batch Monitor Widget */}
        <BatchMonitorWidget 
          batches={batchStatuses}
          metrics={batchMetrics}
        />
      </div>
    </div>
  );
}

function PendingApprovalsWidget({ 
  approvals, 
  metrics 
}: { 
  approvals: PendingApproval[];
  metrics: any;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-foreground">Aprobaciones Pendientes</h3>
        </div>
        <Badge variant="secondary">{approvals.length}</Badge>
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No hay aprobaciones pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.slice(0, 3).map((approval) => (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {approval.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(approval.amount)}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs">
                  {formatRelativeTime(approval.createdAt)}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {metrics && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Última actualización</span>
            <span>{metrics.lastPollTime ? formatRelativeTime(metrics.lastPollTime) : "-"}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function SuspiciousActivityWidget({ 
  activities,
  metrics 
}: { 
  activities: SuspiciousActivity[];
  metrics: any;
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "medium":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      default:
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-foreground">Actividad Sospechosa</h3>
        </div>
        <Badge variant="secondary">{activities.length}</Badge>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Sin actividad sospechosa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 3).map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${getSeverityColor(activity.severity)}`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {activity.severity} severidad
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {formatRelativeTime(activity.timestamp)}
              </Badge>
            </motion.div>
          ))}
        </div>
      )}

      {metrics && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Última actualización</span>
            <span>{metrics.lastPollTime ? formatRelativeTime(metrics.lastPollTime) : "-"}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function BatchMonitorWidget({ 
  batches,
  metrics 
}: { 
  batches: BatchStatus[];
  metrics: any;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-emerald-500";
      case "failed":
        return "text-red-500";
      case "processing":
        return "text-blue-500";
      default:
        return "text-yellow-500";
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileStack className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold text-foreground">Monitor de Lotes</h3>
        </div>
        <Badge variant="secondary">{batches.length}</Badge>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <FileStack className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No hay lotes activos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.slice(0, 3).map((batch) => (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-secondary/50"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {batch.name}
                </p>
                <Badge variant="outline" className={`text-xs ${getStatusColor(batch.status)}`}>
                  {batch.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${batch.progress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-blue-500"
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {batch.processedItems}/{batch.totalItems}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {metrics && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Última actualización</span>
            <span>{metrics.lastPollTime ? formatRelativeTime(metrics.lastPollTime) : "-"}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
