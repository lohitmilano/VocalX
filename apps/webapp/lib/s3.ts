import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

export function getS3Client() {
  if (!env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("Missing AWS env vars (AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)");
  }
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export function requireBucket(): string {
  if (!env.AWS_S3_BUCKET) throw new Error("Missing AWS_S3_BUCKET");
  return env.AWS_S3_BUCKET;
}


