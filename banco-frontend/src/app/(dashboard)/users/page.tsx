"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  Calendar,
  Key,
} from "lucide-react";
import { apiGet, apiPost } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AdvancedDataTable, type AdvancedColumn } from "@/components/enterprise/AdvancedDataTable";
import { EnterpriseModal } from "@/components/enterprise/EnterpriseModal";
import { ExportDropdown } from "@/components/enterprise/ExportDropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, getRoleLabel, getRoleColor, cn } from "@/lib/utils";
import type { UsuarioResponse, PagedResponse, UserRole } from "@/types/api.types";

// ── Role options ──────────────────────────────────────────────────────────────

const ROLES: UserRole[] = [
  "ADMINISTRADOR",
  "SUPERVISOR_EMPRESA",
  "ANALISTA_INTERNO",
  "EMPLEADO_VENTANILLA",
  "EMPLEADO_COMERCIAL",
  "CLIENTE_EMPRESA",
  "CLIENTE_PERSONA",
  "CLIENTE_PERSONA_NATURAL",
];

const ROLE_FILTERS = [
  { label: "Todos", value: "" },
  { label: "Admin", value: "ADMINISTRADOR" },
  { label: "Supervisor", value: "SUPERVISOR_EMPRESA" },
  { label: "Analista", value: "ANALISTA_INTERNO" },
  { label: "Ventanilla", value: "EMPLEADO_VENTANILLA" },
  { label: "Comercial", value: "EMPLEADO_COMERCIAL" },
  { label: "Empresa", value: "CLIENTE_EMPRESA" },
  { label: "Persona", value: "CLIENTE_PERSONA" },
];

// ── CSV export ────────────────────────────────────────────────────────────────

function exportUsersCSV(users: UsuarioResponse[]) {
  const headers = ["ID", "Nombre", "Correo", "Identificación", "Teléfono", "Rol", "Estado", "Creación"];
  const rows = users.map((u) => [
    u.idUsuario,
    u.nombreCompleto,
    u.correoElectronico,
    u.idIdentificacion,
    u.telefono ?? "",
    getRoleLabel(u.rol),
    u.estadoUsuario,
    u.fechaCreacion,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `usuarios-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { isSupervisor, isAdmin } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [newUserModal, setNewUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    nombreCompleto: "",
    correoElectronico: "",
    password: "",
    idIdentificacion: "",
    telefono: "",
    rol: "CLIENTE_PERSONA" as UserRole,
    fechaNacimiento: "",
    direccion: "",
  });

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: async () => {
      const res = await apiGet<PagedResponse<UsuarioResponse>>(
        `/v1/usuarios?page=${page}&size=20`
      );
      return res.data;
    },
    staleTime: 1000 * 60,
  });

  const users = data?.content ?? [];

  // ── Filtered ─────────────────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
      u.correoElectronico.toLowerCase().includes(search.toLowerCase()) ||
      u.idIdentificacion.includes(search);
    const matchRole = !roleFilter || u.rol === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = {
    total: data?.totalElements ?? 0,
    activos: users.filter((u) => u.estadoUsuario === "Activo").length,
    bloqueados: users.filter((u) => u.estadoUsuario === "Bloqueado").length,
    inactivos: users.filter((u) => u.estadoUsuario === "Inactivo").length,
  };

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () => apiPost("/v1/usuarios", newUserForm),
    onSuccess: () => {
      notify({ title: "Usuario creado", message: "El usuario fue registrado exitosamente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setNewUserModal(false);
      setNewUserForm({
        nombreCompleto: "",
        correoElectronico: "",
        password: "",
        idIdentificacion: "",
        telefono: "",
        rol: "CLIENTE_PERSONA",
        fechaNacimiento: "",
        direccion: "",
      });
    },
    onError: () =>
      notify({ title: "Error", message: "No se pudo crear el usuario", type: "error" }),
  });

  const isFormValid =
    newUserForm.nombreCompleto &&
    newUserForm.correoElectronico &&
    newUserForm.password.length >= 8 &&
    newUserForm.idIdentificacion;

  // ── Columns ──────────────────────────────────────────────────────────────────

  const columns: AdvancedColumn<UsuarioResponse>[] = [
    {
      key: "idUsuario",
      header: "ID",
      render: (v) => (
        <span className="font-mono text-xs text-muted-foreground">#{String(v)}</span>
      ),
    },
    {
      key: "nombreCompleto",
      header: "Nombre",
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
            {String(v).split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{String(v)}</p>
            <p className="text-xs text-muted-foreground truncate">{row.correoElectronico as string}</p>
          </div>
        </div>
      ),
    },
    {
      key: "idIdentificacion",
      header: "Identificación",
      render: (v) => <span className="font-mono text-xs">{String(v)}</span>,
    },
    {
      key: "telefono",
      header: "Teléfono",
      render: (v) => (
        <span className="text-xs text-muted-foreground">{String(v ?? "—")}</span>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      render: (v) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold gap-1",
            getRoleColor(v as UserRole)
          )}
        >
          <Shield className="w-2.5 h-2.5" />
          {getRoleLabel(v as UserRole)}
        </span>
      ),
    },
    {
      key: "estadoUsuario",
      header: "Estado",
      align: "center",
      render: (v) => <StatusBadge status={String(v)} />,
    },
    {
      key: "fechaCreacion",
      header: "Creación",
      sortable: true,
      render: (v) => (
        <span className="text-xs text-muted-foreground">{formatDate(String(v))}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Gestión y directorio de usuarios del sistema"
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <ExportDropdown
              onExport={(format) => {
                if (format === "csv") exportUsersCSV(users);
                else if (format === "print") window.print();
              }}
            />
            {(isSupervisor() || isAdmin()) && (
              <Button
                variant="banking"
                size="sm"
                className="gap-2"
                onClick={() => setNewUserModal(true)}
              >
                <Plus className="w-4 h-4" />
                Nuevo Usuario
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Usuarios" value={stats.total} icon={Users} color="blue" loading={isLoading} index={0} />
        <StatCard title="Activos" value={stats.activos} icon={UserCheck} color="green" loading={isLoading} index={1} />
        <StatCard title="Bloqueados" value={stats.bloqueados} icon={UserX} color="red" loading={isLoading} index={2} />
        <StatCard title="Inactivos" value={stats.inactivos} icon={UserX} color="orange" loading={isLoading} index={3} />
      </div>

      {/* Table */}
      <Card glass>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">Directorio de Usuarios</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-48"
                />
              </div>
            </div>
          </div>

          {/* Role filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setRoleFilter(f.value); setPage(0); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  roleFilter === f.value
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <AdvancedDataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            emptyMessage="No hay usuarios registrados"
            totalElements={data?.totalElements}
            page={page}
            pageSize={20}
            onPageChange={setPage}
            rowKey={(row) => String(row.idUsuario)}
          />
        </CardContent>
      </Card>

      {/* ── New User Modal ──────────────────────────────────────────────────── */}
      <EnterpriseModal
        open={newUserModal}
        onOpenChange={setNewUserModal}
        title="Crear Nuevo Usuario"
        description="Completa los datos del nuevo usuario del sistema"
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "nombreCompleto", label: "Nombre Completo", placeholder: "Juan Pérez", icon: Users, colSpan: 2 },
            { key: "correoElectronico", label: "Correo Electrónico", placeholder: "juan@empresa.com", icon: Mail, type: "email" },
            { key: "password", label: "Contraseña", placeholder: "Mínimo 8 caracteres", icon: Key, type: "password" },
            { key: "idIdentificacion", label: "Identificación", placeholder: "1234567890", icon: Shield },
            { key: "telefono", label: "Teléfono", placeholder: "+57 300 000 0000", icon: Phone },
            { key: "fechaNacimiento", label: "Fecha Nacimiento", placeholder: "", icon: Calendar, type: "date" },
            { key: "direccion", label: "Dirección", placeholder: "Calle 123 #45-67", icon: null, colSpan: 2 },
          ].map((field) => (
            <div
              key={field.key}
              className={field.colSpan === 2 ? "col-span-2" : ""}
            >
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {field.label}
              </label>
              <input
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                value={newUserForm[field.key as keyof typeof newUserForm]}
                onChange={(e) =>
                  setNewUserForm((f) => ({ ...f, [field.key]: e.target.value }))
                }
                className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          ))}

          {/* Role selector */}
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Rol del Usuario
            </label>
            <select
              value={newUserForm.rol}
              onChange={(e) =>
                setNewUserForm((f) => ({ ...f, rol: e.target.value as UserRole }))
              }
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {getRoleLabel(r)} ({r})
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <Button
              variant="banking"
              className="w-full gap-2"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!isFormValid}
            >
              <Plus className="w-4 h-4" />
              Crear Usuario
            </Button>
          </div>
        </div>
      </EnterpriseModal>
    </div>
  );
}
