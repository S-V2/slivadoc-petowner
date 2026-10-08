import { LocalizedPressable as Pressable } from "./LocalizedPressable";
/* eslint-disable jsx-a11y/alt-text */
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Image,

  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LocalizedText as Text } from "../i18n";
import { BoundedBottomSheet } from "./ui";

export function PetHubPhotos({
  urls,
  author,
  onDoubleTap,
  detail = false,
}: {
  urls: string[];
  author: string;
  onDoubleTap?: () => void;
  detail?: boolean;
}) {
  const [width, setWidth] = useState(300),
    [index, setIndex] = useState(0),
    [expanded, setExpanded] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [dragging, setDragging] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);
  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );
  useEffect(() => {
    const s = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => s.remove();
  }, []);
  useEffect(() => {
    if (!detail || urls.length < 2 || expanded || !foreground || dragging) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % urls.length),
      1000,
    );
    return () => clearInterval(timer);
  }, [urls.length, expanded, foreground, dragging, detail]);
  useEffect(() => {
    scroll.current?.scrollTo({
      x: (index % Math.max(1, urls.length)) * width,
      animated: true,
    });
  }, [index, width, urls.length]);
  function move(direction: number) {
    setIndex((current) => (current + direction + urls.length) % urls.length);
  }
  return (
    <>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.gallery}
      >
        {detail ? <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setDragging(true)}
          onScrollEndDrag={() => setDragging(false)}
          onMomentumScrollEnd={(e) => {
            setDragging(false);
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
        >
          {urls.map((uri, i) => (
            <Pressable
              key={uri}
              accessibilityLabel={`Perbesar foto ${i + 1} ${author}`}
              onPress={() => {
                setIndex(i);
                if (!onDoubleTap) {
                  setExpanded(true);
                  return;
                }
                const now = Date.now();
                if (tapTimer.current) clearTimeout(tapTimer.current);
                if (lastTap.current && now - lastTap.current < 300) {
                  lastTap.current = 0;
                  onDoubleTap();
                } else {
                  lastTap.current = now;
                  tapTimer.current = setTimeout(() => {
                    lastTap.current = 0;
                    setExpanded(true);
                  }, 300);
                }
              }}
            >
              <Image
                source={{ uri }}
                style={{ width, height: width / 1.3 }}
                resizeMode="contain"
              />
            </Pressable>
          ))}
        </ScrollView> : <Pressable accessibilityLabel={`Perbesar foto ${author}`} onPress={() => {
          setIndex(0);
          if (!onDoubleTap) { setExpanded(true); return; }
          const now = Date.now();
          if (tapTimer.current) clearTimeout(tapTimer.current);
          if (lastTap.current && now - lastTap.current < 300) { lastTap.current = 0; onDoubleTap(); }
          else { lastTap.current = now; tapTimer.current = setTimeout(() => { lastTap.current = 0; setExpanded(true); }, 300); }
        }}><Image source={{ uri: urls[0] }} accessibilityLabel={`Foto ${author}`} style={{ width, height: width / 1.3 }} resizeMode="contain"/></Pressable>}
        {detail && urls.length > 1 ? (
          <View style={styles.controls}>
            <Pressable
              accessibilityLabel="Foto sebelumnya"
              onPress={() => move(-1)}
              style={styles.button}
            >
              <Ionicons name="chevron-back" color="#fff" size={18} />
            </Pressable>
            <Text style={styles.count}>
              {(index % urls.length) + 1}/{urls.length}
            </Text>
            <Pressable
              accessibilityLabel="Foto berikutnya"
              onPress={() => move(1)}
              style={styles.button}
            >
              <Ionicons name="chevron-forward" color="#fff" size={18} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <BoundedBottomSheet
        visible={expanded}
        onClose={() => setExpanded(false)}
        maxHeight="85%"
      >
        <View style={styles.expanded}>
          <Pressable
            accessibilityLabel="Tutup galeri"
            onPress={() => setExpanded(false)}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color="#174d6b" />
          </Pressable>
          <Image
            source={{ uri: urls[index % urls.length] }}
            style={styles.fullPhoto}
            resizeMode="contain"
          />
          {urls.length > 1 && <View style={styles.controls}>
            <Pressable
              accessibilityLabel="Foto sebelumnya"
              onPress={() => move(-1)}
              style={styles.button}
            >
              <Ionicons name="chevron-back" color="#fff" size={18} />
            </Pressable>
            <Text style={styles.count}>
              {(index % urls.length) + 1}/{urls.length}
            </Text>
            <Pressable
              accessibilityLabel="Foto berikutnya"
              onPress={() => move(1)}
              style={styles.button}
            >
              <Ionicons name="chevron-forward" color="#fff" size={18} />
            </Pressable>
          </View>}
        </View>
      </BoundedBottomSheet>
    </>
  );
}
const styles = StyleSheet.create({
  gallery: { width: "100%", backgroundColor: "#eef8fd" },
  controls: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  count: {
    color: "#fff",
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#173d5a99",
    borderRadius: 8,
  },
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#173d5a99",
    borderRadius: 16,
  },
  expanded: { padding: 16 },
  fullPhoto: { height: 440, width: "100%" },
  close: { alignSelf: "flex-end", padding: 12 },
});
