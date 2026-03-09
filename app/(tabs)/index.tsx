import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getMatrixColor, getGutLevel } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useMemo } from "react";

export default function DashboardScreen() {
  const { risks, loading } = useRisks();
  const router = useRouter();
  const colors = useColors();

  const stats = useMemo(() => {
    const total = risks.length;
    const critico = risks.filter(r => r.riscoInerente >= 20).length;
    const alto = risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20).length;
    const medio = risks.filter(r => r.riscoInerente >= 6 && r.riscoInerente < 12).length;
    const baixo = risks.filter(r => r.riscoInerente < 6).length;
    return { total, critico, alto, medio, baixo };
  }, [risks]);

  const matrixData = useMemo(() => {
    const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    risks.forEach(r => {
      if (r.probabilidade >= 1 && r.probabilidade <= 5 && r.impacto >= 1 && r.impacto <= 5) {
        matrix[5 - r.probabilidade][r.impacto - 1]++;
      }
    });
    return matrix;
  }, [risks]);

  const topRisks = useMemo(() => {
    return [...risks].sort((a, b) => b.gutScore - a.gutScore).slice(0, 5);
  }, [risks]);

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted text-base">Carregando...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-2 pb-4">
          <Text className="text-sm font-medium text-primary tracking-wider">VETOR HORIZON</Text>
          <Text className="text-2xl font-bold text-foreground mt-1">Consultoria de Risco</Text>
          <Text className="text-sm text-muted mt-1">ICAPT - Gestão de Riscos Corporativos</Text>
        </View>

        {/* Summary Cards */}
        <View className="px-5 mb-5">
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1 min-w-[45%] bg-surface rounded-xl p-4 border border-border">
              <Text className="text-sm text-muted">Total de Riscos</Text>
              <Text className="text-3xl font-bold text-foreground mt-1">{stats.total}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]} className="flex-1 min-w-[45%] rounded-xl p-4">
              <Text style={{ color: '#991B1B' }} className="text-sm font-medium">Crítico</Text>
              <Text style={{ color: '#991B1B' }} className="text-3xl font-bold mt-1">{stats.critico}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]} className="flex-1 min-w-[45%] rounded-xl p-4">
              <Text style={{ color: '#9A3412' }} className="text-sm font-medium">Alto</Text>
              <Text style={{ color: '#9A3412' }} className="text-3xl font-bold mt-1">{stats.alto}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF9C3' }]} className="flex-1 min-w-[45%] rounded-xl p-4">
              <Text style={{ color: '#854D0E' }} className="text-sm font-medium">Médio</Text>
              <Text style={{ color: '#854D0E' }} className="text-3xl font-bold mt-1">{stats.medio}</Text>
            </View>
          </View>
        </View>

        {/* Risk Matrix 5x5 */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Matriz de Risco (P x I)</Text>
          <View className="bg-surface rounded-xl p-4 border border-border">
            <View className="flex-row">
              <View className="w-8 justify-center items-center mr-1">
                <Text style={styles.axisLabel} className="text-muted">P</Text>
              </View>
              <View className="flex-1">
                {matrixData.map((row, rowIdx) => (
                  <View key={rowIdx} className="flex-row mb-1">
                    <View className="w-6 justify-center items-center mr-1">
                      <Text className="text-xs text-muted">{5 - rowIdx}</Text>
                    </View>
                    {row.map((count, colIdx) => {
                      const prob = 5 - rowIdx;
                      const imp = colIdx + 1;
                      const bgColor = getMatrixColor(prob, imp);
                      return (
                        <View
                          key={colIdx}
                          style={[styles.matrixCell, { backgroundColor: bgColor + '30', borderColor: bgColor }]}
                        >
                          <Text style={[styles.matrixCellText, { color: bgColor }]}>
                            {count > 0 ? count : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
                <View className="flex-row mt-1 ml-7">
                  {[1, 2, 3, 4, 5].map(n => (
                    <View key={n} style={styles.matrixCell}>
                      <Text className="text-xs text-muted">{n}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.axisLabelBottom} className="text-muted ml-7">Impacto</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top 5 Risks by GUT */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Top 5 Riscos (GUT Score)</Text>
          {topRisks.map((risk) => {
            const level = getRiskLevel(risk.riscoInerente);
            const gutLevel = getGutLevel(risk.gutScore);
            return (
              <TouchableOpacity
                key={risk.id}
                className="bg-surface rounded-xl p-4 mb-2 border border-border"
                onPress={() => router.push(`/risk/${risk.id}` as any)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-primary">{risk.id}</Text>
                    <View style={[styles.badge, { backgroundColor: level.color + '20' }]}>
                      <Text style={[styles.badgeText, { color: level.color }]}>{level.label}</Text>
                    </View>
                  </View>
                  <View style={[styles.gutBadge, { backgroundColor: gutLevel.color + '20' }]}>
                    <Text style={[styles.gutBadgeText, { color: gutLevel.color }]}>GUT: {risk.gutScore}</Text>
                  </View>
                </View>
                <Text className="text-sm text-foreground" numberOfLines={2}>
                  {risk.descricaoRisco}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Spacer for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB - Add New Risk */}
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
  scrollContent: { flexGrow: 1 },
  statCard: {},
  axisLabel: { fontSize: 11, fontWeight: '600', transform: [{ rotate: '-90deg' }] },
  axisLabelBottom: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  matrixCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 1,
  },
  matrixCellText: { fontSize: 14, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  gutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  gutBadgeText: { fontSize: 11, fontWeight: '600' },
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
