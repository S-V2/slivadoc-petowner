import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { askSlivaCare, REALTIME_API_URL, realtime, type AssistantMessage, type MobileOwner } from "../api";
import type { PetView } from "../data";
import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../i18n";
import { colors, shadow } from "../theme";

type ChatContext = "care" | "support";
type Props = {
  visible: boolean;
  onClose: () => void;
  onAction: (message: string) => void;
  owner?: MobileOwner;
  pet?: PetView;
  onLogin: () => void;
  context?: ChatContext;
};
type TeamMessage = { id: string; senderId: string; senderName: string; body: string; createdAt: string };

export function SlivaCareModal({ visible, onClose, onAction, owner, pet, onLogin, context = "care" }: Props) {
  const [mode, setMode] = useState<"assistant" | "team">("assistant");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: "assistant", content: `Halo${owner?.full_name ? ` ${owner.full_name.split(" ")[0]}` : ""}! Saya SlivaCare Assistant. Saya hanya dapat membantu topik kesehatan, nutrisi, perilaku, dan perawatan hewan.` },
  ]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const supportMode = context === "support";
  const conversationId = supportMode ? (owner ? `support-${owner.id}` : "") : pet ? `care-${pet.id}` : "";

  useEffect(() => {
    if (!visible) return;
    setMode(supportMode ? "team" : "assistant");
    setMessage("");
  }, [supportMode, visible]);

  useEffect(() => {
    if (!visible || !owner || !conversationId || !REALTIME_API_URL) return;
    const join = () => { setConnected(true); realtime.emit("chat:join", { conversationId }); };
    const disconnect = () => setConnected(false);
    const history = (items: TeamMessage[]) => setTeamMessages(items);
    const incoming = (item: TeamMessage) => setTeamMessages((current) => current.some((existing) => existing.id === item.id) ? current : [...current, item]);
    realtime.on("connect", join);
    realtime.on("disconnect", disconnect);
    realtime.on("chat:history", history);
    realtime.on("chat:message", incoming);
    realtime.connect();
    if (realtime.connected) join();
    return () => {
      realtime.off("connect", join);
      realtime.off("disconnect", disconnect);
      realtime.off("chat:history", history);
      realtime.off("chat:message", incoming);
    };
  }, [conversationId, owner, visible]);

  const send = async () => {
    const body = message.trim();
    if (!body || loading) return;
    setMessage("");
    if (mode === "team") {
      if (!owner || (!supportMode && !pet)) { onLogin(); onAction("Login diperlukan untuk menghubungi tim Slivadoc"); return; }
      if (!REALTIME_API_URL) { onAction("Layanan realtime belum dikonfigurasi untuk build ini"); return; }
      realtime.emit("chat:send", { conversationId, body }, (result: { ok: boolean; error?: string }) => {
        if (!result?.ok) onAction(result?.error ?? "Pesan belum terkirim");
      });
      return;
    }
    const history = [...messages, { role: "user" as const, content: body }];
    setMessages(history);
    setLoading(true);
    try {
      const result = await askSlivaCare(body, messages, { userId: owner?.id, pet: pet ? { name: pet.name, species: "pet", breed: pet.breed, age: pet.age, weight: pet.weight } : undefined });
      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
      if (result.mode === "offline_dataset") onAction(result.notice || "Jawaban memakai dataset pet lokal Slivadoc");
    } catch (cause) {
      setMessages((current) => [...current, { role: "assistant", content: cause instanceof Error ? cause.message : "SlivaCare belum dapat menjawab" }]);
    } finally {
      setLoading(false);
    }
  };

  const activeMessages = mode === "assistant" ? messages : teamMessages;
  const teamName = supportMode ? "Customer Support" : "SlivaCare Team";
  const teamTab = supportMode ? "Customer Support" : "Care Team";
  const agentIcon = mode === "assistant" ? "sparkles" : supportMode ? "headset" : "medical";
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.page}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
          <View style={styles.header}>
            <View style={styles.avatar}><Ionicons name={agentIcon} size={19} color={colors.sky600}/><View style={[styles.dot, connected && styles.dotOnline]}/></View>
            <View style={styles.headerCopy}><Text style={styles.name}>{mode === "assistant" ? "SlivaCare Assistant" : teamName}</Text><Text style={styles.status}>{mode === "assistant" ? "AI khusus topik hewan" : !REALTIME_API_URL ? "Realtime belum dikonfigurasi" : connected ? "Realtime • terhubung" : "Menghubungkan..."}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose} style={styles.iconButton}><Ionicons name="close" size={21} color={colors.text}/></Pressable>
          </View>
          {!supportMode ? <View style={styles.tabs}><Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "assistant" }} onPress={() => setMode("assistant")} style={[styles.tab, mode === "assistant" && styles.activeTab]}><Ionicons name="sparkles-outline" size={15} color={mode === "assistant" ? colors.sky600 : colors.muted}/><Text style={[styles.tabText, mode === "assistant" && styles.activeTabText]}>AI Assistant</Text></Pressable><Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === "team" }} onPress={() => { if (!owner) { onLogin(); return; } setMode("team"); }} style={[styles.tab, mode === "team" && styles.activeTab]}><Ionicons name="chatbubbles-outline" size={15} color={mode === "team" ? colors.sky600 : colors.muted}/><Text style={[styles.tabText, mode === "team" && styles.activeTabText]}>{teamTab}</Text></Pressable></View> : null}
          <View style={styles.context}>
            <View style={styles.pet}><Ionicons name={supportMode ? "headset-outline" : "paw-outline"} size={20} color={supportMode ? colors.sky600 : colors.mint}/></View>
            <View style={styles.contextCopy}><Text style={styles.contextLabel}>{supportMode ? "PUSAT BANTUAN" : "KONSULTASI UNTUK"}</Text><Text numberOfLines={2} style={styles.contextName}>{supportMode ? "Akun, transaksi, dan bantuan penggunaan" : `${pet?.name || "Pet kamu"} • ${pet?.breed || "Login untuk pilih pet"}`}</Text></View>
            <View style={styles.petOnly}><Text style={styles.petOnlyText}>{supportMode ? "HUMAN TEAM" : "PET ONLY"}</Text></View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={styles.messages}>
            {mode === "assistant" ? <View style={styles.scope}><Ionicons name="shield-checkmark" size={16} color={colors.sky600}/><Text style={styles.scopeText}>Pertanyaan di luar topik hewan otomatis ditolak. Jawaban bukan pengganti diagnosis dokter.</Text></View> : supportMode ? <View style={styles.scope}><Ionicons name="headset-outline" size={16} color={colors.sky600}/><Text style={styles.scopeText}>Ceritakan kendalanya secara detail. Tim support akan membantu akun, booking, pembayaran, dan penggunaan aplikasi.</Text></View> : null}
            {activeMessages.map((item, index) => {
              const assistant = "role" in item ? item.role === "assistant" : item.senderId !== owner?.id;
              const content = "content" in item ? item.content : item.body;
              return <View key={("id" in item && item.id) || `${content}-${index}`} style={[styles.messageRow, !assistant && styles.messageRowMe]}>{assistant ? <View style={styles.messageAvatar}><Ionicons name={agentIcon} size={14} color={colors.sky600}/></View> : null}<View style={[styles.bubble, !assistant && styles.bubbleMe]}><Text style={[styles.messageText, !assistant && styles.messageTextMe]}>{content}</Text></View></View>;
            })}
            {loading ? <ActivityIndicator color={colors.sky600} style={styles.loader}/> : null}
            {mode === "assistant" ? <View style={styles.quick}><Pressable style={styles.quickButton} onPress={() => setMessage("Pet saya muntah, apa yang harus diperhatikan?")}><Ionicons name="medical-outline" size={15} color={colors.sky600}/><Text style={styles.quickText}>Konsultasi gejala</Text></Pressable><Pressable style={styles.quickButton} onPress={() => setMessage("Hewan saya sesak dan sangat lemas")}><Ionicons name="alert-circle-outline" size={15} color={colors.red}/><Text style={styles.quickText}>Darurat</Text></Pressable></View> : supportMode && !activeMessages.length ? <View style={styles.quick}><Pressable style={styles.quickButton} onPress={() => setMessage("Saya butuh bantuan terkait akun saya")}><Ionicons name="person-outline" size={15} color={colors.sky600}/><Text style={styles.quickText}>Masalah akun</Text></Pressable><Pressable style={styles.quickButton} onPress={() => setMessage("Saya butuh bantuan terkait booking atau pembayaran")}><Ionicons name="receipt-outline" size={15} color={colors.sky600}/><Text style={styles.quickText}>Booking & pembayaran</Text></Pressable></View> : null}
          </ScrollView>
          <View style={styles.composer}><Pressable accessibilityRole="button" accessibilityLabel="Lampirkan foto" onPress={() => onAction("Pilih foto pendukung dari perangkat")} style={styles.attach}><Ionicons name="add" size={22} color={colors.muted}/></Pressable><TextInput value={message} onChangeText={setMessage} placeholder={mode === "assistant" ? "Tanya seputar hewan..." : supportMode ? "Tulis kendalamu..." : "Pesan ke care team..."} placeholderTextColor={colors.muted} style={styles.input} onSubmitEditing={send}/><Pressable accessibilityRole="button" accessibilityLabel="Kirim pesan" disabled={loading} onPress={send} style={[styles.send, loading && styles.disabled]}><Ionicons name="arrow-up" size={19} color={colors.white}/></Pressable></View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas }, keyboard: { flex: 1 }, disabled: { opacity: 0.55 },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.sky100, backgroundColor: colors.white }, avatar: { position: "relative", width: 41, height: 41, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint50 }, dot: { position: "absolute", right: -2, bottom: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.white, backgroundColor: "#AAB6C0" }, dotOnline: { backgroundColor: colors.mint }, headerCopy: { minWidth: 0, flex: 1 }, name: { color: colors.navy, fontSize: 15, fontWeight: "900" }, status: { marginTop: 2, color: colors.mint, fontSize: 10 }, iconButton: { width: 40, height: 40, borderRadius: 15, borderWidth: 1, borderColor: colors.sky100, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  tabs: { flexDirection: "row", gap: 6, padding: 8, backgroundColor: colors.canvas }, tab: { flex: 1, minHeight: 40, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 14 }, activeTab: { borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, ...shadow }, tabText: { color: colors.muted, fontSize: 11, fontWeight: "800" }, activeTabText: { color: colors.sky600 },
  context: { flexDirection: "row", alignItems: "center", gap: 9, padding: 8, paddingHorizontal: 14, backgroundColor: "#F7FBFD" }, pet: { width: 35, height: 35, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.yellow50 }, contextCopy: { minWidth: 0, flex: 1 }, contextLabel: { color: colors.muted, fontSize: 9, fontWeight: "900" }, contextName: { marginTop: 2, color: colors.navy, fontSize: 11, lineHeight: 16, fontWeight: "800" }, petOnly: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.mint50 }, petOnlyText: { color: colors.mint, fontSize: 9, fontWeight: "900" },
  messages: { flexGrow: 1, padding: 14, paddingBottom: 18, backgroundColor: colors.canvas }, scope: { flexDirection: "row", gap: 7, padding: 11, marginBottom: 9, borderWidth: 1, borderColor: colors.sky100, borderRadius: 16, backgroundColor: colors.sky50 }, scopeText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 16 }, messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 9 }, messageRowMe: { justifyContent: "flex-end" }, messageAvatar: { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint50 }, bubble: { maxWidth: "84%", padding: 11, borderWidth: 1, borderColor: colors.sky100, borderRadius: 17, borderBottomLeftRadius: 5, backgroundColor: colors.white, ...shadow }, bubbleMe: { borderWidth: 0, borderBottomLeftRadius: 17, borderTopRightRadius: 5, backgroundColor: colors.sky600 }, messageText: { color: colors.text, fontSize: 13, lineHeight: 19 }, messageTextMe: { color: colors.white }, loader: { alignSelf: "flex-start", margin: 12 }, quick: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 11, paddingLeft: 31 }, quickButton: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: colors.sky100, borderRadius: 14, backgroundColor: colors.white }, quickText: { color: colors.text, fontSize: 10, fontWeight: "700" },
  composer: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.sky100, backgroundColor: colors.white }, attach: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 }, input: { flex: 1, minHeight: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 16, backgroundColor: colors.canvas, color: colors.text, fontSize: 13 }, send: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky600, ...shadow },
});
