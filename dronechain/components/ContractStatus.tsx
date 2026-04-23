"use client";

import { useEffect, useState } from "react";
import {
  Server,
  Hash,
  Layers,
  Activity,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getReadOnlyProvider, CONTRACT_ADDRESS, MONAD_CHAIN_ID } from "@/lib/contract";

// ── Types ─────────────────────────────────────

interface ChainInfo {
  blockNumber: number;
  chainId: number;
  taskCount: number | null;
}

// ── Stat Tile ─────────────────────────────────

interface StatTileProps {
  label: string;
  value: string | number | null;
  icon: React.ReactNode;
  mono?: boolean;
}

function StatTile({ label, value, icon, mono }: StatTileProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-slate-200 font-semibold text-sm truncate ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="text-slate-600">—</span>}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────

interface ContractStatusProps {
  /** Poll interval in ms (default 15 000) */
  pollInterval?: number;
}

export default function ContractStatus({ pollInterval = 15_000 }: ContractStatusProps) {
  const [info,    setInfo]    = useState<ChainInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetch = async () => {
    try {
      const provider = getReadOnlyProvider();
      const blockNumber = await provider.getBlockNumber();
      const network     = await provider.getNetwork();

      // Attempt to read task count (may fail if contract not deployed yet)
      let taskCount: number | null = null;
      try {
        const { Contract } = await import("ethers");
        const { DRONE_TASK_ABI } = await import("@/lib/contract");
        const contract = new Contract(CONTRACT_ADDRESS, DRONE_TASK_ABI, provider);
        taskCount = Number(await contract.taskCount());
      } catch {
        /* contract not deployed */
      }

      setInfo({
        blockNumber,
        chainId:   Number(network.chainId),
        taskCount,
      });
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "RPC connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollInterval);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollInterval]);

  const isCorrectChain = info?.chainId === MONAD_CHAIN_ID;
  const hasContract    = CONTRACT_ADDRESS.length > 5;

  // ── Render ─────────────────────────────────
  return (
    <Card className="bg-slate-900/60 border-white/8 rounded-2xl">
      <CardHeader className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={15} className="text-slate-400" />
            <h3 className="text-slate-300 font-medium text-sm">Contract Status</h3>
          </div>

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {loading ? (
              <Loader2 size={12} className="animate-spin text-slate-400" />
            ) : error ? (
              <AlertCircle size={12} className="text-red-400" />
            ) : (
              <CheckCircle2 size={12} className="text-emerald-400" />
            )}
            <span className={`${error ? "text-red-400" : "text-slate-400"}`}>
              {loading ? "Syncing…" : error ? "Error" : "Live"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-3">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs">
            {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="Network"
                value={isCorrectChain ? "Monad Testnet" : info?.chainId ? `Chain ${info.chainId}` : null}
                icon={<Activity size={11} />}
              />
              <StatTile
                label="Block"
                value={info?.blockNumber?.toLocaleString() ?? null}
                icon={<Layers size={11} />}
                mono
              />
              <StatTile
                label="Total Tasks"
                value={info?.taskCount ?? (hasContract ? "Loading…" : "Not deployed")}
                icon={<Hash size={11} />}
              />
              <StatTile
                label="Contract"
                value={
                  hasContract
                    ? `${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(-4)}`
                    : "Not configured"
                }
                icon={<Server size={11} />}
                mono
              />
            </div>

            {/* Last sync */}
            {lastSync && (
              <p className="text-[10px] text-slate-600 text-right">
                Last synced: {lastSync.toLocaleTimeString()}
              </p>
            )}

            {/* Warnings */}
            {!isCorrectChain && info && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-amber-400 text-xs flex items-center gap-1.5">
                <AlertCircle size={11} />
                Connected to wrong network. Switch to Monad Testnet.
              </div>
            )}
            {!hasContract && (
              <div className="bg-slate-800/40 border border-white/5 rounded-xl px-3 py-2 text-slate-500 text-xs">
                Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local to connect the contract.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
