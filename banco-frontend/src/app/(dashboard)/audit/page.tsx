"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Search,
  Shield,
  User,
} from "lucide-react";
import { auditService } from "@/services/audit.service";
import { PageHeader } from "@/components/shared/PageHeader";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/enterprise/AdvancedDataTable";
import { ExportDropdown } from "@/components/enterprise/ExportDropdown";
import { SmartFilters } from "@/components/enterprise/SmartFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogResponse } from "@/services/audit.service";

const OPERATION_FILTERS = [
  { label: "Todas", value: "" },
  { label: "Crear Cuenta", value: "CREAR_CUENTA" },
  { label: "Depósito", value: "DEPOSITO" },
  { label: "Retiro", value: "RETIRO" },
  { label: "Transferencia", value: "TRANSFERENCIA" },
  { label: "Bloquear Cuenta", value: "BLOQUEAR_CUENTA" },
  { label: "Préstamo", value: "PRESTAMO" },
  { label: "Login", value: "LOGIN" },
];

function exportToCSV(data: AuditLogResponse[]) {
  const headers = ["ID", "Tipo Operación", "Producto Afectado", "Tipo Producto", "ID Usuario", "Rol", "Sincronizado", "Fecha"];
  const rows = data.map((r) => [
    r.idBitacola,
    r.tipoOperacion,
    r.idProductoAfectado,
    r.tipoProducto,
    r.idUsuario,
    r.rolUsuario,
    r.sincronizado ? "Sí" : "No",
    r.fechaHoraOperacion,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bitacola-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({
    tipoOperacion: "",
  });
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit", page, filters],
    queryFn: () =>
      auditService.getAll({
        tipoOperacion: filters.tipoOperacion || undefined,
        page,
        size: 50,
      }),
    staleTime: 1000 * 30,
  });

  const logs = data?.content ?? [];

  const filtered = search
    ? logs.filter(
        (l) =>
          l.tipoOperacion.toLowerCase().includes(search.toLowerCase()) ||
          l.tipoProducto.toLowerCase().includes(search.toLowerCase()) ||
          l.idProductoAfectado.includes(search) ||
          l.rolUsuario.toLowerCase().includes(search.toLowerCase()) ||
          String(l.idUsuario).includes(search)
      )
    : logs;

  const columns: AdvancedColumn<AuditLogResponse>[] = [
    {
      key: "idBitacola",
      header: "ID",
      render: (v) => (
        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[80px] block">
          {String(v).substring(0, 8)}…
        </span>
      ),
    },
    {
      key: "tipoOperacion",
      header: "Operación",
      render: (v) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          {String(v)}
        </span>
      ),
    },
    {
      key: "tipoProducto",
      header: "Tipo Producto",
      render: (v) => (
        <span className="text-xs font-medium text-foreground">{String(v)}</span>
      ),
    },
    {
      key: "idProductoAfectado",
      header: "Producto Afectado",
      render: (v) => (
        <span className="font-mono text-xs text-muted-foreground">{String(v)}</span>
      ),
    },
    {
      key: "idUsuario",
      header: "Usuario",
      render: (v) => (
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs">#{String(v)}</span>
        </div>
      ),
    },
    {
      key: "rolUsuario",
      header: "Rol",
      render: (v) => (
        <span className="text-xs text-muted-foreground">{String(v)}</span>
      ),
    },
    {
      key: "datosDetalle",
      header: "Detalles",
      render: (v) => (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {v ? String(v).substring(0, 60) + (String(v).length > 60 ? "…" : "") : "—"}
        </span>
      ),
    },
    {
      key: "sincronizado",
      header: "Sync",
      align: "center",
      render: (v) => (
        <span className={`text-xs font-medium ${v ? "text-emerald-400" : "text-yellow-400"}`}>
          {v ? "✓" : "⏳"}
        </span>
      ),
    },
    {
      key: "fechaHoraOperacion",
      header: "Fecha",
      render: (v) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(String(v))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora de Auditoría"
        subtitle="Registro completo de actividad del sistema"
        icon={Activity}
        actions={
          <ExportDropdown
            onExport={(format) => {
              if (format === "csv") exportToCSV(logs);
              else if (format === "print") window.print();
            }}
          />
        }
      />

      {/* Filters */}
      <Card glass>
        <CardContent className="py-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por operación, producto, usuario, rol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <SmartFilters
              groups={[
                {
                  key: "tipoOperacion",
                  label: "Operación",
                  options: OPERATION_FILTERS,
                },
              ]}
              activeFilters={filters}
              onFilterChange={(key, value) => {
                setFilters((f) => ({ ...f, [key]: value }));
                setPage(0);
              }}
              onClearAll={() => {
                setFilters({ tipoOperacion: "" });
                setPage(0);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card glass>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Registros de Bitácora
              {data?.totalElements != null && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({data.totalElements.toLocaleString()} total)
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <AdvancedDataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            emptyMessage="No hay registros de bitácora"
            totalElements={data?.totalElements}
            page={page}
            pageSize={50}
            onPageChange={setPage}
            rowKey={(row) => String(row.idBitacola)}
            stickyHeader
          />
        </CardContent>
      </Card>
    </div>
  );
}
