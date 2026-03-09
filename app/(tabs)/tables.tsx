import { ScrollView, Text, View, StyleSheet, useWindowDimensions, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { TABELA_IMPACTO_DETALHADA, NIVEIS_PROBABILIDADE, TABELA_GUT, getMatrixColor } from "@/lib/models";
import { useState } from "react";

type TabKey = 'matrix' | 'impacto' | 'probabilidade' | 'gut';

export default function TablesScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [activeTab, setActiveTab] = useState<TabKey>('matrix');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'matrix', label: 'Matriz 5×5' },
    { key: 'impacto', label: 'Impacto' },
    { key: 'probabilidade', label: 'Probabilidade' },
    { key: 'gut', label: 'GUT' },
  ];

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Tabelas de Referência</Text>
        <Text style={[styles.pageSubtitle, { color: colors.muted }]}>Critérios para avaliação e priorização de riscos</Text>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabBar, isDesktop && styles.tabBarDesktop]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? colors.primary : colors.muted },
              activeTab === tab.key && { fontWeight: '700' },
            ]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} showsVerticalScrollIndicator={false}>
        {activeTab === 'matrix' && <MatrixTab colors={colors} isDesktop={isDesktop} />}
        {activeTab === 'impacto' && <ImpactoTab colors={colors} isDesktop={isDesktop} />}
        {activeTab === 'probabilidade' && <ProbabilidadeTab colors={colors} isDesktop={isDesktop} />}
        {activeTab === 'gut' && <GutTab colors={colors} isDesktop={isDesktop} />}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function MatrixTab({ colors, isDesktop }: { colors: any; isDesktop: boolean }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Matriz de Risco (Probabilidade × Impacto)</Text>
      <Text style={[styles.cardDesc, { color: colors.muted }]}>
        A matriz 5×5 classifica os riscos conforme a combinação de probabilidade e impacto. O resultado (P×I) define o nível de risco inerente.
      </Text>
      <View style={[styles.matrixWrapper, isDesktop && { maxWidth: 500, alignSelf: 'center' }]}>
        <View style={styles.matrixYAxis}>
          <Text style={[styles.axisTitle, { color: colors.muted }]}>Probabilidade</Text>
        </View>
        <View style={styles.matrixContent}>
          {[5, 4, 3, 2, 1].map(prob => (
            <View key={prob} style={styles.matrixRow}>
              <View style={styles.matrixRowLabel}>
                <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{prob}</Text>
              </View>
              {[1, 2, 3, 4, 5].map(imp => {
                const score = prob * imp;
                const bgColor = getMatrixColor(prob, imp);
                return (
                  <View key={imp} style={[styles.matrixCell, { backgroundColor: bgColor + '25', borderColor: bgColor + '60' }]}>
                    <Text style={[styles.matrixCellText, { color: bgColor }]}>{score}</Text>
                  </View>
                );
              })}
            </View>
          ))}
          <View style={styles.matrixRow}>
            <View style={styles.matrixRowLabel} />
            {[1, 2, 3, 4, 5].map(n => (
              <View key={n} style={[styles.matrixCell, { borderWidth: 0 }]}>
                <Text style={[styles.matrixLabelText, { color: colors.muted }]}>{n}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.xAxisTitle, { color: colors.muted }]}>Impacto</Text>
        </View>
      </View>
      {/* Legend */}
      <View style={styles.legendGrid}>
        {[
          { range: '1 – 5', label: 'Baixo', color: '#86EFAC', desc: 'Risco aceitável, monitoramento regular' },
          { range: '6 – 11', label: 'Médio', color: '#F59E0B', desc: 'Requer atenção e plano de ação' },
          { range: '12 – 19', label: 'Alto', color: '#F97316', desc: 'Prioridade alta, ação imediata necessária' },
          { range: '20 – 25', label: 'Crítico', color: '#EF4444', desc: 'Risco inaceitável, ação urgente' },
        ].map(item => (
          <View key={item.label} style={[styles.legendCard, { borderColor: item.color + '40' }]}>
            <View style={[styles.legendColorBar, { backgroundColor: item.color }]} />
            <View style={styles.legendCardContent}>
              <Text style={[styles.legendRange, { color: colors.foreground }]}>{item.range}</Text>
              <Text style={[styles.legendLabel, { color: item.color }]}>{item.label}</Text>
              <Text style={[styles.legendDesc, { color: colors.muted }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ImpactoTab({ colors, isDesktop }: { colors: any; isDesktop: boolean }) {
  return (
    <View>
      <Text style={[styles.sectionIntro, { color: colors.muted }]}>
        A tabela de impacto avalia as consequências de um risco em 6 dimensões: financeiro, reputação, operacional, legal, ambiental e social.
      </Text>
      {isDesktop ? (
        <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Desktop Table */}
          <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.thCell, { width: 80 }]}>Nível</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Financeiro</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Reputação</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Operacional</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Legal</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Ambiental</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Social</Text>
          </View>
          {TABELA_IMPACTO_DETALHADA.map((item, idx) => (
            <View key={item.nivel} style={[styles.tableRow, { borderBottomColor: colors.border }, idx % 2 === 0 && { backgroundColor: colors.background + '60' }]}>
              <View style={{ width: 80, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.levelDot, { backgroundColor: getLevelColor(item.nivel) }]} />
                <Text style={[styles.tdCell, { fontWeight: '700', color: getLevelColor(item.nivel) }]}>{item.nivel} - {item.rotulo}</Text>
              </View>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.financeiro}</Text>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.reputacao}</Text>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.operacional}</Text>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.legal}</Text>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.ambiental}</Text>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.social}</Text>
            </View>
          ))}
        </View>
      ) : (
        // Mobile cards
        TABELA_IMPACTO_DETALHADA.map(item => (
          <View key={item.nivel} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
            <View style={styles.impactHeader}>
              <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.nivel) + '20' }]}>
                <Text style={[styles.levelBadgeText, { color: getLevelColor(item.nivel) }]}>{item.nivel}</Text>
              </View>
              <Text style={[styles.impactTitle, { color: colors.foreground }]}>{item.rotulo}</Text>
            </View>
            <DetailRow label="Financeiro" value={item.financeiro} colors={colors} />
            <DetailRow label="Reputação" value={item.reputacao} colors={colors} />
            <DetailRow label="Operacional" value={item.operacional} colors={colors} />
            <DetailRow label="Legal" value={item.legal} colors={colors} />
            <DetailRow label="Ambiental" value={item.ambiental} colors={colors} />
            <DetailRow label="Social" value={item.social} colors={colors} />
          </View>
        ))
      )}
    </View>
  );
}

function ProbabilidadeTab({ colors, isDesktop }: { colors: any; isDesktop: boolean }) {
  return (
    <View>
      <Text style={[styles.sectionIntro, { color: colors.muted }]}>
        A tabela de probabilidade classifica a chance de ocorrência de um risco em 5 níveis.
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {NIVEIS_PROBABILIDADE.map((item, idx) => (
          <View key={item.nivel} style={[styles.probRow, idx < NIVEIS_PROBABILIDADE.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.nivel) + '20' }]}>
              <Text style={[styles.levelBadgeText, { color: getLevelColor(item.nivel) }]}>{item.nivel}</Text>
            </View>
            <View style={styles.probContent}>
              <Text style={[styles.probTitle, { color: colors.foreground }]}>{item.rotulo}</Text>
              <Text style={[styles.probDesc, { color: colors.muted }]}>{item.descricao}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function GutTab({ colors, isDesktop }: { colors: any; isDesktop: boolean }) {
  return (
    <View>
      <Text style={[styles.sectionIntro, { color: colors.muted }]}>
        A matriz GUT (Gravidade × Urgência × Tendência) prioriza riscos pelo produto dos três fatores. Score máximo: 125.
      </Text>
      {isDesktop ? (
        <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.thCell, { width: 60 }]}>Nível</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Gravidade (G)</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Urgência (U)</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Tendência (T)</Text>
          </View>
          {TABELA_GUT.map((item, idx) => (
            <View key={item.nivel} style={[styles.tableRow, { borderBottomColor: colors.border }, idx % 2 === 0 && { backgroundColor: colors.background + '60' }]}>
              <View style={{ width: 60, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.levelDot, { backgroundColor: getLevelColor(item.nivel) }]} />
                <Text style={[styles.tdCell, { fontWeight: '700', color: getLevelColor(item.nivel) }]}>{item.nivel}</Text>
              </View>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.gravidade}</Text>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.urgencia}</Text>
              <Text style={[styles.tdCell, { flex: 1, color: colors.foreground }]}>{item.tendencia}</Text>
            </View>
          ))}
        </View>
      ) : (
        TABELA_GUT.map(item => (
          <View key={item.nivel} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
            <View style={styles.impactHeader}>
              <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.nivel) + '20' }]}>
                <Text style={[styles.levelBadgeText, { color: getLevelColor(item.nivel) }]}>{item.nivel}</Text>
              </View>
              <Text style={[styles.impactTitle, { color: colors.foreground }]}>Nível {item.nivel}</Text>
            </View>
            <DetailRow label="Gravidade (G)" value={item.gravidade} colors={colors} />
            <DetailRow label="Urgência (U)" value={item.urgencia} colors={colors} />
            <DetailRow label="Tendência (T)" value={item.tendencia} colors={colors} />
          </View>
        ))
      )}
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function getLevelColor(nivel: number): string {
  switch (nivel) {
    case 5: return '#EF4444';
    case 4: return '#F97316';
    case 3: return '#F59E0B';
    case 2: return '#38A169';
    case 1: return '#48BB78';
    default: return '#9CA3AF';
  }
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerDesktop: { paddingHorizontal: 32, paddingTop: 28 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginTop: 4 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 4 },
  tabBarDesktop: { paddingHorizontal: 32 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, marginRight: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '500' },
  content: { paddingHorizontal: 24, paddingTop: 16, flexGrow: 1 },
  contentDesktop: { paddingHorizontal: 32 },
  sectionIntro: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 20 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  cardDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  matrixWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  matrixYAxis: { width: 24, alignItems: 'center', justifyContent: 'center' },
  axisTitle: { fontSize: 11, fontWeight: '700', transform: [{ rotate: '-90deg' }], width: 90 },
  matrixContent: { flex: 1 },
  matrixRow: { flexDirection: 'row', marginBottom: 4 },
  matrixRowLabel: { width: 28, justifyContent: 'center', alignItems: 'center' },
  matrixLabelText: { fontSize: 13, fontWeight: '600' },
  matrixCell: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1.5, marginHorizontal: 2 },
  matrixCellText: { fontSize: 16, fontWeight: '800' },
  xAxisTitle: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 6, marginLeft: 28 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  legendCard: { flex: 1, minWidth: 200, borderWidth: 1, borderRadius: 10, overflow: 'hidden', flexDirection: 'row' },
  legendColorBar: { width: 4 },
  legendCardContent: { padding: 12, flex: 1 },
  legendRange: { fontSize: 14, fontWeight: '700' },
  legendLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  legendDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  tableCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, alignItems: 'center' },
  thCell: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#718096', paddingRight: 8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, alignItems: 'flex-start' },
  tdCell: { fontSize: 12, lineHeight: 17, paddingRight: 8 },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  levelBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  levelBadgeText: { fontSize: 16, fontWeight: '800' },
  impactTitle: { fontSize: 17, fontWeight: '700' },
  detailRow: { marginBottom: 8 },
  detailLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  detailValue: { fontSize: 13, lineHeight: 18 },
  probRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  probContent: { flex: 1 },
  probTitle: { fontSize: 15, fontWeight: '700' },
  probDesc: { fontSize: 13, marginTop: 2 },
});
