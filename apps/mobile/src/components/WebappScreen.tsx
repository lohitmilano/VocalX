import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { WebView } from "react-native-webview";

import { ensureWebappBaseUrl } from "../config/webapp";

export function WebappScreen(props: { path: string; title: string }) {
  const webviewRef = useRef<WebView>(null);
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isReachable, setIsReachable] = useState<boolean | null>(null);
  const [reachabilityMessage, setReachabilityMessage] = useState<string | null>(null);

  const loadBaseUrl = useCallback(async () => {
    const u = await ensureWebappBaseUrl();
    setBaseUrl(u);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadBaseUrl().finally(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, [loadBaseUrl]);

  useFocusEffect(
    useCallback(() => {
      // When user changes Settings, coming back to this tab should reload the base URL.
      loadBaseUrl();
    }, [loadBaseUrl])
  );

  const uri = useMemo(() => {
    if (!baseUrl) return null;
    const normalized = baseUrl.replace(/\/+$/, "");
    const path = props.path.startsWith("/") ? props.path : `/${props.path}`;
    return `${normalized}${path}`;
  }, [baseUrl, props.path]);

  const healthUrl = useMemo(() => {
    if (!baseUrl) return null;
    const normalized = baseUrl.replace(/\/+$/, "");
    return `${normalized}/api/v1/health`;
  }, [baseUrl]);

  const checkReachability = useCallback(async () => {
    if (!healthUrl) return;
    setIsReachable(null);
    setReachabilityMessage(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(healthUrl, { signal: controller.signal });
      if (!res.ok) {
        setIsReachable(false);
        setReachabilityMessage(`Webapp responded with ${res.status}`);
        return;
      }
      const json = await res.json().catch(() => null);
      if (json?.ok === true) {
        setIsReachable(true);
        return;
      }
      setIsReachable(true);
    } catch (e: any) {
      setIsReachable(false);
      setReachabilityMessage(e?.name === "AbortError" ? "Connection timed out" : "Cannot reach webapp");
    } finally {
      clearTimeout(timeout);
    }
  }, [healthUrl]);

  useEffect(() => {
    if (!healthUrl) return;
    checkReachability();
  }, [checkReachability, healthUrl]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    checkReachability().finally(() => {
      webviewRef.current?.reload();
      setTimeout(() => setRefreshing(false), 400);
    });
  }, [checkReachability]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1220" }}>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.08)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{props.title}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => webviewRef.current?.goBack()}
            disabled={!canGoBack}
            style={{ opacity: canGoBack ? 1 : 0.35 }}
          >
            <Text style={{ color: "white" }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => webviewRef.current?.goForward()}
            disabled={!canGoForward}
            style={{ opacity: canGoForward ? 1 : 0.35 }}
          >
            <Text style={{ color: "white" }}>Next</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => webviewRef.current?.reload()}>
            <Text style={{ color: "white" }}>Reload</Text>
          </TouchableOpacity>
        </View>
      </View>

      {uri && (isReachable === null || isReachable === true) ? (
        <WebView
          ref={webviewRef}
          source={{ uri }}
          originWhitelist={["*"]}
          onNavigationStateChange={(nav) => {
            setCanGoBack(Boolean(nav.canGoBack));
            setCanGoForward(Boolean(nav.canGoForward));
          }}
          pullToRefreshEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : uri && isReachable === false ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "700", textAlign: "center" }}>
            Can’t reach the VocalX webapp
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 10, textAlign: "center" }}>
            {reachabilityMessage ?? "Please check your URL, Wi‑Fi, and that the webapp is running."}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 10, textAlign: "center" }}>
            Current URL: {baseUrl}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <TouchableOpacity
              onPress={() => checkReachability()}
              style={{
                backgroundColor: "#0d9488",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.navigate("/(tabs)/settings")}
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Open Settings</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 16, textAlign: "center" }}>
            Android emulator uses 10.0.2.2. A real phone must use your PC’s LAN IP (e.g. 192.168.x.x).
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", textAlign: "center" }}>
            Loading configuration…
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}


