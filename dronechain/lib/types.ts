// ─────────────────────────────────────────────
//  DroneChain – Core TypeScript Interfaces
// ─────────────────────────────────────────────

/** Granular requirements that a drone-proof must satisfy */
export interface TaskRequirements {
  /** Minimum area coverage as a percentage (0–100) */
  minCoverage: number;
  /** Maximum allowed flight duration in minutes */
  maxDurationMinutes: number;
  /** Acceptable altitude window in metres */
  altitudeRange: {
    min: number;
    max: number;
  };
  /** Free-form extra constraints (e.g. "no-fly zone polygon", "thermal scan required") */
  additionalConstraints: string[];
}

/** Lifecycle states a task can be in */
export type TaskStatus =
  | "open"        // posted, accepting applications
  | "accepted"    // a drone operator has been assigned
  | "in_progress" // drone is actively working
  | "submitted"   // proof uploaded, awaiting verification
  | "approved"    // proof accepted, reward paid
  | "rejected"    // proof rejected, task reopens
  | "expired";    // past deadline with no approved submission

/** A posted task on the DroneChain marketplace */
export interface Task {
  /** Unique on-chain task identifier */
  id: string;
  /** Short human-readable title */
  title: string;
  /** Full description of what the drone must accomplish */
  description: string;
  /** Machine-verifiable constraints */
  requirements: TaskRequirements;
  /** Reward amount in ETH (as string to avoid precision loss) */
  reward: string;
  /** Current lifecycle state */
  status: TaskStatus;
  /** Ethereum address of the task creator */
  creator: string;
  /** Ethereum address of the operator who accepted the task (empty if open) */
  acceptedBy: string;
  /** Unix timestamp (seconds) after which the task expires */
  deadline: number;
}

/** Raw telemetry proof submitted by a drone operator */
export interface DroneProof {
  /** References the parent Task.id */
  taskId: string;
  /** Actual area coverage achieved (%) */
  coveragePercent: number;
  /** Actual flight duration in minutes */
  durationMinutes: number;
  /** Average flight altitude in metres */
  altitude: number;
  /** Unix timestamp (ms) when the proof was generated */
  timestamp: number;
  /** Hardware serial / unique drone identifier */
  droneId: string;
}

/** Result produced by the AI verification service */
export interface VerificationResult {
  /** Whether all task requirements were met */
  approved: boolean;
  /** Human-readable summary from the AI verifier */
  reasoning: string;
  /** List of individual criteria that the proof failed, if any */
  failedCriteria: string[];
}

/** Minimal on-chain contract metadata */
export interface ContractInfo {
  address: string;
  chainId: number;
  chainName: string;
  blockNumber: number;
}

/** Connected wallet state */
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: string | null;
}

/** Payload sent to the task-creation smart-contract function */
export interface CreateTaskPayload {
  title: string;
  description: string;
  requirements: TaskRequirements;
  /** Deadline as a Unix timestamp in seconds */
  deadline: number;
  /** ETH value to escrow (the reward) */
  rewardEth: string;
}
