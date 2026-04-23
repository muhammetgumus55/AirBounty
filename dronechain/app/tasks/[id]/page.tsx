"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DroneSimulator from "@/components/DroneSimulator";
import VerificationPanel from "@/components/VerificationPanel";
import { simulateDroneEvaluation, generateDroneProof } from "@/lib/droneSimulator";
import { verifyDroneTask } from "@/lib/aiService";
import { acceptTask, submitProof, verifyAndPay, getTask } from "@/lib/contract";
import type { Task, DroneEvaluation, VerificationResult, DroneProof } from "@/lib/types";

// ── Demo task (only rendered when params.id === "demo") ───────────────────────

const DEMO_TASK: Task = {
  id: "demo",
  title: "Agricultural Field Survey - Sector B7 [DEMO]",
  description:
    "Capture comprehensive aerial imagery of the northern agricultural zone for crop health analysis. Ensure full coverage of irrigation systems and growth patterns.",
  requirements: {
    minCoverage: 90,
    maxDurationMinutes: 20,
    altitudeRange: { min: 40, max: 60 },
    additionalConstraints: ["avoid residential zones", "capture in daylight only"],
  },
  reward: "0.08",
  status: "open",
  creator: "0x1234...abcd",
  acceptedBy: "",
  deadline: 0,
};

// ── Notification toast ────────────────────────────────────────────────────────

type Notification = { message: string; type: string };

function Toast({ notification }: { notification: Notification }) {
  const isSuccess = notification.type === "success";
  return (
    <div
      className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-lg ${
        isSuccess ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {notification.message}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  open:        "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  accepted:    "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  in_progress: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  submitted:   "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  approved:    "bg-green-500/15 text-green-400 border border-green-500/30",
  rejected:    "bg-red-500/15 text-red-400 border border-red-500/30",
  expired:     "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const params = useParams();
  const idParam =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "demo";
  const isDemo = idParam === "demo";

  const [task,               setTask]               = useState<Task | null>(null);
  const [pageLoading,        setPageLoading]        = useState(true);
  const [loadError,          setLoadError]          = useState(false);
  const [evaluation,         setEvaluation]         = useState<DroneEvaluation | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [currentProof,       setCurrentProof]       = useState<DroneProof | null>(null);
  const [isLoading,          setIsLoading]          = useState(false);
  const [isVerifying,        setIsVerifying]        = useState(false);
  const [notification,       setNotification]       = useState<Notification | null>(null);
  const verifyTriggered                             = useRef(false);

  // ── Load task on mount ────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      if (isDemo) {
        setTask(DEMO_TASK);
        setPageLoading(false);
        return;
      }
      try {
        const t = await getTask(Number(idParam));
        setTask(t);
      } catch {
        setLoadError(true);
      } finally {
        setPageLoading(false);
      }
    }
    load();
  }, [idParam, isDemo]);

  // ── Restore verification result from localStorage (VERIFIED / FAILED) ─────

  useEffect(() => {
    if (!task) return;
    if (task.status !== "approved" && task.status !== "rejected") return;
    if (verificationResult) return;
    try {
      const stored = localStorage.getItem(`verify_${task.id}`);
      if (stored) setVerificationResult(JSON.parse(stored));
    } catch {
      // ignore corrupt storage
    }
  }, [task, verificationResult]);

  // ── Auto-trigger AI verification when status is COMPLETED (submitted) ─────

  useEffect(() => {
    if (!task || task.status !== "submitted" || verifyTriggered.current) return;
    try {
      const storedProof = localStorage.getItem(`proof_${task.id}`);
      if (!storedProof) return;
      const proof: DroneProof = JSON.parse(storedProof);
      verifyTriggered.current = true;
      setIsVerifying(true);
      verifyDroneTask(task, proof)
        .then((result) => {
          setVerificationResult(result);
          localStorage.setItem(`verify_${task.id}`, JSON.stringify(result));
        })
        .catch((err) => {
          setNotification({
            message: "Verification failed: " + (err instanceof Error ? err.message : String(err)),
            type: "error",
          });
          verifyTriggered.current = false; // allow retry
        })
        .finally(() => setIsVerifying(false));
    } catch {
      // ignore corrupt storage
    }
  }, [task]);

  // ── Auto-dismiss notification ─────────────────────────────────────────────

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleEvaluate(): DroneEvaluation {
    const result = simulateDroneEvaluation(task!);
    setEvaluation(result);
    return result;
  }

  async function handleAccept() {
    if (!task) return;
    try {
      await acceptTask(task.id);
      setTask(await getTask(Number(task.id)));
      setNotification({ message: "Task accepted!", type: "success" });
    } catch (err) {
      setNotification({
        message: "Accept failed: " + (err instanceof Error ? err.message : String(err)),
        type: "error",
      });
    }
  }

  async function handleSubmitProof(success: boolean) {
    if (!evaluation || !task) return;
    setIsLoading(true);
    try {
      const proof = generateDroneProof(task, evaluation.droneId, success);
      setCurrentProof(proof);
      localStorage.setItem(`proof_${task.id}`, JSON.stringify(proof));
      await submitProof(proof);
      setTask(await getTask(Number(task.id)));
      const result = await verifyDroneTask(task, proof);
      setVerificationResult(result);
      localStorage.setItem(`verify_${task.id}`, JSON.stringify(result));
    } catch (err) {
      setNotification({
        message: "Proof submission failed: " + (err instanceof Error ? err.message : String(err)),
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProcessPayment() {
    if (!verificationResult || !task) return;
    try {
      await verifyAndPay(Number(task.id), verificationResult.approved);
      setNotification({ message: "Payment processed on Monad!", type: "success" });
    } catch (err) {
      setNotification({
        message: "Payment failed: " + (err instanceof Error ? err.message : String(err)),
        type: "error",
      });
    }
  }

  // ── Loading / error screens ───────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
        Loading task...
      </div>
    );
  }

  if (loadError || !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-300">Task not found.</p>
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
          ← Back to all tasks
        </Link>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const badgeClass = STATUS_STYLES[task.status] ?? STATUS_STYLES.expired;
  const req        = task.requirements;
  const status     = task.status;

  // ── Status-aware interaction area ─────────────────────────────────────────

  let interactionArea: React.ReactNode;

  if (verificationResult !== null) {
    // Verification result available — show panel regardless of chain status
    interactionArea = (
      <div className="space-y-5">
        <VerificationPanel task={task} proof={currentProof} isProcessing={isLoading} />
        <button
          onClick={handleProcessPayment}
          disabled={isLoading}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
        >
          Process Payment on Monad
        </button>
        <button
          onClick={() => {
            setVerificationResult(null);
            setCurrentProof(null);
          }}
          className="w-full py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Run Another Simulation
        </button>
      </div>
    );
  } else if (status === "approved" || status === "rejected") {
    // Chain says VERIFIED / FAILED but localStorage was cleared — show fallback
    interactionArea = (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center space-y-2">
        <p className="text-white font-semibold">
          {status === "approved" ? "Task verified — payment released." : "Task failed verification."}
        </p>
        <p className="text-sm text-gray-400">Verification details are no longer available in this browser.</p>
      </div>
    );
  } else if (status === "submitted") {
    // COMPLETED on chain — awaiting AI verification (auto-triggered above)
    interactionArea = (
      <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6 text-center space-y-3">
        <p className="text-white font-semibold">Proof submitted, awaiting AI verification</p>
        {isVerifying && (
          <p className="text-sm text-gray-400 animate-pulse">Running AI verification…</p>
        )}
      </div>
    );
  } else if (status === "accepted") {
    // ACCEPTED — drone assigned, show banner + proof submission controls
    interactionArea = (
      <div className="space-y-6">
        <div className="bg-gray-800 border border-yellow-500/30 rounded-xl p-5 text-center">
          <p className="text-yellow-400 font-semibold">Drone assigned, awaiting proof submission</p>
        </div>

        <DroneSimulator task={task} />

        {evaluation && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-white">Submit Proof</h2>
            <p className="text-xs text-gray-400">Simulate mission outcome and submit proof for AI verification.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmitProof(true)}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {isLoading ? "Verifying…" : "Submit Successful Proof"}
              </button>
              <button
                onClick={() => handleSubmitProof(false)}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Submit Failed Proof
              </button>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    // OPEN (or any other status) — full evaluation → accept → simulate → submit flow
    interactionArea = (
      <div className="space-y-6">
        {/* Drone evaluation */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Drone Evaluation</h2>
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

          {evaluation?.canAccept && status === "open" && (
            <button
              onClick={handleAccept}
              className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Accept Task
            </button>
          )}
        </div>

        {/* Simulator */}
        <DroneSimulator task={task} />

        {/* Submit proof controls */}
        {evaluation && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-white">Submit Proof</h2>
            <p className="text-xs text-gray-400">Simulate mission outcome and submit proof for AI verification.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmitProof(true)}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {isLoading ? "Verifying…" : "Submit Successful Proof"}
              </button>
              <button
                onClick={() => handleSubmitProof(false)}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Submit Failed Proof
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {/* Notification */}
      {notification && <Toast notification={notification} />}

      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← All Tasks
      </Link>

      {/* Task detail card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">{task.title}</h1>
            <p className="text-sm text-gray-400">
              Creator: <span className="font-mono text-gray-300">{task.creator}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-cyan-400 text-3xl font-bold">{task.reward} MON</p>
            <span
              className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${badgeClass}`}
            >
              {task.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed">{task.description}</p>

        {/* Requirements grid */}
        <hr className="border-gray-700" />
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Coverage</p>
            <p className="text-white font-semibold">{req.minCoverage}%</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Duration</p>
            <p className="text-white font-semibold">{req.maxDurationMinutes} min</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Altitude</p>
            <p className="text-white font-semibold">
              {req.altitudeRange.min}–{req.altitudeRange.max} m
            </p>
          </div>
        </div>

        {req.additionalConstraints.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {req.additionalConstraints.map((c, i) => (
              <span key={i} className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-gray-700" />

      {/* Status-aware interaction area */}
      {interactionArea}
    </div>
  );
}
