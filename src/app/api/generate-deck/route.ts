import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createJob } from "@/lib/redis";
import { isAsyncMode, publishGenerateJob } from "@/lib/queue";
import { runGeneration } from "./worker/route";
import type { DeckRequest } from "@/types/deck";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeckRequest;
    const { prompt, deckType, documents } = body;

    // Validate
    if (!prompt || !deckType || !documents?.length) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: prompt, deckType, documents" },
        { status: 400 }
      );
    }

    if (!["one-pager", "pitch-15", "modular"].includes(deckType)) {
      return NextResponse.json(
        { success: false, error: "deckType must be 'one-pager', 'pitch-15', or 'modular'" },
        { status: 400 }
      );
    }

    const jobId = crypto.randomUUID();
    await createJob(jobId, body);

    if (isAsyncMode()) {
      // Production: publish to QStash, return immediately
      console.log(`[dispatcher] Job ${jobId} queued via QStash`);
      await publishGenerateJob(jobId);
      return NextResponse.json({ jobId }, { status: 202 });
    }

    // Dev mode: run synchronously, return result
    console.log(`[dispatcher] Job ${jobId} running synchronously (dev mode)`);
    await runGeneration(jobId);

    // Re-read job to get result
    const { getJob } = await import("@/lib/redis");
    const job = await getJob(jobId);

    if (!job || job.status === "failed") {
      return NextResponse.json(
        { success: false, error: job?.error || "Generation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      downloadUrl: job.downloadUrl,
      fileName: job.fileName,
      fileSize: job.fileSize,
      generationTime: job.generationTime,
    });
  } catch (error) {
    console.error("[dispatcher] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
