"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseWeb3Error } from "@/lib/txErrors";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createTask } from "@/lib/contract";

// ── Types ─────────────────────────────────────

type CategoryId = "food" | "grocery" | "pharmacy" | "cargo" | "document";

interface CategoryConfig {
  id: CategoryId;
  emoji: string;
  label: string;
  requiresCooling: boolean;
  maxDeliveryMinutes: number;
  defaultWeight: number;
}

interface AIResult {
  maxDeliveryMinutes: number;
  requiredCapabilities: string[];
  handlingNotes: string[];
  reasoning: string;
}

// ── Category config ───────────────────────────

const CATEGORIES: CategoryConfig[] = [
  { id: "food",     emoji: "🍕", label: "Food",     requiresCooling: true,  maxDeliveryMinutes: 30, defaultWeight: 2   },
  { id: "grocery",  emoji: "🛒", label: "Grocery",  requiresCooling: false, maxDeliveryMinutes: 45, defaultWeight: 3   },
  { id: "pharmacy", emoji: "💊", label: "Pharmacy", requiresCooling: true,  maxDeliveryMinutes: 20, defaultWeight: 1   },
  { id: "cargo",    emoji: "📦", label: "Cargo",    requiresCooling: false, maxDeliveryMinutes: 60, defaultWeight: 4   },
  { id: "document", emoji: "📄", label: "Document", requiresCooling: false, maxDeliveryMinutes: 20, defaultWeight: 0.2 },
];

function getCategoryConfig(id: CategoryId): CategoryConfig {
  return CATEGORIES.find((c) => c.id === id)!;
}

function getRequiredCapabilities(categoryId: CategoryId, weightKg: number): string[] {
  const caps: string[] = [`maxPayloadKg >= ${weightKg}`];
  if (categoryId === "food" || categoryId === "pharmacy") caps.unshift("requiresCooling");
  if (categoryId === "cargo") caps.unshift("hasSecureCompartment");
  return caps;
}

// ── Toggle switch ─────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
}

function Toggle({ checked, onChange, disabled, id }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
        checked ? "bg-cyan-500" : "bg-white/10 border border-white/10"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ── ToggleRow ─────────────────────────────────

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id: string;
}

function ToggleRow({ label, description, checked, onChange, disabled, id }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <Toggle id={id} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── Field wrapper ─────────────────────────────

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
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// ── Component ─────────────────────────────────

interface TaskFormProps {
  walletAddress: string | null;
}

export default function TaskForm({ walletAddress }: TaskFormProps) {
  const router = useRouter();

  // ── Category ───────────────────────────────
  const [categoryId, setCategoryId] = useState<CategoryId>("food");

  // ── Delivery details ───────────────────────
  const [orderDescription, setOrderDescription] = useState("");
  const [pickupLocation,   setPickupLocation]   = useState("");
  const [dropoffLocation,  setDropoffLocation]  = useState("");
  const [distanceKm,       setDistanceKm]       = useState<number>(2);
  const [weightKg,         setWeightKg]         = useState<number>(
    getCategoryConfig("food").defaultWeight
  );
  const [rewardMon,  setRewardMon]  = useState("0.5");
  const [deadline,   setDeadline]   = useState(
    () => new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [isFragile,          setIsFragile]          = useState(false);
  const [requiresCooling,    setRequiresCooling]    = useState(true);
  const [requiresSignature,  setRequiresSignature]  = useState(false);

  // ── AI result ──────────────────────────────
  const [aiResult,      setAiResult]      = useState<AIResult | null>(null);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiError,       setAiError]       = useState<string | null>(null);

  // ── Submit state ───────────────────────────
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

  // ── Category selection ─────────────────────
  const handleCategorySelect = (id: CategoryId) => {
    const cfg = getCategoryConfig(id);
    setCategoryId(id);
    setRequiresCooling(cfg.requiresCooling);
    setWeightKg(cfg.defaultWeight);
    setAiResult(null);
    setAiError(null);
  };

  // ── AI generation ──────────────────────────
  const handleGenerateAI = async () => {
    if (!orderDescription.trim()) {
      setAiError("Please enter an order description first.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const res = await fetch("/api/generate-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryId,
          description: orderDescription,
          distanceKm,
          weightKg,
          isFragile,
          requiresCooling,
          requiresSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      setAiResult(data as AIResult);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Submit ─────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!walletAddress) { setError("Please connect your wallet first."); return; }
    if (!orderDescription.trim()) { setError("Order description is required."); return; }
    if (!pickupLocation.trim())   { setError("Pickup location is required.");   return; }
    if (!dropoffLocation.trim())  { setError("Dropoff location is required.");  return; }
    if (weightKg > 5)             { setError("Package weight must be ≤ 5 kg."); return; }

    const cfg        = getCategoryConfig(categoryId);
    const maxMinutes = aiResult?.maxDeliveryMinutes ?? cfg.maxDeliveryMinutes;
    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
    const caps       = getRequiredCapabilities(categoryId, weightKg);

    const title = `${cfg.emoji} ${cfg.label} Delivery: ${pickupLocation} → ${dropoffLocation}`;
    const fullDescription = [
      orderDescription.trim(),
      `Pickup: ${pickupLocation}`,
      `Dropoff: ${dropoffLocation}`,
      `Distance: ${distanceKm} km | Weight: ${weightKg} kg`,
      isFragile         ? "⚠️ Fragile"           : null,
      requiresCooling   ? "❄️ Requires cooling"  : null,
      requiresSignature ? "✍️ Signature required" : null,
      caps.length       ? `Capabilities: ${caps.join(", ")}` : null,
    ].filter(Boolean).join("\n");

    // Map delivery fields to the contract requirements tuple shape
    const contractReq = {
      minCoverage:        90,
      maxDurationMinutes: maxMinutes,
      altitudeRange:      { min: 30, max: 80 },
      additionalConstraints: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    setSubmitting(true);
    try {
      const result = await createTask(
        title,
        fullDescription,
        categoryId,
        deadlineTs,
        contractReq,
        rewardMon
      );
      const { txHash, taskId } = result as { txHash: string; taskId: number };
      setSuccessMsg(`Delivery #${taskId} created! TX: ${txHash.slice(0, 10)}…`);
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

      {/* ── STEP 1: Category ── */}
      <Card className="bg-slate-900/60 border-white/8 rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <h2 className="text-slate-200 font-semibold">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest mr-2">Step 1</span>
            Delivery Category
          </h2>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {CATEGORIES.map((cat) => {
              const selected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  disabled={submitting}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-4 px-2 transition-all
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/40
                    ${selected
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : "border-white/8 bg-white/3 text-slate-400 hover:border-white/20 hover:bg-white/5"
                    }
                    ${submitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-xs font-semibold">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── STEP 2: Delivery Details ── */}
      <Card className="bg-slate-900/60 border-white/8 rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <h2 className="text-slate-200 font-semibold">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest mr-2">Step 2</span>
            Delivery Details
          </h2>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          {/* Order description */}
          <Field id="order-description" label="Order Description" hint="What needs to be delivered?">
            <Input
              id="order-description"
              value={orderDescription}
              onChange={(e) => setOrderDescription(e.target.value)}
              placeholder={`e.g. 2x Margherita pizza, 1x Coke`}
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 transition-colors"
              disabled={submitting}
              required
            />
          </Field>

          {/* Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="pickup-location" label="Pickup Location">
              <Input
                id="pickup-location"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="e.g. Domino's Pizza, Kadıköy Branch"
                className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 transition-colors"
                disabled={submitting}
                required
              />
            </Field>
            <Field id="dropoff-location" label="Dropoff Location">
              <Input
                id="dropoff-location"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="e.g. Moda Cad. No:42, Kadıköy"
                className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 transition-colors"
                disabled={submitting}
                required
              />
            </Field>
          </div>

          {/* Distance / Weight / Reward / Deadline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field id="distance-km" label="Distance (km)">
              <Input
                id="distance-km"
                type="number"
                min={0.1}
                step={0.1}
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="bg-white/5 border-white/10 text-slate-100 focus:border-cyan-500"
                disabled={submitting}
              />
            </Field>
            <Field id="weight-kg" label="Weight (kg)" hint="Max 5 kg">
              <Input
                id="weight-kg"
                type="number"
                min={0.1}
                max={5}
                step={0.1}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="bg-white/5 border-white/10 text-slate-100 focus:border-cyan-500"
                disabled={submitting}
              />
            </Field>
            <Field id="reward-mon" label="Reward (MON)">
              <Input
                id="reward-mon"
                type="number"
                min={0.001}
                step={0.001}
                value={rewardMon}
                onChange={(e) => setRewardMon(e.target.value)}
                className="bg-white/5 border-white/10 text-slate-100 focus:border-cyan-500"
                disabled={submitting}
              />
            </Field>
            <Field id="deadline" label="Deadline">
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-white/5 border-white/10 text-slate-100 focus:border-cyan-500"
                disabled={submitting}
              />
            </Field>
          </div>

          {/* Toggles */}
          <div className="border border-white/8 rounded-xl px-4 divide-y divide-white/5">
            <ToggleRow
              id="toggle-fragile"
              label="Fragile Item"
              description="Handle with extra care, avoid impact"
              checked={isFragile}
              onChange={setIsFragile}
              disabled={submitting}
            />
            <ToggleRow
              id="toggle-cooling"
              label="Requires Cooling"
              description="Temperature-controlled compartment needed"
              checked={requiresCooling}
              onChange={setRequiresCooling}
              disabled={submitting}
            />
            <ToggleRow
              id="toggle-signature"
              label="Requires Signature on Delivery"
              description="Recipient must confirm receipt"
              checked={requiresSignature}
              onChange={setRequiresSignature}
              disabled={submitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── STEP 3: AI Requirements ── */}
      <Card className="bg-slate-900/60 border-white/8 rounded-2xl">
        <CardHeader className="pb-2 pt-5 px-6">
          <h2 className="text-slate-200 font-semibold">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest mr-2">Step 3</span>
            AI Delivery Parameters
          </h2>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-4">
          <Button
            type="button"
            onClick={handleGenerateAI}
            disabled={aiLoading || submitting}
            className="w-full h-11 bg-slate-800 hover:bg-slate-700 border border-white/10 hover:border-cyan-500/40
                       text-slate-200 font-medium rounded-xl transition-all disabled:opacity-40"
          >
            {aiLoading ? (
              <><Loader2 size={16} className="animate-spin mr-2" />Generating…</>
            ) : (
              "🤖 Generate Delivery Parameters"
            )}
          </Button>

          {aiError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-medium text-sm mb-1">
                <span>✅</span> AI Parameters Generated
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white/3 rounded-lg px-3 py-2.5">
                  <p className="text-slate-500 text-xs mb-0.5">Max Delivery Time</p>
                  <p className="text-slate-200 font-semibold">{aiResult.maxDeliveryMinutes} min</p>
                </div>
                <div className="bg-white/3 rounded-lg px-3 py-2.5 sm:col-span-2">
                  <p className="text-slate-500 text-xs mb-1">Required Drone Capabilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.requiredCapabilities.map((cap, i) => (
                      <span key={i} className="bg-cyan-500/10 text-cyan-300 text-xs px-2 py-0.5 rounded-full border border-cyan-500/20">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {aiResult.handlingNotes.length > 0 && (
                <div className="bg-white/3 rounded-lg px-3 py-2.5 text-sm">
                  <p className="text-slate-500 text-xs mb-1.5">Special Handling Notes</p>
                  <ul className="space-y-1">
                    {aiResult.handlingNotes.map((note, i) => (
                      <li key={i} className="text-slate-300 text-xs flex items-start gap-1.5">
                        <span className="text-cyan-500 mt-0.5">•</span>{note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiResult.reasoning && (
                <p className="text-slate-500 text-xs italic">{aiResult.reasoning}</p>
              )}
            </div>
          )}
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

      {/* ── STEP 4: Submit ── */}
      <div className="space-y-2">
        <Button
          id="create-task-submit"
          type="submit"
          disabled={submitting || !walletAddress}
          className="w-full h-13 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold
                     text-base rounded-xl transition-all disabled:opacity-40 py-3.5"
        >
          {submitting ? (
            <><Loader2 size={18} className="animate-spin mr-2" />Locking Payment…</>
          ) : (
            `🔒 Lock Payment & Request Delivery`
          )}
        </Button>
        {rewardMon && !submitting && walletAddress && (
          <p className="text-center text-xs text-slate-500">
            {rewardMon} MON will be locked until delivery is confirmed
          </p>
        )}
        {!walletAddress && (
          <p className="text-center text-xs text-slate-500">Connect your wallet to request a delivery</p>
        )}
      </div>
    </form>
  );
}
