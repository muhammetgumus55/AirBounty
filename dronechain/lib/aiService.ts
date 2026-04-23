// ─────────────────────────────────────────────
//  DroneChain – AI Verification Service (Claude API)
// ─────────────────────────────────────────────
import Anthropic from "@anthropic-ai/sdk";
import type { DroneProof, Task, VerificationResult } from "./types";

let _client: Anthropic | null = null;

/** Lazily create the Anthropic client (server-side only) */
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to your .env.local file."
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ── Prompt Builder ────────────────────────────

function buildVerificationPrompt(task: Task, proof: DroneProof): string {
  return `You are an autonomous drone task verifier for the DroneChain marketplace.

## Task Requirements
- **Minimum Coverage**: ${task.requirements.minCoverage}%
- **Maximum Duration**: ${task.requirements.maxDurationMinutes} minutes
- **Altitude Range**: ${task.requirements.altitudeRange.min}m – ${task.requirements.altitudeRange.max}m
- **Additional Constraints**: ${
    task.requirements.additionalConstraints.length > 0
      ? task.requirements.additionalConstraints.join(", ")
      : "None"
  }

## Submitted Drone Proof
- **Drone ID**: ${proof.droneId}
- **Coverage Achieved**: ${proof.coveragePercent}%
- **Flight Duration**: ${proof.durationMinutes} minutes
- **Average Altitude**: ${proof.altitude}m
- **Submitted At**: ${new Date(proof.timestamp).toISOString()}

## Instructions
Evaluate whether the submitted proof satisfies every requirement.
Return a JSON object with exactly these fields:
{
  "approved": boolean,
  "reasoning": "concise paragraph explaining your decision",
  "failedCriteria": ["list of criteria strings that failed, empty if approved"]
}

Be strict but fair. If all values are within spec, set approved: true and failedCriteria: [].`;
}

// ── Main Verification Function ────────────────

/**
 * Calls Claude to verify a drone proof against a task's requirements.
 * Must be called server-side (API Route / Server Action).
 */
export async function verifyDroneProof(
  task: Task,
  proof: DroneProof
): Promise<VerificationResult> {
  const client = getClient();
  const prompt = buildVerificationPrompt(task, proof);

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract the text block
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  // Strip possible markdown code fences
  const raw = textBlock.text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: VerificationResult;
  try {
    parsed = JSON.parse(raw) as VerificationResult;
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${raw}`);
  }

  // Defensive defaults
  return {
    approved: Boolean(parsed.approved),
    reasoning: parsed.reasoning ?? "No reasoning provided.",
    failedCriteria: Array.isArray(parsed.failedCriteria)
      ? parsed.failedCriteria
      : [],
  };
}

// ── Task Description Generator ────────────────

/**
 * Uses Claude to generate a rich task description from a short title + requirements.
 * Useful in the task-creation form to help non-technical users.
 */
export async function generateTaskDescription(
  title: string,
  requirements: Task["requirements"]
): Promise<string> {
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a technical writer for a drone marketplace.
Write a clear, professional task description (2–3 paragraphs) for a drone mission titled:
"${title}"

The mission has these requirements:
- Coverage: ${requirements.minCoverage}%
- Max duration: ${requirements.maxDurationMinutes} min
- Altitude: ${requirements.altitudeRange.min}–${requirements.altitudeRange.max}m
- Constraints: ${requirements.additionalConstraints.join(", ") || "none"}

Return only the description text, no headers or markdown.`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text"
    ? textBlock.text.trim()
    : "Mission description unavailable.";
}
