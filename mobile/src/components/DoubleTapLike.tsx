import { useRef, type PropsWithChildren } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

// Observe touches without intercepting native video controls or horizontal swipes.
export function DoubleTapLike({
  children,
  onLike,
  style,
}: PropsWithChildren<{ onLike: () => void; style?: StyleProp<ViewStyle> }>) {
  const lastTap = useRef(0),
    start = useRef({ x: 0, y: 0, time: 0 });
  return (
    <View
      style={style}
      onTouchStart={(event) => {
        start.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
          time: Date.now(),
        };
      }}
      onTouchCancel={() => {
        lastTap.current = 0;
      }}
      onTouchEnd={(event) => {
        const now = Date.now();
        if (
          Math.hypot(
            event.nativeEvent.pageX - start.current.x,
            event.nativeEvent.pageY - start.current.y,
          ) > 18 ||
          now - start.current.time > 250
        ) {
          lastTap.current = 0;
          return;
        }
        if (lastTap.current && now - lastTap.current < 300) {
          lastTap.current = 0;
          onLike();
        } else lastTap.current = now;
      }}
    >
      {children}
    </View>
  );
}
