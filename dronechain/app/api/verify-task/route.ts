import { NextRequest, NextResponse } from "next/server";
import { Task, DroneProof } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { task, proof }: { task: Task; proof: DroneProof } = await req.json();

    const prompt = `Verify this drone mission:

REQUIREMENTS:
- Minimum area coverage: ${task.requirements.minCoverage}%
- Maximum duration: ${task.requirements.maxDurationMinutes} minutes
- Altitude range: ${task.requirements.altitudeRange.min}m - ${task.requirements.altitudeRange.max}m
- Additional: ${task.requirements.additionalConstraints.join(", ")}

DRONE PROOF SUBMITTED:
- Coverage achieved: ${proof.coveragePercent}%
- Duration: ${proof.durationMinutes} minutes
- Altitude: ${proof.altitude}m
- Drone ID: ${proof.droneId}
- Timestamp: ${new Date(proof.timestamp * 1000).toISOString()}

Return this exact JSON:
{
  "approved": <true|false>,
  "reasoning": "<2-3 sentence explanation>",
  "criteriaChecks": [
    { "criterion": "Area Coverage", "required": "${task.requirements.minCoverage}%", "actual": "${proof.coveragePercent}%", "passed": <true|false> },
    { "criterion": "Duration", "required": "<${task.requirements.maxDurationMinutes} min", "actual": "${proof.durationMinutes} min", "passed": <true|false> },
    { "criterion": "Altitude", "required": "${task.requirements.altitudeRange.min}-${task.requirements.altitudeRange.max}m", "actual": "${proof.altitude}m", "passed": <true|false> }
  ],
  "confidenceScore": <number 75-99>
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system:
          "You are an AI verification oracle for autonomous drone missions. Analyze submitted proof data against task requirements and determine mission success. Respond with valid JSON only. No markdown.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    const result = JSON.parse(text);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
