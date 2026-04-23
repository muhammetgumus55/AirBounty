"use client";

import { useState, useEffect } from "react";
import TaskForm from "@/components/TaskForm";
import { getProvider } from "@/lib/contract";

export default function CreatePage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: unknown) => {
        const list = accounts as string[];
        if (list[0]) setWalletAddress(list[0]);
      })
      .catch(() => {});

    const handleAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      setWalletAddress(list[0] || null);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const connectWallet = async () => {
    try {
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts[0]) setWalletAddress(accounts[0]);
    } catch {
      // user rejected
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Request a Delivery</h1>
        <p className="text-slate-400 text-sm mt-2">
          Drone-powered last-mile delivery on Monad
        </p>
      </div>

      {!walletAddress && (
        <div className="mb-6 flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-sm">
          <span>⚠️ Connect your wallet to request deliveries</span>
          <button
            onClick={connectWallet}
            className="shrink-0 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      )}

      <TaskForm walletAddress={walletAddress} />
    </div>
  );
}
