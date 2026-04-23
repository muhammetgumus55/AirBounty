// ─────────────────────────────────────────────
//  DroneChain – Mock Drone Telemetry Generator
// ─────────────────────────────────────────────
import type { DroneEvaluation, DroneProof, Task, TaskRequirements } from "./types";

// ── Drone ID Pool ────────────────────────────

const DRONE_PREFIXES = ["HAWK", "EAGLE", "VIPER", "GHOST", "STORM"];
const DRONE_VARIANTS = ["X1", "X2", "PRO", "LITE", "MAX"];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generates a random plausible drone serial */
export function generateDroneId(): string {
  const prefix = DRONE_PREFIXES[Math.floor(Math.random() * DRONE_PREFIXES.length)];
  const variant = DRONE_VARIANTS[Math.floor(Math.random() * DRONE_VARIANTS.length)];
  const serial = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${variant}-${serial}`;
}

/** Returns a random DroneChain-formatted drone ID */
export function getRandomDroneId(): string {
  return `DRONE-MND-${randInt(1000, 9999)}`;
}

/** Evaluates whether a drone can accept a task based on battery and range */
export function simulateDroneEvaluation(task: Task): DroneEvaluation {
  void task;
  const batteryLevel = randInt(55, 100);
  const distanceKm = Number((1 + Math.random() * 14).toFixed(1));
  const canAccept = batteryLevel >= 70 && distanceKm <= 10;

  let reason = "Battery and range within acceptable parameters";
  if (batteryLevel < 70) {
    reason = "Insufficient battery level for mission";
  } else if (distanceKm > 10) {
    reason = "Target location exceeds operational range";
  }

  return {
    droneId: getRandomDroneId(),
    batteryLevel,
    distanceKm,
    canAccept,
    reason,
  };
}

/** Generates proof payload for either successful or failed mission outcomes */
export function generateDroneProof(task: Task, droneId: string, success: boolean): DroneProof {
  const requirements: TaskRequirements = task.requirements;
  const timestamp = Math.floor(Date.now() / 1000);
  const altitudeMid =
    (requirements.altitudeRange.min + requirements.altitudeRange.max) / 2;

  let coveragePercent: number;
  let durationMinutes: number;
  let altitude: number;

  if (success) {
    coveragePercent = randInt(92, 98);
    durationMinutes = requirements.maxDurationMinutes - randInt(2, 5);
    altitude = Math.round(altitudeMid + randInt(-5, 5));
  } else {
    coveragePercent = randInt(92, 98);
    durationMinutes = requirements.maxDurationMinutes - randInt(2, 5);
    altitude = Math.round(altitudeMid + randInt(-5, 5));

    const failureType = randInt(0, 2);
    if (failureType === 0) {
      coveragePercent = 65;
    } else if (failureType === 1) {
      durationMinutes = requirements.maxDurationMinutes + 10;
    } else {
      altitude = requirements.altitudeRange.max + randInt(8, 15);
    }
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

// ── Telemetry Helpers ─────────────────────────

/** Returns a float between [min, max] rounded to `decimals` places */
function randBetween(min: number, max: number, decimals = 1): number {
  const val = min + Math.random() * (max - min);
  return parseFloat(val.toFixed(decimals));
}

/** Adds random noise (±noisePercent%) to a value without going outside [min, max] */
function addNoise(value: number, noisePercent: number, min: number, max: number): number {
  const noise = value * (noisePercent / 100) * (Math.random() * 2 - 1);
  return Math.max(min, Math.min(max, parseFloat((value + noise).toFixed(1))));
}

// ── Simulation Modes ──────────────────────────

export type SimulationMode = "compliant" | "non_compliant" | "borderline";

/**
 * Determines the telemetry deviation strategy for each metric based on mode:
 * - compliant: values are within spec + small noise
 * - non_compliant: at least one metric falls outside spec
 * - borderline: values are right at the edge of spec
 */
interface SimConfig {
  coverageMultiplier: number; // multiply minCoverage to get target coverage
  durationMultiplier: number; // multiply maxDuration to get target duration
  altitudeBias: number;       // metres added to midpoint altitude (can be negative)
  noisePercent: number;       // ±% noise applied to all values
}

const SIM_CONFIGS: Record<SimulationMode, SimConfig> = {
  compliant: {
    coverageMultiplier: 1.05,
    durationMultiplier: 0.85,
    altitudeBias: 0,
    noisePercent: 3,
  },
  non_compliant: {
    coverageMultiplier: 0.75,  // under-delivers coverage
    durationMultiplier: 1.15,  // runs over time
    altitudeBias: 30,          // flies too high
    noisePercent: 5,
  },
  borderline: {
    coverageMultiplier: 1.0,
    durationMultiplier: 1.0,
    altitudeBias: 0,
    noisePercent: 1,
  },
};

// ── Main Simulator ────────────────────────────

/**
 * Generates realistic mock drone telemetry for a given task and simulation mode.
 *
 * @param task          - The task whose requirements drive the simulation
 * @param mode          - Compliance mode controlling whether proof should pass
 * @param overrideDroneId - Optional fixed drone ID (random if omitted)
 */
export function simulateDroneProof(
  task: Task,
  mode: SimulationMode = "compliant",
  overrideDroneId?: string
): DroneProof {
  const req: TaskRequirements = task.requirements;
  const cfg = SIM_CONFIGS[mode];

  // Coverage: target = minCoverage × multiplier, capped at 100
  const targetCoverage = Math.min(100, req.minCoverage * cfg.coverageMultiplier);
  const coveragePercent = addNoise(targetCoverage, cfg.noisePercent, 0, 100);

  // Duration: target = maxDuration × multiplier
  const targetDuration = req.maxDurationMinutes * cfg.durationMultiplier;
  const durationMinutes = addNoise(targetDuration, cfg.noisePercent, 1, 999);

  // Altitude: midpoint of allowed range ± bias
  const altMid = (req.altitudeRange.min + req.altitudeRange.max) / 2 + cfg.altitudeBias;
  const altitude = addNoise(
    altMid,
    cfg.noisePercent,
    req.altitudeRange.min - 50, // allow slight overshoot for non_compliant
    req.altitudeRange.max + 50
  );

  return {
    taskId: task.id,
    coveragePercent,
    durationMinutes,
    altitude,
    timestamp: Date.now(),
    droneId: overrideDroneId ?? generateDroneId(),
  };
}

// ── Telemetry Stream Simulator ────────────────

export interface TelemetryFrame {
  /** Seconds elapsed since mission start */
  elapsed: number;
  /** Current altitude in metres */
  altitude: number;
  /** Coverage achieved so far (%) */
  coverage: number;
  /** Battery remaining (%) */
  battery: number;
  /** GPS latitude (mock) */
  lat: number;
  /** GPS longitude (mock) */
  lng: number;
  /** Speed in m/s */
  speed: number;
}

/**
 * Generates a time-series array of telemetry frames simulating a drone mission.
 * Useful for animating the DroneSimulator UI component.
 *
 * @param durationMinutes - Total planned mission duration
 * @param altitudeTarget  - Target cruise altitude in metres
 * @param framesCount     - Number of frames to generate
 * @param originLat       - Starting GPS latitude
 * @param originLng       - Starting GPS longitude
 */
export function generateTelemetryStream(
  durationMinutes: number,
  altitudeTarget: number,
  framesCount = 60,
  originLat = 41.015137,
  originLng = 28.979530
): TelemetryFrame[] {
  const frames: TelemetryFrame[] = [];
  const totalSeconds = durationMinutes * 60;
  const stepSeconds = totalSeconds / framesCount;

  let battery = 100;
  let coverage = 0;
  let lat = originLat;
  let lng = originLng;

  for (let i = 0; i < framesCount; i++) {
    const t = i / framesCount; // normalised 0→1

    // Altitude: ramp up first 10%, cruise, ramp down last 10%
    let altitude: number;
    if (t < 0.1) {
      altitude = altitudeTarget * (t / 0.1);
    } else if (t > 0.9) {
      altitude = altitudeTarget * ((1 - t) / 0.1);
    } else {
      altitude = altitudeTarget;
    }
    altitude = addNoise(altitude, 2, 0, altitudeTarget * 1.5);

    // Coverage increases roughly linearly (± noise)
    coverage = Math.min(100, addNoise(t * 105, 3, 0, 100));

    // Battery drains linearly from 100→15
    battery = parseFloat((100 - t * 85).toFixed(1));

    // GPS drift (simulate a patrol grid)
    lat += randBetween(-0.0002, 0.0002, 6);
    lng += randBetween(-0.0002, 0.0002, 6);

    frames.push({
      elapsed: parseFloat((i * stepSeconds).toFixed(1)),
      altitude: parseFloat(altitude.toFixed(1)),
      coverage: parseFloat(coverage.toFixed(1)),
      battery,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      speed: randBetween(8, 18),
    });
  }

  return frames;
}

// ── Mock Task Dataset ─────────────────────────

/**
 * Returns a set of pre-baked mock Task objects for UI development / demos.
 * These match the Task interface from types.ts.
 */
export function getMockTasks(): Task[] {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  return [
    {
      id: "1",
      title: "Agricultural Survey – Wheat Fields",
      description:
        "Complete aerial coverage survey of 240-hectare wheat cultivation zone near Konya. High-resolution imagery required for crop health analysis using NDVI sensors.",
      requirements: {
        minCoverage: 95,
        maxDurationMinutes: 45,
        altitudeRange: { min: 80, max: 120 },
        additionalConstraints: ["NDVI sensor required", "No fly zone: east boundary"],
      },
      reward: "0.25",
      status: "open",
      creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      acceptedBy: "",
      deadline: now + 3 * day,
    },
    {
      id: "2",
      title: "Coastal Erosion Monitoring",
      description:
        "Map 18km of Black Sea coastline to measure erosion deltas from last quarter's storm data. LiDAR pointcloud export required.",
      requirements: {
        minCoverage: 100,
        maxDurationMinutes: 90,
        altitudeRange: { min: 50, max: 80 },
        additionalConstraints: ["LiDAR payload", "Flight log GPS track required"],
      },
      reward: "0.8",
      status: "open",
      creator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      acceptedBy: "",
      deadline: now + 5 * day,
    },
    {
      id: "3",
      title: "Solar Farm Thermal Inspection",
      description:
        "Thermographic inspection of 500-panel solar installation to detect faulty cells. Deliver georeferenced thermal images with anomaly annotations.",
      requirements: {
        minCoverage: 100,
        maxDurationMinutes: 30,
        altitudeRange: { min: 20, max: 40 },
        additionalConstraints: ["Thermal camera mandatory", "Morning flight (before 10:00)"],
      },
      reward: "0.45",
      status: "accepted",
      creator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      acceptedBy: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      deadline: now + 2 * day,
    },
    {
      id: "4",
      title: "Construction Site Progress Scan",
      description:
        "Weekly volumetric scan of active construction site for quantity surveying. Output: 3D point cloud + progress report against design model.",
      requirements: {
        minCoverage: 90,
        maxDurationMinutes: 25,
        altitudeRange: { min: 60, max: 100 },
        additionalConstraints: ["Photogrammetry resolution ≥ 3cm/px"],
      },
      reward: "0.15",
      status: "submitted",
      creator: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      acceptedBy: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      deadline: now + day,
    },
    {
      id: "5",
      title: "Forest Fire Risk Assessment",
      description:
        "Classify vegetation density and dry biomass across 600-hectare state forest to produce fire risk heatmap for emergency services.",
      requirements: {
        minCoverage: 98,
        maxDurationMinutes: 120,
        altitudeRange: { min: 100, max: 160 },
        additionalConstraints: ["Multispectral sensor", "Wind speed < 8 m/s"],
      },
      reward: "1.2",
      status: "approved",
      creator: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      acceptedBy: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      deadline: now - day,
    },
  ];
}
