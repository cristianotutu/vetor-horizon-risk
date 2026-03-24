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
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#0A0E14' }}>
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#00E5FF',
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarStyle: isDesktop
              ? { display: 'none' }
              : {
                  paddingTop: 8,
                  paddingBottom: bottomPadding,
                  height: tabBarHeight,
                  backgroundColor: '#0D1117',
                  borderTopColor: '#1A3A2A',
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
            name="evolution"
            options={{
              title: "Evolucao",
              tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.line.uptrend.xyaxis" color={color} />,
            }}
          />
          <Tabs.Screen
            name="strategic"
            options={{
              title: "Estrat\u00e9gico",
              tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="report"
            options={{
              title: "Relat\u00f3rio",
              tabBarIcon: ({ color }) => <IconSymbol size={24} name="doc.richtext" color={color} />,
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
