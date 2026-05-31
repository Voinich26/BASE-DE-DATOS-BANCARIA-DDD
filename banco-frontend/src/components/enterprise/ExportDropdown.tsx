"use client";

import React, { useState } from "react";
import { Download, FileText, FileSpreadsheet, Printer, ChevronDown, Table2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ExportFormat } from "@/lib/export";

interface ExportOption {
  label: string;
  format: ExportFormat;
  icon: React.ElementType;
  description: string;
}

const OPTIONS: ExportOption[] = [
  {
    label: "Exportar CSV",
    format: "csv",
    icon: Table2,
    description: "Valores separados por coma",
  },
  {
    label: "Exportar Excel",
    format: "xlsx",
    icon: FileSpreadsheet,
    description: "Compatible con Microsoft Excel",
  },
  {
    label: "Exportar PDF",
    format: "pdf",
    icon: FileText,
    description: "Documento con formato bancario",
  },
  {
    label: "Imprimir",
    format: "print",
    icon: Printer,
    description: "Enviar a impresora",
  },
];

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void;
  loading?: boolean;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export function ExportDropdown({
  onExport,
  loading,
  className,
  disabled,
  label = "Exportar",
}: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setOpen(false);
    try {
      await Promise.resolve(onExport(format));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen((v) => !v)}
        disabled={loading || disabled || exporting !== null}
      >
        <Download className={cn("w-3.5 h-3.5", exporting && "animate-bounce")} />
        {exporting ? "Exportando..." : label}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute right-0 top-full mt-1 z-50",
                "w-56 rounded-xl border border-border bg-card shadow-xl",
                "overflow-hidden"
              )}
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Formato de exportación
                </p>
              </div>
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.format}
                    onClick={() => handleExport(opt.format)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-secondary transition-colors group"
                  >
                    <div className="p-1.5 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
