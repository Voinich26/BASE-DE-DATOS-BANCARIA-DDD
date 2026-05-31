"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Landmark,
  CheckCircle2,
  DollarSign,
  Info,
  ArrowRight,
} from "lucide-react";
import { loanService } from "@/services/loan.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const LOAN_TYPES = [
  {
    id: "Personal",
    label: "Préstamo Personal",
    description: "Para gastos personales y emergencias",
    icon: "👤",
    maxAmount: 50000000,
    color: "border-blue-500/30 bg-blue-500/5",
  },
  {
    id: "Hipotecario",
    label: "Crédito Hipotecario",
    description: "Para compra o construcción de vivienda",
    icon: "🏠",
    maxAmount: 500000000,
    color: "border-emerald-500/30 bg-emerald-500/5",
  },
  {
    id: "Vehicular",
    label: "Crédito Vehicular",
    description: "Para compra de vehículo nuevo o usado",
    icon: "🚗",
    maxAmount: 150000000,
    color: "border-cyan-500/30 bg-cyan-500/5",
  },
  {
    id: "Empresarial",
    label: "Crédito Empresarial",
    description: "Para capital de trabajo y expansión",
    icon: "🏢",
    maxAmount: 1000000000,
    color: "border-purple-500/30 bg-purple-500/5",
  },
  {
    id: "Educativo",
    label: "Crédito Educativo",
    description: "Para estudios universitarios y posgrados",
    icon: "🎓",
    maxAmount: 80000000,
    color: "border-yellow-500/30 bg-yellow-500/5",
  },
  {
    id: "Libre Inversion",
    label: "Libre Inversión",
    description: "Sin destinación específica",
    icon: "💼",
    maxAmount: 100000000,
    color: "border-orange-500/30 bg-orange-500/5",
  },
];

type Step = "type" | "amount" | "confirm" | "success";

export default function NewLoanPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notify } = useNotification();

  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);

  const selectedLoanType = LOAN_TYPES.find((t) => t.id === selectedType);
  const parsedAmount = parseFloat(amount) || 0;
  const maxAmount = selectedLoanType?.maxAmount ?? 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= maxAmount;

  const createMutation = useMutation({
    mutationFn: () =>
      loanService.solicitar({
        nombreTipoPrestamo: selectedType!,
        idClienteSolicitante: user!.idIdentificacion,
        tipoCliente: user!.rol.includes("EMPRESA") ? "EMPRESA" : "PERSONA_NATURAL",
        montoSolicitado: parsedAmount,
        idUsuarioSolicitante: user!.idUsuario,
      }),
    onSuccess: (data) => {
      setCreatedId(data.idPrestamo);
      setStep("success");
      notify({
        title: "Solicitud enviada",
        message: `Préstamo #${data.idPrestamo} registrado exitosamente`,
        type: "success",
      });
    },
    onError: () =>
      notify({ title: "Error", message: "No se pudo registrar la solicitud", type: "error" }),
  });

  const STEP_INDEX: Record<Step, number> = { type: 0, amount: 1, confirm: 2, success: 3 };
  const STEPS = [
    { id: "type", label: "Tipo" },
    { id: "amount", label: "Monto" },
    { id: "confirm", label: "Confirmar" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Solicitar Préstamo</h1>
          <p className="text-xs text-muted-foreground">Proceso de solicitud de crédito</p>
        </div>
      </div>

      {/* Step indicator */}
      {step !== "success" && (
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const current = STEP_INDEX[step];
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
                      i < current
                        ? "bg-emerald-500 text-white"
                        : i === current
                        ? "bg-primary text-white ring-2 ring-primary/30"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i === current ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${i < current ? "bg-emerald-500/50" : "bg-border"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        {/* STEP 1: Type selection */}
        {step === "type" && (
          <motion.div
            key="type"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card glass>
              <CardHeader>
                <CardTitle>Tipo de Préstamo</CardTitle>
                <CardDescription>Selecciona el producto crediticio que necesitas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LOAN_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                        selectedType === type.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : `${type.color} hover:border-primary/30`
                      }`}
                    >
                      <span className="text-2xl shrink-0">{type.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{type.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                        <p className="text-xs text-primary font-medium mt-1">
                          Hasta {formatCurrency(type.maxAmount)}
                        </p>
                      </div>
                      {selectedType === type.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full gap-2 mt-2"
                  variant="banking"
                  disabled={!selectedType}
                  onClick={() => setStep("amount")}
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 2: Amount */}
        {step === "amount" && (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card glass>
              <CardHeader>
                <CardTitle>Monto Solicitado</CardTitle>
                <CardDescription>
                  {selectedLoanType?.label} · Máximo:{" "}
                  <span className="text-foreground font-semibold">
                    {formatCurrency(maxAmount)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Monto a solicitar</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                    <input
                      type="number"
                      min="0"
                      max={maxAmount}
                      step="100000"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-14 pl-8 pr-4 text-2xl font-bold rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-numeric"
                    />
                  </div>
                </div>

                {/* Quick amount buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[5000000, 10000000, 20000000, 50000000].filter((v) => v <= maxAmount).map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                    >
                      {formatCurrency(v)}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {parsedAmount > maxAmount && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20"
                    >
                      <Info className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-300">
                        El monto supera el límite para este tipo de préstamo
                      </p>
                    </motion.div>
                  )}
                  {isAmountValid && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-300">
                        Monto válido para {selectedLoanType?.label}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("type")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    variant="banking"
                    disabled={!isAmountValid}
                    onClick={() => setStep("confirm")}
                  >
                    Revisar <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: Confirm */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card glass>
              <CardHeader>
                <CardTitle>Confirmar Solicitud</CardTitle>
                <CardDescription>Revisa los detalles antes de enviar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border">
                  {[
                    { label: "Tipo de Préstamo", value: selectedLoanType?.label ?? "" },
                    { label: "Monto Solicitado", value: formatCurrency(parsedAmount), highlight: true },
                    { label: "Solicitante", value: user?.nombreCompleto ?? "" },
                    { label: "Identificación", value: user?.idIdentificacion ?? "", mono: true },
                    { label: "Tipo Cliente", value: user?.rol.includes("EMPRESA") ? "Empresa" : "Persona Natural" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className={`text-sm font-medium ${item.highlight ? "text-primary font-bold font-numeric text-base" : item.mono ? "font-mono text-foreground" : "text-foreground"}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-300">
                    Tu solicitud será revisada por un analista. El proceso puede tomar entre 1 y 3 días hábiles.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("amount")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    variant="banking"
                    onClick={() => createMutation.mutate()}
                    loading={createMutation.isPending}
                  >
                    <Landmark className="w-4 h-4" />
                    Enviar Solicitud
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SUCCESS */}
        {step === "success" && createdId && (
          <motion.div
            key="success"
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
                  <h2 className="text-2xl font-bold text-foreground mb-2">¡Solicitud Enviada!</h2>
                  <p className="text-muted-foreground text-sm">
                    Tu solicitud de préstamo fue registrada y está en proceso de revisión.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/50 border border-border inline-block mx-auto">
                  <p className="text-xs text-muted-foreground">ID de Solicitud</p>
                  <p className="text-2xl font-bold font-mono text-primary">#{createdId}</p>
                </div>

                <div className="flex gap-3 justify-center">
                  <Link href={`/loans/${createdId}`}>
                    <Button variant="outline">Ver Detalle</Button>
                  </Link>
                  <Link href="/loans">
                    <Button variant="banking">Mis Préstamos</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
