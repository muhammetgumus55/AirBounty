"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  RotateCcw,
  Wifi,
  Battery,
  Navigation,
  Mountain,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  simulateDroneProof,
  generateTelemetryStream,
  type SimulationMode,
  type TelemetryFrame,
} from "@/lib/droneSimulator";
import type { Task, DroneProof } from "@/lib/types";

// ── Mini Gauge ────────────────────────────────

interface GaugeProps {
  value: number;
  max?: number;
  label: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

function Gauge({ value, max = 100, label, unit, color, icon }: GaugeProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="bg-slate-800/60 rounded-xl p-3 space-y-2 border border-white/5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">{icon}{label}</span>
        <span className={`font-bold text-sm ${color}`}>
          {value.toFixed(1)}<span className="text-xs font-normal text-slate-500 ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color.replace("text-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Mini Map Dot ─────────────────────────────

interface MapDotProps {
  frames: TelemetryFrame[];
  currentIdx: number;
}

function PathMap({ frames, currentIdx }: MapDotProps) {
  if (frames.length === 0) return null;

  const lats = frames.map((f) => f.lat);
  const lngs = frames.map((f) => f.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  const toX = (lng: number) =>
    maxLng === minLng ? 50 : ((lng - minLng) / (maxLng - minLng)) * 90 + 5;
  const toY = (lat: number) =>
    maxLat === minLat ? 50 : ((maxLat - lat) / (maxLat - minLat)) * 90 + 5;

  const pathD = frames
    .slice(0, currentIdx + 1)
    .map((f, i) => `${i === 0 ? "M" : "L"} ${toX(f.lng)} ${toY(f.lat)}`)
    .join(" ");

  const cur = frames[currentIdx];

  return (
    <div className="bg-slate-800/60 rounded-xl border border-white/5 overflow-hidden">
      <div className="text-xs text-slate-400 px-3 pt-2 pb-1 flex items-center gap-1">
        <Navigation size={11} /> GPS Track
      </div>
      <svg viewBox="0 0 100 100" className="w-full" style={{ height: 120 }}>
        {/* Grid */}
        {[25, 50, 75].map((v) => (
          <g key={v}>
            <line x1={v} y1={0} x2={v} y2={100} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <line x1={0} y1={v} x2={100} y2={v} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          </g>
        ))}
        {/* Path */}
        {pathD && (
          <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.6" />
        )}
        {/* Current position */}
        {cur && (
          <>
            <circle cx={toX(cur.lng)} cy={toY(cur.lat)} r="3" fill="#8b5cf6" opacity="0.3" />
            <circle cx={toX(cur.lng)} cy={toY(cur.lat)} r="1.5" fill="#a78bfa" />
          </>
        )}
        {/* Origin */}
        {frames[0] && (
          <circle cx={toX(frames[0].lng)} cy={toY(frames[0].lat)} r="2" fill="#10b981" />
        )}
      </svg>
    </div>
  );
}

// ── Component ─────────────────────────────────

interface DroneSimulatorProps {
  task: Task;
  onProofGenerated?: (proof: DroneProof) => void;
}

export default function DroneSimulator({ task, onProofGenerated }: DroneSimulatorProps) {
  const [mode, setMode]         = useState<SimulationMode>("compliant");
  const [running, setRunning]   = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);
  const [proof, setProof]       = useState<DroneProof | null>(null);

  const framesRef = useRef<TelemetryFrame[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-generate frames on mount / mode change
  useEffect(() => {
    const midAlt =
      (task.requirements.altitudeRange.min + task.requirements.altitudeRange.max) / 2;
    framesRef.current = generateTelemetryStream(
      task.requirements.maxDurationMinutes,
      midAlt,
      80
    );
    setFrameIdx(0);
    setProof(null);
  }, [task, mode]);

  // Animation loop
  useEffect(() => {
    if (!running) return;

    timerRef.current = setInterval(() => {
      setFrameIdx((idx) => {
        const next = idx + 1;
        if (next >= framesRef.current.length) {
          clearInterval(timerRef.current!);
          setRunning(false);
          // Generate final proof
          const generated = simulateDroneProof(task, mode);
          setProof(generated);
          onProofGenerated?.(generated);
          return framesRef.current.length - 1;
        }
        return next;
      });
    }, 80); // ~80ms per frame → ~6.4s for 80 frames

    return () => clearInterval(timerRef.current!);
  }, [running, task, mode, onProofGenerated]);

  const start = () => {
    if (running) return;
    setFrameIdx(0);
    setProof(null);
    setRunning(true);
  };

  const stop = () => {
    clearInterval(timerRef.current!);
    setRunning(false);
  };

  const reset = () => {
    clearInterval(timerRef.current!);
    setRunning(false);
    setFrameIdx(0);
    setProof(null);
  };

  const frame: TelemetryFrame = framesRef.current[frameIdx] ?? {
    elapsed: 0, altitude: 0, coverage: 0, battery: 100, lat: 0, lng: 0, speed: 0,
  };

  const progress = framesRef.current.length > 0
    ? (frameIdx / (framesRef.current.length - 1)) * 100
    : 0;

  // ── Render ─────────────────────────────────
  return (
    <Card className="bg-slate-900/60 border-white/8 rounded-2xl overflow-hidden">
      <CardHeader className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
            <h3 className="text-slate-200 font-semibold">Drone Simulator</h3>
          </div>

          {/* Mode selector */}
          <div className="flex gap-1 bg-slate-800/80 rounded-lg p-0.5">
            {(["compliant", "borderline", "non_compliant"] as SimulationMode[]).map((m) => (
              <button
                key={m}
                id={`sim-mode-${m}`}
                onClick={() => { reset(); setMode(m); }}
                className={`text-[10px] px-2.5 py-1 rounded-md font-medium transition-all ${
                  mode === m
                    ? m === "compliant"     ? "bg-emerald-600 text-white"
                    : m === "borderline"    ? "bg-amber-600 text-white"
                    : "bg-red-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "non_compliant" ? "Fail" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
          <span>0:00</span>
          <span>{running ? `${frame.elapsed.toFixed(0)}s elapsed` : "Ready"}</span>
          <span>{task.requirements.maxDurationMinutes}:00</span>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-3">
        {/* Gauges */}
        <div className="grid grid-cols-2 gap-2">
          <Gauge
            value={frame.altitude}
            max={task.requirements.altitudeRange.max * 1.2}
            label="Altitude"
            unit="m"
            color="text-sky-400"
            icon={<Mountain size={11} />}
          />
          <Gauge
            value={frame.coverage}
            max={100}
            label="Coverage"
            unit="%"
            color="text-violet-400"
            icon={<Activity size={11} />}
          />
          <Gauge
            value={frame.battery}
            max={100}
            label="Battery"
            unit="%"
            color={frame.battery < 30 ? "text-red-400" : "text-emerald-400"}
            icon={<Battery size={11} />}
          />
          <Gauge
            value={frame.speed}
            max={25}
            label="Speed"
            unit="m/s"
            color="text-amber-400"
            icon={<Wifi size={11} />}
          />
        </div>

        {/* GPS Map */}
        <PathMap frames={framesRef.current} currentIdx={frameIdx} />

        {/* Proof result */}
        {proof && (
          <div className="bg-slate-800/60 rounded-xl border border-white/5 p-3 text-xs space-y-1">
            <p className="text-slate-400 font-medium">Generated Proof</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-300 font-mono">
              <span>Coverage</span><span className="text-right">{proof.coveragePercent.toFixed(1)}%</span>
              <span>Duration</span><span className="text-right">{proof.durationMinutes.toFixed(1)} min</span>
              <span>Altitude</span><span className="text-right">{proof.altitude.toFixed(1)} m</span>
              <span>Drone ID</span><span className="text-right truncate">{proof.droneId}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 pt-1">
          <Button
            id="sim-start-btn"
            onClick={start}
            disabled={running}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold h-9 gap-1.5"
          >
            <Play size={14} /> Simulate
          </Button>
          <Button
            id="sim-stop-btn"
            onClick={stop}
            disabled={!running}
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5 h-9 px-3"
          >
            <Square size={14} />
          </Button>
          <Button
            id="sim-reset-btn"
            onClick={reset}
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5 h-9 px-3"
          >
            <RotateCcw size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
