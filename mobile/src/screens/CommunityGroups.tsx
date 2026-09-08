/* React Native Image uses accessibilityLabel instead of the web alt attribute. */
/* eslint-disable jsx-a11y/alt-text */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createMobileCommunityGroup,
  getMobileCommunityGroupMessages,
  getMobileCommunityGroups,
  joinMobileCommunityGroup,
  sendMobileCommunityGroupMessage,
  type MobileCommunityGroup,
  type MobileCommunityGroupMessage,
  type MobileOwner,
} from "../api";
import { BoundedBottomSheet, PrimaryButton } from "../components/ui";
import { LocalizedText as Text, LocalizedTextInput as TextInput, useI18n } from "../i18n";
import { colors, shadow } from "../theme";

type Props = {
  owner?: MobileOwner;
  hasPet: boolean;
  refreshVersion: number;
  onLogin: () => void;
  onRequirePet: () => void;
  onAction: (message: string) => void;
};

const initials = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const messageTime = (value: string | undefined, locale: string) => {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export function CommunityGroups({
  owner,
  hasPet,
  refreshVersion,
  onLogin,
  onRequirePet,
  onAction,
}: Props) {
  const { locale } = useI18n();
  const [scope, setScope] = useState<"mine" | "discover">("mine");
  const [groups, setGroups] = useState<MobileCommunityGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [room, setRoom] = useState<MobileCommunityGroup>();
  const [joining, setJoining] = useState("");

  const load = useCallback(async () => {
    if (!owner) {
      setGroups([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getMobileCommunityGroups(scope);
      setGroups(result.data);
    } catch (cause) {
      setGroups([]);
      onAction(cause instanceof Error ? cause.message : "Grup belum dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, [onAction, owner, scope]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load, refreshVersion]);

  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups.filter((group) =>
      `${group.name} ${group.description} ${group.city}`.toLowerCase().includes(needle),
    );
  }, [groups, query]);

  const openGroup = async (group: MobileCommunityGroup) => {
    if (!owner) {
      onLogin();
      return;
    }
    if (!group.joined) return;
    setRoom(group);
  };

  const join = async (group: MobileCommunityGroup) => {
    if (!owner) {
      onLogin();
      return;
    }
    if (!hasPet) {
      onRequirePet();
      return;
    }
    setJoining(group.id);
    try {
      const result = await joinMobileCommunityGroup(group.id);
      onAction(result.message);
      await load();
      if (group.visibility === "public") setRoom({ ...group, joined: true, membership_status: "active" });
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Belum dapat bergabung");
    } finally {
      setJoining("");
    }
  };

  if (!owner) {
    return (
      <View style={styles.guestCard}>
        <View style={styles.guestIcon}><Ionicons name="chatbubbles-outline" size={28} color={colors.sky600} /></View>
        <Text style={styles.emptyTitle}>Chat grup khusus member</Text>
        <Text style={styles.emptyNote}>Masuk untuk melihat grup kamu, bergabung, membuat grup, dan mengirim pesan.</Text>
        <PrimaryButton compact label="Masuk ke Slivadoc" onPress={onLogin} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.groupHero}>
        <View style={styles.heroIcon}><Ionicons name="chatbubbles" size={23} color={colors.white} /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Obrolan grup</Text>
          <Text style={styles.heroNote}>Chat santai bersama pet parent. Tanpa telepon dan video call.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Buat grup" onPress={() => hasPet ? setCreateOpen(true) : onRequirePet()} style={styles.heroAdd}><Ionicons name={hasPet ? "add" : "lock-closed-outline"} size={21} color={colors.sky600} /></Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={17} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Cari nama atau topik grup" placeholderTextColor={colors.muted} style={styles.searchInput} />
      </View>

      <View style={styles.scopeTabs}>
        <Pressable onPress={() => setScope("mine")} style={[styles.scopeTab, scope === "mine" && styles.activeScope]}><Text style={[styles.scopeText, scope === "mine" && styles.activeScopeText]}>Chat saya</Text></Pressable>
        <Pressable onPress={() => setScope("discover")} style={[styles.scopeTab, scope === "discover" && styles.activeScope]}><Text style={[styles.scopeText, scope === "discover" && styles.activeScopeText]}>Temukan grup</Text></Pressable>
      </View>

      {loading ? <ActivityIndicator color={colors.sky600} style={styles.loader} /> : null}
      {!loading && visibleGroups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name={scope === "mine" ? "chatbox-ellipses-outline" : "people-outline"} size={30} color={colors.sky600} />
          <Text style={styles.emptyTitle}>{scope === "mine" ? "Belum ada chat grup" : "Grup belum ditemukan"}</Text>
          <Text style={styles.emptyNote}>{scope === "mine" ? "Buat grup sendiri atau temukan komunitas yang cocok." : "Coba kata pencarian lain atau buat grup baru."}</Text>
          <PrimaryButton compact label={scope === "mine" ? "Temukan grup" : "Buat grup"} onPress={() => scope === "mine" ? setScope("discover") : hasPet ? setCreateOpen(true) : onRequirePet()} />
        </View>
      ) : null}

      <View style={styles.groupList}>
        {visibleGroups.map((group) => (
          <Pressable key={group.id} onPress={() => void openGroup(group)} style={({ pressed }) => [styles.groupRow, pressed && styles.pressed]}>
            {group.cover_url ? <Image accessibilityLabel={`Foto grup ${group.name}`} source={{ uri: group.cover_url }} style={styles.groupAvatar} /> : <View style={[styles.groupAvatar, styles.groupInitial]}><Text style={styles.groupInitialText}>{initials(group.name)}</Text></View>}
            <View style={styles.groupCopy}>
              <View style={styles.groupNameRow}>
                <Text numberOfLines={1} style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupTime}>{messageTime(group.last_message_at, locale)}</Text>
              </View>
              <Text numberOfLines={1} style={styles.lastMessage}>{group.last_message ? `${group.last_sender_name ? `${group.last_sender_name}: ` : ""}${group.last_message}` : `${group.member_count} member · ${group.city || group.category}`}</Text>
              <View style={styles.groupMetaRow}>
                {group.owner ? <View style={styles.ownerBadge}><Ionicons name="shield-checkmark" size={10} color="#13856F" /><Text style={styles.ownerText}>Kamu admin</Text></View> : null}
                {group.visibility === "private" ? <Ionicons name="lock-closed" size={11} color={colors.muted} /> : null}
              </View>
            </View>
            {group.joined ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : <Pressable disabled={joining === group.id} onPress={(event) => { event.stopPropagation(); void join(group); }} style={styles.joinButton}><Text style={styles.joinText}>{joining === group.id ? "…" : group.visibility === "private" ? "Minta" : "Gabung"}</Text></Pressable>}
          </Pressable>
        ))}
      </View>

      <CreateGroupSheet visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={async (message) => { setCreateOpen(false); setScope("mine"); await load(); onAction(message); }} onAction={onAction} />
      <GroupRoom group={room} owner={owner} hasPet={hasPet} onClose={() => { setRoom(undefined); void load(); }} onRequirePet={onRequirePet} onAction={onAction} />
    </>
  );
}

function CreateGroupSheet({ visible, onClose, onCreated, onAction }: { visible: boolean; onClose: () => void; onCreated: (message: string) => Promise<void>; onAction: (message: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (name.trim().length < 3 || description.trim().length < 10) return;
    setBusy(true);
    try {
      const result = await createMobileCommunityGroup({ name: name.trim(), description: description.trim(), city: city.trim(), category: "general", visibility });
      setName("");
      setDescription("");
      setCity("");
      setVisibility("public");
      await onCreated(result.message);
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Grup belum dapat dibuat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BoundedBottomSheet visible={visible} onClose={onClose} maxHeight="84%">
      <View style={styles.sheetContent}>
        <View style={styles.sheetHeader}><View><Text style={styles.sheetKicker}>KOMUNITAS BARU</Text><Text style={styles.sheetTitle}>Buat grup kamu</Text></View><Pressable onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color={colors.navy} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.inputLabel}>Nama grup</Text><TextInput value={name} onChangeText={setName} maxLength={80} placeholder="Contoh: Corgi Jakarta" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.inputLabel}>Deskripsi</Text><TextInput value={description} onChangeText={setDescription} multiline maxLength={500} placeholder="Topik dan tujuan grup ini…" placeholderTextColor={colors.muted} style={[styles.input, styles.descriptionInput]} />
          <Text style={styles.inputLabel}>Kota (opsional)</Text><TextInput value={city} onChangeText={setCity} maxLength={100} placeholder="Jakarta" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.inputLabel}>Akses grup</Text><View style={styles.visibilityRow}>{(["public", "private"] as const).map((item) => <Pressable key={item} onPress={() => setVisibility(item)} style={[styles.visibility, visibility === item && styles.activeVisibility]}><Ionicons name={item === "public" ? "earth" : "lock-closed"} size={16} color={visibility === item ? colors.sky600 : colors.muted} /><Text style={[styles.visibilityText, visibility === item && styles.activeVisibilityText]}>{item === "public" ? "Publik" : "Perlu persetujuan"}</Text></Pressable>)}</View>
          <Text style={styles.safetyNote}><Ionicons name="shield-checkmark-outline" size={13} color={colors.sky600} /> Chat grup tidak menyediakan telepon atau video call.</Text>
          <PrimaryButton label={busy ? "Membuat grup…" : "Buat grup"} onPress={() => void submit()} disabled={busy || name.trim().length < 3 || description.trim().length < 10} />
        </ScrollView>
      </View>
    </BoundedBottomSheet>
  );
}

function GroupRoom({ group, owner, hasPet, onClose, onRequirePet, onAction }: { group?: MobileCommunityGroup; owner: MobileOwner; hasPet: boolean; onClose: () => void; onRequirePet: () => void; onAction: (message: string) => void }) {
  const { locale } = useI18n();
  const [messages, setMessages] = useState<MobileCommunityGroupMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async (silent = false) => {
    if (!group) return;
    try {
      const result = await getMobileCommunityGroupMessages(group.id);
      setMessages(result.data);
    } catch (cause) {
      if (!silent) onAction(cause instanceof Error ? cause.message : "Chat belum dapat dimuat");
    }
  }, [group, onAction]);

  useEffect(() => {
    if (!group) return;
    queueMicrotask(() => void loadMessages());
    const interval = setInterval(() => void loadMessages(true), 5000);
    return () => clearInterval(interval);
  }, [group, loadMessages]);

  const send = async () => {
    if (!group || !body.trim()) return;
    if (!hasPet) {
      onRequirePet();
      return;
    }
    setSending(true);
    try {
      await sendMobileCommunityGroupMessage(group.id, body.trim());
      setBody("");
      await loadMessages();
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Pesan belum terkirim");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={Boolean(group)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.roomPage}>
        {group ? <>
          <View style={styles.roomHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={onClose} style={styles.roomBack}><Ionicons name="arrow-back" size={22} color={colors.navy} /></Pressable>
            {group.cover_url ? <Image accessibilityLabel={`Foto grup ${group.name}`} source={{ uri: group.cover_url }} style={styles.roomAvatar} /> : <View style={[styles.roomAvatar, styles.groupInitial]}><Text style={styles.groupInitialText}>{initials(group.name)}</Text></View>}
            <View style={styles.roomCopy}><Text numberOfLines={1} style={styles.roomTitle}>{group.name}</Text><Text style={styles.roomStatus}>{group.member_count} member · chat saja</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Info grup" onPress={() => onAction(group.description)} style={styles.roomInfo}><Ionicons name="information-circle-outline" size={21} color={colors.navy} /></Pressable>
          </View>
          <ScrollView ref={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.messages}>
            <View style={styles.encryptionNote}><Ionicons name="lock-closed" size={11} color="#8B7123" /><Text style={styles.encryptionText}>Percakapan tersimpan aman di Slivadoc. Jangan bagikan data kontak pribadi.</Text></View>
            {messages.length ? messages.map((message) => <View key={message.id} style={[styles.bubbleWrap, message.mine && styles.myBubbleWrap]}><View style={[styles.bubble, message.mine && styles.myBubble]}>{!message.mine ? <Text style={styles.senderName}>{message.sender_name}</Text> : null}<Text style={styles.messageBody}>{message.body}</Text><Text style={styles.messageTime}>{messageTime(message.created_at, locale)}{message.mine ? "  ✓✓" : ""}</Text></View></View>) : <View style={styles.roomEmpty}><View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={24} color={colors.sky600}/></View><Text style={styles.emptyTitle}>Mulai percakapan</Text><Text style={styles.emptyNote}>Sapa member grup dengan pesan pertama yang ramah.</Text></View>}
          </ScrollView>
          <View style={styles.roomComposer}>
            <TextInput value={body} onChangeText={setBody} editable={hasPet && !sending} multiline maxLength={2000} placeholder={hasPet ? `Pesan sebagai ${owner.full_name.split(" ")[0]}…` : "Mode lihat saja — tambahkan pet untuk membalas"} placeholderTextColor={colors.muted} style={styles.roomInput} />
            <Pressable accessibilityRole="button" accessibilityLabel={hasPet ? "Kirim pesan" : "Tambah profil pet"} disabled={sending || (hasPet && !body.trim())} onPress={() => hasPet ? void send() : onRequirePet()} style={[styles.send, (!body.trim() || sending) && hasPet && styles.disabled]}><Ionicons name={hasPet ? "send" : "lock-closed"} size={18} color={colors.white} /></Pressable>
          </View>
        </> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  guestCard: { alignItems: "center", gap: 8, marginTop: 2, padding: 24, borderWidth: 1, borderColor: colors.sky100, borderRadius: 22, backgroundColor: colors.white, ...shadow },
  guestIcon: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.sky50 },
  groupHero: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15, borderRadius: 23, backgroundColor: colors.sky600, ...shadow },
  heroIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(255,255,255,.18)" },
  heroCopy: { minWidth: 0, flex: 1 },
  heroTitle: { color: colors.white, fontSize: 16, fontWeight: "700" },
  heroNote: { marginTop: 2, color: "rgba(255,255,255,.84)", fontSize: 10, lineHeight: 14 },
  heroAdd: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.white },
  searchWrap: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 17, backgroundColor: colors.white, ...shadow },
  searchInput: { minWidth: 0, flex: 1, color: colors.text, fontSize: 12 },
  scopeTabs: { flexDirection: "row", gap: 7, marginTop: 9 },
  scopeTab: { minHeight: 36, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.white },
  activeScope: { backgroundColor: colors.sky50 },
  scopeText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  activeScopeText: { color: colors.sky600 },
  loader: { marginVertical: 24 },
  groupList: { marginTop: 4 },
  groupRow: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 9, padding: 10, borderWidth: 1, borderColor: colors.sky100, borderRadius: 18, backgroundColor: colors.white, ...shadow },
  groupAvatar: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.sky50 },
  groupInitial: { alignItems: "center", justifyContent: "center" },
  groupInitialText: { color: colors.sky600, fontSize: 13, fontWeight: "700" },
  groupCopy: { minWidth: 0, flex: 1 },
  groupNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  groupName: { minWidth: 0, flex: 1, color: colors.navy, fontSize: 13, fontWeight: "700" },
  groupTime: { color: colors.muted, fontSize: 9 },
  lastMessage: { marginTop: 4, color: colors.muted, fontSize: 11, lineHeight: 15 },
  groupMetaRow: { minHeight: 16, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  ownerBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  ownerText: { color: "#13856F", fontSize: 9, fontWeight: "600" },
  joinButton: { minHeight: 34, justifyContent: "center", paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.sky50 },
  joinText: { color: colors.sky600, fontSize: 10, fontWeight: "600" },
  emptyCard: { alignItems: "center", gap: 7, marginTop: 12, padding: 22, borderWidth: 1, borderColor: colors.sky100, borderRadius: 22, backgroundColor: colors.white, ...shadow },
  emptyTitle: { color: colors.navy, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyNote: { maxWidth: 290, color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 14 },
  sheetHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetKicker: { color: colors.sky600, fontSize: 9, fontWeight: "600", letterSpacing: 1 },
  sheetTitle: { marginTop: 2, color: colors.navy, fontSize: 18, fontWeight: "700" },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  inputLabel: { marginTop: 10, marginBottom: 5, color: colors.navy, fontSize: 10, fontWeight: "600" },
  input: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 13, color: colors.text, fontSize: 12 },
  descriptionInput: { minHeight: 80, paddingTop: 11, textAlignVertical: "top" },
  visibilityRow: { flexDirection: "row", gap: 8 },
  visibility: { minHeight: 42, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  activeVisibility: { borderColor: colors.sky400, backgroundColor: colors.sky50 },
  visibilityText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  activeVisibilityText: { color: colors.sky600 },
  safetyNote: { marginVertical: 12, color: colors.muted, fontSize: 10, lineHeight: 15 },
  roomPage: { flex: 1, backgroundColor: "#EEF7F5" },
  roomHeader: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  roomBack: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  roomAvatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.sky50 },
  roomCopy: { minWidth: 0, flex: 1 },
  roomTitle: { color: colors.navy, fontSize: 14, fontWeight: "700" },
  roomStatus: { marginTop: 2, color: colors.muted, fontSize: 9 },
  roomInfo: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  messages: { flexGrow: 1, gap: 5, padding: 12, paddingBottom: 20 },
  encryptionNote: { alignSelf: "center", maxWidth: 300, flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8, padding: 8, borderRadius: 10, backgroundColor: colors.yellow50 },
  encryptionText: { flex: 1, color: "#8B7123", fontSize: 9, lineHeight: 13, textAlign: "center" },
  bubbleWrap: { alignItems: "flex-start" },
  myBubbleWrap: { alignItems: "flex-end" },
  bubble: { maxWidth: "84%", paddingHorizontal: 10, paddingTop: 8, paddingBottom: 5, borderRadius: 14, borderTopLeftRadius: 4, backgroundColor: colors.white, ...shadow },
  myBubble: { borderTopLeftRadius: 14, borderTopRightRadius: 4, backgroundColor: "#CFF4E7" },
  senderName: { marginBottom: 2, color: colors.sky600, fontSize: 9, fontWeight: "600" },
  messageBody: { color: colors.text, fontSize: 12, lineHeight: 18 },
  messageTime: { marginTop: 2, color: colors.muted, fontSize: 8, textAlign: "right" },
  roomEmpty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyIcon: { width: 52, height: 52, marginBottom: 10, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 },
  roomComposer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 8, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  roomInput: { maxHeight: 110, minHeight: 44, flex: 1, paddingHorizontal: 13, paddingVertical: Platform.OS === "ios" ? 12 : 8, borderWidth: 1, borderColor: colors.line, borderRadius: 18, color: colors.text, fontSize: 12 },
  send: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.sky600 },
  disabled: { opacity: 0.45 },
});
