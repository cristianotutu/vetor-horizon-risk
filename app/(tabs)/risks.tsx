import { FlatList, Text, View, TouchableOpacity, TextInput, StyleSheet, useWindowDimensions, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel, TIPOS_DE_RISCO } from "@/lib/models";
import type { Risk } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo, useCallback, useEffect} from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlowCard } from "@/components/ui/glow-card";
import { PulsingBadge } from "@/components/ui/pulsing-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useWizard } from "@/components/wizard-overlay";

const LEVEL_COLORS: Record<string, string> = {
  'Crítico': '#FF3D3D',
  'Alto': '#FF8C00',
  'Médio': '#FFD600',
  'Baixo': '#00FF88',
};

const BADGE_LEVEL_MAP: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  'Crítico': 'critical',
  'Alto': 'high',
  'Médio': 'medium',
  'Baixo': 'low',
};

export default function RisksScreen() {
  const { risks, loading } = useRisks();

  const { triggerWizard } = useWizard();
  useEffect(() => { triggerWizard('risks'); }, []);
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);

  const filteredRisks = useMemo(() => {
    let result = risks;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.descricaoRisco.toLowerCase().includes(q) ||
        r.fonteDeRisco.toLowerCase().includes(q) ||
        r.ameaca.toLowerCase().includes(q)
      );
    }
    if (filterType) {
      result = result.filter(r => r.tipoRisco === filterType);
    }
    if (filterLevel) {
      result = result.filter(r => getRiskLevel(r.riscoInerente).label === filterLevel);
    }
    return result.sort((a, b) => b.gutScore - a.gutScore);
  }, [risks, search, filterType, filterLevel]);

  const renderDesktopTable = () => (
    <View style={[styles.tableCard, { backgroundColor: '#0D1117', borderColor: '#1A3A2A' }]}>
      <View style={[styles.tableHeaderRow, { borderBottomColor: '#1A3A2A', backgroundColor: '#111820' }]}>
        <Text style={[styles.thCell, styles.thId, { color: '#00E5FF' }]}>ID</Text>
        <Text style={[styles.thCell, styles.thDesc, { color: '#00E5FF' }]}>DESCRIÇÃO DO RISCO (FORMA 3)</Text>
        <Text style={[styles.thCell, styles.thType, { color: '#00E5FF' }]}>TIPO</Text>
        <Text style={[styles.thCell, styles.thScore, { color: '#00E5FF' }]}>P×I</Text>
        <Text style={[styles.thCell, styles.thScore, { color: '#00E5FF' }]}>NÍVEL</Text>
        <Text style={[styles.thCell, styles.thScore, { color: '#00E5FF' }]}>GUT</Text>
        <Text style={[styles.thCell, styles.thResp, { color: '#00E5FF' }]}>RESPONSÁVEL</Text>
        <Text style={[styles.thCell, styles.thTrat, { color: '#00E5FF' }]}>TRATAMENTO</Text>
      </View>
      {filteredRisks.map((risk, idx) => {
        const level = getRiskLevel(risk.riscoInerente);
        const gutLevel = getGutLevel(risk.gutScore);
        const badgeLevel = BADGE_LEVEL_MAP[level.label] || 'low';
        return (
          <TouchableOpacity
            key={risk.id}
            style={[
              styles.tableRow,
              { borderBottomColor: '#1A3A2A' },
              idx % 2 === 0 && { backgroundColor: '#0A0E14' },
            ]}
            onPress={() => router.push(`/risk/${risk.id}` as any)}
            activeOpacity={0.6}
          >
            <Text style={[styles.tdCell, styles.thId, { color: '#00E5FF', fontWeight: '700', fontFamily: 'monospace' }]}>{risk.id}</Text>
            <Text style={[styles.tdCell, styles.thDesc, { color: '#E0F0E0' }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
            <Text style={[styles.tdCell, styles.thType, { color: '#6B8A7A', fontFamily: 'monospace' }]} numberOfLines={1}>{risk.tipoRisco.replace('Risco ', '')}</Text>
            <View style={[styles.tdCellCenter, styles.thScore]}>
              <Text style={[styles.scoreNum, { color: level.color, fontFamily: 'monospace' }]}>{risk.riscoInerente}</Text>
            </View>
            <View style={[styles.tdCellCenter, styles.thScore]}>
              <PulsingBadge level={badgeLevel} size="sm" pulsing={false} />
            </View>
            <View style={[styles.tdCellCenter, styles.thScore]}>
              <View style={[styles.levelPill, { backgroundColor: gutLevel.color + '15', borderWidth: 1, borderColor: gutLevel.color + '30' }]}>
                <Text style={[styles.levelPillText, { color: gutLevel.color, fontFamily: 'monospace' }]}>{risk.gutScore}</Text>
              </View>
            </View>
            <Text style={[styles.tdCell, styles.thResp, { color: '#E0F0E0', fontFamily: 'monospace' }]}>{risk.responsavel || '—'}</Text>
            <Text style={[styles.tdCell, styles.thTrat, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{risk.tratamento || '—'}</Text>
          </TouchableOpacity>
        );
      })}
      {filteredRisks.length === 0 && (
        <View style={styles.emptyTable}>
          <Text style={{ color: '#6B8A7A', fontSize: 14, fontFamily: 'monospace' }}>NENHUM RISCO ENCONTRADO</Text>
        </View>
      )}
    </View>
  );

  const renderMobileCard = useCallback(({ item }: { item: Risk }) => {
    const level = getRiskLevel(item.riscoInerente);
    const gutLevel = getGutLevel(item.gutScore);
    const badgeLevel = BADGE_LEVEL_MAP[level.label] || 'low';
    return (
      <TouchableOpacity
        style={[styles.mobileCard, { backgroundColor: '#111820', borderColor: '#1A3A2A' }]}
        onPress={() => router.push(`/risk/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.mobileCardHeader}>
          <View style={styles.mobileCardLeft}>
            <Text style={[styles.mobileRiskId, { color: '#00E5FF', fontFamily: 'monospace' }]}>{item.id}</Text>
            <PulsingBadge level={badgeLevel} size="sm" pulsing={badgeLevel === 'critical'} />
          </View>
          <View style={styles.mobileCardRight}>
            <Text style={[styles.mobileScore, { color: '#6B8A7A', fontFamily: 'monospace' }]}>P×I: {item.riscoInerente}</Text>
            <View style={[styles.levelPill, { backgroundColor: gutLevel.color + '15', borderWidth: 1, borderColor: gutLevel.color + '30' }]}>
              <Text style={[styles.levelPillText, { color: gutLevel.color, fontFamily: 'monospace' }]}>GUT: {item.gutScore}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.mobileDesc, { color: '#E0F0E0' }]} numberOfLines={2}>{item.descricaoRisco}</Text>
        <View style={styles.mobileFooter}>
          <Text style={[styles.mobileFooterText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{item.fonteDeRisco}</Text>
          <Text style={[styles.mobileFooterText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{item.responsavel || '—'}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <StatusIndicator status="monitoring" label="CARREGANDO DADOS..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, isDesktop && styles.headerDesktop]}>
        <View style={styles.headerLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[styles.pageTitle, { color: '#E0F0E0', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>Riscos Cadastrados</Text>
            <StatusIndicator status="active" showLabel={false} />
          </View>
          <Text style={[styles.pageSubtitle, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{risks.length} riscos no registro</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#00E5FF20', borderWidth: 1, borderColor: '#00E5FF40' }]}
          onPress={() => router.push('/risk/new' as any)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus.circle.fill" size={18} color="#00E5FF" />
          <Text style={[styles.addButtonText, { color: '#00E5FF', fontFamily: 'monospace' }]}>NOVO RISCO</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Search & Filters */}
      <View style={[styles.filtersArea, isDesktop && styles.filtersAreaDesktop]}>
        <View style={[styles.searchBox, { backgroundColor: '#111820', borderColor: '#1A3A2A' }]}>
          <IconSymbol name="magnifyingglass" size={18} color="#6B8A7A" />
          <TextInput
            style={[styles.searchInput, { color: '#E0F0E0', fontFamily: 'monospace' }]}
            placeholder="Buscar por ID, descrição, fonte ou ameaça..."
            placeholderTextColor="#6B8A7A"
            value={search}
            onChangeText={setSearch}
            returnKeyType="done"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <IconSymbol name="xmark" size={16} color="#6B8A7A" />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {['Crítico', 'Alto', 'Médio', 'Baixo'].map(level => {
            const isActive = filterLevel === level;
            const chipColor = LEVEL_COLORS[level] || '#6B8A7A';
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.chip,
                  {
                    borderColor: isActive ? chipColor : '#1A3A2A',
                    backgroundColor: isActive ? chipColor + '20' : '#111820',
                  },
                ]}
                onPress={() => setFilterLevel(filterLevel === level ? null : level)}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: chipColor }]} />
                <Text style={[styles.chipText, { color: isActive ? chipColor : '#6B8A7A', fontFamily: 'monospace' }]}>{level}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={[styles.chipDivider, { backgroundColor: '#1A3A2A' }]} />
          {TIPOS_DE_RISCO.map(tipo => {
            const isActive = filterType === tipo;
            return (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.chip,
                  {
                    borderColor: isActive ? '#00E5FF' : '#1A3A2A',
                    backgroundColor: isActive ? '#00E5FF20' : '#111820',
                  },
                ]}
                onPress={() => setFilterType(filterType === tipo ? null : tipo)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: isActive ? '#00E5FF' : '#6B8A7A', fontFamily: 'monospace' }]} numberOfLines={1}>
                  {tipo.replace('Risco ', '').replace('de ', '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isDesktop ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.tableArea, isDesktop && styles.tableAreaDesktop]}>
          {renderDesktopTable()}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredRisks}
          renderItem={renderMobileCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.mobileList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyTable}>
              <Text style={{ color: '#6B8A7A', fontSize: 14, fontFamily: 'monospace' }}>NENHUM RISCO ENCONTRADO</Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { paddingHorizontal: 24, paddingTop: 16 },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  pageSubtitle: { fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  filtersArea: { paddingHorizontal: 16, marginBottom: 12 },
  filtersAreaDesktop: { paddingHorizontal: 24 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13 },
  filterChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  chipDivider: { width: 1, marginHorizontal: 4, alignSelf: 'stretch' },
  tableArea: { paddingHorizontal: 16 },
  tableAreaDesktop: { paddingHorizontal: 24 },
  tableCard: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, alignItems: 'center' },
  thCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'monospace' },
  thId: { width: 56 },
  thDesc: { flex: 3, paddingRight: 12 },
  thType: { flex: 1.5, paddingRight: 8 },
  thScore: { width: 70, alignItems: 'center' },
  thResp: { flex: 1, paddingRight: 8 },
  thTrat: { flex: 1 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
  tdCell: { fontSize: 13 },
  tdCellCenter: { justifyContent: 'center', alignItems: 'center' },
  scoreNum: { fontSize: 14, fontWeight: '700' },
  levelPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  levelPillText: { fontSize: 10, fontWeight: '700' },
  emptyTable: { padding: 40, alignItems: 'center' },
  mobileList: { paddingHorizontal: 16, paddingBottom: 80 },
  mobileCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  mobileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mobileCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileRiskId: { fontSize: 14, fontWeight: '700' },
  mobileScore: { fontSize: 10 },
  mobileDesc: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  mobileFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  mobileFooterText: { fontSize: 11 },
});
