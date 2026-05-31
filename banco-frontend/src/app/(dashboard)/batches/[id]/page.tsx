"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileStack,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  Hash,
  DollarSign,
} from "lucide-react";
import { batchService } from "@/services/batch.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { MetricGrid, type MetricItem } from "@/components/enterprise/MetricGrid";
import { ApprovalDialog } from "@/components/enterprise/ApprovalDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isSupervisor } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);

  const { data: batch, isLoading } = useQuery({
    queryKey: ["batch", id],
    queryFn: () => batchService.getById(parseInt(id)),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: () => batchService.aprobar(parseInt(id), user!.idUsuario),
    onSuccess: () => {
      notify({ title: "Lote aprobado", message: "El lote fue aprobado y procesado", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["batch", id] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setApproveDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo aprobar el lote", type: "error" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (motivo: string) =>
      batchService.rechazar(parseInt(id), user!.idUsuario, motivo),
    onSuccess: () => {
      notify({ title: "Lote rechazado", message: "El lote fue rechazado", type: "warning" });
      queryClient.invalidateQueries({ queryKey: ["batch", id] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setRejectDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo rechazar el lote", type: "error" }),
  });

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

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <XCircle className="w-12 h-12 opacity-30 mb-3" />
        <p className="text-lg font-medium">Lote no encontrado</p>
        <Button variant="ghost" className="mt-4 gap-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
      </div>
    );
  }

  const canApprove =
    isSupervisor() &&
    (batch.estadoLote === "Pendiente" || batch.estadoLote === "En Revision");

  const successRate =
    batch.totalItems > 0 && batch.itemsExitosos != null
      ? Math.round((batch.itemsExitosos / batch.totalItems) * 100)
      : null;

  const metrics: MetricItem[] = [
    { label: "Monto Total", value: formatCurrency(batch.montoTotal), color: "blue", icon: DollarSign },
    { label: "Total Ítems", value: batch.totalItems, color: "cyan", icon: Hash },
    {
      label: "Ítems Exitosos",
      value: batch.itemsExitosos ?? "—",
      subValue: successRate != null ? `${successRate}% éxito` : undefined,
      color: "green",
    },
    { label: "Ítems Fallidos", value: batch.itemsFallidos ?? "—", color: batch.itemsFallidos ? "red" : "default" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Lote #{batch.idLote}</h1>
              <StatusBadge status={batch.estadoLote} />
            </div>
            <p className="text-xs text-muted-foreground">
              {batch.razonSocialEmpresa} · {formatDateTime(batch.fechaCreacion)}
            </p>
          </div>
        </div>

        {canApprove && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setRejectDialog(true)}
            >
              <XCircle className="w-4 h-4" /> Rechazar
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => setApproveDialog(true)}
            >
              <CheckCircle2 className="w-4 h-4" /> Aprobar
            </Button>
          </div>
        )}
      </div>

      {/* Metrics */}
      <MetricGrid metrics={metrics} columns={4} />

      {/* Progress bar for processed batches */}
      {batch.estadoLote === "Procesado" && successRate != null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-400">Tasa de Éxito</span>
            <span className="text-sm font-bold font-numeric text-emerald-400">{successRate}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${successRate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{batch.itemsExitosos} exitosos</span>
            <span className="text-xs text-muted-foreground">{batch.itemsFallidos ?? 0} fallidos</span>
          </div>
        </motion.div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileStack className="w-4 h-4 text-primary" />
              Información del Lote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "ID Lote", value: `#${batch.idLote}`, mono: true },
              { label: "NIT Empresa", value: batch.nitEmpresa, mono: true },
              { label: "Razón Social", value: batch.razonSocialEmpresa },
              { label: "Concepto", value: batch.concepto },
              { label: "Estado", value: batch.estadoLote, badge: true },
              { label: "Estado Final", value: batch.estadoFinal ? "Sí" : "No" },
              { label: "Total Ítems", value: String(batch.totalItems) },
              { label: "Monto Total", value: formatCurrency(batch.montoTotal), highlight: true },
              { label: "Monto Procesado", value: batch.montoProcesado ? formatCurrency(batch.montoProcesado) : "—" },
              { label: "Creado por", value: batch.nombreUsuarioCreador ?? `#${batch.idUsuarioCreador}` },
              { label: "Fecha Creación", value: formatDateTime(batch.fechaCreacion) },
              { label: "Fecha Procesamiento", value: batch.fechaProcesamiento ? formatDateTime(batch.fechaProcesamiento) : "—" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                {item.badge ? (
                  <StatusBadge status={item.value} />
                ) : (
                  <span className={`text-sm font-medium ${item.highlight ? "text-primary font-bold font-numeric" : item.mono ? "font-mono text-foreground" : "text-foreground"}`}>
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Status visual */}
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estado del Procesamiento</CardTitle>
            <CardDescription>Indicadores de ejecución del lote</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: "Pendiente",
                active: batch.estadoLote === "Pendiente",
                icon: Clock,
                color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
              },
              {
                label: "En Revisión",
                active: batch.estadoLote === "En Revision",
                icon: AlertCircle,
                color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
              },
              {
                label: "Aprobado",
                active: batch.estadoLote === "Aprobado",
                icon: CheckCircle2,
                color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
              },
              {
                label: "Procesado",
                active: batch.estadoLote === "Procesado",
                icon: CheckCircle2,
                color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              },
              {
                label: "Rechazado",
                active: batch.estadoLote === "Rechazado",
                icon: XCircle,
                color: "text-red-400 bg-red-500/10 border-red-500/20",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    s.active ? s.color : "border-border bg-secondary/20 opacity-40"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${s.active ? "" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${s.active ? "" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                  {s.active && (
                    <span className="ml-auto text-xs font-semibold">Estado Actual</span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <ApprovalDialog
        open={approveDialog}
        onOpenChange={setApproveDialog}
        title="Aprobar Lote de Pagos"
        description="Al aprobar, el lote será procesado automáticamente."
        entityLabel="Monto Total"
        entityValue={formatCurrency(batch.montoTotal)}
        onApprove={async () => approveMutation.mutate()}
        requireRejectComment={false}
        approveLabel="Confirmar Aprobación"
        variant="approve-only"
        loading={approveMutation.isPending}
      />

      {/* Reject Dialog */}
      <ApprovalDialog
        open={rejectDialog}
        onOpenChange={setRejectDialog}
        title="Rechazar Lote de Pagos"
        entityLabel="Lote"
        entityValue={`#${batch.idLote}`}
        onReject={async (motivo) => rejectMutation.mutate(motivo!)}
        requireRejectComment
        rejectLabel="Confirmar Rechazo"
        variant="reject-only"
        loading={rejectMutation.isPending}
      />
    </div>
  );
}
