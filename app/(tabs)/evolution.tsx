import { Text, View, ScrollView, TouchableOpacity, FlatList, Modal, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useState, useCallback, useMemo, useEffect} from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlowCard } from "@/components/ui/glow-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { RISKS_AULA3, RISKS_AULA4, RISKS_AULA5, RISKS_AULA6, EVOLUTION_3_TO_4, EVOLUTION_4_TO_5, EVOLUTION_5_TO_6, EVOLUTION_3_TO_6, AULA_RISK_COUNTS } from "@/lib/evolution-data";
import { getRiskLevel, getGutLevel, Risk } from "@/lib/models";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useWizard } from "@/components/wizard-overlay";

type ViewMode = 'overview' | 'comparison' | 'matrix';
type CompareMode = '3v4' | '4v5' | '5v6' | '3v6';
type FilterState = { title: string; risks: Risk[]; source?: string } | null;

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

// Compute stats for each aula
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
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [compareMode, setCompareMode] = useState<CompareMode>('5v6');
  const [activeFilter, setActiveFilter] = useState<FilterState>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const fromAula = compareMode[0] as '3' | '4' | '5' | '6';
  const toAula = compareMode[2] as '3' | '4' | '5' | '6';
  const fromData = getAulaData(fromAula);
  const toData = getAulaData(toAula);
  const evolution = useMemo(() => getEvolution(compareMode), [compareMode]);

  const { triggerWizard } = useWizard();
  useEffect(() => { triggerWizard('evolution'); }, []);

  const newRisks = evolution.filter(e => e.type === 'new');
  const modifiedRisks = evolution.filter(e => e.type === 'modified');
  const unchangedRisks = evolution.filter(e => e.type === 'unchanged');

  const stats3 = useMemo(() => getAulaStats(RISKS_AULA3), []);
  const stats4 = useMemo(() => getAulaStats(RISKS_AULA4), []);
  const stats5 = useMemo(() => getAulaStats(RISKS_AULA5), []);
  const stats6 = useMemo(() => getAulaStats(RISKS_AULA6), []);

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
              contentContainerStyle={{ padding: 16 }}
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

  // ---- EVOLUTION CHART (Bar Chart) ----
  const renderEvolutionChart = () => {
    const aulaData = [
      { label: 'Aula 3', color: AULA_COLORS['3'], stats: stats3, officialCount: AULA_RISK_COUNTS.aula3 },
      { label: 'Aula 4', color: AULA_COLORS['4'], stats: stats4, officialCount: AULA_RISK_COUNTS.aula4 },
      { label: 'Aula 5', color: AULA_COLORS['5'], stats: stats5, officialCount: AULA_RISK_COUNTS.aula5 },
      { label: 'Aula 6', color: AULA_COLORS['6'], stats: stats6, officialCount: AULA_RISK_COUNTS.aula6 },
    ];
    const maxTotal = Math.max(...aulaData.map(a => a.officialCount));
    const chartHeight = 200;

    return (
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <GlowCard variant="default">
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>EVOLUÇÃO DO PROJETO</Text>
            <StatusIndicator status="monitoring" label="TIMELINE" />
          </View>

          {/* Bar Chart - Total de Riscos */}
          <Text style={s.chartSubtitle}>Total de Riscos Mapeados por Fase</Text>
          <View style={s.chartContainer}>
            <View style={s.chartYAxis}>
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
                      <View style={[s.chartBar, {
                        height: barHeight,
                        backgroundColor: aula.color + '30',
                        borderColor: aula.color,
                        borderWidth: 1,
                        ...(Platform.OS === 'web' ? {
                          shadowColor: aula.color,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 8,
                        } : {}),
                      }]}>
                        <Text style={[s.chartBarValue, { color: aula.color }]}>{aula.officialCount}</Text>
                      </View>
                    </View>
                    <Text style={[s.chartBarLabel, { color: aula.color }]}>{aula.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Stacked Distribution */}
          <Text style={[s.chartSubtitle, { marginTop: 24 }]}>Distribuição por Nível de Risco</Text>
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
            {[
              { label: 'Crítico', color: '#FF3D3D' },
              { label: 'Alto', color: '#FF8C00' },
              { label: 'Médio', color: '#FFD600' },
              { label: 'Baixo', color: '#00FF88' },
            ].map(item => (
              <View key={item.label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: item.color }]} />
                <Text style={s.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* GUT Evolution Line */}
          <Text style={[s.chartSubtitle, { marginTop: 24 }]}>Evolução do GUT Médio</Text>
          <View style={s.gutLineContainer}>
            {aulaData.map((aula, idx) => (
              <View key={idx} style={s.gutLineCol}>
                <Text style={[s.gutLineValue, { color: aula.color }]}>{aula.stats.avgGUT.toFixed(0)}</Text>
                <View style={[s.gutLineDot, { backgroundColor: aula.color, borderColor: aula.color }]} />
                {idx < aulaData.length - 1 && <View style={[s.gutLineConnector, { backgroundColor: '#1A3A2A' }]} />}
                <Text style={[s.gutLineLabel, { color: aula.color }]}>{aula.label}</Text>
              </View>
            ))}
          </View>

          {/* Maturity Indicators */}
          <Text style={[s.chartSubtitle, { marginTop: 24 }]}>Indicadores de Maturidade (Aula 6)</Text>
          <View style={s.maturityGrid}>
            <View style={s.maturityItem}>
              <Text style={s.maturityLabel}>Controles Definidos</Text>
              <View style={s.maturityBarTrack}>
                <View style={[s.maturityBarFill, { width: `${(stats6.comControles / stats6.total) * 100}%`, backgroundColor: '#00FF88' }]} />
              </View>
              <Text style={[s.maturityValue, { color: '#00FF88' }]}>{stats6.comControles}/{stats6.total}</Text>
            </View>
            <View style={s.maturityItem}>
              <Text style={s.maturityLabel}>KRI Definidos</Text>
              <View style={s.maturityBarTrack}>
                <View style={[s.maturityBarFill, { width: `${(stats6.comKRI / stats6.total) * 100}%`, backgroundColor: '#00E5FF' }]} />
              </View>
              <Text style={[s.maturityValue, { color: '#00E5FF' }]}>{stats6.comKRI}/{stats6.total}</Text>
            </View>
            <View style={s.maturityItem}>
              <Text style={s.maturityLabel}>P×I Médio</Text>
              <View style={s.maturityBarTrack}>
                <View style={[s.maturityBarFill, { width: `${(stats6.avgPxI / 25) * 100}%`, backgroundColor: '#FFD600' }]} />
              </View>
              <Text style={[s.maturityValue, { color: '#FFD600' }]}>{stats6.avgPxI.toFixed(1)}/25</Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>
    );
  };

  // ---- OVERVIEW VIEW ----
  const renderOverviewView = () => (
    <View style={s.section}>
      {/* Evolution Chart */}
      {renderEvolutionChart()}

      {/* Timeline */}
      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <GlowCard variant="default">
          <Text style={s.cardTitle}>TIMELINE DO PROJETO</Text>
          <View style={{ marginTop: 16 }}>
            {[
              { aula: '3', title: 'Identificação Inicial', desc: `${AULA_RISK_COUNTS.aula3} riscos identificados e classificados na Forma 3`, color: AULA_COLORS['3'], details: `${stats3.critico} críticos, ${stats3.alto} altos, ${stats3.medio} médios, ${stats3.baixo} baixos` },
              { aula: '4', title: 'Revisão e Expansão', desc: `${AULA_RISK_COUNTS.aula4} riscos com avaliação GUT revisada pela Vetor Horizon`, color: AULA_COLORS['4'], details: `+${AULA_RISK_COUNTS.aula4 - AULA_RISK_COUNTS.aula3} novos riscos, GUT médio: ${stats4.avgGUT.toFixed(0)}` },
              { aula: '5', title: 'Maturidade e Detalhamento', desc: `${AULA_RISK_COUNTS.aula5} riscos com controles, KRI e eficácia detalhados`, color: AULA_COLORS['5'], details: `+${AULA_RISK_COUNTS.aula5 - AULA_RISK_COUNTS.aula4} novos riscos, ${stats5.comControles} com controles, ${stats5.comKRI} com KRI` },
              { aula: '6', title: 'Apresentação Final', desc: `${AULA_RISK_COUNTS.aula6} riscos — Entrega do relatório completo ao Board da DAMACORP`, color: AULA_COLORS['6'], details: `+${AULA_RISK_COUNTS.aula6 - AULA_RISK_COUNTS.aula5} novos riscos, ${stats6.comControles} com controles, modelo ICAPT v5 completo` },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={s.timelineItem}
                onPress={() => setExpandedRisk(expandedRisk === item.aula ? null : item.aula)}
                activeOpacity={0.7}
              >
                <View style={s.timelineDotCol}>
                  <View style={[s.timelineDot, { backgroundColor: item.color, borderColor: item.color }]} />
                  {idx < 3 && <View style={[s.timelineLine, { backgroundColor: '#1A3A2A' }]} />}
                </View>
                <View style={s.timelineContent}>
                  <View style={s.timelineHeader}>
                    <View style={[s.timelineBadge, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
                      <Text style={[s.timelineBadgeText, { color: item.color }]}>
                        AULA {item.aula}
                      </Text>
                    </View>
                    <Text style={s.timelineTitle}>{item.title}</Text>
                  </View>
                  <Text style={s.timelineDesc}>{item.desc}</Text>
                  {expandedRisk === item.aula && (
                    <View style={[s.timelineExpanded, { borderColor: item.color + '30' }]}>
                      <Text style={[s.timelineExpandedText, { color: item.color }]}>{item.details}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </GlowCard>
      </Animated.View>

      {/* Summary Stats */}
      <Animated.View entering={FadeInDown.duration(500).delay(400)}>
        <View style={[s.statsGrid, isDesktop && s.statsGridDesktop]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => handleStatGroupPress('new', `Novos na ${toData.label} (${newRisks.length})`)} activeOpacity={0.7}>
            <GlowCard variant="default">
              <View style={s.statInner}>
                <View style={[s.statIconBg, { backgroundColor: '#00FF8820' }]}>
                  <IconSymbol name="plus.circle.fill" size={20} color="#00FF88" />
                </View>
                <AnimatedCounter value={newRisks.length} color="#00FF88" fontSize={32} />
                <Text style={s.statLabel}>NOVOS RISCOS</Text>
                <Text style={s.statHint}>CLIQUE PARA VER →</Text>
              </View>
            </GlowCard>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => handleStatGroupPress('modified', `Revisados (${modifiedRisks.length})`)} activeOpacity={0.7}>
            <GlowCard variant="default">
              <View style={s.statInner}>
                <View style={[s.statIconBg, { backgroundColor: '#FFD60020' }]}>
                  <IconSymbol name="pencil" size={20} color="#FFD600" />
                </View>
                <AnimatedCounter value={modifiedRisks.length} color="#FFD600" fontSize={32} />
                <Text style={s.statLabel}>REVISADOS</Text>
                <Text style={[s.statHint, { color: '#FFD60080' }]}>CLIQUE PARA VER →</Text>
              </View>
            </GlowCard>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <GlowCard variant="default">
              <View style={s.statInner}>
                <View style={[s.statIconBg, { backgroundColor: '#6B8A7A20' }]}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color="#6B8A7A" />
                </View>
                <AnimatedCounter value={unchangedRisks.length} color="#6B8A7A" fontSize={32} />
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
                <View style={[s.tdCell, s.thId]}>
                  <Text style={s.tdId}>{rid}</Text>
                </View>
                <View style={[s.tdCell, s.thDesc, { minWidth: 0 }]}>
                  <Text style={s.tdDesc} numberOfLines={2}>{risk.descricaoRisco}</Text>
                </View>
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
                <View style={[s.tdCell, s.thVal]}>
                  <Text style={s.gutText}>{rFrom ? rFrom.gutScore : '—'}</Text>
                </View>
                <View style={[s.tdCell, s.thVal]}>
                  <Text style={s.gutText}>{rTo ? rTo.gutScore : '—'}</Text>
                </View>
                <View style={[s.tdCell, s.thStatus]}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  {pxiDelta !== null && pxiDelta !== 0 && (
                    <Text style={[s.deltaText, { color: pxiDelta > 0 ? '#FF3D3D' : '#00FF88' }]}>
                      {pxiDelta > 0 ? `+${pxiDelta}` : pxiDelta}
                    </Text>
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
                  <Text style={[s.compScoreVal, { color: levelFrom?.color || '#6B8A7A' }]}>
                    {rFrom ? `PxI ${rFrom.riscoInerente} | GUT ${rFrom.gutScore}` : '—'}
                  </Text>
                </View>
                <Text style={{ color: '#6B8A7A', fontSize: 16 }}>→</Text>
                <View style={s.compScoreCol}>
                  <Text style={s.compScoreLabel}>{toData.label}</Text>
                  <Text style={[s.compScoreVal, { color: levelTo?.color || '#6B8A7A' }]}>
                    {rTo ? `PxI ${rTo.riscoInerente} | GUT ${rTo.gutScore}` : '—'}
                  </Text>
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
      const cellSize = isDesktop ? 80 : 52;
      const labelW = isDesktop ? 28 : 18;
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
                      <TouchableOpacity
                        key={colIdx}
                        style={[s.matrixCell, {
                          width: cellSize, height: cellSize,
                          backgroundColor: hasRisks ? cellColor + '25' : '#0A0E1440',
                          borderColor: hasRisks ? cellColor + '60' : '#1A3A2A',
                        }]}
                        onPress={() => handleCellPress(prob, imp, cell, source)}
                        activeOpacity={hasRisks ? 0.6 : 1}
                      >
                        {hasRisks && (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={[s.matrixCellText, { color: cellColor }]}>{cell.length}</Text>
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
              <View style={s.xAxisLabel}>
                <Text style={s.axisText}>Impacto</Text>
              </View>
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
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
          <View style={s.headerLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={s.pageTitle}>Evolução do Projeto</Text>
              <StatusIndicator status="monitoring" label="LIVE" />
            </View>
            <Text style={s.pageSubtitle}>
              Aula 3 ({AULA_RISK_COUNTS.aula3}) → Aula 4 ({AULA_RISK_COUNTS.aula4}) → Aula 5 ({AULA_RISK_COUNTS.aula5}) → Aula 6 ({AULA_RISK_COUNTS.aula6})
            </Text>
          </View>
        </Animated.View>

        {/* View Mode Selector */}
        <View style={s.viewSelector}>
          {([
            { key: 'overview' as ViewMode, label: 'Visão Geral', icon: 'chart.line.uptrend.xyaxis' as const },
            { key: 'comparison' as ViewMode, label: 'Comparativo', icon: 'tablecells' as const },
            { key: 'matrix' as ViewMode, label: 'Matrizes', icon: 'square.grid.2x2.fill' as const },
          ]).map(item => (
            <TouchableOpacity
              key={item.key}
              style={[s.viewSelectorBtn, viewMode === item.key && s.viewSelectorBtnActive]}
              onPress={() => setViewMode(item.key)}
              activeOpacity={0.7}
            >
              <IconSymbol name={item.icon} size={16} color={viewMode === item.key ? '#00E5FF' : '#6B8A7A'} />
              <Text style={[s.viewSelectorLabel, viewMode === item.key && s.viewSelectorLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Compare Selector (for comparison and matrix views) */}
        {(viewMode === 'comparison' || viewMode === 'matrix') && (
          <View style={s.compareSelector}>
            {([
              { key: '3v4' as CompareMode, label: 'Aula 3 → 4' },
              { key: '4v5' as CompareMode, label: 'Aula 4 → 5' },
              { key: '5v6' as CompareMode, label: 'Aula 5 → 6' },
              { key: '3v6' as CompareMode, label: 'Aula 3 → 6' },
            ]).map(item => (
              <TouchableOpacity
                key={item.key}
                style={[s.compareSelectorBtn, compareMode === item.key && s.compareSelectorBtnActive]}
                onPress={() => setCompareMode(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.compareSelectorLabel, compareMode === item.key && s.compareSelectorLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {viewMode === 'overview' && renderOverviewView()}
        {viewMode === 'comparison' && renderComparisonView()}
        {viewMode === 'matrix' && renderMatrixView()}

        <View style={{ height: 40 }} />
      </ScrollView>
      {renderRiskModal()}
    </ScreenContainer>
  );
}

const MONO = Platform.OS === 'web' ? 'monospace' : undefined;

const s = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  scrollContentDesktop: { maxWidth: 1280, alignSelf: 'center' as any, width: '100%' as any },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 1, color: '#E0F0E0', fontFamily: MONO },
  pageSubtitle: { fontSize: 12, marginTop: 4, letterSpacing: 0.5, color: '#6B8A7A', fontFamily: MONO },

  // View Selector
  viewSelector: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 12, backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#1A3A2A', padding: 4, gap: 4 },
  viewSelectorBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  viewSelectorBtnActive: { backgroundColor: '#00E5FF15' },
  viewSelectorLabel: { fontSize: 12, fontWeight: '600', color: '#6B8A7A', fontFamily: MONO },
  viewSelectorLabelActive: { color: '#00E5FF' },

  // Compare Selector
  compareSelector: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  compareSelectorBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#1A3A2A' },
  compareSelectorBtnActive: { backgroundColor: '#00E5FF15', borderColor: '#00E5FF40' },
  compareSelectorLabel: { fontSize: 11, fontWeight: '600', color: '#6B8A7A', fontFamily: MONO },
  compareSelectorLabelActive: { color: '#00E5FF' },

  section: { paddingHorizontal: 24, gap: 16 },

  // Card
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, color: '#00E5FF', fontFamily: MONO },

  // Chart
  chartSubtitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: '#6B8A7A', marginBottom: 12, fontFamily: MONO },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  chartYAxis: { justifyContent: 'space-between', height: 200, paddingBottom: 4 },
  chartYLabel: { fontSize: 9, color: '#6B8A7A', fontFamily: MONO, textAlign: 'right' },
  chartBars: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  chartBarCol: { alignItems: 'center', flex: 1 },
  chartBarWrapper: { justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  chartBar: { width: '70%', borderRadius: 4, alignItems: 'center', justifyContent: 'center', minHeight: 24 },
  chartBarValue: { fontSize: 14, fontWeight: '800', fontFamily: MONO },
  chartBarLabel: { fontSize: 10, fontWeight: '600', marginTop: 6, fontFamily: MONO },

  // Stacked
  stackedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  stackedLabel: { width: 50, fontSize: 10, fontWeight: '600', fontFamily: MONO },
  stackedBarTrack: { flex: 1, height: 16, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#0A0E14' },
  stackedSegment: { height: '100%' },
  stackedTotal: { width: 28, fontSize: 10, fontWeight: '700', color: '#E0F0E0', textAlign: 'right', fontFamily: MONO },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#6B8A7A', fontFamily: MONO },

  // GUT Line
  gutLineContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 16 },
  gutLineCol: { alignItems: 'center', flex: 1 },
  gutLineValue: { fontSize: 20, fontWeight: '800', fontFamily: MONO },
  gutLineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginVertical: 6 },
  gutLineConnector: { position: 'absolute', right: -20, top: 36, width: 40, height: 2 },
  gutLineLabel: { fontSize: 10, fontWeight: '600', fontFamily: MONO },

  // Maturity
  maturityGrid: { gap: 12 },
  maturityItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  maturityLabel: { width: 120, fontSize: 10, color: '#6B8A7A', fontFamily: MONO },
  maturityBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#0A0E14' },
  maturityBarFill: { height: '100%', borderRadius: 4 },
  maturityValue: { width: 50, fontSize: 10, fontWeight: '700', textAlign: 'right', fontFamily: MONO },

  // Timeline
  timelineItem: { flexDirection: 'row', marginBottom: 4 },
  timelineDotCol: { alignItems: 'center', width: 28 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  timelineBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  timelineBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: MONO },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: '#E0F0E0' },
  timelineDesc: { fontSize: 12, color: '#9BA1A6', lineHeight: 18 },
  timelineExpanded: { marginTop: 8, padding: 10, borderRadius: 6, borderWidth: 1, backgroundColor: '#0A0E1480' },
  timelineExpandedText: { fontSize: 11, fontFamily: MONO, lineHeight: 18 },

  // Stats Grid
  statsGrid: { flexDirection: 'column', gap: 12, marginTop: 8 },
  statsGridDesktop: { flexDirection: 'row' },
  statInner: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  statIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#6B8A7A', fontFamily: MONO },
  statHint: { fontSize: 9, color: '#00FF8880', fontFamily: MONO },

  // Table (Desktop)
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#0A0E14', borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: '#1A3A2A' },
  thCell: { fontWeight: '700', fontSize: 10, color: '#6B8A7A', fontFamily: MONO, letterSpacing: 0.5 },
  thId: { width: 60 },
  thDesc: { flex: 1, minWidth: 200 },
  thVal: { width: 80, textAlign: 'center' as any },
  thStatus: { width: 100, textAlign: 'center' as any },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 4, borderBottomWidth: 1, borderBottomColor: '#1A3A2A20' },
  tdCell: { justifyContent: 'center' },
  tdId: { fontSize: 12, fontWeight: '700', color: '#00E5FF', fontFamily: MONO },
  tdDesc: { fontSize: 11, color: '#9BA1A6', lineHeight: 16 },
  scoreBox: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, alignSelf: 'center' },
  scoreBoxText: { fontSize: 13, fontWeight: '800', fontFamily: MONO, textAlign: 'center' },
  naText: { fontSize: 12, color: '#6B8A7A', textAlign: 'center', fontFamily: MONO },
  gutText: { fontSize: 12, fontWeight: '600', color: '#9BA1A6', textAlign: 'center', fontFamily: MONO },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, alignSelf: 'center' },
  statusText: { fontSize: 9, fontWeight: '700', fontFamily: MONO },
  deltaText: { fontSize: 10, fontWeight: '700', fontFamily: MONO, textAlign: 'center', marginTop: 2 },

  // Comparison Cards (Mobile)
  compCard: { backgroundColor: '#0D1117', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1A3A2A' },
  compCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compId: { fontSize: 14, fontWeight: '800', color: '#00E5FF', fontFamily: MONO },
  compDesc: { fontSize: 12, color: '#9BA1A6', lineHeight: 18, marginBottom: 10 },
  compScores: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  compScoreCol: { flex: 1 },
  compScoreLabel: { fontSize: 9, fontWeight: '600', color: '#6B8A7A', fontFamily: MONO, marginBottom: 2 },
  compScoreVal: { fontSize: 12, fontWeight: '700', fontFamily: MONO },
  changesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  changeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, backgroundColor: '#0A0E14' },
  changeChipText: { fontSize: 9, fontWeight: '600', fontFamily: MONO },

  // Matrix
  matrixContainer: { marginBottom: 20 },
  matrixHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  matrixBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  matrixBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: MONO },
  matrixCount: { fontSize: 11, color: '#6B8A7A', fontFamily: MONO },
  matrixWrap: { flexDirection: 'row', alignItems: 'center' },
  yAxisLabel: { justifyContent: 'center', alignItems: 'center', height: 260 },
  axisText: { fontSize: 9, color: '#6B8A7A', fontFamily: MONO, letterSpacing: 1 },
  matrixRow: { flexDirection: 'row' },
  matrixLabel: { justifyContent: 'center', alignItems: 'center' },
  matrixLabelText: { fontSize: 10, color: '#6B8A7A', fontFamily: MONO },
  matrixCell: { margin: 1, borderRadius: 4, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  matrixCellText: { fontSize: 14, fontWeight: '800', fontFamily: MONO },
  xAxisLabel: { alignItems: 'center', marginTop: 4 },
  matrixGrid: { flexDirection: 'row', gap: 24, justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#0D1117', borderRadius: 16, borderWidth: 1, borderColor: '#1A3A2A', maxHeight: '80%', width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A3A2A' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#E0F0E0', fontFamily: MONO },
  modalSub: { fontSize: 11, color: '#6B8A7A', marginTop: 2, fontFamily: MONO },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A3A2A', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: '#E0F0E0', fontWeight: '700' },
  modalCard: { backgroundColor: '#0A0E14', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1A3A2A' },
  modalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalIdText: { fontSize: 14, fontWeight: '800', fontFamily: MONO },
  modalBadges: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: '700', fontFamily: MONO },
  modalDesc: { fontSize: 12, color: '#9BA1A6', lineHeight: 18, marginBottom: 8 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalMeta: { fontSize: 10, color: '#6B8A7A', fontFamily: MONO },
});
