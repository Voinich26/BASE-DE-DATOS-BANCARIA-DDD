"use client";

import { ShieldCheck } from "lucide-react";
import { StatusPage } from "@/components/errors/StatusPage";

export default function MaintenancePage() {
  return (
    <StatusPage
      icon={ShieldCheck}
      title="Mantenimiento programado"
      subtitle="Servicio temporalmente restringido"
      description="La plataforma bancaría está recibiendo mejoras de infraestructura. Regrese en unos minutos para continuar con sus operaciones financieras." 
      ctaLabel="Regresar al inicio"
      ctaHref="/"
      details={
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>• Nuestro equipo está reforzando la estabilidad y seguridad.</li>
          <li>• Sus datos permanecen seguros mientras realizamos los ajustes.</li>
          <li>• Actualice esta página después de 5 minutos para comprobar el estado.</li>
        </ul>
      }
    />
  );
}
