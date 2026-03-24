import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

type BadgeLevel = "critical" | "high" | "medium" | "low";

interface PulsingBadgeProps {
  level: BadgeLevel;
  label?: string;
  count?: number;
  size?: "sm" | "md" | "lg";
  pulsing?: boolean;
}

const LEVEL_CONFIG: Record<BadgeLevel, { bg: string; text: string; glow: string; label: string }> = {
  critical: { bg: "#3D0A0A", text: "#FF3D3D", glow: "#FF3D3D", label: "CRITICAL" },
  high: { bg: "#3D2A0A", text: "#FF8C00", glow: "#FF8C00", label: "ALTO" },
  medium: { bg: "#3D3D0A", text: "#FFD600", glow: "#FFD600", label: "MÉDIO" },
  low: { bg: "#0A3D1A", text: "#00FF88", glow: "#00FF88", label: "BAIXO" },
};

const SIZE_CONFIG = {
  sm: { paddingH: 6, paddingV: 2, fontSize: 10, dotSize: 6 },
  md: { paddingH: 10, paddingV: 4, fontSize: 12, dotSize: 8 },
  lg: { paddingH: 14, paddingV: 6, fontSize: 14, dotSize: 10 },
};

export function PulsingBadge({ level, label, count, size = "md", pulsing = true }: PulsingBadgeProps) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.medium;
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const pulseScale = useSharedValue(1);
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (pulsing && (level === "critical" || level === "high")) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [pulsing, level, pulseScale, dotOpacity]);

  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: dotOpacity.value,
  }));

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
          borderColor: config.glow + "40",
          borderWidth: 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          dotAnimStyle,
          {
            width: sizeConfig.dotSize,
            height: sizeConfig.dotSize,
            borderRadius: sizeConfig.dotSize / 2,
            backgroundColor: config.glow,
          },
        ]}
      />
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: sizeConfig.fontSize,
          },
        ]}
      >
        {label || config.label}
      </Text>
      {count !== undefined && (
        <View style={[styles.countBadge, { backgroundColor: config.glow + "30" }]}>
          <Text style={[styles.countText, { color: config.text, fontSize: sizeConfig.fontSize - 1 }]}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    gap: 6,
  },
  dot: {
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  text: {
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  countBadge: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  countText: {
    fontWeight: "700",
    fontFamily: "monospace",
  },
});
