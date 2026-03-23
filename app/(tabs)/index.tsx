import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions, Image, Modal, FlatList, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getMatrixColor, getGutLevel, Risk } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useMemo, useState, useCallback } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlowCard } from "@/components/ui/glow-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { PulsingBadge } from "@/components/ui/pulsing-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

const vetorHorizonLogo = require("@/assets/images/vetor-horizon-logo.png");

type FilterState = {
  title: string;
  risks: Risk[];
} | null;

const LEVEL_COLORS = {
  critical: "#FF3D3D",
  high: "#FF8C00",
  medium: "#FFD600",
  low: "#00FF88",
};

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

  const financialSummary = useMemo(() => {
    let totalExposicaoAlta = 0;
    let totalExposicaoBaixa = 0;
    let totalInvestimento = 0;
    let totalEconomia = 0;
    let riscosComDados = 0;
    risks.forEach(r => {
      if (r.impactoFinanceiro) {
        riscosComDados++;
        totalExposicaoAlta += r.impactoFinanceiro.perdaAltaDemanda;
        totalExposicaoBaixa += r.impactoFinanceiro.perdaBaixaDemanda;
        totalInvestimento += r.impactoFinanceiro.investimentoPreventivo;
        totalEconomia += r.impactoFinanceiro.perdaEvitada;
      }
    });
    const roiMedio = totalInvestimento > 0 ? ((totalEconomia / totalInvestimento) * 100) : 0;
    return { totalExposicaoAlta, totalExposicaoBaixa, totalInvestimento, totalEconomia, roiMedio, riscosComDados };
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
        <StatusIndicator status="monitoring" label="CARREGANDO DADOS..." />
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
                backgroundColor: '#0A0E14',
                borderColor: '#1A3A2A',
                maxWidth: isDesktop ? 700 : width - 32,
                maxHeight: '80%',
              },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.modalHeader, { borderBottomColor: '#1A3A2A' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: '#00E5FF', fontFamily: 'monospace' }]}>{activeFilter.title}</Text>
                <Text style={[styles.modalSubtitle, { color: '#6B8A7A' }]}>
                  Clique em um risco para ver detalhes completos
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveFilter(null)}
                style={[styles.closeBtn, { backgroundColor: '#111820', borderWidth: 1, borderColor: '#1A3A2A' }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeBtnText, { color: '#FF3D3D' }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeFilter.risks}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const level = getRiskLevel(item.riscoInerente);
                const gutLevel = getGutLevel(item.gutScore);
                const badgeLevel = item.riscoInerente >= 20 ? 'critical' : item.riscoInerente >= 12 ? 'high' : item.riscoInerente >= 6 ? 'medium' : 'low';
                return (
                  <TouchableOpacity
                    style={[styles.modalRiskCard, { backgroundColor: '#111820', borderColor: '#1A3A2A' }]}
                    onPress={() => {
                      setActiveFilter(null);
                      router.push(`/risk/${item.id}` as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalRiskHeader}>
                      <View style={styles.modalRiskLeft}>
                        <View style={[styles.modalRiskIdBadge, { backgroundColor: '#00E5FF15' }]}>
                          <Text style={[styles.modalRiskId, { color: '#00E5FF', fontFamily: 'monospace' }]}>{item.id}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalRiskType, { color: '#6B8A7A' }]}>{item.tipoRisco}</Text>
                        </View>
                      </View>
                      <View style={styles.modalRiskBadges}>
                        <PulsingBadge level={badgeLevel as any} size="sm" pulsing={false} />
                        <View style={[styles.scorePill, { backgroundColor: gutLevel.color + '15', borderWidth: 1, borderColor: gutLevel.color + '30' }]}>
                          <Text style={[styles.scoreText, { color: gutLevel.color, fontFamily: 'monospace' }]}>GUT {item.gutScore}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.modalRiskDesc, { color: '#E0F0E0' }]} numberOfLines={3}>
                      {item.descricaoRisco}
                    </Text>
                    <View style={styles.modalRiskFooter}>
                      <Text style={[styles.modalRiskMeta, { color: '#6B8A7A', fontFamily: 'monospace' }]}>
                        {item.fonteDeRisco} | {item.tratamento}
                      </Text>
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

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View style={styles.headerLeft}>
            {!isDesktop && (
              <Image
                source={vetorHorizonLogo}
                style={{ width: 120, height: 120, borderRadius: 10, marginBottom: 8 }}
                resizeMode="contain"
              />
            )}
            <View style={styles.titleRow}>
              <Text style={[styles.pageTitle, { color: '#E0F0E0', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>Dashboard</Text>
              <StatusIndicator status="monitoring" label="ICAPT v5" />
            </View>
            <Text style={[styles.pageSubtitle, { color: '#6B8A7A', fontFamily: 'monospace' }]}>
              Monitoramento de riscos corporativos — DAMACORP
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#00E5FF20', borderWidth: 1, borderColor: '#00E5FF40' }]}
            onPress={() => router.push('/risk/new' as any)}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus.circle.fill" size={18} color="#00E5FF" />
            <Text style={[styles.addButtonText, { color: '#00E5FF', fontFamily: 'monospace' }]}>NOVO RISCO</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Summary Cards */}
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
          <View style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}>
            <Animated.View entering={FadeInDown.duration(400).delay(100)} style={{ flex: 1, minWidth: 140 }}>
              <GlowCard variant="default" onPress={() => handleStatPress('total')}>
                <View style={styles.statCardInner}>
                  <StatusIndicator status="active" showLabel={false} />
                  <Text style={[styles.statLabel, { color: '#00E5FF', fontFamily: 'monospace' }]}>TOTAL DE RISCOS</Text>
                </View>
                <AnimatedCounter value={stats.total} color="#00E5FF" fontSize={36} />
                <Text style={[styles.tapHint, { color: '#00E5FF80', fontFamily: 'monospace' }]}>CLIQUE PARA VER →</Text>
              </GlowCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={{ flex: 1, minWidth: 140 }}>
              <GlowCard variant="critical" pulsing onPress={() => handleStatPress('critico')}>
                <PulsingBadge level="critical" size="sm" />
                <AnimatedCounter value={stats.critico} color={LEVEL_COLORS.critical} fontSize={36} duration={800} />
                <Text style={[styles.tapHint, { color: LEVEL_COLORS.critical + '80', fontFamily: 'monospace' }]}>CLIQUE PARA VER →</Text>
              </GlowCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(400).delay(300)} style={{ flex: 1, minWidth: 140 }}>
              <GlowCard variant="high" onPress={() => handleStatPress('alto')}>
                <PulsingBadge level="high" size="sm" />
                <AnimatedCounter value={stats.alto} color={LEVEL_COLORS.high} fontSize={36} duration={900} />
                <Text style={[styles.tapHint, { color: LEVEL_COLORS.high + '80', fontFamily: 'monospace' }]}>CLIQUE PARA VER →</Text>
              </GlowCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(400).delay(400)} style={{ flex: 1, minWidth: 140 }}>
              <GlowCard variant="medium" onPress={() => handleStatPress('medio')}>
                <PulsingBadge level="medium" size="sm" />
                <AnimatedCounter value={stats.medio} color={LEVEL_COLORS.medium} fontSize={36} duration={1000} />
                <Text style={[styles.tapHint, { color: LEVEL_COLORS.medium + '80', fontFamily: 'monospace' }]}>CLIQUE PARA VER →</Text>
              </GlowCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(400).delay(500)} style={{ flex: 1, minWidth: 140 }}>
              <GlowCard variant="low" onPress={() => handleStatPress('baixo')}>
                <PulsingBadge level="low" size="sm" />
                <AnimatedCounter value={stats.baixo} color={LEVEL_COLORS.low} fontSize={36} duration={1100} />
                <Text style={[styles.tapHint, { color: LEVEL_COLORS.low + '80', fontFamily: 'monospace' }]}>CLIQUE PARA VER →</Text>
              </GlowCard>
            </Animated.View>
          </View>
        </View>

        {/* Main Content Grid */}
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
          <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
            {/* Left Column: Matrix + Risk by Type */}
            <View style={[styles.column, isDesktop && { flex: 1 }]}>
              {/* Risk Matrix */}
              <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                <GlowCard variant="default">
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: '#00E5FF', fontFamily: 'monospace' }]}>MATRIZ DE RISCO (P × I)</Text>
                    <View style={[styles.cardBadge, { backgroundColor: '#00E5FF15', borderWidth: 1, borderColor: '#00E5FF30' }]}>
                      <Text style={[styles.cardBadgeText, { color: '#00E5FF', fontFamily: 'monospace' }]}>INTERATIVA</Text>
                    </View>
                  </View>
                  <View style={styles.matrixWrapper}>
                    <View style={styles.matrixYAxis}>
                      <Text style={[styles.axisTitle, { color: '#6B8A7A', fontFamily: 'monospace' }]}>P</Text>
                    </View>
                    <View style={styles.matrixContent}>
                      {matrixRisks.map((row, rowIdx) => (
                        <View key={rowIdx} style={styles.matrixRow}>
                          <View style={styles.matrixRowLabel}>
                            <Text style={[styles.matrixLabelText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{5 - rowIdx}</Text>
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
                                    backgroundColor: count > 0 ? bgColor + '25' : '#111820',
                                    borderColor: isHovered ? bgColor : (count > 0 ? bgColor + '50' : '#1A3A2A'),
                                    borderWidth: isHovered ? 2 : 1,
                                    ...(isHovered && Platform.OS === 'web' ? {
                                      shadowColor: bgColor,
                                      shadowOffset: { width: 0, height: 0 },
                                      shadowOpacity: 0.6,
                                      shadowRadius: 8,
                                    } : {}),
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
                                    <Text style={[styles.matrixCellText, { color: bgColor, fontFamily: 'monospace' }]}>{count}</Text>
                                    {(() => {
                                      const cellFinancial = cellRisks.reduce((sum, r) => sum + (r.impactoFinanceiro?.perdaMediaEsperada || 0), 0);
                                      if (cellFinancial > 0) {
                                        const formatted = cellFinancial >= 1000000 ? `${(cellFinancial / 1000000).toFixed(1)}M` : `${(cellFinancial / 1000).toFixed(0)}K`;
                                        return (
                                          <Text style={[styles.cellFinancialText, { color: bgColor, fontFamily: 'monospace' }]}>R${formatted}</Text>
                                        );
                                      }
                                      return null;
                                    })()}
                                    <View style={[styles.cellTapHint, { backgroundColor: bgColor + '20', borderWidth: 1, borderColor: bgColor + '40' }]}>
                                      <Text style={[styles.cellTapHintText, { color: bgColor, fontFamily: 'monospace' }]}>ver</Text>
                                    </View>
                                  </View>
                                ) : null}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                      <View style={styles.matrixRow}>
                        <View style={styles.matrixRowLabel} />
                        {[1, 2, 3, 4, 5].map(n => (
                          <View key={n} style={[styles.matrixCell, { borderWidth: 0 }]}>
                            <Text style={[styles.matrixLabelText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{n}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={[styles.xAxisTitle, { color: '#6B8A7A', fontFamily: 'monospace' }]}>IMPACTO</Text>
                    </View>
                  </View>
                  <View style={styles.legendRow}>
                    {[
                      { label: 'Baixo (1-5)', color: '#00FF88' },
                      { label: 'Médio (6-11)', color: '#FFD600' },
                      { label: 'Alto (12-19)', color: '#FF8C00' },
                      { label: 'Crítico (20-25)', color: '#FF3D3D' },
                    ].map(item => (
                      <View key={item.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color, shadowColor: item.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
                        <Text style={[styles.legendText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </GlowCard>
              </Animated.View>

              {/* Risks by Type */}
              <Animated.View entering={FadeInDown.duration(500).delay(400)} style={{ marginTop: 16 }}>
                <GlowCard variant="default">
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: '#00E5FF', fontFamily: 'monospace' }]}>DISTRIBUIÇÃO POR TIPO</Text>
                    <View style={[styles.cardBadge, { backgroundColor: '#00E5FF15', borderWidth: 1, borderColor: '#00E5FF30' }]}>
                      <Text style={[styles.cardBadgeText, { color: '#00E5FF', fontFamily: 'monospace' }]}>CLICÁVEL</Text>
                    </View>
                  </View>
                  {risksByType.map(([type, typeRisks]) => {
                    const pct = Math.round((typeRisks.length / risks.length) * 100);
                    const maxLevel = Math.max(...typeRisks.map(r => r.riscoInerente));
                    const barColor = maxLevel >= 20 ? LEVEL_COLORS.critical : maxLevel >= 12 ? LEVEL_COLORS.high : maxLevel >= 6 ? LEVEL_COLORS.medium : LEVEL_COLORS.low;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.barRow, { borderBottomWidth: 1, borderBottomColor: '#1A3A2A' }]}
                        onPress={() => handleTypePress(type, typeRisks)}
                        activeOpacity={0.6}
                      >
                        <Text style={[styles.barLabel, { color: '#E0F0E0', fontFamily: 'monospace' }]} numberOfLines={1}>
                          {type.replace('Risco ', '').replace('de ', '')}
                        </Text>
                        <View style={[styles.barBadge, { backgroundColor: barColor + '20', borderWidth: 1, borderColor: barColor + '40' }]}>
                          <Text style={[styles.barBadgeText, { color: barColor, fontFamily: 'monospace' }]}>
                            {getRiskLevel(maxLevel).label}
                          </Text>
                        </View>
                        <Text style={[styles.barValue, { color: barColor, fontFamily: 'monospace' }]}>{typeRisks.length}</Text>
                        <View style={[styles.barTrack, { backgroundColor: '#1A3A2A' }]}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor, shadowColor: barColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 }]} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </GlowCard>
              </Animated.View>
            </View>

            {/* Right Column: Top Risks */}
            <View style={[styles.column, isDesktop && { flex: 1 }]}>
              <Animated.View entering={FadeInRight.duration(500).delay(300)}>
                <GlowCard variant="default">
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: '#00E5FF', fontFamily: 'monospace' }]}>TOP 10 RISCOS — GUT</Text>
                    <TouchableOpacity onPress={() => router.push('/risks' as any)} activeOpacity={0.7}>
                      <Text style={[styles.seeAll, { color: '#00E5FF', fontFamily: 'monospace' }]}>VER TODOS →</Text>
                    </TouchableOpacity>
                  </View>
                  {topRisks.map((risk, idx) => {
                    const level = getRiskLevel(risk.riscoInerente);
                    const gutLevel = getGutLevel(risk.gutScore);
                    const badgeLevel = risk.riscoInerente >= 20 ? 'critical' : risk.riscoInerente >= 12 ? 'high' : risk.riscoInerente >= 6 ? 'medium' : 'low';
                    return (
                      <TouchableOpacity
                        key={risk.id}
                        style={[
                          styles.riskItem,
                          idx < topRisks.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#1A3A2A' },
                        ]}
                        onPress={() => router.push(`/risk/${risk.id}` as any)}
                        activeOpacity={0.6}
                      >
                        <View style={styles.riskItemHeader}>
                          <View style={styles.riskItemLeft}>
                            <View style={[styles.rankBadge, {
                              backgroundColor: idx < 3 ? level.color + '20' : '#111820',
                              borderWidth: 1,
                              borderColor: idx < 3 ? level.color + '40' : '#1A3A2A',
                            }]}>
                              <Text style={[styles.rankText, { color: idx < 3 ? level.color : '#6B8A7A', fontFamily: 'monospace' }]}>#{idx + 1}</Text>
                            </View>
                            <View>
                              <Text style={[styles.riskId, { color: '#00E5FF', fontFamily: 'monospace' }]}>{risk.id}</Text>
                              <Text style={[styles.riskType, { color: '#6B8A7A' }]}>{risk.tipoRisco.replace('Risco ', '')}</Text>
                            </View>
                          </View>
                          <View style={styles.riskItemRight}>
                            <PulsingBadge level={badgeLevel as any} size="sm" pulsing={false} />
                            <View style={[styles.scorePill, { backgroundColor: gutLevel.color + '15', borderWidth: 1, borderColor: gutLevel.color + '30' }]}>
                              <Text style={[styles.scoreText, { color: gutLevel.color, fontFamily: 'monospace' }]}>GUT {risk.gutScore}</Text>
                            </View>
                          </View>
                        </View>
                        <Text style={[styles.riskDesc, { color: '#E0F0E0' }]} numberOfLines={2}>
                          {risk.descricaoRisco}
                        </Text>
                        <View style={styles.riskMeta}>
                          <Text style={[styles.riskMetaText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{risk.tratamento}</Text>
                          <Text style={[styles.riskMetaText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>{risk.responsavel}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </GlowCard>
              </Animated.View>

              {/* Quick Stats */}
              <Animated.View entering={FadeInRight.duration(500).delay(400)} style={{ marginTop: 16 }}>
                <GlowCard variant="default">
                  <Text style={[styles.cardTitle, { color: '#00E5FF', fontFamily: 'monospace', marginBottom: 12 }]}>RESUMO EXECUTIVO</Text>
                  <View style={styles.quickStatsGrid}>
                    <TouchableOpacity
                      style={[styles.quickStatItem, { borderColor: '#1A3A2A', backgroundColor: '#111820' }]}
                      onPress={() => {
                        const estrategicos = risks.filter(r => r.estrategico === 'SIM');
                        if (estrategicos.length > 0) setActiveFilter({ title: `Riscos Estratégicos (${estrategicos.length})`, risks: estrategicos });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickStatValue, { color: '#00E5FF', fontFamily: 'monospace' }]}>
                        {risks.filter(r => r.estrategico === 'SIM').length}/{risks.length}
                      </Text>
                      <Text style={[styles.quickStatLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>Estratégicos</Text>
                      <Text style={[styles.tapHint, { color: '#00E5FF80', fontFamily: 'monospace' }]}>ver →</Text>
                    </TouchableOpacity>
                    <View style={[styles.quickStatItem, { borderColor: '#1A3A2A', backgroundColor: '#111820' }]}>
                      <Text style={[styles.quickStatValue, { color: '#FFD600', fontFamily: 'monospace' }]}>
                        {Math.round(risks.reduce((s, r) => s + r.gutScore, 0) / (risks.length || 1))}
                      </Text>
                      <Text style={[styles.quickStatLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>GUT Médio</Text>
                    </View>
                    <View style={[styles.quickStatItem, { borderColor: '#1A3A2A', backgroundColor: '#111820' }]}>
                      <Text style={[styles.quickStatValue, { color: '#FF8C00', fontFamily: 'monospace' }]}>
                        {(risks.reduce((s, r) => s + r.riscoInerente, 0) / (risks.length || 1)).toFixed(1)}
                      </Text>
                      <Text style={[styles.quickStatLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>P×I Médio</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.quickStatItem, { borderColor: '#1A3A2A', backgroundColor: '#111820' }]}
                      onPress={() => {
                        const emTratamento = risks.filter(r => r.tratamento && r.tratamento !== '');
                        if (emTratamento.length > 0) setActiveFilter({ title: `Riscos em Tratamento (${emTratamento.length})`, risks: emTratamento });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickStatValue, { color: '#00FF88', fontFamily: 'monospace' }]}>
                        {risks.filter(r => r.tratamento).length}/{risks.length}
                      </Text>
                      <Text style={[styles.quickStatLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>Tratamento</Text>
                      <Text style={[styles.tapHint, { color: '#00FF8880', fontFamily: 'monospace' }]}>ver →</Text>
                    </TouchableOpacity>
                  </View>
                </GlowCard>
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Financial Summary Panel */}
        {financialSummary.riscosComDados > 0 && (
          <View style={[styles.section, isDesktop && styles.sectionDesktop, { marginTop: 24 }]}>
            <Animated.View entering={FadeInDown.duration(500).delay(500)}>
              <GlowCard variant="default">
                <View style={{ marginBottom: 20 }}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: '#00E5FF', fontFamily: 'monospace', fontSize: 16 }]}>IMPACTO FINANCEIRO CONSOLIDADO</Text>
                    <View style={[styles.cardBadge, { backgroundColor: '#FF3D3D15', borderWidth: 1, borderColor: '#FF3D3D30' }]}>
                      <Text style={[styles.cardBadgeText, { color: '#FF3D3D', fontFamily: 'monospace' }]}>R$ MILHÕES</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6B8A7A', fontFamily: 'monospace', marginTop: -12 }}>Visão consolidada de exposição, investimento e economia — {financialSummary.riscosComDados} riscos analisados</Text>
                </View>
                {/* Always 2x2 grid to avoid overflow */}
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.finCardResponsive, { borderColor: '#FF3D3D30', backgroundColor: '#FF3D3D08' }]}>
                      <Text style={[styles.finLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>EXPOSIÇÃO TOTAL{"\n"}(ALTA DEMANDA)</Text>
                      <Text style={[isDesktop ? styles.finValue : styles.finValueMobile, { color: '#FF3D3D', fontFamily: 'monospace' }]}>R$ {(financialSummary.totalExposicaoAlta / 1000000).toFixed(1)}M</Text>
                      <Text style={[styles.finHint, { color: '#FF3D3D80', fontFamily: 'monospace' }]}>Black Friday / Natal</Text>
                    </View>
                    <View style={[styles.finCardResponsive, { borderColor: '#FF8C0030', backgroundColor: '#FF8C0008' }]}>
                      <Text style={[styles.finLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>EXPOSIÇÃO TOTAL{"\n"}(BAIXA DEMANDA)</Text>
                      <Text style={[isDesktop ? styles.finValue : styles.finValueMobile, { color: '#FF8C00', fontFamily: 'monospace' }]}>R$ {(financialSummary.totalExposicaoBaixa / 1000000).toFixed(1)}M</Text>
                      <Text style={[styles.finHint, { color: '#FF8C0080', fontFamily: 'monospace' }]}>Período normal</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.finCardResponsive, { borderColor: '#00E5FF30', backgroundColor: '#00E5FF08' }]}>
                      <Text style={[styles.finLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>INVESTIMENTO{"\n"}PREVENTIVO</Text>
                      <Text style={[isDesktop ? styles.finValue : styles.finValueMobile, { color: '#00E5FF', fontFamily: 'monospace' }]}>R$ {(financialSummary.totalInvestimento / 1000000).toFixed(1)}M</Text>
                      <Text style={[styles.finHint, { color: '#00E5FF80', fontFamily: 'monospace' }]}>Controles + Contingências</Text>
                    </View>
                    <View style={[styles.finCardResponsive, { borderColor: '#00FF8830', backgroundColor: '#00FF8808' }]}>
                      <Text style={[styles.finLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>ECONOMIA{"\n"}POTENCIAL</Text>
                      <Text style={[isDesktop ? styles.finValue : styles.finValueMobile, { color: '#00FF88', fontFamily: 'monospace' }]}>R$ {(financialSummary.totalEconomia / 1000000).toFixed(1)}M</Text>
                      <Text style={[styles.finHint, { color: '#00FF8880', fontFamily: 'monospace' }]}>ROI: {financialSummary.roiMedio.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.finBarContainer, { marginTop: 20 }]}>
                  <Text style={[styles.finBarLabel, { color: '#00E5FF', fontFamily: 'monospace', fontWeight: '800', fontSize: 11 }]}>INVESTIR R$ {(financialSummary.totalInvestimento / 1000000).toFixed(1)}M → EVITAR PERDA DE ATÉ R$ {(financialSummary.totalExposicaoAlta / 1000000).toFixed(1)}M</Text>
                  <View style={[styles.finBar, { backgroundColor: '#111820' }]}>
                    <View style={[styles.finBarFill, { width: `${Math.min((financialSummary.totalInvestimento / financialSummary.totalExposicaoAlta) * 100, 100)}%`, backgroundColor: '#00E5FF' }]} />
                  </View>
                  <View style={styles.finBarLegend}>
                    <View style={styles.finBarLegendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#00E5FF' }]} />
                      <Text style={[styles.finBarLegendText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>Investimento</Text>
                    </View>
                    <View style={styles.finBarLegendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#FF3D3D' }]} />
                      <Text style={[styles.finBarLegendText, { color: '#6B8A7A', fontFamily: 'monospace' }]}>Exposição evitada</Text>
                    </View>
                  </View>
                </View>
              </GlowCard>
            </Animated.View>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {renderRiskModal()}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { paddingHorizontal: 32, paddingTop: 28 },
  headerLeft: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  pageSubtitle: { fontSize: 12, marginTop: 4, letterSpacing: 0.5 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  section: { paddingHorizontal: 24 },
  sectionDesktop: { paddingHorizontal: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statsGridDesktop: { flexWrap: 'nowrap' },
  statCardInner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  tapHint: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginTop: 4 },
  contentGrid: { marginTop: 20, gap: 16 },
  contentGridDesktop: { flexDirection: 'row' },
  column: { gap: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  cardBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  seeAll: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  matrixWrapper: { flexDirection: 'row', alignItems: 'center' },
  matrixYAxis: { width: 24, alignItems: 'center', justifyContent: 'center' },
  axisTitle: { fontSize: 12, fontWeight: '700', transform: [{ rotate: '-90deg' }] },
  matrixContent: { flex: 1 },
  matrixRow: { flexDirection: 'row', marginBottom: 4 },
  matrixRowLabel: { width: 28, justifyContent: 'center', alignItems: 'center' },
  matrixLabelText: { fontSize: 12, fontWeight: '600' },
  matrixCell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginHorizontal: 2 },
  matrixCellActive: { cursor: 'pointer' as any },
  matrixCellText: { fontSize: 18, fontWeight: '800' },
  cellContentWrap: { alignItems: 'center', gap: 1 },
  cellFinancialText: { fontSize: 7, fontWeight: '700', letterSpacing: 0.3, opacity: 0.9 },
  cellTapHint: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 },
  cellTapHintText: { fontSize: 7, fontWeight: '700', letterSpacing: 0.5 },
  xAxisTitle: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 6, marginLeft: 28, letterSpacing: 1 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '600' },
  barRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8, paddingHorizontal: 4 },
  barLabel: { fontSize: 11, fontWeight: '500', width: 140 },
  barBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  barBadgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: 14, fontWeight: '800', width: 24, textAlign: 'right' },
  riskItem: { paddingVertical: 14 },
  riskItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  riskItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskItemRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  rankBadge: { width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 11, fontWeight: '700' },
  riskId: { fontSize: 14, fontWeight: '700' },
  riskType: { fontSize: 11, marginTop: 1 },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  scoreText: { fontSize: 10, fontWeight: '700' },
  riskDesc: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  riskMeta: { flexDirection: 'row', gap: 16 },
  riskMetaText: { fontSize: 10 },
  quickStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickStatItem: { flex: 1, minWidth: '40%', borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  quickStatValue: { fontSize: 22, fontWeight: '800' },
  quickStatLabel: { fontSize: 10, marginTop: 4, textAlign: 'center', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { borderRadius: 12, borderWidth: 1, width: '100%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  modalSubtitle: { fontSize: 11, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 18, fontWeight: '600' },
  modalRiskCard: { borderRadius: 10, borderWidth: 1, padding: 16, marginBottom: 10 },
  modalRiskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  modalRiskLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalRiskIdBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  modalRiskId: { fontSize: 14, fontWeight: '800' },
  modalRiskType: { fontSize: 11 },
  modalRiskBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  modalRiskDesc: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  modalRiskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalRiskMeta: { fontSize: 10, flex: 1 },
  modalRiskArrow: { paddingLeft: 8 },
  levelPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  levelPillText: { fontSize: 10, fontWeight: '700' },
  finCardResponsive: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center', minWidth: 0 },
  finLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', marginBottom: 4 },
  finValue: { fontSize: 18, fontWeight: '800' },
  finValueMobile: { fontSize: 16, fontWeight: '800' },
  finHint: { fontSize: 8, fontWeight: '600', marginTop: 3 },
  finBarContainer: { borderTopWidth: 1, borderTopColor: '#1A3A2A', paddingTop: 14 },
  finBarLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' },
  finBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  finBarFill: { height: '100%', borderRadius: 4 },
  finBarLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  finBarLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  finBarLegendText: { fontSize: 9, fontWeight: '600' },
});
