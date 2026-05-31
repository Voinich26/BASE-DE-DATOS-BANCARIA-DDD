"use client";

import React, { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    cell: (item: T) => React.ReactNode;
    width?: number;
  }[];
  height?: number;
  rowHeight?: number;
  className?: string;
}

/**
 * Componente de tabla virtualizada para optimizar rendimiento con datasets grandes
 * Enterprise performance feature
 */
export function VirtualizedTable<T>({
  data,
  columns,
  height = 400,
  rowHeight = 50,
  className = "",
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || 150), 0);
  }, [columns]);

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex bg-secondary/50 border-b"
        style={{ width: totalWidth }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-3 text-sm font-semibold text-foreground"
            style={{ width: column.width || 150 }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow: any) => {
            const item = data[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={(el) => virtualizer.measureElement(el)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className="flex border-b hover:bg-secondary/30 transition-colors"
                  style={{ width: totalWidth }}
                >
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className="px-4 py-3 text-sm text-foreground"
                      style={{ width: column.width || 150 }}
                    >
                      {column.cell(item)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {data.length === 0 && (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <p className="text-sm">No hay datos disponibles</p>
        </div>
      )}
    </div>
  );
}
