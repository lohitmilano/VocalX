import { env } from "./env";

export type PaperspaceJobSubmitInput = {
  command: string;
  env: Record<string, string>;
  machineType?: string;
};

export type PaperspaceJobSubmitResult = {
  paperspaceJobId: string;
};

async function submitLocalWorkerJob(input: PaperspaceJobSubmitInput): Promise<PaperspaceJobSubmitResult> {
  if (!env.LOCAL_WORKER_URL) {
    return { paperspaceJobId: `mock_${crypto.randomUUID()}` };
  }

  const url = env.LOCAL_WORKER_URL.replace(/\/+$/, "") + "/load";
  // For now, just trigger model load so we can validate the worker is reachable.
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ load_sam3: true, load_peav: true }),
  }).catch((e) => {
    throw new Error(`Local worker unreachable at ${env.LOCAL_WORKER_URL}: ${String(e)}`);
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Local worker error (${res.status}): ${text}`);
  }

  const json = await res.json().catch(() => null);
  if (json && json.ok === false) {
    throw new Error(`Local worker /load failed: ${JSON.stringify(json.errors ?? json)}`);
  }

  // Return a pseudo paperspace job id; later we’ll return a real local job id.
  return { paperspaceJobId: `local_${crypto.randomUUID()}` };
}

/**
 * Stub client: returns a mock job id when PAPERSPACE_API_KEY is not set.
 * Once you provide keys, we’ll switch to real HTTP calls.
 */
export async function submitPaperspaceJob(input: PaperspaceJobSubmitInput): Promise<PaperspaceJobSubmitResult> {
  if (!env.PAPERSPACE_API_KEY) {
    // Local-first: if LOCAL_WORKER_URL is set, use local worker; otherwise stay mocked.
    return submitLocalWorkerJob(input);
  }

  // TODO: Implement real Paperspace Gradient job submission once API key/team id are provided.
  // This placeholder keeps compile-time wiring complete.
  throw new Error("Paperspace integration not configured yet (PAPERSPACE_API_KEY present but client not implemented).");
}


