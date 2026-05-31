"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusPageProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  details?: ReactNode;
  className?: string;
}

export function StatusPage({
  icon: Icon,
  title,
  subtitle,
  description,
  ctaLabel,
  ctaHref,
  details,
  className,
}: StatusPageProps) {
  return (
    <main className={cn("min-h-screen bg-background px-6 py-12 text-foreground", className)}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 rounded-[2rem] border border-border bg-secondary/95 p-10 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.65)] backdrop-blur-xl">
        <div className="flex flex-col gap-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 text-primary shadow-lg shadow-primary/10">
            <Icon className="h-10 w-10" aria-hidden="true" />
          </div>
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.32em] text-muted-foreground">{subtitle}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-4 text-sm text-muted-foreground">
            {details}
          </div>
          <Link href={ctaHref} className="self-center sm:self-auto">
            <Button variant="banking" size="lg" className="w-full sm:w-auto">
              {ctaLabel}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
