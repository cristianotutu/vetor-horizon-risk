import { StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

interface ScanLineProps {
  color?: string;
  height?: number;
}

/**
 * A subtle horizontal scan line that moves down the screen.
 * Adds a "monitoring" feel inspired by World Monitor.
 * Only renders on web for performance.
 */
export function ScanLine({ color = "#00FF8820", height = 2 }: ScanLineProps) {
  const translateY = useSharedValue(-10);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    translateY.value = withRepeat(
      withTiming(800, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, [translateY]);

  if (Platform.OS !== "web") return null;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.line,
        animStyle,
        {
          height,
          backgroundColor: color,
          shadowColor: color.replace(/[0-9a-f]{2}$/i, ""),
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 8,
        },
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  line: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
});
