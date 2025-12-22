import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { submitPaperspaceJob } from "@/lib/paperspace";

const BodySchema = z.object({
  fileId: z.string().uuid(),
  promptType: z.enum(["text", "span", "visual"]),
  promptData: z.any(),
  quality: z.enum(["standard", "high"]).default("standard"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return jsonError(401, "Unauthorized");

  const parsed = await readJson(req, BodySchema);
  if (!parsed.ok) return jsonError(400, "Invalid request", parsed.error);

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return jsonError(401, "Unauthorized");

  const file = await prisma.file.findFirst({ where: { id: parsed.data.fileId, userId: user.id } });
  if (!file) return jsonError(404, "File not found");

  // TODO: enforce quota based on duration once duration is populated.

  const job = await prisma.processingJob.create({
    data: {
      userId: user.id,
      fileId: file.id,
      promptType: parsed.data.promptType,
      promptData: parsed.data.promptData,
      status: "queued",
      progress: 0,
    },
  });

  // Stub submission: returns mock id until you provide Paperspace keys & we implement the real client.
  const ps = await submitPaperspaceJob({
    command: "python /app/run_processing.py",
    env: {
      FILE_ID: file.id,
      JOB_ID: job.id,
      PROMPT_TYPE: parsed.data.promptType,
      QUALITY: parsed.data.quality,
      // In production we’ll pass S3 input key + webhook URL.
    },
    machineType: "GPU+",
  });

  await prisma.processingJob.update({
    where: { id: job.id },
    data: { paperspaceJobId: ps.paperspaceJobId },
  });

  return Response.json({
    jobId: job.id,
    status: "queued",
    estimatedTime: 0,
  });
}


