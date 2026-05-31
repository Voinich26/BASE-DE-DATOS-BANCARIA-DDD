import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/20 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/20 text-destructive",
        outline: "border-border text-foreground",
        success: "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
        warning: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400",
        info: "border-blue-500/30 bg-blue-500/20 text-blue-400",
        cyan: "border-cyan-500/30 bg-cyan-500/20 text-cyan-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-emerald-400",
            variant === "warning" && "bg-yellow-400",
            variant === "destructive" && "bg-red-400",
            variant === "info" && "bg-blue-400",
            variant === "cyan" && "bg-cyan-400",
            (!variant || variant === "default") && "bg-primary"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
