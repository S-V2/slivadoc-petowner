import { LocalizedPressable as Pressable } from "./LocalizedPressable";
/* eslint-disable jsx-a11y/alt-text */
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image,  StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { LocalizedText as Text } from "../i18n";
import type { WorldItem } from "../api";
import { colors } from "../theme";

function StoryVideo({
  uri,
  paused,
  ready,
  failed,
}: {
  uri: string;
  paused: boolean;
  ready: (value: boolean) => void;
  failed: () => void;
}) {
  const player = useVideoPlayer(uri, (video) => {
    video.loop = true;
  });
  useEffect(() => {
    const update = () => {
      ready(player.status === "readyToPlay");
      if (player.status === "error") failed();
    };
    update();
    const listener = player.addListener("statusChange", update);
    return () => listener.remove();
  }, [player, ready, failed]);
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [player, paused]);
  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="contain"
      surfaceType="textureView"
      style={styles.media}
    />
  );
}

export function PetHubStoryPlayer({
  story,
  next,
  previous,
  close,
}: {
  story: WorldItem;
  next: () => void;
  previous?: () => void;
  close: () => void;
}) {
  const [elapsed, setElapsed] = useState(0),
    [ready, setReady] = useState(false),
    [paused, setPaused] = useState(false),
    [held, setHeld] = useState(false),
    [failed, setFailed] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const mediaFailed = useCallback(() => setFailed(true), []);
  const elapsedRef = useRef(0),
    ended = useRef(false),
    complete = useRef(next);
  useEffect(() => {
    complete.current = next;
  }, [next]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!ready || paused || held || !foreground || failed || ended.current)
      return;
    let previousTime = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      elapsedRef.current = Math.min(
        30_000,
        elapsedRef.current + Math.max(0, now - previousTime),
      );
      previousTime = now;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= 30_000 && !ended.current) {
        ended.current = true;
        clearInterval(timer);
        complete.current();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [ready, paused, held, foreground, failed]);
  const uri = story.media_url || story.photo_url || "";
  const video =
    story.media_type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(uri);
  return (
    <View style={styles.viewer}>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 30,
          now: Math.floor(elapsed / 1000),
        }}
        accessibilityLabel="Waktu story"
      >
        <View style={[styles.progress, { width: `${elapsed / 300}%` }]} />
      </View>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.author}>{story.author_name || "Pet Parent"}</Text>
          <Text style={styles.meta}>
            {Math.ceil((30_000 - elapsed) / 1000)} detik ·{" "}
            {story.view_count ?? 0} penonton
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? "Lanjutkan story" : "Jeda story"}
          onPress={() => setPaused((value) => !value)}
          style={styles.icon}
        >
          <Ionicons
            name={paused ? "play" : "pause"}
            size={20}
            color={colors.white}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup story"
          onPress={close}
          style={styles.icon}
        >
          <Ionicons name="close" size={22} color={colors.white} />
        </Pressable>
      </View>
      <Pressable
        onPressIn={() => setHeld(true)}
        onPressOut={() => setHeld(false)}
        style={styles.mediaWrap}
        accessibilityLabel="Tahan story untuk jeda"
      >
        {video ? (
          <StoryVideo
            uri={uri}
            paused={paused || held || !foreground}
            ready={setReady}
            failed={mediaFailed}
          />
        ) : (
          <Image
            source={{ uri }}
            onLoad={() => setReady(true)}
            onError={mediaFailed}
            style={styles.media}
            resizeMode="contain"
          />
        )}
        {!ready || failed ? (
          <Text style={styles.loading}>
            {failed ? "Media belum dapat dimuat" : "Memuat story…"}
          </Text>
        ) : null}
      </Pressable>
      <Text style={styles.caption}>
        {story.content || story.description || ""}
      </Text>
      <View style={styles.navigation}>
        <Pressable
          disabled={!previous}
          onPress={previous}
          accessibilityRole="button"
          accessibilityLabel="Story sebelumnya"
          style={styles.icon}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={previous ? colors.white : colors.muted}
          />
        </Pressable>
        <Text style={styles.meta}>Tahan untuk jeda</Text>
        <Pressable
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel="Story berikutnya"
          style={styles.icon}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  viewer: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#102E45",
    gap: 12,
  },
  track: {
    height: 4,
    borderRadius: 4,
    backgroundColor: "#587080",
    overflow: "hidden",
  },
  progress: { height: "100%", backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  copy: { flex: 1 },
  author: { color: "#fff", fontSize: 16, fontWeight: "700" },
  meta: { color: "#d0e2ec", fontSize: 12 },
  icon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaWrap: {
    width: "100%",
    aspectRatio: 9 / 12,
    backgroundColor: "#081d2b",
    borderRadius: 16,
    overflow: "hidden",
  },
  media: { width: "100%", height: "100%" },
  loading: {
    position: "absolute",
    bottom: 18,
    left: 12,
    color: "#fff",
    fontSize: 13,
  },
  caption: { color: "#fff", fontSize: 14, lineHeight: 20 },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
