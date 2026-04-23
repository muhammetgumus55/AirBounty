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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content:
              "You are an AI verification oracle for autonomous drone missions. Analyze submitted proof data against task requirements and determine mission success. Respond with valid JSON only. No markdown.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new Error("OpenRouter returned an invalid response format.");
    }
    const result = JSON.parse(text);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
