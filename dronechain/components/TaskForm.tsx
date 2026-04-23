"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseWeb3Error } from "@/lib/txErrors";
import { PlusCircle, X, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createTask } from "@/lib/contract";
import type { TaskRequirements } from "@/lib/types";

// ── Field helpers ─────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ id, label, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-slate-300 text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-xs text-slate-500 flex items-start gap-1">
          <Info size={11} className="mt-0.5 shrink-0" /> {hint}
        </p>
      )}
    </div>
  );
}

// ── Default form state ────────────────────────

const DEFAULT_REQUIREMENTS: TaskRequirements = {
  minCoverage: 90,
  maxDurationMinutes: 30,
  altitudeRange: { min: 50, max: 120 },
  additionalConstraints: [],
};

// ── Component ─────────────────────────────────

interface TaskFormProps {
  /** Wallet address; form is disabled when null */
  walletAddress: string | null;
}

export default function TaskForm({ walletAddress }: TaskFormProps) {
  const router = useRouter();

  // ── Form state ─────────────────────────────
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [rewardEth,   setRewardEth]   = useState("0.1");
  const [deadline,    setDeadline]    = useState(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [req, setReq] = useState<TaskRequirements>(DEFAULT_REQUIREMENTS);
  const [newConstraint, setNewConstraint] = useState("");

  // ── UI state ───────────────────────────────
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [successMsg,     setSuccessMsg]     = useState<string | null>(null);

  // ── Constraint helpers ─────────────────────
  const addConstraint = () => {
    const trimmed = newConstraint.trim();
    if (trimmed && !req.additionalConstraints.includes(trimmed)) {
      setReq((r) => ({ ...r, additionalConstraints: [...r.additionalConstraints, trimmed] }));
      setNewConstraint("");
    }
  };

  const removeConstraint = (idx: number) =>
    setReq((r) => ({
      ...r,
      additionalConstraints: r.additionalConstraints.filter((_, i) => i !== idx),
    }));

  // ── Submit ─────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (req.altitudeRange.min >= req.altitudeRange.max) {
      setError("Altitude min must be less than altitude max.");
      return;
    }

    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);

    setSubmitting(true);
    try {
      const result = await createTask(
        title.trim(),
        description.trim(),
        "general",
        deadlineTs,
        req,
        rewardEth
      );
      const { txHash, taskId } = result as { txHash: string; taskId: number };
      setSuccessMsg(`Task #${taskId} created! TX: ${txHash.slice(0, 10)}...`);
      setTimeout(() => router.push(`/tasks/${taskId}`), 1500);
    } catch (err) {
      setError(parseWeb3Error(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Basic Info ── */}
      <Card className="bg-slate-900/60 border-white/8 rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <h2 className="text-slate-200 font-semibold">Task Details</h2>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <Field id="task-title" label="Title" hint="Short, descriptive mission name">
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Agricultural Survey – Wheat Fields"
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-600
                         focus:border-violet-500 transition-colors"
              disabled={submitting}
              required
            />
          </Field>

          <Field
            id="task-description"
            label="Description"
            hint="Explain mission objectives, deliverables, and any special notes"
          >
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the drone must accomplish, expected outputs, area details…"
              rows={5}
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-600
                         focus:border-violet-500 transition-colors resize-none"
              disabled={submitting}
              required
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Requirements ── */}
      <Card className="bg-slate-900/60 border-white/8 rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <h2 className="text-slate-200 font-semibold">Flight Requirements</h2>
        </CardHeader>
        <CardContent className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Coverage */}
          <Field
            id="req-coverage"
            label="Minimum Coverage (%)"
            hint="Area that must be surveyed"
          >
            <Input
              id="req-coverage"
              type="number"
              min={1}
              max={100}
              value={req.minCoverage}
              onChange={(e) =>
                setReq((r) => ({ ...r, minCoverage: Number(e.target.value) }))
              }
              className="bg-white/5 border-white/10 text-slate-100 focus:border-violet-500"
              disabled={submitting}
            />
          </Field>

          {/* Duration */}
          <Field
            id="req-duration"
            label="Max Duration (minutes)"
            hint="Flight time limit"
          >
            <Input
              id="req-duration"
              type="number"
              min={1}
              value={req.maxDurationMinutes}
              onChange={(e) =>
                setReq((r) => ({ ...r, maxDurationMinutes: Number(e.target.value) }))
              }
              className="bg-white/5 border-white/10 text-slate-100 focus:border-violet-500"
              disabled={submitting}
            />
          </Field>

          {/* Altitude Min */}
          <Field id="req-alt-min" label="Min Altitude (m)">
            <Input
              id="req-alt-min"
              type="number"
              min={0}
              value={req.altitudeRange.min}
              onChange={(e) =>
                setReq((r) => ({
                  ...r,
                  altitudeRange: { ...r.altitudeRange, min: Number(e.target.value) },
                }))
              }
              className="bg-white/5 border-white/10 text-slate-100 focus:border-violet-500"
              disabled={submitting}
            />
          </Field>

          {/* Altitude Max */}
          <Field id="req-alt-max" label="Max Altitude (m)">
            <Input
              id="req-alt-max"
              type="number"
              min={1}
              value={req.altitudeRange.max}
              onChange={(e) =>
                setReq((r) => ({
                  ...r,
                  altitudeRange: { ...r.altitudeRange, max: Number(e.target.value) },
                }))
              }
              className="bg-white/5 border-white/10 text-slate-100 focus:border-violet-500"
              disabled={submitting}
            />
          </Field>

          {/* Additional Constraints */}
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-slate-300 text-sm font-medium">
              Additional Constraints
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-constraint-input"
                value={newConstraint}
                onChange={(e) => setNewConstraint(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addConstraint(); } }}
                placeholder="e.g. Thermal camera required"
                className="bg-white/5 border-white/10 text-slate-100 focus:border-violet-500 flex-1"
                disabled={submitting}
              />
              <Button
                id="add-constraint-btn"
                type="button"
                variant="outline"
                size="sm"
                onClick={addConstraint}
                className="border-white/10 hover:bg-white/5 text-slate-300 px-3"
                disabled={submitting}
              >
                <PlusCircle size={14} />
              </Button>
            </div>
            {req.additionalConstraints.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {req.additionalConstraints.map((c, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 bg-violet-500/10 text-violet-300
                               text-xs px-3 py-1 rounded-full border border-violet-500/20"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeConstraint(i)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Economics ── */}
      <Card className="bg-slate-900/60 border-white/8 rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <h2 className="text-slate-200 font-semibold">Reward & Deadline</h2>
        </CardHeader>
        <CardContent className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="reward-eth"
            label="Reward (MON)"
            hint="Amount escrowed in the contract"
          >
            <Input
              id="reward-eth"
              type="number"
              min={0.001}
              step={0.001}
              value={rewardEth}
              onChange={(e) => setRewardEth(e.target.value)}
              className="bg-white/5 border-white/10 text-slate-100 focus:border-violet-500"
              disabled={submitting}
            />
          </Field>

          <Field
            id="deadline"
            label="Mission Deadline"
            hint="Task expires at this date/time"
          >
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-white/5 border-white/10 text-slate-100 focus:border-violet-500"
              disabled={submitting}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Error / Success ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">
          ✅ <span className="font-mono font-bold">{successMsg}</span>
          <span className="text-slate-400"> — Redirecting…</span>
        </div>
      )}

      {/* ── Submit ── */}
      <Button
        id="create-task-submit"
        type="submit"
        disabled={submitting || !walletAddress}
        className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white font-semibold
                   text-base rounded-xl transition-all disabled:opacity-40"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin mr-2" />
            Creating Task…
          </>
        ) : (
          "Create Task & Escrow Reward"
        )}
      </Button>

      {!walletAddress && (
        <p className="text-center text-xs text-slate-500">
          Connect your wallet to create a task
        </p>
      )}
    </form>
  );
}
