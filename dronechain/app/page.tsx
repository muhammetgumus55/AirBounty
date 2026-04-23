"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import WalletConnect from "@/components/WalletConnect";
import TaskCard from "@/components/TaskCard";
import ContractStatus from "@/components/ContractStatus";
import { getMockTasks } from "@/lib/droneSimulator";
import { acceptTask } from "@/lib/contract";
import type { Task, TaskStatus, WalletState } from "@/lib/types";

// ── Filter Options ────────────────────────────

const STATUS_FILTERS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all",      label: "All"      },
  { value: "open",     label: "Open"     },
  { value: "accepted", label: "Accepted" },
  { value: "submitted",label: "Submitted"},
  { value: "approved", label: "Approved" },
];

// ── Page ──────────────────────────────────────

export default function HomePage() {
  const [wallet,        setWallet]        = useState<WalletState>({ address: null, isConnected: false, chainId: null, balance: null });
  const [tasks,         setTasks]         = useState<Task[]>(getMockTasks());
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<TaskStatus | "all">("all");
  const [accepting,     setAccepting]     = useState<string | null>(null);

  // ── Filtering ──────────────────────────────
  const filtered = tasks.filter((t) => {
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // ── Accept handler ─────────────────────────
  const handleAccept = async (taskId: string) => {
    if (!wallet.address) return;
    setAccepting(taskId);
    try {
      await acceptTask(taskId);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "accepted", acceptedBy: wallet.address! }
            : t
        )
      );
    } catch (err) {
      console.error("Accept failed:", err);
    } finally {
      setAccepting(null);
    }
  };

  const handleWalletChange = useCallback((state: WalletState) => setWallet(state), []);

  // ── Render ─────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 border-b border-white/8 backdrop-blur-xl bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              Drone<span className="text-violet-400">Chain</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <Link href="/"       className="hover:text-slate-200 transition-colors">Marketplace</Link>
            <Link href="/create" className="hover:text-slate-200 transition-colors">Post Task</Link>
          </div>

          <WalletConnect onWalletChange={handleWalletChange} />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Hero ── */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20
                          rounded-full px-4 py-1.5 text-xs text-violet-400 font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Built on Monad Testnet
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight
                         bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent mb-4">
            Autonomous Drone<br />Task Marketplace
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Post missions, send drones, earn rewards. All verified on-chain by AI.
          </p>
          <Link href="/create">
            <Button
              id="hero-create-btn"
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 h-12
                         rounded-xl text-base gap-2 shadow-[0_0_30px_rgba(139,92,246,0.4)]
                         hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-all"
            >
              <PlusCircle size={18} /> Post a Task
            </Button>
          </Link>
        </section>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Open Tasks",    value: tasks.filter((t) => t.status === "open").length    },
            { label: "Total Rewards", value: `${tasks.reduce((s, t) => s + parseFloat(t.reward), 0).toFixed(2)} MON` },
            { label: "Completed",     value: tasks.filter((t) => t.status === "approved").length },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-slate-900/60 border border-white/8 rounded-2xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* ── Sidebar ── */}
          <aside className="lg:col-span-1 space-y-5">
            <ContractStatus />

            {/* Status filter */}
            <div className="bg-slate-900/60 border border-white/8 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400 font-medium mb-1">
                <SlidersHorizontal size={14} /> Filter
              </div>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  id={`filter-${f.value}`}
                  onClick={() => setStatusFilter(f.value as TaskStatus | "all")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                    ${statusFilter === f.value
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                      : "text-slate-400 hover:bg-white/5"
                    }`}
                >
                  {f.label}
                  <span className="float-right text-xs text-slate-600">
                    {f.value === "all"
                      ? tasks.length
                      : tasks.filter((t) => t.status === f.value).length}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* ── Task Grid ── */}
          <section className="lg:col-span-3 space-y-5">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                id="task-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="pl-10 bg-slate-900/60 border-white/8 text-slate-100
                           placeholder:text-slate-600 focus:border-violet-500 h-11 rounded-xl"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm mt-1">Try a different filter or search term.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentAddress={wallet.address}
                    onAccept={handleAccept}
                    isAccepting={accepting === task.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
