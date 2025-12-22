import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return jsonError(401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return jsonError(401, "Unauthorized");

  const job = await prisma.processingJob.findFirst({
    where: { id: params.jobId, userId: user.id },
  });
  if (!job) return jsonError(404, "Not found");

  // TODO: Call Paperspace cancel API when integration is enabled.
  await prisma.processingJob.update({
    where: { id: job.id },
    data: { status: "cancelled", completedAt: new Date(), errorMessage: "Cancelled by user" },
  });

  return Response.json({ success: true });
}


