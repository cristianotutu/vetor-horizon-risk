import { View, Pressable, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useColors } from "@/hooks/use-colors";

type GlowVariant = "default" | "critical" | "high" | "medium" | "low" | "success";

interface GlowCardProps {
  children: React.ReactNode;
  variant?: GlowVariant;
  onPress?: () => void;
  pulsing?: boolean;
  className?: string;
  style?: any;
}

const VARIANT_COLORS: Record<GlowVariant, { border: string; shadow: string }> = {
  default: { border: "#1A3A2A", shadow: "#00E5FF" },
  critical: { border: "#5C1A1A", shadow: "#FF3D3D" },
  high: { border: "#5C3A1A", shadow: "#FF8C00" },
  medium: { border: "#5C5C1A", shadow: "#FFD600" },
  low: { border: "#1A3A2A", shadow: "#00FF88" },
  success: { border: "#1A3A2A", shadow: "#00FF88" },
};

export function GlowCard({ children, variant = "default", onPress, pulsing = false, className, style }: GlowCardProps) {
  const colors = useColors();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (pulsing) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [pulsing, glowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const variantColors = VARIANT_COLORS[variant];

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 80 });
    opacity.value = withTiming(0.9, { duration: 80 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const cardContent = (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {/* Glow border effect */}
      {Platform.OS === "web" && (
        <Animated.View
          style={[
            styles.glowBorder,
            glowStyle,
            {
              borderColor: variantColors.shadow,
              shadowColor: variantColors.shadow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.innerCard,
          {
            backgroundColor: colors.surface,
            borderColor: variantColors.border,
          },
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ width: "100%" }}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
  },
  glowBorder: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 13,
    borderWidth: 1,
  },
  innerCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    overflow: "hidden",
  },
});
