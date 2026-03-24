import { FlatList, Text, View, TouchableOpacity, TextInput, StyleSheet, useWindowDimensions, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { useEngine } from "@/lib/engine-context";
import { getRiskLevel, getGutLevel, TIPOS_DE_RISCO } from "@/lib/models";
import type { Risk } from "@/lib/models";
import type { EnrichedRisk, RiskLayer } from "@/lib/risk-engine";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo, useCallback } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PulsingBadge } from "@/components/ui/pulsing-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import Animated, { FadeInDown } from "react-native-reanimated";

const MONO = Platform.OS === 'web' ? 'monospace' : undefined;

const LEVEL_COLORS: Record<string, string> = {
  'Crítico': '#FF3D3D', 'Alto': '#FF8C00', 'Médio': '#FFD600', 'Baixo': '#00FF88',
};
const BADGE_LEVEL_MAP: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  'Crítico': 'critical', 'Alto': 'high', 'Médio': 'medium', 'Baixo': 'low',
};
const APPETITE_COLORS = { acceptable: '#00FF88', tolerable: '#FFD600', intolerable: '#FF3D3D' };
const APPETITE_LABELS = { acceptable: 'Aceitável', tolerable: 'Tolerável', intolerable: 'Intolerável' };
const LAYER_COLORS: Record<RiskLayer, string> = { 'Regulatório': '#8B5CF6', 'Operacional': '#FF8C00', 'Estratégico': '#3B82F6', 'Reputacional': '#F43F5E' };

function abbreviateType(tipo: string): string {
  const map: Record<string, string> = {
    'Estratégico': 'Estratégico', 'Operacional': 'Operacional', 'Financeiro': 'Financeiro',
    'Conformidade (Regulatório e Legal)': 'Conformidade', 'Segurança da Informação (Cibernético)': 'Seg. Info.',
    'Tecnológico': 'Tecnológico', 'Reputacional': 'Reputacional', 'Ambiental e Climático': 'Ambiental',
    'Humano (Pessoas e Cultura Organizacional)': 'Humano / RH', 'Cadeia de Suprimentos': 'Cadeia Suprim.',
  };
  if (map[tipo]) return map[tipo];
  const cleaned = tipo.replace(/^Risco\s+/, '').replace(/^de\s+/, '');
  return map[cleaned] || (cleaned.length > 16 ? cleaned.substring(0, 14) + '…' : cleaned);
}

function abbreviateResp(resp: string): string {
  if (!resp) return '—';
  let short = resp.replace(/\s*\(Owner\)\.?/g, '').replace(/\.\s*Corresponsáveis:.*$/s, '').trim();
  return short.length > 40 ? short.substring(0, 38) + '…' : short;
}

function getTypeColor(tipo: string): string {
  const map: Record<string, string> = {
    'Estratégico': '#FF8C00', 'Operacional': '#00BFFF', 'Financeiro': '#FFD600', 'Conformidade': '#C084FC',
    'Seg. Info.': '#FF3D3D', 'Tecnológico': '#00E5FF', 'Reputacional': '#F472B6', 'Ambiental': '#22C55E',
    'Humano / RH': '#FB923C', 'Cadeia Suprim.': '#94A3B8',
  };
  return map[abbreviateType(tipo)] || '#6B8A7A';
}

type ViewMode = 'table' | 'heatmap' | 'clustering';
type SortField = 'rank' | 'composite' | 'inherent' | 'gut' | 'financial';

export default function RisksScreen() {
  const { risks, loading } = useRisks();
  const { enrichedRisks, config, portfolioMetrics } = useEngine();
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const filteredRisks = useMemo(() => {
    let result = [...enrichedRisks];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.id.toLowerCase().includes(q) || r.descricaoRisco.toLowerCase().includes(q) || r.fonteDeRisco.toLowerCase().includes(q));
    }
    if (filterType) result = result.filter(r => r.tipoRisco === filterType);
    if (filterLevel) result = result.filter(r => getRiskLevel(r.riscoInerente).label === filterLevel);

    switch (sortField) {
      case 'rank': return result.sort((a, b) => a.globalRank - b.globalRank);
      case 'composite': return result.sort((a, b) => b.compositeScore.total - a.compositeScore.total);
      case 'inherent': return result.sort((a, b) => b.riscoInerente - a.riscoInerente);
      case 'gut': return result.sort((a, b) => b.gutScore - a.gutScore);
      case 'financial': return result.sort((a, b) => (b.compositeScore.financialContribution - a.compositeScore.financialContribution));
      default: return result;
    }
  }, [enrichedRisks, search, filterType, filterLevel, sortField]);

  const pm = portfolioMetrics;

  // ============================================================
  // HEATMAP VIEW — 5x5 matrix with risk dots
  // ============================================================
  const renderHeatmap = () => {
    const matrix: EnrichedRisk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
    filteredRisks.forEach(r => {
      const p = Math.min(5, Math.max(1, r.probabilidade)) - 1;
      const i = Math.min(5, Math.max(1, r.impacto)) - 1;
      matrix[4 - i][p].push(r);
    });
    const cellColors = [
      ['#00FF8830', '#00FF8830', '#FFD60030', '#FFD60030', '#FF8C0030'],
      ['#00FF8830', '#FFD60030', '#FFD60030', '#FF8C0030', '#FF8C0030'],
      ['#FFD60030', '#FFD60030', '#FF8C0030', '#FF8C0030', '#FF3D3D30'],
      ['#FFD60030', '#FF8C0030', '#FF8C0030', '#FF3D3D30', '#FF3D3D30'],
      ['#FF8C0030', '#FF8C0030', '#FF3D3D30', '#FF3D3D30', '#FF3D3D30'],
    ];

    return (
      <View style={[st.heatmapContainer, { backgroundColor: '#0D1117', borderColor: '#1A3A2A' }]}>
        <Text style={[st.sectionTitle, { color: '#00E5FF', fontFamily: MONO }]}>HEATMAP — PROBABILIDADE × IMPACTO</Text>
        <Text style={[st.sectionDesc, { color: '#6B8A7A' }]}>Cada ponto representa um risco. Tamanho proporcional ao Composite Score.</Text>
        <View style={st.heatmapGrid}>
          {/* Y-axis label */}
          <View style={st.heatmapYAxis}>
            {[5, 4, 3, 2, 1].map(n => <Text key={n} style={[st.axisLabel, { color: '#6B8A7A', fontFamily: MONO }]}>{n}</Text>)}
          </View>
          <View style={{ flex: 1 }}>
            {matrix.map((row, ri) => (
              <View key={ri} style={st.heatmapRow}>
                {row.map((cell, ci) => (
                  <View key={ci} style={[st.heatmapCell, { backgroundColor: cellColors[ri][ci], borderColor: '#1A3A2A30' }]}>
                    {cell.map(r => {
                      const size = Math.max(10, Math.min(24, r.compositeScore.total / 4));
                      const appColor = APPETITE_COLORS[r.appetiteStatus];
                      return (
                        <TouchableOpacity key={r.id} onPress={() => setExpandedRisk(expandedRisk === r.id ? null : r.id)} activeOpacity={0.6}>
                          <View style={[st.heatmapDot, { width: size, height: size, borderRadius: size / 2, backgroundColor: appColor + '80', borderColor: appColor }]}>
                            <Text style={{ fontSize: 6, color: '#fff', fontWeight: '800', fontFamily: MONO }}>{r.id.replace('R0', '').replace('R', '')}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}
            {/* X-axis labels */}
            <View style={st.heatmapXAxis}>
              {[1, 2, 3, 4, 5].map(n => <Text key={n} style={[st.axisLabel, { color: '#6B8A7A', fontFamily: MONO, flex: 1, textAlign: 'center' }]}>{n}</Text>)}
            </View>
          </View>
        </View>
        <View style={st.heatmapLegend}>
          <Text style={{ color: '#6B8A7A', fontSize: 9, fontFamily: MONO }}>← PROBABILIDADE →</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {Object.entries(APPETITE_LABELS).map(([key, label]) => (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: APPETITE_COLORS[key as keyof typeof APPETITE_COLORS] }} />
                <Text style={{ color: '#6B8A7A', fontSize: 9, fontFamily: MONO }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
        {/* Expanded risk detail */}
        {expandedRisk && (() => {
          const r = filteredRisks.find(x => x.id === expandedRisk);
          if (!r) return null;
          return (
            <View style={[st.expandedDetail, { borderColor: APPETITE_COLORS[r.appetiteStatus] + '40', backgroundColor: APPETITE_COLORS[r.appetiteStatus] + '08' }]}>
              <Text style={{ color: '#00E5FF', fontSize: 12, fontWeight: '800', fontFamily: MONO }}>{r.id} — Rank #{r.globalRank}</Text>
              <Text style={{ color: '#E0F0E0', fontSize: 11, marginTop: 2 }} numberOfLines={2}>{r.descricaoRisco}</Text>
              <Text style={{ color: '#6B8A7A', fontSize: 10, fontFamily: MONO, marginTop: 4 }}>
                Composite: {r.compositeScore.total.toFixed(1)} | P×I: {r.riscoInerente} | GUT: {r.gutScore} | Controles: {r.controlEffectivenessScore}%
              </Text>
              <Text style={{ color: '#6B8A7A', fontSize: 9, fontFamily: MONO, marginTop: 2 }}>{r.compositeScore.formula}</Text>
            </View>
          );
        })()}
      </View>
    );
  };

  // ============================================================
  // CLUSTERING VIEW — by risk layer
  // ============================================================
  const renderClustering = () => {
    const layers: RiskLayer[] = ['Regulatório', 'Operacional', 'Estratégico', 'Reputacional'];
    return (
      <View style={{ gap: 8 }}>
        <Text style={[st.sectionTitle, { color: '#00E5FF', fontFamily: MONO, paddingHorizontal: 4 }]}>CLUSTERING POR CAMADA DE RISCO</Text>
        {layers.map(layer => {
          const layerRisks = filteredRisks.filter(r => r.riskLayer === layer);
          if (layerRisks.length === 0) return null;
          const avgScore = layerRisks.reduce((s, r) => s + r.compositeScore.total, 0) / layerRisks.length;
          const layerColor = LAYER_COLORS[layer];
          return (
            <View key={layer} style={[st.clusterCard, { borderColor: layerColor + '30', backgroundColor: '#0D1117' }]}>
              <View style={st.clusterHeader}>
                <View style={[st.clusterBadge, { backgroundColor: layerColor + '15' }]}>
                  <Text style={{ color: layerColor, fontSize: 11, fontWeight: '800', fontFamily: MONO }}>{layer.toUpperCase()}</Text>
                </View>
                <Text style={{ color: '#6B8A7A', fontSize: 10, fontFamily: MONO }}>{layerRisks.length} riscos | Média: {avgScore.toFixed(1)}</Text>
              </View>
              {layerRisks.map(r => {
                const appColor = APPETITE_COLORS[r.appetiteStatus];
                return (
                  <TouchableOpacity key={r.id} style={st.clusterRow} onPress={() => router.push(`/risk/${r.id}` as any)} activeOpacity={0.6}>
                    <Text style={{ color: '#00E5FF', fontSize: 10, fontWeight: '700', fontFamily: MONO, width: 36 }}>{r.id}</Text>
                    <View style={[st.clusterScoreBar, { backgroundColor: '#1A3A2A20' }]}>
                      <View style={{ width: `${Math.min(100, r.compositeScore.total)}%`, height: '100%', backgroundColor: appColor + '50', borderRadius: 2 }} />
                    </View>
                    <Text style={{ color: appColor, fontSize: 10, fontWeight: '800', fontFamily: MONO, width: 36, textAlign: 'right' }}>{r.compositeScore.total.toFixed(0)}</Text>
                    <Text style={{ color: '#E0F0E0', fontSize: 9, flex: 1, marginLeft: 6 }} numberOfLines={1}>{r.descricaoRisco}</Text>
                    {r.earlyWarnings.length > 0 && <View style={[st.warningDot, { backgroundColor: '#FF3D3D' }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  // ============================================================
  // TABLE VIEW — enhanced with engine data
  // ============================================================
  const renderDesktopTable = () => (
    <View style={[st.tableCard, { backgroundColor: '#0D1117', borderColor: '#1A3A2A' }]}>
      {/* Header row */}
      <View style={[st.tableHeaderRow, { borderBottomColor: '#00E5FF30', backgroundColor: '#0A1520' }]}>
        <View style={st.colRank}><Text style={[st.thCell, { color: '#00E5FF' }]}>#</Text></View>
        <View style={st.colId}><Text style={[st.thCell, { color: '#00E5FF' }]}>ID</Text></View>
        <View style={st.colDesc}><Text style={[st.thCell, { color: '#00E5FF' }]}>DESCRIÇÃO</Text></View>
        <View style={st.colLayer}><Text style={[st.thCell, { color: '#00E5FF', textAlign: 'center' }]}>CAMADA</Text></View>
        <View style={st.colComposite}>
          <TouchableOpacity onPress={() => setSortField(sortField === 'composite' ? 'rank' : 'composite')}>
            <Text style={[st.thCell, { color: sortField === 'composite' ? '#FFD600' : '#00E5FF', textAlign: 'center' }]}>SCORE{sortField === 'composite' ? ' ▼' : ''}</Text>
          </TouchableOpacity>
        </View>
        <View style={st.colPxi}>
          <TouchableOpacity onPress={() => setSortField(sortField === 'inherent' ? 'rank' : 'inherent')}>
            <Text style={[st.thCell, { color: sortField === 'inherent' ? '#FFD600' : '#00E5FF', textAlign: 'center' }]}>P×I{sortField === 'inherent' ? ' ▼' : ''}</Text>
          </TouchableOpacity>
        </View>
        <View style={st.colGut}>
          <TouchableOpacity onPress={() => setSortField(sortField === 'gut' ? 'rank' : 'gut')}>
            <Text style={[st.thCell, { color: sortField === 'gut' ? '#FFD600' : '#00E5FF', textAlign: 'center' }]}>GUT{sortField === 'gut' ? ' ▼' : ''}</Text>
          </TouchableOpacity>
        </View>
        <View style={st.colCtrl}><Text style={[st.thCell, { color: '#00E5FF', textAlign: 'center' }]}>CTRL</Text></View>
        <View style={st.colAppetite}><Text style={[st.thCell, { color: '#00E5FF', textAlign: 'center' }]}>STATUS</Text></View>
        <View style={st.colWarn}><Text style={[st.thCell, { color: '#00E5FF', textAlign: 'center' }]}>⚠</Text></View>
      </View>

      {/* Data rows */}
      {filteredRisks.map((risk, idx) => {
        const level = getRiskLevel(risk.riscoInerente);
        const levelColor = LEVEL_COLORS[level.label] || '#6B8A7A';
        const gutLevel = getGutLevel(risk.gutScore);
        const appColor = APPETITE_COLORS[risk.appetiteStatus];
        const layerColor = LAYER_COLORS[risk.riskLayer];
        const isEven = idx % 2 === 0;
        const isExpanded = expandedRisk === risk.id;

        return (
          <View key={risk.id}>
            <TouchableOpacity
              style={[st.tableRow, { borderBottomColor: '#1A3A2A20' }, isEven ? { backgroundColor: '#0A0E14' } : { backgroundColor: '#0D1218' }]}
              onPress={() => setExpandedRisk(isExpanded ? null : risk.id)}
              activeOpacity={0.55}
            >
              <View style={st.colRank}><Text style={[st.tdRank, { color: risk.globalRank <= 5 ? '#FF3D3D' : risk.globalRank <= 10 ? '#FF8C00' : '#6B8A7A' }]}>{risk.globalRank}</Text></View>
              <View style={st.colId}><Text style={st.tdId}>{risk.id}</Text></View>
              <View style={st.colDesc}><Text style={st.tdDesc} numberOfLines={2}>{risk.descricaoRisco}</Text></View>
              <View style={[st.colLayer, { alignItems: 'center' }]}>
                <View style={[st.layerBadge, { backgroundColor: layerColor + '15', borderColor: layerColor + '30' }]}>
                  <Text style={{ color: layerColor, fontSize: 7, fontWeight: '700', fontFamily: MONO }}>{risk.riskLayer.substring(0, 5).toUpperCase()}</Text>
                </View>
              </View>
              <View style={[st.colComposite, { alignItems: 'center' }]}>
                <View style={[st.compositeBadge, { backgroundColor: appColor + '15', borderColor: appColor + '40' }]}>
                  <Text style={{ color: appColor, fontSize: 11, fontWeight: '800', fontFamily: MONO }}>{risk.compositeScore.total.toFixed(0)}</Text>
                </View>
              </View>
              <View style={[st.colPxi, st.cellCenter]}>
                <View style={[st.scoreBadge, { backgroundColor: levelColor + '18', borderColor: levelColor + '40' }]}>
                  <Text style={[st.scoreText, { color: levelColor }]}>{risk.riscoInerente}</Text>
                </View>
              </View>
              <View style={[st.colGut, st.cellCenter]}>
                <View style={[st.gutBadge, { backgroundColor: gutLevel.color + '15', borderColor: gutLevel.color + '35' }]}>
                  <Text style={[st.gutText, { color: gutLevel.color }]}>{risk.gutScore}</Text>
                </View>
              </View>
              <View style={[st.colCtrl, st.cellCenter]}>
                <Text style={{ color: risk.controlEffectivenessScore >= 50 ? '#00FF88' : risk.controlEffectivenessScore >= 30 ? '#FFD600' : '#FF3D3D', fontSize: 10, fontWeight: '700', fontFamily: MONO }}>{risk.controlEffectivenessScore}%</Text>
              </View>
              <View style={[st.colAppetite, { alignItems: 'center' }]}>
                <View style={[st.appetiteBadge, { backgroundColor: appColor + '15', borderColor: appColor + '30' }]}>
                  <Text style={{ color: appColor, fontSize: 7, fontWeight: '700', fontFamily: MONO }}>{APPETITE_LABELS[risk.appetiteStatus].substring(0, 5).toUpperCase()}</Text>
                </View>
              </View>
              <View style={[st.colWarn, st.cellCenter]}>
                {risk.earlyWarnings.length > 0 && (
                  <View style={[st.warnBadge, { backgroundColor: '#FF3D3D20' }]}>
                    <Text style={{ color: '#FF3D3D', fontSize: 9, fontWeight: '800', fontFamily: MONO }}>{risk.earlyWarnings.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            {/* Expanded explainability row */}
            {isExpanded && (
              <View style={[st.expandRow, { backgroundColor: '#0A1520', borderBottomColor: '#00E5FF20' }]}>
                <View style={st.expandGrid}>
                  <View style={st.expandCol}>
                    <Text style={[st.expandLabel, { color: '#00E5FF' }]}>FÓRMULA</Text>
                    <Text style={[st.expandValue, { color: '#E0F0E0' }]}>{risk.compositeScore.formula}</Text>
                    <Text style={[st.expandLabel, { color: '#00E5FF', marginTop: 6 }]}>DRIVERS</Text>
                    {risk.compositeScore.drivers.map((d, i) => <Text key={i} style={[st.expandValue, { color: '#B0C8B8' }]}>• {d}</Text>)}
                  </View>
                  <View style={st.expandCol}>
                    <Text style={[st.expandLabel, { color: '#00E5FF' }]}>INDICADORES</Text>
                    {risk.indicators.slice(0, 3).map((ind, i) => (
                      <View key={i} style={st.indicatorRow}>
                        <View style={[st.indicatorDot, { backgroundColor: ind.status === 'critical' ? '#FF3D3D' : ind.status === 'warning' ? '#FFD600' : '#00FF88' }]} />
                        <Text style={{ color: '#B0C8B8', fontSize: 9, fontFamily: MONO, flex: 1 }}>{ind.name}</Text>
                        <Text style={{ color: ind.type === 'leading' ? '#00E5FF' : '#FF8C00', fontSize: 8, fontFamily: MONO }}>{ind.type.toUpperCase()}</Text>
                      </View>
                    ))}
                    {risk.earlyWarnings.length > 0 && (
                      <>
                        <Text style={[st.expandLabel, { color: '#FF3D3D', marginTop: 6 }]}>ALERTAS</Text>
                        {risk.earlyWarnings.slice(0, 2).map((w, i) => <Text key={i} style={{ color: '#FF8C00', fontSize: 8, lineHeight: 12 }}>⚠ {w}</Text>)}
                      </>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push(`/risk/${risk.id}` as any)} style={st.expandLink} activeOpacity={0.7}>
                  <Text style={{ color: '#00E5FF', fontSize: 10, fontWeight: '700', fontFamily: MONO }}>VER DETALHES COMPLETOS →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
      {filteredRisks.length === 0 && (
        <View style={st.emptyTable}><Text style={{ color: '#6B8A7A', fontSize: 14, fontFamily: MONO }}>NENHUM RISCO ENCONTRADO</Text></View>
      )}
    </View>
  );

  const renderMobileCard = useCallback(({ item }: { item: EnrichedRisk }) => {
    const appColor = APPETITE_COLORS[item.appetiteStatus];
    return (
      <TouchableOpacity style={[st.mobileCard, { backgroundColor: '#111820', borderColor: appColor + '30' }]} onPress={() => router.push(`/risk/${item.id}` as any)} activeOpacity={0.7}>
        <View style={st.mobileCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#6B8A7A', fontSize: 10, fontFamily: MONO }}>#{item.globalRank}</Text>
            <Text style={{ color: '#00E5FF', fontSize: 13, fontWeight: '700', fontFamily: MONO }}>{item.id}</Text>
          </View>
          <View style={[st.compositeBadge, { backgroundColor: appColor + '15', borderColor: appColor + '40' }]}>
            <Text style={{ color: appColor, fontSize: 12, fontWeight: '800', fontFamily: MONO }}>{item.compositeScore.total.toFixed(0)}</Text>
          </View>
        </View>
        <Text style={{ color: '#E0F0E0', fontSize: 13, lineHeight: 18, marginBottom: 6 }} numberOfLines={2}>{item.descricaoRisco}</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ color: '#6B8A7A', fontSize: 9, fontFamily: MONO }}>P×I:{item.riscoInerente}</Text>
          <Text style={{ color: '#6B8A7A', fontSize: 9, fontFamily: MONO }}>GUT:{item.gutScore}</Text>
          <Text style={{ color: '#6B8A7A', fontSize: 9, fontFamily: MONO }}>CTRL:{item.controlEffectivenessScore}%</Text>
          {item.earlyWarnings.length > 0 && <Text style={{ color: '#FF3D3D', fontSize: 9, fontFamily: MONO }}>⚠{item.earlyWarnings.length}</Text>}
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  if (loading) {
    return <ScreenContainer className="flex-1 items-center justify-center"><StatusIndicator status="monitoring" label="CARREGANDO DADOS..." /></ScreenContainer>;
  }

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={[st.header, isDesktop && st.headerDesktop]}>
        <View style={st.headerLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[st.pageTitle, { color: '#E0F0E0', fontFamily: MONO }]}>Análise de Riscos</Text>
            <StatusIndicator status="active" showLabel={false} />
          </View>
          <Text style={{ color: '#6B8A7A', fontSize: 10, fontFamily: MONO }}>
            {filteredRisks.length}/{enrichedRisks.length} riscos | Cenário: {config.scenarioMultipliers[config.scenario].label}
            {pm ? ` | Score Médio: ${pm.averageCompositeScore.toFixed(1)}` : ''}
          </Text>
        </View>
        {/* View mode switcher */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([['table', 'TABELA'], ['heatmap', 'HEATMAP'], ['clustering', 'CLUSTERS']] as [ViewMode, string][]).map(([mode, label]) => (
            <TouchableOpacity key={mode} onPress={() => setViewMode(mode)} style={[st.viewModeBtn, { borderColor: viewMode === mode ? '#00E5FF' : '#1A3A2A', backgroundColor: viewMode === mode ? '#00E5FF10' : 'transparent' }]} activeOpacity={0.7}>
              <Text style={{ color: viewMode === mode ? '#00E5FF' : '#6B8A7A', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Search & Filters */}
      <View style={[st.filtersArea, isDesktop && st.filtersAreaDesktop]}>
        <View style={[st.searchBox, { backgroundColor: '#111820', borderColor: '#1A3A2A' }]}>
          <IconSymbol name="magnifyingglass" size={16} color="#6B8A7A" />
          <TextInput style={[st.searchInput, { color: '#E0F0E0', fontFamily: MONO }]} placeholder="Buscar por ID, descrição, fonte..." placeholderTextColor="#6B8A7A" value={search} onChangeText={setSearch} returnKeyType="done" />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}><IconSymbol name="xmark" size={14} color="#6B8A7A" /></TouchableOpacity>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterChips}>
          {['Crítico', 'Alto', 'Médio', 'Baixo'].map(level => {
            const isActive = filterLevel === level;
            const chipColor = LEVEL_COLORS[level] || '#6B8A7A';
            return (
              <TouchableOpacity key={level} style={[st.chip, { borderColor: isActive ? chipColor : '#1A3A2A', backgroundColor: isActive ? chipColor + '20' : '#111820' }]} onPress={() => setFilterLevel(filterLevel === level ? null : level)} activeOpacity={0.7}>
                <View style={[st.chipDot, { backgroundColor: chipColor }]} />
                <Text style={[st.chipText, { color: isActive ? chipColor : '#6B8A7A', fontFamily: MONO }]}>{level}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={[st.chipDivider, { backgroundColor: '#1A3A2A' }]} />
          {TIPOS_DE_RISCO.slice(0, 6).map(tipo => {
            const isActive = filterType === tipo;
            return (
              <TouchableOpacity key={tipo} style={[st.chip, { borderColor: isActive ? '#00E5FF' : '#1A3A2A', backgroundColor: isActive ? '#00E5FF20' : '#111820' }]} onPress={() => setFilterType(filterType === tipo ? null : tipo)} activeOpacity={0.7}>
                <Text style={[st.chipText, { color: isActive ? '#00E5FF' : '#6B8A7A', fontFamily: MONO }]} numberOfLines={1}>{abbreviateType(tipo)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isDesktop ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[st.tableArea, isDesktop && st.tableAreaDesktop]}>
          {viewMode === 'heatmap' ? renderHeatmap() : viewMode === 'clustering' ? renderClustering() : renderDesktopTable()}
          <View style={{ height: 20 }} />
        </ScrollView>
      ) : (
        <FlatList data={filteredRisks} renderItem={renderMobileCard} keyExtractor={item => item.id} contentContainerStyle={st.mobileList}
          ListEmptyComponent={<View style={st.emptyTable}><Text style={{ color: '#6B8A7A', fontSize: 14, fontFamily: MONO }}>NENHUM RISCO ENCONTRADO</Text></View>} />
      )}
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { paddingHorizontal: 14, paddingTop: 4 },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  viewModeBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4, borderWidth: 1 },
  filtersArea: { paddingHorizontal: 10, marginBottom: 2 },
  filtersAreaDesktop: { paddingHorizontal: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, gap: 6, marginBottom: 3 },
  searchInput: { flex: 1, fontSize: 11 },
  filterChips: { flexDirection: 'row', gap: 3, paddingBottom: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.3 },
  chipDivider: { width: 1, marginHorizontal: 3, alignSelf: 'stretch' },
  tableArea: { paddingHorizontal: 4 },
  tableAreaDesktop: { paddingHorizontal: 8 },
  tableCard: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 3, paddingVertical: 5, borderBottomWidth: 2, alignItems: 'center' },
  thCell: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, fontFamily: 'monospace' },
  colRank: { width: 24, paddingHorizontal: 1 },
  colId: { width: 34, paddingHorizontal: 1 },
  colDesc: { flex: 3, paddingHorizontal: 2 },
  colLayer: { width: 48, paddingHorizontal: 1 },
  colComposite: { width: 42, paddingHorizontal: 1 },
  colPxi: { width: 30, paddingHorizontal: 1 },
  colGut: { width: 30, paddingHorizontal: 1 },
  colCtrl: { width: 34, paddingHorizontal: 1 },
  colAppetite: { width: 46, paddingHorizontal: 1 },
  colWarn: { width: 22, paddingHorizontal: 1 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 3, paddingVertical: 3, borderBottomWidth: 1, alignItems: 'center', minHeight: 32 },
  cellCenter: { justifyContent: 'center', alignItems: 'center' },
  tdRank: { fontSize: 10, fontWeight: '800', fontFamily: 'monospace', textAlign: 'center' },
  tdId: { fontSize: 9, fontWeight: '700', fontFamily: 'monospace', color: '#00E5FF' },
  tdDesc: { fontSize: 9, lineHeight: 13, color: '#E0F0E0' },
  layerBadge: { paddingHorizontal: 3, paddingVertical: 2, borderRadius: 3, borderWidth: 1 },
  compositeBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, minWidth: 30, alignItems: 'center' },
  scoreBadge: { paddingHorizontal: 3, paddingVertical: 2, borderRadius: 3, borderWidth: 1, minWidth: 24, alignItems: 'center' },
  scoreText: { fontSize: 10, fontWeight: '800', fontFamily: 'monospace' },
  gutBadge: { paddingHorizontal: 3, paddingVertical: 2, borderRadius: 3, borderWidth: 1, minWidth: 24, alignItems: 'center' },
  gutText: { fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },
  appetiteBadge: { paddingHorizontal: 3, paddingVertical: 2, borderRadius: 3, borderWidth: 1 },
  warnBadge: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  expandRow: { paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1 },
  expandGrid: { flexDirection: 'row', gap: 16 },
  expandCol: { flex: 1 },
  expandLabel: { fontSize: 9, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 2 },
  expandValue: { fontSize: 9, lineHeight: 13, fontFamily: 'monospace' },
  expandLink: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1A3A2A30' },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  indicatorDot: { width: 5, height: 5, borderRadius: 3 },
  emptyTable: { padding: 30, alignItems: 'center' },
  mobileList: { paddingHorizontal: 12, paddingBottom: 80 },
  mobileCard: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6 },
  mobileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  // Heatmap styles
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  sectionDesc: { fontSize: 10, marginBottom: 8 },
  heatmapContainer: { borderWidth: 1, borderRadius: 8, padding: 10 },
  heatmapGrid: { flexDirection: 'row' },
  heatmapYAxis: { width: 16, justifyContent: 'space-around', alignItems: 'center' },
  axisLabel: { fontSize: 9, fontWeight: '600' },
  heatmapRow: { flexDirection: 'row', flex: 1 },
  heatmapCell: { flex: 1, aspectRatio: 1, borderWidth: 0.5, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 2, padding: 2 },
  heatmapDot: { borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  heatmapXAxis: { flexDirection: 'row', marginTop: 2 },
  heatmapLegend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  expandedDetail: { marginTop: 8, padding: 8, borderWidth: 1, borderRadius: 6 },
  // Clustering styles
  clusterCard: { borderWidth: 1, borderRadius: 8, padding: 8, marginHorizontal: 4 },
  clusterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  clusterBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  clusterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3 },
  clusterScoreBar: { width: 60, height: 6, borderRadius: 3, overflow: 'hidden' },
  warningDot: { width: 6, height: 6, borderRadius: 3 },
});
