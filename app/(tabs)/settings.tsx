import { ScrollView, Text, View, StyleSheet, useWindowDimensions } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRisks } from "@/lib/risk-context";

export default function SettingsScreen() {
  const colors = useColors();
  const { risks } = useRisks();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Sobre o Projeto</Text>
          <Text style={[styles.pageSubtitle, { color: colors.muted }]}>Informações do estudo de caso e metodologia</Text>
        </View>

        {/* Grid Layout */}
        <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
          {/* Company Info */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + '12' }]}>
                <Text style={{ fontSize: 20 }}>🏢</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Empresa - Estudo de Caso</Text>
            </View>
            <View style={styles.infoGrid}>
              <InfoItem label="Nome" value="DAMACORP" colors={colors} />
              <InfoItem label="Setor" value="Comércio Eletrônico" colors={colors} />
              <InfoItem label="Sede" value="São Paulo - SP" colors={colors} />
              <InfoItem label="Unidades" value="Barueri (SP), Rio de Janeiro (RJ), Curitiba (PR)" colors={colors} />
              <InfoItem label="Funcionários" value="~1.000 colaboradores" colors={colors} />
              <InfoItem label="Faturamento" value="R$ 350 milhões/ano" colors={colors} />
              <InfoItem label="Operação" value="24/7, 365 dias/ano" colors={colors} />
              <InfoItem label="Cadeia de Valor" value="E-commerce B2C e B2B, logística integrada, 3 centros de distribuição" colors={colors} />
            </View>
          </View>

          {/* ICAPT Methodology */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + '12' }]}>
                <Text style={{ fontSize: 20 }}>📋</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Metodologia ICAPT</Text>
            </View>
            <Text style={[styles.methodDesc, { color: colors.muted }]}>
              A metodologia ICAPT é um framework estruturado para gestão de riscos corporativos, composto por 5 etapas sequenciais que garantem uma abordagem completa e sistemática.
            </Text>
            <View style={styles.stepsContainer}>
              {[
                { n: '1', title: 'Identificação', desc: 'Identificar fontes de risco (internas e externas), ameaças e descrever o risco na Forma 3', color: '#3B82F6' },
                { n: '2', title: 'Classificação', desc: 'Classificar como estratégico (SIM/NÃO) e definir o tipo de risco conforme taxonomia', color: '#8B5CF6' },
                { n: '3', title: 'Avaliação', desc: 'Avaliar Probabilidade (1-5) × Impacto (1-5) = Risco Inerente (1-25)', color: '#F59E0B' },
                { n: '4', title: 'Priorização', desc: 'Priorizar com GUT: Gravidade × Urgência × Tendência (1-125)', color: '#F97316' },
                { n: '5', title: 'Tratamento', desc: 'Definir estratégia MATE (Mitigar, Aceitar, Transferir, Evitar), controles e KRIs', color: '#10B981' },
              ].map(step => (
                <View key={step.n} style={styles.stepRow}>
                  <View style={[styles.stepBadge, { backgroundColor: step.color + '15' }]}>
                    <Text style={[styles.stepNumber, { color: step.color }]}>{step.n}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
                    <Text style={[styles.stepDesc, { color: colors.muted }]}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Forma 3 */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + '12' }]}>
                <Text style={{ fontSize: 20 }}>📝</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Forma 3 - Descrição de Riscos</Text>
            </View>
            <Text style={[styles.methodDesc, { color: colors.muted }]}>
              A Forma 3 descreve riscos no formato padronizado: "[Fonte de risco / ameaça] ocasionando [impacto / efeitos]". Esta forma é a mais completa pois conecta causa e consequência.
            </Text>
            <View style={styles.examplesContainer}>
              {[
                'Raio ocasionando perda total de DC',
                'Ransomware ocasionando acesso ou vazamento de dados, eventual descumprimento de LGPD',
                'Sabotagem ocasionando parada operacional abrupta das operações',
              ].map((ex, idx) => (
                <View key={idx} style={[styles.exampleCard, { borderLeftColor: colors.primary, backgroundColor: colors.primary + '06' }]}>
                  <Text style={[styles.exampleLabel, { color: colors.primary }]}>Exemplo {idx + 1}</Text>
                  <Text style={[styles.exampleText, { color: colors.foreground }]}>{ex}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Statistics */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + '12' }]}>
                <Text style={{ fontSize: 20 }}>📊</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Estatísticas e Referências</Text>
            </View>
            <View style={styles.statsGrid}>
              <StatBox label="Riscos Cadastrados" value={String(risks.length)} colors={colors} />
              <StatBox label="Versão do Modelo" value="ICAPT v5" colors={colors} />
              <StatBox label="Normas Base" value="ISO 31000" colors={colors} />
              <StatBox label="Complementares" value="ISO 27001, 22301, 45000" colors={colors} />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerBrand, { color: colors.foreground }]}>Vetor Horizon</Text>
          <Text style={[styles.footerSub, { color: colors.muted }]}>Consultoria de Risco</Text>
          <Text style={[styles.footerVersion, { color: colors.muted }]}>Estudo de Caso DAMACORP - IDESP | Versão 1.0.0</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoItem({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoItem}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.statBox, { borderColor: colors.border }]}>
      <Text style={[styles.statBoxValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.statBoxLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  scrollContentDesktop: { paddingHorizontal: 32 },
  header: { paddingTop: 16, paddingBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, marginTop: 4 },
  grid: { gap: 16 },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { borderWidth: 1, borderRadius: 14, padding: 24, flex: 1, minWidth: 340 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  infoGrid: { gap: 0 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#E2E8F020' },
  infoLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  methodDesc: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  stepsContainer: { gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  stepNumber: { fontSize: 16, fontWeight: '800' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700' },
  stepDesc: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  examplesContainer: { gap: 10 },
  exampleCard: { padding: 14, borderLeftWidth: 4, borderRadius: 10 },
  exampleLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  exampleText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { flex: 1, minWidth: '40%', borderWidth: 1, borderRadius: 10, padding: 16, alignItems: 'center' },
  statBoxValue: { fontSize: 20, fontWeight: '800' },
  statBoxLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  footer: { alignItems: 'center', paddingTop: 32, paddingBottom: 20 },
  footerBrand: { fontSize: 18, fontWeight: '800' },
  footerSub: { fontSize: 13, marginTop: 2 },
  footerVersion: { fontSize: 11, marginTop: 8 },
});
