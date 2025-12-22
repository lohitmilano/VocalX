import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return jsonError(401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return jsonError(401, "Unauthorized");

  const job = await prisma.processingJob.findFirst({
    where: { id: params.jobId, userId: user.id },
    select: {
      id: true,
      status: true,
      progress: true,
      errorMessage: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
    },
  });

  if (!job) return jsonError(404, "Not found");

  return Response.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    eta: null,
    error: job.errorMessage ?? null,
  });
}


