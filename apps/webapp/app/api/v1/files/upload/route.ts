import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getS3Client, requireBucket } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BodySchema = z.object({
  filename: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { filename, fileType, fileSize } = parsed.data;
  // Hard limit from spec
  if (fileSize > 2 * 1024 * 1024 * 1024) {
    return Response.json({ error: "File too large (max 2GB)" }, { status: 413 });
  }

  // NOTE: We’ll normalize user ids later once DB auth is implemented.
  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: { name: session.user.name ?? undefined, avatarUrl: session.user.image ?? undefined },
    create: { email: session.user.email, name: session.user.name ?? undefined, avatarUrl: session.user.image ?? undefined },
  });

  const id = crypto.randomUUID();
  const key = `temp/${user.id}/${id}/${filename}`;

  const s3 = getS3Client();
  const bucket = requireBucket();

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    }),
    { expiresIn: 3600 }
  );

  await prisma.file.create({
    data: {
      id,
      userId: user.id,
      originalFilename: filename,
      fileType,
      fileSize: BigInt(fileSize),
      s3Key: key,
      status: "uploaded",
    },
  });

  return Response.json({ fileId: id, uploadUrl, expiresIn: 3600 });
}


