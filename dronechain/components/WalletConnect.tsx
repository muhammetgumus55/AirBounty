"use client";

import { useState, useEffect, useCallback } from "react";
import { formatEther } from "ethers";
import { Wallet, LogOut, ChevronDown, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBrowserProvider,
  switchToMonad,
  MONAD_CHAIN_ID,
} from "@/lib/contract";
import type { WalletState } from "@/lib/types";

// ── Helpers ────────────────────────────────────

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getChainLabel(chainId: number | null): string {
  if (chainId === MONAD_CHAIN_ID) return "Monad Testnet";
  if (chainId === 1)              return "Ethereum Mainnet";
  if (chainId === 11155111)       return "Sepolia";
  return chainId ? `Chain ${chainId}` : "Unknown";
}

// ── Component ─────────────────────────────────

interface WalletConnectProps {
  onWalletChange?: (state: WalletState) => void;
}

export default function WalletConnect({ onWalletChange }: WalletConnectProps) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    balance: null,
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── State updater ──────────────────────────
  const updateWallet = useCallback(
    (patch: Partial<WalletState>) => {
      setWallet((prev) => {
        const next = { ...prev, ...patch };
        onWalletChange?.(next);
        return next;
      });
    },
    [onWalletChange]
  );

  // ── Balance fetch ──────────────────────────
  const fetchBalance = useCallback(
    async (address: string) => {
      try {
        const provider = getBrowserProvider();
        const raw = await provider.getBalance(address);
        updateWallet({ balance: parseFloat(formatEther(raw)).toFixed(4) });
      } catch {
        /* non-critical */
      }
    },
    [updateWallet]
  );

  // ── Connect ────────────────────────────────
  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        throw new Error("MetaMask not detected. Please install it first.");
      }
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      updateWallet({ address, isConnected: true, chainId });
      await fetchBalance(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Disconnect (local state only) ──────────
  const disconnect = () => {
    updateWallet({ address: null, isConnected: false, chainId: null, balance: null });
    setMenuOpen(false);
  };

  // ── Switch chain ───────────────────────────
  const handleSwitchChain = async () => {
    try {
      await switchToMonad();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch chain");
    }
    setMenuOpen(false);
  };

  // ── MetaMask event listeners ───────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        updateWallet({ address: accounts[0] });
        fetchBalance(accounts[0]);
      }
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      updateWallet({ chainId: parseInt(chainIdHex, 16) });
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged",    handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged",    handleChainChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateWallet, fetchBalance]);

  const isWrongChain = wallet.isConnected && wallet.chainId !== MONAD_CHAIN_ID;

  // ── Render ──────────────────────────────────
  if (!wallet.isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          id="wallet-connect-btn"
          onClick={connect}
          disabled={loading}
          className="gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 transition-all"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Wallet size={16} />
          )}
          {loading ? "Connecting…" : "Connect Wallet"}
        </Button>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        id="wallet-menu-btn"
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2
                   hover:bg-white/10 transition-all text-sm font-medium"
      >
        {/* Chain indicator */}
        {isWrongChain ? (
          <AlertCircle size={14} className="text-amber-400" />
        ) : (
          <CheckCircle2 size={14} className="text-emerald-400" />
        )}

        <span className="text-slate-200">{shortenAddress(wallet.address!)}</span>

        {wallet.balance !== null && (
          <span className="text-slate-400 text-xs">{wallet.balance} MON</span>
        )}
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-white/10
                     rounded-xl shadow-2xl p-3 z-50 space-y-1"
        >
          <div className="px-2 py-1 text-xs text-slate-500 font-medium uppercase tracking-wider">
            Network
          </div>
          <div className="px-2 py-2 flex items-center justify-between text-sm">
            <span className={isWrongChain ? "text-amber-400" : "text-slate-300"}>
              {getChainLabel(wallet.chainId)}
            </span>
            {isWrongChain && (
              <button
                onClick={handleSwitchChain}
                className="text-xs text-violet-400 hover:text-violet-300 underline"
              >
                Switch to Monad
              </button>
            )}
          </div>

          <hr className="border-white/5 my-1" />

          <button
            id="wallet-disconnect-btn"
            onClick={disconnect}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-red-400
                       hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
