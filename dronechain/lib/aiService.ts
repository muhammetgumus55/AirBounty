import { Task, DroneProof, TaskRequirements, VerificationResult } from "./types";

export async function generateTaskRequirements(
  title: string,
  description: string
): Promise<TaskRequirements & { reasoning: string }> {
  const response = await fetch("/api/generate-requirements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate requirements");
  }

  return response.json();
}

export async function verifyDroneTask(
  task: Task,
  proof: DroneProof
): Promise<VerificationResult> {
  const response = await fetch("/api/verify-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, proof }),
  });

  if (!response.ok) {
    throw new Error("Verification failed");
  }

  return response.json();
}
