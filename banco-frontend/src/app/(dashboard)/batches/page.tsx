"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileStack,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { batchService } from "@/services/batch.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/enterprise/AdvancedDataTable";
import { EnterpriseModal } from "@/components/enterprise/EnterpriseModal";
import { ApprovalDialog } from "@/components/enterprise/ApprovalDialog";
import { MetricGrid } from "@/components/enterprise/MetricGrid";
import { FinancialChartCard } from "@/components/enterprise/FinancialChartCard";
import { DonutChartWidget } from "@/components/shared/charts/DonutChartWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { LoteTransferenciaResponse } from "@/types/api.types";
import type { ItemLoteRequest } from "@/services/batch.service";
import Link from "next/link";

// ── Batch item row editor ─────────────────────────────────────────────────────

interface ItemRow extends ItemLoteRequest {
  _id: string;
  _error?: string;
}

function newItem(): ItemRow {
  return {
    _id: crypto.randomUUID(),
    cuentaOrigen: "",
    cuentaDestino: "",
    monto: 0,
    concepto: "",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BatchesPage() {
  const { user, isSupervisor, isAnalyst } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [newBatchModal, setNewBatchModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<LoteTransferenciaResponse | null>(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);

  // New batch form
  const [batchForm, setBatchForm] = useState({ nitEmpresa: "", concepto: "" });
  const [items, setItems] = useState<ItemRow[]>([newItem()]);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["batches", page],
    queryFn: () => batchService.getAll(page, 20),
    staleTime: 1000 * 30,
  });

  const { data: metrics } = useQuery({
    queryKey: ["batches", "metrics"],
    queryFn: () => batchService.getMetrics(),
    staleTime: 1000 * 60,
  });

  const batches = data?.content ?? [];

  const stats = {
    total: data?.totalElements ?? 0,
    pendientes: batches.filter((b) => b.estadoLote === "Pendiente" || b.estadoLote === "En Revision").length,
    procesados: batches.filter((b) => b.estadoLote === "Procesado").length,
    rechazados: batches.filter((b) => b.estadoLote === "Rechazado").length,
    montoTotal: batches.reduce((s, b) => s + b.montoTotal, 0),
  };

  const donutData = [
    { name: "Pendiente", value: batches.filter((b) => b.estadoLote === "Pendiente").length, color: "#f59e0b" },
    { name: "En Revisión", value: batches.filter((b) => b.estadoLote === "En Revision").length, color: "#3b82f6" },
    { name: "Aprobado", value: batches.filter((b) => b.estadoLote === "Aprobado").length, color: "#06b6d4" },
    { name: "Procesado", value: stats.procesados, color: "#10b981" },
    { name: "Rechazado", value: stats.rechazados, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      batchService.crear({
        nitEmpresa: batchForm.nitEmpresa,
        concepto: batchForm.concepto,
        idUsuarioCreador: user!.idUsuario,
        transferencias: items.map(({ _id, _error, ...item }) => item),
      }),
    onSuccess: () => {
      notify({ title: "Lote creado", message: "El lote de pagos fue registrado exitosamente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setNewBatchModal(false);
      setBatchForm({ nitEmpresa: "", concepto: "" });
      setItems([newItem()]);
    },
    onError: () => notify({ title: "Error", message: "No se pudo crear el lote", type: "error" }),
  });

  const approveMutation = useMutation({
    mutationFn: () => batchService.procesar(selectedBatch!.idLote, user!.idUsuario),
    onSuccess: () => {
      notify({ title: "Lote procesado", message: "El lote fue aprobado y procesado exitosamente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setApproveDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo procesar el lote", type: "error" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (motivo: string) =>
      batchService.rechazar(selectedBatch!.idLote, user!.idUsuario, motivo),
    onSuccess: () => {
      notify({ title: "Lote rechazado", message: "El lote fue rechazado", type: "warning" });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      setRejectDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo rechazar el lote", type: "error" }),
  });

  // ── Item helpers ─────────────────────────────────────────────────────────────

  const updateItem = (id: string, field: keyof ItemLoteRequest, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item._id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item._id !== id));
  };

  const totalBatchAmount = items.reduce((s, i) => s + (Number(i.monto) || 0), 0);
  const isFormValid =
    batchForm.nitEmpresa &&
    batchForm.concepto &&
    items.length > 0 &&
    items.every((i) => i.cuentaOrigen && i.cuentaDestino && Number(i.monto) > 0);

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns: AdvancedColumn<LoteTransferenciaResponse>[] = [
    {
      key: "idLote",
      header: "ID",
      render: (v) => <span className="font-mono text-xs text-muted-foreground">#{String(v)}</span>,
    },
    {
      key: "nitEmpresa",
      header: "NIT Empresa",
      render: (v) => <span className="font-mono text-xs">{String(v)}</span>,
    },
    { key: "concepto", header: "Concepto" },
    {
      key: "totalItems",
      header: "Ítems",
      align: "center",
      render: (v, row) => (
        <div className="text-center">
          <span className="font-numeric text-sm">{String(v)}</span>
          {row.itemsExitosos != null && (
            <p className="text-[10px] text-emerald-400">{row.itemsExitosos} exitosos</p>
          )}
        </div>
      ),
    },
    {
      key: "montoTotal",
      header: "Monto Total",
      align: "right",
      render: (v) => (
        <span className="font-numeric font-semibold text-sm">{formatCurrency(Number(v))}</span>
      ),
    },
    {
      key: "estadoLote",
      header: "Estado",
      align: "center",
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: "fechaCreacion",
      header: "Creación",
      render: (v) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(String(v))}</span>
      ),
    },
    {
      key: "idLote",
      header: "Acciones",
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <Link href={`/batches/${v}`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">Detalle</Button>
          </Link>
          {isSupervisor() && (row.estadoLote === "Pendiente" || row.estadoLote === "En Revision") && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-emerald-400"
                onClick={() => { setSelectedBatch(row); setApproveDialog(true); }}
              >
                Aprobar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-red-400"
                onClick={() => { setSelectedBatch(row); setRejectDialog(true); }}
              >
                Rechazar
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos Masivos"
        subtitle="Lotes de transferencias y nómina empresarial"
        icon={FileStack}
        actions={
          <Button
            variant="banking"
            size="sm"
            className="gap-2"
            onClick={() => setNewBatchModal(true)}
          >
            <Plus className="w-4 h-4" />
            Nuevo Lote
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Lotes" value={stats.total} icon={FileStack} color="blue" loading={isLoading} index={0} />
        <StatCard title="Pendientes" value={stats.pendientes} icon={Clock} color="orange" loading={isLoading} index={1} />
        <StatCard title="Procesados" value={stats.procesados} icon={CheckCircle2} color="green" loading={isLoading} index={2} />
        <StatCard title="Monto Total" value={formatCurrency(stats.montoTotal)} icon={BarChart3} color="cyan" loading={isLoading} index={3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FinancialChartCard title="Distribución por Estado" className="xl:col-span-1">
          {donutData.length > 0 ? (
            <DonutChartWidget data={donutData} height={160} />
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <BarChart3 className="w-8 h-8 opacity-20" />
            </div>
          )}
        </FinancialChartCard>

        <Card glass className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Métricas de Procesamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricGrid
              metrics={[
                { label: "Total Ítems Procesados", value: metrics?.totalItemsProcesados ?? 0, color: "green" },
                { label: "Ítems Fallidos", value: metrics?.totalItemsFallidos ?? 0, color: "red" },
                { label: "Monto Procesado", value: metrics ? formatCurrency(metrics.montoTotalProcesado) : "—", color: "blue" },
                { label: "Tasa Éxito Lotes", value: metrics ? `${metrics.tasaExitoLotes.toFixed(1)}%` : "—", color: "cyan" },
                { label: "Tasa Éxito Ítems", value: metrics ? `${metrics.tasaExitoItems.toFixed(1)}%` : "—", color: "purple" },
                { label: "Tasa Rechazo", value: metrics ? `${metrics.tasaRechazoLotes.toFixed(1)}%` : "—", color: "orange" },
              ]}
              columns={3}
            />
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historial de Lotes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AdvancedDataTable
            columns={columns}
            data={batches}
            loading={isLoading}
            emptyMessage="No hay lotes de pagos registrados"
            totalElements={data?.totalElements}
            page={page}
            pageSize={20}
            onPageChange={setPage}
            rowKey={(row) => String(row.idLote)}
          />
        </CardContent>
      </Card>

      {/* ── New Batch Modal ─────────────────────────────────────────────────── */}
      <EnterpriseModal
        open={newBatchModal}
        onOpenChange={setNewBatchModal}
        title="Crear Lote de Pagos"
        description="Configura el lote y agrega los beneficiarios"
        size="xl"
      >
        <div className="space-y-5">
          {/* Batch header */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">NIT Empresa</label>
              <input
                type="text"
                placeholder="900123456-1"
                value={batchForm.nitEmpresa}
                onChange={(e) => setBatchForm((f) => ({ ...f, nitEmpresa: e.target.value }))}
                className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Concepto del Lote</label>
              <input
                type="text"
                placeholder="Nómina Enero 2025"
                value={batchForm.concepto}
                onChange={(e) => setBatchForm((f) => ({ ...f, concepto: e.target.value }))}
                className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Items table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Beneficiarios ({items.length})
              </label>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1 h-7"
                onClick={() => setItems((prev) => [...prev, newItem()])}
              >
                <Plus className="w-3 h-3" /> Agregar fila
              </Button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/60 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">#</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Cuenta Origen</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Cuenta Destino</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Monto</th>
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Concepto</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, i) => (
                      <tr key={item._id} className="bg-card">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="001-000000-01"
                            value={item.cuentaOrigen}
                            onChange={(e) => updateItem(item._id, "cuentaOrigen", e.target.value)}
                            className="w-32 h-7 px-2 rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="001-000000-02"
                            value={item.cuentaDestino}
                            onChange={(e) => updateItem(item._id, "cuentaDestino", e.target.value)}
                            className="w-32 h-7 px-2 rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={item.monto || ""}
                            onChange={(e) => updateItem(item._id, "monto", parseFloat(e.target.value) || 0)}
                            className="w-28 h-7 px-2 rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-numeric text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="Salario"
                            value={item.concepto ?? ""}
                            onChange={(e) => updateItem(item._id, "concepto", e.target.value)}
                            className="w-28 h-7 px-2 rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeItem(item._id)}
                            disabled={items.length === 1}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Ítems</p>
                <p className="text-sm font-bold font-numeric">{items.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto Total</p>
                <p className="text-sm font-bold font-numeric text-primary">
                  {formatCurrency(totalBatchAmount)}
                </p>
              </div>
            </div>
            <Button
              variant="banking"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!isFormValid}
              className="gap-2"
            >
              <FileStack className="w-4 h-4" />
              Crear Lote
            </Button>
          </div>
        </div>
      </EnterpriseModal>

      {/* Approve Dialog */}
      <ApprovalDialog
        open={approveDialog}
        onOpenChange={setApproveDialog}
        title="Aprobar Lote de Pagos"
        description="Al aprobar, el lote será procesado automáticamente."
        entityLabel="Lote"
        entityValue={`#${selectedBatch?.idLote} — ${formatCurrency(selectedBatch?.montoTotal ?? 0)}`}
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
        entityValue={`#${selectedBatch?.idLote}`}
        onReject={async (motivo) => rejectMutation.mutate(motivo!)}
        requireRejectComment
        rejectLabel="Confirmar Rechazo"
        variant="reject-only"
        loading={rejectMutation.isPending}
      />
    </div>
  );
}
