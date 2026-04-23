"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DroneProof, DeliveryProof, Task } from "@/lib/types";

// ── Criterion Row ─────────────────────────────

interface CriterionRowProps {
  label: string;
  passed: boolean;
  actual: string;
  required: string;
}

function CriterionRow({ label, passed, actual, required }: CriterionRowProps) {
  return (
    <div
      className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 border
        ${passed
          ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300"
          : "bg-red-500/8 border-red-500/20 text-red-300"
        }`}
    >
      <div className="flex items-center gap-2">
        {passed
          ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
          : <XCircle      size={12} className="text-red-400 shrink-0" />
        }
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-right">
        <span className="font-mono">{actual}</span>
        <span className="text-slate-500 ml-1">/ req. {required}</span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────

interface VerificationPanelProps {
  task: Task;
  proof: DroneProof | DeliveryProof | null;
  /** If provided, the panel can also trigger the on-chain approve/reject */
  isCreator?: boolean;
  onApprove?: () => void;
  onReject?:  () => void;
  isProcessing?: boolean;
}

export default function VerificationPanel({
  task,
  proof,
  isCreator,
  onApprove,
  onReject,
  isProcessing,
}: VerificationPanelProps) {
  // ── Derive per-criterion pass/fail from proof ──
  const criteria = proof
    ? (() => {
        // DeliveryProof shape (new)
        if ("deliveryConfirmed" in proof) {
          const dp = proof as DeliveryProof;
          return [
            {
              label:    "Delivery Confirmed",
              passed:   dp.deliveryConfirmed,
              actual:   dp.deliveryConfirmed ? "Yes" : "No",
              required: "Yes",
            },
            {
              label:    "Duration",
              passed:   dp.durationMinutes <= 60,
              actual:   `${dp.durationMinutes.toFixed(1)} min`,
              required: "≤60 min",
            },
            {
              label:    "Distance Covered",
              passed:   dp.distanceCovered > 0,
              actual:   `${dp.distanceCovered.toFixed(2)} km`,
              required: ">0 km",
            },
            {
              label:    "Battery Usage",
              passed:   dp.batteryStart - dp.batteryEnd <= 40,
              actual:   `${(dp.batteryStart - dp.batteryEnd).toFixed(1)}%`,
              required: "≤40% drain",
            },
          ];
        }
        // Legacy DroneProof shape (old)
        const lp = proof as DroneProof;
        return [
          {
            label:    "Coverage",
            passed:   lp.coveragePercent >= task.requirements.minCoverage,
            actual:   `${lp.coveragePercent.toFixed(1)}%`,
            required: `≥${task.requirements.minCoverage}%`,
          },
          {
            label:    "Duration",
            passed:   lp.durationMinutes <= task.requirements.maxDurationMinutes,
            actual:   `${lp.durationMinutes.toFixed(1)} min`,
            required: `≤${task.requirements.maxDurationMinutes} min`,
          },
        ];
      })()
    : [];

  const localApproved = criteria.length > 0 && criteria.every((c) => c.passed);

  // ── Render ─────────────────────────────────
  return (
    <Card className="bg-slate-900/60 border-white/8 rounded-2xl overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3">
        <h3 className="text-slate-200 font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          Verification Panel
        </h3>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-4">
        {/* No proof yet */}
        {!proof && (
          <div className="text-center py-8 text-slate-500 text-sm">
            <p>Run the drone simulator to generate a proof.</p>
          </div>
        )}

        {/* Criteria checklist */}
        {proof && (
          <>
            <div className="space-y-2">
              {criteria.map((c) => (
                <CriterionRow key={c.label} {...c} />
              ))}
            </div>

            {/* Local verdict banner */}
            <div
              className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium border
                ${localApproved
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  : "bg-red-500/10 border-red-500/25 text-red-400"
                }`}
            >
              {localApproved
                ? <><CheckCircle2 size={16} /> Local check: All criteria met</>
                : <><XCircle size={16} /> Local check: Criteria not met</>
              }
            </div>

            {/* Creator approve / reject */}
            {isCreator && task.status === "submitted" && (
              <div className="flex gap-2 pt-1">
                <Button
                  id="approve-task-btn"
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-10 gap-1.5"
                >
                  {isProcessing
                    ? <Loader2 size={14} className="animate-spin" />
                    : <CheckCircle2 size={14} />
                  }
                  Approve & Pay
                </Button>
                <Button
                  id="reject-task-btn"
                  onClick={onReject}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-10 gap-1.5"
                >
                  <XCircle size={14} /> Reject
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
