"use client";

import { useState } from "react";
import {
  Radar,
  CheckCircle2,
  XCircle,
  Zap,
  Package,
  Clock,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  evaluateFleetForDelivery,
  getFleet,
  simulateDelivery,
  toDeliveryTask,
} from "@/lib/droneSimulator";
import type { DeliveryTask, DeliveryProof, DroneSpec, DroneEvaluation, Task } from "@/lib/types";

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
        done
          ? "bg-cyan-500 border-cyan-500 text-black"
          : active
          ? "bg-transparent border-cyan-400 text-cyan-400"
          : "bg-transparent border-gray-700 text-gray-600"
      }`}
    >
      {done ? <CheckCircle2 size={14} /> : n}
    </div>
  );
}

// ── Battery bar ───────────────────────────────────────────────────────────────

function BatteryBar({ level, className = "" }: { level: number; className?: string }) {
  const color =
    level >= 80 ? "bg-cyan-400" : level >= 60 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${level}%` }}
        />
      </div>
      <span className="text-[11px] text-gray-400 w-8 text-right">{level}%</span>
    </div>
  );
}

// ── Drone card (Step 1) ───────────────────────────────────────────────────────

function DroneCard({
  drone,
  evaluation,
  task,
  onSelect,
  selected,
}: {
  drone: DroneSpec;
  evaluation: DroneEvaluation;
  task: DeliveryTask;
  onSelect: () => void;
  selected: boolean;
}) {
  const isMission = drone.status === "IN_MISSION";
  const roundTripKm = task.requirements.distanceKm * 2;
  const checks = [
    { ok: drone.maxPayloadKg >= task.requirements.maxWeightKg, label: "Payload" },
    { ok: drone.maxRangeKm >= roundTripKm, label: "Range" },
    { ok: !task.requirements.requiresCooling || drone.hasCoolingBay, label: "Cooling" },
    { ok: drone.batteryLevel >= 70, label: "Battery" },
    { ok: drone.maxFlightMinutes >= task.requirements.maxDeliveryMinutes, label: "Flight" },
    { ok: !task.requirements.requiresSignature || drone.hasSecureCompartment, label: "Secure" },
  ];
  return (
    <div
      className={`rounded-xl border p-4 transition-all space-y-3 ${
        selected
          ? "border-cyan-500/60 bg-cyan-500/5"
          : isMission
          ? "border-gray-700/50 bg-gray-800/30 opacity-60"
          : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white text-sm">{drone.name}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {drone.homeLocation}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isMission
                ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                : "bg-green-500/15 text-green-400 border border-green-500/30"
            }`}
          >
            {isMission ? "IN MISSION" : "AVAILABLE"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="bg-gray-900/60 rounded-lg py-1.5">
          <p className="text-gray-500">Payload</p>
          <p className="text-white font-semibold">{drone.maxPayloadKg} kg</p>
        </div>
        <div className="bg-gray-900/60 rounded-lg py-1.5">
          <p className="text-gray-500">Range</p>
          <p className="text-white font-semibold">{drone.maxRangeKm} km</p>
        </div>
        <div className="bg-gray-900/60 rounded-lg py-1.5">
          <p className="text-gray-500">Deliveries</p>
          <p className="text-white font-semibold">{drone.totalDeliveries}</p>
        </div>
      </div>

      {/* Battery */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Battery</span>
          {drone.batteryLevel < 80 && (
            <span className="text-amber-400 flex items-center gap-0.5">
              <Zap size={10} /> Low
            </span>
          )}
        </div>
        <BatteryBar level={drone.batteryLevel} />
      </div>

      {/* Suitability score */}
      <div>
        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
          <span>Suitability</span>
          <span className="text-cyan-400 font-semibold">{evaluation.suitabilityScore.toFixed(0)}/100</span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full"
            style={{ width: `${evaluation.suitabilityScore}%` }}
          />
        </div>
      </div>

      {/* Requirement checks */}
      <div className="flex flex-wrap gap-1">
        {checks.map(({ ok, label }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${
              ok
                ? "bg-green-500/10 text-green-400 border border-green-500/25"
                : "bg-gray-700/40 text-gray-600 border border-gray-700/40"
            }`}
          >
            {ok ? <CheckCircle2 size={9} /> : <XCircle size={9} />} {label}
          </span>
        ))}
      </div>

      <p className={`text-[11px] rounded-lg px-3 py-2 border ${evaluation.canAccept ? "text-cyan-200 bg-cyan-500/8 border-cyan-500/20" : "text-red-400/80 bg-red-500/8 border-red-500/20"}`}>
        {evaluation.reason}
      </p>

      <Button
        onClick={onSelect}
        disabled={isMission}
        className={`w-full h-8 text-xs font-semibold gap-1 ${
          selected
            ? "bg-cyan-500 text-black hover:bg-cyan-400"
            : "bg-gray-700 text-white hover:bg-gray-600"
        }`}
      >
        {selected ? "✓ Selected" : isMission ? "In Mission" : "Select →"}
      </Button>
    </div>
  );
}

// ── Checkpoint timeline (Step 3) ──────────────────────────────────────────────

function CheckpointTimeline({
  proof,
  visibleCount,
}: {
  proof: DeliveryProof;
  visibleCount: number;
}) {
  const ICONS = ["📍", "📍", "📍", "📍", "✅"];
  return (
    <div className="space-y-0">
      {proof.checkpoints.slice(0, visibleCount).map((cp, i) => (
        <div
          key={i}
          className={`relative flex items-center gap-3 rounded-xl p-3 border transition-all animate-in fade-in slide-in-from-top-1 mb-2 ${
            i === proof.checkpoints.length - 1 && proof.deliveryConfirmed
              ? "bg-green-500/8 border-green-500/25"
              : cp.status === "Signal lost"
              ? "bg-red-500/8 border-red-500/25"
              : "bg-gray-800/60 border-gray-700/60"
          }`}
        >
          {i < visibleCount - 1 && (
            <div className="absolute left-[22px] top-12 h-6 w-px bg-gray-700/80" />
          )}
          <span className="text-lg">{ICONS[i] ?? "📍"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white">
                Checkpoint {i + 1} — <span className="text-gray-300">{cp.status}</span>
              </p>
              <span className="text-[10px] text-gray-500">{cp.progress}%</span>
            </div>
            <div className="flex gap-3 mt-0.5 text-[11px] text-gray-400">
              <span>Alt: {cp.altitude.toFixed(0)}m</span>
              <span>🔋 {cp.batteryLevel.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DroneSimulatorProps {
  task: DeliveryTask | Task;
  onProofGenerated?: (proof: DeliveryProof) => void;
  onSubmitForVerification?: (
    proof: DeliveryProof,
    localApproved: boolean
  ) => Promise<{ txHash?: string } | void>;
}

export default function DroneSimulator({
  task,
  onProofGenerated,
  onSubmitForVerification,
}: DroneSimulatorProps) {
  const deliveryTask = toDeliveryTask(task);
  const [step,           setStep]          = useState<1 | 2 | 3 | 4>(1);
  const [evaluations,    setEvaluations]   = useState<DroneEvaluation[]>([]);
  const [scanned,        setScanned]       = useState(false);
  const [selectedEval,   setSelectedEval]  = useState<DroneEvaluation | null>(null);
  const [selectedDrone,  setSelectedDrone] = useState<DroneSpec | null>(null);
  const [dispatching,    setDispatching]   = useState(false);
  const [visibleCPs,     setVisibleCPs]    = useState(0);
  const [proof,          setProof]         = useState<DeliveryProof | null>(null);
  const [submitLoading,  setSubmitLoading] = useState(false);
  const [submitError,    setSubmitError]   = useState<string | null>(null);
  const [submitTxHash,   setSubmitTxHash]  = useState<string | null>(null);

  const fleet = getFleet();

  // ── Step 1: Scan fleet ──────────────────────────────────────────────────────

  const handleScan = () => {
    const evals = evaluateFleetForDelivery(deliveryTask);
    setEvaluations(evals);
    setScanned(true);
  };

  // ── Step 2: Select drone ────────────────────────────────────────────────────

  const handleSelectDrone = (evaluation: DroneEvaluation) => {
    const drone = fleet.find((d) => d.id === evaluation.droneId) ?? null;
    setSelectedEval(evaluation);
    setSelectedDrone(drone);
    setStep(2);
  };

  // ── Step 3: Dispatch & simulate ─────────────────────────────────────────────

  const handleDispatch = async () => {
    if (!selectedDrone || !selectedEval) return;
    setDispatching(true);
    setStep(3);
    setVisibleCPs(0);

    const generatedProof = simulateDelivery(
      selectedDrone,
      deliveryTask,
      selectedEval.canAccept
    );
    setProof(generatedProof);

    // Reveal checkpoints one by one every 800ms
    for (let i = 1; i <= generatedProof.checkpoints.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setVisibleCPs(i);
    }

    setDispatching(false);
    await new Promise((r) => setTimeout(r, 600));
    setStep(4);
    setSubmitError(null);
    setSubmitTxHash(null);
    onProofGenerated?.(generatedProof);
  };

  const localApproved =
    !!proof &&
    proof.deliveryConfirmed === true &&
    proof.durationMinutes <= 60 &&
    proof.distanceCovered > 0 &&
    (proof.batteryStart - proof.batteryEnd) <= 40;

  const handleSubmitForVerification = async () => {
    if (!proof) return;
    if (!localApproved) {
      setSubmitError("Local check failed. Payment will not be submitted.");
      return;
    }
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitTxHash(null);
    try {
      const result = await onSubmitForVerification?.(proof, localApproved);
      if (result?.txHash) {
        setSubmitTxHash(result.txHash);
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit verification."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Card className="bg-gray-900/80 border-gray-700 rounded-2xl overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚁</span>
            <h3 className="text-white font-bold">Drone Delivery Simulator</h3>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {([1, 2, 3, 4] as const).map((n, i) => (
              <div key={n} className="flex items-center gap-1">
                <StepDot n={n} active={step === n} done={step > n} />
                {i < 3 && <div className={`w-5 h-px ${step > n ? "bg-cyan-500" : "bg-gray-700"}`} />}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-5 space-y-4">

        {/* ── STEP 1: Fleet Scan ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Fleet Scan</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Find an available drone for this delivery
                </p>
              </div>
              <Button
                id="drone-scan-btn"
                onClick={handleScan}
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-sm gap-2"
              >
                <Radar size={15} />
                {scanned ? "Re-Scan" : "🔍 Scan Nearby Drones"}
              </Button>
            </div>

            {scanned && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Found {evaluations.length} drones · {evaluations.filter((e) => e.canAccept).length} eligible
                </p>
                {evaluations.map((ev) => {
                  const drone = fleet.find((d) => d.id === ev.droneId);
                  if (!drone) return null;
                  return (
                    <DroneCard
                      key={drone.id}
                      drone={drone}
                      evaluation={ev}
                        task={deliveryTask}
                      selected={selectedDrone?.id === drone.id}
                      onSelect={() => handleSelectDrone(ev)}
                    />
                  );
                })}
              </div>
            )}

            {!scanned && (
              <div className="text-center py-10 text-gray-600 text-sm">
                Press &quot;Scan Nearby Drones&quot; to find available drones in your area.
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Selected Drone Profile ──────────────────────────────── */}
        {step === 2 && selectedDrone && selectedEval && (
          <div className="space-y-4">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              ← Back to fleet
            </button>

            {/* Profile card */}
            <div className="bg-gray-800/60 border border-cyan-500/25 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{selectedDrone.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {selectedDrone.homeLocation}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-cyan-400">
                    {selectedEval.suitabilityScore.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-gray-500">suitability</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Payload Capacity", value: `${selectedDrone.maxPayloadKg} kg` },
                  { label: "Max Range",        value: `${selectedDrone.maxRangeKm} km` },
                  { label: "Flight Time",      value: `${selectedDrone.maxFlightMinutes} min` },
                  { label: "Success Rate",     value: `${selectedDrone.successRate}%` },
                  { label: "Total Deliveries", value: selectedDrone.totalDeliveries },
                  { label: "Earned",           value: `${selectedDrone.earnedTotal} MON` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-900/60 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
                    <p className="text-white font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>

              <BatteryBar level={selectedDrone.batteryLevel} />

              <div className="text-xs text-gray-400 bg-gray-900/40 rounded-xl px-4 py-3 leading-relaxed">
                Drone will autonomously navigate to pickup at{" "}
                <strong className="text-white">{deliveryTask.requirements.pickupLocation}</strong>, collect
                package, and deliver to{" "}
                <strong className="text-white">{deliveryTask.requirements.dropoffLocation}</strong>.
              </div>
            </div>

            <Button
              id="dispatch-drone-btn"
              onClick={handleDispatch}
              className="w-full h-11 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm gap-2"
            >
              🚀 Dispatch Drone
            </Button>
          </div>
        )}

        {/* ── STEP 3: Live Delivery Timeline ──────────────────────────────── */}
        {step === 3 && proof && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <p className="text-sm font-semibold text-white">Live Delivery Timeline</p>
            </div>

            <CheckpointTimeline proof={proof} visibleCount={visibleCPs} />

            {dispatching && visibleCPs < proof.checkpoints.length && (
              <div className="text-center text-xs text-gray-500 animate-pulse">
                Transmitting telemetry…
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Delivery Proof ───────────────────────────────────────── */}
        {step === 4 && proof && selectedDrone && (
          <div className="space-y-4">
            {/* Result banner */}
            <div
              className={`rounded-xl p-4 flex items-center gap-3 border ${
                proof.deliveryConfirmed
                  ? "bg-green-500/8 border-green-500/25"
                  : "bg-red-500/8 border-red-500/25"
              }`}
            >
              {proof.deliveryConfirmed ? (
                <CheckCircle2 size={22} className="text-green-400 shrink-0" />
              ) : (
                <AlertTriangle size={22} className="text-red-400 shrink-0" />
              )}
              <div>
                <p className={`font-bold text-sm ${proof.deliveryConfirmed ? "text-green-400" : "text-red-400"}`}>
                  {proof.deliveryConfirmed ? "Package delivered" : "Delivery failed"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedDrone.id} · {new Date(proof.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Proof stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                  { icon: <Package size={13} />, label: "Package", value: proof.deliveryConfirmed ? "Delivered" : "Failed" },
                  { icon: <Clock size={13} />, label: "Duration", value: `${proof.durationMinutes.toFixed(0)} min` },
                  { icon: <Zap size={13} />, label: "Battery", value: `${proof.batteryStart}% → ${proof.batteryEnd.toFixed(0)}%` },
                  { icon: <MapPin size={13} />, label: "Distance", value: `${proof.distanceCovered.toFixed(1)} km` },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-cyan-400">{icon}</span>
                  <div>
                    <p className="text-[10px] text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-white">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Battery drain summary */}
            <div className="bg-gray-800/40 rounded-xl px-4 py-3 text-xs text-gray-400">
              Battery drain:{" "}
              <span className="text-white font-semibold">
                {proof.batteryStart}% → {proof.batteryEnd.toFixed(0)}%{" "}
                (−{(proof.batteryStart - proof.batteryEnd).toFixed(0)}% used)
              </span>
            </div>

            {/* Submit */}
            <Button
              id="submit-ai-verify-btn"
              onClick={handleSubmitForVerification}
              disabled={submitLoading}
              className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm gap-2"
            >
              <Send size={14} />
              {submitLoading ? "Submitting payment..." : "Submit & Pay"}
            </Button>

            {submitTxHash && (
              <div className="text-xs bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2 text-emerald-300">
                Monad testnet fatura olustu:{" "}
                <a
                  href={`https://explorer.testnet.monad.xyz/tx/${submitTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline break-all"
                >
                  {submitTxHash}
                </a>
              </div>
            )}

            {submitError && (
              <div className="text-xs bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2 text-red-300">
                {submitError}
              </div>
            )}

            {/* Reset */}
            <button
              onClick={() => {
                setStep(1);
                setScanned(false);
                setSelectedDrone(null);
                setSelectedEval(null);
                setProof(null);
                setVisibleCPs(0);
                setSubmitError(null);
                setSubmitTxHash(null);
              }}
              className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center gap-1"
            >
              <ChevronRight size={12} className="rotate-180" /> Run another simulation
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
