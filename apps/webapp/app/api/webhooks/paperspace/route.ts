import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

/**
 * Paperspace webhook (stub).
 * Once you share the signature/header spec, we'll verify authenticity.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.jobId || !body?.status) {
    return jsonError(400, "Missing jobId/status");
  }

  const { jobId, status, progress, error, outputS3Key } = body as {
    jobId: string;
    status: "succeeded" | "failed" | "processing";
    progress?: number;
    error?: string;
    outputS3Key?: string;
  };

  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job) return jsonError(404, "Unknown jobId");

  if (status === "processing") {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: "processing",
        progress: typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : job.progress,
        startedAt: job.startedAt ?? new Date(),
      },
    });
    return Response.json({ ok: true });
  }

  if (status === "succeeded") {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        outputS3Key: outputS3Key ?? job.outputS3Key,
        errorMessage: null,
      },
    });
    return Response.json({ ok: true });
  }

  await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      status: "failed",
      completedAt: new Date(),
      errorMessage: error ?? "Paperspace job failed",
    },
  });
  return Response.json({ ok: true });
}


