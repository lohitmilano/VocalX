import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const STORAGE_KEY = "vocalx.webappBaseUrl";

export const DEFAULT_WEBAPP_BASE_URL = "http://10.0.2.2:3000";

export async function getWebappBaseUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return stored?.trim() ? stored.trim() : DEFAULT_WEBAPP_BASE_URL;
}

export async function setWebappBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, url.trim());
}

let inFlightDetect: Promise<string> | null = null;

function extractIpv4(s: string | undefined | null): string | null {
  if (!s) return null;
  const m = s.match(/\b(\d{1,3}\.){3}\d{1,3}\b/);
  return m ? m[0] : null;
}

function getExpoDevHostIp(): string | null {
  // Expo can expose host info via different fields depending on runtime (Expo Go / dev client).
  const anyConstants = Constants as any;
  const hostUri: string | undefined =
    anyConstants?.expoConfig?.hostUri ??
    anyConstants?.manifest2?.extra?.expoGo?.debuggerHost ??
    anyConstants?.manifest?.debuggerHost ??
    anyConstants?.expoGoConfig?.debuggerHost;

  return extractIpv4(hostUri);
}

async function probeHealth(baseUrl: string): Promise<boolean> {
  const normalized = baseUrl.replace(/\/+$/, "");
  const url = `${normalized}/api/v1/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    return json?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns a base URL for the VocalX webapp.
 * - If user previously set it in Settings, returns it.
 * - Otherwise auto-detects on first launch and persists the best guess.
 */
export async function ensureWebappBaseUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored?.trim()) return stored.trim();

  if (inFlightDetect) return inFlightDetect;

  inFlightDetect = (async () => {
    const candidates: string[] = [];

    const ip = getExpoDevHostIp();
    if (ip) candidates.push(`http://${ip}:3000`);

    if (Platform.OS === "android") {
      candidates.push(DEFAULT_WEBAPP_BASE_URL);
    } else {
      candidates.push("http://localhost:3000");
      candidates.push("http://127.0.0.1:3000");
    }

    for (const c of candidates) {
      const ok = await probeHealth(c);
      if (ok) {
        await AsyncStorage.setItem(STORAGE_KEY, c);
        return c;
      }
    }

    // Last resort: fall back to emulator URL, but still persist it so app has a stable default.
    await AsyncStorage.setItem(STORAGE_KEY, DEFAULT_WEBAPP_BASE_URL);
    return DEFAULT_WEBAPP_BASE_URL;
  })();

  try {
    return await inFlightDetect;
  } finally {
    inFlightDetect = null;
  }
}


