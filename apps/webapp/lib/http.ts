import { z } from "zod";

export function jsonError(status: number, message: string, details?: unknown) {
  return Response.json(
    { error: message, details },
    { status, headers: { "content-type": "application/json" } }
  );
}

export async function readJson<T extends z.ZodTypeAny>(req: Request, schema: T) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  return { ok: true as const, data: parsed.data as z.infer<T> };
}


