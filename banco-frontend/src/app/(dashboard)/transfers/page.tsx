"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { transferService } from "@/services/transfer.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { useExport } from "@/hooks/useExport";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/enterprise/AdvancedDataTable";
import { SmartFilters } from "@/components/enterprise/SmartFilters";
import { ExportDropdown } from "@/components/enterprise/ExportDropdown";
import { ApprovalDialog } from "@/components/enterprise/ApprovalDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, maskAccountNumber } from "@/lib/utils";
import type { TransferenciaResponse } from "@/types/api.types";
import Link from "next/link";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TransfersPage() {
  const { user, isSupervisor } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({
    estado: "",
    aprobacion: "",
  });
  const [search, setSearch] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<TransferenciaResponse | null>(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: history, isLoading } = useQuery({
    queryKey: ["transfers", "history", page, filters.estado],
    queryFn: () =>
      transferService.getHistory({
        estado: filters.estado || undefined,
        page,
        size: 20,
      }),
    staleTime: 1000 * 30,
    refetchInterval: 60000,
  });

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ["transfers", "dashboard"],
    queryFn: () => transferService.getDashboard(),
    staleTime: 1000 * 60,
  });

  const { data: pending } = useQuery({
    queryKey: ["transfers", "pending"],
    queryFn: () => transferService.getPending(0, 5),
    enabled: isSupervisor(),
    refetchInterval: 30000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: () =>
      transferService.approve(selectedTransfer!.idTransferencia, user!.idUsuario),
    onSuccess: () => {
      notify({ title: "Transferencia aprobada", message: "Ejecutada exitosamente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setApproveDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo aprobar", type: "error" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (motivo: string) =>
      transferService.reject(selectedTransfer!.idTransferencia, user!.idUsuario, motivo),
    onSuccess: () => {
      notify({ title: "Transferencia rechazada", message: "Rechazo registrado", type: "warning" });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setRejectDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo rechazar", type: "error" }),
  });

  // ── Export ───────────────────────────────────────────────────────────────────

  const { handleExport } = useExport((history?.content ?? []) as unknown as Record<string, unknown>[], {
    filename: "transferencias",
    columns: [
      { key: "idTransferencia", header: "ID" },
      { key: "cuentaOrigen", header: "Cuenta Origen" },
      { key: "cuentaDestino", header: "Cuenta Destino" },
      { key: "monto", header: "Monto", format: (v) => formatCurrency(Number(v)) },
      { key: "estadoTransferencia", header: "Estado" },
      { key: "fechaCreacion", header: "Fecha", format: (v) => formatDateTime(String(v)) },
    ],
  });

  // ── Filtered data ─────────────────────────────────────────────────────────────

  const transfers = history?.content ?? [];
  const filtered = search
    ? transfers.filter(
        (t) =>
          t.cuentaOrigen.includes(search) ||
          t.cuentaDestino.includes(search) ||
          String(t.idTransferencia).includes(search)
      )
    : transfers;

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns: AdvancedColumn<TransferenciaResponse>[] = [
    {
      key: "idTransferencia",
      header: "ID",
      render: (v) => (
        <span className="font-mono text-xs text-muted-foreground">#{String(v)}</span>
      ),
    },
    {
      key: "cuentaOrigen",
      header: "Origen",
      render: (v) => (
        <span className="font-mono text-xs">{maskAccountNumber(String(v))}</span>
      ),
    },
    {
      key: "cuentaDestino",
      header: "Destino",
      render: (v) => (
        <span className="font-mono text-xs">{maskAccountNumber(String(v))}</span>
      ),
    },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      sortable: true,
      render: (v) => (
        <span className="font-numeric font-semibold text-sm">{formatCurrency(Number(v))}</span>
      ),
    },
    {
      key: "estadoTransferencia",
      header: "Estado",
      align: "center",
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: "requiereAprobacion",
      header: "Tipo",
      align: "center",
      render: (v) => (
        <span className={`text-xs font-medium ${v ? "text-yellow-400" : "text-emerald-400"}`}>
          {v ? "Aprobación" : "Automática"}
        </span>
      ),
    },
    {
      key: "fechaCreacion",
      header: "Fecha",
      sortable: true,
      render: (v) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(String(v))}
        </span>
      ),
    },
    {
      key: "idTransferencia",
      header: "Acciones",
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <Link href={`/transfers/${v}`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">Detalle</Button>
          </Link>
          {isSupervisor() && row.estadoTransferencia === "En Espera de Aprobacion" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-emerald-400"
                onClick={() => { setSelectedTransfer(row); setApproveDialog(true); }}
              >
                Aprobar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-red-400"
                onClick={() => { setSelectedTransfer(row); setRejectDialog(true); }}
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
        title="Transferencias"
        subtitle="Historial y gestión de transferencias bancarias"
        icon={ArrowLeftRight}
        actions={
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} />
            <Link href="/transfers/new">
              <Button variant="banking" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Transferencia
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Enviadas"
          value={dashboard?.totalEnviadas ?? 0}
          subtitle={dashboard ? formatCurrency(dashboard.montoTotalEnviado) : "—"}
          icon={ArrowLeftRight}
          color="blue"
          loading={loadingDash}
          index={0}
        />
        <StatCard
          title="Ejecutadas"
          value={dashboard?.totalEjecutadas ?? 0}
          icon={CheckCircle2}
          color="green"
          loading={loadingDash}
          index={1}
        />
        <StatCard
          title="En Espera"
          value={dashboard?.totalEnEspera ?? 0}
          subtitle={dashboard ? formatCurrency(dashboard.montoEnEspera ?? 0) : "—"}
          icon={Clock}
          color="orange"
          loading={loadingDash}
          index={2}
        />
        <StatCard
          title="Rechazadas / Vencidas"
          value={(dashboard?.totalRechazadas ?? 0) + (dashboard?.totalVencidas ?? 0)}
          icon={XCircle}
          color="red"
          loading={loadingDash}
          index={3}
        />
      </div>

      {/* Pending approvals banner for supervisors */}
      {isSupervisor() && pending && pending.content.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-yellow-500/15 text-yellow-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-yellow-400">
                      {pending.totalElements} transferencia{pending.totalElements !== 1 ? "s" : ""} pendiente{pending.totalElements !== 1 ? "s" : ""} de aprobación
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Monto total: {formatCurrency(
                        pending.content.reduce((s, t) => s + t.monto, 0)
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pending.content.slice(0, 2).map((t) => (
                    <div key={t.idTransferencia} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <span className="text-xs font-mono text-yellow-300">#{t.idTransferencia}</span>
                      <span className="text-xs font-numeric text-yellow-400 font-semibold">{formatCurrency(t.monto)}</span>
                      <Link href={`/transfers/${t.idTransferencia}`}>
                        <Button variant="outline" size="sm" className="text-xs h-6 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
                          Revisar
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters + Table */}
      <Card glass>
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">Historial de Transferencias</CardTitle>
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por cuenta o ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-3 pr-3 text-xs rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-52 font-mono"
                />
              </div>
            </div>

            <SmartFilters
              groups={[
                {
                  key: "estado",
                  label: "Estado",
                  options: [
                    { label: "Todos", value: "" },
                    { label: "Ejecutadas", value: "Ejecutada" },
                    { label: "Pendientes", value: "Pendiente" },
                    { label: "En Espera", value: "En Espera de Aprobacion" },
                    { label: "Rechazadas", value: "Rechazada" },
                    { label: "Vencidas", value: "Vencida" },
                  ],
                },
                {
                  key: "aprobacion",
                  label: "Tipo",
                  options: [
                    { label: "Todos", value: "" },
                    { label: "Automáticas", value: "auto" },
                    { label: "Con Aprobación", value: "approval" },
                  ],
                },
              ]}
              activeFilters={filters}
              onFilterChange={(key, value) => {
                setFilters((f) => ({ ...f, [key]: value }));
                setPage(0);
              }}
              onClearAll={() => {
                setFilters({ estado: "", aprobacion: "" });
                setPage(0);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <AdvancedDataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            emptyMessage="No hay transferencias en este período"
            totalElements={history?.totalElements}
            page={page}
            pageSize={20}
            onPageChange={setPage}
            rowKey={(row) => String(row.idTransferencia)}
          />
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <ApprovalDialog
        open={approveDialog}
        onOpenChange={setApproveDialog}
        title="Aprobar Transferencia"
        description="Los fondos serán transferidos inmediatamente."
        entityLabel="Monto"
        entityValue={selectedTransfer ? formatCurrency(selectedTransfer.monto) : ""}
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
        title="Rechazar Transferencia"
        entityLabel="Monto"
        entityValue={selectedTransfer ? formatCurrency(selectedTransfer.monto) : ""}
        onReject={async (motivo) => rejectMutation.mutate(motivo!)}
        requireRejectComment
        rejectLabel="Confirmar Rechazo"
        variant="reject-only"
        loading={rejectMutation.isPending}
      />
    </div>
  );
}
