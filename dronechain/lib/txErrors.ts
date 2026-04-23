export function parseWeb3Error(error: unknown): string {
  const err = error as { code?: number | string; message?: string; reason?: string }

  if (err.code === 4001 || err.code === "ACTION_REJECTED")
    return "Transaction cancelled by user."

  if (err.code === -32603 || err.message?.includes("insufficient funds"))
    return "Insufficient funds in wallet."

  if (err.message?.includes("wrong network") || err.message?.includes("chain"))
    return "Wrong network. Please switch to Monad Testnet in MetaMask."

  if (err.message?.includes("nonce"))
    return "Transaction conflict. Please reset MetaMask account and retry."

  if (err.code === "CALL_EXCEPTION" || err.message?.includes("revert"))
    return "Contract rejected the transaction. Check task status and try again."

  if (err.message?.includes("timeout") || err.message?.includes("network"))
    return "Network timeout. Check your connection and retry."

  return "Transaction failed: " + (err.reason || err.message || "Unknown error")
}
