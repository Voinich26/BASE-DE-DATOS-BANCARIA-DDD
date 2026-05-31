"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  User,
  Building2,
} from "lucide-react";
import { accountService } from "@/services/account.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

// ── Options ───────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  { label: "Ahorros", value: "Ahorros" },
  { label: "Corriente", value: "Corriente" },
  { label: "Personal", value: "Personal" },
  { label: "Empresarial", value: "Empresarial" },
];

const CURRENCIES = [
  { label: "Peso Colombiano (COP)", value: "COP" },
  { label: "Dólar Estadounidense (USD)", value: "USD" },
  { label: "Euro (EUR)", value: "EUR" },
];

const CLIENT_TYPES = [
  { label: "Persona Natural", value: "PERSONA_NATURAL" },
  { label: "Empresa", value: "EMPRESA" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewAccountPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    numeroCuenta: "",
    nombreTipoCuenta: "Ahorros",
    idTitular: "",
    tipoTitular: "PERSONA_NATURAL",
    codigoIsoMoneda: "COP",
    saldoInicial: "",
  });

  const [success, setSuccess] = useState<{ numeroCuenta: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      accountService.create({
        numeroCuenta: form.numeroCuenta.trim(),
        nombreTipoCuenta: form.nombreTipoCuenta,
        idTitular: form.idTitular.trim(),
        tipoTitular: form.tipoTitular,
        codigoIsoMoneda: form.codigoIsoMoneda,
        saldoInicial: parseFloat(form.saldoInicial) || 0,
        idUsuarioApertura: user!.idUsuario,
      }),
    onSuccess: (data) => {
      setSuccess({ numeroCuenta: data.numeroCuenta });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      notify({
        title: "Cuenta creada",
        message: `Cuenta ${data.numeroCuenta} abierta exitosamente`,
        type: "success",
      });
    },
    onError: () =>
      notify({ title: "Error", message: "No se pudo crear la cuenta", type: "error" }),
  });

  const isValid =
    form.numeroCuenta.trim().length >= 5 &&
    form.idTitular.trim().length >= 5 &&
    parseFloat(form.saldoInicial) >= 0;

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card glass className="text-center">
            <CardContent className="py-12 space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 mx-auto"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">¡Cuenta Creada!</h2>
                <p className="text-muted-foreground text-sm">
                  La cuenta bancaria fue abierta exitosamente.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 border border-border inline-block mx-auto">
                <p className="text-xs text-muted-foreground">Número de Cuenta</p>
                <p className="text-xl font-bold font-mono text-primary">{success.numeroCuenta}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link href={`/accounts/${success.numeroCuenta}`}>
                  <Button variant="outline" className="gap-2">Ver Cuenta</Button>
                </Link>
                <Button
                  variant="banking"
                  className="gap-2"
                  onClick={() => {
                    setSuccess(null);
                    setForm({
                      numeroCuenta: "",
                      nombreTipoCuenta: "Ahorros",
                      idTitular: "",
                      tipoTitular: "PERSONA_NATURAL",
                      codigoIsoMoneda: "COP",
                      saldoInicial: "",
                    });
                  }}
                >
                  Nueva Cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Nueva Cuenta Bancaria</h1>
          <p className="text-xs text-muted-foreground">Apertura de cuenta vía SP</p>
        </div>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Datos de la Cuenta
          </CardTitle>
          <CardDescription>
            Completa los datos para abrir la cuenta bancaria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Número de cuenta */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Número de Cuenta <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="001-123456789-0"
              value={form.numeroCuenta}
              onChange={(e) => update("numeroCuenta", e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
            />
          </div>

          {/* Tipo de cuenta */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tipo de Cuenta <span className="text-destructive">*</span>
            </label>
            <select
              value={form.nombreTipoCuenta}
              onChange={(e) => update("nombreTipoCuenta", e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Tipo de titular */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tipo de Titular <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CLIENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("tipoTitular", t.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    form.tipoTitular === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {t.value === "PERSONA_NATURAL" ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ID del titular */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {form.tipoTitular === "EMPRESA" ? "NIT de la Empresa" : "Cédula del Titular"}{" "}
              <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={form.tipoTitular === "EMPRESA" ? "900123456-1" : "1234567890"}
              value={form.idTitular}
              onChange={(e) => update("idTitular", e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
            />
          </div>

          {/* Moneda */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Moneda <span className="text-destructive">*</span>
            </label>
            <select
              value={form.codigoIsoMoneda}
              onChange={(e) => update("codigoIsoMoneda", e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Saldo inicial */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Saldo Inicial
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.saldoInicial}
                onChange={(e) => update("saldoInicial", e.target.value)}
                className="w-full h-10 pl-7 pr-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-numeric"
              />
            </div>
            {form.saldoInicial && parseFloat(form.saldoInicial) > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(parseFloat(form.saldoInicial), form.codigoIsoMoneda)}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            variant="banking"
            className="w-full gap-2 mt-2"
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!isValid}
          >
            <CreditCard className="w-4 h-4" />
            Abrir Cuenta Bancaria
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
