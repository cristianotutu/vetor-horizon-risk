import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Image, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const vetorHorizonLogo = require("@/assets/images/vetor-horizon-logo.png");

const NAV_ITEMS = [
  { key: '/(tabs)', label: 'Dashboard', icon: 'shield.fill' as const, path: '/' },
  { key: '/(tabs)/risks', label: 'Riscos', icon: 'list.bullet' as const, path: '/risks' },
  { key: '/(tabs)/evolution', label: 'Evolucao', icon: 'chart.line.uptrend.xyaxis' as const, path: '/evolution' },
  { key: '/(tabs)/strategic', label: 'Estrat\u00e9gico', icon: 'chart.bar.fill' as const, path: '/strategic' },
  { key: '/(tabs)/tables', label: 'Tabelas', icon: 'tablecells' as const, path: '/tables' },
  { key: '/(tabs)/settings', label: 'Sobre', icon: 'gearshape.fill' as const, path: '/settings' },
];

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return width >= 768;
}

export function Sidebar() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  if (!isDesktop || Platform.OS !== 'web') return null;

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      {/* Logo area with image */}
      <View style={styles.logoArea}>
        <Image
          source={vetorHorizonLogo}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Nav Items */}
      <View style={styles.navList}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.path || (item.path === '/' && pathname === '/(tabs)');
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && { backgroundColor: colors.primary + '12' },
              ]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={item.icon}
                size={20}
                color={isActive ? colors.primary : colors.muted}
              />
              <Text style={[
                styles.navLabel,
                { color: isActive ? colors.primary : colors.muted },
                isActive && styles.navLabelActive,
              ]}>
                {item.label}
              </Text>
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.sidebarFooter}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.footerText, { color: colors.muted }]}>ICAPT v5</Text>
        <Text style={[styles.footerText, { color: colors.muted }]}>ISO 31000 | ISO 27001</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingTop: 12,
    paddingBottom: 16,
    justifyContent: 'flex-start',
  },
  logoArea: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  logoImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  divider: { height: 1, marginHorizontal: 16, marginVertical: 8 },
  navList: { paddingHorizontal: 12, gap: 2, flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 12,
    position: 'relative',
  },
  navLabel: { fontSize: 14, fontWeight: '500' },
  navLabelActive: { fontWeight: '600' },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  sidebarFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  footerText: { fontSize: 10, textAlign: 'center', marginTop: 4 },
});
