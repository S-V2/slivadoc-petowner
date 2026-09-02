import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { askSlivaCare, REALTIME_API_URL, realtime, type AssistantMessage } from "../api";
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
    if (!visible||!owner||!pet||!REALTIME_API_URL) return;
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
      if(!REALTIME_API_URL){onAction("Layanan realtime belum dikonfigurasi untuk build ini");return}
      realtime.emit("chat:send", { conversationId: `care-${pet.id}`, body }, (result: { ok: boolean; error?: string }) => {
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
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.page}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}><View style={styles.header}><View style={styles.avatar}><Text>{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}</Text><View style={[styles.dot, connected && styles.dotOnline]} /></View><View style={styles.headerCopy}><Text style={styles.name}>{mode === "assistant" ? "SlivaCare Assistant" : "SlivaCare Team"}</Text><Text style={styles.status}>{mode === "assistant" ? "AI khusus topik hewan" : !REALTIME_API_URL ? "Realtime belum dikonfigurasi" : connected ? "Realtime • terhubung" : "Menghubungkan..."}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose} style={styles.iconButton}><Ionicons name="close" size={21} color={colors.text} /></Pressable></View><View style={styles.tabs}><Pressable onPress={() => setMode("assistant")} style={[styles.tab, mode === "assistant" && styles.activeTab]}><Text style={[styles.tabText, mode === "assistant" && styles.activeTabText]}>✦ AI Assistant</Text></Pressable><Pressable onPress={() => {if(!owner){onLogin();return}setMode("team")}} style={[styles.tab, mode === "team" && styles.activeTab]}><Text style={[styles.tabText, mode === "team" && styles.activeTabText]}>💬 Care Team</Text></Pressable></View><View style={styles.context}><Text style={styles.pet}>{pet?.icon||"🐾"}</Text><View style={styles.contextCopy}><Text style={styles.contextLabel}>KONSULTASI UNTUK</Text><Text numberOfLines={2} style={styles.contextName}>{pet?.name||"Pet kamu"} • {pet?.breed||"Login untuk pilih pet"}</Text></View><View style={styles.petOnly}><Text style={styles.petOnlyText}>PET ONLY</Text></View></View><ScrollView keyboardShouldPersistTaps="handled" ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={styles.messages}>{mode === "assistant" ? <View style={styles.scope}><Ionicons name="shield-checkmark" size={16} color={colors.sky600} /><Text style={styles.scopeText}>Pertanyaan di luar topik hewan otomatis ditolak. Jawaban bukan pengganti diagnosis dokter.</Text></View> : null}{activeMessages.map((item, index) => { const assistant = "role" in item ? item.role === "assistant" : item.senderId !== owner?.id; const content = "content" in item ? item.content : item.body; return <View key={("id" in item && item.id) || `${content}-${index}`} style={[styles.messageRow, !assistant && styles.messageRowMe]}>{assistant ? <Text style={styles.messageAvatar}>{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}</Text> : null}<View style={[styles.bubble, !assistant && styles.bubbleMe]}><Text style={[styles.messageText, !assistant && styles.messageTextMe]}>{content}</Text></View></View>;})}{loading ? <ActivityIndicator color={colors.sky600} style={styles.loader} /> : null}{mode === "assistant" ? <View style={styles.quick}><Pressable style={styles.quickButton} onPress={() => setMessage("Pet saya muntah, apa yang harus diperhatikan?")}><Text style={styles.quickText}>🩺 Konsultasi gejala</Text></Pressable><Pressable style={styles.quickButton} onPress={() => setMessage("Hewan saya sesak dan sangat lemas")}><Text style={styles.quickText}>🚑 Darurat</Text></Pressable></View> : null}</ScrollView><View style={styles.composer}><Pressable accessibilityRole="button" accessibilityLabel="Lampirkan foto" onPress={() => onAction("Pilih foto pendukung dari perangkat")} style={styles.attach}><Ionicons name="add" size={22} color={colors.muted} /></Pressable><TextInput value={message} onChangeText={setMessage} placeholder={mode === "assistant" ? "Tanya seputar hewan..." : "Pesan ke care team..."} placeholderTextColor="#8493A2" style={styles.input} onSubmitEditing={send} /><Pressable accessibilityRole="button" accessibilityLabel="Kirim pesan" disabled={loading} onPress={send} style={[styles.send,loading&&{opacity:.55}]}><Ionicons name="arrow-up" size={19} color={colors.white} /></Pressable></View></KeyboardAvoidingView></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white }, keyboard: { flex: 1 }, header: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line }, avatar: { position: "relative", width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint50 }, dot: { position: "absolute", right: -2, bottom: -2, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.white, backgroundColor: "#AAB6C0" }, dotOnline: { backgroundColor: colors.mint }, headerCopy: { minWidth:0,flex: 1 }, name: { color: colors.navy, fontSize: 17, fontWeight: "900" }, status: { marginTop: 3, color: colors.mint, fontSize: 13 }, iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, tabs: { flexDirection: "row", gap: 7, padding: 9, backgroundColor: colors.canvas }, tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 }, activeTab: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }, tabText: { color: colors.muted, fontSize: 14, fontWeight: "800" }, activeTabText: { color: colors.sky600 }, context: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingHorizontal: 16, backgroundColor: "#F7FBFD" }, pet: { width: 38, height: 38, borderRadius: 11, overflow: "hidden", backgroundColor: "#FFF0D8", fontSize: 26, textAlign: "center", lineHeight: 38 }, contextCopy: { minWidth:0,flex: 1 }, contextLabel: { color: colors.muted, fontSize: 11, fontWeight: "900" }, contextName: { marginTop: 3, color: colors.navy, fontSize: 14, lineHeight:19,fontWeight: "800" }, petOnly: { paddingHorizontal:7,paddingVertical:6, borderRadius: 8, backgroundColor: colors.mint50 }, petOnlyText: { color: colors.mint, fontSize: 11, fontWeight: "900" }, messages: { flexGrow: 1, padding: 17, paddingBottom:22,backgroundColor: colors.canvas }, scope: { flexDirection: "row", gap: 8, padding: 12, marginBottom: 11, borderRadius: 13, backgroundColor: colors.sky50 }, scopeText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 20 }, messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 7, marginTop: 11 }, messageRowMe: { justifyContent: "flex-end" }, messageAvatar: { width: 28, height: 28, borderRadius: 9, overflow: "hidden", backgroundColor: colors.mint50, textAlign: "center", lineHeight: 28 }, bubble: { maxWidth: "84%", padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 15, borderBottomLeftRadius: 4, backgroundColor: colors.white }, bubbleMe: { borderWidth: 0, borderBottomLeftRadius: 15, borderTopRightRadius: 4, backgroundColor: colors.sky500 }, messageText: { color: colors.text, fontSize: 15, lineHeight: 22 }, messageTextMe: { color: colors.white }, loader: { alignSelf: "flex-start", margin: 15 }, quick: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, paddingLeft: 35 }, quickButton:{minHeight:44,justifyContent:"center",paddingHorizontal:12,borderWidth:1,borderColor:colors.line,borderRadius:12,backgroundColor:colors.white},quickText:{color:colors.text,fontSize:13,fontWeight:"700"}, composer: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: colors.line }, attach: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#EFF4F7" }, input: { flex: 1, minHeight: 44, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 14, color: colors.text, fontSize: 15 }, send: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky500 }, loaderSpacer: { height: 5 },
});
