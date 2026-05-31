"use client";

import React from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-blue shadow-glow-blue"
        >
          <Building2 className="w-8 h-8 text-white" />
        </motion.div>

        {/* Brand */}
        <div className="text-center">
          <h1 className="text-xl font-bold gradient-text">BancoDDD</h1>
          <p className="text-xs text-muted-foreground mt-1">Enterprise Banking Platform</p>
        </div>

        {/* Spinner */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
