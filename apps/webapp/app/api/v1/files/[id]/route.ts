import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return jsonError(401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return jsonError(404, "Not found");

  const file = await prisma.file.findFirst({
    where: { id: params.id, userId: user.id },
    select: {
      id: true,
      originalFilename: true,
      fileType: true,
      fileSize: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!file) return jsonError(404, "Not found");

  return Response.json({ ...file, fileSize: file.fileSize.toString() });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return jsonError(401, "Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return jsonError(404, "Not found");

  const file = await prisma.file.findFirst({ where: { id: params.id, userId: user.id } });
  if (!file) return jsonError(404, "Not found");

  // TODO: delete from S3 as well (once S3 delete logic is added).
  await prisma.file.delete({ where: { id: file.id } });

  return Response.json({ success: true });
}


