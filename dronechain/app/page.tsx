"use client";

import Link from "next/link";
import WalletConnect from "@/components/WalletConnect";
import { TaskStatus, DeliveryCategory } from "@/lib/types";
import type { DeliveryTask } from "@/lib/types";

// ── Demo deliveries ───────────────────────────────────────────────────────────

const DEMO_DELIVERIES: (DeliveryTask & { icon: string; distanceLabel: string })[] = [
  {
    id: 1,
    icon: "🍕",
    title: "Pizza delivery — Kadıköy to Moda",
    category: DeliveryCategory.FOOD,
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
    status: TaskStatus.IN_TRANSIT,
    creator: "0x1234…abcd",
    assignedDrone: "DRONE-MND-4721",
    createdAt: Date.now(),
    completedAt: 0,
    proofHash: "",
    deadline: Date.now() + 15 * 60 * 1000,
    distanceLabel: "2.1 km",
  },
  {
    id: 2,
    icon: "💊",
    title: "Insulin — Beşiktaş Pharmacy",
    category: DeliveryCategory.PHARMACY,
    requirements: {
      maxWeightKg: 0.5,
      isFragile: true,
      requiresCooling: true,
      requiresSignature: true,
      maxDeliveryMinutes: 20,
      pickupLocation: "Beşiktaş",
      dropoffLocation: "Nişantaşı",
      distanceKm: 3.4,
    },
    rewardEth: "0.08",
    status: TaskStatus.OPEN,
    creator: "0x5678…efgh",
    assignedDrone: "",
    createdAt: Date.now(),
    completedAt: 0,
    proofHash: "",
    deadline: Date.now() + 20 * 60 * 1000,
    distanceLabel: "3.4 km",
  },
  {
    id: 3,
    icon: "📦",
    title: "iPhone 15 Pro — Trendyol",
    category: DeliveryCategory.CARGO,
    requirements: {
      maxWeightKg: 0.8,
      isFragile: true,
      requiresCooling: false,
      requiresSignature: true,
      maxDeliveryMinutes: 30,
      pickupLocation: "Ümraniye",
      dropoffLocation: "Şişli",
      distanceKm: 11.2,
    },
    rewardEth: "0.12",
    status: TaskStatus.DELIVERED,
    creator: "0x9abc…ijkl",
    assignedDrone: "DRONE-MND-0033",
    createdAt: Date.now() - 45 * 60 * 1000,
    completedAt: Date.now() - 5 * 60 * 1000,
    proofHash: "0xdeadbeef",
    deadline: Date.now(),
    distanceLabel: "11.2 km",
  },
];

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  [TaskStatus.OPEN]:       { label: "OPEN",       className: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" },
  [TaskStatus.ACCEPTED]:   { label: "ACCEPTED",   className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" },
  [TaskStatus.IN_TRANSIT]: { label: "IN TRANSIT", className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  [TaskStatus.DELIVERED]:  { label: "DELIVERED",  className: "bg-purple-500/15 text-purple-400 border border-purple-500/30" },
  [TaskStatus.VERIFIED]:   { label: "VERIFIED",   className: "bg-green-500/15 text-green-400 border border-green-500/30" },
  [TaskStatus.FAILED]:     { label: "FAILED",     className: "bg-red-500/15 text-red-400 border border-red-500/30" },
  [TaskStatus.CANCELLED]:  { label: "CANCELLED",  className: "bg-gray-500/15 text-gray-400 border border-gray-500/30" },
};

// ── Category cards ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { icon: "🍕", name: "Food Delivery",  desc: "Hot meals in 15 min" },
  { icon: "🛒", name: "Grocery",        desc: "Fresh produce door to door" },
  { icon: "💊", name: "Pharmacy",       desc: "Medicine when you need it" },
  { icon: "📦", name: "Cargo",          desc: "E-commerce same-hour delivery" },
  { icon: "📄", name: "Document",       desc: "Legal papers, contracts" },
];

// ── Delivery card ─────────────────────────────────────────────────────────────

function DeliveryCard({
  task,
}: {
  task: (typeof DEMO_DELIVERIES)[number];
}) {
  const badge = STATUS_CONFIG[task.status];
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3 hover:border-cyan-500/40 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{task.icon}</span>
          <p className="font-semibold text-white text-sm leading-snug">{task.title}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{task.distanceLabel}</span>
        {task.assignedDrone && (
          <span className="font-mono text-gray-500">{task.assignedDrone}</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-700/60">
        <span className="text-cyan-400 font-bold text-base">{task.rewardEth} MON</span>
        <Link
          href={`/tasks/${task.id}`}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-16">

        {/* NAV */}
        <nav className="flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            <span className="text-cyan-400">Zar</span>go
          </span>
          <WalletConnect />
        </nav>

        {/* HERO */}
        <section className="text-center space-y-6 pt-6">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
            Live on Monad Testnet
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Decentralized<br />
            <span className="text-cyan-400">Drone Delivery</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Connect your drone. Earn MON. Deliver autonomously.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/create"
              className="w-full sm:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors text-sm"
            >
              📦 Request Delivery
            </Link>
            <Link
              href="/drones/register"
              className="w-full sm:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              🚁 Connect My Drone
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 max-w-lg mx-auto">
            {[
              { value: "23",     label: "Active Drones" },
              { value: "147",    label: "Deliveries Today" },
              { value: "12 min", label: "Avg Delivery" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-800/50 border border-gray-700 rounded-xl py-4 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Delivery Categories</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className="shrink-0 bg-gray-800/60 border border-gray-700 hover:border-cyan-500/40 rounded-2xl p-4 w-40 flex flex-col gap-2 cursor-pointer transition-all"
              >
                <span className="text-3xl">{cat.icon}</span>
                <p className="font-semibold text-sm text-white">{cat.name}</p>
                <p className="text-xs text-gray-400 leading-tight">{cat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ACTIVE DELIVERIES */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Active Deliveries</h2>
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                LIVE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_DELIVERIES.map((task) => (
              <DeliveryCard key={task.id} task={task} />
            ))}
          </div>
        </section>

        {/* DRONE NETWORK CTA */}
        <section className="bg-gray-800/40 border border-gray-700 rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-lg">
            <h2 className="text-2xl font-bold">Join the Delivery Network</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your drone earns MON while you sleep. Like mining, but physical.
              Register once, fly autonomously, collect rewards.
            </p>
            <div className="flex gap-6 pt-1">
              <div>
                <p className="text-cyan-400 font-bold text-lg">0.05 MON</p>
                <p className="text-xs text-gray-500">Avg per delivery</p>
              </div>
              <div>
                <p className="text-cyan-400 font-bold text-lg">4.2 MON/day</p>
                <p className="text-xs text-gray-500">Top drone earnings</p>
              </div>
            </div>
          </div>
          <Link
            href="/drones/register"
            className="shrink-0 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            Register Your Drone →
          </Link>
        </section>

      </div>
    </div>
  );
}
