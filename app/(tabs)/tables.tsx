import { ScrollView, Text, View, StyleSheet, useWindowDimensions, TouchableOpacity, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { GlowCard } from "@/components/ui/glow-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TABELA_IMPACTO_DETALHADA, NIVEIS_PROBABILIDADE, TABELA_GUT, getMatrixColor } from "@/lib/models";
import { useState, useEffect} from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useWizard } from "@/components/wizard-overlay";

type TabKey = 'matrix' | 'impacto' | 'probabilidade' | 'gut';

const MONO = Platform.OS === 'web' ? 'monospace' : undefined;

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

function getLevelColor(nivel: number): string {
  switch (nivel) {
    case 5: return '#FF3D3D';
    case 4: return '#FF8C00';
    case 3: return '#FFD600';
    case 2: return '#00FF88';
    case 1: return '#00E5FF';
    default: return '#6B8A7A';
  }
}

export default function TablesScreen() {

  const { triggerWizard } = useWizard();
  useEffect(() => { triggerWizard('tables'); }, []);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [activeTab, setActiveTab] = useState<TabKey>('matrix');
  const [selectedCell, setSelectedCell] = useState<{ prob: number; imp: number } | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  const tabs: { key: TabKey; label: string; icon: any; desc: string }[] = [
    { key: 'matrix', label: 'Matriz 5×5', icon: 'square.grid.2x2.fill', desc: 'Probabilidade × Impacto' },
    { key: 'impacto', label: 'Impacto', icon: 'exclamationmark.triangle.fill', desc: '6 dimensões de impacto' },
    { key: 'probabilidade', label: 'Probabilidade', icon: 'chart.bar.fill', desc: '5 níveis de probabilidade' },
    { key: 'gut', label: 'GUT', icon: 'gauge.medium', desc: 'Gravidade × Urgência × Tendência' },
  ];

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      <ScrollView contentContainerStyle={[s.scrollContent, isDesktop && s.scrollContentDesktop]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={s.pageTitle}>Tabelas de Referência</Text>
            <StatusIndicator status="monitoring" label="ICAPT v5" />
          </View>
          <Text style={s.pageSubtitle}>Critérios para avaliação e priorização de riscos — ISO 31000 | ISO 27001</Text>
        </Animated.View>

        {/* Tab Selector */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View style={s.tabBar}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, activeTab === tab.key && s.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <IconSymbol name={tab.icon} size={16} color={activeTab === tab.key ? NEON.cyan : NEON.muted} />
                <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Active Tab Description */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={s.tabDescContainer}>
          <Text style={s.tabDesc}>{tabs.find(t => t.key === activeTab)?.desc}</Text>
        </Animated.View>

        {/* Content */}
        {activeTab === 'matrix' && <MatrixTab isDesktop={isDesktop} selectedCell={selectedCell} setSelectedCell={setSelectedCell} />}
        {activeTab === 'impacto' && <ImpactoTab isDesktop={isDesktop} expandedLevel={expandedLevel} setExpandedLevel={setExpandedLevel} />}
        {activeTab === 'probabilidade' && <ProbabilidadeTab isDesktop={isDesktop} />}
        {activeTab === 'gut' && <GutTab isDesktop={isDesktop} expandedLevel={expandedLevel} setExpandedLevel={setExpandedLevel} />}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function MatrixTab({ isDesktop, selectedCell, setSelectedCell }: { isDesktop: boolean; selectedCell: { prob: number; imp: number } | null; setSelectedCell: (c: { prob: number; imp: number } | null) => void }) {
  const score = selectedCell ? selectedCell.prob * selectedCell.imp : null;
  const scoreLevel = score !== null ? (score >= 20 ? 'Crítico' : score >= 12 ? 'Alto' : score >= 6 ? 'Médio' : 'Baixo') : '';
  const scoreColor = score !== null ? (score >= 20 ? '#FF3D3D' : score >= 12 ? '#FF8C00' : score >= 6 ? '#FFD600' : '#00FF88') : '#6B8A7A';

  return (
    <View style={s.section}>
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <GlowCard variant="default">
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>MATRIZ DE RISCO (P × I)</Text>
            <StatusIndicator status="active" label="5×5" />
          </View>
          <Text style={s.cardDesc}>
            Clique em qualquer célula para ver o detalhamento do score. O resultado (P×I) define o nível de risco inerente de 1 a 25.
          </Text>

          {/* Interactive Matrix */}
          <View style={[s.matrixWrapper, isDesktop && { maxWidth: 500, alignSelf: 'center' as any }]}>
            <View style={s.matrixYAxis}>
              <Text style={[s.axisTitle, { transform: [{ rotate: '-90deg' }] }]}>Probabilidade</Text>
            </View>
            <View style={s.matrixContent}>
              {[5, 4, 3, 2, 1].map(prob => (
                <View key={prob} style={s.matrixRow}>
                  <View style={s.matrixRowLabel}>
                    <Text style={s.matrixLabelText}>{prob}</Text>
                  </View>
                  {[1, 2, 3, 4, 5].map(imp => {
                    const cellScore = prob * imp;
                    const bgColor = getMatrixColor(prob, imp);
                    const isSelected = selectedCell?.prob === prob && selectedCell?.imp === imp;
                    return (
                      <TouchableOpacity
                        key={imp}
                        style={[
                          s.matrixCell,
                          {
                            backgroundColor: bgColor + (isSelected ? '50' : '20'),
                            borderColor: isSelected ? bgColor : bgColor + '40',
                            borderWidth: isSelected ? 2.5 : 1,
                          },
                          isSelected && Platform.OS === 'web' && {
                            shadowColor: bgColor,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 12,
                          },
                        ]}
                        onPress={() => setSelectedCell(isSelected ? null : { prob, imp })}
                        activeOpacity={0.6}
                      >
                        <Text style={[s.matrixCellText, { color: bgColor }]}>{cellScore}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View style={s.matrixRow}>
                <View style={s.matrixRowLabel} />
                {[1, 2, 3, 4, 5].map(n => (
                  <View key={n} style={[s.matrixCell, { borderWidth: 0, backgroundColor: 'transparent' }]}>
                    <Text style={s.matrixLabelText}>{n}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.xAxisTitle}>Impacto</Text>
            </View>
          </View>

          {/* Selected Cell Detail */}
          {selectedCell && score !== null && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View style={[s.cellDetail, { borderColor: scoreColor + '40' }]}>
                <View style={s.cellDetailHeader}>
                  <View style={[s.cellDetailBadge, { backgroundColor: scoreColor + '20', borderColor: scoreColor + '40' }]}>
                    <Text style={[s.cellDetailBadgeText, { color: scoreColor }]}>{scoreLevel}</Text>
                  </View>
                  <Text style={s.cellDetailScore}>Score: <Text style={{ color: scoreColor }}>{score}</Text></Text>
                </View>
                <View style={s.cellDetailGrid}>
                  <View style={s.cellDetailItem}>
                    <Text style={s.cellDetailLabel}>PROBABILIDADE</Text>
                    <Text style={[s.cellDetailValue, { color: NEON.cyan }]}>{selectedCell.prob}</Text>
                    <Text style={s.cellDetailDesc}>{getProbLabel(selectedCell.prob)}</Text>
                  </View>
                  <Text style={s.cellDetailOperator}>×</Text>
                  <View style={s.cellDetailItem}>
                    <Text style={s.cellDetailLabel}>IMPACTO</Text>
                    <Text style={[s.cellDetailValue, { color: NEON.cyan }]}>{selectedCell.imp}</Text>
                    <Text style={s.cellDetailDesc}>{getImpLabel(selectedCell.imp)}</Text>
                  </View>
                  <Text style={s.cellDetailOperator}>=</Text>
                  <View style={s.cellDetailItem}>
                    <Text style={s.cellDetailLabel}>RISCO INERENTE</Text>
                    <Text style={[s.cellDetailValue, { color: scoreColor }]}>{score}</Text>
                    <Text style={[s.cellDetailDesc, { color: scoreColor }]}>{scoreLevel}</Text>
                  </View>
                </View>
                <Text style={s.cellDetailAction}>
                  {score >= 20 ? '⚠ Ação urgente: escalar ao Board imediatamente' :
                   score >= 12 ? '⚡ Prioridade alta: implementar controles em até 30 dias' :
                   score >= 6 ? '📋 Atenção: monitorar e definir plano de ação' :
                   '✓ Risco aceitável: monitoramento regular'}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Legend */}
          <View style={s.legendGrid}>
            {[
              { range: '1 – 5', label: 'Baixo', color: '#00FF88', desc: 'Risco aceitável, monitoramento regular' },
              { range: '6 – 11', label: 'Médio', color: '#FFD600', desc: 'Requer atenção e plano de ação' },
              { range: '12 – 19', label: 'Alto', color: '#FF8C00', desc: 'Prioridade alta, ação imediata necessária' },
              { range: '20 – 25', label: 'Crítico', color: '#FF3D3D', desc: 'Risco inaceitável, ação urgente' },
            ].map(item => (
              <View key={item.label} style={[s.legendCard, { borderColor: item.color + '30' }]}>
                <View style={[s.legendColorBar, { backgroundColor: item.color }]} />
                <View style={s.legendCardContent}>
                  <Text style={[s.legendRange, { color: item.color }]}>{item.range}</Text>
                  <Text style={[s.legendLabel, { color: NEON.text }]}>{item.label}</Text>
                  <Text style={s.legendDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </GlowCard>
      </Animated.View>
    </View>
  );
}

function ImpactoTab({ isDesktop, expandedLevel, setExpandedLevel }: { isDesktop: boolean; expandedLevel: number | null; setExpandedLevel: (n: number | null) => void }) {
  const dimensions = ['financeiro', 'reputacao', 'operacional', 'legal', 'ambiental', 'social'] as const;
  const dimLabels: Record<string, string> = {
    financeiro: 'Financeiro',
    reputacao: 'Reputação',
    operacional: 'Operacional',
    legal: 'Legal',
    ambiental: 'Ambiental',
    social: 'Social',
  };
  const dimIcons: Record<string, string> = {
    financeiro: '💰',
    reputacao: '📢',
    operacional: '⚙️',
    legal: '⚖️',
    ambiental: '🌍',
    social: '👥',
  };

  return (
    <View style={s.section}>
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <GlowCard variant="default">
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>TABELA DE IMPACTO</Text>
            <StatusIndicator status="monitoring" label="6 DIMENSÕES" />
          </View>
          <Text style={s.cardDesc}>
            Clique em cada nível para expandir os critérios de avaliação em 6 dimensões: financeiro, reputação, operacional, legal, ambiental e social.
          </Text>

          {TABELA_IMPACTO_DETALHADA.map((item) => {
            const isExpanded = expandedLevel === item.nivel;
            const color = getLevelColor(item.nivel);
            return (
              <TouchableOpacity
                key={item.nivel}
                style={[s.impactCard, { borderColor: isExpanded ? color + '60' : NEON.cardBorder, backgroundColor: isExpanded ? color + '08' : NEON.card }]}
                onPress={() => setExpandedLevel(isExpanded ? null : item.nivel)}
                activeOpacity={0.7}
              >
                <View style={s.impactCardHeader}>
                  <View style={[s.impactLevelBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                    <Text style={[s.impactLevelText, { color }]}>{item.nivel}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.impactTitle, { color: NEON.text }]}>{item.rotulo}</Text>
                    <Text style={[s.impactHint, { color: NEON.muted }]}>
                      {isExpanded ? 'Clique para recolher' : 'Clique para expandir detalhes'}
                    </Text>
                  </View>
                  <View style={[s.impactBarMini, { backgroundColor: NEON.cardBorder }]}>
                    <View style={[s.impactBarMiniFill, { width: `${(item.nivel / 5) * 100}%`, backgroundColor: color }]} />
                  </View>
                  <IconSymbol name={isExpanded ? 'chevron.down' : 'chevron.right'} size={16} color={NEON.muted} />
                </View>

                {isExpanded && (
                  <Animated.View entering={FadeInDown.duration(300)} style={s.impactDetails}>
                    {dimensions.map(dim => (
                      <View key={dim} style={[s.impactDetailRow, { borderColor: NEON.cardBorder }]}>
                        <View style={s.impactDetailLabel}>
                          <Text style={s.impactDetailIcon}>{dimIcons[dim]}</Text>
                          <Text style={[s.impactDetailLabelText, { color: NEON.cyan }]}>{dimLabels[dim]}</Text>
                        </View>
                        <Text style={[s.impactDetailValue, { color: NEON.text }]}>{(item as any)[dim]}</Text>
                      </View>
                    ))}
                  </Animated.View>
                )}
              </TouchableOpacity>
            );
          })}
        </GlowCard>
      </Animated.View>
    </View>
  );
}

function ProbabilidadeTab({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View style={s.section}>
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <GlowCard variant="default">
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>NÍVEIS DE PROBABILIDADE</Text>
            <StatusIndicator status="monitoring" label="5 NÍVEIS" />
          </View>
          <Text style={s.cardDesc}>
            A probabilidade classifica a chance de ocorrência de um risco em 5 níveis, de "Raro" (1) a "Quase Certo" (5).
          </Text>

          {NIVEIS_PROBABILIDADE.map((item, idx) => {
            const color = getLevelColor(item.nivel);
            const pct = (item.nivel / 5) * 100;
            return (
              <Animated.View key={item.nivel} entering={FadeInDown.duration(400).delay(200 + idx * 80)}>
                <View style={[s.probCard, { borderColor: NEON.cardBorder }]}>
                  <View style={s.probCardHeader}>
                    <View style={[s.probLevelBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                      <Text style={[s.probLevelText, { color }]}>{item.nivel}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.probTitle, { color: NEON.text }]}>{item.rotulo}</Text>
                      <Text style={[s.probDesc, { color: NEON.muted }]}>{item.descricao}</Text>
                    </View>
                  </View>
                  <View style={s.probBarContainer}>
                    <View style={[s.probBarTrack, { backgroundColor: NEON.cardBorder }]}>
                      <View style={[s.probBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[s.probBarPct, { color }]}>{pct}%</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}

          {/* Formula Explanation */}
          <View style={s.formulaCard}>
            <Text style={s.formulaTitle}>COMO CALCULAR O RISCO INERENTE</Text>
            <View style={s.formulaRow}>
              <View style={s.formulaBox}>
                <Text style={[s.formulaBoxLabel, { color: NEON.cyan }]}>P</Text>
                <Text style={s.formulaBoxDesc}>Probabilidade</Text>
                <Text style={s.formulaBoxRange}>1 – 5</Text>
              </View>
              <Text style={s.formulaOperator}>×</Text>
              <View style={s.formulaBox}>
                <Text style={[s.formulaBoxLabel, { color: NEON.cyan }]}>I</Text>
                <Text style={s.formulaBoxDesc}>Impacto</Text>
                <Text style={s.formulaBoxRange}>1 – 5</Text>
              </View>
              <Text style={s.formulaOperator}>=</Text>
              <View style={s.formulaBox}>
                <Text style={[s.formulaBoxLabel, { color: NEON.green }]}>RI</Text>
                <Text style={s.formulaBoxDesc}>Risco Inerente</Text>
                <Text style={s.formulaBoxRange}>1 – 25</Text>
              </View>
            </View>
          </View>
        </GlowCard>
      </Animated.View>
    </View>
  );
}

function GutTab({ isDesktop, expandedLevel, setExpandedLevel }: { isDesktop: boolean; expandedLevel: number | null; setExpandedLevel: (n: number | null) => void }) {
  return (
    <View style={s.section}>
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <GlowCard variant="default">
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>MATRIZ GUT</Text>
            <StatusIndicator status="monitoring" label="G×U×T" />
          </View>
          <Text style={s.cardDesc}>
            A matriz GUT (Gravidade × Urgência × Tendência) prioriza riscos pelo produto dos três fatores. Score máximo: 125. Clique em cada nível para ver os critérios.
          </Text>

          {TABELA_GUT.map((item) => {
            const isExpanded = expandedLevel === item.nivel;
            const color = getLevelColor(item.nivel);
            const gutScore = item.nivel * item.nivel * item.nivel;
            return (
              <TouchableOpacity
                key={item.nivel}
                style={[s.gutCard, { borderColor: isExpanded ? color + '60' : NEON.cardBorder, backgroundColor: isExpanded ? color + '08' : NEON.card }]}
                onPress={() => setExpandedLevel(isExpanded ? null : item.nivel)}
                activeOpacity={0.7}
              >
                <View style={s.gutCardHeader}>
                  <View style={[s.gutLevelBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                    <Text style={[s.gutLevelText, { color }]}>{item.nivel}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.gutTitle, { color: NEON.text }]}>Nível {item.nivel}</Text>
                    <Text style={[s.gutHint, { color: NEON.muted }]}>
                      Score máximo: {gutScore} ({item.nivel}×{item.nivel}×{item.nivel})
                    </Text>
                  </View>
                  <View style={[s.gutScoreBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                    <Text style={[s.gutScoreText, { color }]}>{gutScore}</Text>
                  </View>
                  <IconSymbol name={isExpanded ? 'chevron.down' : 'chevron.right'} size={16} color={NEON.muted} />
                </View>

                {isExpanded && (
                  <Animated.View entering={FadeInDown.duration(300)} style={s.gutDetails}>
                    <View style={[s.gutDetailRow, { borderColor: NEON.cardBorder }]}>
                      <View style={s.gutDetailLabel}>
                        <Text style={s.gutDetailIcon}>🔴</Text>
                        <Text style={[s.gutDetailLabelText, { color: '#FF3D3D' }]}>Gravidade (G)</Text>
                      </View>
                      <Text style={[s.gutDetailValue, { color: NEON.text }]}>{item.gravidade}</Text>
                    </View>
                    <View style={[s.gutDetailRow, { borderColor: NEON.cardBorder }]}>
                      <View style={s.gutDetailLabel}>
                        <Text style={s.gutDetailIcon}>⏰</Text>
                        <Text style={[s.gutDetailLabelText, { color: '#FFD600' }]}>Urgência (U)</Text>
                      </View>
                      <Text style={[s.gutDetailValue, { color: NEON.text }]}>{item.urgencia}</Text>
                    </View>
                    <View style={[s.gutDetailRow, { borderColor: NEON.cardBorder, borderBottomWidth: 0 }]}>
                      <View style={s.gutDetailLabel}>
                        <Text style={s.gutDetailIcon}>📈</Text>
                        <Text style={[s.gutDetailLabelText, { color: '#00E5FF' }]}>Tendência (T)</Text>
                      </View>
                      <Text style={[s.gutDetailValue, { color: NEON.text }]}>{item.tendencia}</Text>
                    </View>
                  </Animated.View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* GUT Formula */}
          <View style={s.formulaCard}>
            <Text style={s.formulaTitle}>FÓRMULA GUT</Text>
            <View style={s.formulaRow}>
              <View style={s.formulaBox}>
                <Text style={[s.formulaBoxLabel, { color: '#FF3D3D' }]}>G</Text>
                <Text style={s.formulaBoxDesc}>Gravidade</Text>
                <Text style={s.formulaBoxRange}>1 – 5</Text>
              </View>
              <Text style={s.formulaOperator}>×</Text>
              <View style={s.formulaBox}>
                <Text style={[s.formulaBoxLabel, { color: '#FFD600' }]}>U</Text>
                <Text style={s.formulaBoxDesc}>Urgência</Text>
                <Text style={s.formulaBoxRange}>1 – 5</Text>
              </View>
              <Text style={s.formulaOperator}>×</Text>
              <View style={s.formulaBox}>
                <Text style={[s.formulaBoxLabel, { color: '#00E5FF' }]}>T</Text>
                <Text style={s.formulaBoxDesc}>Tendência</Text>
                <Text style={s.formulaBoxRange}>1 – 5</Text>
              </View>
              <Text style={s.formulaOperator}>=</Text>
              <View style={s.formulaBox}>
                <Text style={[s.formulaBoxLabel, { color: NEON.green }]}>GUT</Text>
                <Text style={s.formulaBoxDesc}>Score</Text>
                <Text style={s.formulaBoxRange}>1 – 125</Text>
              </View>
            </View>
          </View>
        </GlowCard>
      </Animated.View>
    </View>
  );
}

function getProbLabel(n: number): string {
  switch (n) {
    case 1: return 'Raro';
    case 2: return 'Improvável';
    case 3: return 'Possível';
    case 4: return 'Provável';
    case 5: return 'Quase Certo';
    default: return '';
  }
}

function getImpLabel(n: number): string {
  switch (n) {
    case 1: return 'Insignificante';
    case 2: return 'Baixo';
    case 3: return 'Moderado';
    case 4: return 'Significativo';
    case 5: return 'Catastrófico';
    default: return '';
  }
}

const s = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  scrollContentDesktop: { maxWidth: 1280, alignSelf: 'center' as any, width: '100%' as any },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: 1, color: '#E0F0E0', fontFamily: MONO },
  pageSubtitle: { fontSize: 12, marginTop: 4, letterSpacing: 0.5, color: '#6B8A7A', fontFamily: MONO },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#1A3A2A', padding: 4, gap: 4, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabActive: { backgroundColor: '#00E5FF15' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B8A7A', fontFamily: MONO },
  tabTextActive: { color: '#00E5FF' },
  tabDescContainer: { paddingHorizontal: 24, marginBottom: 8 },
  tabDesc: { fontSize: 11, color: '#6B8A7A', fontFamily: MONO, letterSpacing: 0.5 },

  section: { paddingHorizontal: 24, gap: 16 },

  // Card
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1, color: '#00E5FF', fontFamily: MONO },
  cardDesc: { fontSize: 12, lineHeight: 18, color: '#6B8A7A', marginBottom: 16 },

  // Matrix
  matrixWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  matrixYAxis: { width: 24, alignItems: 'center', justifyContent: 'center' },
  axisTitle: { fontSize: 10, fontWeight: '700', color: '#6B8A7A', fontFamily: MONO, width: 90 },
  matrixContent: { flex: 1 },
  matrixRow: { flexDirection: 'row', marginBottom: 4 },
  matrixRowLabel: { width: 28, justifyContent: 'center', alignItems: 'center' },
  matrixLabelText: { fontSize: 13, fontWeight: '600', color: '#6B8A7A', fontFamily: MONO },
  matrixCell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginHorizontal: 2 },
  matrixCellText: { fontSize: 16, fontWeight: '800', fontFamily: MONO },
  xAxisTitle: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 6, marginLeft: 28, color: '#6B8A7A', fontFamily: MONO },

  // Cell Detail
  cellDetail: { borderRadius: 12, borderWidth: 1, backgroundColor: '#111820', padding: 16, marginBottom: 16 },
  cellDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cellDetailBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  cellDetailBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: MONO },
  cellDetailScore: { fontSize: 14, fontWeight: '700', color: '#E0F0E0', fontFamily: MONO },
  cellDetailGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  cellDetailItem: { alignItems: 'center', flex: 1 },
  cellDetailLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: '#6B8A7A', fontFamily: MONO },
  cellDetailValue: { fontSize: 28, fontWeight: '800', fontFamily: MONO, marginVertical: 4 },
  cellDetailDesc: { fontSize: 10, color: '#6B8A7A', fontFamily: MONO },
  cellDetailOperator: { fontSize: 20, fontWeight: '700', color: '#6B8A7A', fontFamily: MONO },
  cellDetailAction: { fontSize: 11, color: '#E0F0E0', marginTop: 12, textAlign: 'center', fontFamily: MONO, lineHeight: 16 },

  // Legend
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  legendCard: { flex: 1, minWidth: 160, borderWidth: 1, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#111820' },
  legendColorBar: { width: 4 },
  legendCardContent: { padding: 10, flex: 1 },
  legendRange: { fontSize: 12, fontWeight: '700', fontFamily: MONO },
  legendLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  legendDesc: { fontSize: 10, marginTop: 4, lineHeight: 14, color: '#6B8A7A' },

  // Impact Cards
  impactCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8, backgroundColor: '#0D1117' },
  impactCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  impactLevelBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  impactLevelText: { fontSize: 18, fontWeight: '800', fontFamily: MONO },
  impactTitle: { fontSize: 14, fontWeight: '700' },
  impactHint: { fontSize: 10, marginTop: 2, fontFamily: MONO },
  impactBarMini: { width: 60, height: 4, borderRadius: 2, marginRight: 8 },
  impactBarMiniFill: { height: 4, borderRadius: 2 },
  impactDetails: { marginTop: 12, gap: 0 },
  impactDetailRow: { paddingVertical: 10, borderBottomWidth: 1 },
  impactDetailLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  impactDetailIcon: { fontSize: 14 },
  impactDetailLabelText: { fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  impactDetailValue: { fontSize: 12, lineHeight: 17, paddingLeft: 26 },

  // Probability Cards
  probCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8, backgroundColor: '#0D1117' },
  probCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  probLevelBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  probLevelText: { fontSize: 18, fontWeight: '800', fontFamily: MONO },
  probTitle: { fontSize: 14, fontWeight: '700' },
  probDesc: { fontSize: 12, marginTop: 2, lineHeight: 17, color: '#6B8A7A' },
  probBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  probBarTrack: { flex: 1, height: 6, borderRadius: 3 },
  probBarFill: { height: 6, borderRadius: 3 },
  probBarPct: { fontSize: 12, fontWeight: '700', fontFamily: MONO, width: 40, textAlign: 'right' },

  // GUT Cards
  gutCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8, backgroundColor: '#0D1117' },
  gutCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gutLevelBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  gutLevelText: { fontSize: 18, fontWeight: '800', fontFamily: MONO },
  gutTitle: { fontSize: 14, fontWeight: '700' },
  gutHint: { fontSize: 10, marginTop: 2, fontFamily: MONO, color: '#6B8A7A' },
  gutScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, marginRight: 4 },
  gutScoreText: { fontSize: 14, fontWeight: '800', fontFamily: MONO },
  gutDetails: { marginTop: 12, gap: 0 },
  gutDetailRow: { paddingVertical: 10, borderBottomWidth: 1 },
  gutDetailLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  gutDetailIcon: { fontSize: 14 },
  gutDetailLabelText: { fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  gutDetailValue: { fontSize: 12, lineHeight: 17, paddingLeft: 26 },

  // Formula
  formulaCard: { marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1A3A2A', backgroundColor: '#111820' },
  formulaTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#00E5FF', fontFamily: MONO, textAlign: 'center', marginBottom: 16 },
  formulaRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  formulaBox: { alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#1A3A2A', backgroundColor: '#0D1117', minWidth: 60 },
  formulaBoxLabel: { fontSize: 20, fontWeight: '800', fontFamily: MONO },
  formulaBoxDesc: { fontSize: 8, color: '#6B8A7A', fontFamily: MONO, marginTop: 2 },
  formulaBoxRange: { fontSize: 9, color: '#6B8A7A', fontFamily: MONO, marginTop: 1 },
  formulaOperator: { fontSize: 18, fontWeight: '700', color: '#6B8A7A', fontFamily: MONO },
});
