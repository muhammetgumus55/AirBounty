import { NextRequest, NextResponse } from "next/server";
import { verifyDroneProof } from "@/lib/aiService";
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

    const result = await verifyDroneProof(task, proof);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
