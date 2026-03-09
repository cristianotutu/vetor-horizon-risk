import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRisks } from "@/lib/risk-context";

export default function SettingsScreen() {
  const colors = useColors();
  const { risks } = useRisks();

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-2 pb-4">
          <Text className="text-2xl font-bold text-foreground">Configurações</Text>
        </View>

        {/* Company Info */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Empresa</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <InfoRow label="Nome" value="DAMACORP" colors={colors} />
            <InfoRow label="Setor" value="Comércio Eletrônico" colors={colors} />
            <InfoRow label="Sede" value="São Paulo - SP" colors={colors} />
            <InfoRow label="Unidades" value="Barueri (SP), Rio de Janeiro (RJ), Curitiba (PR)" colors={colors} />
            <InfoRow label="Funcionários" value="~1.000" colors={colors} />
            <InfoRow label="Faturamento" value="R$ 350 milhões/ano" colors={colors} />
            <InfoRow label="Operação" value="24/7, 365 dias/ano" colors={colors} />
          </View>
        </View>

        {/* ICAPT Methodology */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Metodologia ICAPT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.methodText, { color: colors.foreground }]}>
              A metodologia ICAPT (Identificação, Classificação, Avaliação, Priorização e Tratamento) é um framework estruturado para gestão de riscos corporativos.
            </Text>
            <View style={styles.methodSteps}>
              <StepItem number="1" title="Identificação" desc="Identificar fontes de risco, ameaças e descrever o risco" colors={colors} />
              <StepItem number="2" title="Classificação" desc="Classificar como estratégico e definir o tipo de risco" colors={colors} />
              <StepItem number="3" title="Avaliação" desc="Avaliar probabilidade × impacto = risco inerente" colors={colors} />
              <StepItem number="4" title="Priorização" desc="Priorizar com GUT (Gravidade × Urgência × Tendência)" colors={colors} />
              <StepItem number="5" title="Tratamento" desc="Definir estratégia MATE e controles de tratamento" colors={colors} />
            </View>
          </View>
        </View>

        {/* Forma 3 */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Forma 3 - Descrição de Riscos</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.methodText, { color: colors.foreground, marginBottom: 12 }]}>
              A Forma 3 descreve riscos no formato: "[Fonte de risco / ameaça] ocasionando [impacto / efeitos]"
            </Text>
            <ExampleItem
              text="Raio ocasionando perda total de DC"
              colors={colors}
            />
            <ExampleItem
              text="Ransomware ocasionando acesso ou vazamento de dados, eventual descumprimento de LGPD"
              colors={colors}
            />
            <ExampleItem
              text="Sabotagem ocasionando parada operacional abrupta das operações"
              colors={colors}
            />
          </View>
        </View>

        {/* Stats */}
        <View className="px-5 mb-5">
          <Text className="text-lg font-semibold text-foreground mb-3">Estatísticas</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <InfoRow label="Riscos cadastrados" value={String(risks.length)} colors={colors} />
            <InfoRow label="Normas de referência" value="ISO 31000, ISO 27001, ISO 22301, ISO 45000" colors={colors} />
            <InfoRow label="Versão do modelo" value="ICAPT v5" colors={colors} />
          </View>
        </View>

        {/* About */}
        <View className="px-5 mb-5">
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.aboutTitle, { color: colors.foreground }]}>ICAPT Risk Manager</Text>
            <Text style={[styles.aboutText, { color: colors.muted }]}>
              Aplicativo de gestão de riscos corporativos baseado na metodologia ICAPT. Desenvolvido para o estudo de caso DAMACORP - IDESP.
            </Text>
            <Text style={[styles.aboutVersion, { color: colors.muted }]}>Versão 1.0.0</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function StepItem({ number, title, desc, colors }: { number: string; title: string; desc: string; colors: any }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepNumber, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.stepNumberText, { color: colors.primary }]}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.stepDesc, { color: colors.muted }]}>{desc}</Text>
      </View>
    </View>
  );
}

function ExampleItem({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={[styles.exampleItem, { backgroundColor: colors.primary + '08', borderLeftColor: colors.primary }]}>
      <Text style={[styles.exampleText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#E2E5E920' },
  infoLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  methodText: { fontSize: 14, lineHeight: 20 },
  methodSteps: { marginTop: 12, gap: 10 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { fontSize: 14, fontWeight: '700' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600' },
  stepDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  exampleItem: { padding: 12, borderLeftWidth: 3, borderRadius: 8, marginBottom: 8 },
  exampleText: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  aboutTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  aboutText: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 8 },
  aboutVersion: { fontSize: 12, textAlign: 'center' },
});
