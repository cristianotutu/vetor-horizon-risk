import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions, Image, Modal, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getMatrixColor, getGutLevel, Risk } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useMemo, useState, useCallback } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";

const vetorHorizonLogo = require("@/assets/images/vetor-horizon-logo.png");

type FilterState = {
  title: string;
  risks: Risk[];
} | null;

export default function DashboardScreen() {
  const { risks, loading } = useRisks();
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [activeFilter, setActiveFilter] = useState<FilterState>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = risks.length;
    const critico = risks.filter(r => r.riscoInerente >= 20).length;
    const alto = risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20).length;
    const medio = risks.filter(r => r.riscoInerente >= 6 && r.riscoInerente < 12).length;
    const baixo = risks.filter(r => r.riscoInerente < 6).length;
    return { total, critico, alto, medio, baixo };
  }, [risks]);

  const matrixRisks = useMemo(() => {
    const matrix: Risk[][][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => [] as Risk[])
    );
    risks.forEach(r => {
      if (r.probabilidade >= 1 && r.probabilidade <= 5 && r.impacto >= 1 && r.impacto <= 5) {
        matrix[5 - r.probabilidade][r.impacto - 1].push(r);
      }
    });
    return matrix;
  }, [risks]);

  const topRisks = useMemo(() => {
    return [...risks].sort((a, b) => b.gutScore - a.gutScore).slice(0, 10);
  }, [risks]);

  const risksByType = useMemo(() => {
    const map: Record<string, Risk[]> = {};
    risks.forEach(r => {
      const type = r.tipoRisco || 'Não classificado';
      if (!map[type]) map[type] = [];
      map[type].push(r);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [risks]);

  const handleStatPress = useCallback((level: string) => {
    let filtered: Risk[] = [];
    let title = '';
    switch (level) {
      case 'total':
        filtered = risks;
        title = `Todos os Riscos (${risks.length})`;
        break;
      case 'critico':
        filtered = risks.filter(r => r.riscoInerente >= 20);
        title = `Riscos Críticos (PxI ≥ 20)`;
        break;
      case 'alto':
        filtered = risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20);
        title = `Riscos Altos (PxI 12-19)`;
        break;
      case 'medio':
        filtered = risks.filter(r => r.riscoInerente >= 6 && r.riscoInerente < 12);
        title = `Riscos Médios (PxI 6-11)`;
        break;
      case 'baixo':
        filtered = risks.filter(r => r.riscoInerente < 6);
        title = `Riscos Baixos (PxI 1-5)`;
        break;
    }
    if (filtered.length > 0) {
      setActiveFilter({ title, risks: filtered.sort((a, b) => b.riscoInerente - a.riscoInerente) });
    }
  }, [risks]);

  const handleMatrixPress = useCallback((prob: number, imp: number, cellRisks: Risk[]) => {
    if (cellRisks.length > 0) {
      setActiveFilter({
        title: `Riscos P=${prob} × I=${imp} (Score ${prob * imp})`,
        risks: cellRisks,
      });
    }
  }, []);

  const handleTypePress = useCallback((type: string, typeRisks: Risk[]) => {
    setActiveFilter({
      title: `${type} (${typeRisks.length})`,
      risks: typeRisks.sort((a, b) => b.riscoInerente - a.riscoInerente),
    });
  }, []);

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted text-base">Carregando...</Text>
      </ScreenContainer>
    );
  }

  const renderRiskModal = () => {
    if (!activeFilter) return null;
    return (
      <Modal
        visible={!!activeFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveFilter(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveFilter(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                maxWidth: isDesktop ? 700 : width - 32,
                maxHeight: '80%',
              },
            ]}
            onPress={() => {}}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>{activeFilter.title}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  Clique em um risco para ver detalhes completos
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveFilter(null)}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeBtnText, { color: colors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Risk List */}
            <FlatList
              data={activeFilter.risks}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const level = getRiskLevel(item.riscoInerente);
                const gutLevel = getGutLevel(item.gutScore);
                return (
                  <TouchableOpacity
                    style={[styles.modalRiskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => {
                      setActiveFilter(null);
                      router.push(`/risk/${item.id}` as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalRiskHeader}>
                      <View style={styles.modalRiskLeft}>
                        <View style={[styles.modalRiskIdBadge, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={[styles.modalRiskId, { color: colors.primary }]}>{item.id}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalRiskType, { color: colors.muted }]}>{item.tipoRisco}</Text>
                        </View>
                      </View>
                      <View style={styles.modalRiskBadges}>
                        <View style={[styles.scorePill, { backgroundColor: level.color + '15' }]}>
                          <Text style={[styles.scoreText, { color: level.color }]}>P×I {item.riscoInerente}</Text>
                        </View>
                        <View style={[styles.scorePill, { backgroundColor: gutLevel.color + '15' }]}>
                          <Text style={[styles.scoreText, { color: gutLevel.color }]}>GUT {item.gutScore}</Text>
                        </View>
                        <View style={[styles.levelPill, { backgroundColor: level.color + '15' }]}>
                          <Text style={[styles.levelPillText, { color: level.color }]}>{level.label}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.modalRiskDesc, { color: colors.foreground }]} numberOfLines={3}>
                      {item.descricaoRisco}
                    </Text>
                    <View style={styles.modalRiskFooter}>
                      <Text style={[styles.modalRiskMeta, { color: colors.muted }]}>
                        {item.fonteDeRisco} | {item.tratamento}
                      </Text>
                      <View style={styles.modalRiskArrow}>
                        <IconSymbol name="chevron.right" size={14} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

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

        {/* Summary Cards - CLICKABLE */}
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
              onPress={() => handleStatPress('total')}
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
              onPress={() => handleStatPress('critico')}
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
              onPress={() => handleStatPress('alto')}
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
              onPress={() => handleStatPress('medio')}
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
              onPress={() => handleStatPress('baixo')}
            />
          </View>
        </View>

        {/* Main Content Grid */}
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
          <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
            {/* Left Column: Matrix + Risk by Type */}
            <View style={[styles.column, isDesktop && { flex: 1 }]}>
              {/* Risk Matrix - CLICKABLE CELLS */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Matriz de Risco (P × I)</Text>
                  <View style={[styles.cardBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.cardBadgeText, { color: colors.primary }]}>Clicável</Text>
                  </View>
                </View>
                <View style={styles.matrixWrapper}>
                  <View style={styles.matrixYAxis}>
                    <Text style={[styles.axisTitle, { color: colors.muted }]}>P</Text>
                  </View>
                  <View style={styles.matrixContent}>
                    {matrixRisks.map((row, rowIdx) => (
                      <View key={rowIdx} style={styles.matrixRow}>
                        <View style={styles.matrixRowLabel}>
                          <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{5 - rowIdx}</Text>
                        </View>
                        {row.map((cellRisks, colIdx) => {
                          const prob = 5 - rowIdx;
                          const imp = colIdx + 1;
                          const bgColor = getMatrixColor(prob, imp);
                          const count = cellRisks.length;
                          const cellKey = `${rowIdx}-${colIdx}`;
                          const isHovered = hoveredCell === cellKey;
                          return (
                            <TouchableOpacity
                              key={colIdx}
                              style={[
                                styles.matrixCell,
                                {
                                  backgroundColor: bgColor + (count > 0 ? '35' : '15'),
                                  borderColor: isHovered ? bgColor : bgColor + '60',
                                  borderWidth: isHovered ? 2.5 : 1.5,
                                  transform: [{ scale: isHovered ? 1.05 : 1 }],
                                },
                                count > 0 && styles.matrixCellActive,
                              ]}
                              onPress={() => handleMatrixPress(prob, imp, cellRisks)}
                              onPressIn={() => setHoveredCell(cellKey)}
                              onPressOut={() => setHoveredCell(null)}
                              activeOpacity={count > 0 ? 0.7 : 1}
                            >
                              {count > 0 ? (
                                <View style={styles.cellContentWrap}>
                                  <Text style={[styles.matrixCellText, { color: bgColor }]}>{count}</Text>
                                  <View style={[styles.cellTapHint, { backgroundColor: bgColor + '30' }]}>
                                    <Text style={[styles.cellTapHintText, { color: bgColor }]}>ver</Text>
                                  </View>
                                </View>
                              ) : (
                                <Text style={[styles.matrixCellText, { color: 'transparent' }]}>·</Text>
                              )}
                            </TouchableOpacity>
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

              {/* Risks by Type - CLICKABLE BARS */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Distribuição por Tipo</Text>
                  <View style={[styles.cardBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.cardBadgeText, { color: colors.primary }]}>Clicável</Text>
                  </View>
                </View>
                {risksByType.map(([type, typeRisks]) => {
                  const pct = Math.round((typeRisks.length / risks.length) * 100);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={styles.barRow}
                      onPress={() => handleTypePress(type, typeRisks)}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.barLabel, { color: colors.foreground }]} numberOfLines={1}>
                        {type.replace('Risco ', '').replace('de ', '')}
                      </Text>
                      <View style={[styles.barTrack, { backgroundColor: colors.border + '50' }]}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.barValue, { color: colors.primary }]}>{typeRisks.length}</Text>
                      <IconSymbol name="chevron.right" size={12} color={colors.muted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Right Column: Top Risks */}
            <View style={[styles.column, isDesktop && { flex: 1 }]}>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Top 10 Riscos por GUT</Text>
                  <TouchableOpacity onPress={() => router.push('/risks' as any)} activeOpacity={0.7}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos →</Text>
                  </TouchableOpacity>
                </View>
                {topRisks.map((risk, idx) => {
                  const level = getRiskLevel(risk.riscoInerente);
                  const gutLevel = getGutLevel(risk.gutScore);
                  return (
                    <TouchableOpacity
                      key={risk.id}
                      style={[
                        styles.riskItem,
                        idx < topRisks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                      onPress={() => router.push(`/risk/${risk.id}` as any)}
                      activeOpacity={0.6}
                    >
                      <View style={styles.riskItemHeader}>
                        <View style={styles.riskItemLeft}>
                          <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? level.color + '20' : colors.border + '50' }]}>
                            <Text style={[styles.rankText, { color: idx < 3 ? level.color : colors.muted }]}>#{idx + 1}</Text>
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
                          <IconSymbol name="chevron.right" size={14} color={colors.muted} />
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
                  <TouchableOpacity
                    style={[styles.quickStatItem, { borderColor: colors.border }]}
                    onPress={() => {
                      const estrategicos = risks.filter(r => r.estrategico === 'SIM');
                      if (estrategicos.length > 0) setActiveFilter({ title: `Riscos Estratégicos (${estrategicos.length})`, risks: estrategicos });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickStatValue, { color: colors.foreground }]}>
                      {risks.filter(r => r.estrategico === 'SIM').length}/{risks.length}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: colors.muted }]}>Riscos Estratégicos</Text>
                    <Text style={[styles.tapHint, { color: colors.primary }]}>ver →</Text>
                  </TouchableOpacity>
                  <View style={[styles.quickStatItem, { borderColor: colors.border }]}>
                    <Text style={[styles.quickStatValue, { color: colors.foreground }]}>
                      {Math.round(risks.reduce((s, r) => s + r.gutScore, 0) / (risks.length || 1))}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: colors.muted }]}>GUT Score Médio</Text>
                  </View>
                  <View style={[styles.quickStatItem, { borderColor: colors.border }]}>
                    <Text style={[styles.quickStatValue, { color: colors.foreground }]}>
                      {(risks.reduce((s, r) => s + r.riscoInerente, 0) / (risks.length || 1)).toFixed(1)}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: colors.muted }]}>Risco Inerente Médio</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.quickStatItem, { borderColor: colors.border }]}
                    onPress={() => {
                      const emTratamento = risks.filter(r => r.tratamento && r.tratamento !== '');
                      if (emTratamento.length > 0) setActiveFilter({ title: `Riscos em Tratamento (${emTratamento.length})`, risks: emTratamento });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickStatValue, { color: colors.foreground }]}>
                      {risks.filter(r => r.tratamento).length}/{risks.length}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: colors.muted }]}>Em Tratamento</Text>
                    <Text style={[styles.tapHint, { color: colors.primary }]}>ver →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Risk Detail Modal */}
      {renderRiskModal()}
    </ScreenContainer>
  );
}

function StatCard({ label, value, bgColor, textColor, borderColor, icon, colors, isDesktop, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: bgColor, borderColor: borderColor, borderWidth: 1 }, isDesktop && styles.statCardDesktop]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statCardInner}>
        <View style={[styles.statIconWrap, { backgroundColor: textColor + '15' }]}>
          <IconSymbol name={icon} size={16} color={textColor} />
        </View>
        <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.tapHint, { color: textColor, marginTop: 4 }]}>Clique para ver →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { paddingHorizontal: 32, paddingTop: 28 },
  headerLeft: { flex: 1 },
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
  tapHint: { fontSize: 10, fontWeight: '600', opacity: 0.7 },
  contentGrid: { marginTop: 20, gap: 16 },
  contentGridDesktop: { flexDirection: 'row' },
  column: { gap: 0 },
  card: { borderWidth: 1, borderRadius: 14, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  cardBadgeText: { fontSize: 11, fontWeight: '600' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  matrixWrapper: { flexDirection: 'row', alignItems: 'center' },
  matrixYAxis: { width: 24, alignItems: 'center', justifyContent: 'center' },
  axisTitle: { fontSize: 12, fontWeight: '700', transform: [{ rotate: '-90deg' }] },
  matrixContent: { flex: 1 },
  matrixRow: { flexDirection: 'row', marginBottom: 4 },
  matrixRowLabel: { width: 28, justifyContent: 'center', alignItems: 'center' },
  matrixLabelText: { fontSize: 12, fontWeight: '600' },
  matrixCell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1.5, marginHorizontal: 2 },
  matrixCellActive: { cursor: 'pointer' as any },
  matrixCellText: { fontSize: 18, fontWeight: '800' },
  cellContentWrap: { alignItems: 'center', gap: 2 },
  cellTapHint: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  cellTapHintText: { fontSize: 8, fontWeight: '700' },
  xAxisTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6, marginLeft: 28 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '500' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6 },
  barLabel: { fontSize: 12, fontWeight: '500', width: 160 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { fontSize: 13, fontWeight: '700', width: 24, textAlign: 'right' },
  riskItem: { paddingVertical: 14 },
  riskItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  riskItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskItemRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  rankBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: '700' },
  riskId: { fontSize: 14, fontWeight: '700' },
  riskType: { fontSize: 11, marginTop: 1 },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  scoreText: { fontSize: 11, fontWeight: '700' },
  levelPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelPillText: { fontSize: 10, fontWeight: '700' },
  riskDesc: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  riskMeta: { flexDirection: 'row', gap: 16 },
  riskMetaText: { fontSize: 11 },
  quickStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickStatItem: { flex: 1, minWidth: '40%', borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  quickStatValue: { fontSize: 22, fontWeight: '800' },
  quickStatLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { borderRadius: 16, borderWidth: 1, width: '100%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 18, fontWeight: '600' },
  modalRiskCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  modalRiskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  modalRiskLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalRiskIdBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalRiskId: { fontSize: 14, fontWeight: '800' },
  modalRiskType: { fontSize: 11 },
  modalRiskBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  modalRiskDesc: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  modalRiskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalRiskMeta: { fontSize: 11, flex: 1 },
  modalRiskArrow: { paddingLeft: 8 },
});
