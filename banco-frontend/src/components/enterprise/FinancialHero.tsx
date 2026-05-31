"use client";

import React from "react";
import { motion } from "framer-motion";
import { CreditCard, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface FinancialHeroProps {
  accountNumber: string;
  accountType: string;
  balance: number;
  currency: string;
  status: string;
  ownerName?: string;
  ownerId?: string;
  openDate?: string;
  trend?: number;
  className?: string;
}

export function FinancialHero({
  accountNumber,
  accountType,
  balance,
  currency,
  status,
  ownerName,
  ownerId,
  openDate,
  trend,
  className,
}: FinancialHeroProps) {
  const isActive = status === "Activa";

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 md:p-8",
        "bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-cyan-500/10",
        "border border-blue-500/20",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-cyan-500/5 blur-2xl" />
        {/* Card chip decoration */}
        <div className="absolute top-6 right-6 opacity-5">
          <CreditCard className="w-32 h-32 text-white" />
        </div>
      </div>

      <div className="relative z-10">
        {/* Top row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs font-medium text-blue-300/80 uppercase tracking-wider">
                {accountType}
              </span>
            </div>
            <p className="text-sm font-mono text-muted-foreground tracking-widest">
              {accountNumber}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Balance */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
            Saldo Disponible
          </p>
          <div className="flex items-end gap-3">
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-4xl md:text-5xl font-bold text-foreground font-numeric tracking-tight"
            >
              {formatCurrency(balance, currency)}
            </motion.p>
            {trend !== undefined && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full mb-1",
                  trend > 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : trend < 0
                    ? "bg-red-500/15 text-red-400"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {trend > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{currency}</p>
        </div>

        {/* Bottom info */}
        <div className="flex items-center gap-6 flex-wrap">
          {ownerName && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Titular
              </p>
              <p className="text-sm font-medium text-foreground">{ownerName}</p>
            </div>
          )}
          {ownerId && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                ID Titular
              </p>
              <p className="text-sm font-mono text-foreground">{ownerId}</p>
            </div>
          )}
          {openDate && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Apertura
              </p>
              <p className="text-sm text-foreground">{openDate}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
