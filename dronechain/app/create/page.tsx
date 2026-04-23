"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import WalletConnect from "@/components/WalletConnect";
import TaskForm from "@/components/TaskForm";
import ContractStatus from "@/components/ContractStatus";
import type { WalletState } from "@/lib/types";

export default function CreatePage() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    balance: null,
  });

  const handleWalletChange = useCallback(
    (state: WalletState) => setWallet(state),
    []
  );

  return (
    <div className="min-h-screen">
      {/* ── Navbar ── */}
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200
                     transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Create a Task</h1>
          <p className="text-slate-400 mt-1.5">
            Define your drone mission, set requirements, and escrow a reward on-chain.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form – takes 2/3 width */}
          <div className="lg:col-span-2">
            <TaskForm walletAddress={wallet.address} />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <ContractStatus />

            {/* Tips card */}
            <div className="bg-slate-900/60 border border-white/8 rounded-2xl p-5 space-y-3">
              <h2 className="text-slate-300 font-semibold text-sm">Tips</h2>
              <ul className="space-y-2 text-xs text-slate-400 list-none">
                {[
                  "Set realistic coverage goals – 95–100% requires longer flight times.",
                  "Altitude constraints affect sensor resolution; lower = more detail.",
                  "Reward is escrowed immediately; it is released only on approval.",
                  "Additional constraints are shown to operators but not enforced on-chain.",
                ].map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-violet-500 shrink-0">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
