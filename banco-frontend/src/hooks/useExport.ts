import { useCallback } from "react";
import { exportData, type ExportFormat, type ExportOptions } from "@/lib/export";

interface ExportColumn {
  key: string;
  header: string;
  format?: (value: unknown) => string;
}

interface UseExportOptions {
  filename?: string;
  columns: ExportColumn[];
}

/**
 * Reusable export hook for enterprise-grade export flows.
 */
export function useExport<T extends Record<string, unknown>>(
  data: T[],
  options: UseExportOptions
) {
  const { filename = "export", columns } = options;

  const exportToFormat = useCallback(
    (format: ExportFormat) => {
      exportData(format, {
        filename,
        columns: columns.map((column) => ({
          ...column,
          key: column.key,
        })),
        data,
      } as ExportOptions<T>);
    },
    [columns, data, filename]
  );

  const exportCSV = useCallback(() => exportToFormat("csv"), [exportToFormat]);
  const exportPrint = useCallback(() => exportToFormat("print"), [exportToFormat]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      exportToFormat(format);
    },
    [exportToFormat]
  );

  return { handleExport, exportCSV, exportPrint };
}
