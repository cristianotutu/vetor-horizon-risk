import { Text, View, ScrollView, TouchableOpacity, useWindowDimensions, Platform, Modal, FlatList, Image } from "react-native";
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
import { StyleSheet } from "react-native";

const vetorHorizonLogo = require("@/assets/images/vetor-horizon-logo.png");

type FilterState = { title: string; risks: Risk[] } | null;

const LEVEL_COLORS = { critical: "#FF3D3D", high: "#FF8C00", medium: "#FFD600", low: "#00FF88" };
const MONO = Platform.OS === 'web' ? 'monospace' : undefined;

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

  // Build inerente matrix
  const matrixInerente = useMemo(() => {
    const m: Risk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => [] as Risk[]));
    risks.forEach(r => {
      if (r.probabilidade >= 1 && r.probabilidade <= 5 && r.impacto >= 1 && r.impacto <= 5) {
        m[5 - r.probabilidade][r.impacto - 1].push(r);
      }
    });
    return m;
  }, [risks]);

  // Helper: find best P,I for a target score
  const findBestPI = (target: number, origP: number, origI: number) => {
    let bestP = origP, bestI = origI, bestDiff = 999;
    for (let p = 1; p <= 5; p++) {
      for (let i = 1; i <= 5; i++) {
        const diff = Math.abs(p * i - target);
        if (diff < bestDiff || (diff === bestDiff && p <= origP && i <= origI)) {
          bestDiff = diff; bestP = p; bestI = i;
        }
      }
    }
    return { p: bestP, i: bestI };
  };

  // Build residual matrix
  const matrixResidual = useMemo(() => {
    const m: Risk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => [] as Risk[]));
    risks.forEach(r => {
      if (r.riscoResidual && r.riscoResidual > 0) {
        const { p, i } = findBestPI(r.riscoResidual, r.probabilidade, r.impacto);
        m[5 - p][i - 1].push(r);
      } else {
        if (r.probabilidade >= 1 && r.probabilidade <= 5 && r.impacto >= 1 && r.impacto <= 5) {
          m[5 - r.probabilidade][r.impacto - 1].push(r);
        }
      }
    });
    return m;
  }, [risks]);

  // Build deslocamento matrix (shows arrows/movement)
  const deslocamentoMatrix = useMemo(() => {
    // For each cell, count how many risks pass through (either as origin or destination)
    const m: { origins: Risk[]; destinations: Risk[] }[][] = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => ({ origins: [] as Risk[], destinations: [] as Risk[] }))
    );
    risks.forEach(r => {
      if (r.riscoResidual && r.riscoResidual > 0 && r.riscoResidual < r.riscoInerente) {
        // Mark origin
        if (r.probabilidade >= 1 && r.probabilidade <= 5 && r.impacto >= 1 && r.impacto <= 5) {
          m[5 - r.probabilidade][r.impacto - 1].origins.push(r);
        }
        // Mark destination
        const { p, i } = findBestPI(r.riscoResidual, r.probabilidade, r.impacto);
        m[5 - p][i - 1].destinations.push(r);
      }
    });
    return m;
  }, [risks]);

  const eficaciaStats = useMemo(() => {
    const comTratamento = risks.filter(r => r.riscoResidual && r.riscoResidual > 0 && r.riscoResidual < r.riscoInerente);
    const totalInerente = comTratamento.reduce((s, r) => s + r.riscoInerente, 0);
    const totalResidual = comTratamento.reduce((s, r) => s + (r.riscoResidual || r.riscoInerente), 0);
    const reducaoMedia = totalInerente > 0 ? ((1 - totalResidual / totalInerente) * 100) : 0;
    return { comTratamento: comTratamento.length, reducaoMedia };
  }, [risks]);

  const topRisks = useMemo(() => [...risks].sort((a, b) => b.gutScore - a.gutScore).slice(0, 10), [risks]);

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
    let totalExposicaoAlta = 0, totalExposicaoBaixa = 0, totalInvestimento = 0, totalEconomia = 0, riscosComDados = 0;
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
      case 'total': filtered = risks; title = `Todos os Riscos (${risks.length})`; break;
      case 'critico': filtered = risks.filter(r => r.riscoInerente >= 20); title = `Riscos Críticos (PxI ≥ 20)`; break;
      case 'alto': filtered = risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20); title = `Riscos Altos (PxI 12-19)`; break;
      case 'medio': filtered = risks.filter(r => r.riscoInerente >= 6 && r.riscoInerente < 12); title = `Riscos Médios (PxI 6-11)`; break;
      case 'baixo': filtered = risks.filter(r => r.riscoInerente < 6); title = `Riscos Baixos (PxI 1-5)`; break;
    }
    if (filtered.length > 0) setActiveFilter({ title, risks: filtered.sort((a, b) => b.riscoInerente - a.riscoInerente) });
  }, [risks]);

  const handleMatrixPress = useCallback((prob: number, imp: number, cellRisks: Risk[]) => {
    if (cellRisks.length > 0) setActiveFilter({ title: `Riscos P=${prob} × I=${imp} (Score ${prob * imp})`, risks: cellRisks });
  }, []);

  const handleTypePress = useCallback((type: string, typeRisks: Risk[]) => {
    setActiveFilter({ title: `${type} (${typeRisks.length})`, risks: typeRisks.sort((a, b) => b.riscoInerente - a.riscoInerente) });
  }, []);

  if (loading) {
    return (<ScreenContainer className="flex-1 items-center justify-center"><StatusIndicator status="monitoring" label="CARREGANDO DADOS..." /></ScreenContainer>);
  }

  // ─── MATRIX 5x5 RENDERER ─────────────────────────────
  const renderMatrix5x5 = (matrixData: Risk[][][], prefix: string, interactive = true) => {
    const cellSize = isDesktop ? 54 : 48;
    const gap = isDesktop ? 2 : 2;
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 18, alignItems: 'center', marginRight: 4 }}>
            <Text style={{ color: '#6B8A7A', fontSize: 8, fontWeight: '700', fontFamily: MONO, transform: [{ rotate: '-90deg' }], width: 80, textAlign: 'center', letterSpacing: 2 }}>PROBABILIDADE</Text>
          </View>
          <View>
            {matrixData.map((row, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: gap }}>
                <View style={{ width: 18, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#6B8A7A', fontSize: 11, fontWeight: '700', fontFamily: MONO }}>{5 - rowIdx}</Text>
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
                        width: cellSize, height: cellSize,
                        justifyContent: 'center', alignItems: 'center',
                        borderRadius: 6, marginHorizontal: gap / 2,
                        backgroundColor: count > 0 ? bgColor + '30' : '#0D1117',
                        borderColor: isHovered ? bgColor : (count > 0 ? bgColor + '60' : '#1A2A22'),
                        borderWidth: isHovered ? 2.5 : 1,
                        ...(count > 0 ? { shadowColor: bgColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 6 } : {}),
                      }}
                      onPress={() => interactive && handleMatrixPress(prob, imp, cellRisks)}
                      onPressIn={() => setHoveredCell(cellKey)}
                      onPressOut={() => setHoveredCell(null)}
                      activeOpacity={count > 0 ? 0.7 : 1}
                    >
                      {count > 0 && (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: bgColor, fontSize: isDesktop ? 18 : 14, fontWeight: '900', fontFamily: MONO }}>{count}</Text>
                          {(() => {
                            const cellFin = cellRisks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaMediaEsperada || 0), 0);
                            if (cellFin > 0) {
                              const fmt = cellFin >= 1000000 ? `R$${(cellFin / 1000000).toFixed(1)}M` : cellFin >= 1000 ? `R$${(cellFin / 1000).toFixed(0)}K` : `R$${cellFin.toFixed(0)}`;
                              return (
                                <View style={{ backgroundColor: bgColor + '35', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1, borderColor: bgColor + '70', marginTop: 1 }}>
                                  <Text style={{ color: '#FFF', fontSize: isDesktop ? 8 : 7, fontWeight: '800', fontFamily: MONO }}>{fmt}</Text>
                                </View>
                              );
                            }
                            return null;
                          })()}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={{ flexDirection: 'row', marginTop: 4, marginLeft: 18 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <View key={n} style={{ width: cellSize + gap, alignItems: 'center' }}>
                  <Text style={{ color: '#6B8A7A', fontSize: 11, fontWeight: '700', fontFamily: MONO }}>{n}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: '#6B8A7A', fontSize: 8, fontWeight: '700', fontFamily: MONO, textAlign: 'center', marginTop: 2, marginLeft: 18, letterSpacing: 2 }}>IMPACTO</Text>
          </View>
        </View>
      </View>
    );
  };

  // ─── DESLOCAMENTO MATRIX (shows migration arrows) ─────────────────────────────
  const renderDeslocamentoMatrix = () => {
    const cellSize = isDesktop ? 54 : 48;
    const gap = isDesktop ? 2 : 2;
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 18, alignItems: 'center', marginRight: 4 }}>
            <Text style={{ color: '#6B8A7A', fontSize: 8, fontWeight: '700', fontFamily: MONO, transform: [{ rotate: '-90deg' }], width: 80, textAlign: 'center', letterSpacing: 2 }}>PROBABILIDADE</Text>
          </View>
          <View>
            {deslocamentoMatrix.map((row, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: gap }}>
                <View style={{ width: 18, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#6B8A7A', fontSize: 11, fontWeight: '700', fontFamily: MONO }}>{5 - rowIdx}</Text>
                </View>
                {row.map((cell, colIdx) => {
                  const prob = 5 - rowIdx;
                  const imp = colIdx + 1;
                  const bgColor = getMatrixColor(prob, imp);
                  const hasOrigin = cell.origins.length > 0;
                  const hasDest = cell.destinations.length > 0;
                  const hasActivity = hasOrigin || hasDest;
                  return (
                    <TouchableOpacity
                      key={colIdx}
                      style={{
                        width: cellSize, height: cellSize,
                        justifyContent: 'center', alignItems: 'center',
                        borderRadius: 6, marginHorizontal: gap / 2,
                        backgroundColor: hasActivity ? bgColor + '25' : '#0D1117',
                        borderColor: hasActivity ? bgColor + '60' : '#1A2A22',
                        borderWidth: 1,
                        ...(hasActivity ? { shadowColor: bgColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 4 } : {}),
                      }}
                      onPress={() => {
                        const allRisks = [...cell.origins, ...cell.destinations];
                        const unique = allRisks.filter((r, i, a) => a.findIndex(x => x.id === r.id) === i);
                        if (unique.length > 0) setActiveFilter({ title: `Deslocamento P=${prob} × I=${imp}`, risks: unique });
                      }}
                      activeOpacity={hasActivity ? 0.7 : 1}
                    >
                      {hasOrigin && !hasDest && (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#FF3D3D', fontSize: isDesktop ? 15 : 12, fontWeight: '900', fontFamily: MONO }}>-{cell.origins.length}</Text>
                          <Text style={{ color: '#FF3D3D', fontSize: isDesktop ? 9 : 7, fontWeight: '700', fontFamily: MONO }}>SAIU</Text>
                        </View>
                      )}
                      {hasDest && !hasOrigin && (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#00FF88', fontSize: isDesktop ? 15 : 12, fontWeight: '900', fontFamily: MONO }}>+{cell.destinations.length}</Text>
                          <Text style={{ color: '#00FF88', fontSize: isDesktop ? 9 : 7, fontWeight: '700', fontFamily: MONO }}>ENTROU</Text>
                        </View>
                      )}
                      {hasOrigin && hasDest && (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#FF3D3D', fontSize: isDesktop ? 12 : 9, fontWeight: '900', fontFamily: MONO }}>-{cell.origins.length}</Text>
                          <Text style={{ color: '#00FF88', fontSize: isDesktop ? 12 : 9, fontWeight: '900', fontFamily: MONO }}>+{cell.destinations.length}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={{ flexDirection: 'row', marginTop: 4, marginLeft: 18 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <View key={n} style={{ width: cellSize + gap, alignItems: 'center' }}>
                  <Text style={{ color: '#6B8A7A', fontSize: 11, fontWeight: '700', fontFamily: MONO }}>{n}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: '#6B8A7A', fontSize: 8, fontWeight: '700', fontFamily: MONO, textAlign: 'center', marginTop: 2, marginLeft: 18, letterSpacing: 2 }}>IMPACTO</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRiskModal = () => {
    if (!activeFilter) return null;
    return (
      <Modal visible={!!activeFilter} transparent animationType="fade" onRequestClose={() => setActiveFilter(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setActiveFilter(null)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalContent, { maxWidth: isDesktop ? 700 : width - 32, maxHeight: '80%' }]} onPress={() => {}}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{activeFilter.title}</Text>
                <Text style={s.modalSubtitle}>Clique em um risco para ver detalhes</Text>
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
                const badgeLevel = item.riscoInerente >= 20 ? 'critical' : item.riscoInerente >= 12 ? 'high' : item.riscoInerente >= 6 ? 'medium' : 'low';
                return (
                  <TouchableOpacity
                    style={s.modalRiskCard}
                    onPress={() => { setActiveFilter(null); router.push(`/risk/${item.id}` as any); }}
                    activeOpacity={0.7}
                  >
                    <View style={s.modalRiskHeader}>
                      <View style={s.modalRiskLeft}>
                        <View style={s.modalRiskIdBadge}><Text style={s.modalRiskId}>{item.id}</Text></View>
                        <Text style={s.modalRiskType}>{item.tipoRisco}</Text>
                      </View>
                      <View style={s.modalRiskBadges}>
                        <PulsingBadge level={badgeLevel as any} size="sm" pulsing={false} />
                        <View style={[s.scorePill, { backgroundColor: gutLevel.color + '15', borderColor: gutLevel.color + '30' }]}>
                          <Text style={[s.scoreText, { color: gutLevel.color }]}>GUT {item.gutScore}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={s.modalRiskDesc} numberOfLines={3}>{item.descricaoRisco}</Text>
                    <View style={s.modalRiskFooter}>
                      <Text style={s.modalRiskMeta}>{item.fonteDeRisco} | {item.tratamento}</Text>
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
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={[s.header, isDesktop && s.headerDesktop]}>
          <View style={s.headerLeft}>
            {!isDesktop && (
              <Image source={vetorHorizonLogo} style={{ width: 64, height: 64, borderRadius: 8, marginBottom: 4 }} resizeMode="contain" />
            )}
            <View style={s.titleRow}>
              <Text style={[s.pageTitle, { color: '#E0F0E0', fontFamily: MONO }]}>Dashboard</Text>
              <StatusIndicator status="monitoring" label="ICAPT v5" />
            </View>
            <Text style={[s.pageSubtitle, { color: '#6B8A7A', fontFamily: MONO }]}>Monitoramento de riscos corporativos — DAMACORP</Text>
          </View>
          <TouchableOpacity style={s.addButton} onPress={() => router.push('/risk/new' as any)} activeOpacity={0.8}>
            <IconSymbol name="plus.circle.fill" size={18} color="#00E5FF" />
            <Text style={s.addButtonText}>NOVO RISCO</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Summary Cards */}
        <View style={[s.section, isDesktop && s.sectionDesktop]}>
          <View style={[s.statsGrid, isDesktop && s.statsGridDesktop]}>
            {[
              { key: 'total', label: 'TOTAL DE RISCOS', value: stats.total, color: '#00E5FF', variant: 'default' as const, pulsing: false },
              { key: 'critico', label: 'CRÍTICO', value: stats.critico, color: LEVEL_COLORS.critical, variant: 'critical' as const, pulsing: true },
              { key: 'alto', label: 'ALTO', value: stats.alto, color: LEVEL_COLORS.high, variant: 'high' as const, pulsing: false },
              { key: 'medio', label: 'MÉDIO', value: stats.medio, color: LEVEL_COLORS.medium, variant: 'medium' as const, pulsing: false },
              { key: 'baixo', label: 'BAIXO', value: stats.baixo, color: LEVEL_COLORS.low, variant: 'low' as const, pulsing: false },
            ].map((stat, idx) => (
              <Animated.View key={stat.key} entering={FadeInDown.duration(400).delay(100 + idx * 80)} style={{ flex: 1, minWidth: 120 }}>
                <GlowCard variant={stat.variant} pulsing={stat.pulsing} onPress={() => handleStatPress(stat.key)}>
                  {stat.key === 'total' ? (
                    <View style={s.statCardInner}><StatusIndicator status="active" showLabel={false} /><Text style={[s.statLabel, { color: stat.color, fontFamily: MONO }]}>{stat.label}</Text></View>
                  ) : (
                    <PulsingBadge level={stat.variant === 'default' ? 'medium' : stat.variant} size="sm" />
                  )}
                  <AnimatedCounter value={stat.value} color={stat.color} fontSize={26} />
                  <Text style={[s.tapHint, { color: stat.color + '80', fontFamily: MONO }]}>VER →</Text>
                </GlowCard>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
            3 MATRIZES EM FLUXO HORIZONTAL: INERENTE → DESLOCAMENTO → RESIDUAL
            ═══════════════════════════════════════════════════════════════ */}
        <View style={[s.section, isDesktop && s.sectionDesktop, { marginTop: 4 }]}>
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <GlowCard variant="default">
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: '#00E5FF', fontFamily: MONO }]}>FLUXO DE RISCO</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3D3D' }} />
                    <Text style={{ color: '#6B8A7A', fontSize: 8, fontFamily: MONO }}>Saiu</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF88' }} />
                    <Text style={{ color: '#6B8A7A', fontSize: 8, fontFamily: MONO }}>Entrou</Text>
                  </View>
                </View>
              </View>

              {/* 3 Matrizes lado a lado (desktop) ou empilhadas (mobile) */}
              <ScrollView horizontal={isDesktop} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'flex-start' : 'center', justifyContent: 'center', gap: isDesktop ? 0 : 16, paddingVertical: 8, ...(isDesktop ? { width: '100%' } : {}) }}>
                {/* 1. INERENTE */}
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF3D3D', shadowColor: '#FF3D3D', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 }} />
                    <Text style={{ color: '#FF3D3D', fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 2 }}>INERENTE</Text>
                  </View>
                  <View style={{ backgroundColor: '#FF3D3D08', borderWidth: 1.5, borderColor: '#FF3D3D30', borderRadius: 8, padding: isDesktop ? 6 : 6 }}>
                    <Text style={{ color: '#FF3D3D80', fontSize: 8, fontWeight: '700', fontFamily: MONO, textAlign: 'center', marginBottom: 4, letterSpacing: 2 }}>ANTES DOS CONTROLES</Text>
                    {renderMatrix5x5(matrixInerente, 'inerente')}
                  </View>
                </View>
                {/* Arrow → */}
                <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: isDesktop ? 6 : 0, paddingVertical: isDesktop ? 0 : 4 }}>
                  <View style={{ backgroundColor: '#00FF8815', borderRadius: 18, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#00FF885050', shadowColor: '#FFD600', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
                    <Text style={{ color: '#FFD600', fontSize: 18, fontWeight: '900' }}>{isDesktop ? '→' : '↓'}</Text>
                  </View>
                </View>

                {/* 2. DESLOCAMENTO */}
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD600', shadowColor: '#FFD600', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 }} />
                    <Text style={{ color: '#FFD600', fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 2 }}>DESLOCAMENTO</Text>
                  </View>
                  <View style={{ backgroundColor: '#FFD60008', borderWidth: 1.5, borderColor: '#FFD60030', borderRadius: 8, padding: isDesktop ? 6 : 6 }}>
                    <Text style={{ color: '#FFD60080', fontSize: 8, fontWeight: '700', fontFamily: MONO, textAlign: 'center', marginBottom: 4, letterSpacing: 2 }}>MIGRAÇÃO DOS RISCOS</Text>
                    {renderDeslocamentoMatrix()}
                  </View>
                </View>

                {/* Arrow → */}
                <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: isDesktop ? 4 : 0, paddingVertical: isDesktop ? 0 : 4 }}>
                  <View style={{ backgroundColor: '#00FF8820', borderRadius: 16, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#00FF8840' }}>
                    <Text style={{ color: '#00FF88', fontSize: 16, fontWeight: '900' }}>{isDesktop ? '→' : '↓'}</Text>
                  </View>
                </View>

                {/* 3. RESIDUAL */}
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#00FF88', shadowColor: '#00FF88', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 }} />
                    <Text style={{ color: '#00FF88', fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 2 }}>RESIDUAL</Text>
                  </View>
                  <View style={{ backgroundColor: '#00FF8808', borderWidth: 1.5, borderColor: '#00FF8830', borderRadius: 8, padding: isDesktop ? 6 : 6 }}>
                    <Text style={{ color: '#00FF8880', fontSize: 8, fontWeight: '700', fontFamily: MONO, textAlign: 'center', marginBottom: 4, letterSpacing: 2 }}>APÓS CONTROLES</Text>
                    {renderMatrix5x5(matrixResidual, 'residual')}
                  </View>
                </View>
              </ScrollView>

              {/* Summary bar */}
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: '#1A3A2A', paddingTop: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#FF3D3D10', borderWidth: 1.5, borderColor: '#FF3D3D40', borderRadius: 6, padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#FF3D3D', fontSize: 8, fontWeight: '700', fontFamily: MONO, marginBottom: 2, letterSpacing: 1 }}>INERENTE</Text>
                  <Text style={{ color: '#FF3D3D', fontSize: 18, fontWeight: '900', fontFamily: MONO }}>{risks.filter(r => r.riscoInerente >= 20).length}</Text>
                  <Text style={{ color: '#FF3D3D80', fontSize: 9, fontFamily: MONO }}>Críticos</Text>
                </View>
                <View style={{ justifyContent: 'center' }}><Text style={{ color: '#FFD600', fontSize: 20, fontWeight: '900' }}>→</Text></View>
                <View style={{ flex: 1, backgroundColor: '#FFD60010', borderWidth: 1.5, borderColor: '#FFD60040', borderRadius: 6, padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#FFD600', fontSize: 8, fontWeight: '700', fontFamily: MONO, marginBottom: 2, letterSpacing: 1 }}>EFICÁCIA</Text>
                  <Text style={{ color: '#FFD600', fontSize: 18, fontWeight: '900', fontFamily: MONO }}>{eficaciaStats.reducaoMedia.toFixed(0)}%</Text>
                  <Text style={{ color: '#FFD60080', fontSize: 9, fontFamily: MONO }}>Redução</Text>
                </View>
                <View style={{ justifyContent: 'center' }}><Text style={{ color: '#00FF88', fontSize: 20, fontWeight: '900' }}>→</Text></View>
                <View style={{ flex: 1, backgroundColor: '#00FF8810', borderWidth: 1.5, borderColor: '#00FF8840', borderRadius: 6, padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#00FF88', fontSize: 8, fontWeight: '700', fontFamily: MONO, marginBottom: 2, letterSpacing: 1 }}>RESIDUAL</Text>
                  <Text style={{ color: '#00FF88', fontSize: 18, fontWeight: '900', fontFamily: MONO }}>{risks.filter(r => (r.riscoResidual || r.riscoInerente) >= 20).length}</Text>
                  <Text style={{ color: '#00FF8880', fontSize: 9, fontFamily: MONO }}>Críticos</Text>
                </View>
              </View>
            </GlowCard>
          </Animated.View>
        </View>

        {/* Content Grid: Type + Financial | Top Risks */}
        <View style={[s.section, isDesktop && s.sectionDesktop, { marginTop: 4 }]}>
          <View style={[s.contentGrid, isDesktop && s.contentGridDesktop]}>
            {/* Left Column */}
            <View style={[s.column, isDesktop && { flex: 1 }]}>
              {/* Risks by Type */}
              <Animated.View entering={FadeInDown.duration(500).delay(400)}>
                <GlowCard variant="default">
                  <View style={s.cardHeader}>
                    <Text style={[s.cardTitle, { color: '#00E5FF', fontFamily: MONO }]}>DISTRIBUIÇÃO POR TIPO</Text>
                  </View>
                  {risksByType.map(([type, typeRisks]) => {
                    const pct = Math.round((typeRisks.length / risks.length) * 100);
                    const maxLevel = Math.max(...typeRisks.map(r => r.riscoInerente));
                    const barColor = maxLevel >= 20 ? LEVEL_COLORS.critical : maxLevel >= 12 ? LEVEL_COLORS.high : maxLevel >= 6 ? LEVEL_COLORS.medium : LEVEL_COLORS.low;
                    return (
                      <TouchableOpacity key={type} style={s.barRow} onPress={() => handleTypePress(type, typeRisks)} activeOpacity={0.6}>
                        <Text style={[s.barLabel, { color: '#E0F0E0', fontFamily: MONO }]} numberOfLines={1}>{type.replace('Risco ', '').replace('de ', '')}</Text>
                        <Text style={[s.barValue, { color: barColor, fontFamily: MONO }]}>{typeRisks.length}</Text>
                        <View style={[s.barTrack, { backgroundColor: '#1A3A2A' }]}>
                          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </GlowCard>
              </Animated.View>

              {/* Financial Summary */}
              {financialSummary.riscosComDados > 0 && (
                <Animated.View entering={FadeInDown.duration(500).delay(500)} style={{ marginTop: 6 }}>
                  <GlowCard variant="default">
                    <View style={s.cardHeader}>
                      <Text style={[s.cardTitle, { color: '#00E5FF', fontFamily: MONO }]}>IMPACTO FINANCEIRO</Text>
                      <View style={[s.cardBadge, { backgroundColor: '#FF3D3D15', borderColor: '#FF3D3D30' }]}>
                        <Text style={[s.cardBadgeText, { color: '#FF3D3D', fontFamily: MONO }]}>R$ MILHÕES</Text>
                      </View>
                    </View>
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <View style={[s.finCard, { borderColor: '#FF3D3D30', backgroundColor: '#FF3D3D08' }]}>
                          <Text style={s.finLabel}>EXPOSIÇÃO ALTA</Text>
                          <Text style={[s.finValue, { color: '#FF3D3D' }]}>R$ {(financialSummary.totalExposicaoAlta / 1000000).toFixed(1)}M</Text>
                        </View>
                        <View style={[s.finCard, { borderColor: '#FF8C0030', backgroundColor: '#FF8C0008' }]}>
                          <Text style={s.finLabel}>EXPOSIÇÃO BAIXA</Text>
                          <Text style={[s.finValue, { color: '#FF8C00' }]}>R$ {(financialSummary.totalExposicaoBaixa / 1000000).toFixed(1)}M</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <View style={[s.finCard, { borderColor: '#00E5FF30', backgroundColor: '#00E5FF08' }]}>
                          <Text style={s.finLabel}>INVESTIMENTO</Text>
                          <Text style={[s.finValue, { color: '#00E5FF' }]}>R$ {(financialSummary.totalInvestimento / 1000000).toFixed(1)}M</Text>
                        </View>
                        <View style={[s.finCard, { borderColor: '#00FF8830', backgroundColor: '#00FF8808' }]}>
                          <Text style={s.finLabel}>ECONOMIA</Text>
                          <Text style={[s.finValue, { color: '#00FF88' }]}>R$ {(financialSummary.totalEconomia / 1000000).toFixed(1)}M</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#1A3A2A', paddingTop: 8 }}>
                      <Text style={{ color: '#00E5FF', fontFamily: MONO, fontWeight: '800', fontSize: 9, textAlign: 'center', marginBottom: 4 }}>INVESTIR R$ {(financialSummary.totalInvestimento / 1000000).toFixed(1)}M → EVITAR R$ {(financialSummary.totalExposicaoAlta / 1000000).toFixed(1)}M</Text>
                      <View style={{ height: 5, backgroundColor: '#111820', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.min((financialSummary.totalInvestimento / financialSummary.totalExposicaoAlta) * 100, 100)}%`, backgroundColor: '#00E5FF', borderRadius: 3 }} />
                      </View>
                      <Text style={{ color: '#6B8A7A', fontFamily: MONO, fontSize: 8, textAlign: 'center', marginTop: 3 }}>ROI: {financialSummary.roiMedio.toFixed(0)}% | {financialSummary.riscosComDados} riscos</Text>
                    </View>
                  </GlowCard>
                </Animated.View>
              )}

              {/* Resumo Executivo */}
              <Animated.View entering={FadeInRight.duration(500).delay(400)} style={{ marginTop: 6 }}>
                <GlowCard variant="default">
                  <Text style={[s.cardTitle, { color: '#00E5FF', fontFamily: MONO, marginBottom: 10 }]}>RESUMO EXECUTIVO</Text>
                  <View style={s.quickStatsGrid}>
                    {[
                      { label: 'Estratégicos', value: `${risks.filter(r => r.estrategico === 'SIM').length}/${risks.length}`, color: '#00E5FF', onPress: () => { const e = risks.filter(r => r.estrategico === 'SIM'); if (e.length) setActiveFilter({ title: `Estratégicos (${e.length})`, risks: e }); } },
                      { label: 'GUT Médio', value: `${Math.round(risks.reduce((s, r) => s + r.gutScore, 0) / (risks.length || 1))}`, color: '#FFD600' },
                      { label: 'P×I Médio', value: `${(risks.reduce((s, r) => s + r.riscoInerente, 0) / (risks.length || 1)).toFixed(1)}`, color: '#FF8C00' },
                      { label: 'Tratamento', value: `${risks.filter(r => r.tratamento).length}/${risks.length}`, color: '#00FF88', onPress: () => { const t = risks.filter(r => r.tratamento && r.tratamento !== ''); if (t.length) setActiveFilter({ title: `Em Tratamento (${t.length})`, risks: t }); } },
                    ].map(item => (
                      <TouchableOpacity key={item.label} style={s.quickStatItem} onPress={item.onPress} activeOpacity={item.onPress ? 0.7 : 1}>
                        <Text style={[s.quickStatValue, { color: item.color, fontFamily: MONO }]}>{item.value}</Text>
                        <Text style={[s.quickStatLabel, { color: '#6B8A7A', fontFamily: MONO }]}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </GlowCard>
              </Animated.View>
            </View>

            {/* Right Column: Top 10 */}
            <View style={[s.column, isDesktop && { flex: 1 }]}>
              <Animated.View entering={FadeInRight.duration(500).delay(300)}>
                <GlowCard variant="default">
                  <View style={s.cardHeader}>
                    <Text style={[s.cardTitle, { color: '#00E5FF', fontFamily: MONO }]}>TOP 10 RISCOS — GUT</Text>
                    <TouchableOpacity onPress={() => router.push('/risks' as any)} activeOpacity={0.7}>
                      <Text style={[s.seeAll, { color: '#00E5FF', fontFamily: MONO }]}>VER TODOS →</Text>
                    </TouchableOpacity>
                  </View>
                  {topRisks.map((risk, idx) => {
                    const level = getRiskLevel(risk.riscoInerente);
                    const gutLevel = getGutLevel(risk.gutScore);
                    const badgeLevel = risk.riscoInerente >= 20 ? 'critical' : risk.riscoInerente >= 12 ? 'high' : risk.riscoInerente >= 6 ? 'medium' : 'low';
                    return (
                      <TouchableOpacity
                        key={risk.id}
                        style={[s.riskItem, idx < topRisks.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#1A3A2A' }]}
                        onPress={() => router.push(`/risk/${risk.id}` as any)}
                        activeOpacity={0.6}
                      >
                        <View style={s.riskItemHeader}>
                          <View style={s.riskItemLeft}>
                            <View style={[s.rankBadge, { backgroundColor: idx < 3 ? level.color + '20' : '#111820', borderColor: idx < 3 ? level.color + '40' : '#1A3A2A' }]}>
                              <Text style={[s.rankText, { color: idx < 3 ? level.color : '#6B8A7A', fontFamily: MONO }]}>#{idx + 1}</Text>
                            </View>
                            <View>
                              <Text style={[s.riskId, { color: '#00E5FF', fontFamily: MONO }]}>{risk.id}</Text>
                              <Text style={s.riskType}>{risk.tipoRisco.replace('Risco ', '')}</Text>
                            </View>
                          </View>
                          <View style={s.riskItemRight}>
                            <PulsingBadge level={badgeLevel as any} size="sm" pulsing={false} />
                            <View style={[s.scorePill, { backgroundColor: gutLevel.color + '15', borderColor: gutLevel.color + '30' }]}>
                              <Text style={[s.scoreText, { color: gutLevel.color }]}>GUT {risk.gutScore}</Text>
                            </View>
                          </View>
                        </View>
                        <Text style={s.riskDesc} numberOfLines={2}>{risk.descricaoRisco}</Text>
                        <View style={s.riskMeta}>
                          <Text style={s.riskMetaText}>{risk.tratamento}</Text>
                          <Text style={s.riskMetaText}>{risk.responsavel}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </GlowCard>
              </Animated.View>
            </View>
          </View>
        </View>
      </ScrollView>
      {renderRiskModal()}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 4 },
  header: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerDesktop: { paddingHorizontal: 14, paddingTop: 8 },
  headerLeft: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  pageSubtitle: { fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#00E5FF20', borderWidth: 1, borderColor: '#00E5FF40' },
  addButtonText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#00E5FF', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  section: { paddingHorizontal: 10 },
  sectionDesktop: { paddingHorizontal: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statsGridDesktop: { flexWrap: 'nowrap' },
  statCardInner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  tapHint: { fontSize: 8, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  contentGrid: { gap: 8 },
  contentGridDesktop: { flexDirection: 'row' },
  column: { gap: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cardBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  cardBadgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  seeAll: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  barRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 4, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: '#1A3A2A' },
  barLabel: { fontSize: 9, fontWeight: '500', width: 120 },
  barTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: 13, fontWeight: '800', width: 22, textAlign: 'right' },
  riskItem: { paddingVertical: 6 },
  riskItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 },
  riskItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskItemRight: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  rankBadge: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  rankText: { fontSize: 10, fontWeight: '700' },
  riskId: { fontSize: 13, fontWeight: '700' },
  riskType: { fontSize: 10, marginTop: 1, color: '#6B8A7A' },
  scorePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  scoreText: { fontSize: 9, fontWeight: '700', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  riskDesc: { fontSize: 11, lineHeight: 15, marginBottom: 3, color: '#E0F0E0' },
  riskMeta: { flexDirection: 'row', gap: 12 },
  riskMetaText: { fontSize: 9, color: '#6B8A7A', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  quickStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickStatItem: { flex: 1, minWidth: '40%' as any, borderWidth: 1, borderColor: '#1A3A2A', backgroundColor: '#111820', borderRadius: 6, padding: 6, alignItems: 'center' },
  quickStatValue: { fontSize: 14, fontWeight: '800' },
  quickStatLabel: { fontSize: 8, marginTop: 1, textAlign: 'center', letterSpacing: 0.5 },
  finCard: { flex: 1, borderWidth: 1, borderRadius: 6, padding: 6, alignItems: 'center' },
  finLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', marginBottom: 2, color: '#6B8A7A', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  finValue: { fontSize: 13, fontWeight: '800', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { borderRadius: 12, borderWidth: 1, borderColor: '#1A3A2A', backgroundColor: '#0A0E14', width: '100%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A3A2A', gap: 10 },
  modalTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: '#00E5FF', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  modalSubtitle: { fontSize: 10, marginTop: 2, color: '#6B8A7A' },
  closeBtn: { width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111820', borderWidth: 1, borderColor: '#1A3A2A' },
  closeBtnText: { fontSize: 16, fontWeight: '600', color: '#FF3D3D' },
  modalRiskCard: { borderRadius: 10, borderWidth: 1, borderColor: '#1A3A2A', backgroundColor: '#111820', padding: 12, marginBottom: 8 },
  modalRiskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 },
  modalRiskLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalRiskIdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#00E5FF15' },
  modalRiskId: { fontSize: 12, fontWeight: '800', color: '#00E5FF', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  modalRiskType: { fontSize: 10, color: '#6B8A7A' },
  modalRiskBadges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  modalRiskDesc: { fontSize: 12, lineHeight: 17, marginBottom: 6, color: '#E0F0E0' },
  modalRiskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalRiskMeta: { fontSize: 9, flex: 1, color: '#6B8A7A', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
});
