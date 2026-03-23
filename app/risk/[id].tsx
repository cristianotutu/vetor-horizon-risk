import { useState } from "react";
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel } from "@/lib/models";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FinancialImpactCard } from "@/components/ui/financial-impact-card";

export default function RiskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getRisk, deleteRisk } = useRisks();
  const risk = getRisk(id || '');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleDelete = () => {
    Alert.alert(
      'Excluir Risco',
      `Tem certeza que deseja excluir o risco ${risk?.id}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (risk) {
              await deleteRisk(risk.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (!risk) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted text-base">Risco não encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={{ color: colors.primary, marginTop: 12, fontSize: 16 }}>Voltar</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const riskLevel = getRiskLevel(risk.riscoInerente);
  const gutLevel = getGutLevel(risk.gutScore);

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '500', marginLeft: 8 }}>Voltar</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Risco {risk.id}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.primary + '10' }]}
              onPress={() => router.push(`/risk/edit/${risk.id}` as any)}
              activeOpacity={0.7}
            >
              <IconSymbol name="pencil" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13, marginLeft: 6 }}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: '#FEE2E2' }]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <IconSymbol name="trash.fill" size={16} color="#DC2626" />
              <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13, marginLeft: 6 }}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.pageContainer, isDesktop && styles.pageContainerDesktop]}>
          {/* Summary Banner */}
          <View style={[styles.summaryBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.summaryBadges}>
              <View style={[styles.pill, { backgroundColor: riskLevel.color + '15' }]}>
                <Text style={[styles.pillText, { color: riskLevel.color }]}>{riskLevel.label}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: gutLevel.color + '15' }]}>
                <Text style={[styles.pillText, { color: gutLevel.color }]}>GUT: {risk.gutScore}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.pillText, { color: colors.primary }]}>{risk.tipoRisco}</Text>
              </View>
            </View>
            <Text style={[styles.riskDescText, { color: colors.foreground }]} numberOfLines={0}>{risk.descricaoRisco}</Text>
            <View style={[styles.metricsRow, isDesktop && styles.metricsRowDesktop]}>
              <MetricBox label="Probabilidade" value={`${risk.probabilidade}/5`} color={colors.primary} colors={colors} />
              <MetricBox label="Impacto" value={`${risk.impacto}/5`} color={colors.primary} colors={colors} />
              <MetricBox label="Risco Inerente" value={String(risk.riscoInerente)} color={riskLevel.color} colors={colors} />
              <MetricBox label="GUT Score" value={String(risk.gutScore)} color={gutLevel.color} colors={colors} />
              <MetricBox label="Risco Residual" value={`${risk.riscoResidual}/5`} color="#38A169" colors={colors} />
            </View>
          </View>

          {/* Content Grid */}
          <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
            {/* Left Column */}
            <View style={[styles.column, isDesktop && styles.columnDesktop]}>
              <SectionCard title="1. Identificação" colors={colors}>
                <DetailRow label="Fonte de Risco" value={risk.fonteDeRisco} colors={colors} />
                <DetailRow label="Descrição da Fonte" value={risk.descricaoFonte} colors={colors} />
                <DetailRow label="Ameaça" value={risk.ameaca} colors={colors} />
              </SectionCard>

              <SectionCard title="2. Descrição do Risco" colors={colors}>
                <DetailRow label="Descrição (Forma 3)" value={risk.descricaoRisco} colors={colors} />
                <DetailRow label="Consequência" value={risk.consequencia} colors={colors} />
              </SectionCard>

              <SectionCard title="3. Classificação" colors={colors}>
                <View style={styles.inlineRow}>
                  <View style={styles.inlineItem}>
                    <DetailRow label="Estratégico" value={risk.estrategico} colors={colors} />
                  </View>
                  <View style={styles.inlineItem}>
                    <DetailRow label="Tipo de Risco" value={risk.tipoRisco} colors={colors} />
                  </View>
                </View>
              </SectionCard>

              <SectionCard title="4. Avaliação (P × I)" colors={colors}>
                <View style={styles.evalGrid}>
                  <EvalItem label="Probabilidade" value={risk.probabilidade} max={5} colors={colors} />
                  <EvalItem label="Impacto" value={risk.impacto} max={5} colors={colors} />
                  <View style={[styles.evalResult, { backgroundColor: riskLevel.color + '10', borderColor: riskLevel.color + '30' }]}>
                    <Text style={[styles.evalResultLabel, { color: colors.muted }]}>Risco Inerente</Text>
                    <Text style={[styles.evalResultValue, { color: riskLevel.color }]}>{risk.riscoInerente}</Text>
                    <Text style={[styles.evalResultLevel, { color: riskLevel.color }]}>{riskLevel.label}</Text>
                  </View>
                </View>
              </SectionCard>
            </View>

            {/* Right Column */}
            <View style={[styles.column, isDesktop && styles.columnDesktop]}>
              <SectionCard title="5. Priorização (GUT)" colors={colors}>
                <View style={styles.evalGrid}>
                  <EvalItem label="Gravidade (G)" value={risk.gravidade} max={5} colors={colors} />
                  <EvalItem label="Urgência (U)" value={risk.urgencia} max={5} colors={colors} />
                  <EvalItem label="Tendência (T)" value={risk.tendencia} max={5} colors={colors} />
                  <View style={[styles.evalResult, { backgroundColor: gutLevel.color + '10', borderColor: gutLevel.color + '30' }]}>
                    <Text style={[styles.evalResultLabel, { color: colors.muted }]}>GUT Score</Text>
                    <Text style={[styles.evalResultValue, { color: gutLevel.color }]}>{risk.gutScore}</Text>
                    <Text style={[styles.evalResultLevel, { color: gutLevel.color }]}>{gutLevel.label}</Text>
                  </View>
                </View>
              </SectionCard>

              <SectionCard title="6. Tratamento" colors={colors}>
                <DetailRow label="Estratégia (MATE)" value={risk.tratamento} colors={colors} />
                <DetailRow label="Controles" value={risk.controles} colors={colors} />
                <DetailRow label="Responsável" value={risk.responsavel} colors={colors} />
                <DetailRow label="Prazo" value={risk.prazo} colors={colors} />
                <DetailRow label="KRI" value={risk.kri} colors={colors} />
                <DetailRow label="Ação se KRI atingido" value={risk.acaoKri} colors={colors} />
                <View style={styles.inlineRow}>
                  <View style={styles.inlineItem}>
                    <DetailRow label="Quem mede" value={risk.quemMede} colors={colors} />
                  </View>
                  <View style={styles.inlineItem}>
                    <DetailRow label="Quando mede" value={risk.quandoMede} colors={colors} />
                  </View>
                </View>
              </SectionCard>

              <SectionCard title="7. Risco Residual" colors={colors}>
                <View style={styles.evalGrid}>
                  <EvalItem label="Redução Pretendida" value={risk.reducaoPretendida} max={5} colors={colors} />
                  <EvalItem label="Risco Residual" value={risk.riscoResidual} max={5} colors={colors} />
                </View>
                <DetailRow label="Eficácia do Tratamento" value={risk.eficaciaTratamento} colors={colors} />
              </SectionCard>
            </View>
          </View>

          {/* Financial Impact Section */}
          {risk.impactoFinanceiro && (
            <View style={{ marginTop: 16 }}>
              <FinancialImpactCard data={risk.impactoFinanceiro} riskId={risk.id} />
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionCard({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={0}>{value}</Text>
    </View>
  );
}

function MetricBox({ label, value, color, colors }: { label: string; value: string; color: string; colors: any }) {
  return (
    <View style={[styles.metricBox, { backgroundColor: color + '08', borderColor: color + '25' }]}>
      <Text style={[styles.metricLabel, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function EvalItem({ label, value, max, colors }: { label: string; value: number; max: number; colors: any }) {
  const pct = (value / max) * 100;
  const barColor = value <= 2 ? '#38A169' : value === 3 ? '#DD6B20' : '#E53E3E';
  return (
    <View style={styles.evalItem}>
      <View style={styles.evalItemHeader}>
        <Text style={[styles.evalItemLabel, { color: colors.foreground }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.evalItemValue, { color: barColor }]}>{value}/{max}</Text>
      </View>
      <View style={[styles.evalBar, { backgroundColor: colors.border }]}>
        <View style={[styles.evalBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 20,
  },
  pageContainer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  pageContainerDesktop: {
    maxWidth: 1280,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  summaryBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  summaryBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '700' },
  riskDescText: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricsRowDesktop: { flexWrap: 'nowrap' },
  metricBox: {
    flex: 1,
    minWidth: 90,
    maxWidth: 200,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 10, fontWeight: '500', marginBottom: 4, textAlign: 'center' },
  metricValue: { fontSize: 20, fontWeight: '800' },
  contentGrid: { gap: 16 },
  contentGridDesktop: {
    flexDirection: 'row',
    gap: 20,
  },
  column: { gap: 16 },
  columnDesktop: {
    flex: 1,
    minWidth: 0,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    overflow: 'hidden',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  sectionBody: { gap: 10 },
  detailRow: { gap: 2 },
  detailLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: 13, lineHeight: 19 },
  inlineRow: { flexDirection: 'row', gap: 16 },
  inlineItem: { flex: 1, minWidth: 0 },
  evalGrid: { gap: 10 },
  evalItem: { gap: 4 },
  evalItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  evalItemLabel: { fontSize: 13, fontWeight: '500' },
  evalItemValue: { fontSize: 13, fontWeight: '700' },
  evalBar: { height: 7, borderRadius: 4, overflow: 'hidden' },
  evalBarFill: { height: '100%', borderRadius: 4 },
  evalResult: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
  evalResultLabel: { fontSize: 11, fontWeight: '500' },
  evalResultValue: { fontSize: 28, fontWeight: '800', marginVertical: 2 },
  evalResultLevel: { fontSize: 13, fontWeight: '700' },
});
