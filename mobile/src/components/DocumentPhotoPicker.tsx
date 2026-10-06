import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { uploadMobileImage, type MobileSubmittedDocument } from "../api";
import { LocalizedText as Text } from "../i18n";
import { colors } from "../theme";

export type DocumentPhotos = Record<string, MobileSubmittedDocument>;

// Documents in submission order; null while any requirement lacks a photo.
export const completeDocuments = (
  requirements: string[],
  photos: DocumentPhotos,
) =>
  requirements.every((requirement) => photos[requirement])
    ? requirements.map((requirement) => photos[requirement])
    : null;

export function DocumentPhotoPicker({
  requirements,
  photos,
  onChange,
  onAction,
  disabled,
}: {
  requirements: string[];
  photos: DocumentPhotos;
  onChange: (requirement: string, document: MobileSubmittedDocument) => void;
  onAction: (message: string) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState("");
  const pick = async (requirement: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onAction("Izin galeri dibutuhkan untuk memilih foto");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setUploading(requirement);
    try {
      const mime_type = asset.mimeType ?? "image/jpeg";
      const file_name = asset.fileName ?? "dokumen.jpg";
      const upload = await uploadMobileImage(
        asset.uri,
        mime_type,
        file_name,
        "documents",
      );
      onChange(requirement, { requirement, url: upload.url, file_name, mime_type });
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Upload foto gagal");
    } finally {
      setUploading("");
    }
  };
  return (
    <View style={styles.list}>
      {requirements.map((requirement) => {
        const done = photos[requirement];
        const busy = uploading === requirement;
        return (
          <View key={requirement} style={styles.row}>
            <Ionicons
              name={done ? "checkmark-circle" : "ellipse-outline"}
              size={18}
              color={done ? colors.sky600 : colors.muted}
            />
            <View style={styles.copy}>
              <Text style={styles.label}>{requirement}</Text>
              {done ? (
                <Text numberOfLines={1} style={styles.file}>
                  {done.file_name}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${done ? "Ganti" : "Pilih"} foto ${requirement}`}
              disabled={disabled || Boolean(uploading)}
              onPress={() => void pick(requirement)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {busy ? "Mengunggah…" : done ? "Ganti foto" : "Pilih foto"}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 7, marginTop: 3 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  copy: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: 12, lineHeight: 18 },
  file: { color: colors.muted, fontSize: 11 },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.sky100,
  },
  buttonText: { color: colors.sky600, fontSize: 12, fontWeight: "700" },
});
