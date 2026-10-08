import { Children, cloneElement, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, ScrollView, View, type GestureResponderEvent, type PressableProps, type ScrollViewProps } from "react-native";

/** Keep the active tab at the left edge of an overflowing rail; never scroll vertically. */
export function TabRail({ children, activeKey, ...props }: ScrollViewProps & { activeKey?: string }) {
  const rail = useRef<ScrollView>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; width: number }>>({});
  const [viewport, setViewport] = useState(0), [contentWidth, setContentWidth] = useState(0);
  const [selected, setSelected] = useState<string>(), [selectionVersion, setSelectionVersion] = useState(0);
  const [reduced, setReduced] = useState(true);
  const items: ReactNode[] = [];
  let initial: string | undefined;
  let end = { x: 0, width: 0 };
  Children.forEach(children, (child, index) => {
    if (!isValidElement<PressableProps>(child)) return;
    const key = String(child.key ?? index), position = positions[key];
    if (child.props.accessibilityState?.selected) initial = key;
    if (position && position.x + position.width > end.x + end.width) end = position;
    items.push(<View key={key} testID={`tab-rail-item-${key}`} onLayout={event => {
      const { x, width } = event.nativeEvent.layout;
      setPositions(current => current[key]?.x === x && current[key]?.width === width ? current : { ...current, [key]: { x, width } });
    }}>{cloneElement(child, { onPress: (event: GestureResponderEvent) => {
      setSelected(key); setSelectionVersion(value => value + 1);
      child.props.onPress?.(event);
    } })}</View>);
  });
  const selectedKey = activeKey ?? selected ?? initial;
  const target = selectedKey == null ? undefined : positions[selectedKey]?.x;
  const overflowing = end.x + end.width > viewport;
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { alive = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (target != null && overflowing) rail.current?.scrollTo({ x: Math.max(0, target - 4), animated: !reduced });
  }, [target, overflowing, viewport, contentWidth, selectedKey, selectionVersion, reduced]);
  return <ScrollView {...props} ref={rail} horizontal showsHorizontalScrollIndicator={false}
    onLayout={event => { setViewport(event.nativeEvent.layout.width); props.onLayout?.(event); }}
    onContentSizeChange={(width, height) => { setContentWidth(width); props.onContentSizeChange?.(width, height); }}>
    {items}
    {overflowing && <View style={{ width: Math.max(0, viewport - end.width), height: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>}
  </ScrollView>;
}
