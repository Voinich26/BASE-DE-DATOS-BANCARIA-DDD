"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface SensitiveDataMaskProps {
  value: string | number;
  maskChar?: string;
  showLength?: number;
  className?: string;
  label?: string;
  currency?: string;
}

/**
 * Componente para ocultar/mostrar datos sensibles como balances
 * Enterprise-grade security with smooth transitions
 */
export function SensitiveDataMask({
  value,
  maskChar = "•",
  showLength = 8,
  className,
  label,
  currency,
}: SensitiveDataMaskProps) {
  const [isVisible, setIsVisible] = useState(false);

  const displayValue = isVisible ? String(value) : maskChar.repeat(showLength);

  return (
    <div className={className}>
      {label && (
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
      )}
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          {!isVisible && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="font-mono font-semibold text-foreground">
            {currency ? `${currency} ` : ""}{displayValue}
          </span>
        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsVisible(!isVisible)}
          aria-label={isVisible ? "Ocultar" : "Mostrar"}
        >
          {isVisible ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook para manejar estado de visibilidad de datos sensibles
 */
export function useSensitiveDataVisibility() {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = () => setIsVisible(!isVisible);
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return { isVisible, toggle, show, hide };
}

/**
 * Componente para ocultar números de cuenta
 */
export function AccountNumberMask({
  accountNumber,
  className,
}: {
  accountNumber: string;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  const maskedValue = isVisible
    ? accountNumber
    : `${accountNumber.slice(0, 4)}${"•".repeat(accountNumber.length - 8)}${accountNumber.slice(-4)}`;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-foreground">{maskedValue}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
