import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  createMobileCommunityComment,
  createMobileCommunityPost,
  getMobileCommunityComments,
  getMobileCommunityPosts,
  reactMobileCommunityPost,
  uploadMobileImage,
  type MobileCommunityComment,
  type MobileCommunityPost,
  type MobileOwner,
} from "../api";
import type { PetView } from "../data";
import { colors, shadow } from "../theme";
import { PrimaryButton, TopHeader, useAppSurface } from "../components/ui";

type Props = {
  refreshVersion: number;
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
  owner?: MobileOwner;
  pet?: PetView;
  onLogin: () => void;
};

export function CommunityScreen({
  refreshVersion,
  onAction,
  onOpenNotifications,
  owner,
  pet,
  onLogin,
}: Props) {
  const { bottomInset, refreshing, onRefresh } = useAppSurface();
  const [posts, setPosts] = useState<MobileCommunityPost[]>([]);
  const [composer, setComposer] = useState(false);
  const [activeTab, setActiveTab] = useState("Untuk Kamu");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MobileCommunityPost>();
  const [comments, setComments] = useState<MobileCommunityComment[]>([]);
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const tabMap: Record<string, string> = {
    "Untuk Kamu": "for_you",
    Mengikuti: "following",
    Grup: "groups",
    Adopsi: "adoption",
    "Lost & Found": "lost_found",
  };
  const load = async () => {
    setLoading(true);
    try {
      const result = await getMobileCommunityPosts(
        tabMap[activeTab] ?? "for_you",
      );
      setPosts(result.data);
    } catch (cause) {
      setPosts([]);
      onAction(
        cause instanceof Error ? cause.message : "Komunitas belum dapat dimuat",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [activeTab, refreshVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const like = async (post: MobileCommunityPost) => {
    if (!owner) {
      onLogin();
      return;
    }
    try {
      const updated = await reactMobileCommunityPost(post.id);
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, liked: updated.liked, like_count: updated.like_count }
            : item,
        ),
      );
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Like belum tersimpan");
    }
  };
  async function openComments(post: MobileCommunityPost) {
    setSelected(post);
    try {
      const result = await getMobileCommunityComments(post.id);
      setComments(result.data);
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Komentar belum dapat dimuat",
      );
    }
  }
  async function sendComment() {
    if (!selected || comment.trim().length < 2) return;
    if (!owner) {
      onLogin();
      return;
    }
    setCommentBusy(true);
    try {
      await createMobileCommunityComment(selected.id, comment.trim());
      const result = await getMobileCommunityComments(selected.id);
      setComments(result.data);
      setPosts((current) =>
        current.map((item) =>
          item.id === selected.id
            ? { ...item, comment_count: result.data.length }
            : item,
        ),
      );
      setComment("");
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Komentar belum terkirim",
      );
    } finally {
      setCommentBusy(false);
    }
  }
  const initials =
    owner?.full_name
      .split(" ")
      .map((value) => value[0])
      .slice(0, 2)
      .join("") || "IN";
  return (
    <View style={styles.page}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.sky500]}
            tintColor={colors.sky500}
            progressBackgroundColor={colors.white}
          />
        }
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomInset + 100 },
        ]}
      >
        <TopHeader
          title="Pet Parent Indonesia"
          subtitle="Slivadoc Community"
          onNotification={onOpenNotifications}
        />
        <View style={styles.titleRow}>
          <View>
          <Text style={styles.title}>Komunitas seru 🐾</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.online}>● </Text>Komunitas pet parent aktif
            </Text>
          </View>
          <Pressable
            onPress={() => (owner ? setComposer(true) : onLogin())}
            style={styles.create}
          >
            <Ionicons name="add" size={20} color={colors.white} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {["Untuk Kamu", "Mengikuti", "Grup", "Adopsi", "Lost & Found"].map(
            (item) => (
              <Pressable
                key={item}
                onPress={() => setActiveTab(item)}
                style={[styles.tab, activeTab === item && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === item && styles.activeTabText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ),
          )}
        </ScrollView>
        <Pressable
          onPress={() => (owner ? setComposer(true) : onLogin())}
          style={styles.prompt}
        >
          <View style={styles.user}>
            <Text style={styles.userText}>{initials}</Text>
          </View>
          <Text style={styles.promptText}>
            {owner
              ? `Bagikan cerita tentang ${pet?.name || "pet-mu"}...`
              : "Masuk untuk membuat posting dan komentar"}
          </Text>
          <Ionicons name="camera-outline" size={20} color={colors.sky600} />
        </Pressable>
        {loading ? (
          <Text style={styles.subtitle}>Memuat posting terbaru…</Text>
        ) : posts.length ? (
          posts.map((post) => (
            <View key={post.id} style={styles.post}>
              <View style={styles.postHeader}>
                <View style={styles.authorAvatar}>
                  <Text>{post.author_name.slice(0, 1)}</Text>
                </View>
                <View style={styles.authorCopy}>
                  <Text style={styles.author}>{post.author_name}</Text>
                  <Text style={styles.meta}>
                    {post.pet_name || post.group_name || "Slivadoc Community"} ·{" "}
                    {new Date(post.created_at).toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{post.category}</Text>
                </View>
              </View>
              <Text style={styles.body}>{post.body}</Text>
              {post.image_url ? (
                // React Native Image uses accessibilityLabel rather than HTML alt.
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image
                  accessibilityLabel={`Foto posting oleh ${post.author_name}`}
                  source={{ uri: post.image_url }}
                  style={styles.postImage}
                />
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => void like(post)}
                  style={styles.action}
                >
                  <Ionicons
                    name={post.liked ? "heart" : "heart-outline"}
                    size={19}
                    color={post.liked ? colors.red : colors.muted}
                  />
                  <Text style={styles.actionText}>{post.like_count}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void openComments(post)}
                  style={styles.action}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color={colors.muted}
                  />
                  <Text style={styles.actionText}>{post.comment_count}</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.subtitle}>
            Belum ada posting pada filter ini.
          </Text>
        )}
      </ScrollView>
      <Composer
        visible={composer}
        owner={owner}
        pet={pet}
        onClose={() => setComposer(false)}
        onCreated={() => {
          setComposer(false);
          void load();
        }}
        onAction={onAction}
      />
      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(undefined)}
      >
        <Pressable
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(14,32,55,.38)",
          }}
          onPress={() => setSelected(undefined)}
        >
          <SafeAreaView
            style={{
              maxHeight: "85%",
              padding: 18,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              backgroundColor: colors.white,
            }}
          >
            <Pressable onPress={(event) => event.stopPropagation()}>
              <View style={styles.composerHeader}>
                <Text style={styles.composerTitle}>Komentar</Text>
                <Pressable
                  onPress={() => setSelected(undefined)}
                  style={styles.close}
                >
                  <Ionicons name="close" size={21} />
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 360 }}
              >
                {comments.map((item) => (
                  <View key={item.id} style={styles.postHeader}>
                    <View style={styles.authorAvatar}>
                      <Text>{item.author_name[0]}</Text>
                    </View>
                    <View style={styles.authorCopy}>
                      <Text style={styles.author}>{item.author_name}</Text>
                      <Text style={styles.body}>{item.body}</Text>
                      <Text style={styles.meta}>
                        {new Date(item.created_at).toLocaleString("id-ID")}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.tools}>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder={
                    owner ? "Tulis komentar..." : "Login untuk berkomentar"
                  }
                  editable={Boolean(owner) && !commentBusy}
                  style={[
                    styles.input,
                    { minHeight: 48, flex: 1, marginTop: 0 },
                  ]}
                />
                <Pressable
                  disabled={commentBusy || comment.trim().length < 2}
                  onPress={() => void sendComment()}
                  style={styles.create}
                >
                  <Ionicons
                    name={commentBusy ? "hourglass" : "arrow-up"}
                    size={18}
                    color={colors.white}
                  />
                </Pressable>
              </View>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
}

function Composer({
  visible,
  owner,
  pet,
  onClose,
  onCreated,
  onAction,
}: {
  visible: boolean;
  owner?: MobileOwner;
  pet?: PetView;
  onClose: () => void;
  onCreated: () => void;
  onAction: (message: string) => void;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onAction("Izin galeri dibutuhkan untuk memilih foto");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0]);
  };
  const submit = async () => {
    if (body.trim().length < 3 || !owner) return;
    setLoading(true);
    try {
      const upload = photo
        ? await uploadMobileImage(
            photo.uri,
            photo.mimeType ?? "image/jpeg",
            photo.fileName ?? "community-photo.jpg",
            "community",
          )
        : undefined;
      await createMobileCommunityPost({
        pet_id: pet?.id,
        body: body.trim(),
        category: "story",
        image_url: upload?.url || "",
      });
      onCreated();
      setBody("");
      setPhoto(null);
      onAction("Posting berhasil diterbitkan");
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Posting gagal");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.composerPage}>
        <View style={styles.composerHeader}>
          <View>
            <Text style={styles.composerKicker}>SLIVADOC COMMUNITY</Text>
            <Text style={styles.composerTitle}>Posting baru</Text>
          </View>
          <Pressable onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={21} color={colors.text} />
          </Pressable>
        </View>
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={3000}
          autoFocus
          placeholder="Apa yang ingin kamu bagikan tentang hewanmu?"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Text style={styles.counter}>{body.length}/3000</Text>
        {photo ? (
          <View style={styles.previewWrap}>
            {/* React Native Image uses accessibilityLabel rather than HTML alt. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image
              accessibilityLabel="Preview foto posting"
              source={{ uri: photo.uri }}
              style={styles.preview}
            />
            <Pressable
              onPress={() => setPhoto(null)}
              style={styles.removePhoto}
            >
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.tools}>
          <Pressable onPress={pickPhoto} style={styles.tool}>
            <Ionicons name="camera-outline" size={20} color={colors.sky600} />
            <Text style={styles.toolText}>
              {photo ? "Ganti foto" : "Tambah foto"}
            </Text>
          </Pressable>
          <View style={styles.cloudinaryBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color={colors.mint}
            />
            <Text style={styles.toolText}>Upload aman</Text>
          </View>
        </View>
        <PrimaryButton
          label={loading ? "Mengunggah & menerbitkan..." : "Terbitkan posting"}
          onPress={submit}
          disabled={loading || body.trim().length < 3}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 16 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 7,
  },
  title: { color: colors.navy, fontSize: 22, lineHeight: 27, fontWeight: "900" },
  subtitle: { marginTop: 2, color: colors.muted, fontSize: 11, lineHeight: 16 },
  online: { color: colors.mint },
  offline: { color: colors.muted },
  create: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.sky500,
  },
  tabs: { gap: 6, paddingVertical: 12 },
  tab: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  activeTab: { borderColor: colors.sky500, backgroundColor: colors.sky500 },
  tabText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  activeTabText: { color: colors.white },
  prompt: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.white,
    ...shadow,
  },
  user: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.sky50,
  },
  userText: { color: colors.sky600, fontSize: 11, fontWeight: "900" },
  promptText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  post: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    backgroundColor: colors.white,
    ...shadow,
  },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  authorAvatar: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.mint50,
  },
  authorCopy: { minWidth: 0, flex: 1 },
  author: { color: colors.navy, fontSize: 12, fontWeight: "900" },
  meta: { marginTop: 2, color: colors.muted, fontSize: 9, lineHeight: 14 },
  tag: {
    maxWidth: 82,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: colors.sky50,
  },
  tagText: { color: colors.sky600, fontSize: 9, fontWeight: "800" },
  body: {
    marginVertical: 10,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  visual: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#E9F8FF",
  },
  postImage: {
    width: "100%",
    height: 190,
    borderRadius: 14,
    backgroundColor: colors.sky50,
  },
  visualEmoji: { fontSize: 60 },
  visualLabel: {
    marginTop: 9,
    color: colors.sky600,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  actions: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    paddingTop: 8,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: { color: colors.muted, fontSize: 10 },
  composerPage: { flex: 1, padding: 16, backgroundColor: colors.white },
  composerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  composerKicker: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  composerTitle: {
    marginTop: 3,
    color: colors.navy,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
  },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  input: {
    minHeight: 125,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  counter: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 12,
    textAlign: "right",
  },
  previewWrap: { position: "relative", marginTop: 12 },
  preview: { width: "100%", height: 170, borderRadius: 15 },
  removePhoto: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(12,38,61,.72)",
  },
  tools: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
    marginVertical: 12,
  },
  tool: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 11,
    backgroundColor: colors.sky50,
  },
  cloudinaryBadge: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 11,
    backgroundColor: colors.mint50,
  },
  toolText: { color: colors.text, fontSize: 13, fontWeight: "800" },
});
