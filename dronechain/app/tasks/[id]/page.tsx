"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  Clock,
  Coins,
  User,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WalletConnect from "@/components/WalletConnect";
import DroneSimulator from "@/components/DroneSimulator";
import VerificationPanel from "@/components/VerificationPanel";
import { getMockTasks } from "@/lib/droneSimulator";
import { submitProof, approveTask, rejectTask } from "@/lib/contract";
import type { DroneProof, Task, WalletState } from "@/lib/types";

// ── Status label map ─────────────────────────
const STATUS_CLASSES: Record<Task["status"], string> = {
  open:        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  accepted:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  submitted:   "bg-violet-500/15 text-violet-400 border-violet-500/30",
  approved:    "bg-teal-500/15 text-teal-400 border-teal-500/30",
  rejected:    "bg-red-500/15 text-red-400 border-red-500/30",
  expired:     "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function formatDeadline(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function shortenAddr(addr: string) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Page ──────────────────────────────────────

export default function TaskDetailPage() {
  const params  = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [wallet,      setWallet]      = useState<WalletState>({ address: null, isConnected: false, chainId: null, balance: null });
  const [task,        setTask]        = useState<Task | null>(null);
  const [proof,       setProof]       = useState<DroneProof | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load task (mock for now; swap with fetchTask(id) when contract is live)
  useEffect(() => {
    const found = getMockTasks().find((t) => t.id === id);
    setTask(found ?? null);
  }, [id]);

  const handleWalletChange = useCallback(
    (state: WalletState) => setWallet(state),
    []
  );

  const handleProofGenerated = useCallback((p: DroneProof) => {
    setProof(p);
    setSubmitError(null);
  }, []);

  // ── Submit proof on-chain ──────────────────
  const handleSubmitProof = async () => {
    if (!proof || !wallet.address) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitProof(proof);
      setTask((t) => t ? { ...t, status: "submitted" } : t);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Approve / Reject ───────────────────────
  const handleApprove = async () => {
    if (!task) return;
    setProcessing(true);
    try {
      await approveTask(task.id);
      setTask((t) => t ? { ...t, status: "approved" } : t);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!task) return;
    setProcessing(true);
    try {
      await rejectTask(task.id);
      setTask((t) => t ? { ...t, status: "rejected" } : t);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const isCreator  = wallet.address?.toLowerCase() === task?.creator.toLowerCase();
  const isOperator = wallet.address?.toLowerCase() === task?.acceptedBy.toLowerCase();
  const canSubmit  = isOperator && proof && task?.status === "accepted";

  // ── Loading / Not found ───────────────────
  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-lg font-medium">Task not found</p>
          <Link href="/" className="text-violet-400 text-sm underline mt-2 inline-block">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-white/8 backdrop-blur-xl bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              Drone<span className="text-violet-400">Chain</span>
            </span>
          </Link>
          <WalletConnect onWalletChange={handleWalletChange} />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant="outline"
                className={`text-xs font-medium border ${STATUS_CLASSES[task.status]}`}
              >
                {task.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
              <span className="text-slate-600 text-xs font-mono">#{task.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{task.title}</h1>
          </div>

          {/* Reward */}
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20
                          rounded-2xl px-5 py-3 shrink-0">
            <Coins size={20} className="text-amber-400" />
            <span className="text-amber-400 font-extrabold text-2xl">{task.reward}</span>
            <span className="text-slate-500 text-sm">MON</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: Task details ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-slate-900/60 border border-white/8 rounded-2xl p-6 space-y-3">
              <h2 className="text-slate-300 font-semibold flex items-center gap-2">
                <FileText size={15} /> Description
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">{task.description}</p>
            </div>

            {/* Requirements */}
            <div className="bg-slate-900/60 border border-white/8 rounded-2xl p-6 space-y-4">
              <h2 className="text-slate-300 font-semibold flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-400" /> Requirements
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Min Coverage",  value: `${task.requirements.minCoverage}%`                                     },
                  { label: "Max Duration",  value: `${task.requirements.maxDurationMinutes} min`                            },
                  { label: "Altitude",      value: `${task.requirements.altitudeRange.min}–${task.requirements.altitudeRange.max}m` },
                ].map((r) => (
                  <div key={r.label} className="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                    <div className="text-xs text-slate-500">{r.label}</div>
                    <div className="text-slate-200 font-semibold text-sm mt-0.5">{r.value}</div>
                  </div>
                ))}
              </div>

              {task.requirements.additionalConstraints.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {task.requirements.additionalConstraints.map((c, i) => (
                    <span
                      key={i}
                      className="text-xs bg-violet-500/10 text-violet-300 border border-violet-500/20
                                 px-3 py-1 rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="bg-slate-900/60 border border-white/8 rounded-2xl p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Creator",   value: shortenAddr(task.creator),    icon: <User  size={13} /> },
                  { label: "Operator",  value: shortenAddr(task.acceptedBy), icon: <User  size={13} /> },
                  { label: "Deadline",  value: formatDeadline(task.deadline),icon: <Clock size={13} /> },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="text-slate-500 flex items-center gap-1.5 text-xs mb-0.5">
                      {m.icon} {m.label}
                    </div>
                    <div className="text-slate-300 font-mono">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit proof button (operator only) */}
            {canSubmit && (
              <div className="space-y-2">
                <Button
                  id="submit-proof-btn"
                  onClick={handleSubmitProof}
                  disabled={submitting}
                  className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white font-semibold
                             text-base rounded-xl gap-2"
                >
                  {submitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                  ) : (
                    "Submit Proof On-Chain"
                  )}
                </Button>
                {submitError && (
                  <p className="text-xs text-red-400 text-center">{submitError}</p>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Simulator + Verification ── */}
          <div className="space-y-5">
            <DroneSimulator task={task} onProofGenerated={handleProofGenerated} />
            <VerificationPanel
              task={task}
              proof={proof}
              isCreator={isCreator}
              onApprove={handleApprove}
              onReject={handleReject}
              isProcessing={processing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
