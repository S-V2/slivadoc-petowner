import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import { Camera, Map as MapLibreMap, type CameraRef, type StyleSpecification } from "@maplibre/maplibre-react-native";

import { reverseMobileGeocode, searchMobileLocation, type MobileLocationResult } from "../api";
import { DEVICE_LOCATION_LABEL, PIN_LOCATION_LABEL, type StoredLocation } from "../location";
import { colors, radius, spacing, typography } from "../theme";
import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../i18n";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { BoundedBottomSheet, PrimaryButton } from "./ui";

const MAP_STYLE_URL = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
const MAP_PMTILES_URL = process.env.EXPO_PUBLIC_MAP_PMTILES_URL;
const INDONESIA: [number, number] = [118, -2.5];

let mapStyle: Promise<StyleSpecification> | undefined;
// Same contract as the web GeoMap: the PMTiles archive comes from env, style.json supplies layers, glyphs and sprites.
function loadMapStyle() {
  mapStyle ??= fetch(MAP_STYLE_URL!)
    .then((response) => response.json() as Promise<StyleSpecification>)
    .then((style) => ({
      ...style,
      sources: Object.fromEntries(
        Object.entries(style.sources ?? {}).map(([name, source]) => {
          if (source.type !== "vector") return [name, source];
          const vector = { ...source };
          delete vector.tiles;
          return [name, { ...vector, url: `pmtiles://${MAP_PMTILES_URL}` }];
        }),
      ),
    }))
    .catch((cause) => {
      mapStyle = undefined;
      throw cause;
    });
  return mapStyle;
}

type Props = {
  visible: boolean;
  current?: StoredLocation;
  authenticated: boolean;
  onRequireLogin: () => void;
  onSelect: (location: StoredLocation) => void;
  onClose: () => void;
};

export function LocationModal({ visible, current, authenticated, onRequireLogin, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<MobileLocationResult & { id: string }>>([]);
  const [busy, setBusy] = useState<"" | "device" | "search">("");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<StoredLocation | undefined>(current);
  const [style, setStyle] = useState<StyleSpecification>();
  const [mapFailed, setMapFailed] = useState(!MAP_STYLE_URL || !MAP_PMTILES_URL);
  const camera = useRef<CameraRef>(null);
  const pinSeq = useRef(0);

  useEffect(() => {
    if (!visible || mapFailed || style) return;
    let active = true;
    loadMapStyle().then(
      (loaded) => active && setStyle(loaded),
      () => active && setMapFailed(true),
    );
    return () => {
      active = false;
    };
  }, [visible, mapFailed, style]);

  const moveTo = async (latitude: number, longitude: number) => {
    const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    camera.current?.easeTo({ center: [longitude, latitude], zoom: 15, duration: reduced ? 0 : 500 });
  };

  const pickDeviceLocation = async () => {
    setBusy("device");
    setError("");
    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Izin lokasi ditolak. Izinkan lokasi di pengaturan perangkat atau cari alamat manual.");
        return;
      }
      const { coords } = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      // Address lookup is login-only; guests keep the raw coordinates.
      let label = DEVICE_LOCATION_LABEL;
      if (authenticated) {
        label = await reverseMobileGeocode(coords.latitude, coords.longitude).then(
          (result) => result.label || DEVICE_LOCATION_LABEL,
          () => DEVICE_LOCATION_LABEL,
        );
      }
      onSelect({ latitude: coords.latitude, longitude: coords.longitude, label });
    } catch {
      setError("Lokasi perangkat belum dapat ditemukan.");
    } finally {
      setBusy("");
    }
  };

  const runSearch = async () => {
    if (query.trim().length < 3) return;
    setBusy("search");
    setError("");
    try {
      setResults(await searchMobileLocation(query.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pencarian lokasi gagal.");
    } finally {
      setBusy("");
    }
  };

  const choose = (result: MobileLocationResult) => {
    pinSeq.current += 1;
    setPicked({ latitude: result.latitude, longitude: result.longitude, label: result.label });
    void moveTo(result.latitude, result.longitude);
  };

  const dropPin = async (latitude: number, longitude: number) => {
    const seq = ++pinSeq.current;
    setError("");
    if (!authenticated) {
      setPicked({ latitude, longitude, label: PIN_LOCATION_LABEL });
      return;
    }
    setPicked(undefined);
    setResolving(true);
    const label = await reverseMobileGeocode(latitude, longitude).then(
      (result) => result.label || PIN_LOCATION_LABEL,
      () => PIN_LOCATION_LABEL,
    );
    if (seq !== pinSeq.current) return;
    setPicked({ latitude, longitude, label });
    setResolving(false);
  };

  const start = current ?? picked;
  return (
    <BoundedBottomSheet visible={visible} onClose={onClose} maxHeight="94%">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>LOKASI LAYANAN</Text>
        <Text style={styles.title}>Pilih lokasi spesifik</Text>
        <Text style={styles.note}>Dipakai untuk mengurutkan klinik dan petshop terdekat.</Text>

        <PrimaryButton
          icon="locate"
          label={busy === "device" ? "Mencari lokasi…" : "Gunakan lokasi perangkat"}
          disabled={busy !== ""}
          onPress={() => void pickDeviceLocation()}
        />

        {authenticated ? (
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={17} color={colors.muted} />
                <TextInput
                  accessibilityLabel="Cari alamat atau area"
                  placeholder="Cari alamat atau area"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => void runSearch()}
                  returnKeyType="search"
                  style={styles.searchInput}
                />
              </View>
              <Pressable
                accessibilityLabel="Cari"
                disabled={busy !== "" || query.trim().length < 3}
                onPress={() => void runSearch()}
                style={[styles.searchButton, (busy !== "" || query.trim().length < 3) && styles.disabled]}
              >
                {busy === "search" ? <ActivityIndicator color={colors.white} /> : <Ionicons name="arrow-forward" size={18} color={colors.white} />}
              </Pressable>
            </View>
            {results.map((result) => (
              <Pressable key={result.id} onPress={() => choose(result)} style={styles.result}>
                <Ionicons name="location-outline" size={17} color={colors.sky600} />
                <Text translate={false} numberOfLines={2} style={styles.resultText}>{result.label}</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <Pressable onPress={onRequireLogin} style={styles.loginPrompt}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.violet} />
            <Text style={styles.loginPromptText}>Login untuk mencari alamat. Lokasi perangkat tetap bisa dipakai tanpa login.</Text>
          </Pressable>
        )}

        {mapFailed ? (
          <View style={styles.mapFallback}>
            <Ionicons name="map-outline" size={22} color={colors.muted} />
            <Text style={styles.mapFallbackText}>{authenticated ? "Peta belum tersedia. Gunakan lokasi perangkat atau cari alamat." : "Peta belum tersedia. Gunakan lokasi perangkat."}</Text>
          </View>
        ) : (
          <>
            <View style={styles.mapBox}>
              {style ? (
                <MapLibreMap
                  style={StyleSheet.absoluteFill}
                  mapStyle={style}
                  compass={false}
                  onRegionDidChange={(event) => {
                    const { userInteraction, center } = event.nativeEvent;
                    if (userInteraction) void dropPin(center[1], center[0]);
                  }}
                >
                  <Camera
                    ref={camera}
                    initialViewState={start ? { center: [start.longitude, start.latitude], zoom: 15 } : { center: INDONESIA, zoom: 3.5 }}
                  />
                </MapLibreMap>
              ) : (
                <View style={styles.mapLoading}><ActivityIndicator color={colors.sky600} /></View>
              )}
              <View pointerEvents="none" style={styles.pin}>
                <Ionicons name="location" size={38} color={colors.red} />
              </View>
            </View>
            <Text style={styles.hint}>Geser peta sampai pin berada tepat di lokasimu.</Text>
          </>
        )}

        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

        <View style={styles.selected}>
          <Ionicons name="pin-outline" size={17} color={colors.sky600} />
          <Text translate={picked?.label === DEVICE_LOCATION_LABEL || picked?.label === PIN_LOCATION_LABEL} numberOfLines={2} style={styles.selectedText}>
            {resolving ? "…" : picked?.label ?? ""}
          </Text>
        </View>
        <PrimaryButton
          label="Simpan lokasi"
          disabled={!picked || resolving}
          onPress={() => picked && onSelect(picked)}
          style={(!picked || resolving) && styles.disabled}
        />
      </ScrollView>
    </BoundedBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  eyebrow: { color: colors.sky600, fontSize: typography.caption, fontWeight: "700", letterSpacing: 0.8 },
  title: { color: colors.inkStrong, fontSize: typography.sectionTitle, fontWeight: "700" },
  note: { color: colors.muted, fontSize: typography.body, lineHeight: 18 },
  searchRow: { flexDirection: "row", gap: spacing.sm },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 46, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  searchInput: { flex: 1, color: colors.text },
  searchButton: { width: 46, height: 46, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky600 },
  disabled: { opacity: 0.45 },
  result: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  resultText: { flex: 1, color: colors.text, fontSize: typography.body, lineHeight: 18 },
  loginPrompt: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.violet50 },
  loginPromptText: { flex: 1, color: colors.violet, fontSize: typography.body, lineHeight: 18, fontWeight: "600" },
  mapBox: { height: 260, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.sky50 },
  mapLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  // The pin tip sits on the map center, so the visible center is the saved point.
  pin: { position: "absolute", left: "50%", top: "50%", marginLeft: -19, marginTop: -38 },
  hint: { color: colors.muted, fontSize: typography.label },
  mapFallback: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.canvas },
  mapFallbackText: { flex: 1, color: colors.muted, fontSize: typography.body, lineHeight: 18 },
  error: { color: colors.red, fontSize: typography.body, lineHeight: 18 },
  selected: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 24 },
  selectedText: { flex: 1, color: colors.inkStrong, fontSize: typography.body, fontWeight: "600" },
});
