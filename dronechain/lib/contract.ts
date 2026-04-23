import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  formatEther,
  parseEther,
  type Eip1193Provider,
} from "ethers";
import type { CreateTaskPayload, DroneProof, Task, TaskRequirements } from "./types";

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

export const CONTRACT_ABI = [
  "function createTask((uint256 minCoverage,uint256 maxDurationMinutes,uint256 altitudeMin,uint256 altitudeMax) requirements) payable",
  "function acceptTask(uint256 taskId)",
  "function submitProof(uint256 taskId,string proofHash)",
  "function verifyAndPay(uint256 taskId,bool approved)",
  "function cancelTask(uint256 taskId)",
  "function getTask(uint256 taskId) view returns ((uint256 id,string title,string description,(uint256 minCoverage,uint256 maxDurationMinutes,uint256 altitudeMin,uint256 altitudeMax) requirements,uint256 reward,uint8 status,address creator,address acceptedBy,uint256 deadline))",
  "function getOpenTasks() view returns (uint256[])",
  "event TaskCreated(uint256 indexed taskId,address indexed creator,uint256 reward)",
  "event TaskAccepted(uint256 indexed taskId,address indexed operator)",
  "event ProofSubmitted(uint256 indexed taskId,address indexed operator,string proofHash)",
  "event TaskVerified(uint256 indexed taskId,bool approved)",
  "event TaskCancelled(uint256 indexed taskId)"
] as const;

// Backward-compatible alias used by existing components.
export const DRONE_TASK_ABI = CONTRACT_ABI;

const STATUS_MAP: Task["status"][] = [
  "open",
  "accepted",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
  "expired",
];

function mapStatus(status: number): Task["status"] {
  return STATUS_MAP[status] ?? "open";
}

function toNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number(value ?? 0);
}

function normalizeTask(raw: unknown): Task {
  const safeRaw = (raw ?? {}) as {
    id?: unknown;
    title?: unknown;
    description?: unknown;
    requirements?: {
      minCoverage?: unknown;
      maxDurationMinutes?: unknown;
      altitudeMin?: unknown;
      altitudeMax?: unknown;
    };
    reward?: unknown;
    status?: unknown;
    creator?: unknown;
    acceptedBy?: unknown;
    deadline?: unknown;
  };
  const requirements = safeRaw.requirements ?? {};
  const rewardWei =
    typeof safeRaw.reward === "bigint" ||
    typeof safeRaw.reward === "string" ||
    typeof safeRaw.reward === "number"
      ? safeRaw.reward
      : BigInt(0);
  return {
    id: String(safeRaw.id ?? ""),
    title: String(safeRaw.title ?? ""),
    description: String(safeRaw.description ?? ""),
    requirements: {
      minCoverage: toNumber(requirements?.minCoverage),
      maxDurationMinutes: toNumber(requirements?.maxDurationMinutes),
      altitudeRange: {
        min: toNumber(requirements?.altitudeMin),
        max: toNumber(requirements?.altitudeMax),
      },
      additionalConstraints: [],
    },
    reward: formatEther(rewardWei),
    status: mapStatus(toNumber(safeRaw.status)),
    creator: String(safeRaw.creator ?? "0x0000000000000000000000000000000000000000"),
    acceptedBy: String(safeRaw.acceptedBy ?? "0x0000000000000000000000000000000000000000"),
    deadline: toNumber(safeRaw.deadline),
  };
}

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
    const provider = getProvider();
    return await provider.getSigner();
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

export async function createTask(requirements: TaskRequirements, rewardEth: string): Promise<string>;
export async function createTask(payload: CreateTaskPayload): Promise<string>;
export async function createTask(
  requirementsOrPayload: TaskRequirements | CreateTaskPayload,
  rewardEthArg?: string
): Promise<string> {
  try {
    const contract = await getContract(true);
    const requirements =
      "requirements" in requirementsOrPayload
        ? requirementsOrPayload.requirements
        : requirementsOrPayload;
    const rewardEth =
      typeof rewardEthArg === "string"
        ? rewardEthArg
        : "rewardEth" in requirementsOrPayload
        ? requirementsOrPayload.rewardEth
        : "0";

    const requirementsTuple = [
      BigInt(requirements.minCoverage),
      BigInt(requirements.maxDurationMinutes),
      BigInt(requirements.altitudeRange.min),
      BigInt(requirements.altitudeRange.max),
    ] as const;

    const tx = await contract.createTask(requirementsTuple, {
      value: parseEther(rewardEth),
    });
    return tx.hash as string;
  } catch (error) {
    throw new Error(
      `Failed to create task: ${error instanceof Error ? error.message : "Unknown transaction error"}`
    );
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
  try {
    const contract = await getContract(true);

    const taskId =
      typeof taskIdOrProof === "number" ? taskIdOrProof : Number(taskIdOrProof.taskId);
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
      `Failed to submit proof: ${error instanceof Error ? error.message : "Unknown transaction error"}`
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

export async function getTask(taskId: number | string): Promise<Task> {
  try {
    const contract = await getContract(false);
    const rawTask = await contract.getTask(BigInt(taskId));
    return normalizeTask(rawTask);
  } catch (error) {
    throw new Error(
      `Failed to fetch task ${taskId}: ${error instanceof Error ? error.message : "Unknown read error"}`
    );
  }
}

export async function getOpenTasks(): Promise<number[]> {
  try {
    const contract = await getContract(false);
    const rawTaskIds = (await contract.getOpenTasks()) as Array<number | bigint>;
    return rawTaskIds.map((id) => toNumber(id));
  } catch (error) {
    throw new Error(
      `Failed to fetch open tasks: ${error instanceof Error ? error.message : "Unknown read error"}`
    );
  }
}

// Backward-compatible aliases while migrating UI to verifyAndPay.
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

  const provider = getProvider();
  await provider.send("wallet_addEthereumChain", [
    {
      chainId: `0x${MONAD_CHAIN_ID.toString(16)}`,
      chainName: "Monad Testnet",
      nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
      rpcUrls: [MONAD_RPC],
      blockExplorerUrls: ["https://explorer.testnet.monad.xyz"],
    },
  ]);
}
