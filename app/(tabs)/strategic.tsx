import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions, Modal, Platform } from "react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { useEngine } from "@/lib/engine-context";
import { getRiskLevel, getGutLevel, Risk } from "@/lib/models";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlowCard } from "@/components/ui/glow-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { FINANCIAL_DATA } from "@/lib/financial-data";
import Animated, { FadeInDown } from "react-native-reanimated";

const MONO = Platform.OS === 'web' ? 'monospace' : undefined;
const NEON = { bg: '#0A0E14', card: '#0D1117', cardBorder: '#1A3A2A', cyan: '#00E5FF', green: '#00FF88', text: '#E0F0E0', muted: '#6B8A7A' };

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  arr.forEach(item => { const key = fn(item); if (!result[key]) result[key] = []; result[key].push(item); });
  return result;
}

function treatmentColor(t: string): string {
  if (t.includes('Mitigar') && t.includes('Transferir')) return '#A855F7';
  if (t.includes('Mitigar') && t.includes('Evitar')) return '#FF6B6B';
  if (t.includes('Mitigar') && t.includes('Aceitar')) return '#00E5FF';
  if (t.includes('Mitigar')) return '#3B82F6';
  if (t.includes('Transferir')) return '#FFD600';
  if (t.includes('Evitar')) return '#FF3D3D';
  if (t.includes('Aceitar')) return '#00FF88';
  return '#6B8A7A';
}

function formatBRL(v: number) {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

export default function StrategicScreen() {
  const { risks } = useRisks();
  const { enrichedRisks, portfolioMetrics, config, simulateRiskMitigation } = useEngine();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [selectedRisks, setSelectedRisks] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'default' | 'investment' | 'impact' | 'whatif'>('default');
  const [whatIfRisk, setWhatIfRisk] = useState<string | null>(null);
  const [whatIfLevel, setWhatIfLevel] = useState(50);

  const stats = useMemo(() => {
    const levels = risks.map(r => getRiskLevel(r.riscoInerente).label);
    const critico = levels.filter(l => l === 'Crítico').length;
    const alto = levels.filter(l => l === 'Alto').length;
    const medio = levels.filter(l => l === 'Médio').length;
    const baixo = levels.filter(l => l === 'Baixo' || l === 'Muito Baixo').length;
    const exposureScore = risks.reduce((sum, r) => sum + r.riscoInerente, 0);
    const maxExposure = risks.length * 25;
    const exposurePct = maxExposure > 0 ? Math.round((exposureScore / maxExposure) * 100) : 0;
    const avgGut = risks.length > 0 ? Math.round(risks.reduce((s, r) => s + r.gutScore, 0) / risks.length) : 0;
    const withControls = risks.filter(r => r.controles && r.controles.trim().length > 10).length;
    const controlPct = risks.length > 0 ? Math.round((withControls / risks.length) * 100) : 0;
    const strategic = risks.filter(r => r.estrategico === 'SIM').length;
    const strategicPct = risks.length > 0 ? Math.round((strategic / risks.length) * 100) : 0;
    const tprm = risks.filter(r =>
      r.fonteDeRisco.includes('Fornecedores') || r.tipoRisco.includes('Cadeia') ||
      r.descricaoRisco.toLowerCase().includes('terceiro') || r.descricaoRisco.toLowerCase().includes('fornecedor') ||
      r.descricaoRisco.toLowerCase().includes('parceiro') || r.descricaoRisco.toLowerCase().includes('transportadora') ||
      r.descricaoRisco.toLowerCase().includes('cloud') || r.descricaoRisco.toLowerCase().includes('jurídico') ||
      r.descricaoRisco.toLowerCase().includes('agência')
    );
    return { critico, alto, medio, baixo, exposureScore, maxExposure, exposurePct, avgGut, controlPct, withControls, strategic, strategicPct, tprm };
  }, [risks]);

  const byType = useMemo(() => groupBy(risks, r => r.tipoRisco || 'Não classificado'), [risks]);
  const byFonte = useMemo(() => groupBy(risks, r => { const f = r.fonteDeRisco; if (f.startsWith('FE')) return 'Externo'; if (f.startsWith('FI')) return 'Interno'; return 'Outros'; }), [risks]);
  const byTreatment = useMemo(() => groupBy(risks, r => r.tratamento || 'Não definido'), [risks]);
  const top10 = useMemo(() => [...risks].sort((a, b) => b.gutScore - a.gutScore).slice(0, 10), [risks]);
  const byResponsible = useMemo(() => {
    const groups = groupBy(risks, r => r.responsavel || 'Não atribuído');
    return Object.entries(groups).map(([name, items]) => ({ name, count: items.length, risks: items })).sort((a, b) => b.count - a.count);
  }, [risks]);

  const financialStats = useMemo(() => {
    const risksWithFinancial = risks.map(r => ({ ...r, financial: FINANCIAL_DATA[r.id] || null })).filter(r => r.financial !== null);
    const totalExposicaoAlta = risksWithFinancial.reduce((s, r) => s + (r.financial?.perdaAltaDemanda || 0), 0);
    const totalExposicaoBaixa = risksWithFinancial.reduce((s, r) => s + (r.financial?.perdaBaixaDemanda || 0), 0);
    const totalInvestimento = risksWithFinancial.reduce((s, r) => s + (r.financial?.investimentoPreventivo || 0), 0);
    const totalPerdaEvitada = risksWithFinancial.reduce((s, r) => s + (r.financial?.perdaEvitada || 0), 0);
    const roiMedio = totalInvestimento > 0 ? (totalPerdaEvitada / totalInvestimento) * 100 : 0;
    const byROI = [...risksWithFinancial].sort((a, b) => (b.financial?.roiPrevencao || 0) - (a.financial?.roiPrevencao || 0));
    const byImpact = [...risksWithFinancial].sort((a, b) => (b.financial?.perdaAltaDemanda || 0) - (a.financial?.perdaAltaDemanda || 0));
    return { risksWithFinancial, totalExposicaoAlta, totalExposicaoBaixa, totalInvestimento, totalPerdaEvitada, roiMedio, byROI, byImpact };
  }, [risks]);

  // What-if simulation result
  const whatIfResult = useMemo(() => {
    if (!whatIfRisk) return null;
    return simulateRiskMitigation(whatIfRisk, whatIfLevel);
  }, [whatIfRisk, whatIfLevel, simulateRiskMitigation]);

  const openModal = (title: string, riskList: Risk[], mode: 'default' | 'investment' | 'impact' = 'default') => {
    setModalTitle(title);
    setSelectedRisks(riskList);
    setShowModal(true);
    setModalMode(mode);
  };

  // ---- ENGINE DECISION PANEL ----
  const renderDecisionPanel = () => {
    if (!portfolioMetrics) return null;
    const pm = portfolioMetrics;
    const scenarioLabel = config.scenarioMultipliers[config.scenario].label;
    const scenarioMult = config.scenarioMultipliers[config.scenario].probabilityMultiplier;

    return (
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <GlowCard variant="default">
          <View style={st.cardHeader}>
            <Text style={st.cardTitle}>PAINEL DE DECISÃO — ENGINE</Text>
            <StatusIndicator status={pm.byAppetite.intolerable > 5 ? 'alert' : pm.byAppetite.intolerable > 0 ? 'monitoring' : 'active'} label={scenarioLabel.toUpperCase()} />
          </View>
          <View style={[isDesktop && { flexDirection: 'row', gap: 6 }]}>
            {/* Portfolio Score */}
            <View style={[st.engineKpi, { flex: 1, borderColor: '#00E5FF20' }]}>
              <Text style={[st.engineKpiLabel, { color: NEON.cyan }]}>COMPOSITE SCORE</Text>
              <Text style={[st.engineKpiValue, { color: NEON.cyan }]}>{pm.averageCompositeScore.toFixed(1)}</Text>
              <Text style={[st.engineKpiSub, { color: NEON.muted }]}>Média | Max: {pm.maxCompositeScore.toFixed(0)}</Text>
            </View>
            {/* Scenario Exposure */}
            <View style={[st.engineKpi, { flex: 1, borderColor: '#FF3D3D20' }]}>
              <Text style={[st.engineKpiLabel, { color: '#FF3D3D' }]}>EXPOSIÇÃO {scenarioLabel.toUpperCase()}</Text>
              <Text style={[st.engineKpiValue, { color: '#FF3D3D' }]}>{formatBRL(pm.scenarioAdjustedExposure)}</Text>
              <Text style={[st.engineKpiSub, { color: NEON.muted }]}>Mult: {scenarioMult.toFixed(1)}x</Text>
            </View>
            {/* Appetite Distribution */}
            <View style={[st.engineKpi, { flex: 1, borderColor: '#FFD60020' }]}>
              <Text style={[st.engineKpiLabel, { color: '#FFD600' }]}>APETITE DE RISCO</Text>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: '#FF3D3D', fontSize: 16, fontWeight: '800', fontFamily: MONO }}>{pm.byAppetite.intolerable}</Text>
                  <Text style={{ color: '#FF3D3D', fontSize: 7, fontFamily: MONO }}>INTOL.</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: '#FFD600', fontSize: 16, fontWeight: '800', fontFamily: MONO }}>{pm.byAppetite.tolerable}</Text>
                  <Text style={{ color: '#FFD600', fontSize: 7, fontFamily: MONO }}>TOLER.</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: '#00FF88', fontSize: 16, fontWeight: '800', fontFamily: MONO }}>{pm.byAppetite.acceptable}</Text>
                  <Text style={{ color: '#00FF88', fontSize: 7, fontFamily: MONO }}>ACEIT.</Text>
                </View>
              </View>
            </View>
            {/* Warnings & Confidence */}
            <View style={[st.engineKpi, { flex: 1, borderColor: '#00FF8820' }]}>
              <Text style={[st.engineKpiLabel, { color: '#00FF88' }]}>CONFIANÇA</Text>
              <Text style={[st.engineKpiValue, { color: '#00FF88' }]}>{pm.averageConfidence}%</Text>
              <Text style={[st.engineKpiSub, { color: pm.totalWarnings > 5 ? '#FF3D3D' : NEON.muted }]}>⚠ {pm.totalWarnings} alertas</Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>
    );
  };

  // ---- WHAT-IF SIMULATION ----
  const renderWhatIfPanel = () => {
    const top5 = enrichedRisks.slice().sort((a, b) => b.compositeScore.total - a.compositeScore.total).slice(0, 8);
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <GlowCard variant="default">
          <View style={st.cardHeader}>
            <Text style={st.cardTitle}>SIMULAÇÃO WHAT-IF</Text>
            <StatusIndicator status="monitoring" label="INTERATIVO" />
          </View>
          <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO, marginBottom: 6 }}>
            Selecione um risco e nível de mitigação para simular o impacto no portfólio
          </Text>

          {/* Risk selector */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
            {top5.map(r => {
              const isActive = whatIfRisk === r.id;
              const color = isActive ? NEON.cyan : NEON.muted;
              return (
                <TouchableOpacity key={r.id} style={[st.whatIfChip, isActive && st.whatIfChipActive]} onPress={() => setWhatIfRisk(isActive ? null : r.id)} activeOpacity={0.7}>
                  <Text style={{ color, fontSize: 8, fontWeight: '700', fontFamily: MONO }}>{r.id}</Text>
                  <Text style={{ color, fontSize: 7, fontFamily: MONO }}>CS:{r.compositeScore.total.toFixed(0)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Mitigation level selector */}
          {whatIfRisk && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO, marginBottom: 4 }}>NÍVEL DE MITIGAÇÃO:</Text>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {[25, 50, 75, 100].map(level => (
                  <TouchableOpacity key={level} style={[st.whatIfChip, whatIfLevel === level && st.whatIfChipActive, { flex: 1 }]} onPress={() => setWhatIfLevel(level)} activeOpacity={0.7}>
                    <Text style={{ color: whatIfLevel === level ? NEON.cyan : NEON.muted, fontSize: 10, fontWeight: '700', fontFamily: MONO, textAlign: 'center' }}>{level}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Simulation result */}
          {whatIfResult && (
            <View style={{ backgroundColor: '#0A0E14', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#00E5FF20' }}>
              <Text style={{ color: NEON.cyan, fontSize: 8, fontWeight: '700', fontFamily: MONO, marginBottom: 6 }}>
                RESULTADO: {whatIfResult.riskId} — Mitigação {whatIfResult.mitigationLevel}%
              </Text>
              <View style={[isDesktop && { flexDirection: 'row', gap: 6 }]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>Score Antes</Text>
                    <Text style={{ color: '#FF3D3D', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{whatIfResult.scoreBefore.toFixed(1)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>Score Depois</Text>
                    <Text style={{ color: '#00FF88', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{whatIfResult.scoreAfter.toFixed(1)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>Redução Direta</Text>
                    <Text style={{ color: '#00E5FF', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>-{whatIfResult.directReduction.toFixed(1)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>Portfólio Antes</Text>
                    <Text style={{ color: '#FF3D3D', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{whatIfResult.portfolioScoreBefore.toFixed(1)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>Portfólio Depois</Text>
                    <Text style={{ color: '#00FF88', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{whatIfResult.portfolioScoreAfter.toFixed(1)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>Efeito Cascata</Text>
                    <Text style={{ color: '#A855F7', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>-{whatIfResult.totalCascadeReduction.toFixed(1)}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>Investimento</Text>
                    <Text style={{ color: '#00E5FF', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{formatBRL(whatIfResult.investmentRequired)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>Perda Evitada</Text>
                    <Text style={{ color: '#00FF88', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{formatBRL(whatIfResult.financialSaved)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>ROI</Text>
                    <Text style={{ color: whatIfResult.roi > 100 ? '#00FF88' : '#FFD600', fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{whatIfResult.roi}%</Text>
                  </View>
                </View>
              </View>
              {whatIfResult.cascadeImpact.length > 0 && (
                <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: '#1A3A2A', paddingTop: 4 }}>
                  <Text style={{ color: '#A855F7', fontSize: 7, fontWeight: '700', fontFamily: MONO, marginBottom: 3 }}>EFEITO CASCATA EM RISCOS CORRELACIONADOS:</Text>
                  {whatIfResult.cascadeImpact.slice(0, 3).map((c, i) => (
                    <Text key={i} style={{ color: NEON.muted, fontSize: 7, fontFamily: MONO }}>
                      {c.targetId}: -{c.reduction.toFixed(1)} pts ({c.description})
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </GlowCard>
      </Animated.View>
    );
  };

  // ---- KPI GAUGES ----
  const GaugeCard = ({ label, value, max, unit, color, subtitle }: { label: string; value: number; max: number; unit: string; color: string; subtitle?: string }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
      <View style={[st.gaugeCard, { borderColor: NEON.cardBorder }]}>
        <Text style={[st.gaugeLabel, { color: NEON.cyan }]}>{label}</Text>
        <Text style={[st.gaugeValue, { color }]}>{value}<Text style={[st.gaugeUnit, { color }]}>{unit}</Text></Text>
        <View style={[st.gaugeBarBg, { backgroundColor: NEON.cardBorder }]}>
          <View style={[st.gaugeBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
        {subtitle && <Text style={[st.gaugeSub, { color: NEON.muted }]}>{subtitle}</Text>}
      </View>
    );
  };

  // ---- HEAT MAP ----
  const HeatMapByType = () => {
    const types = Object.entries(byType).sort((a, b) => b[1].length - a[1].length);
    const maxCount = Math.max(...types.map(([, items]) => items.length), 1);
    return (
      <View style={[st.card, { borderColor: NEON.cardBorder }]}>
        <View style={st.cardHeader}>
          <IconSymbol name="chart.bar.fill" size={14} color={NEON.cyan} />
          <Text style={st.cardTitle}>Mapa de Calor por Tipo</Text>
        </View>
        {types.map(([type, items]) => {
          const avgScore = Math.round(items.reduce((s, r) => s + r.riscoInerente, 0) / items.length);
          const level = getRiskLevel(avgScore);
          const barWidth = (items.length / maxCount) * 100;
          return (
            <TouchableOpacity key={type} style={{ marginBottom: 5 }} onPress={() => openModal(type, items)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{ color: NEON.text, fontSize: 9, fontFamily: MONO, flex: 1 }} numberOfLines={1}>{type.replace('Risco ', '').replace('Risco de ', '')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ backgroundColor: level.color + '20', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1, borderColor: level.color + '40' }}>
                    <Text style={{ color: level.color, fontSize: 7, fontWeight: '700', fontFamily: MONO }}>{level.label}</Text>
                  </View>
                  <Text style={{ color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: MONO, width: 16, textAlign: 'right' }}>{items.length}</Text>
                </View>
              </View>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: NEON.cardBorder }}>
                <View style={{ height: 4, borderRadius: 2, width: `${barWidth}%` as any, backgroundColor: level.color }} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ---- TREATMENT CHART ----
  const TreatmentChart = () => {
    const entries = Object.entries(byTreatment).sort((a, b) => b[1].length - a[1].length);
    return (
      <View style={[st.card, { borderColor: NEON.cardBorder }]}>
        <View style={st.cardHeader}>
          <IconSymbol name="flag.fill" size={14} color={NEON.cyan} />
          <Text style={st.cardTitle}>Estratégias de Tratamento (MATE)</Text>
        </View>
        <View style={{ gap: 4 }}>
          {entries.map(([treatment, items]) => {
            const color = treatmentColor(treatment);
            const pct = risks.length > 0 ? Math.round((items.length / risks.length) * 100) : 0;
            return (
              <TouchableOpacity key={treatment} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, borderRadius: 4, borderWidth: 1, borderColor: color + '30', backgroundColor: color + '08' }} onPress={() => openModal(`Tratamento: ${treatment}`, items)} activeOpacity={0.7}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: NEON.text, fontSize: 9, fontWeight: '600', fontFamily: MONO }}>{treatment}</Text>
                  <Text style={{ color: NEON.muted, fontSize: 7, fontFamily: MONO }}>{items.length} riscos ({pct}%)</Text>
                </View>
                <Text style={{ color, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>{items.length}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ---- TPRM ----
  const TPRMSection = () => {
    if (stats.tprm.length === 0) return null;
    const avgScore = Math.round(stats.tprm.reduce((s, r) => s + r.riscoInerente, 0) / stats.tprm.length);
    const avgGut = Math.round(stats.tprm.reduce((s, r) => s + r.gutScore, 0) / stats.tprm.length);
    const level = getRiskLevel(avgScore);
    return (
      <View style={[st.card, { borderColor: NEON.cardBorder }]}>
        <View style={st.cardHeader}>
          <IconSymbol name="person.3.fill" size={14} color="#A855F7" />
          <Text style={st.cardTitle}>Avaliação de Terceiros (TPRM)</Text>
          <View style={{ backgroundColor: '#A855F720', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: '#A855F740' }}>
            <Text style={{ color: '#A855F7', fontSize: 7, fontWeight: '700', fontFamily: MONO }}>{stats.tprm.length} RISCOS</Text>
          </View>
        </View>
        <View style={isDesktop ? { flexDirection: 'row', gap: 6, marginBottom: 6 } : { gap: 4, marginBottom: 6 }}>
          {[
            { label: 'P×I MÉDIO', value: `${avgScore}`, color: level.color, sub: level.label },
            { label: 'GUT MÉDIO', value: `${avgGut}`, color: getGutLevel(avgGut).color, sub: getGutLevel(avgGut).label },
            { label: '% DO TOTAL', value: `${Math.round((stats.tprm.length / risks.length) * 100)}%`, color: '#A855F7', sub: 'dos riscos' },
          ].map(item => (
            <View key={item.label} style={{ flex: 1, backgroundColor: NEON.bg, borderRadius: 4, borderWidth: 1, borderColor: NEON.cardBorder, padding: 6, alignItems: 'center' }}>
              <Text style={{ color: NEON.cyan, fontSize: 7, fontWeight: '700', fontFamily: MONO }}>{item.label}</Text>
              <Text style={{ color: item.color, fontSize: 16, fontWeight: '800', fontFamily: MONO }}>{item.value}</Text>
              <Text style={{ color: item.color, fontSize: 8, fontFamily: MONO }}>{item.sub}</Text>
            </View>
          ))}
        </View>
        {stats.tprm.map(r => {
          const rLevel = getRiskLevel(r.riscoInerente);
          return (
            <TouchableOpacity key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder }} onPress={() => router.push(`/risk/${r.id}` as any)} activeOpacity={0.7}>
              <View style={{ backgroundColor: rLevel.color + '15', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: rLevel.color + '30' }}>
                <Text style={{ color: rLevel.color, fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{r.id}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: NEON.text, fontSize: 9, lineHeight: 13 }} numberOfLines={1}>{r.descricaoRisco}</Text>
                <Text style={{ color: NEON.muted, fontSize: 7, fontFamily: MONO }}>{r.responsavel} | {r.tratamento}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: rLevel.color, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>{r.riscoInerente}</Text>
                <Text style={{ color: rLevel.color, fontSize: 7 }}>{rLevel.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ---- TOP 10 ----
  const Top10Section = () => (
    <View style={[st.card, { borderColor: NEON.cardBorder }]}>
      <View style={st.cardHeader}>
        <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#FF3D3D" />
        <Text style={st.cardTitle}>Top 10 Riscos (GUT)</Text>
      </View>
      {top10.map((r, i) => {
        const level = getRiskLevel(r.riscoInerente);
        const gutLevel = getGutLevel(r.gutScore);
        const maxGut = top10[0]?.gutScore || 1;
        const barPct = (r.gutScore / maxGut) * 100;
        return (
          <TouchableOpacity key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder }} onPress={() => router.push(`/risk/${r.id}` as any)} activeOpacity={0.7}>
            <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: i < 3 ? '#FF3D3D15' : NEON.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: i < 3 ? '#FF3D3D' : NEON.muted, fontSize: 9, fontWeight: '800', fontFamily: MONO }}>#{i + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 1 }}>
                <Text style={{ color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{r.id}</Text>
                <View style={{ backgroundColor: level.color + '15', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 0, borderWidth: 1, borderColor: level.color + '30' }}>
                  <Text style={{ color: level.color, fontSize: 7, fontWeight: '600', fontFamily: MONO }}>PxI:{r.riscoInerente}</Text>
                </View>
              </View>
              <Text style={{ color: NEON.text, fontSize: 9, lineHeight: 12 }} numberOfLines={1}>{r.descricaoRisco}</Text>
              <View style={{ height: 3, borderRadius: 1, backgroundColor: NEON.cardBorder, marginTop: 2 }}>
                <View style={{ height: 3, borderRadius: 1, width: `${barPct}%` as any, backgroundColor: gutLevel.color }} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 4 }}>
              <Text style={{ color: gutLevel.color, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>{r.gutScore}</Text>
              <Text style={{ color: gutLevel.color, fontSize: 7 }}>GUT</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ---- RESPONSIBLE ----
  const ResponsibleSection = () => (
    <View style={[st.card, { borderColor: NEON.cardBorder }]}>
      <View style={st.cardHeader}>
        <IconSymbol name="building.2.fill" size={14} color={NEON.cyan} />
        <Text style={st.cardTitle}>Distribuição por Responsável</Text>
      </View>
      {byResponsible.map(({ name, count, risks: riskList }) => {
        const maxCount = byResponsible[0]?.count || 1;
        const barPct = (count / maxCount) * 100;
        const avgScore = Math.round(riskList.reduce((s, r) => s + r.riscoInerente, 0) / riskList.length);
        const level = getRiskLevel(avgScore);
        return (
          <TouchableOpacity key={name} style={{ marginBottom: 4 }} onPress={() => openModal(`Responsável: ${name}`, riskList)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ color: NEON.text, fontSize: 9, fontFamily: MONO, flex: 1 }} numberOfLines={1}>{name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ backgroundColor: level.color + '20', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 0, borderWidth: 1, borderColor: level.color + '40' }}>
                  <Text style={{ color: level.color, fontSize: 7, fontWeight: '700', fontFamily: MONO }}>Avg:{avgScore}</Text>
                </View>
                <Text style={{ color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{count}</Text>
              </View>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: NEON.cardBorder }}>
              <View style={{ height: 4, borderRadius: 2, width: `${barPct}%` as any, backgroundColor: NEON.cyan }} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ---- INTERNAL/EXTERNAL ----
  const InternalExternalSection = () => {
    const interno = byFonte['Interno'] || [];
    const externo = byFonte['Externo'] || [];
    const totalR = risks.length || 1;
    return (
      <View style={[st.card, { borderColor: NEON.cardBorder }]}>
        <View style={st.cardHeader}>
          <IconSymbol name="target" size={14} color={NEON.cyan} />
          <Text style={st.cardTitle}>Origem dos Riscos</Text>
        </View>
        <View style={isDesktop ? { flexDirection: 'row', gap: 8 } : { gap: 6 }}>
          {[
            { label: 'INTERNOS (FI)', data: interno, color: '#3B82F6' },
            { label: 'EXTERNOS (FE)', data: externo, color: '#FF8C00' },
          ].map(item => (
            <TouchableOpacity key={item.label} style={{ flex: 1, backgroundColor: item.color + '08', borderRadius: 6, borderWidth: 1, borderColor: item.color + '30', padding: 8, alignItems: 'center' }} onPress={() => openModal(item.label, item.data)} activeOpacity={0.7}>
              <Text style={{ color: item.color, fontSize: 8, fontWeight: '700', fontFamily: MONO }}>{item.label}</Text>
              <Text style={{ color: item.color, fontSize: 20, fontWeight: '800', fontFamily: MONO }}>{item.data.length}</Text>
              <Text style={{ color: item.color, fontSize: 10, fontFamily: MONO }}>{Math.round((item.data.length / totalR) * 100)}%</Text>
              <View style={{ height: 3, borderRadius: 1, width: '100%', backgroundColor: item.color + '20', marginTop: 4 }}>
                <View style={{ height: 3, borderRadius: 1, width: `${(item.data.length / totalR) * 100}%` as any, backgroundColor: item.color }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // ---- RISK MODAL ----
  const RiskModal = () => (
    <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
      <View style={st.modalOverlay}>
        <View style={[st.modalContent, { maxWidth: isDesktop ? 800 : '95%' as any, maxHeight: '90%' as any }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: NEON.text, fontSize: 12, fontWeight: '700', fontFamily: MONO }} numberOfLines={2}>{modalTitle}</Text>
              <Text style={{ color: NEON.cyan, fontSize: 9, fontFamily: MONO }}>{selectedRisks.length} RISCOS</Text>
            </View>
            <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.7}>
              <IconSymbol name="xmark" size={18} color={NEON.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 12 }} showsVerticalScrollIndicator>
            {modalMode === 'investment' && selectedRisks.map((r, i) => {
              const fin = r.financial || FINANCIAL_DATA[r.id];
              if (!fin) return null;
              const level = getRiskLevel(r.riscoInerente);
              return (
                <TouchableOpacity key={r.id} style={{ borderBottomWidth: 1, borderColor: NEON.cardBorder, paddingVertical: 8, gap: 4 }} onPress={() => { setShowModal(false); router.push(`/risk/${r.id}` as any); }} activeOpacity={0.7}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: i < 3 ? '#00FF88' : NEON.muted, fontFamily: MONO, width: 18 }}>#{i + 1}</Text>
                    <View style={{ backgroundColor: level.color + '15', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ color: level.color, fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{r.id}</Text>
                    </View>
                    <Text style={{ flex: 1, color: NEON.text, fontSize: 9, fontFamily: MONO }} numberOfLines={1}>{r.descricaoRisco}</Text>
                    <View style={{ backgroundColor: '#00FF8815', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#00FF88', fontFamily: MONO }}>ROI {fin.roiPrevencao.toFixed(0)}%</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[
                      { label: 'INVESTIR', value: formatBRL(fin.investimentoPreventivo), color: '#00E5FF' },
                      { label: 'EVITADA', value: formatBRL(fin.perdaEvitada), color: '#00FF88' },
                      { label: 'EXPOSIÇÃO', value: formatBRL(fin.perdaAltaDemanda), color: '#FF3D3D' },
                    ].map(m => (
                      <View key={m.label} style={{ flex: 1, backgroundColor: m.color + '08', borderWidth: 1, borderColor: m.color + '15', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 7, color: NEON.muted, fontFamily: MONO, fontWeight: '700' }}>{m.label}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: m.color, fontFamily: MONO }}>{m.value}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
            {modalMode === 'impact' && selectedRisks.map((r, i) => {
              const fin = r.financial || FINANCIAL_DATA[r.id];
              if (!fin) return null;
              const level = getRiskLevel(r.riscoInerente);
              return (
                <TouchableOpacity key={r.id} style={{ borderBottomWidth: 1, borderColor: NEON.cardBorder, paddingVertical: 8, gap: 4 }} onPress={() => { setShowModal(false); router.push(`/risk/${r.id}` as any); }} activeOpacity={0.7}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: i < 3 ? '#FF3D3D' : NEON.muted, fontFamily: MONO, width: 18 }}>#{i + 1}</Text>
                    <View style={{ backgroundColor: level.color + '15', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ color: level.color, fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{r.id}</Text>
                    </View>
                    <Text style={{ flex: 1, color: NEON.text, fontSize: 9, fontFamily: MONO }} numberOfLines={1}>{r.descricaoRisco}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[
                      { label: 'ALTA DEMANDA', value: formatBRL(fin.perdaAltaDemanda), color: '#FF3D3D' },
                      { label: 'BAIXA DEMANDA', value: formatBRL(fin.perdaBaixaDemanda), color: '#FF8C00' },
                      { label: 'INVESTIR', value: formatBRL(fin.investimentoPreventivo), color: '#00E5FF' },
                    ].map(m => (
                      <View key={m.label} style={{ flex: 1, backgroundColor: m.color + '08', borderWidth: 1, borderColor: m.color + '15', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 7, color: NEON.muted, fontFamily: MONO, fontWeight: '700' }}>{m.label}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: m.color, fontFamily: MONO }}>{m.value}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
            {modalMode === 'default' && selectedRisks.map(r => {
              const level = getRiskLevel(r.riscoInerente);
              return (
                <TouchableOpacity key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder }} onPress={() => { setShowModal(false); router.push(`/risk/${r.id}` as any); }} activeOpacity={0.7}>
                  <View style={{ backgroundColor: level.color + '15', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: level.color + '30' }}>
                    <Text style={{ color: level.color, fontSize: 9, fontWeight: '700', fontFamily: MONO }}>{r.id}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: NEON.text, fontSize: 10 }} numberOfLines={2}>{r.descricaoRisco}</Text>
                    <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>PxI: {r.riscoInerente} | GUT: {r.gutScore} | {r.tratamento}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={NEON.muted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ---- MAIN RENDER ----
  return (
    <ScreenContainer edges={isDesktop ? [] : ["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20, maxWidth: 1400, alignSelf: 'center', width: '100%' }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)} style={{ paddingHorizontal: isDesktop ? 12 : 8, paddingTop: 4, paddingBottom: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', letterSpacing: 1, color: NEON.text, fontFamily: MONO }}>Visão Estratégica</Text>
            <StatusIndicator status="active" showLabel={false} />
          </View>
          <Text style={{ fontSize: 9, color: NEON.muted, fontFamily: MONO, marginTop: 1 }}>PAINEL EXECUTIVO PARA O BOARD — DAMACORP</Text>
        </Animated.View>

        {/* Engine Decision Panel */}
        <View style={{ paddingHorizontal: isDesktop ? 12 : 8, marginBottom: 4 }}>
          {renderDecisionPanel()}
        </View>

        {/* KPIs */}
        <View style={{ paddingHorizontal: isDesktop ? 12 : 8, marginBottom: 4 }}>
          <View style={isDesktop ? { flexDirection: 'row', gap: 6 } : { gap: 4 }}>
            <GaugeCard label="EXPOSIÇÃO TOTAL" value={stats.exposurePct} max={100} unit="%" color={stats.exposurePct > 60 ? '#FF3D3D' : stats.exposurePct > 40 ? '#FF8C00' : '#00FF88'} subtitle={`${stats.exposureScore}/${stats.maxExposure} pts`} />
            <GaugeCard label="GUT MÉDIO" value={stats.avgGut} max={125} unit=" pts" color={getGutLevel(stats.avgGut).color} subtitle={getGutLevel(stats.avgGut).label} />
            <GaugeCard label="CONTROLES" value={stats.controlPct} max={100} unit="%" color={stats.controlPct >= 80 ? '#00FF88' : stats.controlPct >= 50 ? '#FFD600' : '#FF3D3D'} subtitle={`${stats.withControls}/${risks.length}`} />
            <GaugeCard label="ESTRATÉGICOS" value={stats.strategicPct} max={100} unit="%" color={NEON.cyan} subtitle={`${stats.strategic}/${risks.length}`} />
          </View>
        </View>

        {/* Risk Level Bar */}
        <View style={{ paddingHorizontal: isDesktop ? 12 : 8, marginBottom: 4 }}>
          <GlowCard variant="default">
            <View style={st.cardHeader}>
              <Text style={st.cardTitle}>DISTRIBUIÇÃO POR NÍVEL</Text>
            </View>
            <View style={{ flexDirection: 'row', height: 18, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
              {[
                { label: 'Crítico', count: stats.critico, color: '#FF3D3D' },
                { label: 'Alto', count: stats.alto, color: '#FF8C00' },
                { label: 'Médio', count: stats.medio, color: '#FFD600' },
                { label: 'Baixo', count: stats.baixo, color: '#00FF88' },
              ].map(item => {
                const pct = risks.length > 0 ? (item.count / risks.length) * 100 : 0;
                return (
                  <TouchableOpacity key={item.label} style={{ width: `${Math.max(pct, 2)}%` as any, backgroundColor: item.color, justifyContent: 'center', alignItems: 'center' }} onPress={() => openModal(`Nível: ${item.label}`, risks.filter(r => getRiskLevel(r.riscoInerente).label === item.label || (item.label === 'Baixo' && getRiskLevel(r.riscoInerente).label === 'Muito Baixo')))} activeOpacity={0.7}>
                    {pct >= 8 && <Text style={{ color: '#000', fontSize: 8, fontWeight: '800' }}>{item.count}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'Crítico', count: stats.critico, color: '#FF3D3D' },
                { label: 'Alto', count: stats.alto, color: '#FF8C00' },
                { label: 'Médio', count: stats.medio, color: '#FFD600' },
                { label: 'Baixo', count: stats.baixo, color: '#00FF88' },
              ].map(item => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }} />
                  <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: MONO }}>{item.label}: {item.count} ({risks.length > 0 ? Math.round((item.count / risks.length) * 100) : 0}%)</Text>
                </View>
              ))}
            </View>
          </GlowCard>
        </View>

        {/* What-If + Heat Map + Treatment */}
        <View style={{ paddingHorizontal: isDesktop ? 12 : 8, marginBottom: 4 }}>
          <View style={isDesktop ? { flexDirection: 'row', gap: 6 } : { gap: 6 }}>
            <View style={isDesktop ? { flex: 1 } : undefined}>{renderWhatIfPanel()}</View>
            <View style={isDesktop ? { flex: 1 } : undefined}><HeatMapByType /></View>
            <View style={isDesktop ? { flex: 1 } : undefined}><TreatmentChart /></View>
          </View>
        </View>

        {/* Financial Section */}
        <View style={{ paddingHorizontal: isDesktop ? 12 : 8, marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ width: 3, height: 16, borderRadius: 1, backgroundColor: '#00E5FF' }} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: NEON.text, letterSpacing: 1, fontFamily: MONO }}>Análise Financeira</Text>
          </View>
          <View style={isDesktop ? { flexDirection: 'row', gap: 6 } : { gap: 6 }}>
            {/* Investment Card */}
            <TouchableOpacity style={[st.card, { borderColor: '#00E5FF30', flex: isDesktop ? 1 : undefined }]} onPress={() => { setSelectedRisks(financialStats.byROI); setModalTitle('Investimentos Preventivos — Priorizados por ROI'); setShowModal(true); setModalMode('investment'); }} activeOpacity={0.7}>
              <View style={st.cardHeader}>
                <IconSymbol name="shield.fill" size={14} color="#00E5FF" />
                <Text style={st.cardTitle}>Investimento Preventivo</Text>
              </View>
              <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: NEON.muted, fontFamily: MONO, letterSpacing: 1 }}>TOTAL RECOMENDADO</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#00E5FF', fontFamily: MONO }}>R$ {(financialStats.totalInvestimento / 1000000).toFixed(1)}M</Text>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: NEON.cardBorder, paddingTop: 6, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: MONO }}>PERDA EVITADA</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#00FF88', fontFamily: MONO }}>R$ {(financialStats.totalPerdaEvitada / 1000000).toFixed(1)}M</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: MONO }}>ROI MÉDIO</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#00FF88', fontFamily: MONO }}>{financialStats.roiMedio.toFixed(0)}%</Text>
                </View>
              </View>
              <View style={{ marginTop: 6, backgroundColor: '#00E5FF10', borderRadius: 4, padding: 4, alignItems: 'center' }}>
                <Text style={{ fontSize: 8, color: '#00E5FF', fontFamily: MONO, fontWeight: '600' }}>CLIQUE PARA VER PRIORIZAÇÃO →</Text>
              </View>
            </TouchableOpacity>

            {/* Impact Card */}
            <TouchableOpacity style={[st.card, { borderColor: '#FF3D3D30', flex: isDesktop ? 1 : undefined }]} onPress={() => { setSelectedRisks(financialStats.byImpact); setModalTitle('Impacto Financeiro — Maior Exposição'); setShowModal(true); setModalMode('impact'); }} activeOpacity={0.7}>
              <View style={st.cardHeader}>
                <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#FF3D3D" />
                <Text style={st.cardTitle}>Impacto Financeiro</Text>
              </View>
              <View style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: NEON.muted, fontFamily: MONO, letterSpacing: 1 }}>EXPOSIÇÃO TOTAL (ALTA)</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#FF3D3D', fontFamily: MONO }}>R$ {(financialStats.totalExposicaoAlta / 1000000).toFixed(1)}M</Text>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: NEON.cardBorder, paddingTop: 6, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: MONO }}>EXPOSIÇÃO (BAIXA)</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FF8C00', fontFamily: MONO }}>R$ {(financialStats.totalExposicaoBaixa / 1000000).toFixed(1)}M</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: MONO }}>MÉDIA PONDERADA</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFD600', fontFamily: MONO }}>R$ {((financialStats.totalExposicaoAlta * 0.3 + financialStats.totalExposicaoBaixa * 0.7) / 1000000).toFixed(1)}M</Text>
                </View>
              </View>
              <View style={{ marginTop: 6, backgroundColor: '#FF3D3D10', borderRadius: 4, padding: 4, alignItems: 'center' }}>
                <Text style={{ fontSize: 8, color: '#FF3D3D', fontFamily: MONO, fontWeight: '600' }}>CLIQUE PARA VER DETALHES →</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Origin + TPRM */}
        <View style={{ paddingHorizontal: isDesktop ? 12 : 8, marginBottom: 4 }}>
          <View style={isDesktop ? { flexDirection: 'row', gap: 6 } : { gap: 6 }}>
            <View style={isDesktop ? { flex: 1 } : undefined}><InternalExternalSection /></View>
            <View style={isDesktop ? { flex: 2 } : undefined}><TPRMSection /></View>
          </View>
        </View>

        {/* Top10 + Responsible */}
        <View style={{ paddingHorizontal: isDesktop ? 12 : 8, marginBottom: 4 }}>
          <View style={isDesktop ? { flexDirection: 'row', gap: 6 } : { gap: 6 }}>
            <View style={isDesktop ? { flex: 1 } : undefined}><Top10Section /></View>
            <View style={isDesktop ? { flex: 1 } : undefined}><ResponsibleSection /></View>
          </View>
        </View>
      </ScrollView>
      <RiskModal />
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#00E5FF', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, flex: 1 },
  card: { backgroundColor: '#0D1117', borderRadius: 6, borderWidth: 1, padding: 8 },
  gaugeCard: { flex: 1, backgroundColor: '#0D1117', borderRadius: 6, borderWidth: 1, padding: 6 },
  gaugeLabel: { fontSize: 7, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  gaugeValue: { fontSize: 18, fontWeight: '800', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  gaugeUnit: { fontSize: 12, fontWeight: '600' },
  gaugeBarBg: { height: 3, borderRadius: 1, marginTop: 4 },
  gaugeBarFill: { height: 3, borderRadius: 1 },
  gaugeSub: { fontSize: 7, marginTop: 2, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  engineKpi: { backgroundColor: '#0A0E14', borderRadius: 6, borderWidth: 1, padding: 6, alignItems: 'center' },
  engineKpiLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 0.5, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  engineKpiValue: { fontSize: 20, fontWeight: '800', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  engineKpiSub: { fontSize: 8, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  whatIfChip: { backgroundColor: '#0A0E14', borderRadius: 4, borderWidth: 1, borderColor: '#1A3A2A', paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' },
  whatIfChipActive: { backgroundColor: '#00E5FF10', borderColor: '#00E5FF40' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#1A3A2A', width: '100%' },
});
