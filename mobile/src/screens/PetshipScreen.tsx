import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LocalizedText as Text, LocalizedTextInput as Input } from "../i18n";
import { LocalizedPressable as Pressable } from "../components/LocalizedPressable";
import {
  mobilePetship,
  type MobilePetshipPlace,
  type MobilePetshipPresence,
} from "../api";
import type { PetView } from "../data";

export function PetshipScreen({
  pet,
  onRequirePet,
  onAction,
}: {
  pet?: PetView;
  onRequirePet: () => boolean;
  onAction: (message: string) => void;
}) {
  const [places, setPlaces] = useState<MobilePetshipPlace[]>([]);
  const [selected, setSelected] = useState<MobilePetshipPlace>();
  const [presences, setPresences] = useState<MobilePetshipPresence[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await mobilePetship.places();
      setPlaces(result.data);
      setSelected((previous) => previous ?? result.data[0]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Tempat belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    let active = true;
    setPresences([]);
    if (selected)
      mobilePetship
        .presences(selected.id)
        .then((result) => {
          if (active) setPresences(result.data);
        })
        .catch(() => {
          if (active)
            setError("Pawrents belum dapat dimuat. Tarik untuk mencoba lagi.");
        });
    return () => {
      active = false;
    };
  }, [selected]);
  useEffect(() => {
    if (!checkedIn) return;
    const timer = setInterval(
      () => void mobilePetship.heartbeat().catch(() => setCheckedIn(false)),
      60000,
    );
    return () => clearInterval(timer);
  }, [checkedIn]);
  async function checkInOut() {
    if (!onRequirePet() || !pet || !selected || busy) return;
    setBusy(true);
    try {
      const result = checkedIn
        ? await mobilePetship.checkOut()
        : await mobilePetship.checkIn(pet.id, selected.id);
      setCheckedIn(!checkedIn);
      onAction(result.message);
      await load();
      setPresences((await mobilePetship.presences(selected.id)).data);
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Check-in belum berhasil.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={s.page}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={s.hero}>
        <Ionicons name="paw-outline" size={34} color="#098abe" />
        <Text style={s.eyebrow}>PETSHIP · MEET & CONNECT</Text>
        <Text style={s.title}>Teman baru untuk anabulmu</Text>
        <Text style={s.body}>
          Pilih tempat yang sedang kamu kunjungi dan berkenalan dengan pawrents
          lain. Koordinat personalmu tidak ditampilkan.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy || !selected}
          onPress={() => void checkInOut()}
          style={[s.primary, (busy || !selected) && { opacity: 0.5 }]}
        >
          <Text style={s.primaryText}>
            {busy
              ? "Menyimpan…"
              : checkedIn
                ? "Check-out Petship"
                : "Check-in Petship"}
          </Text>
        </Pressable>
        <Text style={s.note}>
          {checkedIn
            ? "Check-in aktif. Kamu bisa check-out kapan saja."
            : "Kamu menentukan kapan ingin terlihat."}
        </Text>
      </View>
      <Text style={s.heading}>Tempat untuk bertemu</Text>
      <Input
        style={s.input}
        accessibilityLabel="Cari lokasi Petship"
        placeholder="Cari tempat atau kota…"
        value={query}
        onChangeText={setQuery}
      />
      {loading && !places.length ? <ActivityIndicator color="#098abe" /> : null}
      {error ? (
        <Text accessibilityRole="alert" style={s.body}>
          {error}
        </Text>
      ) : null}
      {places
        .filter((place) =>
          `${place.name} ${place.city}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .map((place) => (
          <Pressable
            key={place.id}
            accessibilityRole="button"
            accessibilityState={{ selected: selected?.id === place.id }}
            onPress={() => setSelected(place)}
            style={[s.place, selected?.id === place.id && s.active]}
          >
            <Ionicons name="location-outline" size={24} color="#098abe" />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.placeName}>{place.name}</Text>
              <Text style={s.body}>{place.city}</Text>
            </View>
            <Text style={s.note}>{place.active_petowners} aktif</Text>
          </Pressable>
        ))}
      {!loading && !places.length && (
        <Text style={s.body}>Belum ada lokasi Petship tersedia.</Text>
      )}
      <View style={s.panel}>
        <Text style={s.heading}>{selected?.name ?? "Pilih lokasi"}</Text>
        <Text style={s.note}>PAWRENTS LIVE</Text>
        {presences.length ? (
          presences.map((item) => (
            <View style={s.presence} key={item.id}>
              <Ionicons name="paw-outline" size={22} color="#098abe" />
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.placeName}>
                  {item.pet_name} · {item.owner_first_name}
                </Text>
                <Text style={s.body}>{item.message}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={s.body}>
            Belum ada pawrents aktif di tempat ini. Jadilah yang pertama
            check-in.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 20,
    gap: 16,
    paddingBottom: 110,
    backgroundColor: "#f5fbff",
  },
  hero: {
    padding: 24,
    gap: 14,
    borderRadius: 24,
    backgroundColor: "#e6f6ff",
    borderWidth: 1,
    borderColor: "#cceafa",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "800",
    color: "#087fad",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#193d56" },
  body: { fontSize: 14, lineHeight: 22, color: "#607d90" },
  primary: {
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#078bbe",
    alignItems: "center",
  },
  primaryText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  note: { fontSize: 12, lineHeight: 18, color: "#187da6" },
  heading: { fontSize: 20, fontWeight: "800", color: "#193d56" },
  input: {
    borderWidth: 1,
    borderColor: "#d3e8f5",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  place: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0edf6",
    backgroundColor: "#fff",
    borderRadius: 17,
  },
  active: { backgroundColor: "#eaf8ff", borderColor: "#33b3eb" },
  placeName: { fontSize: 15, fontWeight: "700", color: "#20475f" },
  panel: {
    padding: 22,
    gap: 14,
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d9edf9",
  },
  presence: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9f3fa",
  },
});
