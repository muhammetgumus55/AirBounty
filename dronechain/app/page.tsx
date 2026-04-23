"use client";

import Link from "next/link";
import { Cpu, Radio, Lock } from "lucide-react";
import WalletConnect from "@/components/WalletConnect";
import type { Task } from "@/lib/types";

// ── Demo data ─────────────────────────────────────────────────────────────────

const totalTasks = 47;
const activeDrones = 12;
const monLocked = "234.5";

const DEMO_TASKS: Task[] = [
  {
    id: "1",
    title: "Agricultural Field Survey - Sector B7",
    description: "Survey wheat fields in sector B7 for crop health analysis.",
    requirements: {
      minCoverage: 90,
      maxDurationMinutes: 20,
      altitudeRange: { min: 40, max: 60 },
      additionalConstraints: [],
    },
    reward: "0.08",
    status: "open",
    creator: "0x0000000000000000000000000000000000000000",
    acceptedBy: "0x0000000000000000000000000000000000000000",
    deadline: 0,
  },
  {
    id: "2",
    title: "Infrastructure Inspection - Bridge MND-441",
    description: "Inspect structural integrity of Bridge MND-441.",
    requirements: {
      minCoverage: 95,
      maxDurationMinutes: 30,
      altitudeRange: { min: 30, max: 50 },
      additionalConstraints: [],
    },
    reward: "0.15",
    status: "accepted",
    creator: "0x0000000000000000000000000000000000000000",
    acceptedBy: "0x0000000000000000000000000000000000000000",
    deadline: 0,
  },
  {
    id: "3",
    title: "Security Perimeter Scan - Zone Alpha",
    description: "Scan security perimeter of Zone Alpha for anomalies.",
    requirements: {
      minCoverage: 85,
      maxDurationMinutes: 15,
      altitudeRange: { min: 50, max: 70 },
      additionalConstraints: [],
    },
    reward: "0.05",
    status: "approved",
    creator: "0x0000000000000000000000000000000000000000",
    acceptedBy: "0x0000000000000000000000000000000000000000",
    deadline: 0,
  },
];

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

// ── Inline TaskCard ───────────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const { requirements: req } = task;
  const badgeClass = STATUS_STYLES[task.status] ?? STATUS_STYLES.expired;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-cyan-500/50 transition-all flex flex-col gap-3">
      {/* Title */}
      <p className="font-semibold text-white leading-snug">{task.title}</p>

      {/* Reward + status row */}
      <div className="flex items-center justify-between">
        <span className="text-cyan-400 text-lg font-bold">{task.reward} MON</span>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${badgeClass}`}>
          {task.status.replace("_", " ")}
        </span>
      </div>

      {/* Requirements summary */}
      <p className="text-xs text-gray-400">
        Coverage {req.minCoverage}% &nbsp;·&nbsp; {req.maxDurationMinutes} min &nbsp;·&nbsp;
        {req.altitudeRange.min}–{req.altitudeRange.max} m
      </p>

      {/* Link */}
      <div className="flex justify-end mt-auto">
        <Link
          href="/tasks/demo"
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View Task →
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">

      {/* HEADER ROW */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-cyan-400">🚁 DroneChain</span>
        <WalletConnect />
      </div>

      {/* HERO */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">Autonomous Drone Task Marketplace</h1>
          <p className="text-gray-400 text-lg">
            AI-defined tasks. Autonomous execution. Trustless payments on Monad.
          </p>
        </div>

        {/* Stat boxes */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <Cpu size={22} className="text-cyan-400" />, value: totalTasks,    label: "Total Tasks"    },
            { icon: <Radio size={22} className="text-cyan-400" />, value: activeDrones, label: "Active Drones"  },
            { icon: <Lock size={22} className="text-cyan-400" />, value: `${monLocked} MON`, label: "MON Locked" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-2 text-center"
            >
              {stat.icon}
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-sm text-gray-400">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TASK LIST */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Open Tasks</h2>
          <Link
            href="/create"
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            + Create Task
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEMO_TASKS.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </section>

    </div>
  );
}
