"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Landmark,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";
import { loanService } from "@/services/loan.service";
import { accountService } from "@/services/account.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/enterprise/AdvancedDataTable";
import { ApprovalDialog } from "@/components/enterprise/ApprovalDialog";
import { EnterpriseModal } from "@/components/enterprise/EnterpriseModal";
import { MetricGrid, type MetricItem } from "@/components/enterprise/MetricGrid";
import { FinancialChartCard } from "@/components/enterprise/FinancialChartCard";
import { DonutChartWidget } from "@/components/shared/charts/DonutChartWidget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PrestamoResponse } from "@/types/api.types";
import Link from "next/link";

// ── Loan type options ─────────────────────────────────────────────────────────

const LOAN_TYPES = [
  { label: "Personal", value: "Personal" },
  { label: "Hipotecario", value: "Hipotecario" },
  { label: "Vehicular", value: "Vehicular" },
  { label: "Empresarial", value: "Empresarial" },
  { label: "Educativo", value: "Educativo" },
  { label: "Libre Inversión", value: "Libre Inversion" },
];

const STATUS_FILTERS = [
  { label: "Todos", value: "" },
  { label: "Solicitados", value: "Solicitado" },
  { label: "En Revisión", value: "En Revision" },
  { label: "Aprobados", value: "Aprobado" },
  { label: "Desembolsados", value: "Desembolsado" },
  { label: "Rechazados", value: "Rechazado" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoansPage() {
  const { user, isAnalyst, isSupervisor, isClient } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<PrestamoResponse | null>(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [disbursDialog, setDisbursDialog] = useState(false);
  const [newLoanModal, setNewLoanModal] = useState(false);

  // Approve form state
  const [approveForm, setApproveForm] = useState({
    montoAprobado: "",
    tasaInteres: "",
    plazoMeses: "",
    cuentaDestinoDesembolso: "",
  });

  // New loan form state
  const [newLoanForm, setNewLoanForm] = useState({
    tipoPrestamo: "Personal",
    montoSolicitado: "",
  });

  // Disburse form state
  const [disbursAccount, setDisbursAccount] = useState("");

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["loans", page, statusFilter],
    queryFn: () => loanService.getAll(page, 20),
    staleTime: 1000 * 30,
  });

  const { data: accountDash } = useQuery({
    queryKey: ["accounts", "dashboard"],
    queryFn: () => accountService.getDashboard(),
    enabled: isSupervisor(),
  });

  const loans = data?.content ?? [];

  // Stats
  const stats = {
    total: data?.totalElements ?? 0,
    solicitados: loans.filter((l) => l.estadoPrestamo === "Solicitado").length,
    enRevision: loans.filter((l) => l.estadoPrestamo === "En Revision").length,
    aprobados: loans.filter((l) => l.estadoPrestamo === "Aprobado").length,
    desembolsados: loans.filter((l) => l.estadoPrestamo === "Desembolsado").length,
    rechazados: loans.filter((l) => l.estadoPrestamo === "Rechazado").length,
    montoTotal: loans.reduce((s, l) => s + (l.montoAprobado ?? l.montoSolicitado), 0),
  };

  const donutData = [
    { name: "Solicitados", value: stats.solicitados, color: "#f59e0b" },
    { name: "En Revisión", value: stats.enRevision, color: "#3b82f6" },
    { name: "Aprobados", value: stats.aprobados, color: "#06b6d4" },
    { name: "Desembolsados", value: stats.desembolsados, color: "#8b5cf6" },
    { name: "Rechazados", value: stats.rechazados, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: () =>
      loanService.aprobar(selectedLoan!.idPrestamo, {
        montoAprobado: parseFloat(approveForm.montoAprobado),
        tasaInteres: parseFloat(approveForm.tasaInteres),
        plazoMeses: parseInt(approveForm.plazoMeses),
        idAnalista: user!.idUsuario,
        cuentaDestinoDesembolso: approveForm.cuentaDestinoDesembolso,
      }),
    onSuccess: () => {
      notify({ title: "Préstamo aprobado", message: "El préstamo fue aprobado exitosamente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setApproveDialog(false);
      setSelectedLoan(null);
    },
    onError: () => notify({ title: "Error", message: "No se pudo aprobar el préstamo", type: "error" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (motivo: string) =>
      loanService.rechazar(selectedLoan!.idPrestamo, user!.idUsuario, motivo),
    onSuccess: () => {
      notify({ title: "Préstamo rechazado", message: "El préstamo fue rechazado", type: "warning" });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setRejectDialog(false);
      setSelectedLoan(null);
    },
    onError: () => notify({ title: "Error", message: "No se pudo rechazar el préstamo", type: "error" }),
  });

  const disbursMutation = useMutation({
    mutationFn: () =>
      loanService.desembolsar(selectedLoan!.idPrestamo, {
        idSupervisor: user!.idUsuario,
      }),
    onSuccess: () => {
      notify({ title: "Préstamo desembolsado", message: "Los fondos fueron transferidos exitosamente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setDisbursDialog(false);
      setSelectedLoan(null);
    },
    onError: () => notify({ title: "Error", message: "No se pudo desembolsar el préstamo", type: "error" }),
  });

  const newLoanMutation = useMutation({
    mutationFn: () =>
      loanService.solicitar({
        nombreTipoPrestamo: newLoanForm.tipoPrestamo,
        idClienteSolicitante: user!.idIdentificacion,
        tipoCliente: user!.rol.includes("EMPRESA") ? "EMPRESA" : "PERSONA_NATURAL",
        montoSolicitado: parseFloat(newLoanForm.montoSolicitado),
        idUsuarioSolicitante: user!.idUsuario,
      }),
    onSuccess: () => {
      notify({ title: "Solicitud enviada", message: "Tu solicitud de préstamo fue registrada", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setNewLoanModal(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo registrar la solicitud", type: "error" }),
  });

  // ── Filtered loans ────────────────────────────────────────────────────────────

  const filtered = statusFilter
    ? loans.filter((l) => l.estadoPrestamo === statusFilter)
    : loans;

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns: AdvancedColumn<PrestamoResponse>[] = [
    {
      key: "idPrestamo",
      header: "ID",
      render: (v) => (
        <span className="font-mono text-xs text-muted-foreground">#{String(v)}</span>
      ),
    },
    { key: "tipoPrestamo", header: "Tipo", sortable: true },
    {
      key: "idClienteSolicitante",
      header: "Cliente",
      render: (v) => <span className="font-mono text-xs">{String(v)}</span>,
    },
    {
      key: "montoSolicitado",
      header: "Solicitado",
      align: "right",
      render: (v) => (
        <span className="font-numeric text-sm">{formatCurrency(Number(v))}</span>
      ),
    },
    {
      key: "montoAprobado",
      header: "Aprobado",
      align: "right",
      render: (v) =>
        v ? (
          <span className="font-numeric text-sm text-emerald-400">
            {formatCurrency(Number(v))}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "tasaInteres",
      header: "Tasa",
      align: "center",
      render: (v) =>
        v ? (
          <span className="font-numeric text-xs">{Number(v).toFixed(2)}%</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "estadoPrestamo",
      header: "Estado",
      align: "center",
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: "fechaSolicitud",
      header: "Solicitud",
      render: (v) => (
        <span className="text-xs text-muted-foreground">{formatDate(String(v))}</span>
      ),
    },
    {
      key: "idPrestamo",
      header: "Acciones",
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <Link href={`/loans/${v}`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Detalle
            </Button>
          </Link>
          {isAnalyst() && (row.estadoPrestamo === "Solicitado" || row.estadoPrestamo === "En Revision") && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-emerald-400 hover:text-emerald-300"
                onClick={() => { setSelectedLoan(row); setApproveDialog(true); }}
              >
                Aprobar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-red-400 hover:text-red-300"
                onClick={() => { setSelectedLoan(row); setRejectDialog(true); }}
              >
                Rechazar
              </Button>
            </>
          )}
          {isSupervisor() && row.estadoPrestamo === "Aprobado" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-purple-400 hover:text-purple-300"
              onClick={() => { setSelectedLoan(row); setDisbursDialog(true); }}
            >
              Desembolsar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Préstamos"
        subtitle="Solicitudes, aprobaciones y desembolsos"
        icon={Landmark}
        actions={
          <Button
            variant="banking"
            size="sm"
            className="gap-2"
            onClick={() => setNewLoanModal(true)}
          >
            <Plus className="w-4 h-4" />
            Solicitar Préstamo
          </Button>
        }
      />

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Préstamos"
          value={stats.total}
          icon={Landmark}
          color="blue"
          loading={isLoading}
          index={0}
        />
        <StatCard
          title="Pendientes Revisión"
          value={stats.solicitados + stats.enRevision}
          icon={Clock}
          color="orange"
          loading={isLoading}
          index={1}
        />
        <StatCard
          title="Aprobados"
          value={stats.aprobados}
          icon={CheckCircle2}
          color="green"
          loading={isLoading}
          index={2}
        />
        <StatCard
          title="Desembolsados"
          value={stats.desembolsados}
          subtitle={formatCurrency(stats.montoTotal)}
          icon={DollarSign}
          color="cyan"
          loading={isLoading}
          index={3}
        />
      </div>

      {/* ── Charts + metrics ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <FinancialChartCard
          title="Distribución por Estado"
          description="Préstamos activos"
          className="xl:col-span-1"
        >
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
            <CardTitle className="text-base">Métricas de Cartera</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricGrid
              metrics={[
                { label: "Monto Total Cartera", value: formatCurrency(stats.montoTotal), color: "blue" },
                { label: "Tasa Aprobación", value: stats.total > 0 ? `${Math.round((stats.aprobados + stats.desembolsados) / stats.total * 100)}%` : "—", color: "green" },
                { label: "Tasa Rechazo", value: stats.total > 0 ? `${Math.round(stats.rechazados / stats.total * 100)}%` : "—", color: "red" },
                { label: "En Proceso", value: stats.solicitados + stats.enRevision, color: "orange" },
                { label: "Aprobados Pendientes", value: stats.aprobados, color: "cyan" },
                { label: "Desembolsados", value: stats.desembolsados, color: "purple" },
              ]}
              columns={3}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Card glass>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">Historial de Préstamos</CardTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setStatusFilter(f.value); setPage(0); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    statusFilter === f.value
                      ? "bg-primary text-white"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <AdvancedDataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            emptyMessage="No hay préstamos registrados"
            totalElements={data?.totalElements}
            page={page}
            pageSize={20}
            onPageChange={setPage}
            rowKey={(row) => String(row.idPrestamo)}
          />
        </CardContent>
      </Card>

      {/* ── New Loan Modal ──────────────────────────────────────────────────── */}
      <EnterpriseModal
        open={newLoanModal}
        onOpenChange={setNewLoanModal}
        title="Solicitar Préstamo"
        description="Completa los datos para tu solicitud"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de Préstamo</label>
            <select
              value={newLoanForm.tipoPrestamo}
              onChange={(e) => setNewLoanForm((f) => ({ ...f, tipoPrestamo: e.target.value }))}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {LOAN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Monto Solicitado</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={newLoanForm.montoSolicitado}
              onChange={(e) => setNewLoanForm((f) => ({ ...f, montoSolicitado: e.target.value }))}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <Button
            className="w-full"
            variant="banking"
            onClick={() => newLoanMutation.mutate()}
            loading={newLoanMutation.isPending}
            disabled={!newLoanForm.montoSolicitado || parseFloat(newLoanForm.montoSolicitado) <= 0}
          >
            Enviar Solicitud
          </Button>
        </div>
      </EnterpriseModal>

      {/* ── Approve Dialog ──────────────────────────────────────────────────── */}
      <EnterpriseModal
        open={approveDialog}
        onOpenChange={setApproveDialog}
        title="Aprobar Préstamo"
        description={`Préstamo #${selectedLoan?.idPrestamo} — Solicitado: ${selectedLoan ? formatCurrency(selectedLoan.montoSolicitado) : ""}`}
        size="sm"
      >
        <div className="space-y-4">
          {[
            { key: "montoAprobado", label: "Monto Aprobado", type: "number", placeholder: "0.00" },
            { key: "tasaInteres", label: "Tasa de Interés (%)", type: "number", placeholder: "0.00" },
            { key: "plazoMeses", label: "Plazo (meses)", type: "number", placeholder: "12" },
            { key: "cuentaDestinoDesembolso", label: "Cuenta Destino Desembolso", type: "text", placeholder: "001-000000-00" },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={approveForm[field.key as keyof typeof approveForm]}
                onChange={(e) => setApproveForm((f) => ({ ...f, [field.key]: e.target.value }))}
                className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          ))}
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            onClick={() => approveMutation.mutate()}
            loading={approveMutation.isPending}
            disabled={!approveForm.montoAprobado || !approveForm.tasaInteres || !approveForm.plazoMeses || !approveForm.cuentaDestinoDesembolso}
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar Aprobación
          </Button>
        </div>
      </EnterpriseModal>

      {/* ── Reject Dialog ───────────────────────────────────────────────────── */}
      <ApprovalDialog
        open={rejectDialog}
        onOpenChange={setRejectDialog}
        title="Rechazar Préstamo"
        description="Indica el motivo del rechazo."
        entityLabel="Préstamo"
        entityValue={`#${selectedLoan?.idPrestamo}`}
        onReject={async (motivo) => rejectMutation.mutate(motivo!)}
        requireRejectComment
        rejectLabel="Confirmar Rechazo"
        variant="reject-only"
        loading={rejectMutation.isPending}
      />

      {/* ── Disburse Dialog ─────────────────────────────────────────────────── */}
      <EnterpriseModal
        open={disbursDialog}
        onOpenChange={setDisbursDialog}
        title="Desembolsar Préstamo"
        description={`Monto aprobado: ${selectedLoan?.montoAprobado ? formatCurrency(selectedLoan.montoAprobado) : "—"}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El monto aprobado será transferido a la cuenta destino registrada en la aprobación del préstamo.
          </p>
          <Button
            className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2"
            onClick={() => disbursMutation.mutate()}
            loading={disbursMutation.isPending}
          >
            <DollarSign className="w-4 h-4" />
            Confirmar Desembolso
          </Button>
        </div>
      </EnterpriseModal>
    </div>
  );
}
