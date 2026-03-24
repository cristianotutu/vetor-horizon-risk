import { FlatList, Text, View, TouchableOpacity, TextInput, StyleSheet, useWindowDimensions, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel, TIPOS_DE_RISCO } from "@/lib/models";
import type { Risk } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo, useCallback} from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlowCard } from "@/components/ui/glow-card";
import { PulsingBadge } from "@/components/ui/pulsing-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import Animated, { FadeInDown } from "react-native-reanimated";

const LEVEL_COLORS: Record<string, string> = {
  'Cr\u00edtico': '#FF3D3D',
  'Alto': '#FF8C00',
  'M\u00e9dio': '#FFD600',
  'Baixo': '#00FF88',
};

const BADGE_LEVEL_MAP: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  'Cr\u00edtico': 'critical',
  'Alto': 'high',
  'M\u00e9dio': 'medium',
  'Baixo': 'low',
};

// Abbreviate long type names for compact table display
function abbreviateType(tipo: string): string {
  const map: Record<string, string> = {
    'Estrat\u00e9gico': 'Estrat\u00e9gico',
    'Operacional': 'Operacional',
    'Financeiro': 'Financeiro',
    'Conformidade (Regulat\u00f3rio e Legal)': 'Conformidade',
    'Seguran\u00e7a da Informa\u00e7\u00e3o (Cibern\u00e9tico)': 'Seg. Info.',
    'Tecnol\u00f3gico': 'Tecnol\u00f3gico',
    'Reputacional': 'Reputacional',
    'Ambiental e Clim\u00e1tico': 'Ambiental',
    'Humano (Pessoas e Cultura Organizacional)': 'Humano / RH',
    'Cadeia de Suprimentos': 'Cadeia Suprim.',
  };
  if (map[tipo]) return map[tipo];
  const cleaned = tipo.replace(/^Risco\s+/, '').replace(/^de\s+/, '');
  if (map[cleaned]) return map[cleaned];
  return cleaned.length > 16 ? cleaned.substring(0, 14) + '\u2026' : cleaned;
}

// Abbreviate long responsible names for table
function abbreviateResp(resp: string): string {
  if (!resp) return '\u2014';
  let short = resp.replace(/\s*\(Owner\)\.?/g, '').replace(/\.\s*Correspons\u00e1veis:.*$/s, '').trim();
  if (short.length > 45) {
    short = short.substring(0, 43) + '\u2026';
  }
  return short;
}

// Color for type badge
function getTypeColor(tipo: string): string {
  const map: Record<string, string> = {
    'Estrat\u00e9gico': '#FF8C00',
    'Operacional': '#00BFFF',
    'Financeiro': '#FFD600',
    'Conformidade': '#C084FC',
    'Seg. Info.': '#FF3D3D',
    'Tecnol\u00f3gico': '#00E5FF',
    'Reputacional': '#F472B6',
    'Ambiental': '#22C55E',
    'Humano / RH': '#FB923C',
    'Cadeia Suprim.': '#94A3B8',
  };
  const abbr = abbreviateType(tipo);
  return map[abbr] || '#6B8A7A';
}

export default function RisksScreen() {
  const { risks, loading } = useRisks();
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
      {/* Header row */}
      <View style={[styles.tableHeaderRow, { borderBottomColor: '#00E5FF30', backgroundColor: '#0A1520' }]}>
        <View style={styles.colId}><Text style={[styles.thCell, { color: '#00E5FF' }]}>ID</Text></View>
        <View style={styles.colDesc}><Text style={[styles.thCell, { color: '#00E5FF' }]}>DESCRI\u00c7\u00c3O DO RISCO (FORMA 3)</Text></View>
        <View style={styles.colType}><Text style={[styles.thCell, { color: '#00E5FF', textAlign: 'center' }]}>TIPO</Text></View>
        <View style={styles.colPxi}><Text style={[styles.thCell, { color: '#00E5FF', textAlign: 'center' }]}>P\u00d7I</Text></View>
        <View style={styles.colLevel}><Text style={[styles.thCell, { color: '#00E5FF', textAlign: 'center' }]}>N\u00cdVEL</Text></View>
        <View style={styles.colGut}><Text style={[styles.thCell, { color: '#00E5FF', textAlign: 'center' }]}>GUT</Text></View>
        <View style={styles.colResp}><Text style={[styles.thCell, { color: '#00E5FF' }]}>RESPONS\u00c1VEL</Text></View>
        <View style={styles.colTrat}><Text style={[styles.thCell, { color: '#00E5FF', textAlign: 'center' }]}>TRATAMENTO</Text></View>
      </View>

      {/* Data rows */}
      {filteredRisks.map((risk, idx) => {
        const level = getRiskLevel(risk.riscoInerente);
        const gutLevel = getGutLevel(risk.gutScore);
        const badgeLevel = BADGE_LEVEL_MAP[level.label] || 'low';
        const levelColor = LEVEL_COLORS[level.label] || '#6B8A7A';
        const typeColor = getTypeColor(risk.tipoRisco);
        const isEven = idx % 2 === 0;

        return (
          <TouchableOpacity
            key={risk.id}
            style={[
              styles.tableRow,
              { borderBottomColor: '#1A3A2A20' },
              isEven ? { backgroundColor: '#0A0E14' } : { backgroundColor: '#0D1218' },
            ]}
            onPress={() => router.push(`/risk/${risk.id}` as any)}
            activeOpacity={0.55}
          >
            {/* ID */}
            <View style={styles.colId}>
              <Text style={styles.tdId}>{risk.id}</Text>
            </View>

            {/* Description - main content column */}
            <View style={styles.colDesc}>
              <Text style={styles.tdDesc} numberOfLines={3}>{risk.descricaoRisco}</Text>
            </View>

            {/* Type badge */}
            <View style={[styles.colType, { alignItems: 'center' }]}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor + '15', borderColor: typeColor + '30' }]}>
                <Text style={[styles.typeText, { color: typeColor }]} numberOfLines={1}>
                  {abbreviateType(risk.tipoRisco)}
                </Text>
              </View>
            </View>

            {/* P x I score */}
            <View style={[styles.colPxi, styles.cellCenter]}>
              <View style={[styles.scoreBadge, { backgroundColor: levelColor + '18', borderColor: levelColor + '40' }]}>
                <Text style={[styles.scoreText, { color: levelColor }]}>{risk.riscoInerente}</Text>
              </View>
            </View>

            {/* Level badge */}
            <View style={[styles.colLevel, styles.cellCenter]}>
              <PulsingBadge level={badgeLevel} size="sm" pulsing={false} />
            </View>

            {/* GUT score */}
            <View style={[styles.colGut, styles.cellCenter]}>
              <View style={[styles.gutBadge, { backgroundColor: gutLevel.color + '15', borderColor: gutLevel.color + '35' }]}>
                <Text style={[styles.gutText, { color: gutLevel.color }]}>{risk.gutScore}</Text>
              </View>
            </View>

            {/* Responsible */}
            <View style={styles.colResp}>
              <Text style={styles.tdResp} numberOfLines={2}>{abbreviateResp(risk.responsavel)}</Text>
            </View>

            {/* Treatment */}
            <View style={[styles.colTrat, { alignItems: 'center' }]}>
              <View style={[styles.tratBadge, { backgroundColor: '#00E5FF08', borderColor: '#00E5FF20' }]}>
                <Text style={styles.tratText} numberOfLines={1}>{risk.tratamento || '\u2014'}</Text>
              </View>
            </View>
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
            <Text style={[styles.mobileScore, { color: '#6B8A7A', fontFamily: 'monospace' }]}>P\u00d7I: {item.riscoInerente}</Text>
            <View style={[styles.gutBadge, { backgroundColor: gutLevel.color + '15', borderColor: gutLevel.color + '30' }]}>
              <Text style={[styles.gutText, { color: gutLevel.color }]}>GUT: {item.gutScore}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.mobileDesc, { color: '#E0F0E0' }]} numberOfLines={2}>{item.descricaoRisco}</Text>
        <View style={styles.mobileFooter}>
          <Text style={[styles.mobileFooterText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{item.fonteDeRisco}</Text>
          <Text style={[styles.mobileFooterText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{item.responsavel || '\u2014'}</Text>
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
            placeholder="Buscar por ID, descri\u00e7\u00e3o, fonte ou amea\u00e7a..."
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
          {['Cr\u00edtico', 'Alto', 'M\u00e9dio', 'Baixo'].map(level => {
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
                  {abbreviateType(tipo)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isDesktop ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.tableArea, isDesktop && styles.tableAreaDesktop]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: 900 }}>
            {renderDesktopTable()}
          </ScrollView>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredRisks}
          renderItem={renderMobileCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.mobileList}
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
  header: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { paddingHorizontal: 16, paddingTop: 8 },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  pageSubtitle: { fontSize: 12, marginTop: 2, letterSpacing: 0.5 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  filtersArea: { paddingHorizontal: 12, marginBottom: 4 },
  filtersAreaDesktop: { paddingHorizontal: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 10, marginBottom: 6 },
  searchInput: { flex: 1, fontSize: 13 },
  filterChips: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, borderWidth: 1 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  chipDivider: { width: 1, marginHorizontal: 4, alignSelf: 'stretch' },
  tableArea: { paddingHorizontal: 6 },
  tableAreaDesktop: { paddingHorizontal: 8 },
  tableCard: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 2, alignItems: 'center' },
  thCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'monospace' },
  colId: { width: 44, paddingHorizontal: 3 },
  colDesc: { flex: 4.5, paddingHorizontal: 4 },
  colType: { width: 95, paddingHorizontal: 2 },
  colPxi: { width: 40, paddingHorizontal: 1 },
  colLevel: { width: 58, paddingHorizontal: 1 },
  colGut: { width: 40, paddingHorizontal: 1 },
  colResp: { flex: 2, paddingHorizontal: 4 },
  colTrat: { width: 120, paddingHorizontal: 2 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 7, borderBottomWidth: 1, alignItems: 'center', minHeight: 44 },
  cellCenter: { justifyContent: 'center', alignItems: 'center' },
  tdId: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace', color: '#00E5FF' },
  tdDesc: { fontSize: 11.5, lineHeight: 16, color: '#E0F0E0' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, alignItems: 'center' },
  typeText: { fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' },
  scoreBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, minWidth: 32, alignItems: 'center' },
  scoreText: { fontSize: 13, fontWeight: '800', fontFamily: 'monospace' },
  gutBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, minWidth: 32, alignItems: 'center' },
  gutText: { fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  tdResp: { fontSize: 10.5, lineHeight: 14, color: '#B0C8B8', fontFamily: 'monospace' },
  tratBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  tratText: { fontSize: 9.5, fontWeight: '600', fontFamily: 'monospace', color: '#6BCAAA', textAlign: 'center' },
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
