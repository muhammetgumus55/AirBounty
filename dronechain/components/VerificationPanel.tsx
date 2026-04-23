"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DroneProof, Task, VerificationResult } from "@/lib/types";

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
  proof: DroneProof | null;
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
  const [result,    setResult]    = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState(false);

  // ── Derive per-criterion pass/fail from proof ──
  const criteria = proof
    ? [
        {
          label:    "Coverage",
          passed:   proof.coveragePercent >= task.requirements.minCoverage,
          actual:   `${proof.coveragePercent.toFixed(1)}%`,
          required: `≥${task.requirements.minCoverage}%`,
        },
        {
          label:    "Duration",
          passed:   proof.durationMinutes <= task.requirements.maxDurationMinutes,
          actual:   `${proof.durationMinutes.toFixed(1)} min`,
          required: `≤${task.requirements.maxDurationMinutes} min`,
        },
        {
          label:    "Altitude (min)",
          passed:   proof.altitude >= task.requirements.altitudeRange.min,
          actual:   `${proof.altitude.toFixed(1)} m`,
          required: `≥${task.requirements.altitudeRange.min} m`,
        },
        {
          label:    "Altitude (max)",
          passed:   proof.altitude <= task.requirements.altitudeRange.max,
          actual:   `${proof.altitude.toFixed(1)} m`,
          required: `≤${task.requirements.altitudeRange.max} m`,
        },
      ]
    : [];

  const localApproved = criteria.length > 0 && criteria.every((c) => c.passed);

  // ── AI Verification call ───────────────────
  const runAiVerification = async () => {
    if (!proof) return;
    setVerifying(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ task, proof }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const data: VerificationResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

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

            {/* AI Verification */}
            <div className="border border-white/5 rounded-xl bg-slate-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">AI Verification (Claude)</span>
                <Button
                  id="ai-verify-btn"
                  size="sm"
                  onClick={runAiVerification}
                  disabled={verifying || !proof}
                  className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 gap-1"
                >
                  {verifying
                    ? <><Loader2 size={12} className="animate-spin" /> Verifying…</>
                    : <><Send size={12} /> Run AI Check</>
                  }
                </Button>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {result && (
                <div className="space-y-2">
                  <div
                    className={`flex items-center gap-2 text-sm font-semibold
                      ${result.approved ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {result.approved
                      ? <CheckCircle2 size={16} />
                      : <XCircle size={16} />
                    }
                    {result.approved ? "Approved by AI" : "Rejected by AI"}
                  </div>

                  {/* Reasoning (expandable) */}
                  <div className="bg-slate-900/60 rounded-lg p-3">
                    <button
                      onClick={() => setExpanded((e) => !e)}
                      className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200"
                    >
                      <span>Reasoning</span>
                      {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expanded && (
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {result.reasoning}
                      </p>
                    )}
                  </div>

                  {/* Failed criteria */}
                  {result.failedCriteria.length > 0 && (
                    <div className="space-y-1">
                      {result.failedCriteria.map((fc, i) => (
                        <div
                          key={i}
                          className="text-xs text-red-300 bg-red-500/8 border border-red-500/20
                                     rounded-lg px-3 py-1.5 flex items-center gap-1.5"
                        >
                          <XCircle size={11} /> {fc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
