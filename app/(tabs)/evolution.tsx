import { Text, View, ScrollView, TouchableOpacity, FlatList, Modal, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlowCard } from "@/components/ui/glow-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { RISKS_AULA3, RISKS_AULA4, RISKS_AULA5, RISKS_AULA6, EVOLUTION_3_TO_4, EVOLUTION_4_TO_5, EVOLUTION_5_TO_6, EVOLUTION_3_TO_6, AULA_RISK_COUNTS } from "@/lib/evolution-data";
import { getRiskLevel, getGutLevel, Risk } from "@/lib/models";
import { useEngine } from "@/lib/engine-context";
import { enrichRisks, calculatePortfolioMetrics } from "@/lib/risk-engine";
import Animated, { FadeInDown } from "react-native-reanimated";

type ViewMode = 'overview' | 'comparison' | 'matrix';
type CompareMode = '3v4' | '4v5' | '5v6' | '3v6';
type FilterState = { title: string; risks: Risk[]; source?: string } | null;

const MONO = Platform.OS === 'web' ? 'monospace' : undefined;
function normalizeId(id: string) { return id.replace(/\s/g, '').toUpperCase(); }

const a3Map = new Map(RISKS_AULA3.map(r => [normalizeId(r.id), r]));
const a4Map = new Map(RISKS_AULA4.map(r => [normalizeId(r.id), r]));
const a5Map = new Map(RISKS_AULA5.map(r => [normalizeId(r.id), r]));
const a6Map = new Map(RISKS_AULA6.map(r => [normalizeId(r.id), r]));

const AULA_COLORS = { '3': '#3B82F6', '4': '#8B5CF6', '5': '#00FF88', '6': '#00E5FF' };

function getAulaData(n: '3' | '4' | '5' | '6') {
  if (n === '3') return { risks: RISKS_AULA3, map: a3Map, label: 'Aula 3', color: AULA_COLORS['3'] };
  if (n === '4') return { risks: RISKS_AULA4, map: a4Map, label: 'Aula 4', color: AULA_COLORS['4'] };
  if (n === '5') return { risks: RISKS_AULA5, map: a5Map, label: 'Aula 5', color: AULA_COLORS['5'] };
  return { risks: RISKS_AULA6, map: a6Map, label: 'Aula 6', color: AULA_COLORS['6'] };
}

function getEvolution(mode: CompareMode) {
  if (mode === '3v4') return EVOLUTION_3_TO_4;
  if (mode === '4v5') return EVOLUTION_4_TO_5;
  if (mode === '5v6') return EVOLUTION_5_TO_6;
  return EVOLUTION_3_TO_6;
}

function getAulaStats(risks: Risk[]) {
  const critico = risks.filter(r => r.riscoInerente >= 20).length;
  const alto = risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20).length;
  const medio = risks.filter(r => r.riscoInerente >= 6 && r.riscoInerente < 12).length;
  const baixo = risks.filter(r => r.riscoInerente < 6).length;
  const avgPxI = risks.length > 0 ? risks.reduce((s, r) => s + r.riscoInerente, 0) / risks.length : 0;
  const avgGUT = risks.length > 0 ? risks.reduce((s, r) => s + r.gutScore, 0) / risks.length : 0;
  const maxGUT = risks.length > 0 ? Math.max(...risks.map(r => r.gutScore)) : 0;
  const comControles = risks.filter(r => r.controles && r.controles.length > 5).length;
  const comKRI = risks.filter(r => r.kri && r.kri.length > 3).length;
  return { total: risks.length, critico, alto, medio, baixo, avgPxI, avgGUT, maxGUT, comControles, comKRI };
}

export default function EvolutionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { config } = useEngine();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [compareMode, setCompareMode] = useState<CompareMode>('5v6');
  const [activeFilter, setActiveFilter] = useState<FilterState>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const fromAula = compareMode[0] as '3' | '4' | '5' | '6';
  const toAula = compareMode[2] as '3' | '4' | '5' | '6';
  const fromData = getAulaData(fromAula);
  const toData = getAulaData(toAula);
  const evolution = useMemo(() => getEvolution(compareMode), [compareMode]);

  const newRisks = evolution.filter(e => e.type === 'new');
  const modifiedRisks = evolution.filter(e => e.type === 'modified');
  const unchangedRisks = evolution.filter(e => e.type === 'unchanged');

  const stats3 = useMemo(() => getAulaStats(RISKS_AULA3), []);
  const stats4 = useMemo(() => getAulaStats(RISKS_AULA4), []);
  const stats5 = useMemo(() => getAulaStats(RISKS_AULA5), []);
  const stats6 = useMemo(() => getAulaStats(RISKS_AULA6), []);

  // Engine-enriched metrics per aula for scenario projections
  const engineMetrics = useMemo(() => {
    const aulas = [
      { key: '3', risks: RISKS_AULA3 },
      { key: '4', risks: RISKS_AULA4 },
      { key: '5', risks: RISKS_AULA5 },
      { key: '6', risks: RISKS_AULA6 },
    ];
    return aulas.map(a => {
      const enriched = enrichRisks(a.risks, config);
      const metrics = calculatePortfolioMetrics(enriched, config);
      return { key: a.key, enriched, metrics };
    });
  }, [config]);

  const handleRiskPress = useCallback((riskId: string) => {
    setActiveFilter(null);
    router.push(`/risk/${riskId}` as any);
  }, [router]);

  const handleCellPress = useCallback((prob: number, imp: number, cellRisks: string[], source: string) => {
    if (cellRisks.length === 0) return;
    const map = source.includes('6') ? a6Map : source.includes('5') ? a5Map : source.includes('4') ? a4Map : a3Map;
    const risksInCell = cellRisks.map(id => map.get(id)).filter(Boolean) as Risk[];
    if (risksInCell.length > 0) {
      setActiveFilter({ title: `${source}: P=${prob} × I=${imp} (Score ${prob * imp})`, risks: risksInCell, source });
    }
  }, []);

  const handleStatGroupPress = useCallback((type: 'new' | 'modified' | 'unchanged', label: string) => {
    const evItems = evolution.filter(e => e.type === type);
    const risksArr = evItems.map(e => toData.map.get(e.riskId)).filter(Boolean) as Risk[];
    if (risksArr.length > 0) {
      setActiveFilter({ title: label, risks: risksArr, source: toData.label });
    }
  }, [evolution, toData]);

  // ---- RENDER MODAL ----
  const renderRiskModal = () => {
    if (!activeFilter) return null;
    return (
      <Modal visible={!!activeFilter} transparent animationType="fade" onRequestClose={() => setActiveFilter(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setActiveFilter(null)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalContent, { maxWidth: isDesktop ? 700 : width - 32 }]} onPress={() => {}}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{activeFilter.title}</Text>
                <Text style={s.modalSub}>Clique em um risco para ver detalhes</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveFilter(null)} style={s.closeBtn} activeOpacity={0.7}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeFilter.risks}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item }) => {
                const level = getRiskLevel(item.riscoInerente);
                const gutLevel = getGutLevel(item.gutScore);
                return (
                  <TouchableOpacity style={s.modalCard} onPress={() => handleRiskPress(normalizeId(item.id))} activeOpacity={0.7}>
                    <View style={s.modalCardHeader}>
                      <Text style={[s.modalIdText, { color: '#00E5FF' }]}>{item.id}</Text>
                      <View style={s.modalBadges}>
                        <View style={[s.pill, { backgroundColor: level.color + '20', borderColor: level.color + '40' }]}>
                          <Text style={[s.pillText, { color: level.color }]}>P×I {item.riscoInerente}</Text>
                        </View>
                        <View style={[s.pill, { backgroundColor: gutLevel.color + '20', borderColor: gutLevel.color + '40' }]}>
                          <Text style={[s.pillText, { color: gutLevel.color }]}>GUT {item.gutScore}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={s.modalDesc} numberOfLines={3}>{item.descricaoRisco}</Text>
                    <View style={s.modalFooter}>
                      <Text style={s.modalMeta}>{item.fonteDeRisco} | {item.tratamento}</Text>
                      <IconSymbol name="chevron.right" size={14} color="#00E5FF" />
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

  // ---- SCENARIO PROJECTION PANEL ----
  const renderScenarioProjection = () => {
    const scenarioLabel = config.scenarioMultipliers[config.scenario].label;
    const aulaMetrics = engineMetrics.map((em, idx) => ({
      label: `Aula ${em.key}`,
      color: AULA_COLORS[em.key as keyof typeof AULA_COLORS],
      avgScore: em.metrics?.averageCompositeScore ?? 0,
      maxScore: em.metrics?.maxCompositeScore ?? 0,
      intolerable: em.metrics?.byAppetite.intolerable ?? 0,
      tolerable: em.metrics?.byAppetite.tolerable ?? 0,
      acceptable: em.metrics?.byAppetite.acceptable ?? 0,
      exposure: em.metrics?.scenarioAdjustedExposure ?? 0,
      warnings: em.metrics?.totalWarnings ?? 0,
      confidence: em.metrics?.averageConfidence ?? 0,
      total: em.metrics?.totalRisks ?? 0,
    }));

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <GlowCard variant="default">
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>PROJEÇÃO POR CENÁRIO — {scenarioLabel.toUpperCase()}</Text>
            <StatusIndicator status={config.scenario === 'extreme' ? 'alert' : config.scenario === 'stress' ? 'monitoring' : 'active'} label={scenarioLabel.toUpperCase()} />
          </View>
          <Text style={{ color: '#6B8A7A', fontSize: 9, fontFamily: MONO, marginBottom: 8 }}>
            {config.scenarioMultipliers[config.scenario].description}
          </Text>

          {/* Score Evolution Bars */}
          <Text style={s.chartSubtitle}>Composite Score Médio por Fase</Text>
          <View style={{ gap: 4, marginBottom: 12 }}>
            {aulaMetrics.map((a, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: a.color, fontSize: 9, fontWeight: '700', fontFamily: MONO, width: 48 }}>{a.label}</Text>
                <View style={{ flex: 1, height: 18, borderRadius: 4, backgroundColor: '#0A0E14', overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, a.avgScore)}%`, height: '100%', backgroundColor: a.color + '40', borderRadius: 4, justifyContent: 'center', paddingLeft: 4 }}>
                    <Text style={{ color: a.color, fontSize: 8, fontWeight: '800', fontFamily: MONO }}>{a.avgScore.toFixed(1)}</Text>
                  </View>
                </View>
                <Text style={{ color: '#6B8A7A', fontSize: 8, fontFamily: MONO, width: 30, textAlign: 'right' }}>max {a.maxScore.toFixed(0)}</Text>
              </View>
            ))}
          </View>

          {/* Appetite Distribution per Aula */}
          <Text style={s.chartSubtitle}>Distribuição por Apetite de Risco</Text>
          <View style={{ gap: 4, marginBottom: 12 }}>
            {aulaMetrics.map((a, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: a.color, fontSize: 9, fontWeight: '700', fontFamily: MONO, width: 48 }}>{a.label}</Text>
                <View style={{ flex: 1, height: 14, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#0A0E14' }}>
                  {a.intolerable > 0 && <View style={{ flex: a.intolerable, backgroundColor: '#FF3D3D' }} />}
                  {a.tolerable > 0 && <View style={{ flex: a.tolerable, backgroundColor: '#FFD600' }} />}
                  {a.acceptable > 0 && <View style={{ flex: a.acceptable, backgroundColor: '#00FF88' }} />}
                </View>
                <Text style={{ color: '#6B8A7A', fontSize: 8, fontFamily: MONO, width: 50, textAlign: 'right' }}>
                  {a.intolerable}R/{a.tolerable}A/{a.acceptable}V
                </Text>
              </View>
            ))}
          </View>
          <View style={s.legendRow}>
            {[{ label: 'Intolerável', color: '#FF3D3D' }, { label: 'Tolerável', color: '#FFD600' }, { label: 'Aceitável', color: '#00FF88' }].map(item => (
              <View key={item.label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: item.color }]} />
                <Text style={s.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Volatility Metrics */}
          <Text style={[s.chartSubtitle, { marginTop: 12 }]}>Volatilidade e Alertas</Text>
          <View style={[isDesktop && { flexDirection: 'row', gap: 8 }, { gap: 4 }]}>
            {aulaMetrics.map((a, idx) => (
              <View key={idx} style={{ flex: isDesktop ? 1 : undefined, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0A0E14', borderRadius: 4, padding: 6, borderWidth: 1, borderColor: a.color + '20' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: a.color }} />
                <Text style={{ color: a.color, fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{a.label}</Text>
                <Text style={{ color: '#6B8A7A', fontSize: 8, fontFamily: MONO }}>⚠{a.warnings}</Text>
                <Text style={{ color: '#6B8A7A', fontSize: 8, fontFamily: MONO }}>Conf:{a.confidence}%</Text>
                <Text style={{ color: '#6B8A7A', fontSize: 8, fontFamily: MONO }}>Exp:R${(a.exposure / 1e6).toFixed(1)}M</Text>
              </View>
            ))}
          </View>
        </GlowCard>
      </Animated.View>
    );
  };

  // ---- EVOLUTION CHART ----
  const renderEvolutionChart = () => {
    const aulaData = [
      { label: 'Aula 3', color: AULA_COLORS['3'], stats: stats3, officialCount: AULA_RISK_COUNTS.aula3 },
      { label: 'Aula 4', color: AULA_COLORS['4'], stats: stats4, officialCount: AULA_RISK_COUNTS.aula4 },
      { label: 'Aula 5', color: AULA_COLORS['5'], stats: stats5, officialCount: AULA_RISK_COUNTS.aula5 },
      { label: 'Aula 6', color: AULA_COLORS['6'], stats: stats6, officialCount: AULA_RISK_COUNTS.aula6 },
    ];
    const maxTotal = Math.max(...aulaData.map(a => a.officialCount));
    const chartHeight = 160;

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <GlowCard variant="default">
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>EVOLUÇÃO DO PROJETO</Text>
            <StatusIndicator status="monitoring" label="TIMELINE" />
          </View>

          {/* Two-column layout on desktop */}
          <View style={[isDesktop && { flexDirection: 'row', gap: 16 }]}>
            {/* Left: Bar Chart */}
            <View style={{ flex: 1 }}>
              <Text style={s.chartSubtitle}>Total de Riscos por Fase</Text>
              <View style={s.chartContainer}>
                <View style={[s.chartYAxis, { height: chartHeight }]}>
                  {[maxTotal, Math.round(maxTotal * 0.75), Math.round(maxTotal * 0.5), Math.round(maxTotal * 0.25), 0].map((v, i) => (
                    <Text key={i} style={s.chartYLabel}>{v}</Text>
                  ))}
                </View>
                <View style={s.chartBars}>
                  {aulaData.map((aula, idx) => {
                    const barHeight = maxTotal > 0 ? (aula.officialCount / maxTotal) * chartHeight : 0;
                    return (
                      <View key={idx} style={s.chartBarCol}>
                        <View style={[s.chartBarWrapper, { height: chartHeight }]}>
                          <View style={[s.chartBar, { height: barHeight, backgroundColor: aula.color + '30', borderColor: aula.color, borderWidth: 1 }]}>
                            <Text style={[s.chartBarValue, { color: aula.color }]}>{aula.officialCount}</Text>
                          </View>
                        </View>
                        <Text style={[s.chartBarLabel, { color: aula.color }]}>{aula.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Right: Stacked Distribution + GUT */}
            <View style={{ flex: 1 }}>
              <Text style={[s.chartSubtitle, !isDesktop && { marginTop: 16 }]}>Distribuição por Nível de Risco</Text>
              {aulaData.map((aula, idx) => (
                <View key={idx} style={s.stackedRow}>
                  <Text style={[s.stackedLabel, { color: aula.color }]}>{aula.label}</Text>
                  <View style={s.stackedBarTrack}>
                    {aula.stats.total > 0 && (
                      <>
                        <View style={[s.stackedSegment, { flex: aula.stats.critico, backgroundColor: '#FF3D3D' }]} />
                        <View style={[s.stackedSegment, { flex: aula.stats.alto, backgroundColor: '#FF8C00' }]} />
                        <View style={[s.stackedSegment, { flex: aula.stats.medio, backgroundColor: '#FFD600' }]} />
                        <View style={[s.stackedSegment, { flex: aula.stats.baixo, backgroundColor: '#00FF88' }]} />
                      </>
                    )}
                  </View>
                  <Text style={s.stackedTotal}>{aula.officialCount}</Text>
                </View>
              ))}
              <View style={s.legendRow}>
                {[{ label: 'Crítico', color: '#FF3D3D' }, { label: 'Alto', color: '#FF8C00' }, { label: 'Médio', color: '#FFD600' }, { label: 'Baixo', color: '#00FF88' }].map(item => (
                  <View key={item.label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: item.color }]} />
                    <Text style={s.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* GUT Evolution */}
              <Text style={[s.chartSubtitle, { marginTop: 12 }]}>GUT Médio</Text>
              <View style={s.gutLineContainer}>
                {aulaData.map((aula, idx) => (
                  <View key={idx} style={s.gutLineCol}>
                    <Text style={[s.gutLineValue, { color: aula.color }]}>{aula.stats.avgGUT.toFixed(0)}</Text>
                    <View style={[s.gutLineDot, { backgroundColor: aula.color, borderColor: aula.color }]} />
                    <Text style={[s.gutLineLabel, { color: aula.color }]}>{aula.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Maturity Indicators */}
          <Text style={[s.chartSubtitle, { marginTop: 12 }]}>Indicadores de Maturidade (Aula 6)</Text>
          <View style={[isDesktop ? { flexDirection: 'row', gap: 12 } : { gap: 6 }]}>
            {[
              { label: 'Controles Definidos', value: stats6.comControles, total: stats6.total, color: '#00FF88' },
              { label: 'KRI Definidos', value: stats6.comKRI, total: stats6.total, color: '#00E5FF' },
              { label: 'P×I Médio', value: stats6.avgPxI, total: 25, color: '#FFD600', isAvg: true },
            ].map((item, idx) => (
              <View key={idx} style={[s.maturityItem, isDesktop && { flex: 1 }]}>
                <Text style={s.maturityLabel}>{item.label}</Text>
                <View style={s.maturityBarTrack}>
                  <View style={[s.maturityBarFill, { width: `${(item.value / item.total) * 100}%`, backgroundColor: item.color }]} />
                </View>
                <Text style={[s.maturityValue, { color: item.color }]}>{item.isAvg ? item.value.toFixed(1) : item.value}/{item.total}</Text>
              </View>
            ))}
          </View>
        </GlowCard>
      </Animated.View>
    );
  };

  // ---- OVERVIEW VIEW ----
  const renderOverviewView = () => (
    <View style={s.section}>
      {renderScenarioProjection()}
      {renderEvolutionChart()}

      {/* Summary Stats */}
      <Animated.View entering={FadeInDown.duration(400).delay(300)}>
        <View style={[s.statsGrid, isDesktop && s.statsGridDesktop]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => handleStatGroupPress('new', `Novos na ${toData.label} (${newRisks.length})`)} activeOpacity={0.7}>
            <GlowCard variant="default">
              <View style={s.statInner}>
                <View style={[s.statIconBg, { backgroundColor: '#00FF8820' }]}>
                  <IconSymbol name="plus.circle.fill" size={18} color="#00FF88" />
                </View>
                <AnimatedCounter value={newRisks.length} color="#00FF88" fontSize={28} />
                <Text style={s.statLabel}>NOVOS</Text>
                <Text style={s.statHint}>CLIQUE →</Text>
              </View>
            </GlowCard>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => handleStatGroupPress('modified', `Revisados (${modifiedRisks.length})`)} activeOpacity={0.7}>
            <GlowCard variant="default">
              <View style={s.statInner}>
                <View style={[s.statIconBg, { backgroundColor: '#FFD60020' }]}>
                  <IconSymbol name="pencil" size={18} color="#FFD600" />
                </View>
                <AnimatedCounter value={modifiedRisks.length} color="#FFD600" fontSize={28} />
                <Text style={s.statLabel}>REVISADOS</Text>
                <Text style={[s.statHint, { color: '#FFD60080' }]}>CLIQUE →</Text>
              </View>
            </GlowCard>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <GlowCard variant="default">
              <View style={s.statInner}>
                <View style={[s.statIconBg, { backgroundColor: '#6B8A7A20' }]}>
                  <IconSymbol name="checkmark.circle.fill" size={18} color="#6B8A7A" />
                </View>
                <AnimatedCounter value={unchangedRisks.length} color="#6B8A7A" fontSize={28} />
                <Text style={s.statLabel}>MANTIDOS</Text>
              </View>
            </GlowCard>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  // ---- COMPARISON VIEW ----
  const renderComparisonView = () => {
    const allIds = Array.from(new Set([
      ...fromData.risks.map(r => normalizeId(r.id)),
      ...toData.risks.map(r => normalizeId(r.id)),
    ])).sort();

    return (
      <View style={s.section}>
        {isDesktop && (
          <View style={s.tableHeader}>
            <Text style={[s.thCell, s.thId]}>ID</Text>
            <Text style={[s.thCell, s.thDesc]}>DESCRIÇÃO</Text>
            <Text style={[s.thCell, s.thVal]}>{fromData.label} (PxI)</Text>
            <Text style={[s.thCell, s.thVal]}>{toData.label} (PxI)</Text>
            <Text style={[s.thCell, s.thVal]}>GUT {fromAula}</Text>
            <Text style={[s.thCell, s.thVal]}>GUT {toAula}</Text>
            <Text style={[s.thCell, s.thStatus]}>DELTA</Text>
          </View>
        )}
        {allIds.map((rid, idx) => {
          const rFrom = fromData.map.get(rid);
          const rTo = toData.map.get(rid);
          const ev = evolution.find(e => e.riskId === rid);
          const risk = rTo || rFrom;
          if (!risk) return null;

          const isNew = !rFrom;
          const isModified = ev?.type === 'modified';
          const statusColor = isNew ? '#00FF88' : isModified ? '#FFD600' : '#6B8A7A';
          const statusLabel = isNew ? 'NOVO' : isModified ? 'REVISADO' : 'IGUAL';
          const levelFrom = rFrom ? getRiskLevel(rFrom.riscoInerente) : null;
          const levelTo = rTo ? getRiskLevel(rTo.riscoInerente) : null;
          const pxiDelta = rFrom && rTo ? rTo.riscoInerente - rFrom.riscoInerente : null;

          if (isDesktop) {
            return (
              <TouchableOpacity key={rid} style={[s.tableRow, idx % 2 === 0 && { backgroundColor: '#0A0E1480' }]} onPress={() => handleRiskPress(rid)} activeOpacity={0.6}>
                <View style={[s.tdCell, s.thId]}><Text style={s.tdId}>{rid}</Text></View>
                <View style={[s.tdCell, s.thDesc, { minWidth: 0 }]}><Text style={s.tdDesc} numberOfLines={2}>{risk.descricaoRisco}</Text></View>
                <View style={[s.tdCell, s.thVal]}>
                  {rFrom ? (
                    <View style={[s.scoreBox, { backgroundColor: (levelFrom?.color || '#6B8A7A') + '20', borderColor: (levelFrom?.color || '#6B8A7A') + '40' }]}>
                      <Text style={[s.scoreBoxText, { color: levelFrom?.color }]}>{rFrom.riscoInerente}</Text>
                    </View>
                  ) : <Text style={s.naText}>—</Text>}
                </View>
                <View style={[s.tdCell, s.thVal]}>
                  {rTo ? (
                    <View style={[s.scoreBox, { backgroundColor: (levelTo?.color || '#6B8A7A') + '20', borderColor: (levelTo?.color || '#6B8A7A') + '40' }]}>
                      <Text style={[s.scoreBoxText, { color: levelTo?.color }]}>{rTo.riscoInerente}</Text>
                    </View>
                  ) : <Text style={s.naText}>—</Text>}
                </View>
                <View style={[s.tdCell, s.thVal]}><Text style={s.gutText}>{rFrom ? rFrom.gutScore : '—'}</Text></View>
                <View style={[s.tdCell, s.thVal]}><Text style={s.gutText}>{rTo ? rTo.gutScore : '—'}</Text></View>
                <View style={[s.tdCell, s.thStatus]}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  {pxiDelta !== null && pxiDelta !== 0 && (
                    <Text style={[s.deltaText, { color: pxiDelta > 0 ? '#FF3D3D' : '#00FF88' }]}>{pxiDelta > 0 ? `+${pxiDelta}` : pxiDelta}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={rid} style={s.compCard} onPress={() => handleRiskPress(rid)} activeOpacity={0.7}>
              <View style={s.compCardHeader}>
                <Text style={s.compId}>{rid}</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color="#00E5FF" />
                </View>
              </View>
              <Text style={s.compDesc} numberOfLines={2}>{risk.descricaoRisco}</Text>
              <View style={s.compScores}>
                <View style={s.compScoreCol}>
                  <Text style={s.compScoreLabel}>{fromData.label}</Text>
                  <Text style={[s.compScoreVal, { color: levelFrom?.color || '#6B8A7A' }]}>{rFrom ? `PxI ${rFrom.riscoInerente} | GUT ${rFrom.gutScore}` : '—'}</Text>
                </View>
                <Text style={{ color: '#6B8A7A', fontSize: 16 }}>→</Text>
                <View style={s.compScoreCol}>
                  <Text style={s.compScoreLabel}>{toData.label}</Text>
                  <Text style={[s.compScoreVal, { color: levelTo?.color || '#6B8A7A' }]}>{rTo ? `PxI ${rTo.riscoInerente} | GUT ${rTo.gutScore}` : '—'}</Text>
                </View>
              </View>
              {ev && ev.changes.length > 0 && (
                <View style={s.changesList}>
                  {ev.changes.map((c, i) => (
                    <View key={i} style={[s.changeChip, { borderColor: statusColor + '40' }]}>
                      <Text style={[s.changeChipText, { color: statusColor }]}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ---- MATRIX VIEW ----
  const renderMatrixView = () => {
    const renderMatrix = (risks: Risk[], label: string, color: string, source: string) => {
      const matrix: string[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => [] as string[]));
      risks.forEach(r => {
        const row = 5 - r.probabilidade;
        const col = r.impacto - 1;
        if (row >= 0 && row < 5 && col >= 0 && col < 5) matrix[row][col].push(normalizeId(r.id));
      });
      const cellSize = isDesktop ? 72 : 50;
      const labelW = isDesktop ? 24 : 18;
      const getCellColor = (prob: number, imp: number) => {
        const score = prob * imp;
        if (score >= 20) return '#FF3D3D';
        if (score >= 12) return '#FF8C00';
        if (score >= 6) return '#FFD600';
        return '#00FF88';
      };
      return (
        <View style={s.matrixContainer}>
          <View style={s.matrixHeaderRow}>
            <View style={[s.matrixBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
              <Text style={[s.matrixBadgeText, { color }]}>{label}</Text>
            </View>
            <Text style={s.matrixCount}>{risks.length} riscos</Text>
          </View>
          <View style={s.matrixWrap}>
            <View style={[s.yAxisLabel, { width: labelW }]}>
              <Text style={[s.axisText, { transform: [{ rotate: '-90deg' }] }]}>Prob.</Text>
            </View>
            <View>
              {matrix.map((row, rowIdx) => (
                <View key={rowIdx} style={s.matrixRow}>
                  <View style={[s.matrixLabel, { width: labelW }]}>
                    <Text style={s.matrixLabelText}>{5 - rowIdx}</Text>
                  </View>
                  {row.map((cell, colIdx) => {
                    const prob = 5 - rowIdx;
                    const imp = colIdx + 1;
                    const cellColor = getCellColor(prob, imp);
                    const hasRisks = cell.length > 0;
                    return (
                      <TouchableOpacity key={colIdx} style={[s.matrixCell, { width: cellSize, height: cellSize, backgroundColor: hasRisks ? cellColor + '25' : '#0A0E1440', borderColor: hasRisks ? cellColor + '60' : '#1A3A2A' }]} onPress={() => handleCellPress(prob, imp, cell, source)} activeOpacity={hasRisks ? 0.6 : 1}>
                        {hasRisks && (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={[s.matrixCellText, { color: cellColor }]}>{cell.length}</Text>
                            {cell.length <= 3 && cell.map(id => <Text key={id} style={{ fontSize: 7, color: cellColor + '80', fontFamily: MONO }}>{id.replace('R0', '')}</Text>)}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View style={s.matrixRow}>
                <View style={{ width: labelW }} />
                {[1, 2, 3, 4, 5].map(n => (
                  <View key={n} style={[s.matrixLabel, { width: cellSize }]}>
                    <Text style={s.matrixLabelText}>{n}</Text>
                  </View>
                ))}
              </View>
              <View style={s.xAxisLabel}><Text style={s.axisText}>Impacto</Text></View>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View style={s.section}>
        <View style={[isDesktop && s.matrixGrid]}>
          {renderMatrix(fromData.risks, fromData.label, fromData.color, fromData.label)}
          {renderMatrix(toData.risks, toData.label, toData.color, toData.label)}
        </View>
      </View>
    );
  };

  // ---- MAIN RENDER ----
  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      <ScrollView contentContainerStyle={[s.scrollContent, isDesktop && s.scrollContentDesktop]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(300)} style={s.header}>
          <View style={s.headerLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.pageTitle}>Evolução do Projeto</Text>
              <StatusIndicator status="monitoring" label="LIVE" />
            </View>
            <Text style={s.pageSubtitle}>
              Aula 3 ({AULA_RISK_COUNTS.aula3}) → Aula 4 ({AULA_RISK_COUNTS.aula4}) → Aula 5 ({AULA_RISK_COUNTS.aula5}) → Aula 6 ({AULA_RISK_COUNTS.aula6})
            </Text>
          </View>
        </Animated.View>

        <View style={s.viewSelector}>
          {([
            { key: 'overview' as ViewMode, label: 'Visão Geral', icon: 'chart.line.uptrend.xyaxis' as const },
            { key: 'comparison' as ViewMode, label: 'Comparativo', icon: 'tablecells' as const },
            { key: 'matrix' as ViewMode, label: 'Matrizes', icon: 'square.grid.2x2.fill' as const },
          ]).map(item => (
            <TouchableOpacity key={item.key} style={[s.viewSelectorBtn, viewMode === item.key && s.viewSelectorBtnActive]} onPress={() => setViewMode(item.key)} activeOpacity={0.7}>
              <IconSymbol name={item.icon} size={14} color={viewMode === item.key ? '#00E5FF' : '#6B8A7A'} />
              <Text style={[s.viewSelectorLabel, viewMode === item.key && s.viewSelectorLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(viewMode === 'comparison' || viewMode === 'matrix') && (
          <View style={s.compareSelector}>
            {([
              { key: '3v4' as CompareMode, label: 'Aula 3 → 4' },
              { key: '4v5' as CompareMode, label: 'Aula 4 → 5' },
              { key: '5v6' as CompareMode, label: 'Aula 5 → 6' },
              { key: '3v6' as CompareMode, label: 'Aula 3 → 6' },
            ]).map(item => (
              <TouchableOpacity key={item.key} style={[s.compareSelectorBtn, compareMode === item.key && s.compareSelectorBtnActive]} onPress={() => setCompareMode(item.key)} activeOpacity={0.7}>
                <Text style={[s.compareSelectorLabel, compareMode === item.key && s.compareSelectorLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {viewMode === 'overview' && renderOverviewView()}
        {viewMode === 'comparison' && renderComparisonView()}
        {viewMode === 'matrix' && renderMatrixView()}

        <View style={{ height: 30 }} />
      </ScrollView>
      {renderRiskModal()}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 4 },
  scrollContentDesktop: { maxWidth: 1400, alignSelf: 'center' as any, width: '100%' as any },
  header: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 2 },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 1, color: '#E0F0E0', fontFamily: MONO },
  pageSubtitle: { fontSize: 10, marginTop: 1, letterSpacing: 0.5, color: '#6B8A7A', fontFamily: MONO },
  viewSelector: { flexDirection: 'row', marginHorizontal: 10, marginBottom: 4, backgroundColor: '#0D1117', borderRadius: 6, borderWidth: 1, borderColor: '#1A3A2A', padding: 2, gap: 2 },
  viewSelectorBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 4, gap: 4 },
  viewSelectorBtnActive: { backgroundColor: '#00E5FF15' },
  viewSelectorLabel: { fontSize: 11, fontWeight: '600', color: '#6B8A7A', fontFamily: MONO },
  viewSelectorLabelActive: { color: '#00E5FF' },
  compareSelector: { flexDirection: 'row', marginHorizontal: 10, marginBottom: 4, gap: 3, flexWrap: 'wrap' },
  compareSelectorBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4, backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#1A3A2A' },
  compareSelectorBtnActive: { backgroundColor: '#00E5FF15', borderColor: '#00E5FF40' },
  compareSelectorLabel: { fontSize: 10, fontWeight: '600', color: '#6B8A7A', fontFamily: MONO },
  compareSelectorLabelActive: { color: '#00E5FF' },
  section: { paddingHorizontal: 10, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#00E5FF', fontFamily: MONO },
  chartSubtitle: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, color: '#6B8A7A', marginBottom: 6, fontFamily: MONO },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartYAxis: { justifyContent: 'space-between', paddingBottom: 4 },
  chartYLabel: { fontSize: 8, color: '#6B8A7A', fontFamily: MONO, textAlign: 'right' },
  chartBars: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  chartBarCol: { alignItems: 'center', flex: 1 },
  chartBarWrapper: { justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  chartBar: { width: '70%', borderRadius: 4, alignItems: 'center', justifyContent: 'center', minHeight: 20 },
  chartBarValue: { fontSize: 11, fontWeight: '800', fontFamily: MONO },
  chartBarLabel: { fontSize: 8, fontWeight: '600', marginTop: 2, fontFamily: MONO },
  stackedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  stackedLabel: { width: 48, fontSize: 9, fontWeight: '600', fontFamily: MONO },
  stackedBarTrack: { flex: 1, height: 14, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#0A0E14' },
  stackedSegment: { height: '100%' },
  stackedTotal: { width: 24, fontSize: 9, fontWeight: '700', color: '#E0F0E0', textAlign: 'right', fontFamily: MONO },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 9, color: '#6B8A7A', fontFamily: MONO },
  gutLineContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 6 },
  gutLineCol: { alignItems: 'center', flex: 1 },
  gutLineValue: { fontSize: 14, fontWeight: '800', fontFamily: MONO },
  gutLineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginVertical: 4 },
  gutLineLabel: { fontSize: 9, fontWeight: '600', fontFamily: MONO },
  maturityItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  maturityLabel: { width: 110, fontSize: 9, color: '#6B8A7A', fontFamily: MONO },
  maturityBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#0A0E14' },
  maturityBarFill: { height: '100%', borderRadius: 3 },
  maturityValue: { width: 45, fontSize: 9, fontWeight: '700', textAlign: 'right', fontFamily: MONO },
  statsGrid: { flexDirection: 'column', gap: 6, marginTop: 4 },
  statsGridDesktop: { flexDirection: 'row' },
  statInner: { alignItems: 'center', paddingVertical: 8, gap: 2 },
  statIconBg: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#6B8A7A', fontFamily: MONO },
  statHint: { fontSize: 8, color: '#00FF8880', fontFamily: MONO },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 5, backgroundColor: '#0A0E14', borderRadius: 4, marginBottom: 2, borderWidth: 1, borderColor: '#1A3A2A' },
  thCell: { fontWeight: '700', fontSize: 8, color: '#6B8A7A', fontFamily: MONO, letterSpacing: 0.3 },
  thId: { width: 44 },
  thDesc: { flex: 1, minWidth: 160 },
  thVal: { width: 64, textAlign: 'center' as any },
  thStatus: { width: 80, textAlign: 'center' as any },
  tableRow: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 5, borderRadius: 3, borderBottomWidth: 1, borderBottomColor: '#1A3A2A20' },
  tdCell: { justifyContent: 'center' },
  tdId: { fontSize: 10, fontWeight: '700', color: '#00E5FF', fontFamily: MONO },
  tdDesc: { fontSize: 9, color: '#9BA1A6', lineHeight: 13 },
  scoreBox: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, borderWidth: 1, alignSelf: 'center' },
  scoreBoxText: { fontSize: 10, fontWeight: '800', fontFamily: MONO, textAlign: 'center' },
  naText: { fontSize: 10, color: '#6B8A7A', textAlign: 'center', fontFamily: MONO },
  gutText: { fontSize: 10, fontWeight: '600', color: '#9BA1A6', textAlign: 'center', fontFamily: MONO },
  statusBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, borderWidth: 1, alignSelf: 'center' },
  statusText: { fontSize: 7, fontWeight: '700', fontFamily: MONO },
  deltaText: { fontSize: 9, fontWeight: '700', fontFamily: MONO, textAlign: 'center', marginTop: 1 },
  compCard: { backgroundColor: '#0D1117', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1A3A2A' },
  compCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  compId: { fontSize: 13, fontWeight: '800', color: '#00E5FF', fontFamily: MONO },
  compDesc: { fontSize: 11, color: '#9BA1A6', lineHeight: 16, marginBottom: 8 },
  compScores: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'space-between' },
  compScoreCol: { flex: 1 },
  compScoreLabel: { fontSize: 8, fontWeight: '600', color: '#6B8A7A', fontFamily: MONO, marginBottom: 1 },
  compScoreVal: { fontSize: 11, fontWeight: '700', fontFamily: MONO },
  changesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 6 },
  changeChip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, borderWidth: 1, backgroundColor: '#0A0E14' },
  changeChipText: { fontSize: 8, fontWeight: '600', fontFamily: MONO },
  matrixContainer: { marginBottom: 8 },
  matrixHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  matrixBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  matrixBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: MONO },
  matrixCount: { fontSize: 10, color: '#6B8A7A', fontFamily: MONO },
  matrixWrap: { flexDirection: 'row', alignItems: 'center' },
  yAxisLabel: { justifyContent: 'center', alignItems: 'center', height: 200 },
  axisText: { fontSize: 8, color: '#6B8A7A', fontFamily: MONO, letterSpacing: 1 },
  matrixRow: { flexDirection: 'row' },
  matrixLabel: { justifyContent: 'center', alignItems: 'center' },
  matrixLabelText: { fontSize: 9, color: '#6B8A7A', fontFamily: MONO },
  matrixCell: { margin: 1, borderRadius: 3, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  matrixCellText: { fontSize: 11, fontWeight: '800', fontFamily: MONO },
  xAxisLabel: { alignItems: 'center', marginTop: 2 },
  matrixGrid: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#0D1117', borderRadius: 12, borderWidth: 1, borderColor: '#1A3A2A', maxHeight: '80%', width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1A3A2A' },
  modalTitle: { fontSize: 14, fontWeight: '700', color: '#E0F0E0', fontFamily: MONO },
  modalSub: { fontSize: 10, color: '#6B8A7A', marginTop: 1, fontFamily: MONO },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A3A2A', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 12, color: '#E0F0E0', fontWeight: '700' },
  modalCard: { backgroundColor: '#0A0E14', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#1A3A2A' },
  modalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalIdText: { fontSize: 12, fontWeight: '800', fontFamily: MONO },
  modalBadges: { flexDirection: 'row', gap: 4 },
  pill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, borderWidth: 1 },
  pillText: { fontSize: 9, fontWeight: '700', fontFamily: MONO },
  modalDesc: { fontSize: 11, color: '#9BA1A6', lineHeight: 16, marginBottom: 6 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalMeta: { fontSize: 9, color: '#6B8A7A', fontFamily: MONO },
});
