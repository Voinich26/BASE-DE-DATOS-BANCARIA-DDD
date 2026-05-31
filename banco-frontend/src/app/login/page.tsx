"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  AlertCircle,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractErrorMessage } from "@/services/api";
import type { Metadata } from "next";

// ── Validation schema ─────────────────────────────────────────────────────────

const loginSchema = z.object({
  correoElectronico: z
    .string()
    .min(1, "El correo es requerido")
    .email("Ingrese un correo válido"),
  password: z
    .string()
    .min(1, "La contraseña es requerida")
    .min(6, "Mínimo 6 caracteres"),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ── Floating particles background ────────────────────────────────────────────

function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Feature list ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Shield, text: "Autenticación JWT con rotación de tokens" },
  { icon: Wifi, text: "Arquitectura DDD + Hexagonal" },
  { icon: Building2, text: "RBAC granular por roles bancarios" },
];

// ── Login Page ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Leer redirect param del middleware
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const redirectTo = searchParams?.get("redirect") ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      correoElectronico: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const authData = await authService.login(
        {
          correoElectronico: data.correoElectronico,
          password: data.password,
        },
        data.remember
      );

      // Fetch full profile
      const user = await authService.me();
      setUser(user);

      toast.success(`Bienvenido, ${authData.nombreCompleto.split(" ")[0]}`, {
        description: `Sesión iniciada como ${authData.rol}`,
      });

      router.replace(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    } catch (error) {
      const msg = extractErrorMessage(error);
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* ── Left panel — branding ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-banking flex-col justify-between p-12 overflow-hidden">
        <FloatingParticles />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-blue shadow-glow-blue">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">BancoDDD</h1>
            <p className="text-xs text-white/50">Enterprise Banking Platform</p>
          </div>
        </motion.div>

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 space-y-6"
        >
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Banca empresarial
              <br />
              <span className="gradient-text">de siguiente nivel</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              Gestión financiera enterprise con arquitectura DDD, seguridad
              bancaria y trazabilidad completa de operaciones.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10">
                  <f.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm text-white/70">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative z-10 flex gap-8"
        >
          {[
            { value: "7", label: "Roles RBAC" },
            { value: "40+", label: "Endpoints REST" },
            { value: "100%", label: "Trazabilidad" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/50">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right panel — login form ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-blue shadow-glow-blue">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">BancoDDD</h1>
              <p className="text-xs text-muted-foreground">Enterprise Banking</p>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Iniciar sesión</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Ingrese sus credenciales para acceder al sistema
            </p>
          </div>

          {/* Error alert */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="usuario@banco.com"
              autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.correoElectronico?.message}
              {...register("correoElectronico")}
            />

            {/* Password */}
            <Input
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              error={errors.password?.message}
              {...register("password")}
            />

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-border bg-secondary accent-primary cursor-pointer"
                {...register("remember")}
              />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Mantener sesión iniciada
              </label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="banking"
              size="lg"
              className="w-full"
              loading={isSubmitting}
            >
              {!isSubmitting && (
                <>
                  Iniciar sesión
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
              {isSubmitting && "Verificando credenciales..."}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border"
          >
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Credenciales de prueba
            </p>
            <div className="space-y-1">
              {[
                { role: "Admin", email: "admin@banco.com", pass: "Banco2026!" },
                { role: "Supervisor", email: "supervisor@banco.com", pass: "Banco2026!" },
                { role: "Analista", email: "analista@banco.com", pass: "Banco2026!" },
              ].map((cred) => (
                <div key={cred.role} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{cred.role}:</span>
                  <span className="font-mono text-foreground/70">{cred.email}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground/60 mt-1">
                Contraseña: <span className="font-mono">Banco2026!</span>
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            © 2026 BancoDDD · Plataforma bancaria enterprise
          </p>
        </motion.div>
      </div>
    </div>
  );
}
