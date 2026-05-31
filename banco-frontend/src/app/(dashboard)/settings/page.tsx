"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Settings,
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { useNotification } from "@/hooks/useNotification";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, getRoleLabel } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { notify } = useNotification();
  const router = useRouter();

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    passwordActual: "",
    passwordNuevo: "",
    passwordConfirmacion: "",
  });

  const changePwdMutation = useMutation({
    mutationFn: () => authService.changePassword(pwdForm),
    onSuccess: () => {
      notify({
        title: "Contraseña actualizada",
        message: "Tu contraseña fue cambiada. Por seguridad, inicia sesión nuevamente.",
        type: "success",
      });
      setPwdForm({ passwordActual: "", passwordNuevo: "", passwordConfirmacion: "" });
      // El backend revoca todos los tokens al cambiar la contraseña.
      // Limpiamos el estado local y redirigimos al login.
      setTimeout(() => {
        authService.logout().catch(() => {}).finally(() => {
          router.replace("/login");
        });
      }, 1500);
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Contraseña actual incorrecta o nueva contraseña inválida";
      notify({ title: "Error al cambiar contraseña", message: msg, type: "error" });
    },
  });

  const isPasswordValid =
    pwdForm.passwordActual.length > 0 &&
    pwdForm.passwordNuevo.length >= 8 &&
    /[A-Z]/.test(pwdForm.passwordNuevo) &&
    /[0-9]/.test(pwdForm.passwordNuevo) &&
    /[^A-Za-z0-9]/.test(pwdForm.passwordNuevo) &&
    pwdForm.passwordNuevo === pwdForm.passwordConfirmacion;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Configuración"
        subtitle="Gestiona tu perfil y preferencias"
        icon={Settings}
      />

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Información de Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user && [
              { label: "Nombre Completo", value: user.nombreCompleto },
              { label: "Correo Electrónico", value: user.correoElectronico },
              { label: "Identificación", value: user.idIdentificacion, mono: true },
              { label: "Teléfono", value: user.telefono ?? "—" },
              { label: "Rol", value: getRoleLabel(user.rol), badge: false, roleLabel: true },
              { label: "Estado", value: user.estadoUsuario, badge: true },
              { label: "Miembro desde", value: formatDate(user.fechaCreacion) },
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

      {/* Change password */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>Mínimo 8 caracteres con al menos 1 mayúscula, 1 número y 1 carácter especial (ej: Banco2026!)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "passwordActual", label: "Contraseña Actual", show: showCurrentPwd, toggle: () => setShowCurrentPwd((v) => !v) },
              { key: "passwordNuevo", label: "Nueva Contraseña", show: showNewPwd, toggle: () => setShowNewPwd((v) => !v) },
              { key: "passwordConfirmacion", label: "Confirmar Nueva Contraseña", show: showConfirmPwd, toggle: () => setShowConfirmPwd((v) => !v) },
            ].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.show ? "text" : "password"}
                    value={pwdForm[field.key as keyof typeof pwdForm]}
                    onChange={(e) => setPwdForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full h-10 px-3 pr-10 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={field.toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            {/* Password strength indicator */}
            {pwdForm.passwordNuevo && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        pwdForm.passwordNuevo.length >= i * 3
                          ? i <= 1
                            ? "bg-red-500"
                            : i <= 2
                            ? "bg-orange-500"
                            : i <= 3
                            ? "bg-yellow-500"
                            : "bg-emerald-500"
                          : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pwdForm.passwordNuevo.length < 6
                    ? "Muy débil"
                    : pwdForm.passwordNuevo.length < 9
                    ? "Débil"
                    : pwdForm.passwordNuevo.length < 12
                    ? "Moderada"
                    : "Fuerte"}
                </p>
              </div>
            )}

            <Button
              variant="banking"
              className="w-full gap-2"
              onClick={() => changePwdMutation.mutate()}
              loading={changePwdMutation.isPending}
              disabled={!isPasswordValid}
            >
              <CheckCircle2 className="w-4 h-4" />
              Actualizar Contraseña
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Apariencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Tema</p>
                <p className="text-xs text-muted-foreground">
                  Actualmente: {theme === "dark" ? "Oscuro" : "Claro"}
                </p>
              </div>
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => theme !== t && toggleTheme()}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      theme === t
                        ? "bg-primary text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "dark" ? "🌙 Oscuro" : "☀️ Claro"}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card glass>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Autenticación", value: "JWT con refresh automático" },
              { label: "Sesión", value: "Expira automáticamente por inactividad" },
              { label: "Tokens", value: "Almacenados de forma segura en sesión" },
              { label: "Cifrado", value: "HTTPS en todas las comunicaciones" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm text-foreground">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
