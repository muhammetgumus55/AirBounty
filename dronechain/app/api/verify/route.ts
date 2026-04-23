import { NextRequest, NextResponse } from "next/server";
import type { DroneProof, Task } from "@/lib/types";

/**
 * POST /api/verify
 * Body: { task: Task, proof: DroneProof }
 * Returns: VerificationResult
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { task, proof } = body as { task: Task; proof: DroneProof };

    if (!task || !proof) {
      return NextResponse.json(
        { error: "Missing task or proof in request body" },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${req.nextUrl.origin}/api/verify-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, proof }),
    });

    const rawText = await upstream.text();
    let data: unknown = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return NextResponse.json(
        { error: `Verification upstream returned non-JSON (${upstream.status})` },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      const msg =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : `Verification failed (${upstream.status})`;
      return NextResponse.json({ error: msg }, { status: upstream.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
