import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/redis";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    progressMessage: job.progressMessage,
    downloadUrl: job.downloadUrl,
    fileName: job.fileName,
    fileSize: job.fileSize,
    generationTime: job.generationTime,
    error: job.error,
  });
}
