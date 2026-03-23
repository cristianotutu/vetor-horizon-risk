import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

interface TickerItem {
  id: string;
  text: string;
  level: "critical" | "high" | "medium" | "low";
}

interface TickerBarProps {
  items: TickerItem[];
  speed?: number;
}

const LEVEL_COLORS = {
  critical: "#FF3D3D",
  high: "#FF8C00",
  medium: "#FFD600",
  low: "#00FF88",
};

export function TickerBar({ items, speed = 40000 }: TickerBarProps) {
  const translateX = useSharedValue(0);

  const fullText = items.map((item) => `${item.text}`).join("   ●   ");
  const estimatedWidth = fullText.length * 8;

  useEffect(() => {
    translateX.value = 0;
    translateX.value = withRepeat(
      withTiming(-estimatedWidth, {
        duration: speed,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [items, speed, estimatedWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.liveIndicator}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <View style={styles.tickerWrapper}>
        <Animated.View style={[styles.tickerContent, animatedStyle]}>
          {/* Render twice for seamless loop */}
          {[0, 1].map((pass) => (
            <View key={pass} style={styles.tickerRow}>
              {items.map((item, index) => (
                <View key={`${pass}-${item.id}-${index}`} style={styles.tickerItem}>
                  <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[item.level] }]} />
                  <Text
                    style={[styles.tickerText, { color: LEVEL_COLORS[item.level] }]}
                    numberOfLines={1}
                  >
                    {item.text}
                  </Text>
                  {index < items.length - 1 && (
                    <Text style={styles.separator}>●</Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0E14",
    borderTopWidth: 1,
    borderTopColor: "#1A3A2A",
    height: 32,
    overflow: "hidden",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 5,
    backgroundColor: "#1A0505",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#3D0A0A",
    zIndex: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3D3D",
  },
  liveText: {
    color: "#FF3D3D",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  tickerWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  tickerContent: {
    flexDirection: "row",
  },
  tickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  tickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tickerText: {
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  separator: {
    color: "#1A3A2A",
    fontSize: 8,
    marginLeft: 8,
  },
});
