import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { RISKS_AULA3, RISKS_AULA4, EVOLUTION_SUMMARY } from "@/lib/evolution-data";
import { getRiskLevel, Risk } from "@/lib/models";

type ViewMode = 'summary' | 'comparison' | 'matrix';

function normalizeId(id: string) {
  return id.replace(/\s/g, '').toUpperCase();
}

// Build maps
const a3Map = new Map(RISKS_AULA3.map(r => [normalizeId(r.id), r]));
const a4Map = new Map(RISKS_AULA4.map(r => [normalizeId(r.id), r]));

export default function EvolutionScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

  const newRisks = EVOLUTION_SUMMARY.filter(e => e.type === 'new');
  const modifiedRisks = EVOLUTION_SUMMARY.filter(e => e.type === 'modified');
  const unchangedRisks = EVOLUTION_SUMMARY.filter(e => e.type === 'unchanged');

  const renderViewToggle = () => (
    <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {([
        { key: 'summary', label: 'Resumo', icon: 'info.circle.fill' as const },
        { key: 'comparison', label: 'Comparativo', icon: 'chart.line.uptrend.xyaxis' as const },
        { key: 'matrix', label: 'Matrizes', icon: 'tablecells' as const },
      ] as const).map(item => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.toggleBtn,
            viewMode === item.key && { backgroundColor: colors.primary + '18' },
          ]}
          onPress={() => setViewMode(item.key)}
          activeOpacity={0.7}
        >
          <IconSymbol name={item.icon} size={16} color={viewMode === item.key ? colors.primary : colors.muted} />
          <Text style={[styles.toggleLabel, { color: viewMode === item.key ? colors.primary : colors.muted }]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryView = () => (
    <View style={styles.section}>
      {/* Stats cards */}
      <View style={[styles.statsRow, isDesktop && styles.statsRowDesktop]}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
            <IconSymbol name="list.bullet" size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>{RISKS_AULA3.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Riscos Aula 3</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: '#8B5CF620' }]}>
            <IconSymbol name="list.bullet" size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.statNumber, { color: colors.foreground }]}>{RISKS_AULA4.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Riscos Aula 4</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
            <IconSymbol name="plus.circle.fill" size={20} color="#10B981" />
          </View>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{newRisks.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Novos</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
            <IconSymbol name="pencil" size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{modifiedRisks.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Revisados</Text>
        </View>
      </View>

      {/* New Risks */}
      {newRisks.length > 0 && (
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
              <Text style={[styles.badgeText, { color: '#10B981' }]}>NOVOS</Text>
            </View>
            <Text style={[styles.groupTitle, { color: colors.foreground }]}>
              Riscos adicionados na Aula 4
            </Text>
          </View>
          {newRisks.map(ev => {
            const risk = a4Map.get(ev.riskId);
            if (!risk) return null;
            const level = getRiskLevel(risk.riscoInerente);
            return (
              <View key={ev.riskId} style={[styles.riskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.riskCardHeader}>
                  <View style={[styles.riskIdBadge, { backgroundColor: '#10B98118' }]}>
                    <Text style={[styles.riskIdText, { color: '#10B981' }]}>{risk.id}</Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: level.color + '18' }]}>
                    <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
                  </View>
                  <Text style={[styles.riskScore, { color: colors.muted }]}>P{risk.probabilidade}xI{risk.impacto}={risk.riscoInerente}</Text>
                </View>
                <Text style={[styles.riskTitle, { color: colors.foreground }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
                <Text style={[styles.riskMeta, { color: colors.muted }]}>{risk.fonteDeRisco} | {risk.tipoRisco}</Text>
                <View style={styles.riskDetails}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Ameaca:</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={2}>{risk.ameaca}</Text>
                </View>
                <View style={styles.riskDetails}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Tratamento:</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{risk.tratamento}</Text>
                </View>
                <View style={styles.riskDetails}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>GUT:</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>G={risk.gravidade} U={risk.urgencia} T={risk.tendencia} = {risk.gutScore}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Modified Risks */}
      {modifiedRisks.length > 0 && (
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[styles.badgeText, { color: '#F59E0B' }]}>REVISADOS</Text>
            </View>
            <Text style={[styles.groupTitle, { color: colors.foreground }]}>
              Riscos alterados entre Aula 3 e Aula 4
            </Text>
          </View>
          {modifiedRisks.map(ev => {
            const risk = a4Map.get(ev.riskId);
            if (!risk) return null;
            const level = getRiskLevel(risk.riscoInerente);
            return (
              <View key={ev.riskId} style={[styles.riskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.riskCardHeader}>
                  <View style={[styles.riskIdBadge, { backgroundColor: '#F59E0B18' }]}>
                    <Text style={[styles.riskIdText, { color: '#F59E0B' }]}>{risk.id}</Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: level.color + '18' }]}>
                    <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
                  </View>
                </View>
                <Text style={[styles.riskTitle, { color: colors.foreground }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
                <View style={styles.changesContainer}>
                  <Text style={[styles.changesLabel, { color: colors.muted }]}>Campos alterados:</Text>
                  <View style={styles.changesList}>
                    {ev.changes.map((c, i) => (
                      <View key={i} style={[styles.changeChip, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}>
                        <Text style={[styles.changeChipText, { color: '#F59E0B' }]}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Unchanged Risks */}
      <View style={styles.groupSection}>
        <View style={styles.groupHeader}>
          <View style={[styles.badge, { backgroundColor: '#6B728020' }]}>
            <Text style={[styles.badgeText, { color: '#6B7280' }]}>SEM ALTERACAO</Text>
          </View>
          <Text style={[styles.groupTitle, { color: colors.foreground }]}>
            {unchangedRisks.length} riscos mantidos sem alteracao
          </Text>
        </View>
        <View style={[styles.unchangedGrid, isDesktop && styles.unchangedGridDesktop]}>
          {unchangedRisks.map(ev => {
            const risk = a4Map.get(ev.riskId);
            if (!risk) return null;
            const level = getRiskLevel(risk.riscoInerente);
            return (
              <View key={ev.riskId} style={[styles.unchangedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.unchangedHeader}>
                  <Text style={[styles.unchangedId, { color: colors.foreground }]}>{risk.id}</Text>
                  <View style={[styles.miniLevel, { backgroundColor: level.color + '18' }]}>
                    <Text style={[styles.miniLevelText, { color: level.color }]}>{risk.riscoInerente}</Text>
                  </View>
                </View>
                <Text style={[styles.unchangedDesc, { color: colors.muted }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderComparisonView = () => {
    const allIds = Array.from(new Set([
      ...RISKS_AULA3.map(r => normalizeId(r.id)),
      ...RISKS_AULA4.map(r => normalizeId(r.id)),
    ])).sort();

    return (
      <View style={styles.section}>
        {/* Comparison table header */}
        {isDesktop && (
          <View style={[styles.tableHeader, { backgroundColor: colors.primary + '08', borderColor: colors.border }]}>
            <Text style={[styles.thCell, styles.thId, { color: colors.foreground }]}>ID</Text>
            <Text style={[styles.thCell, styles.thDesc, { color: colors.foreground }]}>Descricao</Text>
            <Text style={[styles.thCell, styles.thVal, { color: colors.foreground }]}>Aula 3 (PxI)</Text>
            <Text style={[styles.thCell, styles.thVal, { color: colors.foreground }]}>Aula 4 (PxI)</Text>
            <Text style={[styles.thCell, styles.thVal, { color: colors.foreground }]}>GUT 3</Text>
            <Text style={[styles.thCell, styles.thVal, { color: colors.foreground }]}>GUT 4</Text>
            <Text style={[styles.thCell, styles.thStatus, { color: colors.foreground }]}>Status</Text>
          </View>
        )}

        {allIds.map(rid => {
          const r3 = a3Map.get(rid);
          const r4 = a4Map.get(rid);
          const ev = EVOLUTION_SUMMARY.find(e => e.riskId === rid);
          const risk = r4 || r3;
          if (!risk) return null;

          const isNew = !r3;
          const isModified = ev?.type === 'modified';
          const statusColor = isNew ? '#10B981' : isModified ? '#F59E0B' : '#6B7280';
          const statusLabel = isNew ? 'Novo' : isModified ? 'Revisado' : 'Igual';

          const level3 = r3 ? getRiskLevel(r3.riscoInerente) : null;
          const level4 = r4 ? getRiskLevel(r4.riscoInerente) : null;

          if (isDesktop) {
            return (
              <View key={rid} style={[styles.tableRow, { borderColor: colors.border }]}>
                <View style={[styles.tdCell, styles.thId]}>
                  <Text style={[styles.tdId, { color: colors.foreground }]}>{rid}</Text>
                </View>
                <View style={[styles.tdCell, styles.thDesc]}>
                  <Text style={[styles.tdDesc, { color: colors.foreground }]} numberOfLines={2}>
                    {risk.descricaoRisco}
                  </Text>
                </View>
                <View style={[styles.tdCell, styles.thVal]}>
                  {r3 ? (
                    <View style={[styles.scoreBox, { backgroundColor: (level3?.color || '#6B7280') + '18' }]}>
                      <Text style={[styles.scoreText, { color: level3?.color }]}>{r3.riscoInerente}</Text>
                      <Text style={[styles.scoreDetail, { color: colors.muted }]}>P{r3.probabilidade}xI{r3.impacto}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.naText, { color: colors.muted }]}>-</Text>
                  )}
                </View>
                <View style={[styles.tdCell, styles.thVal]}>
                  {r4 ? (
                    <View style={[styles.scoreBox, { backgroundColor: (level4?.color || '#6B7280') + '18' }]}>
                      <Text style={[styles.scoreText, { color: level4?.color }]}>{r4.riscoInerente}</Text>
                      <Text style={[styles.scoreDetail, { color: colors.muted }]}>P{r4.probabilidade}xI{r4.impacto}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.naText, { color: colors.muted }]}>-</Text>
                  )}
                </View>
                <View style={[styles.tdCell, styles.thVal]}>
                  <Text style={[styles.gutText, { color: colors.foreground }]}>{r3 ? r3.gutScore : '-'}</Text>
                </View>
                <View style={[styles.tdCell, styles.thVal]}>
                  <Text style={[styles.gutText, { color: colors.foreground }]}>{r4 ? r4.gutScore : '-'}</Text>
                </View>
                <View style={[styles.tdCell, styles.thStatus]}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
              </View>
            );
          }

          // Mobile card
          return (
            <TouchableOpacity
              key={rid}
              style={[styles.compCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setExpandedRisk(expandedRisk === rid ? null : rid)}
              activeOpacity={0.7}
            >
              <View style={styles.compCardHeader}>
                <Text style={[styles.compId, { color: colors.foreground }]}>{rid}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
              <Text style={[styles.compDesc, { color: colors.muted }]} numberOfLines={expandedRisk === rid ? 10 : 2}>
                {risk.descricaoRisco}
              </Text>
              <View style={styles.compScores}>
                <View style={styles.compScoreCol}>
                  <Text style={[styles.compScoreLabel, { color: colors.muted }]}>Aula 3</Text>
                  <Text style={[styles.compScoreVal, { color: level3?.color || colors.muted }]}>
                    {r3 ? `${r3.riscoInerente} (P${r3.probabilidade}xI${r3.impacto})` : '-'}
                  </Text>
                </View>
                <IconSymbol name="arrow.right" size={16} color={colors.muted} />
                <View style={styles.compScoreCol}>
                  <Text style={[styles.compScoreLabel, { color: colors.muted }]}>Aula 4</Text>
                  <Text style={[styles.compScoreVal, { color: level4?.color || colors.muted }]}>
                    {r4 ? `${r4.riscoInerente} (P${r4.probabilidade}xI${r4.impacto})` : '-'}
                  </Text>
                </View>
              </View>
              {expandedRisk === rid && ev && ev.changes.length > 0 && (
                <View style={styles.compChanges}>
                  <Text style={[styles.changesLabel, { color: colors.muted }]}>Alteracoes:</Text>
                  {ev.changes.map((c, i) => (
                    <Text key={i} style={[styles.changeItem, { color: '#F59E0B' }]}>  {c}</Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMatrixView = () => {
    const renderMatrix = (risks: Risk[], label: string, color: string) => {
      // Build 5x5 matrix
      const matrix: string[][][] = Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => [] as string[])
      );
      risks.forEach(r => {
        const row = 5 - r.probabilidade; // row 0 = prob 5
        const col = r.impacto - 1; // col 0 = imp 1
        if (row >= 0 && row < 5 && col >= 0 && col < 5) {
          matrix[row][col].push(normalizeId(r.id));
        }
      });

      const cellSize = isDesktop ? 90 : 56;
      const labelW = isDesktop ? 30 : 20;

      const getCellColor = (prob: number, imp: number) => {
        const score = prob * imp;
        if (score >= 20) return '#EF444430';
        if (score >= 12) return '#F9731630';
        if (score >= 6) return '#F59E0B25';
        if (score >= 2) return '#86EFAC30';
        return '#6EE7B730';
      };

      return (
        <View style={styles.matrixContainer}>
          <View style={styles.matrixHeader}>
            <View style={[styles.matrixBadge, { backgroundColor: color + '18' }]}>
              <Text style={[styles.matrixBadgeText, { color }]}>{label}</Text>
            </View>
            <Text style={[styles.matrixCount, { color: colors.muted }]}>{risks.length} riscos</Text>
          </View>
          <View style={styles.matrixWrapper}>
            {/* Y-axis label */}
            <View style={[styles.yAxisLabel, { width: labelW }]}>
              <Text style={[styles.axisText, { color: colors.muted, transform: [{ rotate: '-90deg' }] }]}>
                Probabilidade
              </Text>
            </View>
            <View>
              {/* Matrix grid */}
              {matrix.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.matrixRow}>
                  {/* Row label */}
                  <View style={[styles.matrixLabel, { width: labelW }]}>
                    <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{5 - rowIdx}</Text>
                  </View>
                  {row.map((cell, colIdx) => {
                    const prob = 5 - rowIdx;
                    const imp = colIdx + 1;
                    return (
                      <View
                        key={colIdx}
                        style={[
                          styles.matrixCell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: getCellColor(prob, imp),
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        {cell.length > 0 && (
                          <View style={styles.cellContent}>
                            {cell.map(id => (
                              <Text key={id} style={[styles.cellId, { color: colors.foreground }]}>{id}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
              {/* X-axis labels */}
              <View style={styles.matrixRow}>
                <View style={{ width: labelW }} />
                {[1, 2, 3, 4, 5].map(n => (
                  <View key={n} style={[styles.matrixLabel, { width: cellSize }]}>
                    <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{n}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.xAxisLabel}>
                <Text style={[styles.axisText, { color: colors.muted }]}>Impacto</Text>
              </View>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View style={[styles.section, isDesktop && styles.matrixGrid]}>
        {renderMatrix(RISKS_AULA3, 'Aula 3', '#3B82F6')}
        {renderMatrix(RISKS_AULA4, 'Aula 4', '#8B5CF6')}
      </View>
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Visao Evolutiva</Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              Comparacao entre Aula 3 ({RISKS_AULA3.length} riscos) e Aula 4 ({RISKS_AULA4.length} riscos)
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={[styles.timeline, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: '#3B82F6' }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Aula 3 - Identificacao Inicial</Text>
              <Text style={[styles.timelineDesc, { color: colors.muted }]}>
                {RISKS_AULA3.length} riscos identificados, classificados e avaliados
              </Text>
            </View>
          </View>
          <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: '#8B5CF6' }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Aula 4 - Revisao e Expansao</Text>
              <Text style={[styles.timelineDesc, { color: colors.muted }]}>
                {newRisks.length} novos riscos, {modifiedRisks.length} revisados, {unchangedRisks.length} mantidos
              </Text>
            </View>
          </View>
        </View>

        {/* View Toggle */}
        {renderViewToggle()}

        {/* Content */}
        {viewMode === 'summary' && renderSummaryView()}
        {viewMode === 'comparison' && renderComparisonView()}
        {viewMode === 'matrix' && renderMatrixView()}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 100 },
  scrollContentDesktop: { padding: 32, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  headerSub: { fontSize: 14, marginTop: 4 },
  // Timeline
  timeline: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, height: 20, marginLeft: 5, marginVertical: 4 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '600' },
  timelineDesc: { fontSize: 12, marginTop: 2 },
  // Toggle
  toggleRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 4, marginBottom: 20, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
  toggleLabel: { fontSize: 13, fontWeight: '600' },
  // Section
  section: { gap: 16 },
  // Stats
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statsRowDesktop: { flexWrap: 'nowrap' },
  statCard: { flex: 1, minWidth: 140, borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center', gap: 8 },
  statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  // Group
  groupSection: { marginTop: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  groupTitle: { fontSize: 14, fontWeight: '600' },
  // Risk cards
  riskCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  riskCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  riskIdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  riskIdText: { fontSize: 12, fontWeight: '700' },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelText: { fontSize: 11, fontWeight: '600' },
  riskScore: { fontSize: 12, marginLeft: 'auto' },
  riskTitle: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginBottom: 6 },
  riskMeta: { fontSize: 11, marginBottom: 8 },
  riskDetails: { flexDirection: 'row', gap: 6, marginTop: 4 },
  detailLabel: { fontSize: 11, fontWeight: '600', minWidth: 80 },
  detailValue: { fontSize: 11, flex: 1 },
  // Changes
  changesContainer: { marginTop: 8 },
  changesLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  changesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  changeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  changeChipText: { fontSize: 10, fontWeight: '600' },
  // Unchanged
  unchangedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unchangedGridDesktop: {},
  unchangedCard: { borderRadius: 10, borderWidth: 1, padding: 12, minWidth: 200, flex: 1, maxWidth: 300 },
  unchangedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  unchangedId: { fontSize: 13, fontWeight: '700' },
  miniLevel: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  miniLevelText: { fontSize: 11, fontWeight: '700' },
  unchangedDesc: { fontSize: 11, lineHeight: 15 },
  // Comparison table (desktop)
  tableHeader: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 4 },
  thCell: { fontWeight: '700', fontSize: 12 },
  thId: { width: 60 },
  thDesc: { flex: 1, paddingHorizontal: 8 },
  thVal: { width: 90, textAlign: 'center' },
  thStatus: { width: 80, textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 10, alignItems: 'center' },
  tdCell: { justifyContent: 'center' },
  tdId: { fontSize: 13, fontWeight: '700' },
  tdDesc: { fontSize: 12, lineHeight: 16 },
  scoreBox: { borderRadius: 6, padding: 6, alignItems: 'center' },
  scoreText: { fontSize: 16, fontWeight: '700' },
  scoreDetail: { fontSize: 10 },
  naText: { fontSize: 14, textAlign: 'center' },
  gutText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'center' },
  statusText: { fontSize: 11, fontWeight: '600' },
  // Comparison mobile
  compCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  compCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compId: { fontSize: 14, fontWeight: '700' },
  compDesc: { fontSize: 12, lineHeight: 16, marginBottom: 8 },
  compScores: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8 },
  compScoreCol: { alignItems: 'center' },
  compScoreLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  compScoreVal: { fontSize: 13, fontWeight: '700' },
  compChanges: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB20' },
  changeItem: { fontSize: 11, marginTop: 2 },
  // Matrix
  matrixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  matrixContainer: { flex: 1, minWidth: 350 },
  matrixHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  matrixBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  matrixBadgeText: { fontSize: 13, fontWeight: '700' },
  matrixCount: { fontSize: 12 },
  matrixWrapper: { flexDirection: 'row', alignItems: 'center' },
  yAxisLabel: { justifyContent: 'center', alignItems: 'center', height: 200 },
  axisText: { fontSize: 11, fontWeight: '600' },
  matrixRow: { flexDirection: 'row' },
  matrixLabel: { justifyContent: 'center', alignItems: 'center', height: 56 },
  matrixLabelText: { fontSize: 12, fontWeight: '600' },
  matrixCell: { borderWidth: 1, borderRadius: 4, margin: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
  cellContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2 },
  cellId: { fontSize: 9, fontWeight: '700' },
  xAxisLabel: { alignItems: 'center', marginTop: 4 },
});
