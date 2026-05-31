"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Column<any>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  totalElements?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  rowKey?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No hay datos disponibles",
  totalElements,
  page = 0,
  pageSize = 20,
  onPageChange,
  rowKey,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const totalPages = totalElements ? Math.ceil(totalElements / pageSize) : 1;

  const getCellValue = (row: T, key: string): unknown => {
    return key.split(".").reduce((obj: unknown, k) => {
      if (obj && typeof obj === "object") return (obj as Record<string, unknown>)[k];
      return undefined;
    }, row);
  };

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          {/* Head */}
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.width && `w-[${col.width}]`
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Inbox className="w-10 h-10 opacity-30" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <motion.tr
                  key={rowKey ? rowKey(row) : i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors duration-150",
                    onRowClick && "cursor-pointer hover:bg-secondary/50"
                  )}
                >
                  {columns.map((col) => {
                    const value = getCellValue(row, String(col.key));
                    return (
                      <td
                        key={String(col.key)}
                        className={cn(
                          "px-4 py-3 text-sm text-foreground whitespace-nowrap",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right font-numeric"
                        )}
                      >
                        {col.render ? col.render(value, row) : String(value ?? "—")}
                      </td>
                    );
                  })}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && totalElements !== undefined && totalElements > pageSize && (
        <div className="flex items-center justify-between px-2 py-3">
          <p className="text-xs text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium text-foreground">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)}
            </span>{" "}
            de{" "}
            <span className="font-medium text-foreground">{totalElements}</span> registros
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-3 py-1 text-xs font-medium text-foreground bg-secondary rounded-lg">
              {page + 1} / {totalPages}
            </span>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
