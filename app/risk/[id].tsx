import { useState } from "react";
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel } from "@/lib/models";

export default function RiskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getRisk, deleteRisk } = useRisks();
  const risk = getRisk(id || '');

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identificacao: true,
    descricao: true,
    classificacao: true,
    avaliacao: true,
    priorizacao: true,
    tratamento: false,
    residual: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{risk.id}</Text>
        <TouchableOpacity onPress={handleDelete} activeOpacity={0.7}>
          <Text style={{ color: colors.error, fontSize: 16 }}>Excluir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Risk Summary Card */}
        <View className="px-5 pt-4 pb-2">
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.badge, { backgroundColor: riskLevel.color + '20' }]}>
                <Text style={[styles.badgeText, { color: riskLevel.color }]}>{riskLevel.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: gutLevel.color + '20' }]}>
                <Text style={[styles.badgeText, { color: gutLevel.color }]}>GUT: {risk.gutScore}</Text>
              </View>
            </View>
            <Text style={[styles.riskDesc, { color: colors.foreground }]}>{risk.descricaoRisco}</Text>
            <View style={styles.metricsRow}>
              <MetricBox label="P×I" value={String(risk.riscoInerente)} color={riskLevel.color} colors={colors} />
              <MetricBox label="Prob." value={String(risk.probabilidade)} color={colors.primary} colors={colors} />
              <MetricBox label="Impacto" value={String(risk.impacto)} color={colors.primary} colors={colors} />
              <MetricBox label="GUT" value={String(risk.gutScore)} color={gutLevel.color} colors={colors} />
            </View>
          </View>
        </View>

        {/* Collapsible Sections */}
        <View className="px-5 gap-2 pb-8">
          <CollapsibleSection
            title="1. Identificação"
            expanded={expandedSections.identificacao}
            onToggle={() => toggleSection('identificacao')}
            colors={colors}
          >
            <DetailRow label="Fonte de Risco" value={risk.fonteDeRisco} colors={colors} />
            <DetailRow label="Descrição da Fonte" value={risk.descricaoFonte} colors={colors} />
            <DetailRow label="Ameaça" value={risk.ameaca} colors={colors} />
          </CollapsibleSection>

          <CollapsibleSection
            title="2. Descrição do Risco"
            expanded={expandedSections.descricao}
            onToggle={() => toggleSection('descricao')}
            colors={colors}
          >
            <DetailRow label="Descrição (Forma 3)" value={risk.descricaoRisco} colors={colors} />
            <DetailRow label="Consequência" value={risk.consequencia} colors={colors} />
          </CollapsibleSection>

          <CollapsibleSection
            title="3. Classificação"
            expanded={expandedSections.classificacao}
            onToggle={() => toggleSection('classificacao')}
            colors={colors}
          >
            <DetailRow label="Estratégico" value={risk.estrategico} colors={colors} />
            <DetailRow label="Tipo de Risco" value={risk.tipoRisco} colors={colors} />
          </CollapsibleSection>

          <CollapsibleSection
            title="4. Avaliação"
            expanded={expandedSections.avaliacao}
            onToggle={() => toggleSection('avaliacao')}
            colors={colors}
          >
            <DetailRow label="Probabilidade" value={`${risk.probabilidade} / 5`} colors={colors} />
            <DetailRow label="Impacto" value={`${risk.impacto} / 5`} colors={colors} />
            <DetailRow label="Risco Inerente (P×I)" value={`${risk.riscoInerente} - ${riskLevel.label}`} colors={colors} />
          </CollapsibleSection>

          <CollapsibleSection
            title="5. Priorização (GUT)"
            expanded={expandedSections.priorizacao}
            onToggle={() => toggleSection('priorizacao')}
            colors={colors}
          >
            <DetailRow label="Gravidade (G)" value={`${risk.gravidade} / 5`} colors={colors} />
            <DetailRow label="Urgência (U)" value={`${risk.urgencia} / 5`} colors={colors} />
            <DetailRow label="Tendência (T)" value={`${risk.tendencia} / 5`} colors={colors} />
            <DetailRow label="GUT Score (G×U×T)" value={`${risk.gutScore} - ${gutLevel.label}`} colors={colors} />
          </CollapsibleSection>

          <CollapsibleSection
            title="6. Tratamento"
            expanded={expandedSections.tratamento}
            onToggle={() => toggleSection('tratamento')}
            colors={colors}
          >
            <DetailRow label="Estratégia (MATE)" value={risk.tratamento} colors={colors} />
            <DetailRow label="Controles" value={risk.controles} colors={colors} />
            <DetailRow label="Responsável" value={risk.responsavel} colors={colors} />
            <DetailRow label="Prazo" value={risk.prazo} colors={colors} />
            <DetailRow label="KRI" value={risk.kri} colors={colors} />
            <DetailRow label="Ação se KRI atingido" value={risk.acaoKri} colors={colors} />
            <DetailRow label="Quem mede" value={risk.quemMede} colors={colors} />
            <DetailRow label="Quando mede" value={risk.quandoMede} colors={colors} />
          </CollapsibleSection>

          <CollapsibleSection
            title="7. Risco Residual"
            expanded={expandedSections.residual}
            onToggle={() => toggleSection('residual')}
            colors={colors}
          >
            <DetailRow label="Redução Pretendida" value={`${risk.reducaoPretendida} / 5`} colors={colors} />
            <DetailRow label="Risco Residual" value={`${risk.riscoResidual} / 5`} colors={colors} />
            <DetailRow label="Eficácia do Tratamento" value={risk.eficaciaTratamento} colors={colors} />
          </CollapsibleSection>
        </View>

        {/* Edit Button */}
        <View className="px-5 pb-8">
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/risk/edit/${risk.id}` as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.editBtnText}>Editar Risco</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function CollapsibleSection({ title, expanded, onToggle, colors, children }: {
  title: string; expanded: boolean; onToggle: () => void; colors: any; children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={{ color: colors.muted, fontSize: 18 }}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.primary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function MetricBox({ label, value, color, colors }: { label: string; value: string; color: string; colors: any }) {
  return (
    <View style={[styles.metricBox, { backgroundColor: color + '10', borderColor: color + '30' }]}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { flexGrow: 1 },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 18 },
  summaryHeader: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  riskDesc: { fontSize: 15, lineHeight: 22, marginBottom: 14 },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: '800' },
  section: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  detailRow: { marginBottom: 4 },
  detailLabel: { fontSize: 12, fontWeight: '600', marginBottom: 3 },
  detailValue: { fontSize: 14, lineHeight: 20 },
  editBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
