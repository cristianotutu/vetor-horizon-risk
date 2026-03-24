import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions, Image, Modal, FlatList, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getMatrixColor, getGutLevel, Risk } from "@/lib/models";
import { useColors } from "@/hooks/use-colors";
import { useMemo, useState, useCallback, useEffect } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { GlowCard } from "@/components/ui/glow-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { PulsingBadge } from "@/components/ui/pulsing-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useWizard } from "@/components/wizard-overlay";

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
  const { triggerWizard } = useWizard();

  useEffect(() => {
    if (!loading) triggerWizard('dashboard');
  }, [loading]);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

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

  const matrixResidual = useMemo(() => {
    const matrix: Risk[][][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => [] as Risk[])
    );
    risks.forEach(r => {
      if (r.riscoResidual && r.riscoResidual > 0) {
        const targetRes = r.riscoResidual;
        let bestP = r.probabilidade, bestI = r.impacto, bestDiff = 999;
        for (let p = 1; p <= 5; p++) {
          for (let i = 1; i <= 5; i++) {
            const diff = Math.abs(p * i - targetRes);
            if (diff < bestDiff || (diff === bestDiff && p <= r.probabilidade && i <= r.impacto)) {
              bestDiff = diff; bestP = p; bestI = i;
            }
          }
        }
        matrix[5 - bestP][bestI - 1].push(r);
      } else {
        if (r.probabilidade >= 1 && r.probabilidade <= 5 && r.impacto >= 1 && r.impacto <= 5) {
          matrix[5 - r.probabilidade][r.impacto - 1].push(r);
        }
      }
    });
    return matrix;
  }, [risks]);

  const deslocamentoData = useMemo(() => {
    return risks.map(r => {
      const pOrig = r.probabilidade;
      const iOrig = r.impacto;
      let pRes = pOrig, iRes = iOrig;
      if (r.riscoResidual && r.riscoResidual > 0 && r.riscoResidual < r.riscoInerente) {
        const targetRes = r.riscoResidual;
        let bestP = pOrig, bestI = iOrig, bestDiff = 999;
        for (let p = 1; p <= 5; p++) {
          for (let i = 1; i <= 5; i++) {
            const diff = Math.abs(p * i - targetRes);
            if (diff < bestDiff || (diff === bestDiff && p <= pOrig && i <= iOrig)) {
              bestDiff = diff; bestP = p; bestI = i;
            }
          }
        }
        pRes = bestP; iRes = bestI;
      }
      return { id: r.id, pOrig, iOrig, pRes, iRes, inerente: r.riscoInerente, residual: r.riscoResidual || r.riscoInerente, reducao: r.reducaoPretendida || 0 };
    }).filter(d => d.pOrig !== d.pRes || d.iOrig !== d.iRes);
  }, [risks]);

  const eficaciaStats = useMemo(() => {
    const comTratamento = risks.filter(r => r.riscoResidual && r.riscoResidual > 0 && r.riscoResidual < r.riscoInerente);
    const totalInerente = comTratamento.reduce((s, r) => s + r.riscoInerente, 0);
    const totalResidual = comTratamento.reduce((s, r) => s + (r.riscoResidual || r.riscoInerente), 0);
    const reducaoMedia = totalInerente > 0 ? ((1 - totalResidual / totalInerente) * 100) : 0;
    return { comTratamento: comTratamento.length, totalInerente, totalResidual, reducaoMedia };
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

  // ─── MATRIX RENDERER (compact) ─────────────────────────────
  const renderCompactMatrix = (matrixData: Risk[][][], prefix: string, interactive: boolean = true) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#6B8A7A', fontSize: 9, fontWeight: '700', fontFamily: 'monospace', transform: [{ rotate: '-90deg' }] }}>P</Text>
      </View>
      <View style={{ flex: 1 }}>
        {matrixData.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 2 }}>
            <View style={{ width: 16, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#6B8A7A', fontSize: 9, fontWeight: '600', fontFamily: 'monospace' }}>{5 - rowIdx}</Text>
            </View>
            {row.map((cellRisks, colIdx) => {
              const prob = 5 - rowIdx;
              const imp = colIdx + 1;
              const bgColor = getMatrixColor(prob, imp);
              const count = cellRisks.length;
              const cellKey = `${prefix}-${rowIdx}-${colIdx}`;
              const isHovered = hoveredCell === cellKey;
              return (
                <TouchableOpacity
                  key={colIdx}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 4,
                    marginHorizontal: 1,
                    backgroundColor: count > 0 ? bgColor + '25' : '#111820',
                    borderColor: isHovered ? bgColor : (count > 0 ? bgColor + '50' : '#1A3A2A'),
                    borderWidth: isHovered ? 2 : 1,
                  }}
                  onPress={() => interactive && handleMatrixPress(prob, imp, cellRisks)}
                  onPressIn={() => setHoveredCell(cellKey)}
                  onPressOut={() => setHoveredCell(null)}
                  activeOpacity={count > 0 ? 0.7 : 1}
                >
                  {count > 0 ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: bgColor, fontSize: isDesktop ? 14 : 13, fontWeight: '800', fontFamily: 'monospace' }}>{count}</Text>
                      {(() => {
                        const cellFin = cellRisks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaMediaEsperada || 0), 0);
                        if (cellFin > 0) {
                          const fmt = cellFin >= 1000000 ? `${(cellFin / 1000000).toFixed(1)}M` : cellFin >= 1000 ? `${(cellFin / 1000).toFixed(0)}K` : `${cellFin.toFixed(0)}`;
                          return (
                            <View style={{ backgroundColor: bgColor + '30', borderRadius: 3, paddingHorizontal: 2, paddingVertical: 1, borderWidth: 1, borderColor: bgColor + '60', marginTop: 1 }}>
                              <Text style={{ color: '#FFFFFF', fontSize: 7, fontWeight: '800', fontFamily: 'monospace' }}>R${fmt}</Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ flexDirection: 'row', marginTop: 2, marginLeft: 16 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <View key={n} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#6B8A7A', fontSize: 9, fontWeight: '600', fontFamily: 'monospace' }}>{n}</Text>
            </View>
          ))}
        </View>
        <Text style={{ color: '#6B8A7A', fontSize: 8, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center', marginTop: 2, marginLeft: 16, letterSpacing: 1 }}>IMPACTO</Text>
      </View>
    </View>
  );

  const tooltipDescriptions: Record<string, string> = {
    inerente: 'Risco ANTES dos controles. Exposição bruta: Probabilidade × Impacto originais.',
    deslocamento: 'Mostra a migração do risco inerente → residual. Quanto maior o deslocamento, mais eficaz o controle.',
    residual: 'Risco APÓS os controles. Exposição real considerando as medidas de mitigação.',
  };

  const matrixLegend = (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
      {[
        { label: 'Baixo', color: '#00FF88' },
        { label: 'Médio', color: '#FFD600' },
        { label: 'Alto', color: '#FF8C00' },
        { label: 'Crítico', color: '#FF3D3D' },
      ].map(item => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.color }} />
          <Text style={{ color: '#6B8A7A', fontSize: 8, fontWeight: '600', fontFamily: 'monospace' }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

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

        {/* === 3 MATRIZES EM FLUXO HORIZONTAL (Desktop) === */}
        <View style={[styles.section, isDesktop && styles.sectionDesktop, { marginTop: 20 }]}>
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <GlowCard variant="default">
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: '#00E5FF', fontFamily: 'monospace', fontSize: 14 }]}>FLUXO DE RISCO: INERENTE → DESLOCAMENTO → RESIDUAL</Text>
              </View>

              {/* 3 Matrizes lado a lado no desktop, empilhadas no mobile */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 12 : 16 }}>
                {/* 1. INERENTE */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3D3D' }} />
                      <Text style={{ color: '#FF3D3D', fontSize: 10, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 0.5 }}>INERENTE</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setTooltipVisible(tooltipVisible === 'inerente' ? null : 'inerente')}
                      style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FF3D3D20', borderWidth: 1, borderColor: '#FF3D3D50', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#FF3D3D', fontSize: 10, fontWeight: '800', fontFamily: 'monospace' }}>?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[{ backgroundColor: '#FF3D3D08', borderWidth: 1, borderColor: '#FF3D3D20', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, paddingBottom: 8 }]}>
                    <Text style={{ color: '#FF3D3D80', fontSize: 8, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center', marginBottom: 4, letterSpacing: 1 }}>ANTES DOS CONTROLES</Text>
                    {renderCompactMatrix(matrixRisks, 'inerente')}
                  </View>
                  {tooltipVisible === 'inerente' && (
                    <View style={{ backgroundColor: '#FF3D3D10', borderWidth: 1, borderColor: '#FF3D3D30', borderRadius: 6, padding: 8, marginTop: 6 }}>
                      <Text style={{ color: '#E0F0E0', fontSize: 10, lineHeight: 15, fontFamily: 'monospace' }}>{tooltipDescriptions.inerente}</Text>
                    </View>
                  )}
                </View>

                {/* Arrow → */}
                {isDesktop && (
                  <View style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 20 }}>
                    <Text style={{ color: '#FFD600', fontSize: 24, fontWeight: '800' }}>→</Text>
                  </View>
                )}
                {!isDesktop && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#FFD600', fontSize: 20, fontWeight: '800' }}>↓</Text>
                  </View>
                )}

                {/* 2. DESLOCAMENTO */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD600' }} />
                      <Text style={{ color: '#FFD600', fontSize: 10, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 0.5 }}>DESLOCAMENTO</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setTooltipVisible(tooltipVisible === 'deslocamento' ? null : 'deslocamento')}
                      style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFD60020', borderWidth: 1, borderColor: '#FFD60050', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#FFD600', fontSize: 10, fontWeight: '800', fontFamily: 'monospace' }}>?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ backgroundColor: '#FFD60008', borderWidth: 1, borderColor: '#FFD60020', borderRadius: 8, padding: 8 }}>
                    {/* Stats compactos */}
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                      <View style={{ flex: 1, backgroundColor: '#FFD60010', borderRadius: 4, padding: 4, alignItems: 'center' }}>
                        <Text style={{ color: '#FFD600', fontSize: 14, fontWeight: '800', fontFamily: 'monospace' }}>{deslocamentoData.length}</Text>
                        <Text style={{ color: '#6B8A7A', fontSize: 7, fontFamily: 'monospace' }}>DESLOCADOS</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#00FF8810', borderRadius: 4, padding: 4, alignItems: 'center' }}>
                        <Text style={{ color: '#00FF88', fontSize: 14, fontWeight: '800', fontFamily: 'monospace' }}>{eficaciaStats.reducaoMedia.toFixed(0)}%</Text>
                        <Text style={{ color: '#6B8A7A', fontSize: 7, fontFamily: 'monospace' }}>REDUÇÃO</Text>
                      </View>
                    </View>
                    {/* Lista compacta de deslocamentos */}
                    <View style={{ backgroundColor: '#111820', borderRadius: 6, borderWidth: 1, borderColor: '#1A3A2A', overflow: 'hidden' }}>
                      <View style={{ flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#1A3A2A' }}>
                        <Text style={{ flex: 1, color: '#00E5FF', fontSize: 8, fontWeight: '700', fontFamily: 'monospace' }}>ID</Text>
                        <Text style={{ width: 35, color: '#FF3D3D', fontSize: 8, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>INE</Text>
                        <Text style={{ width: 14, color: '#FFD600', fontSize: 8, textAlign: 'center' }}>→</Text>
                        <Text style={{ width: 35, color: '#00FF88', fontSize: 8, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>RES</Text>
                        <Text style={{ width: 30, color: '#6B8A7A', fontSize: 8, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>%</Text>
                      </View>
                      <ScrollView nestedScrollEnabled style={{ maxHeight: isDesktop ? 180 : 140 }}>
                        {deslocamentoData.sort((a, b) => (b.inerente - b.residual) - (a.inerente - a.residual)).map(d => (
                          <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#1A3A2A20' }}>
                            <Text style={{ flex: 1, color: '#E0F0E0', fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>{d.id}</Text>
                            <View style={{ width: 35, alignItems: 'center' }}>
                              <View style={{ backgroundColor: '#FF3D3D20', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                                <Text style={{ color: '#FF3D3D', fontSize: 9, fontWeight: '800', fontFamily: 'monospace' }}>{d.inerente}</Text>
                              </View>
                            </View>
                            <Text style={{ width: 14, color: '#FFD600', fontSize: 10, fontWeight: '800', textAlign: 'center' }}>→</Text>
                            <View style={{ width: 35, alignItems: 'center' }}>
                              <View style={{ backgroundColor: '#00FF8820', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                                <Text style={{ color: '#00FF88', fontSize: 9, fontWeight: '800', fontFamily: 'monospace' }}>{d.residual}</Text>
                              </View>
                            </View>
                            <Text style={{ width: 30, color: '#FFD600', fontSize: 9, fontWeight: '800', fontFamily: 'monospace', textAlign: 'right' }}>-{((1 - d.residual / d.inerente) * 100).toFixed(0)}%</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  {tooltipVisible === 'deslocamento' && (
                    <View style={{ backgroundColor: '#FFD60010', borderWidth: 1, borderColor: '#FFD60030', borderRadius: 6, padding: 8, marginTop: 6 }}>
                      <Text style={{ color: '#E0F0E0', fontSize: 10, lineHeight: 15, fontFamily: 'monospace' }}>{tooltipDescriptions.deslocamento}</Text>
                    </View>
                  )}
                </View>

                {/* Arrow → */}
                {isDesktop && (
                  <View style={{ justifyContent: 'center', alignItems: 'center', paddingTop: 20 }}>
                    <Text style={{ color: '#00FF88', fontSize: 24, fontWeight: '800' }}>→</Text>
                  </View>
                )}
                {!isDesktop && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#00FF88', fontSize: 20, fontWeight: '800' }}>↓</Text>
                  </View>
                )}

                {/* 3. RESIDUAL */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF88' }} />
                      <Text style={{ color: '#00FF88', fontSize: 10, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 0.5 }}>RESIDUAL</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setTooltipVisible(tooltipVisible === 'residual' ? null : 'residual')}
                      style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#00FF8820', borderWidth: 1, borderColor: '#00FF8850', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#00FF88', fontSize: 10, fontWeight: '800', fontFamily: 'monospace' }}>?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ backgroundColor: '#00FF8808', borderWidth: 1, borderColor: '#00FF8820', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, paddingBottom: 8 }}>
                    <Text style={{ color: '#00FF8880', fontSize: 8, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center', marginBottom: 4, letterSpacing: 1 }}>APÓS CONTROLES</Text>
                    {renderCompactMatrix(matrixResidual, 'residual')}
                  </View>
                  {tooltipVisible === 'residual' && (
                    <View style={{ backgroundColor: '#00FF8810', borderWidth: 1, borderColor: '#00FF8830', borderRadius: 6, padding: 8, marginTop: 6 }}>
                      <Text style={{ color: '#E0F0E0', fontSize: 10, lineHeight: 15, fontFamily: 'monospace' }}>{tooltipDescriptions.residual}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Legenda + Comparativo compacto */}
              {matrixLegend}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: '#1A3A2A', paddingTop: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#FF3D3D10', borderWidth: 1, borderColor: '#FF3D3D30', borderRadius: 6, padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#FF3D3D', fontSize: 8, fontWeight: '700', fontFamily: 'monospace', marginBottom: 2 }}>INERENTE</Text>
                  <Text style={{ color: '#FF3D3D', fontSize: 14, fontWeight: '800', fontFamily: 'monospace' }}>{risks.filter(r => r.riscoInerente >= 20).length} Críticos</Text>
                  <Text style={{ color: '#FF8C00', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}>{risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20).length} Altos</Text>
                </View>
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#FFD600', fontSize: 18, fontWeight: '800' }}>→</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#00FF8810', borderWidth: 1, borderColor: '#00FF8830', borderRadius: 6, padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#00FF88', fontSize: 8, fontWeight: '700', fontFamily: 'monospace', marginBottom: 2 }}>RESIDUAL</Text>
                  <Text style={{ color: '#FF3D3D', fontSize: 14, fontWeight: '800', fontFamily: 'monospace' }}>{risks.filter(r => (r.riscoResidual || r.riscoInerente) >= 20).length} Críticos</Text>
                  <Text style={{ color: '#FF8C00', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}>{risks.filter(r => { const res = r.riscoResidual || r.riscoInerente; return res >= 12 && res < 20; }).length} Altos</Text>
                </View>
              </View>
            </GlowCard>
          </Animated.View>
        </View>

        {/* Content Grid: Type + Top Risks + Financial */}
        <View style={[styles.section, isDesktop && styles.sectionDesktop, { marginTop: 16 }]}>
          <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
            {/* Left Column: Risk by Type + Financial */}
            <View style={[styles.column, isDesktop && { flex: 1 }]}>
              {/* Risks by Type */}
              <Animated.View entering={FadeInDown.duration(500).delay(400)}>
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

              {/* Financial Summary */}
              {financialSummary.riscosComDados > 0 && (
                <Animated.View entering={FadeInDown.duration(500).delay(500)} style={{ marginTop: 16 }}>
                  <GlowCard variant="default">
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: '#00E5FF', fontFamily: 'monospace' }]}>IMPACTO FINANCEIRO</Text>
                      <View style={[styles.cardBadge, { backgroundColor: '#FF3D3D15', borderWidth: 1, borderColor: '#FF3D3D30' }]}>
                        <Text style={[styles.cardBadgeText, { color: '#FF3D3D', fontFamily: 'monospace' }]}>R$ MILHÕES</Text>
                      </View>
                    </View>
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={[styles.finCardResponsive, { borderColor: '#FF3D3D30', backgroundColor: '#FF3D3D08' }]}>
                          <Text style={[styles.finLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>EXPOSIÇÃO{"\n"}ALTA DEMANDA</Text>
                          <Text style={[styles.finValueMobile, { color: '#FF3D3D', fontFamily: 'monospace' }]}>R$ {(financialSummary.totalExposicaoAlta / 1000000).toFixed(1)}M</Text>
                        </View>
                        <View style={[styles.finCardResponsive, { borderColor: '#FF8C0030', backgroundColor: '#FF8C0008' }]}>
                          <Text style={[styles.finLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>EXPOSIÇÃO{"\n"}BAIXA DEMANDA</Text>
                          <Text style={[styles.finValueMobile, { color: '#FF8C00', fontFamily: 'monospace' }]}>R$ {(financialSummary.totalExposicaoBaixa / 1000000).toFixed(1)}M</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={[styles.finCardResponsive, { borderColor: '#00E5FF30', backgroundColor: '#00E5FF08' }]}>
                          <Text style={[styles.finLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>INVESTIMENTO{"\n"}PREVENTIVO</Text>
                          <Text style={[styles.finValueMobile, { color: '#00E5FF', fontFamily: 'monospace' }]}>R$ {(financialSummary.totalInvestimento / 1000000).toFixed(1)}M</Text>
                        </View>
                        <View style={[styles.finCardResponsive, { borderColor: '#00FF8830', backgroundColor: '#00FF8808' }]}>
                          <Text style={[styles.finLabel, { color: '#6B8A7A', fontFamily: 'monospace' }]}>ECONOMIA{"\n"}POTENCIAL</Text>
                          <Text style={[styles.finValueMobile, { color: '#00FF88', fontFamily: 'monospace' }]}>R$ {(financialSummary.totalEconomia / 1000000).toFixed(1)}M</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#1A3A2A', paddingTop: 10 }}>
                      <Text style={{ color: '#00E5FF', fontFamily: 'monospace', fontWeight: '800', fontSize: 10, textAlign: 'center', marginBottom: 6 }}>INVESTIR R$ {(financialSummary.totalInvestimento / 1000000).toFixed(1)}M → EVITAR PERDA DE ATÉ R$ {(financialSummary.totalExposicaoAlta / 1000000).toFixed(1)}M</Text>
                      <View style={{ height: 6, backgroundColor: '#111820', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.min((financialSummary.totalInvestimento / financialSummary.totalExposicaoAlta) * 100, 100)}%`, backgroundColor: '#00E5FF', borderRadius: 3 }} />
                      </View>
                      <Text style={{ color: '#6B8A7A', fontFamily: 'monospace', fontSize: 9, textAlign: 'center', marginTop: 4 }}>ROI: {financialSummary.roiMedio.toFixed(0)}% | {financialSummary.riscosComDados} riscos analisados</Text>
                    </View>
                  </GlowCard>
                </Animated.View>
              )}

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
                    </TouchableOpacity>
                  </View>
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
            </View>
          </View>
        </View>

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
  contentGrid: { gap: 16 },
  contentGridDesktop: { flexDirection: 'row' },
  column: { gap: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  cardBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  seeAll: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
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
  finCardResponsive: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 0 },
  finLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', marginBottom: 3 },
  finValueMobile: { fontSize: 15, fontWeight: '800' },
});
