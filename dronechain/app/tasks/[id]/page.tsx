"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DroneSimulator from "@/components/DroneSimulator";
import VerificationPanel from "@/components/VerificationPanel";
import { getSigner, getTask, submitProof, verifyAndPay } from "@/lib/contract";
import {
  simulateDroneEvaluation,
  simulateDelivery,
  getFleet,
} from "@/lib/droneSimulator";
import { parseWeb3Error } from "@/lib/txErrors";
import type {
  DeliveryTask,
  DeliveryProof,
  DroneEvaluation,
  VerificationResult,
  TaskStatus,
} from "@/lib/types";

// ── Demo task ─────────────────────────────────────────────────────────────────

const DEMO_TASK: DeliveryTask = {
  id: 1,
  title: "Pizza Delivery — Kadıköy to Moda [DEMO]",
  category: 0, // FOOD
  requirements: {
    maxWeightKg: 1.5,
    isFragile: false,
    requiresCooling: true,
    requiresSignature: false,
    maxDeliveryMinutes: 15,
    pickupLocation: "Kadıköy",
    dropoffLocation: "Moda",
    distanceKm: 2.1,
  },
  rewardEth: "0.03",
  status: 0, // OPEN
  creator: "0x1234...abcd",
  assignedDrone: "",
  createdAt: Date.now(),
  completedAt: 0,
  proofHash: "",
  deadline: Date.now() + 15 * 60 * 1000,
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, { label: string; className: string }> = {
  0: { label: "OPEN",       className: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" },
  1: { label: "ACCEPTED",   className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" },
  2: { label: "IN TRANSIT", className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  3: { label: "DELIVERED",  className: "bg-purple-500/15 text-purple-400 border border-purple-500/30" },
  4: { label: "VERIFIED",   className: "bg-green-500/15 text-green-400 border border-green-500/30" },
  5: { label: "FAILED",     className: "bg-red-500/15 text-red-400 border border-red-500/30" },
  6: { label: "CANCELLED",  className: "bg-gray-500/15 text-gray-400 border border-gray-500/30" },
};

const CATEGORY_LABELS = ["🍕 Food", "🛒 Grocery", "💊 Pharmacy", "📦 Cargo", "📄 Document"];

// ── Notification toast ────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: string }) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg ${
        type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {message}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const params = useParams();
  const idParam =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "1";

  const [task,               setTask]               = useState<DeliveryTask>(DEMO_TASK);
  const [evaluation,         setEvaluation]         = useState<DroneEvaluation | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [currentProof,       setCurrentProof]       = useState<DeliveryProof | null>(null);
  const [isLoading,          setIsLoading]          = useState(false);
  const [notification,       setNotification]       = useState<{ message: string; type: string } | null>(null);

  // Load task by id (demo tasks 1-3 mapped from DEMO data on home page)
  useEffect(() => {
    // For the demo, we always use DEMO_TASK but can adapt id
    setTask({ ...DEMO_TASK, id: Number(idParam) || 1 });
  }, [idParam]);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleEvaluate() {
    const result = simulateDroneEvaluation(task);
    setEvaluation(result);
  }

  async function handleSubmitProof(success: boolean) {
    if (!evaluation || !task) return;
    setIsLoading(true);
    try {
      const fleet = getFleet();
      const drone = fleet.find(d => d.id === evaluation.droneId) ?? fleet[0];
      const proof = simulateDelivery(drone, task, success);
      setCurrentProof(proof);
      localStorage.setItem(`proof_${task.id}`, JSON.stringify(proof));
      setNotification({ message: success ? "Proof submitted!" : "Failed proof submitted.", type: success ? "success" : "error" });
    } catch (err) {
      setNotification({ message: String(err), type: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleProofGenerated(proof: DeliveryProof) {
    setCurrentProof(proof);
    // Persist for AI verification
    localStorage.setItem(`proof_${task.id}`, JSON.stringify(proof));
  }

  async function handleSubmitForVerification(
    proof: DeliveryProof,
    localApproved: boolean
  ): Promise<{ txHash?: string }> {
    setCurrentProof(proof);
    localStorage.setItem(`proof_${task.id}`, JSON.stringify(proof));

    try {
      if (!localApproved) {
        throw new Error("Local check failed. Payment will not be submitted.");
      }

      const onchainTask = await getTask(Number(task.id));
      if (onchainTask.status === "open") {
        const simulatedTx = `SIMULATED-OPEN-PAY-${proof.taskId}-${proof.timestamp}`;
        setNotification({
          message:
            "Demo mode: task is OPEN on-chain, but local check passed — simulated accept + pay.",
          type: "success",
        });
        return { txHash: simulatedTx };
      }
      if (onchainTask.status !== "accepted") {
        throw new Error(
          `Task must be ACCEPTED before proof submit. Current status: ${onchainTask.status.toUpperCase()}`
        );
      }

      const signer = await getSigner();
      const signerAddress = (await signer.getAddress()).toLowerCase();
      const assignedDrone = onchainTask.acceptedBy.toLowerCase();
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      if (assignedDrone === zeroAddress || assignedDrone !== signerAddress) {
        throw new Error("Please switch to the assigned drone wallet before submitting proof.");
      }

      const proofHash = `proof:${proof.droneId}:${proof.timestamp}`;
      const proofTxHash = await submitProof(Number(task.id), proofHash);

      // Pay immediately (owner-only on-chain; if not owner, we simulate for demo)
      try {
        const payTxHash = await verifyAndPay(Number(task.id), true);
        setNotification({
          message: `Paid on Monad: ${payTxHash.slice(0, 10)}…`,
          type: "success",
        });
        return { txHash: payTxHash };
      } catch (err) {
        const msg = parseWeb3Error(err);
        const simulatedTx = `SIMULATED-PAY-${proof.taskId}-${proof.timestamp}`;
        setNotification({
          message: `Demo mode: payment simulated. (${msg})`,
          type: "success",
        });
        return { txHash: simulatedTx };
      }

      setNotification({
        message: `Proof submitted on Monad: ${proofTxHash.slice(0, 10)}…`,
        type: "success",
      });
      return { txHash: proofTxHash };
    } catch (err) {
      throw new Error(parseWeb3Error(err));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const badge = STATUS_LABELS[task.status] ?? STATUS_LABELS[0];
  const req   = task.requirements;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {notification && <Toast message={notification.message} type={notification.type} />}

      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← All Deliveries
      </Link>

      {/* Task detail card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">{task.title}</h1>
            <p className="text-sm text-gray-400">
              Creator: <span className="font-mono text-gray-300">{task.creator}</span>
            </p>
            <span className="text-xs text-gray-500">{CATEGORY_LABELS[task.category]}</span>
          </div>
          <div className="text-right">
            <p className="text-cyan-400 text-3xl font-bold">{task.rewardEth} MON</p>
            <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Requirements grid */}
        <hr className="border-gray-700" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Max Weight</p>
            <p className="text-white font-semibold">{req.maxWeightKg} kg</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Max Time</p>
            <p className="text-white font-semibold">{req.maxDeliveryMinutes} min</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Distance</p>
            <p className="text-white font-semibold">{req.distanceKm} km</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Cooling</p>
            <p className={`font-semibold ${req.requiresCooling ? "text-cyan-400" : "text-gray-400"}`}>
              {req.requiresCooling ? "Required" : "No"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-gray-700/60 text-gray-300 px-3 py-1 rounded-full">
            📍 From: {req.pickupLocation}
          </span>
          <span className="bg-gray-700/60 text-gray-300 px-3 py-1 rounded-full">
            🏁 To: {req.dropoffLocation}
          </span>
          {req.isFragile && (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">
              ⚠️ Fragile
            </span>
          )}
          {req.requiresSignature && (
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full">
              ✍️ Signature Required
            </span>
          )}
        </div>
      </div>

      <hr className="border-gray-700" />

      {/* Interaction area */}
      <div className="space-y-6">
        {/* Quick evaluate (legacy fallback, always available) */}
        {!currentProof && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Quick Drone Evaluation</h2>
              <button
                onClick={handleEvaluate}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Evaluate Drone
              </button>
            </div>

            {evaluation ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Drone ID</p>
                  <p className="text-white font-mono text-xs">{evaluation.droneId}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Battery</p>
                  <p className={`font-semibold ${evaluation.batteryLevel >= 70 ? "text-green-400" : "text-red-400"}`}>
                    {evaluation.batteryLevel}%
                  </p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Distance</p>
                  <p className="text-white font-semibold">{evaluation.distanceKm} km</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Status</p>
                  <p className={`font-semibold text-sm ${evaluation.canAccept ? "text-green-400" : "text-red-400"}`}>
                    {evaluation.canAccept ? "Ready" : "Unavailable"}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-4 text-xs text-gray-400 bg-gray-900 rounded-lg px-3 py-2">
                  {evaluation.reason}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Click &quot;Evaluate Drone&quot; to check availability.</p>
            )}

            {evaluation?.canAccept && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmitProof(true)}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  {isLoading ? "Submitting…" : "Submit Successful Proof"}
                </button>
                <button
                  onClick={() => handleSubmitProof(false)}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Submit Failed Proof
                </button>
              </div>
            )}
          </div>
        )}

        {/* Full 4-step simulator */}
        <DroneSimulator
          task={task}
          onProofGenerated={handleProofGenerated}
          onSubmitForVerification={handleSubmitForVerification}
        />

        {/* Verification panel — shown after proof generated */}
        {currentProof && (
          <VerificationPanel task={{ 
            id: String(task.id),
            title: task.title,
            description: `Delivery from ${req.pickupLocation} to ${req.dropoffLocation}`,
            requirements: {
              minCoverage: 100,
              maxDurationMinutes: req.maxDeliveryMinutes,
              altitudeRange: { min: 20, max: 50 },
              additionalConstraints: [],
            },
            reward: task.rewardEth,
            status: "submitted",
            creator: task.creator,
            acceptedBy: task.assignedDrone,
            deadline: task.deadline,
          }} proof={currentProof} />
        )}

        {verificationResult && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center">
            <p className={`font-bold text-lg ${verificationResult.approved ? "text-green-400" : "text-red-400"}`}>
              {verificationResult.approved ? "✅ AI Approved" : "❌ AI Rejected"}
            </p>
            <p className="text-sm text-gray-400 mt-1">{verificationResult.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}
