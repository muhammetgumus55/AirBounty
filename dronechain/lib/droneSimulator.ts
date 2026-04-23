import { DeliveryCategory, TaskStatus } from "./types";
import type {
  DeliveryCheckpoint,
  DeliveryProof,
  DeliveryTask,
  DroneEvaluation,
  DroneProof,
  DroneSpec,
  Task,
  TaskRequirements,
} from "./types";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 1): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(decimals));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const DEMO_FLEET: DroneSpec[] = [
  {
    id: "DRONE-MND-4721",
    name: "Falcon Delivery Pro",
    maxPayloadKg: 3,
    maxRangeKm: 12,
    maxFlightMinutes: 45,
    hasCoolingBay: true,
    hasSecureCompartment: true,
    homeLocation: "Kadıkoy Hub",
    ownerAddress: "0x1234567890123456789012345678901234567890",
    batteryLevel: 87,
    status: "AVAILABLE",
    totalDeliveries: 234,
    successRate: 97.4,
    earnedTotal: "11.2",
  },
  {
    id: "DRONE-MND-1337",
    name: "SwiftBot Mini",
    maxPayloadKg: 1.5,
    maxRangeKm: 8,
    maxFlightMinutes: 30,
    hasCoolingBay: false,
    hasSecureCompartment: false,
    homeLocation: "Besiktas Hub",
    ownerAddress: "0x2345678901234567890123456789012345678901",
    batteryLevel: 62,
    status: "AVAILABLE",
    totalDeliveries: 89,
    successRate: 94.1,
    earnedTotal: "4.4",
  },
  {
    id: "DRONE-MND-9001",
    name: "HeavyLifter X",
    maxPayloadKg: 8,
    maxRangeKm: 20,
    maxFlightMinutes: 60,
    hasCoolingBay: false,
    hasSecureCompartment: true,
    homeLocation: "Umraniye Hub",
    ownerAddress: "0x3456789012345678901234567890123456789012",
    batteryLevel: 91,
    status: "IN_MISSION",
    totalDeliveries: 512,
    successRate: 98.9,
    earnedTotal: "25.6",
  },
];

export function getFleet(): DroneSpec[] {
  if (typeof window === "undefined") return DEMO_FLEET;
  try {
    const raw = localStorage.getItem("dronechain_fleet");
    if (raw) {
      const parsed = JSON.parse(raw) as DroneSpec[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage parse errors and fall back to demo fleet
  }
  return DEMO_FLEET;
}

function normalizeCategory(text: string): DeliveryCategory {
  if (/(food|meal|restaurant|hot)/.test(text)) return DeliveryCategory.FOOD;
  if (/(grocery|market|produce|fresh)/.test(text)) return DeliveryCategory.GROCERY;
  if (/(pharmacy|medicine|medical|drug|vaccine)/.test(text)) return DeliveryCategory.PHARMACY;
  if (/(document|contract|paper|legal|signature)/.test(text)) return DeliveryCategory.DOCUMENT;
  return DeliveryCategory.CARGO;
}

function normalizeTaskStatus(status: unknown): TaskStatus {
  const value = String(status ?? "").toLowerCase();
  switch (value) {
    case "accepted":
      return TaskStatus.ACCEPTED;
    case "in_transit":
      return TaskStatus.IN_TRANSIT;
    case "delivered":
    case "submitted":
      return TaskStatus.DELIVERED;
    case "verified":
    case "approved":
      return TaskStatus.VERIFIED;
    case "failed":
    case "rejected":
      return TaskStatus.FAILED;
    case "cancelled":
    case "canceled":
      return TaskStatus.CANCELLED;
    default:
      return TaskStatus.OPEN;
  }
}

export function toDeliveryTask(task: Task | DeliveryTask): DeliveryTask {
  if ("category" in task) {
    return task;
  }

  const legacy = task as Task & {
    requirements: TaskRequirements & {
      distanceKm?: number;
      maxWeightKg?: number;
      pickupLocation?: string;
      dropoffLocation?: string;
      requiresCooling?: boolean;
      requiresSignature?: boolean;
      isFragile?: boolean;
    };
    reward?: string;
    status?: unknown;
    creator?: string;
    acceptedBy?: string;
    createdAt?: number;
    completedAt?: number;
    proofHash?: string;
    deadline?: number;
    description?: string;
  };

  const text = `${legacy.title ?? ""} ${legacy.description ?? ""}`.toLowerCase();
  const maxDeliveryMinutes = legacy.requirements.maxDurationMinutes;
  const distanceKm = typeof legacy.requirements.distanceKm === "number"
    ? legacy.requirements.distanceKm
    : parseFloat(Math.max(1.2, maxDeliveryMinutes * 0.21).toFixed(1));

  return {
    id: Number(legacy.id) || 0,
    title: legacy.title,
    category: normalizeCategory(text),
    requirements: {
      maxWeightKg: typeof legacy.requirements.maxWeightKg === "number"
        ? legacy.requirements.maxWeightKg
        : parseFloat(Math.max(1.2, (legacy.requirements.minCoverage ?? 90) / 30).toFixed(1)),
      isFragile: typeof legacy.requirements.isFragile === "boolean"
        ? legacy.requirements.isFragile
        : /(fragile|glass|electronics|medical)/.test(text),
      requiresCooling: typeof legacy.requirements.requiresCooling === "boolean"
        ? legacy.requirements.requiresCooling
        : /(food|grocery|fresh|pharmacy|medicine|cold|ice)/.test(text),
      requiresSignature: typeof legacy.requirements.requiresSignature === "boolean"
        ? legacy.requirements.requiresSignature
        : /(document|contract|legal|signature|parcel)/.test(text),
      maxDeliveryMinutes,
      pickupLocation: legacy.requirements.pickupLocation ?? "City Hub",
      dropoffLocation: legacy.requirements.dropoffLocation ?? legacy.title,
      distanceKm,
    },
    rewardEth: String((legacy as { rewardEth?: string; reward?: string }).rewardEth ?? legacy.reward ?? "0.00"),
    status: normalizeTaskStatus(legacy.status),
    creator: legacy.creator ?? "0x0000000000000000000000000000000000000000",
    assignedDrone: legacy.acceptedBy ?? "",
    createdAt: legacy.createdAt ?? Date.now(),
    completedAt: legacy.completedAt ?? 0,
    proofHash: legacy.proofHash ?? "",
    deadline: legacy.deadline ?? 0,
  };
}

export function evaluateFleetForDelivery(task: DeliveryTask): DroneEvaluation[] {
  const req = task.requirements;
  const requiredRoundTripKm = req.distanceKm * 2;
  const fleet = getFleet();

  return fleet
    .map((drone) => {
      const isAvailable = drone.status === "AVAILABLE";
      const payloadOk = drone.maxPayloadKg >= req.maxWeightKg;
      const rangeOk = drone.maxRangeKm >= requiredRoundTripKm;
      const coolingOk = !req.requiresCooling || drone.hasCoolingBay;
      const batteryOk = drone.batteryLevel >= 70;
      const flightTimeOk = drone.maxFlightMinutes >= req.maxDeliveryMinutes;

      const canAccept = isAvailable && payloadOk && rangeOk && coolingOk && batteryOk && flightTimeOk;

      let reason = "All requirements met";
      if (!isAvailable) {
        reason = `Drone is ${drone.status.toLowerCase().replace("_", " ")}`;
      } else if (!payloadOk) {
        reason = `Payload too low (${drone.maxPayloadKg}kg < ${req.maxWeightKg}kg)`;
      } else if (!rangeOk) {
        reason = `Range too short (${drone.maxRangeKm}km < ${requiredRoundTripKm.toFixed(1)}km round trip)`;
      } else if (!coolingOk) {
        reason = "Cooling bay required";
      } else if (!batteryOk) {
        reason = `Battery too low (${drone.batteryLevel}% < 70%)`;
      } else if (!flightTimeOk) {
        reason = `Flight time too short (${drone.maxFlightMinutes}min < ${req.maxDeliveryMinutes}min)`;
      }

      const batteryScore = (clamp(drone.batteryLevel, 0, 100) / 100) * 30;
      const rangeMargin = drone.maxRangeKm / Math.max(requiredRoundTripKm, 0.1);
      const rangeScore = clamp(rangeMargin, 0, 1.4) / 1.4 * 30;
      const payloadMargin = drone.maxPayloadKg / Math.max(req.maxWeightKg, 0.1);
      const payloadScore = clamp(payloadMargin, 0, 1.6) / 1.6 * 20;
      const deliveryExperience = clamp(drone.totalDeliveries / 600, 0, 1);
      const deliveriesScore = deliveryExperience * 20;
      const suitabilityScore = parseFloat((batteryScore + rangeScore + payloadScore + deliveriesScore).toFixed(1));

      const estimatedMinutes = parseFloat(
        ((req.distanceKm / 0.45) + 2).toFixed(0)
      );

      return {
        droneId: drone.id,
        droneName: drone.name,
        canAccept,
        reason,
        batteryLevel: drone.batteryLevel,
        distanceKm: req.distanceKm,
        estimatedMinutes,
        payloadCapacityOk: payloadOk,
        coolingAvailable: drone.hasCoolingBay,
        suitabilityScore,
      };
    })
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

const CHECKPOINT_STATUSES = [
  "Ascending",
  "En route",
  "Approaching destination",
  "Descending",
  "Delivered",
] as const;

export function simulateDelivery(
  drone: DroneSpec,
  task: DeliveryTask,
  success: boolean
): DeliveryProof {
  const req = task.requirements;
  const now = Date.now();
  const batteryStart = drone.batteryLevel;
  const rawDrain = (req.distanceKm / Math.max(drone.maxRangeKm, 0.1)) * 40 + randFloat(5, 10);
  const batteryDrain = parseFloat(rawDrain.toFixed(1));
  const idealBatteryEnd = clamp(parseFloat((batteryStart - batteryDrain).toFixed(1)), 0, 100);
  const failureCheckpointIndex = randInt(2, 3); // checkpoint 3 or 4

  const checkpointIntervalMs = Math.floor((req.maxDeliveryMinutes * 60 * 1000) / 5);
  const checkpoints: DeliveryCheckpoint[] = [];

  for (let i = 0; i < 5; i += 1) {
    const progress = (i + 1) * 20;
    const descendingNow = i >= 3;
    const altitude = descendingNow ? randFloat(15, 25) : randFloat(25, 45);
    const projectedBattery = clamp(
      parseFloat((batteryStart - (batteryDrain * ((i + 1) / 5))).toFixed(1)),
      0,
      100
    );

    if (!success && i > failureCheckpointIndex) break;

    checkpoints.push({
      progress,
      altitude,
      batteryLevel: projectedBattery,
      timestamp: now + (checkpointIntervalMs * i),
      status: CHECKPOINT_STATUSES[i],
    });

    if (!success && i === failureCheckpointIndex) {
      checkpoints[checkpoints.length - 1].status = "Signal lost";
      break;
    }
  }

  const lastBattery = checkpoints.at(-1)?.batteryLevel ?? idealBatteryEnd;
  const durationMinutes = success
    ? parseFloat(randFloat(Math.max(8, req.maxDeliveryMinutes * 0.55), Math.max(10, req.maxDeliveryMinutes * 0.9)).toFixed(1))
    : parseFloat(randFloat(Math.max(4, req.maxDeliveryMinutes * 0.35), Math.max(6, req.maxDeliveryMinutes * 0.65)).toFixed(1));

  const distanceCovered = success
    ? req.distanceKm
    : parseFloat((req.distanceKm * randFloat(0.45, 0.8)).toFixed(2));

  return {
    taskId: task.id,
    droneId: drone.id,
    batteryStart,
    batteryEnd: success ? idealBatteryEnd : lastBattery,
    distanceCovered,
    durationMinutes,
    checkpoints,
    deliveryConfirmed: success,
    timestamp: now,
  };
}

export function simulateDroneEvaluation(task: Task | DeliveryTask): DroneEvaluation {
  const evaluations = evaluateFleetForDelivery(toDeliveryTask(task));
  return evaluations.find((evaluation) => evaluation.canAccept) ?? evaluations[0];
}

export function generateDroneProof(task: Task, droneId: string, success: boolean): DroneProof {
  const requirements = task.requirements as TaskRequirements;
  const timestamp = Math.floor(Date.now() / 1000);
  const altitudeMid = (requirements.altitudeRange.min + requirements.altitudeRange.max) / 2;

  let coveragePercent = randInt(92, 98);
  let durationMinutes = requirements.maxDurationMinutes - randInt(2, 5);
  let altitude = Math.round(altitudeMid + randInt(-5, 5));

  if (!success) {
    const failureType = randInt(0, 2);
    if (failureType === 0) coveragePercent = 65;
    else if (failureType === 1) durationMinutes = requirements.maxDurationMinutes + 10;
    else altitude = requirements.altitudeRange.max + randInt(8, 15);
  }

  return {
    taskId: task.id,
    coveragePercent,
    durationMinutes,
    altitude,
    timestamp,
    droneId,
    rawData: {
      gpsTrackPoints: 847,
      batteryUsed: "34%",
      weatherCondition: "clear",
    },
  };
}
