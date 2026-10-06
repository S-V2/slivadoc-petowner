import { useEffect, useRef, type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  installFetchInterceptor,
  NetworkLoggerPanel,
  NetworkLoggerProvider,
  useNetworkLogger,
  type NetworkLoggerAction,
} from "react-native-network-inspector-devtools";
import { isNetworkLoggerEnabled, redactNetworkAction } from "./network-redaction";

function SafeFetchLogger() {
  const { dispatch, activeMocks } = useNetworkLogger();
  const mocks = useRef(activeMocks);
  useEffect(() => { mocks.current = activeMocks; }, [activeMocks]);
  useEffect(() => {
    let active = true;
    const sanitizedDispatch = {
      current: (action: NetworkLoggerAction) => {
        if (active) dispatch(redactNetworkAction(action));
      },
    };
    const stop = installFetchInterceptor(sanitizedDispatch, mocks);
    return () => { active = false; stop(); };
  }, [dispatch]);
  return null;
}

function NetworkLoggerButton() {
  const insets = useSafeAreaInsets();
  const { entries, dispatch } = useNetworkLogger();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buka network logger"
      onPress={() => dispatch({ type: "SET_VISIBLE", payload: true })}
      style={({ pressed }) => [styles.button, { bottom: insets.bottom + 120 }, pressed && styles.pressed]}
    >
      <Ionicons name="pulse-outline" size={22} color="#fff" />
      {entries.length > 0 ? <View style={styles.badge}><Text style={styles.count}>{entries.length > 99 ? "99+" : entries.length}</Text></View> : null}
    </Pressable>
  );
}

export function MobileNetworkLogger({ children }: PropsWithChildren) {
  const enabled = isNetworkLoggerEnabled(__DEV__, process.env.EXPO_PUBLIC_NETWORK_LOGGER_ENABLED);
  if (!enabled) return <>{children}</>;
  return (
    <NetworkLoggerProvider maxEntries={200} enableConsoleCapture={false} enableWebSync={false}>
      <SafeFetchLogger />
      <View style={styles.root} collapsable={false}>
        {children}
        <NetworkLoggerButton />
        <NetworkLoggerPanel />
      </View>
    </NetworkLoggerProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  button: { position: "absolute", left: 16, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#0284c7", zIndex: 9999, elevation: 12, shadowColor: "#0c4a6e", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  pressed: { opacity: 0.75 },
  badge: { position: "absolute", right: -4, top: -4, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: "#e11d48", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  count: { fontSize: 10, fontWeight: "700", color: "#fff" },
});
