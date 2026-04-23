export function parseWeb3Error(error: unknown): string {
  const err = error as {
    code?: number | string;
    message?: string;
    reason?: string;
    shortMessage?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error?: any;
  };
  const rawText = [
    err.reason,
    err.shortMessage,
    err.message,
    err.info?.error?.message,
    err.info?.message,
    err.error?.reason,
    err.error?.message,
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" | ");
  const lower = rawText.toLowerCase();
  const customErrorDataMatch = rawText.match(/0x[a-fA-F0-9]{8,}/);
  const customErrorData = customErrorDataMatch?.[0]?.toLowerCase();

  if (err.code === 4001 || err.code === "ACTION_REJECTED")
    return "Transaction cancelled by user."

  if (err.code === -32603 || lower.includes("insufficient funds"))
    return "Insufficient funds in wallet."

  if (lower.includes("wrong network") || lower.includes("chain"))
    return "Wrong network. Please switch to Monad Testnet in MetaMask."

  if (lower.includes("nonce"))
    return "Transaction conflict. Please reset MetaMask account and retry."

  if (lower.includes("deadline must be in future"))
    return "Deadline must be in the future. Please pick a later date/time."

  if (lower.includes("title required"))
    return "Title is required."

  if (lower.includes("rewardrequired") || lower.includes("reward required"))
    return "Reward must be greater than 0 MON."

  if (customErrorData?.startsWith("0x81236312")) {
    return "Task status is not ACCEPTED yet. Drone proof can only be submitted after a drone accepts the task."
  }

  if (customErrorData?.startsWith("0x3148b07b")) {
    return "Only the assigned drone wallet can submit proof for this task."
  }

  if (customErrorData?.startsWith("0xeabf7787")) {
    return "Only task creator can perform this action."
  }

  if (err.code === "CALL_EXCEPTION" || lower.includes("revert"))
    return `Contract rejected the transaction. ${rawText || "Check task status and try again."}`

  if (lower.includes("timeout") || lower.includes("network"))
    return "Network timeout. Check your connection and retry."

  return "Transaction failed: " + (rawText || "Unknown error")
}
