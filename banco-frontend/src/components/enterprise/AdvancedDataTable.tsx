"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export interface AdvancedColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  width?: string;
  sticky?: boolean;
}

interface AdvancedDataTableProps<T = Record<string, unknown>> {
  columns: AdvancedColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  totalElements?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  selectedRows?: Set<string>;
  onSelectRow?: (key: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  stickyHeader?: boolean;
  className?: string;
}

export function AdvancedDataTable<T = Record<string, unknown>>({
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
  searchable = false,
  searchPlaceholder = "Buscar...",
  onSearch,
  selectedRows,
  onSelectRow,
  onSelectAll,
  stickyHeader = true,
  className,
}: AdvancedDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const totalPages = totalElements ? Math.ceil(totalElements / pageSize) : 0;
  const hasSelection = !!selectedRows && !!onSelectRow;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    onSearch?.(q);
  };

  const allSelected =
    hasSelection && data.length > 0 && data.every((row) => {
      const key = rowKey ? rowKey(row) : String((row as Record<string, unknown>).id ?? "");
      return selectedRows!.has(key);
    });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search bar */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-full pl-9 pr-3 text-sm rounded-xl border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      )}

      {/* Table wrapper */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Header */}
            <thead
              className={cn(
                "bg-secondary/60 border-b border-border",
                stickyHeader && "sticky top-0 z-10"
              )}
            >
              <tr>
                {hasSelection && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                      className="rounded border-border"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={cn(
                      "px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.sortable && "cursor-pointer hover:text-foreground select-none",
                      col.sticky && "sticky left-0 bg-secondary/60"
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        col.align === "center" && "justify-center",
                        col.align === "right" && "justify-end"
                      )}
                    >
                      {col.header}
                      {col.sortable && (
                        <span className="opacity-50">
                          {sortKey === String(col.key) ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: pageSize > 8 ? 8 : pageSize }).map((_, i) => (
                  <tr key={i} className="bg-card">
                    {hasSelection && (
                      <td className="px-3 py-3">
                        <Skeleton className="h-4 w-4 rounded" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (hasSelection ? 1 : 0)}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {data.map((row, rowIndex) => {
                    const key = rowKey
                      ? rowKey(row)
                      : String((row as Record<string, unknown>).id ?? rowIndex);
                    const isSelected = hasSelection && selectedRows!.has(key);

                    return (
                      <motion.tr
                        key={key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: rowIndex * 0.02 }}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={cn(
                          "bg-card transition-colors duration-150",
                          onRowClick && "cursor-pointer hover:bg-secondary/40",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        {hasSelection && (
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => onSelectRow!(key, e.target.checked)}
                              className="rounded border-border"
                            />
                          </td>
                        )}
                        {columns.map((col) => {
                          const value = (row as Record<string, unknown>)[String(col.key)];
                          return (
                            <td
                              key={String(col.key)}
                              className={cn(
                                "px-4 py-3 text-sm text-foreground whitespace-nowrap",
                                col.align === "center" && "text-center",
                                col.align === "right" && "text-right",
                                col.sticky && "sticky left-0 bg-card"
                              )}
                            >
                              {col.render ? col.render(value, row) : String(value ?? "—")}
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium text-foreground">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements ?? 0)}
            </span>{" "}
            de{" "}
            <span className="font-medium text-foreground">{totalElements}</span>{" "}
            registros
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = page - 2 + i;
              if (p < 0) p = i;
              if (p >= totalPages) p = totalPages - 5 + i;
              if (p < 0 || p >= totalPages) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => onPageChange(p)}
                  className="text-xs"
                >
                  {p + 1}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
