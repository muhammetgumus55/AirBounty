import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();

    const prompt = `Generate drone task requirements for the following task:
Title: ${title}
Description: ${description}

Respond with this exact JSON structure:
{
  "minCoverage": <number 70-98>,
  "maxDurationMinutes": <number 5-60>,
  "altitudeRange": { "min": <number 20-50>, "max": <number 51-120> },
  "additionalConstraints": [<2-3 short strings>],
  "reasoning": "<one sentence explanation>"
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
        max_tokens: 500,
        system:
          "You are an AI system that converts drone task descriptions into precise, measurable operational requirements. You must respond with valid JSON only. No markdown, no explanation, only raw JSON.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    const requirements = JSON.parse(text);

    return NextResponse.json(requirements, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
