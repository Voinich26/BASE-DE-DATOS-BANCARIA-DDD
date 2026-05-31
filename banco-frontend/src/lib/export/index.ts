/**
 * Enterprise Export Library
 * Supports CSV, XLSX (via CSV with BOM), PDF (via print), and direct print
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "xlsx" | "pdf" | "print";

export interface ExportColumn<T> {
  header: string;
  key: keyof T | string;
  width?: number;
  format?: (value: unknown, row: T) => string;
}

export interface ExportOptions<T> {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  data: T[];
  metadata?: Record<string, string>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNestedValue(obj: unknown, key: string): unknown {
  return key.split(".").reduce((acc: unknown, k) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

function formatValue<T>(col: ExportColumn<T>, row: T): string {
  const raw = getNestedValue(row, col.key as string);
  if (col.format) return col.format(raw, row);
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "number") return raw.toString();
  if (raw instanceof Date) return raw.toLocaleDateString("es-CO");
  return String(raw);
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export function exportToCSV<T>(options: ExportOptions<T>): void {
  const { filename, columns, data, title, metadata } = options;

  const rows: string[] = [];

  // Optional metadata header
  if (title) {
    rows.push(escapeCsvCell(title));
    rows.push("");
  }
  if (metadata) {
    Object.entries(metadata).forEach(([k, v]) => {
      rows.push(`${escapeCsvCell(k)},${escapeCsvCell(v)}`);
    });
    rows.push("");
  }

  // Column headers
  rows.push(columns.map((c) => escapeCsvCell(c.header)).join(","));

  // Data rows
  for (const row of data) {
    rows.push(columns.map((col) => escapeCsvCell(formatValue(col, row))).join(","));
  }

  // BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const csvContent = bom + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

// ── XLSX Export (CSV with .xlsx extension — opens in Excel) ───────────────────

export function exportToXLSX<T>(options: ExportOptions<T>): void {
  // For a true XLSX we'd need a library like xlsx or exceljs.
  // We export a tab-separated CSV with .xlsx extension which Excel opens natively.
  const { filename, columns, data, title, metadata } = options;

  const rows: string[] = [];

  if (title) {
    rows.push(title);
    rows.push("");
  }
  if (metadata) {
    Object.entries(metadata).forEach(([k, v]) => {
      rows.push(`${k}\t${v}`);
    });
    rows.push("");
  }

  rows.push(columns.map((c) => c.header).join("\t"));

  for (const row of data) {
    rows.push(columns.map((col) => formatValue(col, row)).join("\t"));
  }

  const bom = "\uFEFF";
  const content = bom + rows.join("\n");
  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, `${filename}.xlsx`);
}

// ── PDF Export (via browser print with styled HTML) ───────────────────────────

export function exportToPDF<T>(options: ExportOptions<T>): void {
  const { filename, columns, data, title, subtitle, metadata } = options;

  const metaRows = metadata
    ? Object.entries(metadata)
        .map(([k, v]) => `<tr><td class="meta-key">${k}</td><td class="meta-val">${v}</td></tr>`)
        .join("")
    : "";

  const headerCells = columns.map((c) => `<th>${c.header}</th>`).join("");
  const dataRows = data
    .map(
      (row) =>
        `<tr>${columns.map((col) => `<td>${formatValue(col, row)}</td>`).join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title ?? filename}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 24px; }
    .header { border-bottom: 2px solid #1a8fe6; padding-bottom: 12px; margin-bottom: 16px; }
    .bank-name { font-size: 18px; font-weight: 700; color: #1a8fe6; letter-spacing: -0.5px; }
    .report-title { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-top: 4px; }
    .report-subtitle { font-size: 11px; color: #666; margin-top: 2px; }
    .meta-table { margin-bottom: 16px; border-collapse: collapse; }
    .meta-table td { padding: 2px 8px 2px 0; }
    .meta-key { font-weight: 600; color: #444; min-width: 140px; }
    .meta-val { color: #222; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead tr { background: #1a8fe6; color: white; }
    thead th { padding: 8px 10px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #e8f4fd; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #999; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="bank-name">🏦 Banco DDD</div>
    ${title ? `<div class="report-title">${title}</div>` : ""}
    ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ""}
  </div>
  ${metaRows ? `<table class="meta-table"><tbody>${metaRows}</tbody></table>` : ""}
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${dataRows}</tbody>
  </table>
  <div class="footer">
    <span>Banco DDD — Sistema Bancario Enterprise</span>
    <span>Generado: ${new Date().toLocaleString("es-CO")}</span>
    <span>Total registros: ${data.length}</span>
  </div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ── Print ─────────────────────────────────────────────────────────────────────

export function printTable<T>(options: ExportOptions<T>): void {
  exportToPDF(options);
}

// ── Universal export dispatcher ───────────────────────────────────────────────

export function exportData<T>(format: ExportFormat, options: ExportOptions<T>): void {
  switch (format) {
    case "csv":
      exportToCSV(options);
      break;
    case "xlsx":
      exportToXLSX(options);
      break;
    case "pdf":
      exportToPDF(options);
      break;
    case "print":
      printTable(options);
      break;
  }
}

// ── Blob download helper ──────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── Pre-built column definitions ──────────────────────────────────────────────

import type {
  CuentaBancariaResponse,
  TransferenciaResponse,
  PrestamoResponse,
  LoteTransferenciaResponse,
  UsuarioResponse,
} from "@/types/api.types";

export const ACCOUNT_COLUMNS: ExportColumn<CuentaBancariaResponse>[] = [
  { header: "Número de Cuenta", key: "numeroCuenta" },
  { header: "Tipo", key: "tipoCuenta" },
  { header: "Titular", key: "idTitular" },
  { header: "Tipo Titular", key: "tipoTitular" },
  {
    header: "Saldo Actual",
    key: "saldoActual",
    format: (v) =>
      new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(
        Number(v)
      ),
  },
  { header: "Moneda", key: "codigoIsoMoneda" },
  { header: "Estado", key: "estadoCuenta" },
  { header: "Fecha Apertura", key: "fechaApertura" },
];

export const TRANSFER_COLUMNS: ExportColumn<TransferenciaResponse>[] = [
  { header: "ID", key: "idTransferencia" },
  { header: "Cuenta Origen", key: "cuentaOrigen" },
  { header: "Cuenta Destino", key: "cuentaDestino" },
  {
    header: "Monto",
    key: "monto",
    format: (v) =>
      new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(
        Number(v)
      ),
  },
  { header: "Estado", key: "estadoTransferencia" },
  { header: "Creador", key: "nombreUsuarioCreador" },
  { header: "Fecha Creación", key: "fechaCreacion" },
  { header: "Fecha Aprobación", key: "fechaAprobacion" },
];

export const LOAN_COLUMNS: ExportColumn<PrestamoResponse>[] = [
  { header: "ID", key: "idPrestamo" },
  { header: "Tipo", key: "tipoPrestamo" },
  { header: "Cliente", key: "idClienteSolicitante" },
  {
    header: "Monto Solicitado",
    key: "montoSolicitado",
    format: (v) =>
      new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(
        Number(v)
      ),
  },
  {
    header: "Monto Aprobado",
    key: "montoAprobado",
    format: (v) =>
      v != null
        ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(
            Number(v)
          )
        : "—",
  },
  { header: "Tasa Interés", key: "tasaInteres", format: (v) => (v != null ? `${v}%` : "—") },
  { header: "Plazo (meses)", key: "plazoMeses" },
  { header: "Estado", key: "estadoPrestamo" },
  { header: "Fecha Solicitud", key: "fechaSolicitud" },
];

export const BATCH_COLUMNS: ExportColumn<LoteTransferenciaResponse>[] = [
  { header: "ID Lote", key: "idLote" },
  { header: "Empresa (NIT)", key: "nitEmpresa" },
  { header: "Razón Social", key: "razonSocialEmpresa" },
  { header: "Concepto", key: "concepto" },
  { header: "Estado", key: "estadoLote" },
  { header: "Total Ítems", key: "totalItems" },
  { header: "Ítems Exitosos", key: "itemsExitosos" },
  { header: "Ítems Fallidos", key: "itemsFallidos" },
  {
    header: "Monto Total",
    key: "montoTotal",
    format: (v) =>
      new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(
        Number(v)
      ),
  },
  { header: "Creador", key: "nombreUsuarioCreador" },
  { header: "Fecha Creación", key: "fechaCreacion" },
];

export const USER_COLUMNS: ExportColumn<UsuarioResponse>[] = [
  { header: "ID", key: "idUsuario" },
  { header: "Nombre Completo", key: "nombreCompleto" },
  { header: "Correo", key: "correoElectronico" },
  { header: "Identificación", key: "idIdentificacion" },
  { header: "Teléfono", key: "telefono" },
  { header: "Rol", key: "rol" },
  { header: "Estado", key: "estadoUsuario" },
  { header: "Fecha Creación", key: "fechaCreacion" },
];
