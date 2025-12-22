import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import type { File as DbFile } from "@prisma/client";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return jsonError(401, "Unauthorized");

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
  });
  if (!parsed.success) return jsonError(400, "Invalid query", parsed.error.flatten());

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return Response.json({ items: [], page: parsed.data.page, limit: parsed.data.limit, total: 0 });

  const { page, limit } = parsed.data;

  type FileListItem = Pick<
    DbFile,
    "id" | "originalFilename" | "fileType" | "fileSize" | "status" | "createdAt" | "updatedAt"
  >;

  const [total, items] = await Promise.all([
    prisma.file.count({ where: { userId: user.id } }),
    prisma.file.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        originalFilename: true,
        fileType: true,
        fileSize: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<FileListItem[]>,
  ]);

  return Response.json({
    page,
    limit,
    total,
    items: items.map((f: FileListItem) => ({
      ...f,
      fileSize: f.fileSize.toString(),
    })),
  });
}


