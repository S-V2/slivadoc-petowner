import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { askSlivaCare, realtime, type AssistantMessage } from "../api";
import type { MobileOwner } from "../api";
import type { PetView } from "../data";
import { colors } from "../theme";

type Props = { visible: boolean; onClose: () => void; onAction: (message: string) => void;owner?:MobileOwner;pet?:PetView;onLogin:()=>void };
type TeamMessage = { id: string; senderId: string; senderName: string; body: string; createdAt: string };

export function SlivaCareModal({ visible, onClose, onAction,owner,pet,onLogin }: Props) {
  const [mode, setMode] = useState<"assistant" | "team">("assistant");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([{role:"assistant",content:`Halo${owner?.full_name?` ${owner.full_name.split(" ")[0]}`:""}! Saya SlivaCare Assistant. Saya hanya dapat membantu topik kesehatan, nutrisi, perilaku, dan perawatan hewan.`}]);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible||!owner||!pet) return;
    const join = () => { setConnected(true); realtime.emit("chat:join", { conversationId: `care-${pet.id}` }); };
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
  }, [visible,owner,pet]);

  const send = async () => {
    const body = message.trim();
    if (!body || loading) return;
    setMessage("");
    if (mode === "team") {
      if(!owner||!pet){onLogin();onAction("Login diperlukan untuk menghubungi care team");return}
      realtime.emit("chat:send", { conversationId: `care-${pet.id}`, senderId: owner.id, senderName: owner.full_name, body }, (result: { ok: boolean; error?: string }) => {
        if (!result?.ok) onAction(result?.error ?? "Pesan belum terkirim");
      });
      return;
    }
    const history = [...messages, { role: "user" as const, content: body }];
    setMessages(history);
    setLoading(true);
    try {
      const result = await askSlivaCare(body, messages,{userId:owner?.id,pet:pet?{name:pet.name,species:"pet",breed:pet.breed,age:pet.age,weight:pet.weight}:undefined});
      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
      if (result.mode === "offline_dataset") onAction(result.notice || "Jawaban memakai dataset pet lokal Slivadoc");
    } catch (cause) {
      setMessages((current) => [...current, { role: "assistant", content: cause instanceof Error ? cause.message : "SlivaCare belum dapat menjawab" }]);
    } finally { setLoading(false); }
  };

  const activeMessages = mode === "assistant" ? messages : teamMessages;
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.page}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}><View style={styles.header}><View style={styles.avatar}><Text>{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}</Text><View style={[styles.dot, connected && styles.dotOnline]} /></View><View style={styles.headerCopy}><Text style={styles.name}>{mode === "assistant" ? "SlivaCare Assistant" : "SlivaCare Team"}</Text><Text style={styles.status}>{mode === "assistant" ? "AI khusus topik hewan" : connected ? "Realtime • terhubung" : "Menghubungkan..."}</Text></View><Pressable onPress={onClose} style={styles.iconButton}><Ionicons name="close" size={20} color={colors.text} /></Pressable></View><View style={styles.tabs}><Pressable onPress={() => setMode("assistant")} style={[styles.tab, mode === "assistant" && styles.activeTab]}><Text style={[styles.tabText, mode === "assistant" && styles.activeTabText]}>✦ AI Assistant</Text></Pressable><Pressable onPress={() => {if(!owner){onLogin();return}setMode("team")}} style={[styles.tab, mode === "team" && styles.activeTab]}><Text style={[styles.tabText, mode === "team" && styles.activeTabText]}>💬 Care Team</Text></Pressable></View><View style={styles.context}><Text style={styles.pet}>{pet?.icon||"🐾"}</Text><View style={styles.contextCopy}><Text style={styles.contextLabel}>KONSULTASI UNTUK</Text><Text style={styles.contextName}>{pet?.name||"Pet kamu"} • {pet?.breed||"Login untuk pilih pet"}</Text></View><View style={styles.petOnly}><Text style={styles.petOnlyText}>PET ONLY</Text></View></View><ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={styles.messages}>{mode === "assistant" ? <View style={styles.scope}><Ionicons name="shield-checkmark" size={14} color={colors.sky600} /><Text style={styles.scopeText}>Pertanyaan di luar topik hewan otomatis ditolak. Jawaban bukan pengganti diagnosis dokter.</Text></View> : null}{activeMessages.map((item, index) => { const assistant = "role" in item ? item.role === "assistant" : item.senderId !== owner?.id; const content = "content" in item ? item.content : item.body; return <View key={("id" in item && item.id) || `${content}-${index}`} style={[styles.messageRow, !assistant && styles.messageRowMe]}>{assistant ? <Text style={styles.messageAvatar}>{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}</Text> : null}<View style={[styles.bubble, !assistant && styles.bubbleMe]}><Text style={[styles.messageText, !assistant && styles.messageTextMe]}>{content}</Text></View></View>;})}{loading ? <ActivityIndicator color={colors.sky600} style={styles.loader} /> : null}{mode === "assistant" ? <View style={styles.quick}><Pressable onPress={() => setMessage("Pet saya muntah, apa yang harus diperhatikan?")}><Text>🩺 Konsultasi gejala</Text></Pressable><Pressable onPress={() => setMessage("Hewan saya sesak dan sangat lemas")}><Text>🚑 Darurat</Text></Pressable></View> : null}</ScrollView><View style={styles.composer}><Pressable onPress={() => onAction("Pilih foto pendukung dari perangkat")} style={styles.attach}><Ionicons name="add" size={21} color={colors.muted} /></Pressable><TextInput value={message} onChangeText={setMessage} placeholder={mode === "assistant" ? "Tanya seputar hewan..." : "Pesan ke care team..."} placeholderTextColor="#9AA7B6" style={styles.input} onSubmitEditing={send} /><Pressable disabled={loading} onPress={send} style={[styles.send,loading&&{opacity:.55}]}><Ionicons name="arrow-up" size={18} color={colors.white} /></Pressable></View></KeyboardAvoidingView></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white }, keyboard: { flex: 1 }, header: { minHeight: 65, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.line }, avatar: { position: "relative", width: 41, height: 41, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint50 }, dot: { position: "absolute", right: -2, bottom: -2, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.white, backgroundColor: "#AAB6C0" }, dotOnline: { backgroundColor: colors.mint }, headerCopy: { flex: 1 }, name: { color: colors.navy, fontSize: 16, fontWeight: "900" }, status: { marginTop: 3, color: colors.mint, fontSize: 12 }, iconButton: { width: 35, height: 35, borderRadius: 11, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, tabs: { flexDirection: "row", gap: 6, padding: 8, backgroundColor: colors.canvas }, tab: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 10 }, activeTab: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }, tabText: { color: colors.muted, fontSize: 13, fontWeight: "800" }, activeTabText: { color: colors.sky600 }, context: { flexDirection: "row", alignItems: "center", gap: 9, padding: 9, paddingHorizontal: 14, backgroundColor: "#F7FBFD" }, pet: { width: 34, height: 34, borderRadius: 10, overflow: "hidden", backgroundColor: "#FFF0D8", fontSize: 24, textAlign: "center", lineHeight: 34 }, contextCopy: { flex: 1 }, contextLabel: { color: colors.muted, fontSize: 11, fontWeight: "900" }, contextName: { marginTop: 3, color: colors.navy, fontSize: 13, fontWeight: "800" }, petOnly: { padding: 5, borderRadius: 7, backgroundColor: colors.mint50 }, petOnlyText: { color: colors.mint, fontSize: 11, fontWeight: "900" }, messages: { flexGrow: 1, padding: 15, backgroundColor: colors.canvas }, scope: { flexDirection: "row", gap: 7, padding: 10, marginBottom: 10, borderRadius: 11, backgroundColor: colors.sky50 }, scopeText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 }, messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 10 }, messageRowMe: { justifyContent: "flex-end" }, messageAvatar: { width: 26, height: 26, borderRadius: 8, overflow: "hidden", backgroundColor: colors.mint50, textAlign: "center", lineHeight: 26 }, bubble: { maxWidth: "82%", padding: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 13, borderBottomLeftRadius: 4, backgroundColor: colors.white }, bubbleMe: { borderWidth: 0, borderBottomLeftRadius: 13, borderTopRightRadius: 4, backgroundColor: colors.sky500 }, messageText: { color: colors.text, fontSize: 14, lineHeight: 21 }, messageTextMe: { color: colors.white }, loader: { alignSelf: "flex-start", margin: 15 }, quick: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 13, paddingLeft: 32 }, composer: { minHeight: 65, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, borderTopWidth: 1, borderTopColor: colors.line }, attach: { width: 35, height: 35, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#EFF4F7" }, input: { flex: 1, height: 41, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 12, color: colors.text, fontSize: 14 }, send: { width: 35, height: 35, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky500 }, loaderSpacer: { height: 5 },
});
