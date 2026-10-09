import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import {  StyleSheet, View } from "react-native";

import { uploadMobileDocument, type MobileSubmittedDocument } from "../api";
import { LocalizedText as Text } from "../i18n";
import { colors } from "../theme";

export type DocumentPhotos = Record<string, MobileSubmittedDocument>;

// Documents in submission order; null while any requirement lacks a valid uploaded file.
export const completeDocuments = (
  requirements: string[],
  photos: DocumentPhotos,
) => {
  const documents = requirements.flatMap((requirement) => {
    const photo = photos[requirement];
    return photo?.url?.startsWith("https://") && photo.requirement === requirement && photo.file_name && ["application/pdf", "image/jpeg", "image/png"].includes(photo.mime_type) ? [photo] : [];
  });
  return documents.length === requirements.length ? documents : null;
};

export function DocumentPhotoPicker({
  requirements,
  photos,
  onChange,
  onAction,
  disabled,
  onUploadingChange,
}: {
  requirements: string[];
  photos: DocumentPhotos;
  onChange: (requirement: string, document: MobileSubmittedDocument) => void;
  onAction: (message: string) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState("");
  const pick = async (requirement: string) => {
    if (disabled || uploading) return;
    setUploading(requirement);
    onUploadingChange?.(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true, multiple: false });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      if (!asset.size || asset.size > 10 * 1024 * 1024) { onAction("Pilih berkas PDF, JPG, atau PNG maksimal 10 MB"); return; }
      const mime_type = asset.mimeType ?? (asset.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : asset.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
      const file_name = asset.name;
      const upload = await uploadMobileDocument(
        asset.uri,
        mime_type,
        file_name,
      );
      onChange(requirement, { requirement, url: upload.url, file_name, mime_type });
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Upload dokumen gagal");
    } finally {
      setUploading("");
      onUploadingChange?.(false);
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
              accessibilityLabel={`${done ? "Ganti" : "Pilih"} dokumen ${requirement}`}
              disabled={disabled || Boolean(uploading)}
              onPress={() => void pick(requirement)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {busy ? "Mengunggah…" : done ? "Ganti berkas" : "Pilih berkas"}
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
