import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  formatEther,
  parseEther,
  type Eip1193Provider,
} from "ethers";
import type { CreateTaskPayload, DroneProof, Task, TaskRequirements, TaskStatusString } from "./types";

declare global {
  interface WindowEthereum extends Eip1193Provider {
    on: (eventName: string, listener: (...args: unknown[]) => void) => void;
    removeListener: (eventName: string, listener: (...args: unknown[]) => void) => void;
  }

  interface Window {
    ethereum?: WindowEthereum;
  }
}

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const MONAD_RPC = process.env.NEXT_PUBLIC_MONAD_RPC || "https://testnet-rpc.monad.xyz";
export const MONAD_CHAIN_ID = 10143;

// ─────────────────────────────────────────────────────────────────────────────
// ABI — mirrors DroneTask.sol exactly. Structs use tuple/components notation.
// ─────────────────────────────────────────────────────────────────────────────

export const CONTRACT_ABI = [
  // ── Write functions ────────────────────────────────────────────────────────
  {
    type: "function",
    name: "createTask",
    inputs: [
      { name: "title",       type: "string"  },
      { name: "description", type: "string"  },
      { name: "category",    type: "string"  },
      { name: "deadline",    type: "uint256" },
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "minCoverage",        type: "uint8"  },
          { name: "maxDurationMinutes", type: "uint16" },
          { name: "minAltitude",        type: "uint16" },
          { name: "maxAltitude",        type: "uint16" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "acceptTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitProof",
    inputs: [
      { name: "taskId",    type: "uint256" },
      { name: "proofHash", type: "string"  },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "verifyAndPay",
    inputs: [
      { name: "taskId",   type: "uint256" },
      { name: "approved", type: "bool"    },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ── Read functions ─────────────────────────────────────────────────────────
  {
    type: "function",
    name: "getTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id",            type: "uint256"  },
          { name: "creator",       type: "address"  },
          { name: "assignedDrone", type: "address"  },
          { name: "reward",        type: "uint256"  },
          { name: "status",        type: "uint8"    },
          {
            name: "requirements",
            type: "tuple",
            components: [
              { name: "minCoverage",        type: "uint8"  },
              { name: "maxDurationMinutes", type: "uint16" },
              { name: "minAltitude",        type: "uint16" },
              { name: "maxAltitude",        type: "uint16" },
            ],
          },
          { name: "ipfsProofHash", type: "string"  },
          { name: "createdAt",     type: "uint256" },
          { name: "completedAt",   type: "uint256" },
          { name: "title",         type: "string"  },
          { name: "description",   type: "string"  },
          { name: "category",      type: "string"  },
          { name: "deadline",      type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOpenTasks",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  // ── Events ─────────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "TaskCreated",
    inputs: [
      { name: "taskId",  type: "uint256", indexed: true  },
      { name: "creator", type: "address", indexed: false },
      { name: "reward",  type: "uint256", indexed: false },
      { name: "title",   type: "string",  indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskAccepted",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true  },
      { name: "drone",  type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ProofSubmitted",
    inputs: [
      { name: "taskId",    type: "uint256", indexed: true  },
      { name: "proofHash", type: "string",  indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskVerified",
    inputs: [
      { name: "taskId",   type: "uint256", indexed: true  },
      { name: "approved", type: "bool",    indexed: false },
      { name: "reward",   type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskCancelled",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
    ],
  },
] as const;

// Backward-compatible alias used by existing components.
export const DRONE_TASK_ABI = CONTRACT_ABI;

// ─────────────────────────────────────────────────────────────────────────────
// Status mapping
// Contract enum: OPEN=0, ACCEPTED=1, COMPLETED=2, VERIFIED=3, FAILED=4, CANCELLED=5
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_MAP: TaskStatusString[] = [
  "open",       // 0 — OPEN
  "accepted",   // 1 — ACCEPTED
  "submitted",  // 2 — COMPLETED (proof uploaded, awaiting verification)
  "approved",   // 3 — VERIFIED
  "rejected",   // 4 — FAILED
  "expired",    // 5 — CANCELLED
];

function mapStatus(raw: number): TaskStatusString {
  return STATUS_MAP[raw] ?? "open";
}

function toNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number(value ?? 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTask(raw: any): Task {
  const req = raw.requirements ?? {};
  return {
    id:          String(toNumber(raw.id)),
    title:       String(raw.title       ?? ""),
    description: String(raw.description ?? ""),
    requirements: {
      minCoverage:        toNumber(req.minCoverage),
      maxDurationMinutes: toNumber(req.maxDurationMinutes),
      altitudeRange: {
        min: toNumber(req.minAltitude),
        max: toNumber(req.maxAltitude),
      },
      additionalConstraints: [],
    },
    reward:     formatEther(typeof raw.reward === "bigint" ? raw.reward : BigInt(raw.reward ?? 0)),
    status:     mapStatus(toNumber(raw.status)),
    creator:    String(raw.creator       ?? "0x0000000000000000000000000000000000000000"),
    acceptedBy: String(raw.assignedDrone ?? "0x0000000000000000000000000000000000000000"),
    deadline:   toNumber(raw.deadline),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider / signer helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getProvider(): BrowserProvider {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Please install MetaMask or a compatible wallet.");
  }
  return new BrowserProvider(window.ethereum);
}

// Backward-compatible alias used by existing components.
export function getBrowserProvider(): BrowserProvider {
  return getProvider();
}

export function getReadOnlyProvider(): JsonRpcProvider {
  return new JsonRpcProvider(MONAD_RPC);
}

export async function getSigner() {
  try {
    return await getProvider().getSigner();
  } catch (error) {
    throw new Error(
      `Failed to get signer: ${error instanceof Error ? error.message : "Unknown signer error"}`
    );
  }
}

export async function getContract(withSigner = false): Promise<Contract> {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured.");
    }
    const runner = withSigner ? await getSigner() : getProvider();
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, runner);
  } catch (error) {
    throw new Error(
      `Failed to initialize contract: ${error instanceof Error ? error.message : "Unknown contract initialization error"}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write wrappers
// ─────────────────────────────────────────────────────────────────────────────

export async function createTask(
  title: string,
  description: string,
  category: string,
  deadline: number,
  requirements: TaskRequirements,
  rewardEth: string
): Promise<{ txHash: string; taskId: number }> {

  try {
    const contract = await getContract(true);
    const reqTuple = [
      requirements.minCoverage,
      requirements.maxDurationMinutes,
      requirements.altitudeRange.min,
      requirements.altitudeRange.max,
    ] as const;

    const tx = await contract.createTask(
      title,
      description,
      category,
      BigInt(deadline),
      reqTuple,
      { value: parseEther(rewardEth) }
    );
    const receipt = await tx.wait();

    // Parse the real taskId from the TaskCreated event log.
    let taskId = 0;
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "TaskCreated") {
            taskId = Number(parsed.args.taskId);
            break;
          }
        } catch {
          // skip logs that belong to other contracts / can't be parsed
        }
      }
    }

    return { txHash: tx.hash as string, taskId };
  } catch (error) {
    // Preserve the original ethers error shape so parseWeb3Error can read revert details.
    throw error;
  }
}

export async function acceptTask(taskId: number | string): Promise<string> {
  try {
    const contract = await getContract(true);
    const tx = await contract.acceptTask(BigInt(taskId));
    return tx.hash as string;
  } catch (error) {
    throw new Error(
      `Failed to accept task ${taskId}: ${error instanceof Error ? error.message : "Unknown transaction error"}`
    );
  }
}

export async function submitProof(taskId: number, proofHash: string): Promise<string>;
export async function submitProof(proof: DroneProof): Promise<string>;
export async function submitProof(taskIdOrProof: number | DroneProof, proofHashArg?: string): Promise<string> {
  const taskId =
    typeof taskIdOrProof === "number" ? taskIdOrProof : Number(taskIdOrProof.taskId);
  try {
    const contract = await getContract(true);
    const proofHash =
      typeof proofHashArg === "string"
        ? proofHashArg
        : typeof taskIdOrProof === "object"
        ? taskIdOrProof.droneId
        : "";

    const tx = await contract.submitProof(BigInt(taskId), proofHash);
    return tx.hash as string;
  } catch (error) {
    throw new Error(
      `Failed to submit proof for task ${taskId}: ${error instanceof Error ? error.message : "Unknown transaction error"}`
    );
  }
}

export async function verifyAndPay(taskId: number, approved: boolean): Promise<string> {
  try {
    const contract = await getContract(true);
    const tx = await contract.verifyAndPay(BigInt(taskId), approved);
    return tx.hash as string;
  } catch (error) {
    throw new Error(
      `Failed to verify task ${taskId}: ${error instanceof Error ? error.message : "Unknown transaction error"}`
    );
  }
}

export async function cancelTask(taskId: number): Promise<string> {
  try {
    const contract = await getContract(true);
    const tx = await contract.cancelTask(BigInt(taskId));
    return tx.hash as string;
  } catch (error) {
    throw new Error(
      `Failed to cancel task ${taskId}: ${error instanceof Error ? error.message : "Unknown transaction error"}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read wrappers
// ─────────────────────────────────────────────────────────────────────────────

export async function getTask(taskId: number | string): Promise<Task> {
  try {
    const contract = await getContract(false);
    const raw = await contract.getTask(BigInt(taskId));
    return normalizeTask(raw);
  } catch (error) {
    throw new Error(
      `Failed to fetch task ${taskId}: ${error instanceof Error ? error.message : "Unknown read error"}`
    );
  }
}

export async function getOpenTasks(): Promise<number[]> {
  try {
    const contract = await getContract(false);
    const raw = (await contract.getOpenTasks()) as bigint[];
    return raw.map(Number);
  } catch (error) {
    throw new Error(
      `Failed to fetch open tasks: ${error instanceof Error ? error.message : "Unknown read error"}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward-compatible aliases
// ─────────────────────────────────────────────────────────────────────────────

export async function approveTask(taskId: number | string): Promise<string> {
  return verifyAndPay(Number(taskId), true);
}

export async function rejectTask(taskId: number | string): Promise<string> {
  return verifyAndPay(Number(taskId), false);
}

export async function switchToMonad(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }
  await getProvider().send("wallet_addEthereumChain", [
    {
      chainId: `0x${MONAD_CHAIN_ID.toString(16)}`,
      chainName: "Monad Testnet",
      nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
      rpcUrls: [MONAD_RPC],
      blockExplorerUrls: ["https://explorer.testnet.monad.xyz"],
    },
  ]);
}
