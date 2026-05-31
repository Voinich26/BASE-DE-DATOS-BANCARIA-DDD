"use client";

import { ErrorFallback } from "@/components/errors/ErrorFallback";
import { motion } from "framer-motion";

interface GlobalErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ErrorFallback error={error} reset={reset} context="Global" />
    </motion.div>
  );
}
