import { useEffect, useState } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: any;
  textStyle?: any;
  prefix?: string;
  suffix?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "600" | "700" | "800";
}

export function AnimatedCounter({
  value,
  duration = 1200,
  style,
  textStyle,
  prefix = "",
  suffix = "",
  color = "#00FF88",
  fontSize = 36,
  fontWeight = "bold",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) });

    const startTime = Date.now();
    const startVal = 0;
    const endVal = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      <Text
        style={[
          styles.text,
          {
            color,
            fontSize,
            fontWeight,
            fontFamily: "monospace",
          },
          textStyle,
        ]}
      >
        {prefix}{displayValue}{suffix}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ["tabular-nums"],
  },
});
