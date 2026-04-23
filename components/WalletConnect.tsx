'use client'

import { useState } from 'react'
import { BrowserProvider } from 'ethers'
import { Wallet } from 'lucide-react'

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  async function connectWallet() {
    if (!window.ethereum) {
      alert('Please install MetaMask')
      return
    }
    setIsConnecting(true)
    try {
      const provider = new BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const addr = await signer.getAddress()
      setAddress(addr)
    } finally {
      setIsConnecting(false)
    }
  }

  if (address) {
    return (
      <div className="bg-gray-800 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </div>
    )
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="border border-cyan-500 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Wallet size={16} />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
