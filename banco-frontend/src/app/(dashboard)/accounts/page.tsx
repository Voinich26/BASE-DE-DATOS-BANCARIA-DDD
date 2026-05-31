"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CreditCard,
  Plus,
  Search,
  TrendingUp,
  Lock,
  XCircle,
  DollarSign,
} from "lucide-react";
import { accountService } from "@/services/account.service";
import { useAuthStore } from "@/store/auth.store";
import { useExport } from "@/hooks/useExport";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/enterprise/AdvancedDataTable";
import { ExportDropdown } from "@/components/enterprise/ExportDropdown";
import { MetricGrid } from "@/components/enterprise/MetricGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, maskAccountNumber } from "@/lib/utils";
import type { CuentaBancariaResponse } from "@/types/api.types";
import Link from "next/link";

const STATUS_FILTERS = [
  { label: "Todas", value: "" },
  { label: "Activas", value: "Activa" },
  { label: "Bloqueadas", value: "Bloqueada" },
  { label: "Canceladas", value: "Cancelada" },
];

export default function AccountsPage() {
  const { user, isEmployee } = useAuthStore();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const isEmp = isEmployee();

  const { data: allAccounts, isLoading: loadingAll } = useQuery({
    queryKey: ["accounts", "all", page],
    queryFn: () => accountService.getAll(page, 20),
    enabled: isEmp,
    staleTime: 1000 * 30,
  });

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ["accounts", "dashboard"],
    queryFn: () => accountService.getDashboard(),
    staleTime: 1000 * 60,
  });

  const isLoading = isEmp ? loadingAll : loadingDash;

  const accounts: CuentaBancariaResponse[] = isEmp
    ? (allAccounts?.content ?? [])
    : (dashboard?.cuentas ?? []);

  const filtered = accounts.filter((a) => {
    const matchSearch =
      !search ||
      a.numeroCuenta.includes(search) ||
      a.tipoCuenta.toLowerCase().includes(search.toLowerCase()) ||
      a.idTitular.includes(search);
    const matchStatus = !statusFilter || a.estadoCuenta === statusFilter;
    return matchSearch && matchStatus;
  });

  // Export
  const { handleExport } = useExport(filtered as unknown as Record<string, unknown>[], {
    filename: "cuentas",
    columns: [
      { key: "numeroCuenta", header: "Número de Cuenta" },
      { key: "tipoCuenta", header: "Tipo" },
      { key: "idTitular", header: "Titular" },
      { key: "saldoActual", header: "Saldo", format: (v) => formatCurrency(Number(v)) },
      { key: "codigoIsoMoneda", header: "Moneda" },
      { key: "estadoCuenta", header: "Estado" },
      { key: "fechaApertura", header: "Apertura", format: (v) => formatDate(String(v)) },
    ],
  });

  const columns: AdvancedColumn<CuentaBancariaResponse>[] = [
    {
      key: "numeroCuenta",
      header: "Número de Cuenta",
      sticky: true,
      render: (v) => (
        <span className="font-mono text-xs text-foreground font-medium">
          {maskAccountNumber(String(v))}
        </span>
      ),
    },
    {
      key: "tipoCuenta",
      header: "Tipo",
      sortable: true,
      render: (v) => (
        <span className="text-sm text-foreground">{String(v)}</span>
      ),
    },
    {
      key: "idTitular",
      header: "Titular",
      render: (v) => <span className="font-mono text-xs text-muted-foreground">{String(v)}</span>,
    },
    {
      key: "saldoActual",
      header: "Saldo",
      align: "right",
      sortable: true,
      render: (v, row) => (
        <span className="font-numeric font-semibold text-sm">
          {formatCurrency(Number(v), row.codigoIsoMoneda as string)}
        </span>
      ),
    },
    {
      key: "codigoIsoMoneda",
      header: "Moneda",
      align: "center",
      render: (v) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary border border-border">
          {String(v)}
        </span>
      ),
    },
    {
      key: "estadoCuenta",
      header: "Estado",
      align: "center",
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: "fechaApertura",
      header: "Apertura",
      render: (v) => (
        <span className="text-xs text-muted-foreground">{formatDate(String(v))}</span>
      ),
    },
    {
      key: "numeroCuenta",
      header: "",
      render: (v) => (
        <Link href={`/accounts/${v}`}>
          <Button variant="ghost" size="sm" className="text-xs h-7">
            Ver detalle
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas Bancarias"
        subtitle="Gestión y consulta de cuentas"
        icon={CreditCard}
        actions={
          <div className="flex items-center gap-2">
            <ExportDropdown onExport={handleExport} />
            {isEmp && (
              <Link href="/accounts/new">
                <Button variant="banking" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nueva Cuenta
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Cuentas Activas"
          value={dashboard?.totalCuentasActivas ?? 0}
          icon={CreditCard}
          color="green"
          loading={loadingDash}
          index={0}
        />
        <StatCard
          title="Saldo Consolidado"
          value={dashboard ? formatCurrency(dashboard.saldoTotalConsolidado) : "—"}
          icon={DollarSign}
          color="blue"
          loading={loadingDash}
          index={1}
        />
        <StatCard
          title="Cuentas Bloqueadas"
          value={dashboard?.totalCuentasBloqueadas ?? 0}
          icon={Lock}
          color="orange"
          loading={loadingDash}
          index={2}
        />
        <StatCard
          title="Cuentas Canceladas"
          value={dashboard?.totalCuentasCanceladas ?? 0}
          icon={XCircle}
          color="red"
          loading={loadingDash}
          index={3}
        />
      </div>

      {/* Table */}
      <Card glass>
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">
                {isEmp ? "Todas las Cuentas" : "Mis Cuentas"}
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar cuenta, titular..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-52"
                />
              </div>
            </div>

            {/* Status filter pills */}
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
            emptyMessage="No hay cuentas disponibles"
            totalElements={isEmp ? allAccounts?.totalElements : undefined}
            page={page}
            pageSize={20}
            onPageChange={isEmp ? setPage : undefined}
            rowKey={(row) => String(row.numeroCuenta)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
