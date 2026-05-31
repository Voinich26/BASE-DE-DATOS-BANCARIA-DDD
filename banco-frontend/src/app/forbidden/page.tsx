"use client";

import { Slash } from "lucide-react";
import { StatusPage } from "@/components/errors/StatusPage";

export default function ForbiddenPage() {
  return (
    <StatusPage
      icon={Slash}
      title="Acceso prohibido"
      subtitle="403 — Permisos insuficientes"
      description="No tiene autorización para ver esta sección. Si cree que debería tener acceso, contacte al administrador de seguridad de su organización." 
      ctaLabel="Volver al panel"
      ctaHref="/dashboard"
      details={
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>• Su rol actual no está autorizado para esta operación.</li>
          <li>• La seguridad del banco bloquea acciones fuera de su perfil.</li>
          <li>• Para cambios de permiso, solicite revisión de acceso.</li>
        </ul>
      }
    />
  );
}
