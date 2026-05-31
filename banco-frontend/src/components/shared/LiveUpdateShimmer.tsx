"use client";

import { motion } from "framer-motion";

export function LiveUpdateShimmer({ className }: { className?: string }) {
  return (
    <motion.div
      className={`relative overflow-hidden bg-secondary/50 ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
}

export function ShimmerText({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <LiveUpdateShimmer
          key={i}
          className={`h-4 rounded-full ${i === 0 ? 'w-3/4' : i === 1 ? 'w-1/2' : 'w-2/3'}`}
        />
      ))}
    </div>
  );
}

export function ShimmerCard({ className }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <LiveUpdateShimmer className="h-32 rounded-2xl" />
      <div className="space-y-2">
        <LiveUpdateShimmer className="h-4 w-3/4 rounded-full" />
        <LiveUpdateShimmer className="h-4 w-1/2 rounded-full" />
      </div>
    </div>
  );
}

export function ShimmerTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <LiveUpdateShimmer key={i} className="h-8 flex-1 rounded-lg" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <LiveUpdateShimmer key={j} className="h-10 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ShimmerStatCard({ className }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <LiveUpdateShimmer className="h-16 w-16 rounded-2xl mx-auto" />
      <LiveUpdateShimmer className="h-6 w-1/2 mx-auto rounded-full" />
      <LiveUpdateShimmer className="h-4 w-3/4 mx-auto rounded-full" />
    </div>
  );
}

export function PulseUpdate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.5, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <motion.div
        className="absolute inset-0 bg-primary/5 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 0.6 }}
      />
      {children}
    </motion.div>
  );
}

export function FadeInUpdate({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
}

export function SlideInUpdate({ children, direction = "right" }: { children: React.ReactNode; direction?: "left" | "right" }) {
  const x = direction === "right" ? 20 : -20;
  return (
    <motion.div
      initial={{ opacity: 0, x }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

export function ScaleInUpdate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
