import { View, Text, ScrollView, TouchableOpacity, Platform, useWindowDimensions, StyleSheet } from "react-native";
import { useState, useMemo } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel, getMatrixColor, Risk } from "@/lib/models";
import { GlowCard } from "@/components/ui/glow-card";
import Animated, { FadeInDown } from "react-native-reanimated";

const NEON = {
  bg: '#0A0E14',
  card: '#0D1117',
  cardBorder: '#1A3A2A',
  cyan: '#00E5FF',
  green: '#00FF88',
  yellow: '#FFD600',
  red: '#FF3D3D',
  orange: '#FF8C00',
  text: '#E0F0E0',
  muted: '#6B8A7A',
};

const LEVEL_COLORS = { critical: '#FF3D3D', high: '#FF8C00', medium: '#FFD600', low: '#00FF88' };

function formatCurrency(val: number): string {
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}K`;
  return `R$ ${val.toFixed(0)}`;
}

function levelColor(label: string): string {
  switch (label) {
    case 'Crítico': return LEVEL_COLORS.critical;
    case 'Alto': return LEVEL_COLORS.high;
    case 'Médio': return LEVEL_COLORS.medium;
    default: return LEVEL_COLORS.low;
  }
}

export default function ReportScreen() {
  const { risks } = useRisks();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [expandedSection, setExpandedSection] = useState<string | null>('sumario');

  // === COMPUTED DATA ===
  const stats = useMemo(() => {
    const total = risks.length;
    const criticos = risks.filter(r => r.riscoInerente >= 20);
    const altos = risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20);
    const medios = risks.filter(r => r.riscoInerente >= 6 && r.riscoInerente < 12);
    const baixos = risks.filter(r => r.riscoInerente < 6);
    const estrategicos = risks.filter(r => r.estrategico === 'SIM');
    const comTratamento = risks.filter(r => r.tratamento && r.tratamento !== '');
    const avgGut = total > 0 ? risks.reduce((s, r) => s + r.gutScore, 0) / total : 0;
    const avgPxI = total > 0 ? risks.reduce((s, r) => s + r.riscoInerente, 0) / total : 0;

    // Financial
    const totalPerdaAlta = risks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaAltaDemanda || 0), 0);
    const totalPerdaBaixa = risks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaBaixaDemanda || 0), 0);
    const totalPerdaMedia = risks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaMediaEsperada || 0), 0);
    const totalInvestimento = risks.reduce((s, r) => s + (r.impactoFinanceiro?.investimentoPreventivo || 0), 0);
    const totalPerdaEvitada = risks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaEvitada || 0), 0);
    const roiGlobal = totalInvestimento > 0 ? (totalPerdaEvitada / totalInvestimento) * 100 : 0;

    // Residual
    const totalInerente = risks.reduce((s, r) => s + r.riscoInerente, 0);
    const totalResidual = risks.reduce((s, r) => s + (r.riscoResidual || r.riscoInerente), 0);
    const reducaoGlobal = totalInerente > 0 ? ((1 - totalResidual / totalInerente) * 100) : 0;
    const criticosResidual = risks.filter(r => (r.riscoResidual || r.riscoInerente) >= 20);

    // By type
    const byType: Record<string, Risk[]> = {};
    risks.forEach(r => {
      const t = r.tipoRisco || 'Não classificado';
      if (!byType[t]) byType[t] = [];
      byType[t].push(r);
    });

    // MATE
    const mate: Record<string, number> = {};
    risks.forEach(r => {
      const t = r.tratamento || 'Não definido';
      mate[t] = (mate[t] || 0) + 1;
    });

    // Top 10 GUT
    const top10Gut = [...risks].sort((a, b) => b.gutScore - a.gutScore).slice(0, 10);

    // Top 10 Financial
    const top10Financial = [...risks]
      .filter(r => r.impactoFinanceiro)
      .sort((a, b) => (b.impactoFinanceiro?.perdaMediaEsperada || 0) - (a.impactoFinanceiro?.perdaMediaEsperada || 0))
      .slice(0, 10);

    // Top 10 ROI
    const top10ROI = [...risks]
      .filter(r => r.impactoFinanceiro && r.impactoFinanceiro.roiPrevencao > 0)
      .sort((a, b) => (b.impactoFinanceiro?.roiPrevencao || 0) - (a.impactoFinanceiro?.roiPrevencao || 0))
      .slice(0, 10);

    return {
      total, criticos, altos, medios, baixos, estrategicos, comTratamento,
      avgGut, avgPxI, totalPerdaAlta, totalPerdaBaixa, totalPerdaMedia,
      totalInvestimento, totalPerdaEvitada, roiGlobal, totalInerente,
      totalResidual, reducaoGlobal, criticosResidual, byType, mate,
      top10Gut, top10Financial, top10ROI,
    };
  }, [risks]);

  const toggleSection = (key: string) => {
    setExpandedSection(expandedSection === key ? null : key);
  };

  const SectionHeader = ({ title, sectionKey, color, subtitle }: { title: string; sectionKey: string; color: string; subtitle?: string }) => (
    <TouchableOpacity
      onPress={() => toggleSection(sectionKey)}
      activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color, fontSize: 13, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 1.5 }}>{title}</Text>
        {subtitle && <Text style={{ color: NEON.muted, fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color + '15', borderWidth: 1, borderColor: color + '40', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color, fontSize: 14, fontWeight: '800' }}>{expandedSection === sectionKey ? '−' : '+'}</Text>
      </View>
    </TouchableOpacity>
  );

  const KPICard = ({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) => (
    <View style={{ flex: 1, minWidth: 140, backgroundColor: color + '08', borderWidth: 1, borderColor: color + '25', borderRadius: 10, padding: 14, alignItems: 'center' }}>
      <Text style={{ color, fontSize: 22, fontWeight: '800', fontFamily: 'monospace' }}>{value}</Text>
      <Text style={{ color: NEON.muted, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center', marginTop: 4, letterSpacing: 0.5 }}>{label}</Text>
      {sub && <Text style={{ color: color + '80', fontSize: 8, fontFamily: 'monospace', marginTop: 2 }}>{sub}</Text>}
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ScrollView
        style={{ flex: 1, backgroundColor: NEON.bg }}
        contentContainerStyle={{ padding: isDesktop ? 32 : 16, paddingBottom: 100 }}
      >
        {/* === HEADER === */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: NEON.cyan, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 3, marginBottom: 4 }}>VETOR HORIZON CONSULTORIA DE RISCO</Text>
            <Text style={{ color: NEON.text, fontSize: isDesktop ? 24 : 20, fontWeight: '800', fontFamily: 'monospace', textAlign: 'center' }}>RELATÓRIO EXECUTIVO DE RISCOS</Text>
            <Text style={{ color: NEON.muted, fontSize: 12, fontFamily: 'monospace', marginTop: 4 }}>DAMACORP — ERM / ICAPT v5</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ backgroundColor: NEON.cyan + '15', borderWidth: 1, borderColor: NEON.cyan + '30', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>ISO 31000</Text>
              </View>
              <View style={{ backgroundColor: NEON.cyan + '15', borderWidth: 1, borderColor: NEON.cyan + '30', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>ISO 27001</Text>
              </View>
              <View style={{ backgroundColor: NEON.cyan + '15', borderWidth: 1, borderColor: NEON.cyan + '30', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>{stats.total} RISCOS</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* === 1. SUMÁRIO EXECUTIVO === */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <GlowCard variant="default">
            <SectionHeader title="1. SUMÁRIO EXECUTIVO" sectionKey="sumario" color={NEON.cyan} subtitle="Visão geral consolidada para o Conselho" />
            {expandedSection === 'sumario' && (
              <View style={{ marginTop: 16 }}>
                {/* KPI Row 1 */}
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <KPICard label="TOTAL DE RISCOS" value={`${stats.total}`} color={NEON.cyan} />
                  <KPICard label="CRÍTICOS" value={`${stats.criticos.length}`} color={NEON.red} sub={`${((stats.criticos.length / stats.total) * 100).toFixed(0)}% do total`} />
                  <KPICard label="ALTOS" value={`${stats.altos.length}`} color={NEON.orange} sub={`${((stats.altos.length / stats.total) * 100).toFixed(0)}% do total`} />
                  <KPICard label="ESTRATÉGICOS" value={`${stats.estrategicos.length}/${stats.total}`} color={NEON.green} />
                </View>
                {/* KPI Row 2 */}
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <KPICard label="GUT MÉDIO" value={stats.avgGut.toFixed(0)} color={NEON.yellow} />
                  <KPICard label="P×I MÉDIO" value={stats.avgPxI.toFixed(1)} color={NEON.orange} />
                  <KPICard label="COM TRATAMENTO" value={`${stats.comTratamento.length}/${stats.total}`} color={NEON.green} />
                  <KPICard label="REDUÇÃO GLOBAL" value={`${stats.reducaoGlobal.toFixed(0)}%`} color={NEON.green} sub="Inerente → Residual" />
                </View>
                {/* Parecer */}
                <View style={{ backgroundColor: '#111820', borderWidth: 1, borderColor: NEON.cardBorder, borderRadius: 8, padding: 14, marginTop: 4 }}>
                  <Text style={{ color: NEON.cyan, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 6 }}>PARECER DA CONSULTORIA</Text>
                  <Text style={{ color: NEON.text, fontSize: 11, lineHeight: 18, fontFamily: 'monospace' }}>
                    A DAMACORP apresenta {stats.total} riscos mapeados, dos quais {stats.criticos.length} são classificados como críticos (P×I ≥ 20) e {stats.altos.length} como altos. A exposição financeira total em cenário de alta demanda alcança {formatCurrency(stats.totalPerdaAlta)}, reduzida para {formatCurrency(stats.totalPerdaBaixa)} em períodos normais. Com investimento preventivo de {formatCurrency(stats.totalInvestimento)}, é possível evitar perdas de {formatCurrency(stats.totalPerdaEvitada)}, representando ROI de {stats.roiGlobal.toFixed(0)}%. A eficácia dos controles propostos reduz a exposição inerente em {stats.reducaoGlobal.toFixed(0)}%, migrando {stats.criticos.length - stats.criticosResidual.length} riscos da zona crítica para níveis aceitáveis. Recomenda-se priorização imediata dos {Math.min(5, stats.criticos.length)} riscos críticos remanescentes.
                  </Text>
                </View>
              </View>
            )}
          </GlowCard>
        </Animated.View>

        {/* === 2. IMPACTO FINANCEIRO === */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={{ marginTop: 16 }}>
          <GlowCard variant="default">
            <SectionHeader title="2. IMPACTO FINANCEIRO" sectionKey="financeiro" color={NEON.yellow} subtitle="Exposição, investimento preventivo e ROI" />
            {expandedSection === 'financeiro' && (
              <View style={{ marginTop: 16 }}>
                {/* Financial KPIs */}
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <KPICard label="EXPOSIÇÃO ALTA DEMANDA" value={formatCurrency(stats.totalPerdaAlta)} color={NEON.red} sub="Black Friday / Natal" />
                  <KPICard label="EXPOSIÇÃO BAIXA DEMANDA" value={formatCurrency(stats.totalPerdaBaixa)} color={NEON.orange} sub="Período normal" />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <KPICard label="INVESTIMENTO PREVENTIVO" value={formatCurrency(stats.totalInvestimento)} color={NEON.cyan} sub="Controles + Contingências" />
                  <KPICard label="PERDA EVITADA" value={formatCurrency(stats.totalPerdaEvitada)} color={NEON.green} sub={`ROI: ${stats.roiGlobal.toFixed(0)}%`} />
                </View>
                {/* Barra visual */}
                <View style={{ backgroundColor: '#111820', borderRadius: 8, borderWidth: 1, borderColor: NEON.cardBorder, padding: 12, marginBottom: 12 }}>
                  <Text style={{ color: NEON.muted, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>INVESTIR {formatCurrency(stats.totalInvestimento)} → EVITAR PERDA DE ATÉ {formatCurrency(stats.totalPerdaAlta)}</Text>
                  <View style={{ height: 20, backgroundColor: '#1A3A2A', borderRadius: 10, overflow: 'hidden', flexDirection: 'row' }}>
                    <View style={{ width: `${Math.min((stats.totalInvestimento / stats.totalPerdaAlta) * 100, 100)}%` as any, backgroundColor: NEON.cyan, borderRadius: 10 }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: NEON.cyan, fontSize: 8, fontFamily: 'monospace' }}>Investimento</Text>
                    <Text style={{ color: NEON.red, fontSize: 8, fontFamily: 'monospace' }}>Exposição evitada</Text>
                  </View>
                </View>
                {/* Top 10 Maiores Perdas */}
                <Text style={{ color: NEON.yellow, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>TOP 10 — MAIORES PERDAS ESPERADAS</Text>
                <View style={{ backgroundColor: '#111820', borderRadius: 8, borderWidth: 1, borderColor: NEON.cardBorder, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#0D1117', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder }}>
                    <Text style={{ width: 50, color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>ID</Text>
                    <Text style={{ flex: 1, color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>TIPO</Text>
                    <Text style={{ width: 80, color: NEON.red, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>PERDA</Text>
                    <Text style={{ width: 80, color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>INVEST.</Text>
                    <Text style={{ width: 55, color: NEON.green, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>ROI</Text>
                  </View>
                  {stats.top10Financial.map((r, i) => (
                    <View key={r.id} style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder + '40', backgroundColor: i % 2 === 0 ? '#111820' : '#0D1117' }}>
                      <Text style={{ width: 50, color: NEON.text, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{r.id}</Text>
                      <Text style={{ flex: 1, color: NEON.muted, fontSize: 9, fontFamily: 'monospace' }} numberOfLines={1}>{r.tipoRisco.replace('Risco ', '').replace('de ', '')}</Text>
                      <Text style={{ width: 80, color: NEON.red, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>{formatCurrency(r.impactoFinanceiro?.perdaMediaEsperada || 0)}</Text>
                      <Text style={{ width: 80, color: NEON.cyan, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>{formatCurrency(r.impactoFinanceiro?.investimentoPreventivo || 0)}</Text>
                      <Text style={{ width: 55, color: NEON.green, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>{(r.impactoFinanceiro?.roiPrevencao || 0).toFixed(0)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </GlowCard>
        </Animated.View>

        {/* === 3. EFICÁCIA DOS CONTROLES === */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={{ marginTop: 16 }}>
          <GlowCard variant="default">
            <SectionHeader title="3. EFICÁCIA DOS CONTROLES" sectionKey="eficacia" color={NEON.green} subtitle="Deslocamento Inerente → Residual" />
            {expandedSection === 'eficacia' && (
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <KPICard label="P×I INERENTE TOTAL" value={`${stats.totalInerente}`} color={NEON.red} />
                  <KPICard label="P×I RESIDUAL TOTAL" value={`${stats.totalResidual}`} color={NEON.green} />
                  <KPICard label="REDUÇÃO GLOBAL" value={`${stats.reducaoGlobal.toFixed(0)}%`} color={NEON.green} />
                  <KPICard label="CRÍTICOS RESIDUAIS" value={`${stats.criticosResidual.length}`} color={stats.criticosResidual.length > 0 ? NEON.red : NEON.green} />
                </View>
                {/* Deslocamento por nível */}
                <Text style={{ color: NEON.green, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>MIGRAÇÃO DE NÍVEIS DE RISCO</Text>
                <View style={{ backgroundColor: '#111820', borderRadius: 8, borderWidth: 1, borderColor: NEON.cardBorder, padding: 12 }}>
                  {[
                    { label: 'Crítico (≥20)', inerente: risks.filter(r => r.riscoInerente >= 20).length, residual: risks.filter(r => (r.riscoResidual || r.riscoInerente) >= 20).length, color: NEON.red },
                    { label: 'Alto (12-19)', inerente: risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20).length, residual: risks.filter(r => { const res = r.riscoResidual || r.riscoInerente; return res >= 12 && res < 20; }).length, color: NEON.orange },
                    { label: 'Médio (6-11)', inerente: risks.filter(r => r.riscoInerente >= 6 && r.riscoInerente < 12).length, residual: risks.filter(r => { const res = r.riscoResidual || r.riscoInerente; return res >= 6 && res < 12; }).length, color: NEON.yellow },
                    { label: 'Baixo (<6)', inerente: risks.filter(r => r.riscoInerente < 6).length, residual: risks.filter(r => (r.riscoResidual || r.riscoInerente) < 6).length, color: NEON.green },
                  ].map(level => (
                    <View key={level.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder + '40' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: level.color, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{level.label}</Text>
                      </View>
                      <View style={{ width: 50, alignItems: 'center' }}>
                        <View style={{ backgroundColor: NEON.red + '20', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: NEON.red, fontSize: 12, fontWeight: '800', fontFamily: 'monospace' }}>{level.inerente}</Text>
                        </View>
                      </View>
                      <Text style={{ width: 30, color: NEON.yellow, fontSize: 14, fontWeight: '800', textAlign: 'center' }}>→</Text>
                      <View style={{ width: 50, alignItems: 'center' }}>
                        <View style={{ backgroundColor: NEON.green + '20', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: NEON.green, fontSize: 12, fontWeight: '800', fontFamily: 'monospace' }}>{level.residual}</Text>
                        </View>
                      </View>
                      <View style={{ width: 60, alignItems: 'flex-end' }}>
                        <Text style={{ color: level.residual <= level.inerente ? NEON.green : NEON.red, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>
                          {level.residual <= level.inerente ? `↓${level.inerente - level.residual}` : `↑${level.residual - level.inerente}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </GlowCard>
        </Animated.View>

        {/* === 4. TOP 10 RISCOS PRIORITÁRIOS === */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={{ marginTop: 16 }}>
          <GlowCard variant="default">
            <SectionHeader title="4. TOP 10 RISCOS PRIORITÁRIOS (GUT)" sectionKey="top10" color={NEON.red} subtitle="Ordenados por Gravidade × Urgência × Tendência" />
            {expandedSection === 'top10' && (
              <View style={{ marginTop: 16 }}>
                <View style={{ backgroundColor: '#111820', borderRadius: 8, borderWidth: 1, borderColor: NEON.cardBorder, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#0D1117', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder }}>
                    <Text style={{ width: 25, color: NEON.muted, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>#</Text>
                    <Text style={{ width: 45, color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>ID</Text>
                    <Text style={{ flex: 1, color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>DESCRIÇÃO</Text>
                    <Text style={{ width: 40, color: NEON.yellow, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>GUT</Text>
                    <Text style={{ width: 35, color: NEON.red, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>P×I</Text>
                    <Text style={{ width: 55, color: NEON.orange, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>NÍVEL</Text>
                  </View>
                  {stats.top10Gut.map((r, i) => {
                    const level = getRiskLevel(r.riscoInerente);
                    return (
                      <View key={r.id} style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder + '40', backgroundColor: i % 2 === 0 ? '#111820' : '#0D1117' }}>
                        <Text style={{ width: 25, color: NEON.muted, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{i + 1}</Text>
                        <Text style={{ width: 45, color: NEON.text, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{r.id}</Text>
                        <Text style={{ flex: 1, color: NEON.muted, fontSize: 9, fontFamily: 'monospace' }} numberOfLines={2}>{r.descricaoRisco.substring(0, 80)}...</Text>
                        <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ backgroundColor: NEON.yellow + '20', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                            <Text style={{ color: NEON.yellow, fontSize: 10, fontWeight: '800', fontFamily: 'monospace' }}>{r.gutScore}</Text>
                          </View>
                        </View>
                        <Text style={{ width: 35, color: NEON.text, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>{r.riscoInerente}</Text>
                        <View style={{ width: 55, alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ backgroundColor: levelColor(level.label) + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ color: levelColor(level.label), fontSize: 8, fontWeight: '700', fontFamily: 'monospace' }}>{level.label.toUpperCase()}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </GlowCard>
        </Animated.View>

        {/* === 5. DISTRIBUIÇÃO E TRATAMENTO === */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={{ marginTop: 16 }}>
          <GlowCard variant="default">
            <SectionHeader title="5. DISTRIBUIÇÃO E TRATAMENTO" sectionKey="distribuicao" color={NEON.orange} subtitle="Por tipo de risco e estratégia MATE" />
            {expandedSection === 'distribuicao' && (
              <View style={{ marginTop: 16 }}>
                {/* Por Tipo */}
                <Text style={{ color: NEON.orange, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>DISTRIBUIÇÃO POR TIPO DE RISCO</Text>
                <View style={{ backgroundColor: '#111820', borderRadius: 8, borderWidth: 1, borderColor: NEON.cardBorder, padding: 12, marginBottom: 16 }}>
                  {Object.entries(stats.byType).sort((a, b) => b[1].length - a[1].length).map(([type, typeRisks]) => {
                    const pct = (typeRisks.length / stats.total) * 100;
                    const maxLevel = Math.max(...typeRisks.map(r => r.riscoInerente));
                    const barColor = maxLevel >= 20 ? NEON.red : maxLevel >= 12 ? NEON.orange : maxLevel >= 6 ? NEON.yellow : NEON.green;
                    return (
                      <View key={type} style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                          <Text style={{ color: NEON.text, fontSize: 10, fontFamily: 'monospace', flex: 1 }} numberOfLines={1}>{type.replace('Risco ', '').replace('de ', '')}</Text>
                          <Text style={{ color: barColor, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{typeRisks.length} ({pct.toFixed(0)}%)</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: '#1A3A2A', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: barColor, borderRadius: 3 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
                {/* MATE */}
                <Text style={{ color: NEON.orange, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>ESTRATÉGIAS DE TRATAMENTO (MATE)</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(stats.mate).sort((a, b) => b[1] - a[1]).map(([strategy, count]) => {
                    const mateColor = strategy.includes('Mitigar') ? NEON.cyan : strategy.includes('Aceitar') ? NEON.yellow : strategy.includes('Transferir') ? NEON.orange : strategy.includes('Evitar') ? NEON.red : NEON.muted;
                    return (
                      <View key={strategy} style={{ flex: 1, minWidth: 120, backgroundColor: mateColor + '08', borderWidth: 1, borderColor: mateColor + '25', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: mateColor, fontSize: 20, fontWeight: '800', fontFamily: 'monospace' }}>{count}</Text>
                        <Text style={{ color: NEON.muted, fontSize: 8, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center', marginTop: 4 }}>{strategy.toUpperCase()}</Text>
                        <Text style={{ color: mateColor + '80', fontSize: 8, fontFamily: 'monospace' }}>{((count / stats.total) * 100).toFixed(0)}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </GlowCard>
        </Animated.View>

        {/* === 6. INVESTIMENTOS PRIORITÁRIOS === */}
        <Animated.View entering={FadeInDown.duration(400).delay(600)} style={{ marginTop: 16 }}>
          <GlowCard variant="default">
            <SectionHeader title="6. INVESTIMENTOS PRIORITÁRIOS (ROI)" sectionKey="roi" color={NEON.green} subtitle="Maior retorno sobre investimento preventivo" />
            {expandedSection === 'roi' && (
              <View style={{ marginTop: 16 }}>
                <View style={{ backgroundColor: '#111820', borderRadius: 8, borderWidth: 1, borderColor: NEON.cardBorder, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#0D1117', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder }}>
                    <Text style={{ width: 25, color: NEON.muted, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>#</Text>
                    <Text style={{ width: 45, color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>ID</Text>
                    <Text style={{ flex: 1, color: NEON.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>INVESTIMENTO</Text>
                    <Text style={{ width: 70, color: NEON.red, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>PERDA</Text>
                    <Text style={{ width: 70, color: NEON.green, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>EVITADA</Text>
                    <Text style={{ width: 50, color: NEON.green, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>ROI</Text>
                  </View>
                  {stats.top10ROI.map((r, i) => (
                    <View key={r.id} style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: NEON.cardBorder + '40', backgroundColor: i % 2 === 0 ? '#111820' : '#0D1117' }}>
                      <Text style={{ width: 25, color: NEON.muted, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{i + 1}</Text>
                      <Text style={{ width: 45, color: NEON.text, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{r.id}</Text>
                      <Text style={{ flex: 1, color: NEON.cyan, fontSize: 9, fontFamily: 'monospace' }}>{formatCurrency(r.impactoFinanceiro?.investimentoPreventivo || 0)}</Text>
                      <Text style={{ width: 70, color: NEON.red, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>{formatCurrency(r.impactoFinanceiro?.perdaMediaEsperada || 0)}</Text>
                      <Text style={{ width: 70, color: NEON.green, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>{formatCurrency(r.impactoFinanceiro?.perdaEvitada || 0)}</Text>
                      <Text style={{ width: 50, color: NEON.green, fontSize: 10, fontWeight: '800', fontFamily: 'monospace', textAlign: 'right' }}>{(r.impactoFinanceiro?.roiPrevencao || 0).toFixed(0)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </GlowCard>
        </Animated.View>

        {/* === 7. RECOMENDAÇÕES AO CONSELHO === */}
        <Animated.View entering={FadeInDown.duration(400).delay(700)} style={{ marginTop: 16 }}>
          <GlowCard variant="default">
            <SectionHeader title="7. RECOMENDAÇÕES AO CONSELHO" sectionKey="recomendacoes" color={NEON.cyan} subtitle="Ações prioritárias por horizonte temporal" />
            {expandedSection === 'recomendacoes' && (
              <View style={{ marginTop: 16 }}>
                {[
                  {
                    prazo: 'IMEDIATO (0-3 MESES)',
                    color: NEON.red,
                    items: [
                      'Aprovar orçamento de investimento preventivo de ' + formatCurrency(stats.totalInvestimento),
                      `Priorizar tratamento dos ${stats.criticos.length} riscos críticos (P×I ≥ 20)`,
                      'Implementar controles de acesso e monitoramento para riscos cibernéticos',
                      'Ativar Plano de Continuidade de Negócios (BCP) para o Data Center',
                      'Revisar contratos com terceiros críticos (gateway, cloud, transportadoras)',
                    ],
                  },
                  {
                    prazo: 'CURTO PRAZO (3-6 MESES)',
                    color: NEON.orange,
                    items: [
                      `Reduzir ${stats.altos.length} riscos altos para nível médio ou inferior`,
                      'Implementar programa de gestão de terceiros (TPRM) com SLAs e auditorias',
                      'Criar comitê de riscos com reuniões mensais e KRIs automatizados',
                      'Treinar equipes em cultura de risco e compliance',
                      'Contratar seguro cibernético e patrimonial amplo',
                    ],
                  },
                  {
                    prazo: 'MÉDIO PRAZO (6-12 MESES)',
                    color: NEON.yellow,
                    items: [
                      'Automatizar monitoramento de KRIs com dashboards em tempo real',
                      'Implementar programa de maturidade em gestão de riscos (ISO 31000)',
                      'Realizar simulações de crise e testes de Disaster Recovery semestrais',
                      'Expandir análise de riscos para cadeia de suprimentos completa',
                      'Revisar apetite de risco organizacional com base nos resultados do primeiro ciclo',
                    ],
                  },
                ].map(horizon => (
                  <View key={horizon.prazo} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={{ width: 4, height: 20, backgroundColor: horizon.color, borderRadius: 2 }} />
                      <Text style={{ color: horizon.color, fontSize: 10, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 1 }}>{horizon.prazo}</Text>
                    </View>
                    {horizon.items.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', paddingLeft: 16, marginBottom: 6, gap: 8 }}>
                        <Text style={{ color: horizon.color, fontSize: 10, fontFamily: 'monospace' }}>▸</Text>
                        <Text style={{ color: NEON.text, fontSize: 10, lineHeight: 16, fontFamily: 'monospace', flex: 1 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </GlowCard>
        </Animated.View>

        {/* === FOOTER === */}
        <View style={{ alignItems: 'center', marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: NEON.cardBorder }}>
          <Text style={{ color: NEON.muted, fontSize: 9, fontFamily: 'monospace', letterSpacing: 1 }}>VETOR HORIZON CONSULTORIA DE RISCO</Text>
          <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: 'monospace', marginTop: 2 }}>ICAPT v5 — ISO 31000 | ISO 27001</Text>
          <Text style={{ color: NEON.muted, fontSize: 8, fontFamily: 'monospace', marginTop: 2 }}>Documento gerado automaticamente pelo sistema de gestão de riscos</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
