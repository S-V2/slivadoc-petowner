/* React Native Image uses accessibilityLabel instead of the web alt attribute. */
/* eslint-disable jsx-a11y/alt-text */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  commentMobilePetHubPost,
  createMobilePetHubMediaPost,
  createMobilePetHubStory,
  getMobilePetHubComments,
  getMobilePetHubFeed,
  getMobilePetHubReels,
  getMobilePetHubStories,
  reactMobilePetHubPost,
  uploadMobileMedia,
  type MobileOwner,
  type MobilePetHubComment,
  type WorldItem,
} from "../api";
import { BoundedBottomSheet, PrimaryButton } from "../components/ui";
import { colors, shadow } from "../theme";

type ComposerMode = "story" | "feed" | "reel";

type Props = {
  refreshVersion: number;
  owner?: MobileOwner;
  hasPet: boolean;
  onLogin: () => void;
  onRequirePet: () => void;
  onAction: (message: string) => void;
};

const initials = (value?: string) =>
  (value || "Slivadoc")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatAge = (value?: string) => {
  if (!value) return "baru saja";
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}j`;
  return `${Math.floor(minutes / 1440)}h`;
};

const mediaURL = (item: WorldItem) => item.media_url || item.photo_url || "";
const isVideo = (item: WorldItem) =>
  item.post_type === "video" ||
  item.media_type === "video" ||
  item.mode === "video" ||
  /\.(mp4|mov|webm)(\?|$)/i.test(mediaURL(item));
const videoPoster = (url: string) => {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return "";
  return url
    .replace("/upload/", "/upload/so_0,w_900,h_1100,c_fill/")
    .replace(/\.(mp4|mov|webm)(\?.*)?$/i, ".jpg$2");
};

function InlineVideo({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="cover"
      surfaceType="textureView"
      style={style}
    />
  );
}

export function PetHubExperience({
  refreshVersion,
  owner,
  hasPet,
  onLogin,
  onRequirePet,
  onAction,
}: Props) {
  const [activeTab, setActiveTab] = useState<"feed" | "reels">("feed");
  const [stories, setStories] = useState<WorldItem[]>([]);
  const [feed, setFeed] = useState<WorldItem[]>([]);
  const [reels, setReels] = useState<WorldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerMode, setComposerMode] = useState<ComposerMode>();
  const [caption, setCaption] = useState("");
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset>();
  const [publishing, setPublishing] = useState(false);
  const [story, setStory] = useState<WorldItem>();
  const [commentPost, setCommentPost] = useState<WorldItem>();
  const [comments, setComments] = useState<MobilePetHubComment[]>([]);
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [storyResult, feedResult, reelResult] = await Promise.allSettled([
      getMobilePetHubStories(),
      getMobilePetHubFeed(),
      getMobilePetHubReels(),
    ]);
    setStories(storyResult.status === "fulfilled" ? storyResult.value.data : []);
    setFeed(feedResult.status === "fulfilled" ? feedResult.value.data : []);
    setReels(reelResult.status === "fulfilled" ? reelResult.value.data : []);
    if ([storyResult, feedResult, reelResult].every((result) => result.status === "rejected")) {
      onAction("PetHub belum dapat dimuat");
    }
    setLoading(false);
  }, [onAction]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load, refreshVersion]);

  const visibleItems = useMemo(
    () => (activeTab === "reels" ? reels : feed),
    [activeTab, feed, reels],
  );

  const beginComposer = (mode: ComposerMode) => {
    if (!owner) {
      onLogin();
      return;
    }
    if (!hasPet) {
      onRequirePet();
      return;
    }
    setAsset(undefined);
    setCaption("");
    setComposerMode(mode);
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onAction("Izinkan akses galeri untuk memilih foto atau video");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: composerMode === "reel" ? ["videos"] : ["images", "videos"],
      allowsEditing: false,
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      const selectedAsset = result.assets[0];
      if (
        selectedAsset.type === "video" &&
        selectedAsset.duration &&
        selectedAsset.duration > 60_000
      ) {
        onAction("Durasi video maksimal 60 detik");
        return;
      }
      setAsset(selectedAsset);
    }
  };

  const publish = async () => {
    if (!owner || !composerMode || !asset) return;
    if (!hasPet) {
      onRequirePet();
      return;
    }
    if (composerMode !== "story" && caption.trim().length < 3) {
      onAction("Tambahkan caption minimal 3 karakter");
      return;
    }
    setPublishing(true);
    try {
      const mimeType = asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg");
      const upload = await uploadMobileMedia(
        asset.uri,
        mimeType,
        asset.fileName || (asset.type === "video" ? "pethub-video.mp4" : "pethub-photo.jpg"),
        composerMode === "story" ? "pethub/stories" : "pethub/posts",
      );
      if (composerMode === "story") {
        await createMobilePetHubStory({
          media_url: upload.url,
          media_type: upload.resourceType,
          caption: caption.trim(),
        });
      } else {
        await createMobilePetHubMediaPost({
          content: caption.trim(),
          media_url: upload.url,
          post_type: upload.resourceType === "video" ? "video" : "photo",
        });
      }
      setComposerMode(undefined);
      setAsset(undefined);
      setCaption("");
      await load();
      onAction(composerMode === "story" ? "Story tayang selama 24 jam" : "Posting berhasil diterbitkan");
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Media belum dapat diterbitkan");
    } finally {
      setPublishing(false);
    }
  };

  const toggleLike = async (item: WorldItem) => {
    if (!owner) {
      onLogin();
      return;
    }
    if (!hasPet) {
      onRequirePet();
      return;
    }
    try {
      const result = await reactMobilePetHubPost(item.id);
      setLiked((current) =>
        result.liked
          ? [...new Set([...current, item.id])]
          : current.filter((id) => id !== item.id),
      );
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Like belum tersimpan");
    }
  };

  const openComments = async (item: WorldItem) => {
    setCommentPost(item);
    try {
      const result = await getMobilePetHubComments(item.id);
      setComments(result.data);
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Komentar belum dapat dimuat");
    }
  };

  const sendComment = async () => {
    if (!commentPost || comment.trim().length < 1) return;
    if (!owner) {
      onLogin();
      return;
    }
    if (!hasPet) {
      onRequirePet();
      return;
    }
    setCommentBusy(true);
    try {
      await commentMobilePetHubPost(commentPost.id, comment.trim());
      const result = await getMobilePetHubComments(commentPost.id);
      setComments(result.data);
      setComment("");
      setFeed((current) =>
        current.map((item) =>
          item.id === commentPost.id ? { ...item, comment_count: result.data.length } : item,
        ),
      );
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Komentar belum terkirim");
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <>
      <View style={styles.brandRow}>
        <View>
          <Text style={styles.brand}>PetHub</Text>
          <Text style={styles.brandNote}>Cerita nyata dari pet parent</Text>
        </View>
        <View style={styles.brandActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Buat story" onPress={() => beginComposer("story")} style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={21} color={colors.navy} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Buat posting" onPress={() => beginComposer("feed")} style={styles.iconButton}>
            <Ionicons name="camera-outline" size={21} color={colors.navy} />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
        <Pressable onPress={() => beginComposer("story")} style={styles.storyItem}>
          <View style={[styles.storyRing, styles.addStoryRing]}>
            <View style={styles.storyAvatar}><Text style={styles.storyInitial}>{initials(owner?.full_name)}</Text></View>
            <View style={styles.storyPlus}><Ionicons name="add" size={12} color={colors.white} /></View>
          </View>
          <Text numberOfLines={1} style={styles.storyName}>Story kamu</Text>
        </Pressable>
        {stories.map((item) => {
          const url = mediaURL(item);
          const video = isVideo(item);
          const poster = video ? videoPoster(url) : url;
          return (
            <Pressable key={item.id} onPress={() => setStory(item)} style={styles.storyItem}>
              <View style={styles.storyRing}>
                {poster ? <Image accessibilityLabel={`Story ${item.author_name || "pet parent"}`} source={{ uri: poster }} style={styles.storyImage} /> : <View style={styles.storyAvatar}><Text style={styles.storyInitial}>{initials(item.author_name)}</Text></View>}
                {video ? <View style={styles.storyVideo}><Ionicons name="play" size={10} color={colors.white} /></View> : null}
              </View>
              <Text numberOfLines={1} style={styles.storyName}>{item.author_name || "Pet Parent"}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.tabBar}>
        {(["feed", "reels"] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
            <Ionicons name={tab === "feed" ? "grid-outline" : "play-circle-outline"} size={18} color={activeTab === tab ? colors.sky600 : colors.muted} />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab === "feed" ? "Feed" : "Reels"}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => beginComposer(activeTab === "reels" ? "reel" : "feed")} style={styles.quickCreate}>
          <Ionicons name="add" size={17} color={colors.white} />
          <Text style={styles.quickCreateText}>Buat</Text>
        </Pressable>
      </View>

      {loading ? <Text style={styles.emptyText}>Memuat momen terbaru…</Text> : null}
      {!loading && visibleItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name={activeTab === "reels" ? "videocam-outline" : "images-outline"} size={32} color={colors.sky500} />
          <Text style={styles.emptyTitle}>{activeTab === "reels" ? "Belum ada reels" : "Feed masih sepi"}</Text>
          <Text style={styles.emptyText}>Jadi pet parent pertama yang berbagi momen di sini.</Text>
          <PrimaryButton compact label={activeTab === "reels" ? "Upload video" : "Buat posting"} onPress={() => beginComposer(activeTab === "reels" ? "reel" : "feed")} />
        </View>
      ) : null}

      <View style={styles.feedList}>
        {visibleItems.map((item) => {
          const url = mediaURL(item);
          const video = isVideo(item);
          const poster = video ? videoPoster(url) : url;
          const itemLiked = liked.includes(item.id);
          return (
            <View key={item.id} style={[styles.postCard, activeTab === "reels" && styles.reelCard]}>
              <View style={styles.postHeader}>
                <View style={styles.authorAvatar}><Text style={styles.authorInitial}>{initials(item.author_name || item.channel_name)}</Text></View>
                <View style={styles.authorCopy}>
                  <View style={styles.authorLine}>
                    <Text numberOfLines={1} style={styles.authorName}>{item.author_name || item.channel_name || "Pet Parent"}</Text>
                    {item.verified ? <Ionicons name="checkmark-circle" size={14} color={colors.sky500} /> : null}
                  </View>
                  <Text style={styles.authorMeta}>{item.channel_handle ? `@${item.channel_handle} · ` : ""}{formatAge(item.created_at)}</Text>
                </View>
                <Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} />
              </View>
              {url ? (
                <View style={[styles.mediaWrap, activeTab === "reels" && styles.reelMedia]}>
                  {video ? <InlineVideo uri={url} style={styles.media} /> : poster ? <Image accessibilityLabel={`Posting ${item.author_name || "pet parent"}`} source={{ uri: poster }} style={styles.media} /> : <View style={[styles.media, styles.videoFallback]}><Ionicons name="images" size={42} color={colors.white} /></View>}
                  {activeTab === "reels" ? <View style={styles.reelLabel}><Ionicons name="sparkles" size={12} color={colors.white} /><Text style={styles.reelLabelText}>REELS</Text></View> : null}
                </View>
              ) : null}
              <View style={styles.actions}>
                <View style={styles.primaryActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Sukai posting" onPress={() => void toggleLike(item)} style={styles.actionButton}><Ionicons name={itemLiked ? "heart" : "heart-outline"} size={23} color={itemLiked ? colors.red : colors.navy} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Buka komentar" onPress={() => void openComments(item)} style={styles.actionButton}><Ionicons name="chatbubble-outline" size={21} color={colors.navy} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Bagikan posting" onPress={() => void Share.share({ message: `${item.author_name || "Pet Parent"}: ${item.content || "Momen dari PetHub Slivadoc"}${url ? `\n${url}` : ""}` })} style={styles.actionButton}><Ionicons name="paper-plane-outline" size={21} color={colors.navy} /></Pressable>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Simpan posting" onPress={() => hasPet ? setSaved((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]) : onRequirePet()} style={styles.actionButton}><Ionicons name={saved.includes(item.id) ? "bookmark" : "bookmark-outline"} size={21} color={colors.navy} /></Pressable>
              </View>
              <Text style={styles.countText}>{(item.like_count || 0) + (itemLiked ? 1 : 0)} suka</Text>
              {item.content ? <Text style={styles.caption}><Text style={styles.captionAuthor}>{item.author_name || "Pet Parent"} </Text>{item.content}</Text> : null}
              <Pressable onPress={() => void openComments(item)}><Text style={styles.commentLink}>Lihat {item.comment_count || 0} komentar</Text></Pressable>
            </View>
          );
        })}
      </View>

      <BoundedBottomSheet visible={Boolean(composerMode)} onClose={() => !publishing && setComposerMode(undefined)} maxHeight="86%">
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View><Text style={styles.sheetKicker}>PETHUB CREATOR</Text><Text style={styles.sheetTitle}>{composerMode === "story" ? "Story baru" : composerMode === "reel" ? "Reel baru" : "Posting baru"}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={() => setComposerMode(undefined)} style={styles.sheetClose}><Ionicons name="close" size={21} color={colors.navy} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => void pickMedia()} style={styles.mediaPicker}>
              {asset?.type === "image" ? <Image accessibilityLabel="Preview media" source={{ uri: asset.uri }} style={styles.preview} /> : asset ? <InlineVideo uri={asset.uri} style={styles.preview} /> : <><View style={styles.pickerIcon}><Ionicons name={composerMode === "reel" ? "videocam-outline" : "images-outline"} size={27} color={colors.sky600} /></View><Text style={styles.pickerTitle}>{composerMode === "reel" ? "Pilih video maksimal 60 detik" : "Pilih foto atau video"}</Text><Text style={styles.pickerNote}>Media akan disimpan aman di akun Slivadoc</Text></>}
            </Pressable>
            <TextInput value={caption} onChangeText={setCaption} multiline maxLength={2200} placeholder={composerMode === "story" ? "Tambah caption (opsional)…" : "Tulis caption yang seru…"} placeholderTextColor={colors.muted} style={styles.captionInput} />
            <View style={styles.counterRow}><Text style={styles.uploadNote}>{asset ? "Siap diunggah" : "Media wajib dipilih"}</Text><Text style={styles.counter}>{caption.length}/2200</Text></View>
            <PrimaryButton label={publishing ? "Mengunggah media…" : composerMode === "story" ? "Bagikan story" : "Terbitkan"} onPress={() => void publish()} disabled={publishing || !asset} />
          </ScrollView>
        </View>
      </BoundedBottomSheet>

      <BoundedBottomSheet visible={Boolean(story)} onClose={() => setStory(undefined)} maxHeight="84%">
        {story ? <View style={styles.storyViewer}>
          <View style={styles.postHeader}><View style={styles.authorAvatar}><Text style={styles.authorInitial}>{initials(story.author_name)}</Text></View><View style={styles.authorCopy}><Text style={styles.authorName}>{story.author_name || "Pet Parent"}</Text><Text style={styles.authorMeta}>Story · {formatAge(story.created_at)}</Text></View><Pressable onPress={() => setStory(undefined)}><Ionicons name="close" size={22} color={colors.navy} /></Pressable></View>
          <View style={styles.storyViewerMedia}>
            {isVideo(story) ? <InlineVideo uri={mediaURL(story)} style={styles.storyViewerImage} /> : mediaURL(story) ? <Image accessibilityLabel={`Story ${story.author_name || "pet parent"}`} source={{ uri: mediaURL(story) }} style={styles.storyViewerImage} /> : <View style={[styles.storyViewerImage, styles.videoFallback]}><Ionicons name="images" size={46} color={colors.white} /></View>}
          </View>
          {story.content ? <Text style={styles.storyCaption}>{story.content}</Text> : null}
        </View> : null}
      </BoundedBottomSheet>

      <BoundedBottomSheet visible={Boolean(commentPost)} onClose={() => setCommentPost(undefined)} maxHeight="84%">
        <View style={styles.commentsSheet}>
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Komentar</Text><Pressable onPress={() => setCommentPost(undefined)} style={styles.sheetClose}><Ionicons name="close" size={21} color={colors.navy} /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.commentList}>
            {comments.length ? comments.map((item) => <View key={item.id} style={styles.commentItem}><View style={styles.commentAvatar}><Text style={styles.authorInitial}>{initials(item.author_name)}</Text></View><View style={styles.authorCopy}><Text style={styles.commentAuthor}>{item.author_name}</Text><Text style={styles.commentBody}>{item.content}</Text><Text style={styles.authorMeta}>{formatAge(item.created_at)}</Text></View></View>) : <Text style={styles.emptyText}>Belum ada komentar. Mulai obrolan yang baik.</Text>}
          </ScrollView>
          <View style={styles.commentComposer}><TextInput value={comment} onChangeText={setComment} editable={hasPet && !commentBusy} placeholder={!owner ? "Login untuk berkomentar" : hasPet ? "Tambahkan komentar…" : "Tambah pet untuk berkomentar"} placeholderTextColor={colors.muted} style={styles.commentInput} /><Pressable disabled={commentBusy || (hasPet && !comment.trim())} onPress={() => hasPet ? void sendComment() : onRequirePet()} style={styles.sendButton}><Ionicons name={hasPet ? "arrow-up" : "lock-closed"} size={18} color={colors.white} /></Pressable></View>
        </View>
      </BoundedBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  brandRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { color: colors.navy, fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.7 },
  brandNote: { marginTop: 1, color: colors.muted, fontSize: 11 },
  brandActions: { flexDirection: "row", gap: 8 },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white },
  storyRow: { gap: 12, paddingVertical: 14, paddingRight: 16 },
  storyItem: { width: 68, alignItems: "center", gap: 5 },
  storyRing: { width: 62, height: 62, padding: 3, borderWidth: 2, borderColor: colors.sky500, borderRadius: 22, backgroundColor: colors.white },
  addStoryRing: { borderColor: colors.line },
  storyImage: { width: "100%", height: "100%", borderRadius: 16, backgroundColor: colors.sky50 },
  storyAvatar: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.sky50 },
  storyInitial: { color: colors.sky600, fontSize: 14, fontWeight: "900" },
  storyPlus: { position: "absolute", right: -3, bottom: -3, width: 21, height: 21, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white, borderRadius: 11, backgroundColor: colors.sky500 },
  storyVideo: { position: "absolute", right: 4, bottom: 4, width: 18, height: 18, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: "rgba(17,53,80,.72)" },
  storyName: { width: 68, color: colors.text, fontSize: 9, textAlign: "center" },
  tabBar: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 8, padding: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: colors.white },
  tab: { minHeight: 40, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12 },
  activeTab: { backgroundColor: colors.sky50 },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  activeTabText: { color: colors.sky600 },
  quickCreate: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.sky500 },
  quickCreateText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  feedList: { gap: 12, marginTop: 12 },
  postCard: { overflow: "hidden", borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.white, ...shadow },
  reelCard: { backgroundColor: "#102E45", borderColor: "#20455F" },
  postHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12 },
  authorAvatar: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.sky50 },
  authorInitial: { color: colors.sky600, fontSize: 10, fontWeight: "900" },
  authorCopy: { minWidth: 0, flex: 1 },
  authorLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  authorName: { maxWidth: "90%", color: colors.navy, fontSize: 12, fontWeight: "900" },
  authorMeta: { marginTop: 2, color: colors.muted, fontSize: 9 },
  mediaWrap: { position: "relative", width: "100%", aspectRatio: 1, backgroundColor: colors.sky50 },
  reelMedia: { aspectRatio: 0.78 },
  media: { width: "100%", height: "100%", resizeMode: "cover" },
  videoFallback: { alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#173F5D" },
  playButton: { position: "absolute", left: "50%", top: "50%", width: 52, height: 52, marginLeft: -26, marginTop: -26, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.7)", borderRadius: 26, backgroundColor: "rgba(11,32,48,.58)" },
  reelLabel: { position: "absolute", left: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(9,35,53,.68)" },
  reelLabelText: { color: colors.white, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  actions: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  primaryActions: { flexDirection: "row", alignItems: "center" },
  actionButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  countText: { paddingHorizontal: 12, color: colors.navy, fontSize: 11, fontWeight: "900" },
  caption: { paddingHorizontal: 12, paddingTop: 5, color: colors.text, fontSize: 12, lineHeight: 18 },
  captionAuthor: { color: colors.navy, fontWeight: "900" },
  commentLink: { padding: 12, paddingTop: 5, color: colors.muted, fontSize: 10 },
  emptyCard: { alignItems: "center", gap: 7, marginTop: 12, padding: 24, borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.white },
  emptyTitle: { color: colors.navy, fontSize: 15, fontWeight: "900" },
  emptyText: { marginVertical: 12, color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 14 },
  sheetHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetKicker: { color: colors.sky600, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  sheetTitle: { marginTop: 2, color: colors.navy, fontSize: 18, lineHeight: 22, fontWeight: "900" },
  sheetClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  mediaPicker: { minHeight: 190, overflow: "hidden", alignItems: "center", justifyContent: "center", padding: 16, borderWidth: 1, borderStyle: "dashed", borderColor: colors.sky400, borderRadius: 18, backgroundColor: colors.sky50 },
  pickerIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.white },
  pickerTitle: { marginTop: 10, color: colors.navy, fontSize: 13, fontWeight: "900" },
  pickerNote: { marginTop: 3, color: colors.muted, fontSize: 10 },
  preview: { width: "100%", height: 210, borderRadius: 15 },
  videoHint: { maxWidth: 240, color: colors.white, fontSize: 11, textAlign: "center" },
  captionInput: { minHeight: 86, marginTop: 12, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 15, color: colors.text, fontSize: 13, lineHeight: 19, textAlignVertical: "top" },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 9 },
  uploadNote: { color: colors.sky600, fontSize: 10, fontWeight: "800" },
  counter: { color: colors.muted, fontSize: 10 },
  storyViewer: { padding: 16, paddingTop: 4 },
  storyViewerMedia: { position: "relative", overflow: "hidden", width: "100%", aspectRatio: 0.8, borderRadius: 20, backgroundColor: colors.sky50 },
  storyViewerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  storyCaption: { paddingTop: 10, color: colors.text, fontSize: 13, lineHeight: 19 },
  commentsSheet: { minHeight: 360, paddingHorizontal: 16, paddingBottom: 12 },
  commentList: { maxHeight: 420 },
  commentItem: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 9 },
  commentAvatar: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.sky50 },
  commentAuthor: { color: colors.navy, fontSize: 11, fontWeight: "900" },
  commentBody: { marginTop: 2, color: colors.text, fontSize: 12, lineHeight: 17 },
  commentComposer: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  commentInput: { minHeight: 44, flex: 1, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 14, color: colors.text, fontSize: 12 },
  sendButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.sky500 },
});
