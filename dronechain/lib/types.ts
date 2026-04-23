// ─────────────────────────────────────────────
//  DroneChain – Last-Mile Delivery Network Types
// ─────────────────────────────────────────────

export enum TaskStatus {
  OPEN,
  ACCEPTED,
  IN_TRANSIT,
  DELIVERED,
  VERIFIED,
  FAILED,
  CANCELLED,
}

export enum DeliveryCategory {
  FOOD,       // Yemeksepeti, Getir style hot food
  GROCERY,    // Market, fresh produce
  PHARMACY,   // Medicine, medical supplies
  CARGO,      // Amazon, e-commerce packages
  DOCUMENT,   // Contracts, legal papers
}

export interface DeliveryRequirements {
  maxWeightKg: number;
  isFragile: boolean;
  requiresCooling: boolean; // for food/medicine
  requiresSignature: boolean;
  maxDeliveryMinutes: number;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
}

export interface DeliveryTask {
  id: number;
  title: string;
  category: DeliveryCategory;
  requirements: DeliveryRequirements;
  rewardEth: string;
  status: TaskStatus;
  creator: string;
  assignedDrone: string;
  createdAt: number;
  completedAt: number;
  proofHash: string;
  deadline: number;
}

export interface DroneSpec {
  id: string;
  name: string;
  maxPayloadKg: number;
  maxRangeKm: number;
  maxFlightMinutes: number;
  hasCoolingBay: boolean;
  hasSecureCompartment: boolean;
  homeLocation: string;
  ownerAddress: string;
  batteryLevel: number; // 0-100
  status: 'AVAILABLE' | 'IN_MISSION' | 'CHARGING' | 'OFFLINE';
  totalDeliveries: number;
  successRate: number;
  earnedTotal: string; // in MON
}

export interface DeliveryCheckpoint {
  progress: number; // 0-100%
  altitude: number;
  batteryLevel: number;
  timestamp: number;
  status: string;
}

export interface DeliveryProof {
  taskId: number;
  droneId: string;
  batteryStart: number;
  batteryEnd: number;
  distanceCovered: number;
  durationMinutes: number;
  checkpoints: DeliveryCheckpoint[];
  deliveryConfirmed: boolean;
  timestamp: number;
}

export interface DroneEvaluation {
  droneId: string;
  droneName: string;
  canAccept: boolean;
  reason: string;
  batteryLevel: number;
  distanceKm: number;
  estimatedMinutes: number;
  payloadCapacityOk: boolean;
  coolingAvailable: boolean;
  suitabilityScore: number;
}

export interface VerificationResult {
  approved: boolean;
  reasoning: string;
  criteriaChecks: {
    criterion: string;
    required: string;
    actual: string;
    passed: boolean;
  }[];
  confidenceScore: number;
}
