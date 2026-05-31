"use client";

import React from "react";
import { X, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FilterOption {
  key: string;
  label: string;
  value: string;
  color?: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface SmartFiltersProps {
  groups: FilterGroup[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function SmartFilters({
  groups,
  activeFilters,
  onFilterChange,
  onClearAll,
  className,
}: SmartFiltersProps) {
  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter groups */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros:</span>
        </div>

        {groups.map((group) => (
          <div key={group.key} className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">{group.label}:</span>
            {group.options.map((opt) => {
              const isActive = activeFilters[group.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() =>
                    onFilterChange(group.key, isActive ? "" : opt.value)
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ))}

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
          >
            <X className="w-3 h-3" />
            Limpiar ({activeCount})
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      <AnimatePresence>
        {activeCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 flex-wrap"
          >
            {groups.map((group) => {
              const val = activeFilters[group.key];
              if (!val) return null;
              const opt = group.options.find((o) => o.value === val);
              if (!opt) return null;
              return (
                <motion.span
                  key={group.key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary/15 text-primary border border-primary/20"
                >
                  <span className="text-primary/60">{group.label}:</span>
                  {opt.label}
                  <button
                    onClick={() => onFilterChange(group.key, "")}
                    className="hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
