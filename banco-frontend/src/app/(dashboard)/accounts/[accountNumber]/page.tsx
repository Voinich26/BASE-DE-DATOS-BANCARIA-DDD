"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Unlock,
  XCircle,
  RefreshCw,
  TrendingUp,
  Activity,
} from "lucide-react";
import { accountService } from "@/services/account.service";
import { transferService } from "@/services/transfer.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { FinancialHero } from "@/components/enterprise/FinancialHero";
import { MetricGrid, type MetricItem } from "@/components/enterprise/MetricGrid";
import { TimelineEnterprise, type TimelineStep } from "@/components/enterprise/TimelineEnterprise";
import { EnterpriseModal } from "@/components/enterprise/EnterpriseModal";
import { ApprovalDialog } from "@/components/enterprise/ApprovalDialog";
import { FinancialChartCard } from "@/components/enterprise/FinancialChartCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AreaChartWidget } from "@/components/shared/charts/AreaChartWidget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime, maskAccountNumber } from "@/lib/utils";
import Link from "next/link";

// ── Quick action modal types ──────────────────────────────────────────────────

type ActionType = "deposit" | "withdraw" | "block" | "cancel" | "reactivate" | null;

// ── Simulated chart data ──────────────────────────────────────────────────────

function buildMovementData(transfers: { monto: number; fechaCreacion: string }[]) {
  const months: Record<string, number> = {};
  transfers.forEach((t) => {
    const d = new Date(t.fechaCreacion);
    const key = d.toLocaleDateString("es-CO", { month: "short" });
    months[key] = (months[key] ?? 0) + t.monto;
  });
  return Object.entries(months).map(([mes, monto]) => ({ mes, monto }));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountDetailPage() {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const router = useRouter();
  const { user, isEmployee } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "transfers" | "timeline">("overview");
  const [actionModal, setActionModal] = useState<ActionType>(null);
  const [blockDialog, setBlockDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: account, isLoading } = useQuery({
    queryKey: ["account", accountNumber],
    queryFn: () => accountService.getByNumber(accountNumber),
    enabled: !!accountNumber,
  });

  const { data: transfers, isLoading: loadingTransfers } = useQuery({
    queryKey: ["account-transfers", accountNumber],
    queryFn: () =>
      transferService.getHistory({
        cuentaOrigen: accountNumber,
        page: 0,
        size: 20,
      }),
    enabled: !!accountNumber,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const depositMutation = useMutation({
    mutationFn: () =>
      accountService.deposit({
        numeroCuenta: accountNumber,
        monto: parseFloat(amount),
        idUsuario: user!.idUsuario,
        concepto: concept || "Depósito",
      }),
    onSuccess: () => {
      notify({ title: "Depósito exitoso", message: `Se depositaron ${formatCurrency(parseFloat(amount))}`, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["account", accountNumber] });
      setActionModal(null);
      setAmount("");
      setConcept("");
    },
    onError: () => notify({ title: "Error", message: "No se pudo procesar el depósito", type: "error" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: () =>
      accountService.withdraw({
        numeroCuenta: accountNumber,
        monto: parseFloat(amount),
        idUsuario: user!.idUsuario,
        concepto: concept || "Retiro",
      }),
    onSuccess: () => {
      notify({ title: "Retiro exitoso", message: `Se retiraron ${formatCurrency(parseFloat(amount))}`, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["account", accountNumber] });
      setActionModal(null);
      setAmount("");
      setConcept("");
    },
    onError: () => notify({ title: "Error", message: "Saldo insuficiente o cuenta bloqueada", type: "error" }),
  });

  const blockMutation = useMutation({
    mutationFn: (motivo: string) =>
      accountService.block(accountNumber, user!.idUsuario, motivo),
    onSuccess: () => {
      notify({ title: "Cuenta bloqueada", message: "La cuenta fue bloqueada exitosamente", type: "warning" });
      queryClient.invalidateQueries({ queryKey: ["account", accountNumber] });
      setBlockDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo bloquear la cuenta", type: "error" }),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => accountService.reactivate(accountNumber, user!.idUsuario),
    onSuccess: () => {
      notify({ title: "Cuenta reactivada", message: "La cuenta fue reactivada exitosamente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["account", accountNumber] });
    },
    onError: () => notify({ title: "Error", message: "No se pudo reactivar la cuenta", type: "error" }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => accountService.cancel(accountNumber, user!.idUsuario),
    onSuccess: () => {
      notify({ title: "Cuenta cancelada", message: "La cuenta fue cancelada", type: "warning" });
      queryClient.invalidateQueries({ queryKey: ["account", accountNumber] });
      setCancelDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo cancelar la cuenta", type: "error" }),
  });

  // ── Derived data ─────────────────────────────────────────────────────────────

  const recentTransfers = transfers?.content ?? [];
  const chartData = buildMovementData(recentTransfers);

  const metrics: MetricItem[] = account
    ? [
        {
          label: "Saldo Actual",
          value: formatCurrency(account.saldoActual, account.codigoIsoMoneda),
          color: "blue",
        },
        {
          label: "Tipo de Cuenta",
          value: account.tipoCuenta,
          color: "cyan",
        },
        {
          label: "Moneda",
          value: account.codigoIsoMoneda,
          color: "purple",
        },
        {
          label: "Transferencias",
          value: transfers?.totalElements ?? 0,
          subValue: "en historial",
          color: "green",
        },
      ]
    : [];

  const timelineSteps: TimelineStep[] = account
    ? [
        {
          id: "apertura",
          label: "Cuenta Abierta",
          description: `Tipo: ${account.tipoCuenta}`,
          timestamp: account.fechaApertura,
          status: "completed",
        },
        {
          id: "activa",
          label: "Cuenta Activa",
          description: "Operaciones habilitadas",
          status: account.estadoCuenta === "Activa" ? "current" : "completed",
        },
        ...(account.estadoCuenta === "Bloqueada"
          ? [
              {
                id: "bloqueada",
                label: "Cuenta Bloqueada",
                description: "Operaciones suspendidas temporalmente",
                status: "current" as const,
              },
            ]
          : []),
        ...(account.estadoCuenta === "Cancelada"
          ? [
              {
                id: "cancelada",
                label: "Cuenta Cancelada",
                description: "Cuenta cerrada definitivamente",
                status: "rejected" as const,
              },
            ]
          : []),
      ]
    : [];

  const isEmp = isEmployee();
  const isActive = account?.estadoCuenta === "Activa";
  const isBlocked = account?.estadoCuenta === "Bloqueada";

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <XCircle className="w-12 h-12 opacity-30 mb-3" />
        <p className="text-lg font-medium">Cuenta no encontrada</p>
        <Button variant="ghost" className="mt-4 gap-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Back + header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Detalle de Cuenta</h1>
          <p className="text-xs text-muted-foreground font-mono">{accountNumber}</p>
        </div>
      </div>

      {/* ── Financial Hero ─────────────────────────────────────────────────── */}
      <FinancialHero
        accountNumber={account.numeroCuenta}
        accountType={account.tipoCuenta}
        balance={account.saldoActual}
        currency={account.codigoIsoMoneda}
        status={account.estadoCuenta}
        ownerId={account.idTitular}
        openDate={formatDate(account.fechaApertura)}
      />

      {/* ── Metrics ────────────────────────────────────────────────────────── */}
      <MetricGrid metrics={metrics} columns={4} />

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      <Card glass>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {isActive && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => setActionModal("deposit")}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Depositar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                  onClick={() => setActionModal("withdraw")}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Retirar
                </Button>
                <Link href={`/transfers/new?from=${accountNumber}`}>
                  <Button variant="banking" size="sm" className="gap-2">
                    <ArrowLeftRight className="w-4 h-4" />
                    Transferir
                  </Button>
                </Link>
              </>
            )}
            {isEmp && isActive && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                onClick={() => setBlockDialog(true)}
              >
                <Lock className="w-4 h-4" />
                Bloquear
              </Button>
            )}
            {isEmp && isBlocked && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => reactivateMutation.mutate()}
                loading={reactivateMutation.isPending}
              >
                <Unlock className="w-4 h-4" />
                Reactivar
              </Button>
            )}
            {isEmp && !account.estadoCuenta.includes("Cancelada") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                onClick={() => setCancelDialog(true)}
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl w-fit">
        {(["overview", "transfers", "timeline"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "overview" ? "Resumen" : tab === "transfers" ? "Transferencias" : "Timeline"}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-4"
        >
          <FinancialChartCard
            title="Movimientos Recientes"
            description="Volumen de transferencias por mes"
            trend={chartData.length > 1 ? 12 : undefined}
          >
            {chartData.length > 0 ? (
              <AreaChartWidget
                data={chartData}
                xKey="mes"
                yKey="monto"
                height={200}
                formatY={(v) => `$${(v / 1000000).toFixed(1)}M`}
                formatTooltip={(v) => formatCurrency(v)}
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <div className="text-center">
                  <Activity className="w-8 h-8 opacity-30 mx-auto mb-2" />
                  <p className="text-sm">Sin movimientos registrados</p>
                </div>
              </div>
            )}
          </FinancialChartCard>

          <Card glass>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información de Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Número de Cuenta", value: account.numeroCuenta, mono: true },
                { label: "Tipo de Cuenta", value: account.tipoCuenta },
                { label: "Titular (ID)", value: account.idTitular, mono: true },
                { label: "Tipo Titular", value: account.tipoTitular },
                { label: "Moneda", value: `${account.moneda} (${account.codigoIsoMoneda})` },
                { label: "Estado", value: account.estadoCuenta, badge: true },
                { label: "Fecha Apertura", value: formatDate(account.fechaApertura) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {item.badge ? (
                    <StatusBadge status={item.value} />
                  ) : (
                    <span className={`text-sm font-medium text-foreground ${item.mono ? "font-mono" : ""}`}>
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "transfers" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card glass>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Historial de Transferencias</CardTitle>
                <Link href={`/transfers?cuentaOrigen=${accountNumber}`}>
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Ver todas <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingTransfers ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : recentTransfers.length > 0 ? (
                <div className="space-y-2">
                  {recentTransfers.map((t) => (
                    <Link
                      key={t.idTransferencia}
                      href={`/transfers/${t.idTransferencia}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                        t.estadoTransferencia === "Ejecutada"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : t.estadoTransferencia === "Rechazada" || t.estadoTransferencia === "Vencida"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-foreground truncate">
                          → {maskAccountNumber(t.cuentaDestino)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(t.fechaCreacion)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold font-numeric">{formatCurrency(t.monto)}</p>
                        <StatusBadge status={t.estadoTransferencia} className="text-[10px]" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <ArrowLeftRight className="w-8 h-8 opacity-30 mx-auto mb-2" />
                  <p className="text-sm">Sin transferencias registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {activeTab === "timeline" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card glass>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Timeline de la Cuenta</CardTitle>
              <CardDescription>Historial de estados y eventos</CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineEnterprise steps={timelineSteps} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Deposit / Withdraw Modal ────────────────────────────────────────── */}
      <EnterpriseModal
        open={actionModal === "deposit" || actionModal === "withdraw"}
        onOpenChange={(o) => !o && setActionModal(null)}
        title={actionModal === "deposit" ? "Realizar Depósito" : "Realizar Retiro"}
        description={`Cuenta: ${maskAccountNumber(accountNumber)}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Monto</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Concepto</label>
            <input
              type="text"
              placeholder="Descripción del movimiento"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <Button
            className="w-full"
            variant={actionModal === "deposit" ? "default" : "destructive"}
            onClick={() =>
              actionModal === "deposit"
                ? depositMutation.mutate()
                : withdrawMutation.mutate()
            }
            loading={depositMutation.isPending || withdrawMutation.isPending}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            {actionModal === "deposit" ? "Confirmar Depósito" : "Confirmar Retiro"}
          </Button>
        </div>
      </EnterpriseModal>

      {/* ── Block Dialog ────────────────────────────────────────────────────── */}
      <ApprovalDialog
        open={blockDialog}
        onOpenChange={setBlockDialog}
        title="Bloquear Cuenta"
        description="Esta acción suspenderá todas las operaciones de la cuenta."
        entityLabel="Cuenta"
        entityValue={maskAccountNumber(accountNumber)}
        onReject={async (motivo) => blockMutation.mutate(motivo)}
        requireRejectComment
        rejectLabel="Confirmar Bloqueo"
        variant="reject-only"
        loading={blockMutation.isPending}
      />

      {/* ── Cancel Dialog ───────────────────────────────────────────────────── */}
      <ApprovalDialog
        open={cancelDialog}
        onOpenChange={setCancelDialog}
        title="Cancelar Cuenta"
        description="Esta acción es permanente e irreversible."
        entityLabel="Cuenta"
        entityValue={maskAccountNumber(accountNumber)}
        onReject={async () => cancelMutation.mutate()}
        requireRejectComment={false}
        rejectLabel="Cancelar Cuenta Definitivamente"
        variant="reject-only"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
