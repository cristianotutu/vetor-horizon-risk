import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions, Modal, Platform } from "react-native";
import { useState, useMemo} from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel, Risk } from "@/lib/models";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlowCard } from "@/components/ui/glow-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { FINANCIAL_DATA } from "@/lib/financial-data";
import Animated, { FadeInDown } from "react-native-reanimated";

// Neon color palette
const NEON = {
  bg: '#0A0E14',
  card: '#0D1117',
  cardBorder: '#1A3A2A',
  cyan: '#00E5FF',
  green: '#00FF88',
  text: '#E0F0E0',
  muted: '#6B8A7A',
  headerBg: '#111820',
};

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  arr.forEach(item => {
    const key = fn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  });
  return result;
}

function levelColor(label: string): string {
  switch (label) {
    case 'Crítico': return '#FF3D3D';
    case 'Alto': return '#FF8C00';
    case 'Médio': return '#FFD600';
    case 'Baixo': return '#00FF88';
    default: return '#00FF88';
  }
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

export default function StrategicScreen() {
  const { risks } = useRisks();

  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [selectedRisks, setSelectedRisks] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'default' | 'investment' | 'impact'>('default');

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
  const byFonte = useMemo(() => groupBy(risks, r => {
    const f = r.fonteDeRisco;
    if (f.startsWith('FE')) return 'Externo';
    if (f.startsWith('FI')) return 'Interno';
    return 'Outros';
  }), [risks]);
  const byTreatment = useMemo(() => groupBy(risks, r => r.tratamento || 'Não definido'), [risks]);
  const top10 = useMemo(() => [...risks].sort((a, b) => b.gutScore - a.gutScore).slice(0, 10), [risks]);

  // Financial data for strategic view
  const financialStats = useMemo(() => {
    const risksWithFinancial = risks.map(r => ({
      ...r,
      financial: FINANCIAL_DATA[r.id] || null,
    })).filter(r => r.financial !== null);

    const totalExposicaoAlta = risksWithFinancial.reduce((s, r) => s + (r.financial?.perdaAltaDemanda || 0), 0);
    const totalExposicaoBaixa = risksWithFinancial.reduce((s, r) => s + (r.financial?.perdaBaixaDemanda || 0), 0);
    const totalInvestimento = risksWithFinancial.reduce((s, r) => s + (r.financial?.investimentoPreventivo || 0), 0);
    const totalPerdaEvitada = risksWithFinancial.reduce((s, r) => s + (r.financial?.perdaEvitada || 0), 0);
    const roiMedio = totalInvestimento > 0 ? (totalPerdaEvitada / totalInvestimento) * 100 : 0;

    // Sorted by ROI descending (best investments first)
    const byROI = [...risksWithFinancial]
      .sort((a, b) => (b.financial?.roiPrevencao || 0) - (a.financial?.roiPrevencao || 0));

    // Sorted by perda alta demanda descending (biggest impact first)
    const byImpact = [...risksWithFinancial]
      .sort((a, b) => (b.financial?.perdaAltaDemanda || 0) - (a.financial?.perdaAltaDemanda || 0));

    return { risksWithFinancial, totalExposicaoAlta, totalExposicaoBaixa, totalInvestimento, totalPerdaEvitada, roiMedio, byROI, byImpact };
  }, [risks]);
  const byResponsible = useMemo(() => {
    const groups = groupBy(risks, r => r.responsavel || 'Não atribuído');
    return Object.entries(groups).map(([name, items]) => ({ name, count: items.length, risks: items })).sort((a, b) => b.count - a.count);
  }, [risks]);

  const openModal = (title: string, riskList: Risk[]) => {
    setModalTitle(title);
    setSelectedRisks(riskList);
    setShowModal(true);
    setModalMode('default');
  };

  const GaugeCard = ({ label, value, max, unit, color, subtitle }: { label: string; value: number; max: number; unit: string; color: string; subtitle?: string }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
      <View style={[s.gaugeCard, { backgroundColor: NEON.card, borderColor: NEON.cardBorder }]}>
        <Text style={[s.gaugeLabel, { color: NEON.cyan }]}>{label}</Text>
        <Text style={[s.gaugeValue, { color }]}>{value}<Text style={[s.gaugeUnit, { color }]}>{unit}</Text></Text>
        <View style={[s.gaugeBarBg, { backgroundColor: NEON.cardBorder }]}>
          <View style={[s.gaugeBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
        {subtitle && <Text style={[s.gaugeSubtitle, { color: NEON.muted }]}>{subtitle}</Text>}
      </View>
    );
  };

  const HeatMapByType = () => {
    const types = Object.entries(byType).sort((a, b) => b[1].length - a[1].length);
    const maxCount = Math.max(...types.map(([, items]) => items.length), 1);
    return (
      <View style={[s.card, { backgroundColor: NEON.card, borderColor: NEON.cardBorder }]}>
        <View style={s.cardHeader}>
          <IconSymbol name="chart.bar.fill" size={18} color={NEON.cyan} />
          <Text style={[s.cardTitle, { color: NEON.text }]}>Mapa de Calor por Tipo de Risco</Text>
        </View>
        {types.map(([type, items]) => {
          const avgScore = Math.round(items.reduce((s, r) => s + r.riscoInerente, 0) / items.length);
          const level = getRiskLevel(avgScore);
          const barWidth = (items.length / maxCount) * 100;
          return (
            <TouchableOpacity key={type} style={s.heatRow} onPress={() => openModal(type, items)} activeOpacity={0.7}>
              <View style={s.heatLabelRow}>
                <Text style={[s.heatLabel, { color: NEON.text }]} numberOfLines={1}>{type.replace('Risco ', '').replace('Risco de ', '')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.heatBadge, { backgroundColor: level.color + '20', borderWidth: 1, borderColor: level.color + '40' }]}>
                    <Text style={[s.heatBadgeText, { color: level.color }]}>{level.label}</Text>
                  </View>
                  <Text style={[s.heatCount, { color: NEON.cyan, fontFamily: 'monospace' }]}>{items.length}</Text>
                </View>
              </View>
              <View style={[s.heatBarBg, { backgroundColor: NEON.cardBorder }]}>
                <View style={[s.heatBarFill, { width: `${barWidth}%` as any, backgroundColor: level.color }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const TreatmentChart = () => {
    const entries = Object.entries(byTreatment).sort((a, b) => b[1].length - a[1].length);
    return (
      <View style={[s.card, { backgroundColor: NEON.card, borderColor: NEON.cardBorder }]}>
        <View style={s.cardHeader}>
          <IconSymbol name="flag.fill" size={18} color={NEON.cyan} />
          <Text style={[s.cardTitle, { color: NEON.text }]}>Estratégias de Tratamento (MATE)</Text>
        </View>
        <View style={s.treatmentGrid}>
          {entries.map(([treatment, items]) => {
            const color = treatmentColor(treatment);
            const pct = risks.length > 0 ? Math.round((items.length / risks.length) * 100) : 0;
            return (
              <TouchableOpacity
                key={treatment}
                style={[s.treatmentItem, { borderColor: color + '30', backgroundColor: color + '08' }]}
                onPress={() => openModal(`Tratamento: ${treatment}`, items)}
                activeOpacity={0.7}
              >
                <View style={[s.treatmentDot, { backgroundColor: color, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.treatmentLabel, { color: NEON.text, fontFamily: 'monospace' }]}>{treatment}</Text>
                  <Text style={[s.treatmentPct, { color: NEON.muted, fontFamily: 'monospace' }]}>{items.length} riscos ({pct}%)</Text>
                </View>
                <Text style={[s.treatmentNum, { color, fontFamily: 'monospace' }]}>{items.length}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const TPRMSection = () => {
    if (stats.tprm.length === 0) return null;
    const avgScore = Math.round(stats.tprm.reduce((s, r) => s + r.riscoInerente, 0) / stats.tprm.length);
    const avgGut = Math.round(stats.tprm.reduce((s, r) => s + r.gutScore, 0) / stats.tprm.length);
    const level = getRiskLevel(avgScore);
    return (
      <View style={[s.card, { backgroundColor: NEON.card, borderColor: NEON.cardBorder }]}>
        <View style={s.cardHeader}>
          <IconSymbol name="person.3.fill" size={18} color="#A855F7" />
          <Text style={[s.cardTitle, { color: NEON.text }]}>Avaliação de Terceiros (TPRM)</Text>
          <View style={[s.tprmBadge, { backgroundColor: '#A855F7' + '20', borderWidth: 1, borderColor: '#A855F7' + '40' }]}>
            <Text style={[s.tprmBadgeText, { color: '#A855F7', fontFamily: 'monospace' }]}>{stats.tprm.length} RISCOS</Text>
          </View>
        </View>
        <View style={isDesktop ? s.tprmStatsRow : s.tprmStatsCol}>
          <View style={[s.tprmStatCard, { backgroundColor: NEON.bg, borderColor: NEON.cardBorder }]}>
            <Text style={[s.tprmStatLabel, { color: NEON.cyan }]}>P x I MÉDIO</Text>
            <Text style={[s.tprmStatValue, { color: level.color, fontFamily: 'monospace' }]}>{avgScore}</Text>
            <Text style={[s.tprmStatSub, { color: level.color }]}>{level.label}</Text>
          </View>
          <View style={[s.tprmStatCard, { backgroundColor: NEON.bg, borderColor: NEON.cardBorder }]}>
            <Text style={[s.tprmStatLabel, { color: NEON.cyan }]}>GUT MÉDIO</Text>
            <Text style={[s.tprmStatValue, { color: getGutLevel(avgGut).color, fontFamily: 'monospace' }]}>{avgGut}</Text>
            <Text style={[s.tprmStatSub, { color: getGutLevel(avgGut).color }]}>{getGutLevel(avgGut).label}</Text>
          </View>
          <View style={[s.tprmStatCard, { backgroundColor: NEON.bg, borderColor: NEON.cardBorder }]}>
            <Text style={[s.tprmStatLabel, { color: NEON.cyan }]}>% DO TOTAL</Text>
            <Text style={[s.tprmStatValue, { color: '#A855F7', fontFamily: 'monospace' }]}>{Math.round((stats.tprm.length / risks.length) * 100)}%</Text>
            <Text style={[s.tprmStatSub, { color: NEON.muted }]}>dos riscos</Text>
          </View>
        </View>
        {stats.tprm.map(r => {
          const rLevel = getRiskLevel(r.riscoInerente);
          return (
            <TouchableOpacity key={r.id} style={[s.tprmRiskRow, { borderColor: NEON.cardBorder }]} onPress={() => router.push(`/risk/${r.id}` as any)} activeOpacity={0.7}>
              <View style={[s.tprmRiskId, { backgroundColor: rLevel.color + '15', borderWidth: 1, borderColor: rLevel.color + '30' }]}>
                <Text style={[s.tprmRiskIdText, { color: rLevel.color, fontFamily: 'monospace' }]}>{r.id}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.tprmRiskDesc, { color: NEON.text }]} numberOfLines={2}>{r.descricaoRisco}</Text>
                <Text style={[s.tprmRiskMeta, { color: NEON.muted, fontFamily: 'monospace' }]}>{r.responsavel} | {r.tratamento}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.tprmRiskScore, { color: rLevel.color, fontFamily: 'monospace' }]}>{r.riscoInerente}</Text>
                <Text style={[s.tprmRiskLevel, { color: rLevel.color }]}>{rLevel.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const Top10Section = () => (
    <View style={[s.card, { backgroundColor: NEON.card, borderColor: NEON.cardBorder }]}>
      <View style={s.cardHeader}>
        <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FF3D3D" />
        <Text style={[s.cardTitle, { color: NEON.text }]}>Top 10 Riscos Prioritários (GUT)</Text>
      </View>
      {top10.map((r, i) => {
        const level = getRiskLevel(r.riscoInerente);
        const gutLevel = getGutLevel(r.gutScore);
        const maxGut = top10[0]?.gutScore || 1;
        const barPct = (r.gutScore / maxGut) * 100;
        return (
          <TouchableOpacity key={r.id} style={[s.top10Row, { borderColor: NEON.cardBorder }]} onPress={() => router.push(`/risk/${r.id}` as any)} activeOpacity={0.7}>
            <View style={[s.top10Rank, { backgroundColor: i < 3 ? '#FF3D3D' + '15' : NEON.bg }]}>
              <Text style={[s.top10RankText, { color: i < 3 ? '#FF3D3D' : NEON.muted, fontFamily: 'monospace' }]}>#{i + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={[s.top10Id, { color: NEON.cyan, fontFamily: 'monospace' }]}>{r.id}</Text>
                <View style={[s.top10LevelBadge, { backgroundColor: level.color + '15', borderWidth: 1, borderColor: level.color + '30' }]}>
                  <Text style={[s.top10LevelText, { color: level.color, fontFamily: 'monospace' }]}>PxI: {r.riscoInerente}</Text>
                </View>
              </View>
              <Text style={[s.top10Desc, { color: NEON.text }]} numberOfLines={1}>{r.descricaoRisco}</Text>
              <View style={[s.top10BarBg, { backgroundColor: NEON.cardBorder }]}>
                <View style={[s.top10BarFill, { width: `${barPct}%` as any, backgroundColor: gutLevel.color }]} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
              <Text style={[s.top10Gut, { color: gutLevel.color, fontFamily: 'monospace' }]}>{r.gutScore}</Text>
              <Text style={[s.top10GutLabel, { color: gutLevel.color }]}>GUT</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const ResponsibleSection = () => (
    <View style={[s.card, { backgroundColor: NEON.card, borderColor: NEON.cardBorder }]}>
      <View style={s.cardHeader}>
        <IconSymbol name="building.2.fill" size={18} color={NEON.cyan} />
        <Text style={[s.cardTitle, { color: NEON.text }]}>Distribuição por Responsável / Área</Text>
      </View>
      {byResponsible.map(({ name, count, risks: riskList }) => {
        const maxCount = byResponsible[0]?.count || 1;
        const barPct = (count / maxCount) * 100;
        const avgScore = Math.round(riskList.reduce((s, r) => s + r.riscoInerente, 0) / riskList.length);
        const level = getRiskLevel(avgScore);
        return (
          <TouchableOpacity key={name} style={s.respRow} onPress={() => openModal(`Responsável: ${name}`, riskList)} activeOpacity={0.7}>
            <View style={s.respLabelRow}>
              <Text style={[s.respLabel, { color: NEON.text, fontFamily: 'monospace' }]} numberOfLines={1}>{name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.heatBadge, { backgroundColor: level.color + '20', borderWidth: 1, borderColor: level.color + '40' }]}>
                  <Text style={[s.heatBadgeText, { color: level.color, fontFamily: 'monospace' }]}>Avg: {avgScore}</Text>
                </View>
                <Text style={[s.respCount, { color: NEON.cyan, fontFamily: 'monospace' }]}>{count}</Text>
              </View>
            </View>
            <View style={[s.heatBarBg, { backgroundColor: NEON.cardBorder }]}>
              <View style={[s.heatBarFill, { width: `${barPct}%` as any, backgroundColor: NEON.cyan }]} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const InternalExternalSection = () => {
    const interno = byFonte['Interno'] || [];
    const externo = byFonte['Externo'] || [];
    const totalR = risks.length || 1;
    return (
      <View style={[s.card, { backgroundColor: NEON.card, borderColor: NEON.cardBorder }]}>
        <View style={s.cardHeader}>
          <IconSymbol name="target" size={18} color={NEON.cyan} />
          <Text style={[s.cardTitle, { color: NEON.text }]}>Origem dos Riscos</Text>
        </View>
        <View style={isDesktop ? { flexDirection: 'row', gap: 16 } : { gap: 12 }}>
          <TouchableOpacity
            style={[s.originCard, { backgroundColor: '#3B82F6' + '08', borderColor: '#3B82F6' + '30', flex: 1 }]}
            onPress={() => openModal('Riscos Internos', interno)}
            activeOpacity={0.7}
          >
            <Text style={[s.originLabel, { color: '#3B82F6', fontFamily: 'monospace' }]}>INTERNOS (FI)</Text>
            <Text style={[s.originValue, { color: '#3B82F6', fontFamily: 'monospace' }]}>{interno.length}</Text>
            <Text style={[s.originPct, { color: '#3B82F6', fontFamily: 'monospace' }]}>{Math.round((interno.length / totalR) * 100)}%</Text>
            <View style={[s.originBar, { backgroundColor: '#3B82F6' + '20' }]}>
              <View style={[s.originBarFill, { width: `${(interno.length / totalR) * 100}%` as any, backgroundColor: '#3B82F6' }]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.originCard, { backgroundColor: '#FF8C00' + '08', borderColor: '#FF8C00' + '30', flex: 1 }]}
            onPress={() => openModal('Riscos Externos', externo)}
            activeOpacity={0.7}
          >
            <Text style={[s.originLabel, { color: '#FF8C00', fontFamily: 'monospace' }]}>EXTERNOS (FE)</Text>
            <Text style={[s.originValue, { color: '#FF8C00', fontFamily: 'monospace' }]}>{externo.length}</Text>
            <Text style={[s.originPct, { color: '#FF8C00', fontFamily: 'monospace' }]}>{Math.round((externo.length / totalR) * 100)}%</Text>
            <View style={[s.originBar, { backgroundColor: '#FF8C00' + '20' }]}>
              <View style={[s.originBarFill, { width: `${(externo.length / totalR) * 100}%` as any, backgroundColor: '#FF8C00' }]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const formatBRL = (v: number) => {
    if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}K`;
    return `R$ ${v.toFixed(0)}`;
  };

  const RiskModal = () => (
    <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: NEON.card, borderColor: NEON.cardBorder, borderWidth: 1, maxWidth: isDesktop ? 800 : '95%' as any, maxHeight: '90%' as any }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: NEON.text, fontFamily: 'monospace' }]} numberOfLines={2}>{modalTitle}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.7}>
              <IconSymbol name="xmark" size={22} color={NEON.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[s.modalSubtitle, { color: NEON.cyan, fontFamily: 'monospace' }]}>{selectedRisks.length} RISCOS</Text>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
            {modalMode === 'investment' && selectedRisks.map((r, i) => {
              const fin = r.financial || FINANCIAL_DATA[r.id];
              if (!fin) return null;
              const level = getRiskLevel(r.riscoInerente);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={{ borderBottomWidth: 1, borderColor: NEON.cardBorder, paddingVertical: 10, gap: 6 }}
                  onPress={() => { setShowModal(false); router.push(`/risk/${r.id}` as any); }}
                  activeOpacity={0.7}
                >
                  {/* Row 1: Rank + ID + Description + ROI */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: i < 3 ? '#00FF88' : NEON.muted, fontFamily: 'monospace', width: 22 }}>#{i + 1}</Text>
                    <View style={{ backgroundColor: level.color + '15', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: level.color, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{r.id}</Text>
                    </View>
                    <Text style={{ flex: 1, color: NEON.text, fontSize: 11, fontFamily: 'monospace' }} numberOfLines={1}>{r.descricaoRisco}</Text>
                    <View style={{ backgroundColor: '#00FF8815', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#00FF88', fontFamily: 'monospace' }}>ROI {fin.roiPrevencao.toFixed(0)}%</Text>
                    </View>
                  </View>
                  {/* Row 2: Compact financial metrics in a single row */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ flex: 1, backgroundColor: '#00E5FF08', borderWidth: 1, borderColor: '#00E5FF15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: 'monospace', fontWeight: '700' }}>INVESTIR</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#00E5FF', fontFamily: 'monospace' }}>{formatBRL(fin.investimentoPreventivo)}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#00FF8808', borderWidth: 1, borderColor: '#00FF8815', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: 'monospace', fontWeight: '700' }}>EVITADA</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#00FF88', fontFamily: 'monospace' }}>{formatBRL(fin.perdaEvitada)}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#FF3D3D08', borderWidth: 1, borderColor: '#FF3D3D15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: 'monospace', fontWeight: '700' }}>EXPOSIÇÃO</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF3D3D', fontFamily: 'monospace' }}>{formatBRL(fin.perdaAltaDemanda)}</Text>
                    </View>
                  </View>
                  {/* Row 3: Description compact */}
                  <Text style={{ fontSize: 9, color: NEON.muted, fontFamily: 'monospace', lineHeight: 13 }} numberOfLines={2}>{fin.descricaoInvestimento}</Text>
                </TouchableOpacity>
              );
            })}
            {modalMode === 'impact' && selectedRisks.map((r, i) => {
              const fin = r.financial || FINANCIAL_DATA[r.id];
              if (!fin) return null;
              const level = getRiskLevel(r.riscoInerente);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={{ borderBottomWidth: 1, borderColor: NEON.cardBorder, paddingVertical: 10, gap: 6 }}
                  onPress={() => { setShowModal(false); router.push(`/risk/${r.id}` as any); }}
                  activeOpacity={0.7}
                >
                  {/* Row 1: Rank + ID + Description */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: i < 3 ? '#FF3D3D' : NEON.muted, fontFamily: 'monospace', width: 22 }}>#{i + 1}</Text>
                    <View style={{ backgroundColor: level.color + '15', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: level.color, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{r.id}</Text>
                    </View>
                    <Text style={{ flex: 1, color: NEON.text, fontSize: 11, fontFamily: 'monospace' }} numberOfLines={1}>{r.descricaoRisco}</Text>
                  </View>
                  {/* Row 2: Compact financial metrics */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ flex: 1, backgroundColor: '#FF3D3D08', borderWidth: 1, borderColor: '#FF3D3D15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: 'monospace', fontWeight: '700' }}>ALTA DEMANDA</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF3D3D', fontFamily: 'monospace' }}>{formatBRL(fin.perdaAltaDemanda)}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#FF8C0008', borderWidth: 1, borderColor: '#FF8C0015', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: 'monospace', fontWeight: '700' }}>BAIXA DEMANDA</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF8C00', fontFamily: 'monospace' }}>{formatBRL(fin.perdaBaixaDemanda)}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#00E5FF08', borderWidth: 1, borderColor: '#00E5FF15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 8, color: NEON.muted, fontFamily: 'monospace', fontWeight: '700' }}>INVESTIR</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#00E5FF', fontFamily: 'monospace' }}>{formatBRL(fin.investimentoPreventivo)}</Text>
                    </View>
                  </View>
                  {/* Row 3: Racional compact */}
                  <Text style={{ fontSize: 9, color: NEON.muted, fontFamily: 'monospace', lineHeight: 13 }} numberOfLines={2}>{fin.racional}</Text>
                </TouchableOpacity>
              );
            })}
            {modalMode === 'default' && selectedRisks.map(r => {
              const level = getRiskLevel(r.riscoInerente);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[s.modalRiskRow, { borderColor: NEON.cardBorder }]}
                  onPress={() => { setShowModal(false); router.push(`/risk/${r.id}` as any); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.modalRiskId, { backgroundColor: level.color + '15', borderWidth: 1, borderColor: level.color + '30' }]}>
                    <Text style={[s.modalRiskIdText, { color: level.color, fontFamily: 'monospace' }]}>{r.id}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.modalRiskDesc, { color: NEON.text }]} numberOfLines={2}>{r.descricaoRisco}</Text>
                    <Text style={[s.modalRiskMeta, { color: NEON.muted, fontFamily: 'monospace' }]}>PxI: {r.riscoInerente} | GUT: {r.gutScore} | {r.tratamento}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={NEON.muted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[s.container, { maxWidth: isDesktop ? 1280 : undefined, alignSelf: 'center', width: '100%' }]}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={[s.header, { paddingHorizontal: isDesktop ? 20 : 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={[s.headerTitle, { color: NEON.text, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>Visão Estratégica</Text>
              <StatusIndicator status="active" showLabel={false} />
            </View>
            <Text style={[s.headerSubtitle, { color: NEON.muted, fontFamily: 'monospace' }]}>PAINEL EXECUTIVO PARA O BOARD — DAMACORP</Text>
          </Animated.View>

          {/* Executive KPIs */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 20 : 10 }]}>
            <View style={isDesktop ? s.kpiGridDesktop : s.kpiGridMobile}>
              <GaugeCard label="EXPOSIÇÃO TOTAL" value={stats.exposurePct} max={100} unit="%" color={stats.exposurePct > 60 ? '#FF3D3D' : stats.exposurePct > 40 ? '#FF8C00' : '#00FF88'} subtitle={`${stats.exposureScore} de ${stats.maxExposure} pontos`} />
              <GaugeCard label="GUT MÉDIO" value={stats.avgGut} max={125} unit=" pts" color={getGutLevel(stats.avgGut).color} subtitle={getGutLevel(stats.avgGut).label} />
              <GaugeCard label="COBERTURA DE CONTROLES" value={stats.controlPct} max={100} unit="%" color={stats.controlPct >= 80 ? '#00FF88' : stats.controlPct >= 50 ? '#FFD600' : '#FF3D3D'} subtitle={`${stats.withControls} de ${risks.length} riscos`} />
              <GaugeCard label="RISCOS ESTRATÉGICOS" value={stats.strategicPct} max={100} unit="%" color={NEON.cyan} subtitle={`${stats.strategic} de ${risks.length} riscos`} />
            </View>
          </View>

          {/* Risk Level Summary Bar */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 20 : 10 }]}>
            <View style={[s.card, { backgroundColor: NEON.card, borderColor: NEON.cardBorder }]}>
              <View style={s.cardHeader}>
                <IconSymbol name="gauge.medium" size={18} color={NEON.cyan} />
                <Text style={[s.cardTitle, { color: NEON.text }]}>Distribuição por Nível de Risco</Text>
              </View>
              <View style={s.levelBarContainer}>
                {[
                  { label: 'Crítico', count: stats.critico, color: '#FF3D3D' },
                  { label: 'Alto', count: stats.alto, color: '#FF8C00' },
                  { label: 'Médio', count: stats.medio, color: '#FFD600' },
                  { label: 'Baixo', count: stats.baixo, color: '#00FF88' },
                ].map(item => {
                  const pct = risks.length > 0 ? (item.count / risks.length) * 100 : 0;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={[s.levelBarSegment, { width: `${Math.max(pct, 2)}%` as any, backgroundColor: item.color }]}
                      onPress={() => openModal(`Nível: ${item.label}`, risks.filter(r => getRiskLevel(r.riscoInerente).label === item.label || (item.label === 'Baixo' && getRiskLevel(r.riscoInerente).label === 'Muito Baixo')))}
                      activeOpacity={0.7}
                    >
                      {pct >= 8 && <Text style={s.levelBarText}>{item.count}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={s.levelLegend}>
                {[
                  { label: 'Crítico', count: stats.critico, color: '#FF3D3D' },
                  { label: 'Alto', count: stats.alto, color: '#FF8C00' },
                  { label: 'Médio', count: stats.medio, color: '#FFD600' },
                  { label: 'Baixo', count: stats.baixo, color: '#00FF88' },
                ].map(item => (
                  <View key={item.label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: item.color, shadowColor: item.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4 }]} />
                    <Text style={[s.legendText, { color: NEON.muted, fontFamily: 'monospace' }]}>{item.label}: {item.count} ({risks.length > 0 ? Math.round((item.count / risks.length) * 100) : 0}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Main Content Grid */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 16 : 8 }]}>
            <View style={isDesktop ? s.twoColGrid : { gap: 10 }}>
              <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}><HeatMapByType /></View>
              <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}><TreatmentChart /></View>
            </View>
          </View>

          {/* Financial Investment & Impact */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 16 : 8 }]}>
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: '#00E5FF' }} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: NEON.text, letterSpacing: 1, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>Análise Financeira</Text>
              </View>
              <Text style={{ fontSize: 11, color: NEON.muted, fontFamily: 'monospace', marginTop: 4, marginLeft: 14 }}>Investimento preventivo vs. impacto financeiro — clique nos quadros para ver detalhes priorizados</Text>
            </View>
            <View style={isDesktop ? s.twoColGrid : { gap: 16 }}>
              {/* Investment Card */}
              <TouchableOpacity
                style={[s.card, { backgroundColor: NEON.card, borderColor: '#00E5FF30', flex: isDesktop ? 1 : undefined }]}
                onPress={() => {
                  setModalTitle('Investimentos Preventivos — Priorizados por ROI');
                  setSelectedRisks(financialStats.byROI);
                  setShowModal(true);
                  setModalMode('investment');
                }}
                activeOpacity={0.7}
              >
                <View style={s.cardHeader}>
                  <IconSymbol name="shield.fill" size={20} color="#00E5FF" />
                  <Text style={[s.cardTitle, { color: NEON.text, fontSize: 15 }]}>Investimento Preventivo</Text>
                </View>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: NEON.muted, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 4 }}>TOTAL RECOMENDADO</Text>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: '#00E5FF', fontFamily: 'monospace' }}>R$ {(financialStats.totalInvestimento / 1000000).toFixed(1)}M</Text>
                  <Text style={{ fontSize: 11, color: NEON.muted, fontFamily: 'monospace', marginTop: 4 }}>Controles + Contingências</Text>
                </View>
                <View style={{ borderTopWidth: 1, borderTopColor: NEON.cardBorder, paddingTop: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, color: NEON.muted, fontFamily: 'monospace' }}>PERDA EVITADA</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#00FF88', fontFamily: 'monospace' }}>R$ {(financialStats.totalPerdaEvitada / 1000000).toFixed(1)}M</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, color: NEON.muted, fontFamily: 'monospace' }}>ROI MÉDIO</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#00FF88', fontFamily: 'monospace' }}>{financialStats.roiMedio.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12, backgroundColor: '#00E5FF10', borderRadius: 6, padding: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#00E5FF', fontFamily: 'monospace', fontWeight: '600' }}>CLIQUE PARA VER PRIORIZAÇÃO →</Text>
                </View>
              </TouchableOpacity>

              {/* Impact Card */}
              <TouchableOpacity
                style={[s.card, { backgroundColor: NEON.card, borderColor: '#FF3D3D30', flex: isDesktop ? 1 : undefined }]}
                onPress={() => {
                  setModalTitle('Impacto Financeiro — Maior Exposição');
                  setSelectedRisks(financialStats.byImpact);
                  setShowModal(true);
                  setModalMode('impact');
                }}
                activeOpacity={0.7}
              >
                <View style={s.cardHeader}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF3D3D" />
                  <Text style={[s.cardTitle, { color: NEON.text, fontSize: 15 }]}>Impacto Financeiro</Text>
                </View>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: NEON.muted, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 4 }}>EXPOSIÇÃO TOTAL (ALTA)</Text>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: '#FF3D3D', fontFamily: 'monospace' }}>R$ {(financialStats.totalExposicaoAlta / 1000000).toFixed(1)}M</Text>
                  <Text style={{ fontSize: 11, color: NEON.muted, fontFamily: 'monospace', marginTop: 4 }}>Black Friday / Natal</Text>
                </View>
                <View style={{ borderTopWidth: 1, borderTopColor: NEON.cardBorder, paddingTop: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, color: NEON.muted, fontFamily: 'monospace' }}>EXPOSIÇÃO (BAIXA)</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF8C00', fontFamily: 'monospace' }}>R$ {(financialStats.totalExposicaoBaixa / 1000000).toFixed(1)}M</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, color: NEON.muted, fontFamily: 'monospace' }}>MÉDIA PONDERADA</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFD600', fontFamily: 'monospace' }}>R$ {((financialStats.totalExposicaoAlta * 0.3 + financialStats.totalExposicaoBaixa * 0.7) / 1000000).toFixed(1)}M</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12, backgroundColor: '#FF3D3D10', borderRadius: 6, padding: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#FF3D3D', fontFamily: 'monospace', fontWeight: '600' }}>CLIQUE PARA VER DETALHES →</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[s.section, { paddingHorizontal: isDesktop ? 16 : 8 }]}><InternalExternalSection /></View>
          <View style={[s.section, { paddingHorizontal: isDesktop ? 16 : 8 }]}><TPRMSection /></View>

          <View style={[s.section, { paddingHorizontal: isDesktop ? 16 : 8 }]}>
            <View style={isDesktop ? s.twoColGrid : { gap: 16 }}>
              <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}><Top10Section /></View>
              <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}><ResponsibleSection /></View>
            </View>
          </View>
        </View>
      </ScrollView>
      <RiskModal />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { paddingTop: 2 },
  header: { paddingVertical: 6 },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  headerSubtitle: { fontSize: 12, marginTop: 2, letterSpacing: 1 },
  section: { marginBottom: 8 },
  kpiGridDesktop: { flexDirection: 'row', gap: 12 },
  kpiGridMobile: { gap: 8 },
  gaugeCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10 },
  gaugeLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'monospace' },
  gaugeValue: { fontSize: 26, fontWeight: '800', marginTop: 2, fontFamily: 'monospace' },
  gaugeUnit: { fontSize: 16, fontWeight: '600' },
  gaugeBarBg: { height: 4, borderRadius: 2, marginTop: 8 },
  gaugeBarFill: { height: 4, borderRadius: 2 },
  gaugeSubtitle: { fontSize: 10, marginTop: 4, fontFamily: 'monospace' },
  card: { borderRadius: 10, borderWidth: 1, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1, letterSpacing: 0.5 },
  heatRow: { marginBottom: 12 },
  heatLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  heatLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  heatCount: { fontSize: 13, fontWeight: '700', minWidth: 20, textAlign: 'right' },
  heatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  heatBadgeText: { fontSize: 10, fontWeight: '700' },
  heatBarBg: { height: 6, borderRadius: 3 },
  heatBarFill: { height: 6, borderRadius: 3 },
  treatmentGrid: { gap: 8 },
  treatmentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  treatmentDot: { width: 10, height: 10, borderRadius: 5 },
  treatmentLabel: { fontSize: 12, fontWeight: '600' },
  treatmentPct: { fontSize: 10, marginTop: 1 },
  treatmentNum: { fontSize: 20, fontWeight: '800' },
  tprmBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  tprmBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  tprmStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tprmStatsCol: { gap: 8, marginBottom: 16 },
  tprmStatCard: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 14, alignItems: 'center' },
  tprmStatLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tprmStatValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  tprmStatSub: { fontSize: 11, marginTop: 1 },
  tprmRiskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  tprmRiskId: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  tprmRiskIdText: { fontSize: 12, fontWeight: '700' },
  tprmRiskDesc: { fontSize: 13, lineHeight: 18 },
  tprmRiskMeta: { fontSize: 10, marginTop: 2 },
  tprmRiskScore: { fontSize: 18, fontWeight: '800' },
  tprmRiskLevel: { fontSize: 10, fontWeight: '600' },
  top10Row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  top10Rank: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  top10RankText: { fontSize: 13, fontWeight: '800' },
  top10Id: { fontSize: 12, fontWeight: '700' },
  top10LevelBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  top10LevelText: { fontSize: 10, fontWeight: '600' },
  top10Desc: { fontSize: 13, lineHeight: 17, marginTop: 1 },
  top10BarBg: { height: 4, borderRadius: 2, marginTop: 4 },
  top10BarFill: { height: 4, borderRadius: 2 },
  top10Gut: { fontSize: 20, fontWeight: '800' },
  top10GutLabel: { fontSize: 9, fontWeight: '600' },
  respRow: { marginBottom: 12 },
  respLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  respLabel: { fontSize: 12, fontWeight: '500', flex: 1 },
  respCount: { fontSize: 14, fontWeight: '700' },
  levelBarContainer: { flexDirection: 'row', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  levelBarSegment: { justifyContent: 'center', alignItems: 'center' },
  levelBarText: { color: '#000', fontSize: 11, fontWeight: '800' },
  levelLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  originCard: { borderRadius: 10, borderWidth: 1, padding: 16, alignItems: 'center' },
  originLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  originValue: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  originPct: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  originBar: { height: 4, borderRadius: 2, width: '100%', marginTop: 8 },
  originBarFill: { height: 4, borderRadius: 2 },
  twoColGrid: { flexDirection: 'row', gap: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { borderRadius: 12, padding: 16, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  modalSubtitle: { fontSize: 12, marginBottom: 16 },
  modalRiskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  modalRiskId: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  modalRiskIdText: { fontSize: 12, fontWeight: '700' },
  modalRiskDesc: { fontSize: 13, lineHeight: 17 },
  modalRiskMeta: { fontSize: 10, marginTop: 2 },
});
