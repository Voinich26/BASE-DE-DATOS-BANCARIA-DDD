"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { EnterpriseModal } from "./EnterpriseModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  entityLabel?: string;
  entityValue?: string;
  onApprove?: (comment?: string) => Promise<void> | void;
  onReject?: (comment: string) => Promise<void> | void;
  requireRejectComment?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
  variant?: "approve-reject" | "approve-only" | "reject-only" | "confirm";
  loading?: boolean;
}

export function ApprovalDialog({
  open,
  onOpenChange,
  title,
  description,
  entityLabel,
  entityValue,
  onApprove,
  onReject,
  requireRejectComment = true,
  approveLabel = "Aprobar",
  rejectLabel = "Rechazar",
  variant = "approve-reject",
  loading = false,
}: ApprovalDialogProps) {
  const [comment, setComment] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!onApprove) return;
    setSubmitting(true);
    setAction("approve");
    try {
      await onApprove(comment || undefined);
      onOpenChange(false);
      setComment("");
      setAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    if (requireRejectComment && !comment.trim()) return;
    setSubmitting(true);
    setAction("reject");
    try {
      await onReject(comment);
      onOpenChange(false);
      setComment("");
      setAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitting = submitting || loading;

  return (
    <EnterpriseModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
    >
      <div className="space-y-4">
        {/* Entity info */}
        {entityLabel && entityValue && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border">
            <span className="text-sm text-muted-foreground">{entityLabel}</span>
            <span className="text-sm font-semibold text-foreground font-mono">
              {entityValue}
            </span>
          </div>
        )}

        {/* Warning */}
        {variant === "approve-reject" && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300/80">
              Esta acción es irreversible. Revise cuidadosamente antes de proceder.
            </p>
          </div>
        )}

        {/* Comment field */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            Comentario{requireRejectComment ? " (requerido para rechazar)" : " (opcional)"}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ingrese un comentario..."
            rows={3}
            className={cn(
              "w-full px-3 py-2 text-sm rounded-xl border bg-secondary/50 text-foreground",
              "placeholder:text-muted-foreground resize-none",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              "border-border transition-colors"
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {(variant === "approve-reject" || variant === "reject-only") && onReject && (
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={handleReject}
              disabled={isSubmitting || (requireRejectComment && !comment.trim())}
              loading={isSubmitting && action === "reject"}
            >
              <XCircle className="w-4 h-4" />
              {rejectLabel}
            </Button>
          )}

          {(variant === "approve-reject" || variant === "approve-only" || variant === "confirm") && onApprove && (
            <Button
              variant={variant === "confirm" ? "banking" : "default"}
              className={cn(
                "flex-1 gap-2",
                "bg-emerald-600 hover:bg-emerald-500 text-white"
              )}
              onClick={handleApprove}
              disabled={isSubmitting}
              loading={isSubmitting && action === "approve"}
            >
              <CheckCircle2 className="w-4 h-4" />
              {approveLabel}
            </Button>
          )}
        </div>
      </div>
    </EnterpriseModal>
  );
}
