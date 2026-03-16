import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getMatrixColor, getGutLevel } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useMemo } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";

const vetorHorizonLogo = require("@/assets/images/vetor-horizon-logo.png");

export default function DashboardScreen() {
  const { risks, loading } = useRisks();
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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

  const risksByType = useMemo(() => {
    const map: Record<string, number> = {};
    risks.forEach(r => {
      const type = r.tipoRisco || 'Não classificado';
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [risks]);

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted text-base">Carregando...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View style={styles.headerLeft}>
            {!isDesktop && (
              <Image
                source={vetorHorizonLogo}
                style={{ width: 120, height: 120, borderRadius: 10, marginBottom: 8 }}
                resizeMode="contain"
              />
            )}
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Dashboard</Text>
            <Text style={[styles.pageSubtitle, { color: colors.muted }]}>
              Visão geral dos riscos corporativos - DAMACORP
            </Text>
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

        {/* Summary Cards */}
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
          <View style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}>
            <StatCard
              label="Total de Riscos"
              value={stats.total}
              bgColor={colors.primary + '10'}
              textColor={colors.primary}
              borderColor={colors.primary + '30'}
              icon="shield.fill"
              colors={colors}
              isDesktop={isDesktop}
            />
            <StatCard
              label="Crítico"
              value={stats.critico}
              bgColor="#FEE2E2"
              textColor="#991B1B"
              borderColor="#FECACA"
              icon="exclamationmark.triangle.fill"
              colors={colors}
              isDesktop={isDesktop}
            />
            <StatCard
              label="Alto"
              value={stats.alto}
              bgColor="#FFF7ED"
              textColor="#9A3412"
              borderColor="#FED7AA"
              icon="exclamationmark.triangle.fill"
              colors={colors}
              isDesktop={isDesktop}
            />
            <StatCard
              label="Médio"
              value={stats.medio}
              bgColor="#FFFBEB"
              textColor="#854D0E"
              borderColor="#FDE68A"
              icon="exclamationmark.triangle.fill"
              colors={colors}
              isDesktop={isDesktop}
            />
            <StatCard
              label="Baixo"
              value={stats.baixo}
              bgColor="#F0FDF4"
              textColor="#166534"
              borderColor="#BBF7D0"
              icon="exclamationmark.triangle.fill"
              colors={colors}
              isDesktop={isDesktop}
            />
          </View>
        </View>

        {/* Main Content Grid */}
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
          <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
            {/* Left Column: Matrix + Risk by Type */}
            <View style={[styles.column, isDesktop && { flex: 1 }]}>
              {/* Risk Matrix */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Matriz de Risco (P × I)</Text>
                  <View style={[styles.cardBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.cardBadgeText, { color: colors.primary }]}>5×5</Text>
                  </View>
                </View>
                <View style={styles.matrixWrapper}>
                  <View style={styles.matrixYAxis}>
                    <Text style={[styles.axisTitle, { color: colors.muted }]}>P</Text>
                  </View>
                  <View style={styles.matrixContent}>
                    {matrixData.map((row, rowIdx) => (
                      <View key={rowIdx} style={styles.matrixRow}>
                        <View style={styles.matrixRowLabel}>
                          <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{5 - rowIdx}</Text>
                        </View>
                        {row.map((count, colIdx) => {
                          const prob = 5 - rowIdx;
                          const imp = colIdx + 1;
                          const bgColor = getMatrixColor(prob, imp);
                          return (
                            <View
                              key={colIdx}
                              style={[styles.matrixCell, { backgroundColor: bgColor + '25', borderColor: bgColor + '60' }]}
                            >
                              <Text style={[styles.matrixCellText, { color: count > 0 ? bgColor : 'transparent' }]}>
                                {count > 0 ? count : '·'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                    {/* X-axis labels */}
                    <View style={styles.matrixRow}>
                      <View style={styles.matrixRowLabel} />
                      {[1, 2, 3, 4, 5].map(n => (
                        <View key={n} style={[styles.matrixCell, { borderWidth: 0 }]}>
                          <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{n}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.xAxisTitle, { color: colors.muted }]}>Impacto</Text>
                  </View>
                </View>
                {/* Legend */}
                <View style={styles.legendRow}>
                  {[
                    { label: 'Baixo (1-5)', color: '#86EFAC' },
                    { label: 'Médio (6-11)', color: '#F59E0B' },
                    { label: 'Alto (12-19)', color: '#F97316' },
                    { label: 'Crítico (20-25)', color: '#EF4444' },
                  ].map(item => (
                    <View key={item.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendText, { color: colors.muted }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Risks by Type */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 12 }]}>Distribuição por Tipo</Text>
                {risksByType.map(([type, count]) => {
                  const pct = Math.round((count / risks.length) * 100);
                  return (
                    <View key={type} style={styles.barRow}>
                      <Text style={[styles.barLabel, { color: colors.foreground }]} numberOfLines={1}>
                        {type.replace('Risco ', '').replace('de ', '')}
                      </Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.barValue, { color: colors.muted }]}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Right Column: Top Risks */}
            <View style={[styles.column, isDesktop && { flex: 1 }]}>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Top Riscos por GUT</Text>
                  <TouchableOpacity onPress={() => router.push('/risks' as any)} activeOpacity={0.7}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
                  </TouchableOpacity>
                </View>
                {topRisks.map((risk, idx) => {
                  const level = getRiskLevel(risk.riscoInerente);
                  const gutLevel = getGutLevel(risk.gutScore);
                  return (
                    <TouchableOpacity
                      key={risk.id}
                      style={[styles.riskItem, idx < topRisks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                      onPress={() => router.push(`/risk/${risk.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.riskItemHeader}>
                        <View style={styles.riskItemLeft}>
                          <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? colors.primary + '15' : colors.border + '50' }]}>
                            <Text style={[styles.rankText, { color: idx < 3 ? colors.primary : colors.muted }]}>#{idx + 1}</Text>
                          </View>
                          <View>
                            <Text style={[styles.riskId, { color: colors.primary }]}>{risk.id}</Text>
                            <Text style={[styles.riskType, { color: colors.muted }]}>{risk.tipoRisco.replace('Risco ', '')}</Text>
                          </View>
                        </View>
                        <View style={styles.riskItemRight}>
                          <View style={[styles.scorePill, { backgroundColor: gutLevel.color + '15' }]}>
                            <Text style={[styles.scoreText, { color: gutLevel.color }]}>GUT {risk.gutScore}</Text>
                          </View>
                          <View style={[styles.scorePill, { backgroundColor: level.color + '15' }]}>
                            <Text style={[styles.scoreText, { color: level.color }]}>P×I {risk.riscoInerente}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={[styles.riskDesc, { color: colors.foreground }]} numberOfLines={2}>
                        {risk.descricaoRisco}
                      </Text>
                      <View style={styles.riskMeta}>
                        <Text style={[styles.riskMetaText, { color: colors.muted }]}>{risk.tratamento}</Text>
                        <Text style={[styles.riskMetaText, { color: colors.muted }]}>{risk.responsavel}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick Stats Card */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 12 }]}>Resumo Executivo</Text>
                <View style={styles.quickStatsGrid}>
                  <QuickStat label="Riscos Estratégicos" value={risks.filter(r => r.estrategico === 'SIM').length} total={risks.length} colors={colors} />
                  <QuickStat label="GUT Score Médio" value={Math.round(risks.reduce((s, r) => s + r.gutScore, 0) / (risks.length || 1))} colors={colors} />
                  <QuickStat label="Risco Inerente Médio" value={Number((risks.reduce((s, r) => s + r.riscoInerente, 0) / (risks.length || 1)).toFixed(1))} colors={colors} />
                  <QuickStat label="Em Tratamento" value={risks.filter(r => r.tratamento).length} total={risks.length} colors={colors} />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard({ label, value, bgColor, textColor, borderColor, icon, colors, isDesktop }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor, borderColor: borderColor, borderWidth: 1 }, isDesktop && styles.statCardDesktop]}>
      <View style={styles.statCardInner}>
        <View style={[styles.statIconWrap, { backgroundColor: textColor + '15' }]}>
          <IconSymbol name={icon} size={16} color={textColor} />
        </View>
        <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

function QuickStat({ label, value, total, colors }: { label: string; value: number; total?: number; colors: any }) {
  return (
    <View style={[styles.quickStatItem, { borderColor: colors.border }]}>
      <Text style={[styles.quickStatValue, { color: colors.foreground }]}>
        {value}{total !== undefined ? `/${total}` : ''}
      </Text>
      <Text style={[styles.quickStatLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { paddingHorizontal: 32, paddingTop: 28 },
  headerLeft: { flex: 1 },
  brandTag: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 24 },
  sectionDesktop: { paddingHorizontal: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statsGridDesktop: { flexWrap: 'nowrap' },
  statCard: { borderRadius: 12, padding: 16, minWidth: 140, flex: 1 },
  statCardDesktop: { minWidth: 0 },
  statCardInner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statIconWrap: { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  contentGrid: { marginTop: 20, gap: 16 },
  contentGridDesktop: { flexDirection: 'row' },
  column: { gap: 0 },
  card: { borderWidth: 1, borderRadius: 14, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  cardBadgeText: { fontSize: 12, fontWeight: '600' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  matrixWrapper: { flexDirection: 'row', alignItems: 'center' },
  matrixYAxis: { width: 24, alignItems: 'center', justifyContent: 'center' },
  axisTitle: { fontSize: 12, fontWeight: '700', transform: [{ rotate: '-90deg' }] },
  matrixContent: { flex: 1 },
  matrixRow: { flexDirection: 'row', marginBottom: 4 },
  matrixRowLabel: { width: 28, justifyContent: 'center', alignItems: 'center' },
  matrixLabelText: { fontSize: 12, fontWeight: '600' },
  matrixCell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1.5, marginHorizontal: 2 },
  matrixCellText: { fontSize: 16, fontWeight: '800' },
  xAxisTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6, marginLeft: 28 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '500' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  barLabel: { fontSize: 12, fontWeight: '500', width: 160 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'right' },
  riskItem: { paddingVertical: 14 },
  riskItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  riskItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskItemRight: { flexDirection: 'row', gap: 6 },
  rankBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: '700' },
  riskId: { fontSize: 14, fontWeight: '700' },
  riskType: { fontSize: 11, marginTop: 1 },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  scoreText: { fontSize: 11, fontWeight: '700' },
  riskDesc: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  riskMeta: { flexDirection: 'row', gap: 16 },
  riskMetaText: { fontSize: 11 },
  quickStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickStatItem: { flex: 1, minWidth: '40%', borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  quickStatValue: { fontSize: 22, fontWeight: '800' },
  quickStatLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
});
