import { ScrollView, Text, View, TouchableOpacity, StyleSheet, useWindowDimensions, Modal, FlatList } from "react-native";
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { RISKS_AULA3, RISKS_AULA4, RISKS_AULA5, EVOLUTION_3_TO_4, EVOLUTION_4_TO_5 } from "@/lib/evolution-data";
import { getRiskLevel, getGutLevel, Risk } from "@/lib/models";

type ViewMode = 'summary' | 'comparison' | 'matrix';
type CompareMode = '3v4' | '4v5' | '3v5';
type FilterState = { title: string; risks: Risk[]; source?: string } | null;

function normalizeId(id: string) { return id.replace(/\s/g, '').toUpperCase(); }

const a3Map = new Map(RISKS_AULA3.map(r => [normalizeId(r.id), r]));
const a4Map = new Map(RISKS_AULA4.map(r => [normalizeId(r.id), r]));
const a5Map = new Map(RISKS_AULA5.map(r => [normalizeId(r.id), r]));

const AULA_COLORS = { '3': '#3B82F6', '4': '#8B5CF6', '5': '#10B981' };

function getAulaData(n: '3' | '4' | '5') {
  if (n === '3') return { risks: RISKS_AULA3, map: a3Map, label: 'Aula 3', color: AULA_COLORS['3'] };
  if (n === '4') return { risks: RISKS_AULA4, map: a4Map, label: 'Aula 4', color: AULA_COLORS['4'] };
  return { risks: RISKS_AULA5, map: a5Map, label: 'Aula 5', color: AULA_COLORS['5'] };
}

function getEvolution(mode: CompareMode) {
  if (mode === '3v4') return EVOLUTION_3_TO_4;
  if (mode === '4v5') return EVOLUTION_4_TO_5;
  // 3v5: compute dynamically
  const a3Ids = new Set(RISKS_AULA3.map(r => normalizeId(r.id)));
  return RISKS_AULA5.map(r => {
    const rid = normalizeId(r.id);
    if (!a3Ids.has(rid)) return { riskId: rid, type: 'new' as const, changes: ['Novo risco (não existia na Aula 3)'] };
    const r3 = a3Map.get(rid)!;
    const changes: string[] = [];
    if (r3.gutScore !== r.gutScore) changes.push(`GUT: ${r3.gutScore}→${r.gutScore}`);
    if (r3.riscoInerente !== r.riscoInerente) changes.push(`PxI: ${r3.riscoInerente}→${r.riscoInerente}`);
    if (r3.tratamento !== r.tratamento && r.tratamento) changes.push('Tratamento atualizado');
    if (r.controles && (!r3.controles || r.controles.length > r3.controles.length + 20)) changes.push('Controles detalhados');
    if (r.kri && !r3.kri) changes.push('KRI definido');
    if (r.consequencia && !r3.consequencia) changes.push('Consequência detalhada');
    if (r.eficaciaTratamento && !r3.eficaciaTratamento) changes.push('Eficácia definida');
    if (changes.length > 0) return { riskId: rid, type: 'modified' as const, changes };
    return { riskId: rid, type: 'unchanged' as const, changes: [] };
  });
}

export default function EvolutionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [compareMode, setCompareMode] = useState<CompareMode>('3v5');
  const [activeFilter, setActiveFilter] = useState<FilterState>(null);

  const fromAula = compareMode[0] as '3' | '4' | '5';
  const toAula = compareMode[2] as '3' | '4' | '5';
  const fromData = getAulaData(fromAula);
  const toData = getAulaData(toAula);
  const evolution = useMemo(() => getEvolution(compareMode), [compareMode]);

  const newRisks = evolution.filter(e => e.type === 'new');
  const modifiedRisks = evolution.filter(e => e.type === 'modified');
  const unchangedRisks = evolution.filter(e => e.type === 'unchanged');

  const handleRiskPress = useCallback((riskId: string) => {
    setActiveFilter(null);
    router.push(`/risk/${riskId}` as any);
  }, [router]);

  const handleCellPress = useCallback((prob: number, imp: number, cellRisks: string[], source: string) => {
    if (cellRisks.length === 0) return;
    const map = source.includes('3') ? a3Map : source.includes('4') ? a4Map : a5Map;
    const risksInCell = cellRisks.map(id => map.get(id)).filter(Boolean) as Risk[];
    if (risksInCell.length > 0) {
      setActiveFilter({ title: `${source}: P=${prob} × I=${imp} (Score ${prob * imp})`, risks: risksInCell, source });
    }
  }, []);

  const handleStatGroupPress = useCallback((type: 'new' | 'modified' | 'unchanged', label: string) => {
    const evItems = evolution.filter(e => e.type === type);
    const risksArr = evItems.map(e => toData.map.get(e.riskId)).filter(Boolean) as Risk[];
    if (risksArr.length > 0) {
      setActiveFilter({ title: label, risks: risksArr, source: toData.label });
    }
  }, [evolution, toData]);

  const renderRiskModal = () => {
    if (!activeFilter) return null;
    return (
      <Modal visible={!!activeFilter} transparent animationType="fade" onRequestClose={() => setActiveFilter(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setActiveFilter(null)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalContent, { backgroundColor: colors.background, borderColor: colors.border, maxWidth: isDesktop ? 700 : width - 32, maxHeight: '80%' }]} onPress={() => {}}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, { color: colors.foreground }]}>{activeFilter.title}</Text>
                <Text style={[s.modalSub, { color: colors.muted }]}>Clique em um risco para ver detalhes</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveFilter(null)} style={[s.closeBtn, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
                <Text style={[s.closeBtnText, { color: colors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeFilter.risks}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const level = getRiskLevel(item.riscoInerente);
                const gutLevel = getGutLevel(item.gutScore);
                return (
                  <TouchableOpacity style={[s.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleRiskPress(normalizeId(item.id))} activeOpacity={0.7}>
                    <View style={s.modalCardHeader}>
                      <View style={[s.modalIdBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[s.modalIdText, { color: colors.primary }]}>{item.id}</Text>
                      </View>
                      <View style={s.modalBadges}>
                        <View style={[s.pill, { backgroundColor: level.color + '15' }]}>
                          <Text style={[s.pillText, { color: level.color }]}>P×I {item.riscoInerente}</Text>
                        </View>
                        <View style={[s.pill, { backgroundColor: gutLevel.color + '15' }]}>
                          <Text style={[s.pillText, { color: gutLevel.color }]}>GUT {item.gutScore}</Text>
                        </View>
                        <View style={[s.pill, { backgroundColor: level.color + '15' }]}>
                          <Text style={[s.pillText, { color: level.color }]}>{level.label}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[s.modalDesc, { color: colors.foreground }]} numberOfLines={3}>{item.descricaoRisco}</Text>
                    <View style={s.modalFooter}>
                      <Text style={[s.modalMeta, { color: colors.muted }]}>{item.fonteDeRisco} | {item.tratamento}</Text>
                      <IconSymbol name="chevron.right" size={14} color={colors.primary} />
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

  const renderCompareSelector = () => (
    <View style={[s.compareSelectorRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {([
        { key: '3v4' as CompareMode, label: 'Aula 3 → 4' },
        { key: '4v5' as CompareMode, label: 'Aula 4 → 5' },
        { key: '3v5' as CompareMode, label: 'Aula 3 → 5' },
      ]).map(item => (
        <TouchableOpacity
          key={item.key}
          style={[s.compareSelectorBtn, compareMode === item.key && { backgroundColor: colors.primary + '18' }]}
          onPress={() => setCompareMode(item.key)}
          activeOpacity={0.7}
        >
          <Text style={[s.compareSelectorLabel, { color: compareMode === item.key ? colors.primary : colors.muted }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderViewToggle = () => (
    <View style={[s.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {([
        { key: 'summary' as ViewMode, label: 'Resumo', icon: 'info.circle.fill' as const },
        { key: 'comparison' as ViewMode, label: 'Comparativo', icon: 'chart.line.uptrend.xyaxis' as const },
        { key: 'matrix' as ViewMode, label: 'Matrizes', icon: 'tablecells' as const },
      ]).map(item => (
        <TouchableOpacity
          key={item.key}
          style={[s.toggleBtn, viewMode === item.key && { backgroundColor: colors.primary + '18' }]}
          onPress={() => setViewMode(item.key)}
          activeOpacity={0.7}
        >
          <IconSymbol name={item.icon} size={16} color={viewMode === item.key ? colors.primary : colors.muted} />
          <Text style={[s.toggleLabel, { color: viewMode === item.key ? colors.primary : colors.muted }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryView = () => (
    <View style={s.section}>
      <View style={[s.statsRow, isDesktop && s.statsRowDesktop]}>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.statIcon, { backgroundColor: fromData.color + '20' }]}>
            <IconSymbol name="list.bullet" size={20} color={fromData.color} />
          </View>
          <Text style={[s.statNumber, { color: colors.foreground }]}>{fromData.risks.length}</Text>
          <Text style={[s.statLabel, { color: colors.muted }]}>Riscos {fromData.label}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.statIcon, { backgroundColor: toData.color + '20' }]}>
            <IconSymbol name="list.bullet" size={20} color={toData.color} />
          </View>
          <Text style={[s.statNumber, { color: colors.foreground }]}>{toData.risks.length}</Text>
          <Text style={[s.statLabel, { color: colors.muted }]}>Riscos {toData.label}</Text>
        </View>
        <TouchableOpacity style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleStatGroupPress('new', `Novos na ${toData.label} (${newRisks.length})`)} activeOpacity={0.7}>
          <View style={[s.statIcon, { backgroundColor: '#10B98120' }]}>
            <IconSymbol name="plus.circle.fill" size={20} color="#10B981" />
          </View>
          <Text style={[s.statNumber, { color: '#10B981' }]}>{newRisks.length}</Text>
          <Text style={[s.statLabel, { color: colors.muted }]}>Novos</Text>
          <Text style={[s.tapHint, { color: '#10B981' }]}>Clique para ver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleStatGroupPress('modified', `Revisados (${modifiedRisks.length})`)} activeOpacity={0.7}>
          <View style={[s.statIcon, { backgroundColor: '#F59E0B20' }]}>
            <IconSymbol name="pencil" size={20} color="#F59E0B" />
          </View>
          <Text style={[s.statNumber, { color: '#F59E0B' }]}>{modifiedRisks.length}</Text>
          <Text style={[s.statLabel, { color: colors.muted }]}>Revisados</Text>
          <Text style={[s.tapHint, { color: '#F59E0B' }]}>Clique para ver</Text>
        </TouchableOpacity>
      </View>

      {newRisks.length > 0 && (
        <View style={s.groupSection}>
          <View style={s.groupHeader}>
            <View style={[s.badge, { backgroundColor: '#10B98120' }]}>
              <Text style={[s.badgeText, { color: '#10B981' }]}>NOVOS</Text>
            </View>
            <Text style={[s.groupTitle, { color: colors.foreground }]}>Riscos adicionados na {toData.label}</Text>
          </View>
          {newRisks.map(ev => {
            const risk = toData.map.get(ev.riskId);
            if (!risk) return null;
            const level = getRiskLevel(risk.riscoInerente);
            const gutLevel = getGutLevel(risk.gutScore);
            return (
              <TouchableOpacity key={ev.riskId} style={[s.riskCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleRiskPress(normalizeId(risk.id))} activeOpacity={0.7}>
                <View style={s.riskCardHeader}>
                  <View style={[s.riskIdBadge, { backgroundColor: '#10B98118' }]}>
                    <Text style={[s.riskIdText, { color: '#10B981' }]}>{risk.id}</Text>
                  </View>
                  <View style={[s.levelBadge, { backgroundColor: level.color + '18' }]}>
                    <Text style={[s.levelText, { color: level.color }]}>{level.label}</Text>
                  </View>
                  <View style={[s.pill, { backgroundColor: gutLevel.color + '15', marginLeft: 4 }]}>
                    <Text style={[s.pillText, { color: gutLevel.color }]}>GUT {risk.gutScore}</Text>
                  </View>
                  <Text style={[s.riskScore, { color: colors.muted }]}>P{risk.probabilidade}xI{risk.impacto}={risk.riscoInerente}</Text>
                  <IconSymbol name="chevron.right" size={14} color={colors.primary} style={{ marginLeft: 'auto' } as any} />
                </View>
                <Text style={[s.riskTitle, { color: colors.foreground }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
                <Text style={[s.riskMeta, { color: colors.muted }]}>{risk.fonteDeRisco} | {risk.tipoRisco}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {modifiedRisks.length > 0 && (
        <View style={s.groupSection}>
          <View style={s.groupHeader}>
            <View style={[s.badge, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[s.badgeText, { color: '#F59E0B' }]}>REVISADOS</Text>
            </View>
            <Text style={[s.groupTitle, { color: colors.foreground }]}>Riscos alterados entre {fromData.label} e {toData.label}</Text>
          </View>
          {modifiedRisks.map(ev => {
            const risk = toData.map.get(ev.riskId);
            if (!risk) return null;
            const level = getRiskLevel(risk.riscoInerente);
            return (
              <TouchableOpacity key={ev.riskId} style={[s.riskCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleRiskPress(normalizeId(risk.id))} activeOpacity={0.7}>
                <View style={s.riskCardHeader}>
                  <View style={[s.riskIdBadge, { backgroundColor: '#F59E0B18' }]}>
                    <Text style={[s.riskIdText, { color: '#F59E0B' }]}>{risk.id}</Text>
                  </View>
                  <View style={[s.levelBadge, { backgroundColor: level.color + '18' }]}>
                    <Text style={[s.levelText, { color: level.color }]}>{level.label}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={colors.primary} style={{ marginLeft: 'auto' } as any} />
                </View>
                <Text style={[s.riskTitle, { color: colors.foreground }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
                <View style={s.changesContainer}>
                  <Text style={[s.changesLabel, { color: colors.muted }]}>Alterações:</Text>
                  <View style={s.changesList}>
                    {ev.changes.map((c, i) => (
                      <View key={i} style={[s.changeChip, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}>
                        <Text style={[s.changeChipText, { color: '#F59E0B' }]}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {unchangedRisks.length > 0 && (
        <View style={s.groupSection}>
          <View style={s.groupHeader}>
            <View style={[s.badge, { backgroundColor: '#6B728020' }]}>
              <Text style={[s.badgeText, { color: '#6B7280' }]}>SEM ALTERAÇÃO</Text>
            </View>
            <Text style={[s.groupTitle, { color: colors.foreground }]}>{unchangedRisks.length} riscos mantidos</Text>
          </View>
          <View style={[s.unchangedGrid, isDesktop && s.unchangedGridDesktop]}>
            {unchangedRisks.map(ev => {
              const risk = toData.map.get(ev.riskId);
              if (!risk) return null;
              const level = getRiskLevel(risk.riscoInerente);
              return (
                <TouchableOpacity key={ev.riskId} style={[s.unchangedCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleRiskPress(normalizeId(risk.id))} activeOpacity={0.7}>
                  <View style={s.unchangedHeader}>
                    <Text style={[s.unchangedId, { color: colors.foreground }]}>{risk.id}</Text>
                    <View style={[s.miniLevel, { backgroundColor: level.color + '18' }]}>
                      <Text style={[s.miniLevelText, { color: level.color }]}>{risk.riscoInerente}</Text>
                    </View>
                  </View>
                  <Text style={[s.unchangedDesc, { color: colors.muted }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  const renderComparisonView = () => {
    const allIds = Array.from(new Set([
      ...fromData.risks.map(r => normalizeId(r.id)),
      ...toData.risks.map(r => normalizeId(r.id)),
    ])).sort();

    return (
      <View style={s.section}>
        {isDesktop && (
          <View style={[s.tableHeader, { backgroundColor: colors.primary + '08', borderColor: colors.border }]}>
            <Text style={[s.thCell, s.thId, { color: colors.foreground }]}>ID</Text>
            <Text style={[s.thCell, s.thDesc, { color: colors.foreground }]}>Descrição</Text>
            <Text style={[s.thCell, s.thVal, { color: colors.foreground }]}>{fromData.label} (PxI)</Text>
            <Text style={[s.thCell, s.thVal, { color: colors.foreground }]}>{toData.label} (PxI)</Text>
            <Text style={[s.thCell, s.thVal, { color: colors.foreground }]}>GUT {fromAula}</Text>
            <Text style={[s.thCell, s.thVal, { color: colors.foreground }]}>GUT {toAula}</Text>
            <Text style={[s.thCell, s.thStatus, { color: colors.foreground }]}>Status</Text>
          </View>
        )}
        {allIds.map(rid => {
          const rFrom = fromData.map.get(rid);
          const rTo = toData.map.get(rid);
          const ev = evolution.find(e => e.riskId === rid);
          const risk = rTo || rFrom;
          if (!risk) return null;

          const isNew = !rFrom;
          const isModified = ev?.type === 'modified';
          const statusColor = isNew ? '#10B981' : isModified ? '#F59E0B' : '#6B7280';
          const statusLabel = isNew ? 'Novo' : isModified ? 'Revisado' : 'Igual';
          const levelFrom = rFrom ? getRiskLevel(rFrom.riscoInerente) : null;
          const levelTo = rTo ? getRiskLevel(rTo.riscoInerente) : null;

          if (isDesktop) {
            return (
              <TouchableOpacity key={rid} style={[s.tableRow, { borderColor: colors.border }]} onPress={() => handleRiskPress(rid)} activeOpacity={0.6}>
                <View style={[s.tdCell, s.thId]}>
                  <Text style={[s.tdId, { color: colors.primary }]}>{rid}</Text>
                </View>
                <View style={[s.tdCell, s.thDesc, { minWidth: 0 }]}>
                  <Text style={[s.tdDesc, { color: colors.foreground }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
                </View>
                <View style={[s.tdCell, s.thVal]}>
                  {rFrom ? (
                    <View style={[s.scoreBox, { backgroundColor: (levelFrom?.color || '#6B7280') + '18' }]}>
                      <Text style={[s.scoreBoxText, { color: levelFrom?.color }]}>{rFrom.riscoInerente}</Text>
                    </View>
                  ) : <Text style={[s.naText, { color: colors.muted }]}>-</Text>}
                </View>
                <View style={[s.tdCell, s.thVal]}>
                  {rTo ? (
                    <View style={[s.scoreBox, { backgroundColor: (levelTo?.color || '#6B7280') + '18' }]}>
                      <Text style={[s.scoreBoxText, { color: levelTo?.color }]}>{rTo.riscoInerente}</Text>
                    </View>
                  ) : <Text style={[s.naText, { color: colors.muted }]}>-</Text>}
                </View>
                <View style={[s.tdCell, s.thVal]}>
                  <Text style={[s.gutText, { color: colors.foreground }]}>{rFrom ? rFrom.gutScore : '-'}</Text>
                </View>
                <View style={[s.tdCell, s.thVal]}>
                  <Text style={[s.gutText, { color: colors.foreground }]}>{rTo ? rTo.gutScore : '-'}</Text>
                </View>
                <View style={[s.tdCell, s.thStatus]}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '18' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={rid} style={[s.compCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => handleRiskPress(rid)} activeOpacity={0.7}>
              <View style={s.compCardHeader}>
                <Text style={[s.compId, { color: colors.primary }]}>{rid}</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '18' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={colors.primary} />
                </View>
              </View>
              <Text style={[s.compDesc, { color: colors.muted }]} numberOfLines={2}>{risk.descricaoRisco}</Text>
              <View style={s.compScores}>
                <View style={s.compScoreCol}>
                  <Text style={[s.compScoreLabel, { color: colors.muted }]}>{fromData.label}</Text>
                  <Text style={[s.compScoreVal, { color: levelFrom?.color || colors.muted }]}>
                    {rFrom ? `PxI ${rFrom.riscoInerente} | GUT ${rFrom.gutScore}` : '-'}
                  </Text>
                </View>
                <IconSymbol name="arrow.right" size={16} color={colors.muted} />
                <View style={s.compScoreCol}>
                  <Text style={[s.compScoreLabel, { color: colors.muted }]}>{toData.label}</Text>
                  <Text style={[s.compScoreVal, { color: levelTo?.color || colors.muted }]}>
                    {rTo ? `PxI ${rTo.riscoInerente} | GUT ${rTo.gutScore}` : '-'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMatrixView = () => {
    const renderMatrix = (risks: Risk[], label: string, color: string, source: string) => {
      const matrix: string[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => [] as string[]));
      risks.forEach(r => {
        const row = 5 - r.probabilidade;
        const col = r.impacto - 1;
        if (row >= 0 && row < 5 && col >= 0 && col < 5) matrix[row][col].push(normalizeId(r.id));
      });
      const cellSize = isDesktop ? 80 : 52;
      const labelW = isDesktop ? 28 : 18;
      const getCellColor = (prob: number, imp: number) => {
        const score = prob * imp;
        if (score >= 20) return '#EF4444';
        if (score >= 12) return '#F97316';
        if (score >= 6) return '#F59E0B';
        return '#86EFAC';
      };
      return (
        <View style={s.matrixContainer}>
          <View style={s.matrixHeaderRow}>
            <View style={[s.matrixBadge, { backgroundColor: color + '18' }]}>
              <Text style={[s.matrixBadgeText, { color }]}>{label}</Text>
            </View>
            <Text style={[s.matrixCount, { color: colors.muted }]}>{risks.length} riscos</Text>
          </View>
          <View style={s.matrixWrap}>
            <View style={[s.yAxisLabel, { width: labelW }]}>
              <Text style={[s.axisText, { color: colors.muted, transform: [{ rotate: '-90deg' }] }]}>Prob.</Text>
            </View>
            <View>
              {matrix.map((row, rowIdx) => (
                <View key={rowIdx} style={s.matrixRow}>
                  <View style={[s.matrixLabel, { width: labelW }]}>
                    <Text style={[s.matrixLabelText, { color: colors.muted }]}>{5 - rowIdx}</Text>
                  </View>
                  {row.map((cell, colIdx) => {
                    const prob = 5 - rowIdx;
                    const imp = colIdx + 1;
                    const cellColor = getCellColor(prob, imp);
                    const hasRisks = cell.length > 0;
                    return (
                      <TouchableOpacity
                        key={colIdx}
                        style={[s.matrixCell, { width: cellSize, height: cellSize, backgroundColor: cellColor + (hasRisks ? '30' : '12'), borderColor: hasRisks ? cellColor + '60' : colors.border, borderWidth: hasRisks ? 2 : 1 }]}
                        onPress={() => handleCellPress(prob, imp, cell, source)}
                        activeOpacity={hasRisks ? 0.6 : 1}
                      >
                        {hasRisks ? (
                          <View style={s.cellContent}>
                            {cell.map(id => <Text key={id} style={[s.cellId, { color: colors.foreground }]}>{id}</Text>)}
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View style={s.matrixRow}>
                <View style={{ width: labelW }} />
                {[1, 2, 3, 4, 5].map(n => (
                  <View key={n} style={[s.matrixLabel, { width: cellSize }]}>
                    <Text style={[s.matrixLabelText, { color: colors.muted }]}>{n}</Text>
                  </View>
                ))}
              </View>
              <View style={s.xAxisLabel}>
                <Text style={[s.axisText, { color: colors.muted }]}>Impacto</Text>
              </View>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View style={s.section}>
        <View style={[isDesktop && s.matrixGrid]}>
          {renderMatrix(fromData.risks, fromData.label, fromData.color, fromData.label)}
          {renderMatrix(toData.risks, toData.label, toData.color, toData.label)}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={[s.scrollContent, isDesktop && s.scrollContentDesktop]}>
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Visão Evolutiva</Text>
          <Text style={[s.headerSub, { color: colors.muted }]}>
            Acompanhe a evolução do estudo de riscos: Aula 3 ({RISKS_AULA3.length}) → Aula 4 ({RISKS_AULA4.length}) → Aula 5 ({RISKS_AULA5.length} riscos)
          </Text>
        </View>

        {/* Timeline 3 aulas */}
        <View style={[s.timeline, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.timelineItem}>
            <View style={[s.timelineDot, { backgroundColor: AULA_COLORS['3'] }]} />
            <View style={s.timelineContent}>
              <Text style={[s.timelineTitle, { color: colors.foreground }]}>Aula 3 - Identificação Inicial</Text>
              <Text style={[s.timelineDesc, { color: colors.muted }]}>{RISKS_AULA3.length} riscos identificados e classificados</Text>
            </View>
          </View>
          <View style={[s.timelineLine, { backgroundColor: colors.border }]} />
          <View style={s.timelineItem}>
            <View style={[s.timelineDot, { backgroundColor: AULA_COLORS['4'] }]} />
            <View style={s.timelineContent}>
              <Text style={[s.timelineTitle, { color: colors.foreground }]}>Aula 4 - Revisão e Expansão</Text>
              <Text style={[s.timelineDesc, { color: colors.muted }]}>{RISKS_AULA4.length} riscos com GUT revisado pela Vetor Horizon</Text>
            </View>
          </View>
          <View style={[s.timelineLine, { backgroundColor: colors.border }]} />
          <View style={s.timelineItem}>
            <View style={[s.timelineDot, { backgroundColor: AULA_COLORS['5'] }]} />
            <View style={s.timelineContent}>
              <Text style={[s.timelineTitle, { color: colors.foreground }]}>Aula 5 - Maturidade e Detalhamento</Text>
              <Text style={[s.timelineDesc, { color: colors.muted }]}>{RISKS_AULA5.length} riscos com controles, KRI e eficácia detalhados</Text>
            </View>
          </View>
        </View>

        {renderCompareSelector()}
        {renderViewToggle()}

        {viewMode === 'summary' && renderSummaryView()}
        {viewMode === 'comparison' && renderComparisonView()}
        {viewMode === 'matrix' && renderMatrixView()}
      </ScrollView>
      {renderRiskModal()}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 100 },
  scrollContentDesktop: { padding: 32, maxWidth: 1280, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  headerSub: { fontSize: 14, marginTop: 4 },
  timeline: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, height: 16, marginLeft: 5, marginVertical: 2 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '600' },
  timelineDesc: { fontSize: 12, marginTop: 2 },
  compareSelectorRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 4, marginBottom: 10, gap: 4 },
  compareSelectorBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  compareSelectorLabel: { fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 4, marginBottom: 20, gap: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
  toggleLabel: { fontSize: 13, fontWeight: '600' },
  section: { gap: 16 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statsRowDesktop: { flexWrap: 'nowrap' },
  statCard: { flex: 1, minWidth: 130, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  statNumber: { fontSize: 26, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  tapHint: { fontSize: 10, fontWeight: '600', opacity: 0.8 },
  groupSection: { marginTop: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  groupTitle: { fontSize: 14, fontWeight: '600' },
  riskCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  riskCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  riskIdBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  riskIdText: { fontSize: 12, fontWeight: '700' },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelText: { fontSize: 11, fontWeight: '600' },
  riskScore: { fontSize: 12, marginLeft: 'auto' },
  riskTitle: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginBottom: 4 },
  riskMeta: { fontSize: 11 },
  changesContainer: { marginTop: 8 },
  changesLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  changesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  changeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  changeChipText: { fontSize: 10, fontWeight: '600' },
  unchangedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unchangedGridDesktop: {},
  unchangedCard: { borderRadius: 10, borderWidth: 1, padding: 12, minWidth: 200, flex: 1, maxWidth: 300 },
  unchangedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  unchangedId: { fontSize: 13, fontWeight: '700' },
  miniLevel: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  miniLevelText: { fontSize: 11, fontWeight: '700' },
  unchangedDesc: { fontSize: 11, lineHeight: 15 },
  tableHeader: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 4 },
  thCell: { fontWeight: '700', fontSize: 12 },
  thId: { width: 60 },
  thDesc: { flex: 1, paddingHorizontal: 8 },
  thVal: { width: 85, textAlign: 'center' },
  thStatus: { width: 80, textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 10, alignItems: 'center' },
  tdCell: { justifyContent: 'center' },
  tdId: { fontSize: 13, fontWeight: '700' },
  tdDesc: { fontSize: 12, lineHeight: 16 },
  scoreBox: { borderRadius: 6, padding: 6, alignItems: 'center' },
  scoreBoxText: { fontSize: 15, fontWeight: '700' },
  naText: { fontSize: 14, textAlign: 'center' },
  gutText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'center' },
  statusText: { fontSize: 11, fontWeight: '600' },
  compCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  compCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compId: { fontSize: 14, fontWeight: '700' },
  compDesc: { fontSize: 12, lineHeight: 16, marginBottom: 8 },
  compScores: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8 },
  compScoreCol: { alignItems: 'center' },
  compScoreLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  compScoreVal: { fontSize: 12, fontWeight: '700' },
  matrixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  matrixContainer: { flex: 1, minWidth: 340 },
  matrixHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  matrixBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  matrixBadgeText: { fontSize: 13, fontWeight: '700' },
  matrixCount: { fontSize: 12 },
  matrixWrap: { flexDirection: 'row', alignItems: 'center' },
  yAxisLabel: { justifyContent: 'center', alignItems: 'center', height: 200 },
  axisText: { fontSize: 10, fontWeight: '600' },
  matrixRow: { flexDirection: 'row' },
  matrixLabel: { justifyContent: 'center', alignItems: 'center', height: 52 },
  matrixLabelText: { fontSize: 11, fontWeight: '600' },
  matrixCell: { borderRadius: 4, margin: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
  cellContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 1, alignItems: 'center' },
  cellId: { fontSize: 8, fontWeight: '700' },
  xAxisLabel: { alignItems: 'center', marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { borderRadius: 16, borderWidth: 1, width: '100%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSub: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 18, fontWeight: '600' },
  modalCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  modalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  modalIdBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalIdText: { fontSize: 14, fontWeight: '800' },
  modalBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  modalDesc: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalMeta: { fontSize: 11, flex: 1 },
});
