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
    <View style={[styles.sidebar, { backgroundColor: '#0A0E14', borderRightColor: '#1A3A2A' }]}>
      {/* Logo area with image */}
      <View style={styles.logoArea}>
        <Image
          source={vetorHorizonLogo}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: '#1A3A2A' }]} />

      {/* Nav Items */}
      <View style={styles.navList}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.path || (item.path === '/' && pathname === '/(tabs)');
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && { backgroundColor: '#00E5FF' + '10', borderColor: '#00E5FF' + '30', borderWidth: 1 },
                !isActive && { borderWidth: 1, borderColor: 'transparent' },
              ]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={item.icon}
                size={20}
                color={isActive ? '#00E5FF' : '#6B8A7A'}
              />
              <Text style={[
                styles.navLabel,
                { color: isActive ? '#00E5FF' : '#6B8A7A', fontFamily: 'monospace' },
                isActive && styles.navLabelActive,
              ]}>
                {item.label}
              </Text>
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: '#00E5FF' }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.sidebarFooter}>
        <View style={[styles.divider, { backgroundColor: '#1A3A2A' }]} />
        <Text style={[styles.footerText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>ICAPT v5</Text>
        <Text style={[styles.footerText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>ISO 31000 | ISO 27001</Text>
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
    borderRadius: 6,
    gap: 12,
    position: 'relative',
  },
  navLabel: { fontSize: 13, fontWeight: '500', letterSpacing: 0.5 },
  navLabelActive: { fontWeight: '700' },
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
  footerText: { fontSize: 10, textAlign: 'center', marginTop: 4, letterSpacing: 1 },
});
