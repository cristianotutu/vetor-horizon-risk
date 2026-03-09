import { FlatList, Text, View, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel, FONTES_DE_RISCO, TIPOS_DE_RISCO } from "@/lib/models";
import type { Risk } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo, useCallback } from "react";

export default function RisksScreen() {
  const { risks, loading } = useRisks();
  const router = useRouter();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
    return result.sort((a, b) => b.gutScore - a.gutScore);
  }, [risks, search, filterType]);

  const renderRiskItem = useCallback(({ item }: { item: Risk }) => {
    const level = getRiskLevel(item.riscoInerente);
    const gutLevel = getGutLevel(item.gutScore);
    return (
      <TouchableOpacity
        style={[styles.riskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/risk/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.riskId, { color: colors.primary }]}>{item.id}</Text>
            <View style={[styles.badge, { backgroundColor: level.color + '20' }]}>
              <Text style={[styles.badgeText, { color: level.color }]}>{level.label}</Text>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={[styles.scoreLabel, { color: colors.muted }]}>P×I: {item.riscoInerente}</Text>
            <View style={[styles.gutBadge, { backgroundColor: gutLevel.color + '20' }]}>
              <Text style={[styles.gutText, { color: gutLevel.color }]}>GUT: {item.gutScore}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.riskDesc, { color: colors.foreground }]} numberOfLines={2}>
          {item.descricaoRisco}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.footerText, { color: colors.muted }]}>{item.fonteDeRisco}</Text>
          <Text style={[styles.footerText, { color: colors.muted }]}>{item.responsavel || '—'}</Text>
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
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-foreground">Riscos</Text>
        <Text className="text-sm text-muted mt-1">{risks.length} riscos cadastrados</Text>
      </View>

      {/* Search */}
      <View className="px-5 mb-3">
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.muted, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Buscar riscos..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Filter Toggle */}
      <View className="px-5 mb-2">
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
            {showFilters ? 'Ocultar Filtros' : 'Filtrar por Tipo'} {filterType ? `(${filterType.split(' ')[1] || filterType})` : ''}
          </Text>
        </TouchableOpacity>
        {showFilters && (
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, !filterType && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={() => setFilterType(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, { color: !filterType ? colors.primary : colors.muted }]}>Todos</Text>
            </TouchableOpacity>
            {TIPOS_DE_RISCO.map(tipo => (
              <TouchableOpacity
                key={tipo}
                style={[styles.filterChip, filterType === tipo && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => setFilterType(filterType === tipo ? null : tipo)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: filterType === tipo ? colors.primary : colors.muted }]} numberOfLines={1}>
                  {tipo.replace('Risco ', '').replace('de ', '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Risk List */}
      <FlatList
        data={filteredRisks}
        renderItem={renderRiskItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text className="text-muted text-base">Nenhum risco encontrado</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/risk/new' as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E5E9',
  },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  riskCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskId: { fontSize: 14, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  gutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  gutText: { fontSize: 11, fontWeight: '600' },
  scoreLabel: { fontSize: 11 },
  riskDesc: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 12 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});
