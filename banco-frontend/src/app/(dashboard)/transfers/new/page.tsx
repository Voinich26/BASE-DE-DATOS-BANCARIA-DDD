"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";
import { accountService } from "@/services/account.service";
import { transferService } from "@/services/transfer.service";
import { useAuthStore } from "@/store/auth.store";
import { useNotification } from "@/hooks/useNotification";
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, maskAccountNumber } from "@/lib/utils";
import Link from "next/link";

// ── Steps ─────────────────────────────────────────────────────────────────────

type Step = "origin" | "destination" | "amount" | "confirm" | "success";

const STEPS: { id: Step; label: string }[] = [
  { id: "origin", label: "Origen" },
  { id: "destination", label: "Destino" },
  { id: "amount", label: "Monto" },
  { id: "confirm", label: "Confirmar" },
];

const STEP_INDEX: Record<Step, number> = {
  origin: 0,
  destination: 1,
  amount: 2,
  confirm: 3,
  success: 4,
};

// ── Page ──────────────────────────────────────────────────────────────────────

function NewTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { notify } = useNotification();

  const [step, setStep] = useState<Step>("origin");
  const [originAccount, setOriginAccount] = useState(searchParams.get("from") ?? "");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [createdTransfer, setCreatedTransfer] = useState<{ id: number; requiresApproval: boolean } | null>(null);

  const debouncedDest = useDebounce(destinationSearch, 400);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: dashboard } = useQuery({
    queryKey: ["accounts", "dashboard"],
    queryFn: () => accountService.getDashboard(),
  });

  const { data: destAccount, isLoading: loadingDest, error: destError } = useQuery({
    queryKey: ["account-lookup", debouncedDest],
    queryFn: () => accountService.getByNumber(debouncedDest),
    enabled: debouncedDest.length > 5,
    retry: false,
  });

  // ── Derived ──────────────────────────────────────────────────────────────────

  const myAccounts = dashboard?.cuentas?.filter((a) => a.estadoCuenta === "Activa") ?? [];
  const selectedOrigin = myAccounts.find((a) => a.numeroCuenta === originAccount);
  const parsedAmount = parseFloat(amount) || 0;
  const hasEnoughBalance = selectedOrigin ? selectedOrigin.saldoActual >= parsedAmount : false;
  const requiresApproval = parsedAmount > 1000000; // threshold example

  // ── Mutation ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      transferService.create({
        cuentaOrigen: originAccount,
        cuentaDestino: destinationAccount,
        monto: parsedAmount,
        idUsuarioCreador: user!.idUsuario,
      }),
    onSuccess: (data) => {
      setCreatedTransfer({
        id: data.idTransferencia,
        requiresApproval: data.requiereAprobacion,
      });
      setStep("success");
      notify({
        title: "Transferencia creada",
        message: `Transferencia #${data.idTransferencia} procesada exitosamente`,
        type: "success",
      });
    },
    onError: () =>
      notify({ title: "Error", message: "No se pudo procesar la transferencia", type: "error" }),
  });

  const currentStepIndex = STEP_INDEX[step];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Nueva Transferencia</h1>
          <p className="text-xs text-muted-foreground">Transferencia bancaria segura</p>
        </div>
      </div>

      {/* ── Step indicator ─────────────────────────────────────────────────── */}
      {step !== "success" && (
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 ${
                    i < currentStepIndex
                      ? "bg-emerald-500 text-white"
                      : i === currentStepIndex
                      ? "bg-primary text-white ring-2 ring-primary/30"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i < currentStepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    i === currentStepIndex ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                    i < currentStepIndex ? "bg-emerald-500/50" : "bg-border"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Step content ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* STEP 1: Origin */}
        {step === "origin" && (
          <motion.div
            key="origin"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card glass>
              <CardHeader>
                <CardTitle>Cuenta de Origen</CardTitle>
                <CardDescription>Selecciona la cuenta desde donde enviarás el dinero</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {myAccounts.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <CreditCard className="w-8 h-8 opacity-30 mx-auto mb-2" />
                    <p className="text-sm">No tienes cuentas activas disponibles</p>
                  </div>
                ) : (
                  myAccounts.map((account) => (
                    <button
                      key={account.numeroCuenta}
                      onClick={() => setOriginAccount(account.numeroCuenta)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                        originAccount === account.numeroCuenta
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono font-medium text-foreground">
                          {maskAccountNumber(account.numeroCuenta)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.tipoCuenta} · {account.codigoIsoMoneda}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold font-numeric text-foreground">
                          {formatCurrency(account.saldoActual, account.codigoIsoMoneda)}
                        </p>
                        <StatusBadge status={account.estadoCuenta} className="text-[10px]" />
                      </div>
                      {originAccount === account.numeroCuenta && (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}

                <Button
                  className="w-full mt-2 gap-2"
                  variant="banking"
                  disabled={!originAccount}
                  onClick={() => setStep("destination")}
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 2: Destination */}
        {step === "destination" && (
          <motion.div
            key="destination"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card glass>
              <CardHeader>
                <CardTitle>Cuenta de Destino</CardTitle>
                <CardDescription>Ingresa el número de cuenta del beneficiario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Número de cuenta destino
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej: 001-123456-01"
                      value={destinationSearch}
                      onChange={(e) => {
                        setDestinationSearch(e.target.value);
                        setDestinationAccount(e.target.value);
                      }}
                      className="w-full h-11 px-4 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                    />
                    {loadingDest && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Destination account preview */}
                <AnimatePresence>
                  {destAccount && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Cuenta encontrada</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {destAccount.tipoCuenta} · {destAccount.codigoIsoMoneda}
                        </p>
                      </div>
                      <StatusBadge status={destAccount.estadoCuenta} />
                    </motion.div>
                  )}
                  {destError && debouncedDest.length > 5 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-300">Cuenta no encontrada o inactiva</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("origin")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    variant="banking"
                    disabled={!destinationAccount || destinationAccount === originAccount}
                    onClick={() => setStep("amount")}
                  >
                    Continuar <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: Amount */}
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
                <CardTitle>Monto a Transferir</CardTitle>
                <CardDescription>
                  Saldo disponible:{" "}
                  <span className="text-foreground font-semibold font-numeric">
                    {selectedOrigin ? formatCurrency(selectedOrigin.saldoActual, selectedOrigin.codigoIsoMoneda) : "—"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Monto</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-14 pl-8 pr-4 text-2xl font-bold rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-numeric"
                    />
                  </div>
                </div>

                {/* Validation messages */}
                <AnimatePresence>
                  {parsedAmount > 0 && !hasEnoughBalance && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-300">Saldo insuficiente</p>
                    </motion.div>
                  )}
                  {parsedAmount > 0 && hasEnoughBalance && requiresApproval && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20"
                    >
                      <Info className="w-4 h-4 text-yellow-400 shrink-0" />
                      <p className="text-xs text-yellow-300">
                        Este monto requiere aprobación de un supervisor
                      </p>
                    </motion.div>
                  )}
                  {parsedAmount > 0 && hasEnoughBalance && !requiresApproval && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-300">
                        Transferencia automática — se ejecutará inmediatamente
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("destination")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    variant="banking"
                    disabled={!parsedAmount || parsedAmount <= 0 || !hasEnoughBalance}
                    onClick={() => setStep("confirm")}
                  >
                    Revisar <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 4: Confirm */}
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
                <CardTitle>Confirmar Transferencia</CardTitle>
                <CardDescription>Revisa los detalles antes de enviar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border">
                  {[
                    { label: "Cuenta Origen", value: maskAccountNumber(originAccount), mono: true },
                    { label: "Cuenta Destino", value: maskAccountNumber(destinationAccount), mono: true },
                    { label: "Monto", value: formatCurrency(parsedAmount), highlight: true },
                    {
                      label: "Tipo",
                      value: requiresApproval ? "Requiere Aprobación" : "Automática",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span
                        className={`text-sm font-medium ${
                          item.highlight
                            ? "text-primary font-bold font-numeric text-base"
                            : item.mono
                            ? "font-mono text-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {requiresApproval && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                    <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300">
                      Esta transferencia quedará en estado "En Espera de Aprobación" hasta que un supervisor la autorice.
                    </p>
                  </div>
                )}

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
                    <ArrowLeftRight className="w-4 h-4" />
                    Enviar Transferencia
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* SUCCESS */}
        {step === "success" && createdTransfer && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
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
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    ¡Transferencia Exitosa!
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {createdTransfer.requiresApproval
                      ? "Tu transferencia está en espera de aprobación de un supervisor."
                      : "Tu transferencia fue procesada y ejecutada exitosamente."}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/50 border border-border inline-block mx-auto">
                  <p className="text-xs text-muted-foreground">ID de Transferencia</p>
                  <p className="text-2xl font-bold font-mono text-primary">
                    #{createdTransfer.id}
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  <Link href={`/transfers/${createdTransfer.id}`}>
                    <Button variant="outline" className="gap-2">
                      Ver Detalle
                    </Button>
                  </Link>
                  <Link href="/transfers/new">
                    <Button variant="banking" className="gap-2" onClick={() => {
                      setStep("origin");
                      setOriginAccount("");
                      setDestinationAccount("");
                      setDestinationSearch("");
                      setAmount("");
                      setCreatedTransfer(null);
                    }}>
                      Nueva Transferencia
                    </Button>
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

export default function NewTransferPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-secondary/50 rounded-xl animate-pulse" />
        <div className="h-64 w-full bg-secondary/50 rounded-2xl animate-pulse" />
      </div>
    }>
      <NewTransferContent />
    </Suspense>
  );
}
