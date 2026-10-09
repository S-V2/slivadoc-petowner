import { useState } from "react";
import { View } from "react-native";
import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../i18n";
import { Card, PrimaryButton } from "./ui";
import { changeMobilePassword } from "../api";
import { validPassword } from "../../../shared/account-validation";
import { colors } from "../theme";

export function ChangePasswordForm({ onAction }: { onAction: (message: string) => void }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = Boolean(current) && validPassword(password) && current !== password && password === confirmation && !busy;
  async function submit() {
    if (!ready) return;
    setBusy(true); setError("");
    try {
      await changeMobilePassword(current, password);
      setCurrent(""); setPassword(""); setConfirmation("");
      onAction("Password berhasil diperbarui. Perangkat lain harus login kembali.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Password belum dapat diperbarui"); }
    finally { setBusy(false); }
  }
  return <Card style={{ padding: 16, gap: 12 }}>
    <Text>Password lama diperiksa sebelum perubahan disimpan. Semua kolom wajib diisi.</Text>
    {([
      ["Password lama", current, setCurrent, "current-password"],
      ["Password baru", password, setPassword, "new-password"],
      ["Konfirmasi password baru", confirmation, setConfirmation, "new-password"],
    ] as const).map(([label, value, change, autoComplete]) => <View key={label} style={{ gap: 6 }}><Text>{label} *</Text><TextInput accessibilityLabel={label} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={autoComplete} value={value} onChangeText={change} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, color: colors.navy }}/></View>)}
    <Text>Minimal 8 karakter: huruf, angka, dan simbol. Password baru harus berbeda dari password lama.</Text>
    {confirmation && confirmation !== password ? <Text style={{ color: colors.red }}>Konfirmasi password belum sama.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{error}</Text> : null}
    <PrimaryButton label={busy ? "Menyimpan…" : "Ubah password"} disabled={!ready} accessibilityState={{ disabled: !ready }} style={{ opacity: ready ? 1 : 0.45 }} onPress={() => void submit()}/>
  </Card>;
}
