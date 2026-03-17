import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions, Modal } from "react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel, Risk } from "@/lib/models";
import { IconSymbol } from "@/components/ui/icon-symbol";

// --- Helper: group risks by field ---
function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  arr.forEach(item => {
    const key = fn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  });
  return result;
}

// --- Color helpers ---
function levelColor(label: string): string {
  switch (label) {
    case 'Crítico': return '#EF4444';
    case 'Alto': return '#F97316';
    case 'Médio': return '#F59E0B';
    case 'Baixo': return '#10B981';
    default: return '#6EE7B7';
  }
}

function treatmentColor(t: string): string {
  if (t.includes('Mitigar') && t.includes('Transferir')) return '#8B5CF6';
  if (t.includes('Mitigar')) return '#3B82F6';
  if (t.includes('Transferir')) return '#F59E0B';
  if (t.includes('Evitar')) return '#EF4444';
  if (t.includes('Aceitar')) return '#10B981';
  return '#718096';
}

export default function StrategicScreen() {
  const { risks } = useRisks();
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [selectedRisks, setSelectedRisks] = useState<Risk[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [showModal, setShowModal] = useState(false);

  // --- Computed data ---
  const stats = useMemo(() => {
    const levels = risks.map(r => getRiskLevel(r.riscoInerente).label);
    const critico = levels.filter(l => l === 'Crítico').length;
    const alto = levels.filter(l => l === 'Alto').length;
    const medio = levels.filter(l => l === 'Médio').length;
    const baixo = levels.filter(l => l === 'Baixo' || l === 'Muito Baixo').length;

    // Exposure score (weighted)
    const exposureScore = risks.reduce((sum, r) => sum + r.riscoInerente, 0);
    const maxExposure = risks.length * 25;
    const exposurePct = maxExposure > 0 ? Math.round((exposureScore / maxExposure) * 100) : 0;

    // Average GUT
    const avgGut = risks.length > 0 ? Math.round(risks.reduce((s, r) => s + r.gutScore, 0) / risks.length) : 0;

    // Control coverage (risks with controles filled)
    const withControls = risks.filter(r => r.controles && r.controles.trim().length > 10).length;
    const controlPct = risks.length > 0 ? Math.round((withControls / risks.length) * 100) : 0;

    // Strategic risks
    const strategic = risks.filter(r => r.estrategico === 'SIM').length;
    const strategicPct = risks.length > 0 ? Math.round((strategic / risks.length) * 100) : 0;

    // TPRM risks
    const tprm = risks.filter(r =>
      r.fonteDeRisco.includes('Fornecedores') ||
      r.tipoRisco.includes('Cadeia') ||
      r.descricaoRisco.toLowerCase().includes('terceiro') ||
      r.descricaoRisco.toLowerCase().includes('fornecedor') ||
      r.descricaoRisco.toLowerCase().includes('parceiro') ||
      r.descricaoRisco.toLowerCase().includes('transportadora') ||
      r.descricaoRisco.toLowerCase().includes('cloud') ||
      r.descricaoRisco.toLowerCase().includes('jurídico') ||
      r.descricaoRisco.toLowerCase().includes('agência')
    );

    return { critico, alto, medio, baixo, exposureScore, maxExposure, exposurePct, avgGut, controlPct, withControls, strategic, strategicPct, tprm };
  }, [risks]);

  // --- Group by type ---
  const byType = useMemo(() => groupBy(risks, r => r.tipoRisco || 'Não classificado'), [risks]);

  // --- Group by fonte ---
  const byFonte = useMemo(() => groupBy(risks, r => {
    const f = r.fonteDeRisco;
    if (f.startsWith('FE')) return 'Externo';
    if (f.startsWith('FI')) return 'Interno';
    return 'Outros';
  }), [risks]);

  // --- Treatment distribution ---
  const byTreatment = useMemo(() => groupBy(risks, r => r.tratamento || 'Não definido'), [risks]);

  // --- Top 10 by GUT ---
  const top10 = useMemo(() => [...risks].sort((a, b) => b.gutScore - a.gutScore).slice(0, 10), [risks]);

  // --- Responsible distribution ---
  const byResponsible = useMemo(() => {
    const groups = groupBy(risks, r => r.responsavel || 'Não atribuído');
    return Object.entries(groups)
      .map(([name, items]) => ({ name, count: items.length, risks: items }))
      .sort((a, b) => b.count - a.count);
  }, [risks]);

  const openModal = (title: string, riskList: Risk[]) => {
    setModalTitle(title);
    setSelectedRisks(riskList);
    setShowModal(true);
  };

  // --- Gauge component ---
  const GaugeCard = ({ label, value, max, unit, color, subtitle }: { label: string; value: number; max: number; unit: string; color: string; subtitle?: string }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
      <View style={[s.gaugeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.gaugeLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[s.gaugeValue, { color }]}>{value}<Text style={s.gaugeUnit}>{unit}</Text></Text>
        <View style={[s.gaugeBarBg, { backgroundColor: colors.border }]}>
          <View style={[s.gaugeBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
        {subtitle && <Text style={[s.gaugeSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
      </View>
    );
  };

  // --- Heat Map by Type ---
  const HeatMapByType = () => {
    const types = Object.entries(byType).sort((a, b) => b[1].length - a[1].length);
    const maxCount = Math.max(...types.map(([, items]) => items.length), 1);

    return (
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.cardHeader}>
          <IconSymbol name="chart.bar.fill" size={18} color={colors.primary} />
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Mapa de Calor por Tipo de Risco</Text>
        </View>
        {types.map(([type, items]) => {
          const avgScore = Math.round(items.reduce((s, r) => s + r.riscoInerente, 0) / items.length);
          const level = getRiskLevel(avgScore);
          const barWidth = (items.length / maxCount) * 100;
          return (
            <TouchableOpacity
              key={type}
              style={s.heatRow}
              onPress={() => openModal(type, items)}
              activeOpacity={0.7}
            >
              <View style={s.heatLabelRow}>
                <Text style={[s.heatLabel, { color: colors.foreground }]} numberOfLines={1}>{type.replace('Risco ', '').replace('Risco de ', '')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.heatBadge, { backgroundColor: level.color + '20' }]}>
                    <Text style={[s.heatBadgeText, { color: level.color }]}>{level.label}</Text>
                  </View>
                  <Text style={[s.heatCount, { color: colors.muted }]}>{items.length}</Text>
                </View>
              </View>
              <View style={[s.heatBarBg, { backgroundColor: colors.border }]}>
                <View style={[s.heatBarFill, { width: `${barWidth}%` as any, backgroundColor: level.color }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // --- Treatment Strategy Donut (simplified as bars) ---
  const TreatmentChart = () => {
    const entries = Object.entries(byTreatment).sort((a, b) => b[1].length - a[1].length);
    return (
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.cardHeader}>
          <IconSymbol name="flag.fill" size={18} color={colors.primary} />
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Estratégias de Tratamento (MATE)</Text>
        </View>
        <View style={s.treatmentGrid}>
          {entries.map(([treatment, items]) => {
            const color = treatmentColor(treatment);
            const pct = risks.length > 0 ? Math.round((items.length / risks.length) * 100) : 0;
            return (
              <TouchableOpacity
                key={treatment}
                style={[s.treatmentItem, { borderColor: color + '30' }]}
                onPress={() => openModal(`Tratamento: ${treatment}`, items)}
                activeOpacity={0.7}
              >
                <View style={[s.treatmentDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.treatmentLabel, { color: colors.foreground }]}>{treatment}</Text>
                  <Text style={[s.treatmentPct, { color: colors.muted }]}>{items.length} riscos ({pct}%)</Text>
                </View>
                <Text style={[s.treatmentNum, { color }]}>{items.length}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // --- TPRM Section ---
  const TPRMSection = () => {
    if (stats.tprm.length === 0) return null;
    const avgScore = Math.round(stats.tprm.reduce((s, r) => s + r.riscoInerente, 0) / stats.tprm.length);
    const avgGut = Math.round(stats.tprm.reduce((s, r) => s + r.gutScore, 0) / stats.tprm.length);
    const level = getRiskLevel(avgScore);

    return (
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.cardHeader}>
          <IconSymbol name="person.3.fill" size={18} color="#8B5CF6" />
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Avaliação de Terceiros (TPRM)</Text>
          <View style={[s.tprmBadge, { backgroundColor: '#8B5CF6' + '20' }]}>
            <Text style={[s.tprmBadgeText, { color: '#8B5CF6' }]}>{stats.tprm.length} riscos</Text>
          </View>
        </View>

        <View style={isDesktop ? s.tprmStatsRow : s.tprmStatsCol}>
          <View style={[s.tprmStatCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[s.tprmStatLabel, { color: colors.muted }]}>P x I Médio</Text>
            <Text style={[s.tprmStatValue, { color: level.color }]}>{avgScore}</Text>
            <Text style={[s.tprmStatSub, { color: level.color }]}>{level.label}</Text>
          </View>
          <View style={[s.tprmStatCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[s.tprmStatLabel, { color: colors.muted }]}>GUT Médio</Text>
            <Text style={[s.tprmStatValue, { color: getGutLevel(avgGut).color }]}>{avgGut}</Text>
            <Text style={[s.tprmStatSub, { color: getGutLevel(avgGut).color }]}>{getGutLevel(avgGut).label}</Text>
          </View>
          <View style={[s.tprmStatCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[s.tprmStatLabel, { color: colors.muted }]}>% do Total</Text>
            <Text style={[s.tprmStatValue, { color: '#8B5CF6' }]}>{Math.round((stats.tprm.length / risks.length) * 100)}%</Text>
            <Text style={[s.tprmStatSub, { color: colors.muted }]}>dos riscos</Text>
          </View>
        </View>

        {stats.tprm.map(r => {
          const rLevel = getRiskLevel(r.riscoInerente);
          return (
            <TouchableOpacity
              key={r.id}
              style={[s.tprmRiskRow, { borderColor: colors.border }]}
              onPress={() => router.push(`/risk/${r.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={[s.tprmRiskId, { backgroundColor: rLevel.color + '15' }]}>
                <Text style={[s.tprmRiskIdText, { color: rLevel.color }]}>{r.id}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.tprmRiskDesc, { color: colors.foreground }]} numberOfLines={2}>{r.descricaoRisco}</Text>
                <Text style={[s.tprmRiskMeta, { color: colors.muted }]}>{r.responsavel} | {r.tratamento}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.tprmRiskScore, { color: rLevel.color }]}>{r.riscoInerente}</Text>
                <Text style={[s.tprmRiskLevel, { color: rLevel.color }]}>{rLevel.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // --- Top 10 Risks ---
  const Top10Section = () => (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.cardHeader}>
        <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#EF4444" />
        <Text style={[s.cardTitle, { color: colors.foreground }]}>Top 10 Riscos Prioritários (GUT)</Text>
      </View>
      {top10.map((r, i) => {
        const level = getRiskLevel(r.riscoInerente);
        const gutLevel = getGutLevel(r.gutScore);
        const maxGut = top10[0]?.gutScore || 1;
        const barPct = (r.gutScore / maxGut) * 100;
        return (
          <TouchableOpacity
            key={r.id}
            style={[s.top10Row, { borderColor: colors.border }]}
            onPress={() => router.push(`/risk/${r.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={[s.top10Rank, { backgroundColor: i < 3 ? '#EF4444' + '15' : colors.background }]}>
              <Text style={[s.top10RankText, { color: i < 3 ? '#EF4444' : colors.muted }]}>#{i + 1}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={[s.top10Id, { color: level.color }]}>{r.id}</Text>
                <View style={[s.top10LevelBadge, { backgroundColor: level.color + '15' }]}>
                  <Text style={[s.top10LevelText, { color: level.color }]}>PxI: {r.riscoInerente}</Text>
                </View>
              </View>
              <Text style={[s.top10Desc, { color: colors.foreground }]} numberOfLines={1}>{r.descricaoRisco}</Text>
              <View style={[s.top10BarBg, { backgroundColor: colors.border }]}>
                <View style={[s.top10BarFill, { width: `${barPct}%` as any, backgroundColor: gutLevel.color }]} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
              <Text style={[s.top10Gut, { color: gutLevel.color }]}>{r.gutScore}</Text>
              <Text style={[s.top10GutLabel, { color: gutLevel.color }]}>GUT</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // --- Responsible Distribution ---
  const ResponsibleSection = () => (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.cardHeader}>
        <IconSymbol name="building.2.fill" size={18} color={colors.primary} />
        <Text style={[s.cardTitle, { color: colors.foreground }]}>Distribuição por Responsável / Área</Text>
      </View>
      {byResponsible.map(({ name, count, risks: riskList }) => {
        const maxCount = byResponsible[0]?.count || 1;
        const barPct = (count / maxCount) * 100;
        const avgScore = Math.round(riskList.reduce((s, r) => s + r.riscoInerente, 0) / riskList.length);
        const level = getRiskLevel(avgScore);
        return (
          <TouchableOpacity
            key={name}
            style={s.respRow}
            onPress={() => openModal(`Responsável: ${name}`, riskList)}
            activeOpacity={0.7}
          >
            <View style={s.respLabelRow}>
              <Text style={[s.respLabel, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.heatBadge, { backgroundColor: level.color + '20' }]}>
                  <Text style={[s.heatBadgeText, { color: level.color }]}>Avg: {avgScore}</Text>
                </View>
                <Text style={[s.respCount, { color: colors.primary }]}>{count}</Text>
              </View>
            </View>
            <View style={[s.heatBarBg, { backgroundColor: colors.border }]}>
              <View style={[s.heatBarFill, { width: `${barPct}%` as any, backgroundColor: colors.primary }]} />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // --- Internal vs External ---
  const InternalExternalSection = () => {
    const interno = byFonte['Interno'] || [];
    const externo = byFonte['Externo'] || [];
    const totalR = risks.length || 1;
    return (
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.cardHeader}>
          <IconSymbol name="target" size={18} color={colors.primary} />
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Origem dos Riscos</Text>
        </View>
        <View style={isDesktop ? { flexDirection: 'row', gap: 16 } : { gap: 12 }}>
          <TouchableOpacity
            style={[s.originCard, { backgroundColor: '#3B82F6' + '10', borderColor: '#3B82F6' + '30', flex: 1 }]}
            onPress={() => openModal('Riscos Internos', interno)}
            activeOpacity={0.7}
          >
            <Text style={[s.originLabel, { color: '#3B82F6' }]}>Internos (FI)</Text>
            <Text style={[s.originValue, { color: '#3B82F6' }]}>{interno.length}</Text>
            <Text style={[s.originPct, { color: '#3B82F6' }]}>{Math.round((interno.length / totalR) * 100)}%</Text>
            <View style={[s.originBar, { backgroundColor: '#3B82F6' + '20' }]}>
              <View style={[s.originBarFill, { width: `${(interno.length / totalR) * 100}%` as any, backgroundColor: '#3B82F6' }]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.originCard, { backgroundColor: '#F97316' + '10', borderColor: '#F97316' + '30', flex: 1 }]}
            onPress={() => openModal('Riscos Externos', externo)}
            activeOpacity={0.7}
          >
            <Text style={[s.originLabel, { color: '#F97316' }]}>Externos (FE)</Text>
            <Text style={[s.originValue, { color: '#F97316' }]}>{externo.length}</Text>
            <Text style={[s.originPct, { color: '#F97316' }]}>{Math.round((externo.length / totalR) * 100)}%</Text>
            <View style={[s.originBar, { backgroundColor: '#F97316' + '20' }]}>
              <View style={[s.originBarFill, { width: `${(externo.length / totalR) * 100}%` as any, backgroundColor: '#F97316' }]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Risk Modal ---
  const RiskModal = () => (
    <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: colors.surface, maxWidth: isDesktop ? 700 : '92%' as any }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>{modalTitle}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.7}>
              <IconSymbol name="xmark" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[s.modalSubtitle, { color: colors.muted }]}>{selectedRisks.length} riscos</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {selectedRisks.map(r => {
              const level = getRiskLevel(r.riscoInerente);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[s.modalRiskRow, { borderColor: colors.border }]}
                  onPress={() => { setShowModal(false); router.push(`/risk/${r.id}` as any); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.modalRiskId, { backgroundColor: level.color + '15' }]}>
                    <Text style={[s.modalRiskIdText, { color: level.color }]}>{r.id}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.modalRiskDesc, { color: colors.foreground }]} numberOfLines={2}>{r.descricaoRisco}</Text>
                    <Text style={[s.modalRiskMeta, { color: colors.muted }]}>PxI: {r.riscoInerente} | GUT: {r.gutScore} | {r.tratamento}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
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
          <View style={[s.header, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
            <View>
              <Text style={[s.headerTitle, { color: colors.foreground }]}>Visão Estratégica</Text>
              <Text style={[s.headerSubtitle, { color: colors.muted }]}>Painel Executivo para o Board - DAMACORP</Text>
            </View>
          </View>

          {/* Executive KPIs */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
            <View style={isDesktop ? s.kpiGridDesktop : s.kpiGridMobile}>
              <GaugeCard
                label="Exposição Total"
                value={stats.exposurePct}
                max={100}
                unit="%"
                color={stats.exposurePct > 60 ? '#EF4444' : stats.exposurePct > 40 ? '#F97316' : '#10B981'}
                subtitle={`${stats.exposureScore} de ${stats.maxExposure} pontos`}
              />
              <GaugeCard
                label="GUT Médio"
                value={stats.avgGut}
                max={125}
                unit=" pts"
                color={getGutLevel(stats.avgGut).color}
                subtitle={getGutLevel(stats.avgGut).label}
              />
              <GaugeCard
                label="Cobertura de Controles"
                value={stats.controlPct}
                max={100}
                unit="%"
                color={stats.controlPct >= 80 ? '#10B981' : stats.controlPct >= 50 ? '#F59E0B' : '#EF4444'}
                subtitle={`${stats.withControls} de ${risks.length} riscos`}
              />
              <GaugeCard
                label="Riscos Estratégicos"
                value={stats.strategicPct}
                max={100}
                unit="%"
                color={colors.primary}
                subtitle={`${stats.strategic} de ${risks.length} riscos`}
              />
            </View>
          </View>

          {/* Risk Level Summary Bar */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.cardHeader}>
                <IconSymbol name="gauge.medium" size={18} color={colors.primary} />
                <Text style={[s.cardTitle, { color: colors.foreground }]}>Distribuição por Nível de Risco</Text>
              </View>
              <View style={s.levelBarContainer}>
                {[
                  { label: 'Crítico', count: stats.critico, color: '#EF4444' },
                  { label: 'Alto', count: stats.alto, color: '#F97316' },
                  { label: 'Médio', count: stats.medio, color: '#F59E0B' },
                  { label: 'Baixo', count: stats.baixo, color: '#10B981' },
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
                  { label: 'Crítico', count: stats.critico, color: '#EF4444' },
                  { label: 'Alto', count: stats.alto, color: '#F97316' },
                  { label: 'Médio', count: stats.medio, color: '#F59E0B' },
                  { label: 'Baixo', count: stats.baixo, color: '#10B981' },
                ].map(item => (
                  <View key={item.label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[s.legendText, { color: colors.muted }]}>{item.label}: {item.count} ({risks.length > 0 ? Math.round((item.count / risks.length) * 100) : 0}%)</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Main Content Grid */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
            <View style={isDesktop ? s.twoColGrid : { gap: 16 }}>
              <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
                <HeatMapByType />
              </View>
              <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
                <TreatmentChart />
              </View>
            </View>
          </View>

          {/* Internal vs External */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
            <InternalExternalSection />
          </View>

          {/* TPRM */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
            <TPRMSection />
          </View>

          {/* Top 10 and Responsible */}
          <View style={[s.section, { paddingHorizontal: isDesktop ? 32 : 16 }]}>
            <View style={isDesktop ? s.twoColGrid : { gap: 16 }}>
              <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
                <Top10Section />
              </View>
              <View style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}>
                <ResponsibleSection />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <RiskModal />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { paddingTop: 8 },
  header: { paddingVertical: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  section: { marginBottom: 16 },

  // KPI Gauges
  kpiGridDesktop: { flexDirection: 'row', gap: 16 },
  kpiGridMobile: { gap: 12 },
  gaugeCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 16 },
  gaugeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  gaugeValue: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  gaugeUnit: { fontSize: 16, fontWeight: '600' },
  gaugeBarBg: { height: 6, borderRadius: 3, marginTop: 8 },
  gaugeBarFill: { height: 6, borderRadius: 3 },
  gaugeSubtitle: { fontSize: 11, marginTop: 4 },

  // Cards
  card: { borderRadius: 12, borderWidth: 1, padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },

  // Heat Map
  heatRow: { marginBottom: 12 },
  heatLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  heatLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  heatCount: { fontSize: 13, fontWeight: '700', minWidth: 20, textAlign: 'right' },
  heatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  heatBadgeText: { fontSize: 10, fontWeight: '700' },
  heatBarBg: { height: 8, borderRadius: 4 },
  heatBarFill: { height: 8, borderRadius: 4 },

  // Treatment
  treatmentGrid: { gap: 8 },
  treatmentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  treatmentDot: { width: 12, height: 12, borderRadius: 6 },
  treatmentLabel: { fontSize: 13, fontWeight: '600' },
  treatmentPct: { fontSize: 11, marginTop: 1 },
  treatmentNum: { fontSize: 20, fontWeight: '800' },

  // TPRM
  tprmBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  tprmBadgeText: { fontSize: 11, fontWeight: '700' },
  tprmStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tprmStatsCol: { gap: 8, marginBottom: 16 },
  tprmStatCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 14, alignItems: 'center' },
  tprmStatLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  tprmStatValue: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  tprmStatSub: { fontSize: 11, marginTop: 1 },
  tprmRiskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  tprmRiskId: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tprmRiskIdText: { fontSize: 12, fontWeight: '700' },
  tprmRiskDesc: { fontSize: 13, lineHeight: 18 },
  tprmRiskMeta: { fontSize: 11, marginTop: 2 },
  tprmRiskScore: { fontSize: 18, fontWeight: '800' },
  tprmRiskLevel: { fontSize: 10, fontWeight: '600' },

  // Top 10
  top10Row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  top10Rank: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  top10RankText: { fontSize: 13, fontWeight: '800' },
  top10Id: { fontSize: 12, fontWeight: '700' },
  top10LevelBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  top10LevelText: { fontSize: 10, fontWeight: '600' },
  top10Desc: { fontSize: 13, lineHeight: 17, marginTop: 1 },
  top10BarBg: { height: 4, borderRadius: 2, marginTop: 4 },
  top10BarFill: { height: 4, borderRadius: 2 },
  top10Gut: { fontSize: 20, fontWeight: '800' },
  top10GutLabel: { fontSize: 9, fontWeight: '600' },

  // Responsible
  respRow: { marginBottom: 12 },
  respLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  respLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  respCount: { fontSize: 14, fontWeight: '700' },

  // Level bar
  levelBarContainer: { flexDirection: 'row', height: 32, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  levelBarSegment: { justifyContent: 'center', alignItems: 'center' },
  levelBarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  levelLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },

  // Origin
  originCard: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center' },
  originLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  originValue: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  originPct: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  originBar: { height: 6, borderRadius: 3, width: '100%', marginTop: 8 },
  originBarFill: { height: 6, borderRadius: 3 },

  // Two col grid
  twoColGrid: { flexDirection: 'row', gap: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { borderRadius: 16, padding: 24, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  modalRiskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  modalRiskId: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  modalRiskIdText: { fontSize: 12, fontWeight: '700' },
  modalRiskDesc: { fontSize: 13, lineHeight: 17 },
  modalRiskMeta: { fontSize: 11, marginTop: 2 },
});
