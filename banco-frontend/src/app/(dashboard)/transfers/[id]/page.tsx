"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { transferService } from "@/services/transfer.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { TimelineEnterprise, type TimelineStep } from "@/components/enterprise/TimelineEnterprise";
import { MetricGrid, type MetricItem } from "@/components/enterprise/MetricGrid";
import { ApprovalDialog } from "@/components/enterprise/ApprovalDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime, maskAccountNumber } from "@/lib/utils";

// ── Build timeline from transfer state ───────────────────────────────────────

function buildTimeline(transfer: {
  estadoTransferencia: string;
  requiereAprobacion: boolean;
  fechaCreacion: string;
  fechaAprobacion?: string;
  fechaVencimiento?: string;
  nombreUsuarioCreador?: string;
}): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const estado = transfer.estadoTransferencia;

  // Created
  steps.push({
    id: "creada",
    label: "Transferencia Creada",
    description: "Solicitud registrada en el sistema",
    timestamp: transfer.fechaCreacion,
    actor: transfer.nombreUsuarioCreador,
    status: "completed",
  });

  // Approval required
  if (transfer.requiereAprobacion) {
    const approvalStatus =
      estado === "En Espera de Aprobacion"
        ? "current"
        : estado === "Rechazada"
        ? "rejected"
        : estado === "Vencida"
        ? "skipped"
        : "completed";

    steps.push({
      id: "aprobacion",
      label: "Pendiente de Aprobación",
      description: "En espera de autorización del supervisor",
      timestamp: estado !== "En Espera de Aprobacion" ? transfer.fechaAprobacion : undefined,
      status: approvalStatus,
    });
  }

  // Execution
  if (estado === "Ejecutada") {
    steps.push({
      id: "ejecutada",
      label: "Transferencia Ejecutada",
      description: "Fondos transferidos exitosamente",
      timestamp: transfer.fechaAprobacion,
      status: "completed",
    });
  } else if (estado === "Rechazada") {
    steps.push({
      id: "rechazada",
      label: "Transferencia Rechazada",
      description: "La transferencia fue denegada",
      timestamp: transfer.fechaAprobacion,
      status: "rejected",
    });
  } else if (estado === "Vencida") {
    steps.push({
      id: "vencida",
      label: "Transferencia Vencida",
      description: "El tiempo de aprobación expiró",
      timestamp: transfer.fechaVencimiento,
      status: "rejected",
    });
  } else if (estado === "Pendiente") {
    steps.push({
      id: "pendiente",
      label: "En Procesamiento",
      description: "Siendo procesada por el sistema",
      status: "current",
    });
  }

  return steps;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isSupervisor } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);

  // ── Query ────────────────────────────────────────────────────────────────────

  const { data: transfer, isLoading } = useQuery({
    queryKey: ["transfer", id],
    queryFn: async () => {
      // Get from history since there's no single-transfer endpoint
      const history = await transferService.getHistory({ page: 0, size: 100 });
      const found = history.content.find((t) => t.idTransferencia === parseInt(id));
      if (!found) throw new Error("Transfer not found");
      return found;
    },
    enabled: !!id,
    refetchInterval: 30000, // poll every 30s
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: () => transferService.approve(parseInt(id), user!.idUsuario),
    onSuccess: () => {
      notify({ title: "Transferencia aprobada", message: "La transferencia fue aprobada y ejecutada", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["transfer", id] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setApproveDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo aprobar la transferencia", type: "error" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (motivo: string) =>
      transferService.reject(parseInt(id), user!.idUsuario, motivo),
    onSuccess: () => {
      notify({ title: "Transferencia rechazada", message: "La transferencia fue rechazada", type: "warning" });
      queryClient.invalidateQueries({ queryKey: ["transfer", id] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setRejectDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo rechazar la transferencia", type: "error" }),
  });

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <XCircle className="w-12 h-12 opacity-30 mb-3" />
        <p className="text-lg font-medium">Transferencia no encontrada</p>
        <Button variant="ghost" className="mt-4 gap-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
      </div>
    );
  }

  const timeline = buildTimeline(transfer);
  const canApprove =
    isSupervisor() &&
    transfer.estadoTransferencia === "En Espera de Aprobacion";

  const metrics: MetricItem[] = [
    {
      label: "Monto",
      value: formatCurrency(transfer.monto),
      color: "blue",
      icon: DollarSign,
    },
    {
      label: "Estado",
      value: transfer.estadoTransferencia,
      color:
        transfer.estadoTransferencia === "Ejecutada"
          ? "green"
          : transfer.estadoTransferencia === "Rechazada" || transfer.estadoTransferencia === "Vencida"
          ? "red"
          : "orange",
    },
    {
      label: "Aprobación",
      value: transfer.requiereAprobacion ? "Requerida" : "Automática",
      color: transfer.requiereAprobacion ? "orange" : "green",
    },
    {
      label: "Creado por",
      value: transfer.nombreUsuarioCreador ?? `#${transfer.idUsuarioCreador}`,
      color: "purple",
      icon: User,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                Transferencia #{transfer.idTransferencia}
              </h1>
              <StatusBadge status={transfer.estadoTransferencia} />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(transfer.fechaCreacion)}
            </p>
          </div>
        </div>

        {/* Approval actions */}
        {canApprove && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setRejectDialog(true)}
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => setApproveDialog(true)}
            >
              <CheckCircle2 className="w-4 h-4" />
              Aprobar
            </Button>
          </div>
        )}
      </div>

      {/* ── Metrics ────────────────────────────────────────────────────────── */}
      <MetricGrid metrics={metrics} columns={4} />

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Transfer details */}
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              Detalles de la Transferencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "ID Transferencia", value: `#${transfer.idTransferencia}`, mono: true },
              { label: "Cuenta Origen", value: maskAccountNumber(transfer.cuentaOrigen), mono: true },
              { label: "Cuenta Destino", value: maskAccountNumber(transfer.cuentaDestino), mono: true },
              { label: "Monto", value: formatCurrency(transfer.monto), highlight: true },
              {
                label: "Saldo Origen (antes)",
                value: transfer.saldoOrigenAntes != null
                  ? formatCurrency(transfer.saldoOrigenAntes)
                  : "—",
              },
              {
                label: "Saldo Origen (después)",
                value: transfer.saldoOrigenDespues != null
                  ? formatCurrency(transfer.saldoOrigenDespues)
                  : "—",
              },
              { label: "Requiere Aprobación", value: transfer.requiereAprobacion ? "Sí" : "No" },
              { label: "Estado Final", value: transfer.estadoFinal ? "Sí" : "No" },
              { label: "Fecha Creación", value: formatDateTime(transfer.fechaCreacion) },
              {
                label: "Fecha Aprobación",
                value: transfer.fechaAprobacion ? formatDateTime(transfer.fechaAprobacion) : "—",
              },
              {
                label: "Fecha Vencimiento",
                value: transfer.fechaVencimiento ? formatDateTime(transfer.fechaVencimiento) : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span
                  className={`text-sm font-medium ${
                    item.highlight
                      ? "text-primary font-bold font-numeric"
                      : item.mono
                      ? "font-mono text-foreground"
                      : "text-foreground"
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Timeline de Estado
            </CardTitle>
            <CardDescription>Historial de eventos de la transferencia</CardDescription>
          </CardHeader>
          <CardContent>
            <TimelineEnterprise steps={timeline} />
          </CardContent>
        </Card>
      </div>

      {/* ── Approve Dialog ──────────────────────────────────────────────────── */}
      <ApprovalDialog
        open={approveDialog}
        onOpenChange={setApproveDialog}
        title="Aprobar Transferencia"
        description="Al aprobar, los fondos serán transferidos inmediatamente."
        entityLabel="Monto"
        entityValue={formatCurrency(transfer.monto)}
        onApprove={async () => approveMutation.mutate()}
        requireRejectComment={false}
        approveLabel="Confirmar Aprobación"
        variant="approve-only"
        loading={approveMutation.isPending}
      />

      {/* ── Reject Dialog ───────────────────────────────────────────────────── */}
      <ApprovalDialog
        open={rejectDialog}
        onOpenChange={setRejectDialog}
        title="Rechazar Transferencia"
        description="Indica el motivo del rechazo."
        entityLabel="Monto"
        entityValue={formatCurrency(transfer.monto)}
        onReject={async (motivo) => rejectMutation.mutate(motivo!)}
        requireRejectComment
        rejectLabel="Confirmar Rechazo"
        variant="reject-only"
        loading={rejectMutation.isPending}
      />
    </div>
  );
}
