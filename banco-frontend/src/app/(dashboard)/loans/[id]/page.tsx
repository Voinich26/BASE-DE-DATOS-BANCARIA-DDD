"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Landmark,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  User,
  Calendar,
  Percent,
} from "lucide-react";
import { loanService } from "@/services/loan.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { TimelineEnterprise, type TimelineStep } from "@/components/enterprise/TimelineEnterprise";
import { MetricGrid, type MetricItem } from "@/components/enterprise/MetricGrid";
import { ApprovalDialog } from "@/components/enterprise/ApprovalDialog";
import { EnterpriseModal } from "@/components/enterprise/EnterpriseModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

function buildLoanTimeline(loan: {
  estadoPrestamo: string;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  fechaDesembolso?: string;
}): TimelineStep[] {
  const estado = loan.estadoPrestamo;
  const steps: TimelineStep[] = [
    {
      id: "solicitado",
      label: "Solicitud Registrada",
      description: "Préstamo ingresado al sistema",
      timestamp: loan.fechaSolicitud,
      status: "completed",
    },
    {
      id: "revision",
      label: "En Revisión",
      description: "Análisis crediticio en proceso",
      status:
        estado === "En Revision"
          ? "current"
          : ["Aprobado", "Desembolsado", "Rechazado"].includes(estado)
          ? "completed"
          : "pending",
    },
  ];

  if (estado === "Rechazado") {
    steps.push({
      id: "rechazado",
      label: "Solicitud Rechazada",
      description: "No cumple los criterios de aprobación",
      timestamp: loan.fechaAprobacion,
      status: "rejected",
    });
  } else {
    steps.push({
      id: "aprobado",
      label: "Préstamo Aprobado",
      description: "Condiciones aceptadas por el analista",
      timestamp: loan.fechaAprobacion,
      status:
        estado === "Aprobado"
          ? "current"
          : estado === "Desembolsado"
          ? "completed"
          : "pending",
    });
    steps.push({
      id: "desembolsado",
      label: "Fondos Desembolsados",
      description: "Dinero transferido a la cuenta del cliente",
      timestamp: loan.fechaDesembolso,
      status: estado === "Desembolsado" ? "completed" : "pending",
    });
  }

  return steps;
}

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAnalyst, isSupervisor } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [disbursDialog, setDisbursDialog] = useState(false);
  const [disbursAccount, setDisbursAccount] = useState("");
  const [approveForm, setApproveForm] = useState({
    montoAprobado: "",
    tasaInteres: "",
    plazoMeses: "",
    cuentaDestinoDesembolso: "",
  });

  const { data: loan, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: () => loanService.getById(parseInt(id)),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      loanService.aprobar(parseInt(id), {
        montoAprobado: parseFloat(approveForm.montoAprobado),
        tasaInteres: parseFloat(approveForm.tasaInteres),
        plazoMeses: parseInt(approveForm.plazoMeses),
        idAnalista: user!.idUsuario,
        cuentaDestinoDesembolso: approveForm.cuentaDestinoDesembolso,
      }),
    onSuccess: () => {
      notify({ title: "Préstamo aprobado", message: "Aprobación registrada exitosamente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
      setApproveDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo aprobar el préstamo", type: "error" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (motivo: string) =>
      loanService.rechazar(parseInt(id), user!.idUsuario, motivo),
    onSuccess: () => {
      notify({ title: "Préstamo rechazado", message: "Rechazo registrado", type: "warning" });
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
      setRejectDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo rechazar el préstamo", type: "error" }),
  });

  const disbursMutation = useMutation({
    mutationFn: () =>
      loanService.desembolsar(parseInt(id), {
        idSupervisor: user!.idUsuario,
      }),
    onSuccess: () => {
      notify({ title: "Desembolso exitoso", message: "Fondos transferidos al cliente", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
      setDisbursDialog(false);
    },
    onError: () => notify({ title: "Error", message: "No se pudo desembolsar", type: "error" }),
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

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <XCircle className="w-12 h-12 opacity-30 mb-3" />
        <p className="text-lg font-medium">Préstamo no encontrado</p>
        <Button variant="ghost" className="mt-4 gap-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
      </div>
    );
  }

  const timeline = buildLoanTimeline(loan);
  const canApprove = isAnalyst() && ["Solicitado", "En Revision"].includes(loan.estadoPrestamo);
  const canDisburse = isSupervisor() && loan.estadoPrestamo === "Aprobado";

  const metrics: MetricItem[] = [
    { label: "Monto Solicitado", value: formatCurrency(loan.montoSolicitado), color: "blue", icon: DollarSign },
    { label: "Monto Aprobado", value: loan.montoAprobado ? formatCurrency(loan.montoAprobado) : "—", color: "green" },
    { label: "Tasa de Interés", value: loan.tasaInteres ? `${loan.tasaInteres}%` : "—", color: "orange", icon: Percent },
    { label: "Plazo", value: loan.plazoMeses ? `${loan.plazoMeses} meses` : "—", color: "purple", icon: Calendar },
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
              <h1 className="text-xl font-bold text-foreground">
                Préstamo #{loan.idPrestamo}
              </h1>
              <StatusBadge status={loan.estadoPrestamo} />
            </div>
            <p className="text-xs text-muted-foreground">
              {loan.tipoPrestamo} · Solicitado {formatDate(loan.fechaSolicitud)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {canApprove && (
            <>
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
            </>
          )}
          {canDisburse && (
            <Button
              size="sm"
              className="gap-2 bg-purple-600 hover:bg-purple-500 text-white"
              onClick={() => setDisbursDialog(true)}
            >
              <DollarSign className="w-4 h-4" /> Desembolsar
            </Button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <MetricGrid metrics={metrics} columns={4} />

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary" />
              Detalles del Préstamo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "ID Préstamo", value: `#${loan.idPrestamo}`, mono: true },
              { label: "Tipo", value: loan.tipoPrestamo },
              { label: "Cliente (ID)", value: loan.idClienteSolicitante, mono: true },
              { label: "Tipo Cliente", value: loan.tipoCliente },
              { label: "Monto Solicitado", value: formatCurrency(loan.montoSolicitado), highlight: true },
              { label: "Monto Aprobado", value: loan.montoAprobado ? formatCurrency(loan.montoAprobado) : "—" },
              { label: "Tasa de Interés", value: loan.tasaInteres ? `${loan.tasaInteres}%` : "—" },
              { label: "Plazo", value: loan.plazoMeses ? `${loan.plazoMeses} meses` : "—" },
              { label: "Estado", value: loan.estadoPrestamo, badge: true },
              { label: "Fecha Solicitud", value: formatDate(loan.fechaSolicitud) },
              { label: "Fecha Aprobación", value: loan.fechaAprobacion ? formatDate(loan.fechaAprobacion) : "—" },
              { label: "Fecha Desembolso", value: loan.fechaDesembolso ? formatDate(loan.fechaDesembolso) : "—" },
              { label: "Cuenta Desembolso", value: loan.cuentaDestinoDesembolso ?? "—", mono: true },
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

        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Timeline del Préstamo
            </CardTitle>
            <CardDescription>Progreso de la solicitud</CardDescription>
          </CardHeader>
          <CardContent>
            <TimelineEnterprise steps={timeline} />
          </CardContent>
        </Card>
      </div>

      {/* Approve Modal */}
      <EnterpriseModal
        open={approveDialog}
        onOpenChange={setApproveDialog}
        title="Aprobar Préstamo"
        description={`Monto solicitado: ${formatCurrency(loan.montoSolicitado)}`}
        size="sm"
      >
        <div className="space-y-4">
          {[
            { key: "montoAprobado", label: "Monto Aprobado", placeholder: "0.00" },
            { key: "tasaInteres", label: "Tasa de Interés (%)", placeholder: "0.00" },
            { key: "plazoMeses", label: "Plazo (meses)", placeholder: "12" },
            { key: "cuentaDestinoDesembolso", label: "Cuenta Destino", placeholder: "Número de cuenta" },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <input
                type="number"
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
            disabled={
              !approveForm.montoAprobado ||
              !approveForm.tasaInteres ||
              !approveForm.plazoMeses ||
              !approveForm.cuentaDestinoDesembolso
            }
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar Aprobación
          </Button>
        </div>
      </EnterpriseModal>

      {/* Reject Dialog */}
      <ApprovalDialog
        open={rejectDialog}
        onOpenChange={setRejectDialog}
        title="Rechazar Préstamo"
        entityLabel="Préstamo"
        entityValue={`#${loan.idPrestamo}`}
        onReject={async (motivo) => rejectMutation.mutate(motivo!)}
        requireRejectComment
        rejectLabel="Confirmar Rechazo"
        variant="reject-only"
        loading={rejectMutation.isPending}
      />

      {/* Disburse Modal */}
      <EnterpriseModal
        open={disbursDialog}
        onOpenChange={setDisbursDialog}
        title="Desembolsar Préstamo"
        description={`Monto a desembolsar: ${loan.montoAprobado ? formatCurrency(loan.montoAprobado) : "—"}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cuenta Destino</label>
            <input
              type="text"
              placeholder="Número de cuenta"
              value={disbursAccount}
              onChange={(e) => setDisbursAccount(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
            />
          </div>
          <Button
            className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2"
            onClick={() => disbursMutation.mutate()}
            loading={disbursMutation.isPending}
            disabled={!disbursAccount}
          >
            <DollarSign className="w-4 h-4" /> Confirmar Desembolso
          </Button>
        </div>
      </EnterpriseModal>
    </div>
  );
}
