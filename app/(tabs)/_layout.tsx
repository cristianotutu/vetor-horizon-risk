import { Tabs } from "expo-router";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { Sidebar, useIsDesktop } from "@/components/web-layout";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarStyle: isDesktop
              ? { display: 'none' }
              : {
                  paddingTop: 8,
                  paddingBottom: bottomPadding,
                  height: tabBarHeight,
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Dashboard",
              tabBarIcon: ({ color }) => <IconSymbol size={24} name="shield.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="risks"
            options={{
              title: "Riscos",
              tabBarIcon: ({ color }) => <IconSymbol size={24} name="list.bullet" color={color} />,
            }}
          />
          <Tabs.Screen
            name="tables"
            options={{
              title: "Tabelas",
              tabBarIcon: ({ color }) => <IconSymbol size={24} name="tablecells" color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Sobre",
              tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}
