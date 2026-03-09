import { ScrollView, Text, View, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { TABELA_IMPACTO_DETALHADA, NIVEIS_PROBABILIDADE, TABELA_GUT, getMatrixColor } from "@/lib/models";

export default function TablesScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-2 pb-4">
          <Text className="text-2xl font-bold text-foreground">Tabelas de Referência</Text>
          <Text className="text-sm text-muted mt-1">Consulte os critérios para avaliação de riscos</Text>
        </View>

        {/* Matriz de Risco 5x5 */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Matriz de Risco 5×5</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.matrixContainer}>
              <View style={styles.matrixYLabel}>
                <Text style={[styles.axisText, { color: colors.muted }]}>Probabilidade</Text>
              </View>
              <View style={styles.matrixGrid}>
                {[5, 4, 3, 2, 1].map(prob => (
                  <View key={prob} style={styles.matrixRow}>
                    <View style={styles.matrixRowLabel}>
                      <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{prob}</Text>
                    </View>
                    {[1, 2, 3, 4, 5].map(imp => {
                      const score = prob * imp;
                      const bgColor = getMatrixColor(prob, imp);
                      return (
                        <View key={imp} style={[styles.matrixCell, { backgroundColor: bgColor + '30', borderColor: bgColor }]}>
                          <Text style={[styles.matrixCellText, { color: bgColor }]}>{score}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
                <View style={styles.matrixRow}>
                  <View style={styles.matrixRowLabel} />
                  {[1, 2, 3, 4, 5].map(n => (
                    <View key={n} style={styles.matrixCell}>
                      <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{n}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.xAxisLabel, { color: colors.muted }]}>Impacto</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              {[
                { label: 'Baixo', color: '#86EFAC' },
                { label: 'Médio', color: '#F59E0B' },
                { label: 'Alto', color: '#F97316' },
                { label: 'Crítico', color: '#EF4444' },
              ].map(item => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendText, { color: colors.muted }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Tabela de Impacto */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Tabela de Impacto</Text>
          {TABELA_IMPACTO_DETALHADA.map(item => (
            <View key={item.nivel} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 8 }]}>
              <View style={styles.impactHeader}>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.nivel) + '20' }]}>
                  <Text style={[styles.levelBadgeText, { color: getLevelColor(item.nivel) }]}>{item.nivel}</Text>
                </View>
                <Text style={[styles.impactTitle, { color: colors.foreground }]}>{item.rotulo}</Text>
              </View>
              <View style={styles.impactDetails}>
                <ImpactRow label="Financeiro" value={item.financeiro} colors={colors} />
                <ImpactRow label="Reputação" value={item.reputacao} colors={colors} />
                <ImpactRow label="Operacional" value={item.operacional} colors={colors} />
                <ImpactRow label="Legal" value={item.legal} colors={colors} />
                <ImpactRow label="Ambiental" value={item.ambiental} colors={colors} />
                <ImpactRow label="Social" value={item.social} colors={colors} />
              </View>
            </View>
          ))}
        </View>

        {/* Tabela de Probabilidade */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Tabela de Probabilidade</Text>
          {NIVEIS_PROBABILIDADE.map(item => (
            <View key={item.nivel} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 8 }]}>
              <View style={styles.impactHeader}>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.nivel) + '20' }]}>
                  <Text style={[styles.levelBadgeText, { color: getLevelColor(item.nivel) }]}>{item.nivel}</Text>
                </View>
                <Text style={[styles.impactTitle, { color: colors.foreground }]}>{item.rotulo}</Text>
              </View>
              <Text style={[styles.detailText, { color: colors.muted }]}>{item.descricao}</Text>
            </View>
          ))}
        </View>

        {/* Tabela GUT */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Tabela de Prioridade (GUT)</Text>
          {TABELA_GUT.map(item => (
            <View key={item.nivel} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 8 }]}>
              <View style={styles.impactHeader}>
                <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.nivel) + '20' }]}>
                  <Text style={[styles.levelBadgeText, { color: getLevelColor(item.nivel) }]}>{item.nivel}</Text>
                </View>
                <Text style={[styles.impactTitle, { color: colors.foreground }]}>Nível {item.nivel}</Text>
              </View>
              <ImpactRow label="Gravidade (G)" value={item.gravidade} colors={colors} />
              <ImpactRow label="Urgência (U)" value={item.urgencia} colors={colors} />
              <ImpactRow label="Tendência (T)" value={item.tendencia} colors={colors} />
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function ImpactRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.impactRow}>
      <Text style={[styles.impactLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.impactValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function getLevelColor(nivel: number): string {
  switch (nivel) {
    case 5: return '#EF4444';
    case 4: return '#F97316';
    case 3: return '#F59E0B';
    case 2: return '#10B981';
    case 1: return '#6EE7B7';
    default: return '#9CA3AF';
  }
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16 },
  matrixContainer: { flexDirection: 'row' },
  matrixYLabel: { width: 20, justifyContent: 'center', alignItems: 'center' },
  axisText: { fontSize: 10, fontWeight: '600', transform: [{ rotate: '-90deg' }], width: 80 },
  matrixGrid: { flex: 1 },
  matrixRow: { flexDirection: 'row', marginBottom: 3 },
  matrixRowLabel: { width: 24, justifyContent: 'center', alignItems: 'center' },
  matrixLabelText: { fontSize: 12, fontWeight: '500' },
  matrixCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 2,
  },
  matrixCellText: { fontSize: 13, fontWeight: '700' },
  xAxisLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 4, marginLeft: 24 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  levelBadge: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  levelBadgeText: { fontSize: 14, fontWeight: '700' },
  impactTitle: { fontSize: 16, fontWeight: '600' },
  impactDetails: { gap: 6 },
  impactRow: { marginBottom: 4 },
  impactLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  impactValue: { fontSize: 13, lineHeight: 18 },
  detailText: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});
