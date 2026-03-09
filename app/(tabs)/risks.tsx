import { FlatList, Text, View, TouchableOpacity, TextInput, StyleSheet, useWindowDimensions, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel, TIPOS_DE_RISCO } from "@/lib/models";
import type { Risk } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo, useCallback } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";

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
    <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Table Header */}
      <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.thCell, styles.thId, { color: colors.muted }]}>ID</Text>
        <Text style={[styles.thCell, styles.thDesc, { color: colors.muted }]}>Descrição do Risco (Forma 3)</Text>
        <Text style={[styles.thCell, styles.thType, { color: colors.muted }]}>Tipo</Text>
        <Text style={[styles.thCell, styles.thScore, { color: colors.muted }]}>P×I</Text>
        <Text style={[styles.thCell, styles.thScore, { color: colors.muted }]}>Nível</Text>
        <Text style={[styles.thCell, styles.thScore, { color: colors.muted }]}>GUT</Text>
        <Text style={[styles.thCell, styles.thResp, { color: colors.muted }]}>Responsável</Text>
        <Text style={[styles.thCell, styles.thTrat, { color: colors.muted }]}>Tratamento</Text>
      </View>
      {/* Table Body */}
      {filteredRisks.map((risk, idx) => {
        const level = getRiskLevel(risk.riscoInerente);
        const gutLevel = getGutLevel(risk.gutScore);
        return (
          <TouchableOpacity
            key={risk.id}
            style={[
              styles.tableRow,
              { borderBottomColor: colors.border },
              idx % 2 === 0 && { backgroundColor: colors.background + '60' },
            ]}
            onPress={() => router.push(`/risk/${risk.id}` as any)}
            activeOpacity={0.6}
          >
            <Text style={[styles.tdCell, styles.thId, { color: colors.primary, fontWeight: '700' }]}>{risk.id}</Text>
            <Text style={[styles.tdCell, styles.thDesc, { color: colors.foreground }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
            <Text style={[styles.tdCell, styles.thType, { color: colors.muted }]} numberOfLines={1}>{risk.tipoRisco.replace('Risco ', '')}</Text>
            <View style={[styles.tdCellCenter, styles.thScore]}>
              <Text style={[styles.scoreNum, { color: colors.foreground }]}>{risk.riscoInerente}</Text>
            </View>
            <View style={[styles.tdCellCenter, styles.thScore]}>
              <View style={[styles.levelPill, { backgroundColor: level.color + '18' }]}>
                <Text style={[styles.levelPillText, { color: level.color }]}>{level.label}</Text>
              </View>
            </View>
            <View style={[styles.tdCellCenter, styles.thScore]}>
              <View style={[styles.levelPill, { backgroundColor: gutLevel.color + '18' }]}>
                <Text style={[styles.levelPillText, { color: gutLevel.color }]}>{risk.gutScore}</Text>
              </View>
            </View>
            <Text style={[styles.tdCell, styles.thResp, { color: colors.foreground }]}>{risk.responsavel || '—'}</Text>
            <Text style={[styles.tdCell, styles.thTrat, { color: colors.muted }]}>{risk.tratamento || '—'}</Text>
          </TouchableOpacity>
        );
      })}
      {filteredRisks.length === 0 && (
        <View style={styles.emptyTable}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Nenhum risco encontrado</Text>
        </View>
      )}
    </View>
  );

  const renderMobileCard = useCallback(({ item }: { item: Risk }) => {
    const level = getRiskLevel(item.riscoInerente);
    const gutLevel = getGutLevel(item.gutScore);
    return (
      <TouchableOpacity
        style={[styles.mobileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/risk/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.mobileCardHeader}>
          <View style={styles.mobileCardLeft}>
            <Text style={[styles.mobileRiskId, { color: colors.primary }]}>{item.id}</Text>
            <View style={[styles.levelPill, { backgroundColor: level.color + '18' }]}>
              <Text style={[styles.levelPillText, { color: level.color }]}>{level.label}</Text>
            </View>
          </View>
          <View style={styles.mobileCardRight}>
            <Text style={[styles.mobileScore, { color: colors.muted }]}>P×I: {item.riscoInerente}</Text>
            <View style={[styles.levelPill, { backgroundColor: gutLevel.color + '18' }]}>
              <Text style={[styles.levelPillText, { color: gutLevel.color }]}>GUT: {item.gutScore}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.mobileDesc, { color: colors.foreground }]} numberOfLines={2}>{item.descricaoRisco}</Text>
        <View style={styles.mobileFooter}>
          <Text style={[styles.mobileFooterText, { color: colors.muted }]}>{item.fonteDeRisco}</Text>
          <Text style={[styles.mobileFooterText, { color: colors.muted }]}>{item.responsavel || '—'}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, router]);

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted text-base">Carregando...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Riscos Cadastrados</Text>
          <Text style={[styles.pageSubtitle, { color: colors.muted }]}>{risks.length} riscos no registro</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/risk/new' as any)}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Novo Risco</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={[styles.filtersArea, isDesktop && styles.filtersAreaDesktop]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Buscar por ID, descrição, fonte ou ameaça..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="done"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <IconSymbol name="xmark" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {/* Level filters */}
          {['Crítico', 'Alto', 'Médio', 'Baixo'].map(level => (
            <TouchableOpacity
              key={level}
              style={[styles.chip, filterLevel === level && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              onPress={() => setFilterLevel(filterLevel === level ? null : level)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: filterLevel === level ? colors.primary : colors.muted }]}>{level}</Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />
          {/* Type filters */}
          {TIPOS_DE_RISCO.map(tipo => (
            <TouchableOpacity
              key={tipo}
              style={[styles.chip, filterType === tipo && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              onPress={() => setFilterType(filterType === tipo ? null : tipo)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: filterType === tipo ? colors.primary : colors.muted }]} numberOfLines={1}>
                {tipo.replace('Risco ', '').replace('de ', '')}
              </Text>
            </TouchableOpacity>
          ))}
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
              <Text style={{ color: colors.muted, fontSize: 14 }}>Nenhum risco encontrado</Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { paddingHorizontal: 32, paddingTop: 28 },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  filtersArea: { paddingHorizontal: 24, marginBottom: 16 },
  filtersAreaDesktop: { paddingHorizontal: 32 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  filterChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 12, fontWeight: '500' },
  chipDivider: { width: 1, marginHorizontal: 4, alignSelf: 'stretch' },
  tableArea: { paddingHorizontal: 24 },
  tableAreaDesktop: { paddingHorizontal: 32 },
  tableCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, alignItems: 'center' },
  thCell: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  levelPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  levelPillText: { fontSize: 11, fontWeight: '700' },
  emptyTable: { padding: 40, alignItems: 'center' },
  mobileList: { paddingHorizontal: 24, paddingBottom: 100 },
  mobileCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 },
  mobileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mobileCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileRiskId: { fontSize: 14, fontWeight: '700' },
  mobileScore: { fontSize: 11 },
  mobileDesc: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  mobileFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  mobileFooterText: { fontSize: 12 },
});
