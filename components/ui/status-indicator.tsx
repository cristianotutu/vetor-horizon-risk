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

interface StatusIndicatorProps {
  status: "active" | "monitoring" | "alert" | "offline";
  label?: string;
  showLabel?: boolean;
}

const STATUS_CONFIG = {
  active: { color: "#00FF88", label: "ATIVO" },
  monitoring: { color: "#00E5FF", label: "MONITORANDO" },
  alert: { color: "#FF3D3D", label: "ALERTA" },
  offline: { color: "#6B8A7A", label: "OFFLINE" },
};

export function StatusIndicator({ status, label, showLabel = true }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (status === "active" || status === "monitoring" || status === "alert") {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [status, pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.dotContainer}>
        <Animated.View
          style={[
            styles.pulseRing,
            pulseStyle,
            { backgroundColor: config.color + "40" },
          ]}
        />
        <View style={[styles.dot, { backgroundColor: config.color }]} />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>
          {label || config.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dotContainer: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
