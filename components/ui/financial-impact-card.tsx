import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FinancialImpact } from '@/lib/models';

interface FinancialImpactCardProps {
  data: FinancialImpact;
  riskId: string;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

export function FinancialImpactCard({ data, riskId }: FinancialImpactCardProps) {
  const [expanded, setExpanded] = useState(false);

  const roiColor = data.roiPrevencao >= 500 ? '#00FF88' : data.roiPrevencao >= 200 ? '#00E5FF' : '#FFD600';
  const barMaxWidth = 100;
  const maxPerda = Math.max(data.perdaAltaDemanda, data.perdaBaixaDemanda, data.perdaMediaEsperada);
  const altaWidth = (data.perdaAltaDemanda / maxPerda) * barMaxWidth;
  const baixaWidth = (data.perdaBaixaDemanda / maxPerda) * barMaxWidth;
  const investWidth = (data.investimentoPreventivo / maxPerda) * barMaxWidth;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(200)}>
      <Pressable onPress={() => setExpanded(!expanded)} style={({ pressed }) => [s.container, pressed && { opacity: 0.9 }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerIcon}>💰</Text>
          <Text style={s.headerTitle}>IMPACTO FINANCEIRO</Text>
          <View style={[s.categoryBadge, { backgroundColor: getCategoryColor(data.categoria) + '22', borderColor: getCategoryColor(data.categoria) }]}>
            <Text style={[s.categoryText, { color: getCategoryColor(data.categoria) }]}>{data.categoria}</Text>
          </View>
        </View>

        {/* Main Message: Investir X evita perda de Y */}
        <View style={s.mainMessage}>
          <View style={s.messageRow}>
            <View style={s.investBox}>
              <Text style={s.investLabel}>INVESTINDO</Text>
              <Text style={s.investValue}>{formatCurrency(data.investimentoPreventivo)}</Text>
              <Text style={s.investSub}>em prevenção</Text>
            </View>
            <View style={s.arrowContainer}>
              <Text style={s.arrow}>→</Text>
            </View>
            <View style={s.avoidBox}>
              <Text style={s.avoidLabel}>EVITA-SE PERDA DE</Text>
              <Text style={s.avoidValue}>{formatCurrency(data.perdaEvitada)}</Text>
              <Text style={s.avoidSub}>por ano</Text>
            </View>
          </View>
          <View style={s.roiRow}>
            <Text style={s.roiLabel}>ROI DA PREVENÇÃO</Text>
            <Text style={[s.roiValue, { color: roiColor }]}>{data.roiPrevencao.toFixed(0)}%</Text>
          </View>
        </View>

        {/* Cenários de Demanda */}
        <View style={s.scenariosSection}>
          <Text style={s.sectionTitle}>EXPECTATIVA DE PERDA POR CENÁRIO</Text>
          
          <View style={s.scenarioRow}>
            <View style={s.scenarioLabel}>
              <Text style={s.scenarioIcon}>🔴</Text>
              <Text style={s.scenarioName}>Alta Demanda</Text>
              <Text style={s.scenarioDesc}>(Black Friday, Natal)</Text>
            </View>
            <View style={s.barContainer}>
              <View style={[s.bar, { width: `${altaWidth}%`, backgroundColor: '#FF3D3D' }]} />
            </View>
            <Text style={[s.scenarioValue, { color: '#FF3D3D' }]}>{formatCurrency(data.perdaAltaDemanda)}</Text>
          </View>

          <View style={s.scenarioRow}>
            <View style={s.scenarioLabel}>
              <Text style={s.scenarioIcon}>🟡</Text>
              <Text style={s.scenarioName}>Baixa Demanda</Text>
              <Text style={s.scenarioDesc}>(meses normais)</Text>
            </View>
            <View style={s.barContainer}>
              <View style={[s.bar, { width: `${baixaWidth}%`, backgroundColor: '#FFD600' }]} />
            </View>
            <Text style={[s.scenarioValue, { color: '#FFD600' }]}>{formatCurrency(data.perdaBaixaDemanda)}</Text>
          </View>

          <View style={[s.scenarioRow, { borderTopWidth: 1, borderTopColor: '#1a2a3a', paddingTop: 8, marginTop: 4 }]}>
            <View style={s.scenarioLabel}>
              <Text style={s.scenarioIcon}>📊</Text>
              <Text style={[s.scenarioName, { color: '#00E5FF' }]}>Média Ponderada</Text>
              <Text style={s.scenarioDesc}>(30/70)</Text>
            </View>
            <View style={s.barContainer} />
            <Text style={[s.scenarioValue, { color: '#00E5FF', fontWeight: '700' }]}>{formatCurrency(data.perdaMediaEsperada)}</Text>
          </View>
        </View>

        {/* Investimento Preventivo */}
        <View style={s.preventionSection}>
          <Text style={s.sectionTitle}>INVESTIMENTO PREVENTIVO RECOMENDADO</Text>
          <View style={s.preventionRow}>
            <View style={s.preventionBar}>
              <View style={[s.bar, { width: `${investWidth}%`, backgroundColor: '#00FF88' }]} />
            </View>
            <Text style={[s.preventionValue, { color: '#00FF88' }]}>{formatCurrency(data.investimentoPreventivo)}</Text>
          </View>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <Animated.View entering={FadeInDown.duration(300)} style={s.expandedSection}>
            <View style={s.detailBlock}>
              <Text style={s.detailTitle}>CONTROLES E CONTINGÊNCIAS</Text>
              <Text style={s.detailText}>{data.descricaoInvestimento}</Text>
            </View>
            <View style={s.detailBlock}>
              <Text style={s.detailTitle}>RACIONAL DE CÁLCULO</Text>
              <Text style={s.detailText}>{data.racional}</Text>
            </View>
            <View style={s.summaryGrid}>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Perda Alta</Text>
                <Text style={[s.summaryValue, { color: '#FF3D3D' }]}>{formatCurrencyFull(data.perdaAltaDemanda)}</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Perda Baixa</Text>
                <Text style={[s.summaryValue, { color: '#FFD600' }]}>{formatCurrencyFull(data.perdaBaixaDemanda)}</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Média Esperada</Text>
                <Text style={[s.summaryValue, { color: '#00E5FF' }]}>{formatCurrencyFull(data.perdaMediaEsperada)}</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Investimento</Text>
                <Text style={[s.summaryValue, { color: '#00FF88' }]}>{formatCurrencyFull(data.investimentoPreventivo)}</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Perda Evitada</Text>
                <Text style={[s.summaryValue, { color: '#00FF88' }]}>{formatCurrencyFull(data.perdaEvitada)}</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>ROI</Text>
                <Text style={[s.summaryValue, { color: roiColor }]}>{data.roiPrevencao.toFixed(0)}%</Text>
              </View>
            </View>
          </Animated.View>
        )}

        <Text style={s.expandHint}>{expanded ? 'Toque para recolher ▲' : 'Toque para ver detalhes ▼'}</Text>
      </Pressable>
    </Animated.View>
  );
}

function getCategoryColor(cat: string): string {
  switch (cat) {
    case 'Receita': return '#FF3D3D';
    case 'Operacional': return '#FF8C00';
    case 'Regulatório': return '#FFD600';
    case 'Reputacional': return '#B388FF';
    case 'Segurança': return '#00E5FF';
    default: return '#6B8A7A';
  }
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#0D1B2A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a3a4a',
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
    color: '#00E5FF',
    flex: 1,
    letterSpacing: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  mainMessage: {
    backgroundColor: '#0A1520',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00FF8833',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  investBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#00FF8811',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#00FF8833',
  },
  investLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#6B8A7A',
    letterSpacing: 1,
    marginBottom: 4,
  },
  investValue: {
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: '800',
    color: '#00FF88',
  },
  investSub: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#6B8A7A',
    marginTop: 2,
  },
  arrowContainer: {
    paddingHorizontal: 12,
  },
  arrow: {
    fontSize: 24,
    color: '#00E5FF',
    fontWeight: '700',
  },
  avoidBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FF3D3D11',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF3D3D33',
  },
  avoidLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#8A6B6B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  avoidValue: {
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: '800',
    color: '#FF6B6B',
  },
  avoidSub: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#8A6B6B',
    marginTop: 2,
  },
  roiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a2a3a',
  },
  roiLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#6B8A7A',
    letterSpacing: 1,
  },
  roiValue: {
    fontFamily: 'monospace',
    fontSize: 20,
    fontWeight: '800',
  },
  scenariosSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: '#4A6A7A',
    letterSpacing: 1,
    marginBottom: 10,
  },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  scenarioLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 200,
    gap: 4,
  },
  scenarioIcon: {
    fontSize: 12,
  },
  scenarioName: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#8A9BAA',
    fontWeight: '600',
  },
  scenarioDesc: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#4A6A7A',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#0A1520',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  scenarioValue: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
    width: 80,
    textAlign: 'right',
  },
  preventionSection: {
    marginBottom: 8,
  },
  preventionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preventionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#0A1520',
    borderRadius: 4,
    overflow: 'hidden',
  },
  preventionValue: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
    width: 80,
    textAlign: 'right',
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a2a3a',
  },
  detailBlock: {
    marginBottom: 12,
  },
  detailTitle: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  detailText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#8A9BAA',
    lineHeight: 18,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  summaryItem: {
    backgroundColor: '#0A1520',
    borderRadius: 8,
    padding: 10,
    minWidth: '30%',
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#4A6A7A',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
  },
  expandHint: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#3A5A6A',
    textAlign: 'center',
    marginTop: 8,
  },
});
