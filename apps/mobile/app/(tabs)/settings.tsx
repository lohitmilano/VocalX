import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { DEFAULT_WEBAPP_BASE_URL, getWebappBaseUrl, setWebappBaseUrl } from "../../src/config/webapp";

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SettingsTab() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWebappBaseUrl().then((u) => {
      setValue(u);
      setSaved(u);
    });
  }, []);

  const dirty = useMemo(() => value.trim() !== (saved ?? "").trim(), [saved, value]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1220" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>Settings</Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
          Set the base URL for the VocalX webapp (Studio runs inside this app).
        </Text>

        <View style={{ marginTop: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.85)", marginBottom: 8 }}>Webapp Base URL</Text>
          <TextInput
            value={value}
            onChangeText={(t) => {
              setValue(t);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={DEFAULT_WEBAPP_BASE_URL}
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={{
              color: "white",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          />
          {error ? (
            <Text style={{ color: "#fca5a5", marginTop: 8 }}>{error}</Text>
          ) : (
            <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
              Android emulator: {DEFAULT_WEBAPP_BASE_URL}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            onPress={async () => {
              const v = value.trim().replace(/\/+$/, "");
              if (!isValidHttpUrl(v)) {
                setError("Please enter a valid http(s) URL, e.g. http://10.0.2.2:3000");
                return;
              }
              await setWebappBaseUrl(v);
              setSaved(v);
              setError(null);
            }}
            disabled={!dirty}
            style={{
              backgroundColor: dirty ? "#0d9488" : "rgba(255,255,255,0.15)",
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setValue(DEFAULT_WEBAPP_BASE_URL);
              setError(null);
            }}
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Use Emulator URL</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)" }}>
            Tip: On a real Android phone, replace 10.0.2.2 with your PC’s LAN IP (e.g. http://192.168.1.50:3000).
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}


