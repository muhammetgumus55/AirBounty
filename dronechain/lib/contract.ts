// ─────────────────────────────────────────────
//  DroneChain – Contract ABI, Address & ethers.js Helpers
// ─────────────────────────────────────────────
import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  formatEther,
  parseEther,
  type Signer,
  type Eip1193Provider,
} from "ethers";
import type { Task, DroneProof, CreateTaskPayload } from "./types";

// ── Configuration ─────────────────────────────
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const MONAD_RPC =
  process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz";

export const MONAD_CHAIN_ID = 10143; // Monad testnet

// ── ABI ───────────────────────────────────────
/**
 * Minimal ABI for the DroneTask.sol contract.
 * Only includes the functions and events the frontend interacts with directly.
 */
export const DRONE_TASK_ABI = [
  // ── Read functions ──────────────────────────
  {
    name: "getTask",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id",          type: "uint256" },
          { name: "title",       type: "string"  },
          { name: "description", type: "string"  },
          { name: "reward",      type: "uint256" },
          { name: "status",      type: "uint8"   },
          { name: "creator",     type: "address" },
          { name: "acceptedBy",  type: "address" },
          { name: "deadline",    type: "uint256" },
          { name: "minCoverage",        type: "uint256" },
          { name: "maxDurationMinutes", type: "uint256" },
          { name: "altitudeMin",        type: "uint256" },
          { name: "altitudeMax",        type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getAllTasks",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id",          type: "uint256" },
          { name: "title",       type: "string"  },
          { name: "description", type: "string"  },
          { name: "reward",      type: "uint256" },
          { name: "status",      type: "uint8"   },
          { name: "creator",     type: "address" },
          { name: "acceptedBy",  type: "address" },
          { name: "deadline",    type: "uint256" },
          { name: "minCoverage",        type: "uint256" },
          { name: "maxDurationMinutes", type: "uint256" },
          { name: "altitudeMin",        type: "uint256" },
          { name: "altitudeMax",        type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "taskCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ── Write functions ─────────────────────────
  {
    name: "createTask",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "title",               type: "string"  },
      { name: "description",         type: "string"  },
      { name: "minCoverage",         type: "uint256" },
      { name: "maxDurationMinutes",  type: "uint256" },
      { name: "altitudeMin",         type: "uint256" },
      { name: "altitudeMax",         type: "uint256" },
      { name: "deadline",            type: "uint256" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
  },
  {
    name: "acceptTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "submitProof",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId",          type: "uint256" },
      { name: "coveragePercent", type: "uint256" },
      { name: "durationMinutes", type: "uint256" },
      { name: "altitude",        type: "uint256" },
      { name: "droneId",         type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "approveTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "rejectTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
  },

  // ── Events ──────────────────────────────────
  {
    name: "TaskCreated",
    type: "event",
    inputs: [
      { name: "taskId",  type: "uint256", indexed: true  },
      { name: "creator", type: "address", indexed: true  },
      { name: "reward",  type: "uint256", indexed: false },
    ],
  },
  {
    name: "TaskAccepted",
    type: "event",
    inputs: [
      { name: "taskId",   type: "uint256", indexed: true },
      { name: "operator", type: "address", indexed: true },
    ],
  },
  {
    name: "ProofSubmitted",
    type: "event",
    inputs: [
      { name: "taskId",   type: "uint256", indexed: true  },
      { name: "operator", type: "address", indexed: true  },
      { name: "droneId",  type: "string",  indexed: false },
    ],
  },
  {
    name: "TaskApproved",
    type: "event",
    inputs: [{ name: "taskId", type: "uint256", indexed: true }],
  },
  {
    name: "TaskRejected",
    type: "event",
    inputs: [{ name: "taskId", type: "uint256", indexed: true }],
  },
] as const;

// ── Provider Helpers ──────────────────────────

/** Returns a read-only JsonRpcProvider connected to Monad testnet */
export function getReadOnlyProvider(): JsonRpcProvider {
  return new JsonRpcProvider(MONAD_RPC);
}

/**
 * Returns a BrowserProvider wrapping MetaMask (or any EIP-1193 injected wallet).
 * Throws if window.ethereum is unavailable.
 */
export function getBrowserProvider(): BrowserProvider {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No Ethereum wallet detected. Please install MetaMask.");
  }
  return new BrowserProvider(window.ethereum as Eip1193Provider);
}

/** Returns a signer from the connected wallet */
export async function getSigner(): Promise<Signer> {
  const provider = getBrowserProvider();
  return provider.getSigner();
}

// ── Contract Instance Helpers ─────────────────

/** Read-only contract instance (no signer needed) */
export function getReadContract(): Contract {
  return new Contract(CONTRACT_ADDRESS, DRONE_TASK_ABI, getReadOnlyProvider());
}

/** Writable contract instance (requires connected signer) */
export async function getWriteContract(): Promise<Contract> {
  const signer = await getSigner();
  return new Contract(CONTRACT_ADDRESS, DRONE_TASK_ABI, signer);
}

// ── Contract Action Helpers ───────────────────

/** Fetch all tasks from the contract */
export async function fetchAllTasks(): Promise<Task[]> {
  const contract = getReadContract();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await contract.getAllTasks();

  return raw.map((t) => ({
    id: t.id.toString(),
    title: t.title,
    description: t.description,
    requirements: {
      minCoverage: Number(t.minCoverage),
      maxDurationMinutes: Number(t.maxDurationMinutes),
      altitudeRange: { min: Number(t.altitudeMin), max: Number(t.altitudeMax) },
      additionalConstraints: [],
    },
    reward: formatEther(t.reward),
    status: mapStatus(Number(t.status)),
    creator: t.creator,
    acceptedBy: t.acceptedBy,
    deadline: Number(t.deadline),
  }));
}

/** Fetch a single task by id */
export async function fetchTask(taskId: string): Promise<Task> {
  const contract = getReadContract();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t: any = await contract.getTask(BigInt(taskId));

  return {
    id: t.id.toString(),
    title: t.title,
    description: t.description,
    requirements: {
      minCoverage: Number(t.minCoverage),
      maxDurationMinutes: Number(t.maxDurationMinutes),
      altitudeRange: { min: Number(t.altitudeMin), max: Number(t.altitudeMax) },
      additionalConstraints: [],
    },
    reward: formatEther(t.reward),
    status: mapStatus(Number(t.status)),
    creator: t.creator,
    acceptedBy: t.acceptedBy,
    deadline: Number(t.deadline),
  };
}

/** Create a new task on-chain */
export async function createTask(payload: CreateTaskPayload): Promise<string> {
  const contract = await getWriteContract();
  const tx = await contract.createTask(
    payload.title,
    payload.description,
    BigInt(payload.requirements.minCoverage),
    BigInt(payload.requirements.maxDurationMinutes),
    BigInt(payload.requirements.altitudeRange.min),
    BigInt(payload.requirements.altitudeRange.max),
    BigInt(payload.deadline),
    { value: parseEther(payload.rewardEth) }
  );
  const receipt = await tx.wait();
  // Parse TaskCreated event to extract the new taskId
  const event = receipt?.logs?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (log: any) => log?.fragment?.name === "TaskCreated"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (event as any)?.args?.taskId?.toString() ?? "0";
}

/** Accept a task as a drone operator */
export async function acceptTask(taskId: string): Promise<void> {
  const contract = await getWriteContract();
  const tx = await contract.acceptTask(BigInt(taskId));
  await tx.wait();
}

/** Submit a drone proof on-chain */
export async function submitProof(proof: DroneProof): Promise<void> {
  const contract = await getWriteContract();
  const tx = await contract.submitProof(
    BigInt(proof.taskId),
    BigInt(Math.round(proof.coveragePercent)),
    BigInt(Math.round(proof.durationMinutes)),
    BigInt(Math.round(proof.altitude)),
    proof.droneId
  );
  await tx.wait();
}

/** Approve a submitted proof (task creator only) */
export async function approveTask(taskId: string): Promise<void> {
  const contract = await getWriteContract();
  const tx = await contract.approveTask(BigInt(taskId));
  await tx.wait();
}

/** Reject a submitted proof (task creator only) */
export async function rejectTask(taskId: string): Promise<void> {
  const contract = await getWriteContract();
  const tx = await contract.rejectTask(BigInt(taskId));
  await tx.wait();
}

// ── Switch Chain Helper ───────────────────────

/** Prompt MetaMask to switch to / add Monad testnet */
export async function switchToMonad(): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask not found");
  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${MONAD_CHAIN_ID.toString(16)}`,
        chainName: "Monad Testnet",
        nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
        rpcUrls: [MONAD_RPC],
        blockExplorerUrls: ["https://explorer.testnet.monad.xyz"],
      },
    ],
  });
}

// ── Internal Helpers ──────────────────────────

const STATUS_MAP = [
  "open",
  "accepted",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
  "expired",
] as const;

function mapStatus(n: number): Task["status"] {
  return STATUS_MAP[n] ?? "open";
}
