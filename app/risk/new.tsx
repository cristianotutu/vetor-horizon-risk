import { useState, useMemo } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, TextInput,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, useWindowDimensions
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRisks } from "@/lib/risk-context";
import {
  Risk, createEmptyRisk, FONTES_DE_RISCO, TIPOS_DE_RISCO,
  ESTRATEGIAS_TRATAMENTO, getRiskLevel, getGutLevel
} from "@/lib/models";
import { IconSymbol } from "@/components/ui/icon-symbol";

const STEPS = [
  { title: 'Identificação', desc: 'Fonte de risco e ameaça' },
  { title: 'Descrição', desc: 'Forma 3: ameaça + impacto' },
  { title: 'Classificação', desc: 'Tipo e estratégia' },
  { title: 'Avaliação', desc: 'Probabilidade × Impacto' },
  { title: 'Priorização', desc: 'GUT: G × U × T' },
  { title: 'Tratamento', desc: 'MATE e controles' },
  { title: 'Risco Residual', desc: 'Redução e eficácia' },
];

export default function NewRiskScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addRisk, getNextId } = useRisks();
  const [step, setStep] = useState(0);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const newId = useMemo(() => getNextId(), [getNextId]);
  const [risk, setRisk] = useState<Risk>(() => createEmptyRisk(newId));

  const updateField = (field: keyof Risk, value: any) => {
    setRisk(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'probabilidade' || field === 'impacto') {
        updated.riscoInerente = updated.probabilidade * updated.impacto;
      }
      if (field === 'gravidade' || field === 'urgencia' || field === 'tendencia') {
        updated.gutScore = updated.gravidade * updated.urgencia * updated.tendencia;
      }
      return updated;
    });
  };

  const generateForma3 = () => {
    if (risk.ameaca && risk.consequencia) {
      const desc = `${risk.ameaca} ocasionando ${risk.consequencia.charAt(0).toLowerCase() + risk.consequencia.slice(1)}`;
      updateField('descricaoRisco', desc);
    }
  };

  const handleSave = async () => {
    if (!risk.descricaoRisco.trim()) {
      Alert.alert('Erro', 'A descrição do risco é obrigatória.');
      return;
    }
    await addRisk(risk);
    router.back();
  };

  const canGoNext = () => {
    switch (step) {
      case 0: return risk.fonteDeRisco !== '';
      case 1: return risk.descricaoRisco.trim() !== '';
      case 2: return risk.tipoRisco !== '';
      default: return true;
    }
  };

  return (
    <ScreenContainer edges={isDesktop ? [] : ["top", "bottom", "left", "right"]} className="flex-1">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }, isDesktop && styles.headerDesktop]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={20} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '500', marginLeft: 8 }}>Voltar</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Novo Risco — {risk.id}</Text>
          <Text style={[styles.headerStep, { color: colors.muted }]}>Etapa {step + 1} de {STEPS.length}</Text>
        </View>

        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          {/* Desktop: Step Sidebar */}
          {isDesktop && (
            <View style={[styles.stepSidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
              {STEPS.map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.stepItem, idx === step && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => idx <= step && setStep(idx)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.stepDot, { backgroundColor: idx <= step ? colors.primary : colors.border }]}>
                    <Text style={[styles.stepDotText, { color: idx <= step ? '#fff' : colors.muted }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepTitle, { color: idx === step ? colors.primary : colors.foreground }]}>{s.title}</Text>
                    <Text style={[styles.stepDesc, { color: colors.muted }]}>{s.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Mobile: Progress Bar */}
          {!isDesktop && (
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          )}

          {/* Form Content */}
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Step Title */}
              <View style={styles.stepHeader}>
                <Text style={[styles.stepHeaderTitle, { color: colors.foreground }]}>{step + 1}. {STEPS[step].title}</Text>
                <Text style={[styles.stepHeaderDesc, { color: colors.muted }]}>{STEPS[step].desc}</Text>
              </View>

              <View style={[styles.formContent, isDesktop && styles.formContentDesktop]}>
                {step === 0 && (
                  <View style={styles.formFields}>
                    <FormField label="ID do Risco" colors={colors}>
                      <View style={[styles.readonlyField, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>{risk.id}</Text>
                      </View>
                    </FormField>
                    <FormField label="Fonte de Risco *" colors={colors}>
                      <View style={styles.optionsGrid}>
                        {FONTES_DE_RISCO.map(fonte => (
                          <TouchableOpacity
                            key={fonte}
                            style={[styles.optionChip, { borderColor: risk.fonteDeRisco === fonte ? colors.primary : colors.border }, risk.fonteDeRisco === fonte && { backgroundColor: colors.primary + '12' }]}
                            onPress={() => updateField('fonteDeRisco', fonte)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.optionText, { color: risk.fonteDeRisco === fonte ? colors.primary : colors.foreground }]}>{fonte}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </FormField>
                    <FormField label="Descrição da Fonte" colors={colors}>
                      <TextInput
                        style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                        placeholder="Descreva a fonte de risco..."
                        placeholderTextColor={colors.muted}
                        value={risk.descricaoFonte}
                        onChangeText={v => updateField('descricaoFonte', v)}
                        multiline numberOfLines={3}
                      />
                    </FormField>
                    <FormField label="Ameaça" colors={colors}>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                        placeholder="O que pode explorar essa vulnerabilidade?"
                        placeholderTextColor={colors.muted}
                        value={risk.ameaca}
                        onChangeText={v => updateField('ameaca', v)}
                        returnKeyType="done"
                      />
                    </FormField>
                  </View>
                )}

                {step === 1 && (
                  <View style={styles.formFields}>
                    <View style={[styles.infoBox, { backgroundColor: colors.primary + '08', borderColor: colors.primary }]}>
                      <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>Forma 3 — Descrição Padronizada</Text>
                      <Text style={[styles.infoBoxText, { color: colors.foreground }]}>"[Ameaça] ocasionando [impacto/efeitos]"</Text>
                    </View>
                    {risk.ameaca && risk.consequencia ? (
                      <TouchableOpacity
                        style={[styles.generateBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary }]}
                        onPress={generateForma3}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Gerar Forma 3 automaticamente</Text>
                      </TouchableOpacity>
                    ) : null}
                    <FormField label="Consequência direta ou estimada" colors={colors}>
                      <TextInput
                        style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                        placeholder="Quais as consequências caso o risco se materialize?"
                        placeholderTextColor={colors.muted}
                        value={risk.consequencia}
                        onChangeText={v => updateField('consequencia', v)}
                        multiline numberOfLines={3}
                      />
                    </FormField>
                    <FormField label="Descrição do Risco (Forma 3) *" colors={colors}>
                      <TextInput
                        style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border, minHeight: 100 }]}
                        placeholder="[Ameaça] ocasionando [impacto]..."
                        placeholderTextColor={colors.muted}
                        value={risk.descricaoRisco}
                        onChangeText={v => updateField('descricaoRisco', v)}
                        multiline numberOfLines={4}
                      />
                    </FormField>
                  </View>
                )}

                {step === 2 && (
                  <View style={styles.formFields}>
                    <FormField label="Risco Estratégico? *" colors={colors}>
                      <View style={styles.toggleRow}>
                        {(['SIM', 'NÃO'] as const).map(opt => (
                          <TouchableOpacity
                            key={opt}
                            style={[styles.toggleBtn, { borderColor: risk.estrategico === opt ? colors.primary : colors.border }, risk.estrategico === opt && { backgroundColor: colors.primary + '12' }]}
                            onPress={() => updateField('estrategico', opt)}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: risk.estrategico === opt ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 15 }}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </FormField>
                    <FormField label="Tipo de Risco *" colors={colors}>
                      <View style={styles.optionsGrid}>
                        {TIPOS_DE_RISCO.map(tipo => (
                          <TouchableOpacity
                            key={tipo}
                            style={[styles.optionChip, { borderColor: risk.tipoRisco === tipo ? colors.primary : colors.border }, risk.tipoRisco === tipo && { backgroundColor: colors.primary + '12' }]}
                            onPress={() => updateField('tipoRisco', tipo)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.optionText, { color: risk.tipoRisco === tipo ? colors.primary : colors.foreground }]}>{tipo}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </FormField>
                  </View>
                )}

                {step === 3 && (
                  <View style={styles.formFields}>
                    <SliderField label="Probabilidade" value={risk.probabilidade} onChange={v => updateField('probabilidade', v)} colors={colors} />
                    <SliderField label="Impacto" value={risk.impacto} onChange={v => updateField('impacto', v)} colors={colors} />
                    <View style={[styles.calcBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.calcLabel, { color: colors.muted }]}>Risco Inerente (P × I)</Text>
                      <View style={styles.calcRow}>
                        <Text style={[styles.calcFormula, { color: colors.muted }]}>{risk.probabilidade} × {risk.impacto} =</Text>
                        <Text style={[styles.calcValue, { color: getRiskLevel(risk.riscoInerente).color }]}>{risk.riscoInerente}</Text>
                        <View style={[styles.badge, { backgroundColor: getRiskLevel(risk.riscoInerente).color + '18' }]}>
                          <Text style={[styles.badgeText, { color: getRiskLevel(risk.riscoInerente).color }]}>{getRiskLevel(risk.riscoInerente).label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {step === 4 && (
                  <View style={styles.formFields}>
                    <SliderField label="Gravidade (G)" value={risk.gravidade} onChange={v => updateField('gravidade', v)} colors={colors} />
                    <SliderField label="Urgência (U)" value={risk.urgencia} onChange={v => updateField('urgencia', v)} colors={colors} />
                    <SliderField label="Tendência (T)" value={risk.tendencia} onChange={v => updateField('tendencia', v)} colors={colors} />
                    <View style={[styles.calcBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.calcLabel, { color: colors.muted }]}>GUT Score (G × U × T)</Text>
                      <View style={styles.calcRow}>
                        <Text style={[styles.calcFormula, { color: colors.muted }]}>{risk.gravidade} × {risk.urgencia} × {risk.tendencia} =</Text>
                        <Text style={[styles.calcValue, { color: getGutLevel(risk.gutScore).color }]}>{risk.gutScore}</Text>
                        <View style={[styles.badge, { backgroundColor: getGutLevel(risk.gutScore).color + '18' }]}>
                          <Text style={[styles.badgeText, { color: getGutLevel(risk.gutScore).color }]}>{getGutLevel(risk.gutScore).label}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {step === 5 && (
                  <View style={styles.formFields}>
                    <FormField label="Estratégia de Tratamento (MATE)" colors={colors}>
                      <View style={styles.optionsGrid}>
                        {ESTRATEGIAS_TRATAMENTO.map(est => (
                          <TouchableOpacity
                            key={est}
                            style={[styles.optionChip, { borderColor: risk.tratamento === est ? colors.primary : colors.border }, risk.tratamento === est && { backgroundColor: colors.primary + '12' }]}
                            onPress={() => updateField('tratamento', est)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.optionText, { color: risk.tratamento === est ? colors.primary : colors.foreground }]}>{est}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </FormField>
                    <FormField label="Controles Gerais do Tratamento" colors={colors}>
                      <TextInput
                        style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                        placeholder="Descreva os controles..."
                        placeholderTextColor={colors.muted}
                        value={risk.controles}
                        onChangeText={v => updateField('controles', v)}
                        multiline numberOfLines={3}
                      />
                    </FormField>
                    <View style={[styles.formRow, isDesktop && styles.formRowDesktop]}>
                      <View style={{ flex: 1 }}>
                        <FormField label="Responsável pelo Risco" colors={colors}>
                          <TextInput
                            style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                            placeholder="Ex: CIO, CFO, CISO..."
                            placeholderTextColor={colors.muted}
                            value={risk.responsavel}
                            onChangeText={v => updateField('responsavel', v)}
                            returnKeyType="done"
                          />
                        </FormField>
                      </View>
                      <View style={{ flex: 1 }}>
                        <FormField label="Prazo para Tratamento" colors={colors}>
                          <TextInput
                            style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                            placeholder="Ex: 6 meses, 12 meses..."
                            placeholderTextColor={colors.muted}
                            value={risk.prazo}
                            onChangeText={v => updateField('prazo', v)}
                            returnKeyType="done"
                          />
                        </FormField>
                      </View>
                    </View>
                    <FormField label="Key Risk Indicators (KRI)" colors={colors}>
                      <TextInput
                        style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                        placeholder="Indicadores de risco para monitoramento..."
                        placeholderTextColor={colors.muted}
                        value={risk.kri}
                        onChangeText={v => updateField('kri', v)}
                        multiline numberOfLines={3}
                      />
                    </FormField>
                  </View>
                )}

                {step === 6 && (
                  <View style={styles.formFields}>
                    <SliderField label="Redução de Risco Pretendida" value={risk.reducaoPretendida} onChange={v => updateField('reducaoPretendida', v)} colors={colors} />
                    <SliderField label="Risco Residual" value={risk.riscoResidual} onChange={v => updateField('riscoResidual', v)} colors={colors} />
                    <FormField label="Eficácia do Tratamento" colors={colors}>
                      <TextInput
                        style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                        placeholder="Como será medida a eficácia do tratamento?"
                        placeholderTextColor={colors.muted}
                        value={risk.eficaciaTratamento}
                        onChangeText={v => updateField('eficaciaTratamento', v)}
                        multiline numberOfLines={4}
                      />
                    </FormField>
                  </View>
                )}
              </View>

              <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={[styles.bottomNav, { backgroundColor: colors.surface, borderTopColor: colors.border }, isDesktop && styles.bottomNavDesktop]}>
              {step > 0 ? (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navBtnSecondary, { borderColor: colors.border }]}
                  onPress={() => setStep(s => s - 1)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>Anterior</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navBtnSecondary, { borderColor: colors.border }]}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.error, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
              )}

              {step < STEPS.length - 1 ? (
                <TouchableOpacity
                  style={[styles.navBtn, { backgroundColor: canGoNext() ? colors.primary : colors.border }]}
                  onPress={() => canGoNext() && setStep(s => s + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: canGoNext() ? '#fff' : colors.muted, fontWeight: '600' }}>Próximo</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.navBtn, { backgroundColor: '#38A169' }]}
                  onPress={handleSave}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar Risco</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function FormField({ label, colors, children }: { label: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

function SliderField({ label, value, onChange, colors }: { label: string; value: number; onChange: (v: number) => void; colors: any }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}: <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>{value}</Text></Text>
      <View style={styles.sliderRow}>
        {[1, 2, 3, 4, 5].map(n => {
          const levelColor = n <= 2 ? '#38A169' : n === 3 ? '#DD6B20' : n === 4 ? '#F97316' : '#E53E3E';
          const isSelected = value === n;
          return (
            <TouchableOpacity
              key={n}
              style={[styles.sliderBtn, { borderColor: isSelected ? levelColor : colors.border }, isSelected && { backgroundColor: levelColor + '15' }]}
              onPress={() => onChange(n)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sliderBtnText, { color: isSelected ? levelColor : colors.foreground }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1 },
  headerDesktop: { paddingHorizontal: 32 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerStep: { fontSize: 13 },
  mainLayout: { flex: 1 },
  mainLayoutDesktop: { flexDirection: 'row' },
  stepSidebar: { width: 240, borderRightWidth: 1, paddingVertical: 16 },
  stepItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  stepDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepDotText: { fontSize: 13, fontWeight: '700' },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: '600' },
  stepDesc: { fontSize: 11, marginTop: 1 },
  progressBar: { height: 3 },
  progressFill: { height: 3, borderRadius: 2 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  scrollContentDesktop: { paddingHorizontal: 40, paddingTop: 8 },
  stepHeader: { paddingTop: 20, paddingBottom: 16 },
  stepHeaderTitle: { fontSize: 22, fontWeight: '800' },
  stepHeaderDesc: { fontSize: 14, marginTop: 4 },
  formContent: { maxWidth: 800 },
  formContentDesktop: { maxWidth: 700 },
  formFields: { gap: 20 },
  formRow: { gap: 16 },
  formRowDesktop: { flexDirection: 'row' },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  readonlyField: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  optionText: { fontSize: 13, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  infoBox: { padding: 16, borderRadius: 12, borderWidth: 1, borderLeftWidth: 4 },
  infoBoxTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoBoxText: { fontSize: 14, fontStyle: 'italic' },
  generateBtn: { padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  sliderRow: { flexDirection: 'row', gap: 10 },
  sliderBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  sliderBtnText: { fontSize: 18, fontWeight: '700' },
  calcBox: { borderWidth: 1, borderRadius: 14, padding: 20, alignItems: 'center' },
  calcLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calcFormula: { fontSize: 16 },
  calcValue: { fontSize: 40, fontWeight: '800' },
  badge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 14, fontWeight: '700' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, gap: 12 },
  bottomNavDesktop: { paddingHorizontal: 40, maxWidth: 780 },
  navBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  navBtnSecondary: { borderWidth: 1 },
});
