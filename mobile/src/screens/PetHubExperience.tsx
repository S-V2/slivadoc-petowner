/* React Native Image uses accessibilityLabel instead of the web alt attribute. */
/* eslint-disable jsx-a11y/alt-text */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
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
  likeMobilePetHubPost,
  saveMobilePetHubPost,
  viewMobilePetHubStory,
  uploadMobileMedia,
  type MobileOwner,
  type MobilePetHubComment,
  type WorldItem,
} from "../api";
import {
  LocalizedText as Text,
  LocalizedTextInput as TextInput,
  useI18n,
} from "../i18n";
import { BoundedBottomSheet, PrimaryButton } from "../components/ui";
import { PetHubPhotos } from "../components/PetHubPhotos";
import { PetHubStoryPlayer } from "../components/PetHubStoryPlayer";
import { DoubleTapLike } from "../components/DoubleTapLike";
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

const formatAge = (value: string | undefined, language: "id" | "en") => {
  if (!value) return "baru saja";
  const minutes = Math.max(
    1,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440)
    return language === "id"
      ? `${Math.floor(minutes / 60)}j`
      : `${Math.floor(minutes / 60)}h`;
  return language === "id"
    ? `${Math.floor(minutes / 1440)}h`
    : `${Math.floor(minutes / 1440)}d`;
};

const mediaURL = (item: WorldItem) =>
  item.media_url || item.media_urls?.[0] || item.photo_url || "";
const isVideo = (item: WorldItem) =>
  item.post_type === "video" ||
  item.media_type === "video" ||
  item.mode === "video" ||
  /\.(mp4|mov|webm)(\?|$)/i.test(mediaURL(item));
const videoPoster = (url: string) => {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/"))
    return "";
  return url
    .replace("/upload/", "/upload/so_0,w_900,h_1100,c_fill/")
    .replace(/\.(mp4|mov|webm)(\?.*)?$/i, ".jpg$2");
};

function InlineVideo({
  uri,
  style,
}: {
  uri: string;
  style: StyleProp<ViewStyle>;
}) {
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
  const { language, t } = useI18n();
  const [activeTab, setActiveTab] = useState<"feed" | "reels">("feed");
  const [stories, setStories] = useState<WorldItem[]>([]);
  const [feed, setFeed] = useState<WorldItem[]>([]);
  const [reels, setReels] = useState<WorldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerMode, setComposerMode] = useState<ComposerMode>();
  const [caption, setCaption] = useState("");
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const asset = assets[0];
  const [publishing, setPublishing] = useState(false);
  const [story, setStory] = useState<WorldItem>();
  const [heartBurst, setHeartBurst] = useState("");
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (heartTimer.current) clearTimeout(heartTimer.current);
    },
    [],
  );
  const [commentPost, setCommentPost] = useState<WorldItem>();
  const [comments, setComments] = useState<MobilePetHubComment[]>([]);
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const commentPending = useRef(false);
  const publishPending = useRef(false);
  const likePending = useRef(new Set<string>());
  const savePending = useRef(new Set<string>());
  const commentSequence = useRef(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [storyResult, feedResult, reelResult] = await Promise.allSettled([
      getMobilePetHubStories(),
      getMobilePetHubFeed(),
      getMobilePetHubReels(),
    ]);
    setStories(
      storyResult.status === "fulfilled" ? storyResult.value.data : [],
    );
    setFeed(feedResult.status === "fulfilled" ? feedResult.value.data : []);
    setReels(reelResult.status === "fulfilled" ? reelResult.value.data : []);
    if (
      [storyResult, feedResult, reelResult].every(
        (result) => result.status === "rejected",
      )
    ) {
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
    setAssets([]);
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
      allowsMultipleSelection: composerMode === "feed",
      selectionLimit: 10,
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
      if (
        result.assets.length > 1 &&
        result.assets.some((item) => item.type === "video")
      ) {
        onAction("Pilih hingga 10 foto atau satu video");
        return;
      }
      setAssets(result.assets);
    }
  };

  const publish = async () => {
    if (!owner || !composerMode || !asset || publishPending.current) return;
    if (!hasPet) {
      onRequirePet();
      return;
    }
    if (composerMode !== "story" && caption.trim().length < 3) {
      onAction("Tambahkan caption minimal 3 karakter");
      return;
    }
    publishPending.current = true;
    setPublishing(true);
    try {
      const uploads = [];
      for (const asset of assets) {
        const mimeType =
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg");
        const upload = await uploadMobileMedia(
          asset.uri,
          mimeType,
          asset.fileName ||
            (asset.type === "video" ? "pethub-video.mp4" : "pethub-photo.jpg"),
          composerMode === "story" ? "pethub/stories" : "pethub/posts",
        );
        uploads.push(upload);
      }
      const upload = uploads[0];
      if (!upload) throw new Error("Media belum diunggah");
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
          media_urls: uploads.map((media) => media.url),
          post_type: upload.resourceType === "video" ? "video" : "photo",
        });
      }
      setComposerMode(undefined);
      setAssets([]);
      setCaption("");
      await load();
      onAction(
        composerMode === "story"
          ? "Story tayang selama 24 jam"
          : "Posting berhasil diterbitkan",
      );
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Media belum dapat diterbitkan",
      );
    } finally {
      publishPending.current = false;
      setPublishing(false);
    }
  };

  const toggleLike = async (item: WorldItem, ensureLiked = false) => {
    if (!owner) {
      onLogin();
      return;
    }
    if (!hasPet) {
      onRequirePet();
      return;
    }
    if (likePending.current.has(item.id)) return;
    const burst = () => {
      setHeartBurst(item.id);
      if (heartTimer.current) clearTimeout(heartTimer.current);
      heartTimer.current = setTimeout(() => setHeartBurst(""), 900);
    };
    if (ensureLiked && item.liked) {
      burst();
      return;
    }
    likePending.current.add(item.id);
    try {
      const result = await (ensureLiked
        ? likeMobilePetHubPost(item.id)
        : reactMobilePetHubPost(item.id));
      if (ensureLiked) burst();
      const update = (current: WorldItem[]) =>
        current.map((post) =>
          post.id === item.id
            ? {
                ...post,
                liked: result.liked,
                like_count: result.like_count,
              }
            : post,
        );
      setFeed(update);
      setReels(update);
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Like belum tersimpan");
    } finally {
      likePending.current.delete(item.id);
    }
  };

  const toggleSave = async (item: WorldItem) => {
    if (!owner) {
      onLogin();
      return;
    }
    if (!hasPet) {
      onRequirePet();
      return;
    }
    if (savePending.current.has(item.id)) return;
    savePending.current.add(item.id);
    try {
      const result = await saveMobilePetHubPost(item.id);
      const update = (current: WorldItem[]) =>
        current.map((post) =>
          post.id === item.id ? { ...post, saved: result.saved } : post,
        );
      setFeed(update);
      setReels(update);
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Posting belum dapat disimpan",
      );
    } finally {
      savePending.current.delete(item.id);
    }
  };
  const openStory = (item: WorldItem) => {
    setStory(item);
    if (owner)
      void viewMobilePetHubStory(item.id)
        .then((result) =>
          setStory((current) =>
            current?.id === item.id
              ? { ...current, view_count: result.view_count }
              : current,
          ),
        )
        .catch(() => onAction("Jumlah penonton story belum dapat diperbarui"));
  };
  const sharePost = async (item: WorldItem) => {
    const link = `https://slivadoc.com/?view=pethub&post=${encodeURIComponent(item.id)}`;
    try {
      await Share.share({
        title: "PetHub · Slivadoc",
        message: `${item.content || t("Momen dari PetHub Slivadoc")}\n${link}`,
      });
    } catch {
      onAction("Tautan konten belum dapat dibagikan");
    }
  };
  const openComments = async (item: WorldItem) => {
    const sequence = ++commentSequence.current;
    setCommentPost(item);
    setComments([]);
    setComment("");
    setCommentsError("");
    setCommentsLoading(true);
    try {
      const result = await getMobilePetHubComments(item.id);
      if (sequence === commentSequence.current) setComments(result.data);
    } catch (cause) {
      if (sequence === commentSequence.current)
        setCommentsError(
          cause instanceof Error
            ? cause.message
            : "Komentar belum dapat dimuat",
        );
    } finally {
      if (sequence === commentSequence.current) setCommentsLoading(false);
    }
  };

  const sendComment = async () => {
    if (!commentPost || comment.trim().length < 1 || commentPending.current)
      return;
    if (!owner) {
      onLogin();
      return;
    }
    if (!hasPet) {
      onRequirePet();
      return;
    }
    const sequence = commentSequence.current;
    commentPending.current = true;
    setCommentBusy(true);
    try {
      await commentMobilePetHubPost(commentPost.id, comment.trim());
      const result = await getMobilePetHubComments(commentPost.id);
      if (sequence === commentSequence.current) {
        setComments(result.data);
        setComment("");
      }
      setFeed((current) =>
        current.map((item) =>
          item.id === commentPost.id
            ? { ...item, comment_count: result.count }
            : item,
        ),
      );
      setReels((current) =>
        current.map((item) =>
          item.id === commentPost.id
            ? { ...item, comment_count: result.count }
            : item,
        ),
      );
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Komentar belum terkirim",
      );
    } finally {
      commentPending.current = false;
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buat story"
            onPress={() => beginComposer("story")}
            style={styles.iconButton}
          >
            <Ionicons name="add-circle-outline" size={21} color={colors.navy} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buat posting"
            onPress={() => beginComposer("feed")}
            style={styles.iconButton}
          >
            <Ionicons name="camera-outline" size={21} color={colors.navy} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storyRow}
      >
        <Pressable
          onPress={() => beginComposer("story")}
          style={styles.storyItem}
        >
          <View style={[styles.storyRing, styles.addStoryRing]}>
            <View style={styles.storyAvatar}>
              <Text style={styles.storyInitial}>
                {initials(owner?.full_name)}
              </Text>
            </View>
            <View style={styles.storyPlus}>
              <Ionicons name="add" size={12} color={colors.white} />
            </View>
          </View>
          <Text numberOfLines={1} style={styles.storyName}>
            Story kamu
          </Text>
        </Pressable>
        {stories.map((item) => {
          const url = mediaURL(item);
          const video = isVideo(item);
          const poster = video ? videoPoster(url) : url;
          return (
            <Pressable
              key={item.id}
              onPress={() => openStory(item)}
              style={styles.storyItem}
            >
              <View style={styles.storyRing}>
                {poster ? (
                  <Image
                    accessibilityLabel={`Story ${item.author_name || "pet parent"}`}
                    source={{ uri: poster }}
                    style={styles.storyImage}
                  />
                ) : (
                  <View style={styles.storyAvatar}>
                    <Text style={styles.storyInitial}>
                      {initials(item.author_name)}
                    </Text>
                  </View>
                )}
                {video ? (
                  <View style={styles.storyVideo}>
                    <Ionicons name="play" size={10} color={colors.white} />
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.storyName}>
                {item.author_name || "Pet Parent"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.tabBar}>
        {(["feed", "reels"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Ionicons
              name={tab === "feed" ? "grid-outline" : "play-circle-outline"}
              size={18}
              color={activeTab === tab ? colors.sky600 : colors.muted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab === "feed" ? "Feed" : "Reels"}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => beginComposer(activeTab === "reels" ? "reel" : "feed")}
          style={styles.quickCreate}
        >
          <Ionicons name="add" size={17} color={colors.white} />
          <Text style={styles.quickCreateText}>Buat</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.emptyText}>Memuat momen terbaru…</Text>
      ) : null}
      {!loading && visibleItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name={activeTab === "reels" ? "videocam-outline" : "images-outline"}
            size={32}
            color={colors.sky600}
          />
          <Text style={styles.emptyTitle}>
            {activeTab === "reels" ? "Belum ada reels" : "Feed masih sepi"}
          </Text>
          <Text style={styles.emptyText}>
            Jadi pet parent pertama yang berbagi momen di sini.
          </Text>
          <PrimaryButton
            compact
            label={activeTab === "reels" ? "Upload video" : "Buat posting"}
            onPress={() =>
              beginComposer(activeTab === "reels" ? "reel" : "feed")
            }
          />
        </View>
      ) : null}

      <View style={styles.feedList}>
        {visibleItems.map((item) => {
          const url = mediaURL(item);
          const video = isVideo(item);
          const poster = video ? videoPoster(url) : url;
          const itemLiked = Boolean(item.liked);
          return (
            <View
              key={item.id}
              style={[
                styles.postCard,
                activeTab === "reels" && styles.reelCard,
              ]}
            >
              <View style={styles.postHeader}>
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorInitial}>
                    {initials(item.author_name || item.channel_name)}
                  </Text>
                </View>
                <View style={styles.authorCopy}>
                  <View style={styles.authorLine}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.authorName,
                        activeTab === "reels" && styles.reelText,
                      ]}
                    >
                      {item.author_name || item.channel_name || "Pet Parent"}
                    </Text>
                    {item.verified ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={colors.sky600}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.authorMeta,
                      activeTab === "reels" && styles.reelText,
                    ]}
                  >
                    {item.channel_handle ? `@${item.channel_handle} · ` : ""}
                    {formatAge(item.created_at, language)}
                  </Text>
                </View>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={19}
                  color={colors.muted}
                />
              </View>
              {url ? (
                <View
                  style={[
                    styles.mediaWrap,
                    activeTab === "reels" && styles.reelMedia,
                  ]}
                >
                  {video ? (
                    <DoubleTapLike
                      onLike={() => void toggleLike(item, true)}
                      style={styles.media}
                    >
                      <InlineVideo uri={url} style={styles.media} />
                    </DoubleTapLike>
                  ) : poster ? (
                    <PetHubPhotos
                      urls={[...new Set([...(item.media_urls ?? []), url])]}
                      author={item.author_name || "pet parent"}
                      onDoubleTap={() => void toggleLike(item, true)}
                    />
                  ) : (
                    <View style={[styles.media, styles.videoFallback]}>
                      <Ionicons name="images" size={42} color={colors.white} />
                    </View>
                  )}
                  {heartBurst === item.id ? (
                    <View pointerEvents="none" style={styles.likeBurst}>
                      <Ionicons name="heart" size={86} color="#fff" />
                    </View>
                  ) : null}
                  {activeTab === "reels" ? (
                    <View style={styles.reelLabel}>
                      <Ionicons
                        name="sparkles"
                        size={12}
                        color={colors.white}
                      />
                      <Text style={styles.reelLabelText}>REELS</Text>
                    </View>
                  ) : null}
                  {activeTab === "reels" ? (
                    <>
                      <View style={styles.reelShade} pointerEvents="none" />
                      <View style={styles.reelActionRail}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Sukai reel"
                          onPress={() => void toggleLike(item)}
                          style={styles.reelAction}
                        >
                          <Ionicons
                            name={itemLiked ? "heart" : "heart-outline"}
                            size={28}
                            color={itemLiked ? colors.red : colors.white}
                          />
                          <Text style={styles.reelActionCount}>
                            {item.like_count ?? 0}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Komentar reel"
                          onPress={() => void openComments(item)}
                          style={styles.reelAction}
                        >
                          <Ionicons
                            name="chatbubble-outline"
                            size={26}
                            color={colors.white}
                          />
                          <Text style={styles.reelActionCount}>
                            {item.comment_count ?? 0}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Bagikan reel"
                          onPress={() => void sharePost(item)}
                          style={styles.reelAction}
                        >
                          <Ionicons
                            name="paper-plane-outline"
                            size={26}
                            color={colors.white}
                          />
                          <Text style={styles.reelActionCount}>Bagikan</Text>
                        </Pressable>
                      </View>
                      <View style={styles.reelCaption}>
                        <Text style={styles.reelAuthor}>
                          {item.author_name ||
                            item.channel_name ||
                            "Pet Parent"}
                        </Text>
                        <Text numberOfLines={3} style={styles.reelCaptionText}>
                          {item.content}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}
              {activeTab !== "reels" ? (
                <>
                  {item.content ? (
                    <Text style={styles.caption}>
                      <Text style={styles.captionAuthor}>
                        {item.author_name || "Pet Parent"}{" "}
                      </Text>
                      {item.content}
                    </Text>
                  ) : null}
                  <View style={styles.actions}>
                    <View style={styles.primaryActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Sukai posting"
                        onPress={() => void toggleLike(item)}
                        style={styles.actionButton}
                      >
                        <Ionicons
                          name={itemLiked ? "heart" : "heart-outline"}
                          size={23}
                          color={itemLiked ? colors.red : colors.navy}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Buka komentar"
                        onPress={() => void openComments(item)}
                        style={styles.actionButton}
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={21}
                          color={colors.navy}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Bagikan posting"
                        onPress={() => void sharePost(item)}
                        style={styles.actionButton}
                      >
                        <Ionicons
                          name="paper-plane-outline"
                          size={21}
                          color={colors.navy}
                        />
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Simpan posting"
                      onPress={() => void toggleSave(item)}
                      style={styles.actionButton}
                    >
                      <Ionicons
                        name={item.saved ? "bookmark" : "bookmark-outline"}
                        size={21}
                        color={colors.navy}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.countText}>
                    {item.like_count || 0} suka
                  </Text>
                  <Pressable onPress={() => void openComments(item)}>
                    <Text style={styles.commentLink}>
                      Lihat {item.comment_count || 0} komentar
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          );
        })}
      </View>

      <BoundedBottomSheet
        visible={Boolean(composerMode)}
        onClose={() => !publishing && setComposerMode(undefined)}
        maxHeight="86%"
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetKicker}>PETHUB CREATOR</Text>
              <Text style={styles.sheetTitle}>
                {composerMode === "story"
                  ? "Story baru"
                  : composerMode === "reel"
                    ? "Reel baru"
                    : "Posting baru"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              onPress={() => setComposerMode(undefined)}
              style={styles.sheetClose}
            >
              <Ionicons name="close" size={21} color={colors.navy} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => void pickMedia()}
              style={styles.mediaPicker}
            >
              {asset?.type === "image" ? (
                <Image
                  accessibilityLabel="Preview media"
                  source={{ uri: asset.uri }}
                  style={styles.preview}
                />
              ) : asset ? (
                <InlineVideo uri={asset.uri} style={styles.preview} />
              ) : (
                <>
                  <View style={styles.pickerIcon}>
                    <Ionicons
                      name={
                        composerMode === "reel"
                          ? "videocam-outline"
                          : "images-outline"
                      }
                      size={27}
                      color={colors.sky600}
                    />
                  </View>
                  <Text style={styles.pickerTitle}>
                    {composerMode === "reel"
                      ? "Pilih video maksimal 60 detik"
                      : "Pilih foto atau video"}
                  </Text>
                  <Text style={styles.pickerNote}>
                    Media akan disimpan aman di akun Slivadoc
                  </Text>
                </>
              )}
            </Pressable>
            {assets.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              >
                {assets.map((selectedAsset, index) => (
                  <Pressable
                    key={selectedAsset.uri}
                    disabled={publishing}
                    accessibilityLabel={`Hapus foto ${index + 1}`}
                    onPress={() =>
                      setAssets((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Image
                      source={{ uri: selectedAsset.uri }}
                      style={{ width: 76, height: 76, borderRadius: 10 }}
                    />
                    <Text style={styles.counter}>{index + 1} · Hapus</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <TextInput
              value={caption}
              accessibilityLabel="Caption PetHub"
              onChangeText={setCaption}
              multiline
              maxLength={composerMode === "story" ? 300 : 2200}
              editable={!publishing}
              placeholder={
                composerMode === "story"
                  ? "Tambah caption (opsional)…"
                  : "Tulis caption yang seru…"
              }
              placeholderTextColor={colors.muted}
              style={styles.captionInput}
            />
            <View style={styles.counterRow}>
              <Text style={styles.uploadNote}>
                {asset ? "Siap diunggah" : "Media wajib dipilih"}
              </Text>
              <Text style={styles.counter}>
                {caption.length}/{composerMode === "story" ? 300 : 2200} ·{" "}
                {assets.length} media
              </Text>
            </View>
            <PrimaryButton
              label={
                publishing
                  ? "Mengunggah media…"
                  : composerMode === "story"
                    ? "Bagikan story"
                    : "Terbitkan"
              }
              onPress={() => void publish()}
              disabled={publishing || !asset}
            />
          </ScrollView>
        </View>
      </BoundedBottomSheet>

      <BoundedBottomSheet
        visible={Boolean(story)}
        onClose={() => setStory(undefined)}
        maxHeight="84%"
      >
        {story ? (
          <PetHubStoryPlayer
            key={story.id}
            story={story}
            close={() => setStory(undefined)}
            next={() => {
              const index = stories.findIndex((item) => item.id === story.id);
              const nextStory = stories[index + 1];
              if (nextStory) openStory(nextStory);
              else setStory(undefined);
            }}
            previous={
              stories.findIndex((item) => item.id === story.id) > 0
                ? () => {
                    const index = stories.findIndex(
                      (item) => item.id === story.id,
                    );
                    const previousStory = stories[index - 1];
                    if (previousStory) openStory(previousStory);
                  }
                : undefined
            }
          />
        ) : null}
      </BoundedBottomSheet>

      <BoundedBottomSheet
        visible={Boolean(commentPost)}
        onClose={() => {
          commentSequence.current++;
          setCommentPost(undefined);
        }}
        maxHeight="84%"
      >
        <View style={styles.commentsSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Komentar</Text>
            <Pressable
              onPress={() => {
                commentSequence.current++;
                setCommentPost(undefined);
              }}
              accessibilityRole="button"
              accessibilityLabel="Tutup komentar"
              style={styles.sheetClose}
            >
              <Ionicons name="close" size={21} color={colors.navy} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.commentList}
          >
            {commentsLoading ? (
              <Text style={styles.emptyText}>Memuat komentar…</Text>
            ) : commentsError ? (
              <Text style={styles.emptyText}>{commentsError}</Text>
            ) : comments.length ? (
              comments.map((item) => (
                <View key={item.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.authorInitial}>
                      {initials(item.author_name)}
                    </Text>
                  </View>
                  <View style={styles.authorCopy}>
                    <Text style={styles.commentAuthor}>{item.author_name}</Text>
                    <Text style={styles.commentBody}>{item.content}</Text>
                    <Text style={styles.authorMeta}>
                      {formatAge(item.created_at, language)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                Belum ada komentar. Mulai obrolan yang baik.
              </Text>
            )}
          </ScrollView>
          <View style={styles.commentComposer}>
            <TextInput
              value={comment}
              accessibilityLabel="Komentar PetHub"
              onChangeText={setComment}
              editable={hasPet && !commentBusy}
              placeholder={
                !owner
                  ? "Login untuk berkomentar"
                  : hasPet
                    ? "Tambahkan komentar…"
                    : "Tambah pet untuk berkomentar"
              }
              placeholderTextColor={colors.muted}
              style={styles.commentInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                hasPet ? "Kirim komentar" : "Tambah pet untuk berkomentar"
              }
              disabled={commentBusy || (hasPet && !comment.trim())}
              onPress={() => (hasPet ? void sendComment() : onRequirePet())}
              style={styles.sendButton}
            >
              <Ionicons
                name={hasPet ? "arrow-up" : "lock-closed"}
                size={18}
                color={colors.white}
              />
            </Pressable>
          </View>
        </View>
      </BoundedBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  likeBurst: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#194560",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  brandRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: colors.navy,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  brandNote: { marginTop: 1, color: colors.muted, fontSize: 11 },
  brandActions: { flexDirection: "row", gap: 8 },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 15,
    backgroundColor: colors.white,
    ...shadow,
  },
  storyRow: { gap: 12, paddingVertical: 14, paddingRight: 16 },
  storyItem: { width: 68, alignItems: "center", gap: 5 },
  storyRing: {
    width: 62,
    height: 62,
    padding: 3,
    borderWidth: 2,
    borderColor: colors.sky500,
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  addStoryRing: { borderColor: colors.line },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: colors.sky50,
  },
  storyAvatar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.sky50,
  },
  storyInitial: { color: colors.sky600, fontSize: 14, fontWeight: "700" },
  storyPlus: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 21,
    height: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 11,
    backgroundColor: colors.sky600,
  },
  storyVideo: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "rgba(17,53,80,.72)",
  },
  storyName: {
    width: 68,
    color: colors.text,
    fontSize: 9,
    textAlign: "center",
  },
  tabBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 19,
    backgroundColor: colors.white,
    ...shadow,
  },
  tab: {
    minHeight: 40,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
  },
  activeTab: { backgroundColor: colors.sky50 },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  activeTabText: { color: colors.sky600 },
  quickCreate: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.sky600,
  },
  quickCreateText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  feedList: { gap: 14, marginTop: 14 },
  postCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 23,
    backgroundColor: colors.white,
    ...shadow,
  },
  reelCard: { backgroundColor: "#102E45", borderColor: "#20455F" },
  postHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.sky50,
  },
  authorInitial: { color: colors.sky600, fontSize: 10, fontWeight: "600" },
  authorCopy: { minWidth: 0, flex: 1 },
  authorLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  authorName: {
    maxWidth: "90%",
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700",
  },
  authorMeta: { marginTop: 2, color: colors.muted, fontSize: 9 },
  mediaWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: 1.3,
    backgroundColor: colors.sky50,
  },
  reelMedia: { aspectRatio: 9 / 16, backgroundColor: "#102E45" },
  reelText: { color: colors.white },
  reelShade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: "rgba(3,20,34,.5)",
  },
  reelActionRail: {
    position: "absolute",
    right: 10,
    bottom: 110,
    gap: 14,
    alignItems: "center",
  },
  reelAction: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  reelActionCount: { color: colors.white, fontSize: 11, fontWeight: "700" },
  reelCaption: {
    position: "absolute",
    bottom: 44,
    left: 14,
    right: 74,
    gap: 6,
  },
  reelAuthor: { color: colors.white, fontSize: 14, fontWeight: "700" },
  reelCaptionText: { color: colors.white, fontSize: 12, lineHeight: 18 },
  media: { width: "100%", height: "100%", resizeMode: "cover" },
  videoFallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#173F5D",
  },
  playButton: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.7)",
    borderRadius: 26,
    backgroundColor: "rgba(11,32,48,.58)",
  },
  reelLabel: {
    position: "absolute",
    left: 12,
    top: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(9,35,53,.68)",
  },
  reelLabelText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  actions: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  primaryActions: { flexDirection: "row", alignItems: "center" },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    paddingHorizontal: 12,
    color: colors.navy,
    fontSize: 11,
    fontWeight: "700",
  },
  caption: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  captionAuthor: { color: colors.navy, fontWeight: "700" },
  commentLink: {
    padding: 12,
    paddingTop: 5,
    color: colors.muted,
    fontSize: 10,
  },
  emptyCard: {
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 22,
    backgroundColor: colors.white,
    ...shadow,
  },
  emptyTitle: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  emptyText: {
    marginVertical: 12,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 14 },
  sheetHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetKicker: {
    color: colors.sky600,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
  },
  sheetTitle: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
  },
  sheetClose: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
  },
  mediaPicker: {
    minHeight: 190,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.sky400,
    borderRadius: 18,
    backgroundColor: colors.sky50,
  },
  pickerIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  pickerTitle: {
    marginTop: 10,
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  pickerNote: { marginTop: 3, color: colors.muted, fontSize: 10 },
  preview: { width: "100%", height: 210, borderRadius: 15 },
  videoHint: {
    maxWidth: 240,
    color: colors.white,
    fontSize: 11,
    textAlign: "center",
  },
  captionInput: {
    minHeight: 86,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: "top",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 9,
  },
  uploadNote: { color: colors.sky600, fontSize: 10, fontWeight: "600" },
  counter: { color: colors.muted, fontSize: 10 },
  storyViewer: { padding: 16, paddingTop: 4 },
  storyViewerMedia: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    aspectRatio: 0.8,
    borderRadius: 20,
    backgroundColor: colors.sky50,
  },
  storyViewerImage: { width: "100%", height: "100%", resizeMode: "cover" },
  storyCaption: {
    paddingTop: 10,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  commentsSheet: { minHeight: 360, paddingHorizontal: 16, paddingBottom: 12 },
  commentList: { maxHeight: 420 },
  commentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingVertical: 9,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.sky50,
  },
  commentAuthor: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  commentBody: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  commentComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  commentInput: {
    minHeight: 44,
    flex: 1,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    color: colors.text,
    fontSize: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.sky600,
  },
});
