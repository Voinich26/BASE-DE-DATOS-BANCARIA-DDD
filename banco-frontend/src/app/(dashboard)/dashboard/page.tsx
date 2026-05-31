"use client";

import React, { useMemo, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CreditCard,
  ArrowLeftRight,
  Landmark,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { accountService } from "@/services/account.service";
import { transferService } from "@/services/transfer.service";
import { useAuthStore } from "@/store/auth.store";
import { usePolling } from "@/hooks/usePolling";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityFeed, type ActivityItem } from "@/components/enterprise/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  maskAccountNumber,
} from "@/lib/utils";
import Link from "next/link";

// Dynamic imports para componentes pesados
const AreaChartWidget = React.lazy(() => 
  import("@/components/shared/charts/AreaChartWidget").then(mod => ({ default: mod.AreaChartWidget }))
);
const DonutChartWidget = React.lazy(() => 
  import("@/components/shared/charts/DonutChartWidget").then(mod => ({ default: mod.DonutChartWidget }))
);
const MetricGrid = React.lazy(() => 
  import("@/components/enterprise/MetricGrid").then(mod => ({ default: mod.MetricGrid }))
);
const NotificationCenter = React.lazy(() => 
  import("@/components/enterprise/NotificationCenter").then(mod => ({ default: mod.NotificationCenter }))
);
const RealtimeWidgets = React.lazy(() => 
  import("@/components/enterprise/RealtimeWidgets").then(mod => ({ default: mod.RealtimeWidgets }))
);

// Loading fallback para charts
function ChartLoading() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

// ── Derive monthly activity from real transfer data ───────────────────────────

function buildMonthlyActivity(
  transfers: import("@/types/api.types").TransferenciaResponse[]
): { mes: string; monto: number }[] {
  const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const now = new Date();
  // Build last 6 months
  const buckets: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets[key] = 0;
  }
  for (const t of transfers) {
    if (t.estadoTransferencia !== "Ejecutada") continue;
    const d = new Date(t.fechaCreacion);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in buckets) {
      buckets[key] += t.monto;
    }
  }
  return Object.entries(buckets).map(([key, monto]) => {
    const [year, month] = key.split("-").map(Number);
    return { mes: MONTHS[month], monto };
  });
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: accountDashboard, isLoading: loadingAccounts } = useQuery({
    queryKey: ["dashboard", "accounts"],
    queryFn: () => accountService.getDashboard(),
    staleTime: 1000 * 60 * 2,
  });

  const { data: transferDashboard, isLoading: loadingTransfers } = useQuery({
    queryKey: ["dashboard", "transfers"],
    queryFn: () => transferService.getDashboard(),
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = loadingAccounts || loadingTransfers;

  // Build monthly activity from real transfer data
  const activityData = buildMonthlyActivity(
    transferDashboard?.ultimasTransferencias ?? []
  );

  // Compute trend vs previous month
  const trendPct = useMemo(() => {
    if (activityData.length < 2) return null;
    const curr = activityData[activityData.length - 1]?.monto ?? 0;
    const prev = activityData[activityData.length - 2]?.monto ?? 0;
    if (prev === 0) return null;
    return (((curr - prev) / prev) * 100).toFixed(1);
  }, [activityData]);

  // Build donut chart data from transfer states
  const transferDonutData = transferDashboard
    ? [
        { name: "Ejecutadas", value: transferDashboard.totalEjecutadas ?? 0, color: "#10b981" },
        { name: "Pendientes", value: transferDashboard.totalPendientes ?? 0, color: "#f59e0b" },
        { name: "En Espera", value: transferDashboard.totalEnEspera ?? 0, color: "#3b82f6" },
        { name: "Rechazadas", value: transferDashboard.totalRechazadas ?? 0, color: "#ef4444" },
        { name: "Vencidas", value: transferDashboard.totalVencidas ?? 0, color: "#f97316" },
      ].filter((d) => d.value > 0)
    : [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting()},{" "}
            <span className="gradient-text">
              {user?.nombreCompleto?.split(" ")[0] ?? "Usuario"}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <NotificationCenter />
          </Suspense>
          <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* ── KPI Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Total Consolidado"
          value={
            accountDashboard
              ? formatCurrency(accountDashboard.saldoTotalConsolidado)
              : "—"
          }
          subtitle={`${accountDashboard?.totalCuentasActivas ?? 0} cuentas activas`}
          icon={CreditCard}
          color="blue"
          loading={isLoading}
          index={0}
        />
        <StatCard
          title="Transferencias Enviadas"
          value={transferDashboard?.totalEnviadas ?? 0}
          subtitle={
            transferDashboard
              ? formatCurrency(transferDashboard.montoTotalEnviado)
              : "—"
          }
          icon={ArrowUpRight}
          color="cyan"
          loading={isLoading}
          index={1}
        />
        <StatCard
          title="Transferencias Recibidas"
          value={transferDashboard?.totalRecibidas ?? 0}
          subtitle={
            transferDashboard
              ? formatCurrency(transferDashboard.montoTotalRecibido)
              : "—"
          }
          icon={ArrowDownLeft}
          color="green"
          loading={isLoading}
          index={2}
        />
        <StatCard
          title="En Espera de Aprobación"
          value={transferDashboard?.totalEnEspera ?? 0}
          subtitle={
            transferDashboard
              ? formatCurrency(transferDashboard.montoEnEspera ?? 0)
              : "—"
          }
          icon={Clock}
          color="orange"
          loading={isLoading}
          index={3}
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Activity chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-2"
        >
          <Card glass hover>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Actividad Transaccional</CardTitle>
                  <CardDescription>Volumen mensual de transferencias</CardDescription>
                </div>
                {trendPct !== null && (
                  <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                    Number(trendPct) >= 0
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : "text-red-400 bg-red-500/10 border-red-500/20"
                  }`}>
                    {Number(trendPct) >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {Number(trendPct) >= 0 ? "+" : ""}{trendPct}%
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartLoading />}>
                <AreaChartWidget
                  data={activityData}
                  xKey="mes"
                  yKey="monto"
                  height={220}
                  formatY={(v) => `$${(v / 1000000).toFixed(0)}M`}
                  formatTooltip={(v) => formatCurrency(v)}
                />
              </Suspense>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transfer distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card glass hover className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estado de Transferencias</CardTitle>
              <CardDescription>Distribución actual</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-40 w-40 rounded-full mx-auto" />
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : transferDonutData.length > 0 ? (
                <Suspense fallback={<ChartLoading />}>
                  <DonutChartWidget data={transferDonutData} height={160} />
                </Suspense>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <BarChart3 className="w-8 h-8 opacity-30 mb-2" />
                  <p className="text-sm">Sin datos disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Realtime Widgets ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Suspense fallback={<ChartLoading />}>
          <RealtimeWidgets />
        </Suspense>
      </motion.div>

      {/* ── Bottom row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Accounts summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card glass hover>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Mis Cuentas</CardTitle>
                  <CardDescription>Resumen de cuentas bancarias</CardDescription>
                </div>
                <Link href="/accounts">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Ver todas
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : accountDashboard?.cuentas?.length ? (
                accountDashboard.cuentas.slice(0, 4).map((cuenta) => (
                  <Link
                    key={cuenta.numeroCuenta}
                    href={`/accounts/${cuenta.numeroCuenta}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground font-mono">
                        {maskAccountNumber(cuenta.numeroCuenta)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cuenta.tipoCuenta} · {cuenta.codigoIsoMoneda}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground font-numeric">
                        {formatCurrency(Number(cuenta.saldoActual), cuenta.codigoIsoMoneda)}
                      </p>
                      <StatusBadge status={cuenta.estadoCuenta} className="text-[10px]" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <CreditCard className="w-8 h-8 opacity-30 mx-auto mb-2" />
                  <p className="text-sm">No hay cuentas disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent transfers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card glass hover>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Transferencias Recientes</CardTitle>
                  <CardDescription>Últimas operaciones</CardDescription>
                </div>
                <Link href="/transfers">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    Ver todas
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : transferDashboard?.ultimasTransferencias?.length ? (
                transferDashboard.ultimasTransferencias.slice(0, 5).map((t) => {
                  const isExecuted = t.estadoTransferencia === "Ejecutada";
                  const isPending =
                    t.estadoTransferencia === "Pendiente" ||
                    t.estadoTransferencia === "En Espera de Aprobacion";
                  const isRejected =
                    t.estadoTransferencia === "Rechazada" ||
                    t.estadoTransferencia === "Vencida";

                  return (
                    <Link
                      key={t.idTransferencia}
                      href={`/transfers/${t.idTransferencia}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                          isExecuted
                            ? "bg-emerald-500/10 text-emerald-400"
                            : isPending
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {isExecuted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isPending ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground font-mono truncate">
                          {maskAccountNumber(t.cuentaDestino)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(t.fechaCreacion)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground font-numeric">
                          {formatCurrency(t.monto)}
                        </p>
                        <StatusBadge
                          status={t.estadoTransferencia}
                          className="text-[10px]"
                        />
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <ArrowLeftRight className="w-8 h-8 opacity-30 mx-auto mb-2" />
                  <p className="text-sm">No hay transferencias recientes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Nueva Transferencia", icon: ArrowLeftRight, href: "/transfers/new", color: "text-blue-400 bg-blue-500/10" },
                { label: "Ver Cuentas", icon: CreditCard, href: "/accounts", color: "text-cyan-400 bg-cyan-500/10" },
                { label: "Solicitar Préstamo", icon: Landmark, href: "/loans", color: "text-purple-400 bg-purple-500/10" },
                { label: "Pagos Masivos", icon: BarChart3, href: "/batches", color: "text-emerald-400 bg-emerald-500/10" },
              ].map((action) => (
                <Link key={action.label} href={action.href}>
                  <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border hover:bg-secondary/50 hover:border-primary/30 transition-all duration-200 cursor-pointer group">
                    <div className={`p-2.5 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                      {action.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Activity feed ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card glass>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Actividad Reciente</CardTitle>
                <CardDescription>Últimas operaciones del sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              loading={isLoading}
              items={
                transferDashboard?.ultimasTransferencias?.map((t) => ({
                  id: t.idTransferencia,
                  type: "transfer" as const,
                  action: `Transferencia ${t.estadoTransferencia}`,
                  description: `${maskAccountNumber(t.cuentaOrigen)} → ${maskAccountNumber(t.cuentaDestino)}`,
                  amount: t.monto,
                  status:
                    t.estadoTransferencia === "Ejecutada"
                      ? "success" as const
                      : t.estadoTransferencia === "Rechazada" || t.estadoTransferencia === "Vencida"
                      ? "error" as const
                      : "pending" as const,
                  timestamp: t.fechaCreacion,
                  actor: t.nombreUsuarioCreador,
                })) ?? []
              }
              maxItems={8}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
