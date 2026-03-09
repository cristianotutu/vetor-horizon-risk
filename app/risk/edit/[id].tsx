import { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, TextInput,
  StyleSheet, Alert, KeyboardAvoidingView, Platform
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRisks } from "@/lib/risk-context";
import {
  Risk, FONTES_DE_RISCO, TIPOS_DE_RISCO,
  ESTRATEGIAS_TRATAMENTO, getRiskLevel, getGutLevel
} from "@/lib/models";

const STEPS = [
  'Identificação',
  'Descrição',
  'Classificação',
  'Avaliação',
  'Priorização',
  'Tratamento',
  'Risco Residual',
];

export default function EditRiskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getRisk, updateRisk } = useRisks();
  const [step, setStep] = useState(0);
  const [risk, setRisk] = useState<Risk | null>(null);

  useEffect(() => {
    const existing = getRisk(id || '');
    if (existing) {
      setRisk({ ...existing });
    }
  }, [id]);

  if (!risk) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text className="text-muted text-base">Risco não encontrado</Text>
      </ScreenContainer>
    );
  }

  const updateField = (field: keyof Risk, value: any) => {
    setRisk(prev => {
      if (!prev) return prev;
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
    await updateRisk(risk);
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={{ color: colors.error, fontSize: 16 }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Editar {risk.id}</Text>
          <Text style={[styles.headerStep, { color: colors.muted }]}>{step + 1}/{STEPS.length}</Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: colors.primary }]} />
        </View>

        {/* Step Title */}
        <View className="px-5 py-3">
          <Text className="text-lg font-bold text-foreground">{step + 1}. {STEPS[step]}</Text>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <View className="px-5 gap-4">
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>ID do Risco</Text>
                <View style={[styles.readonlyField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ color: colors.foreground, fontSize: 15 }}>{risk.id}</Text>
                </View>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Fonte de Risco</Text>
                <View style={styles.optionsGrid}>
                  {FONTES_DE_RISCO.map(fonte => (
                    <TouchableOpacity
                      key={fonte}
                      style={[
                        styles.optionChip,
                        { borderColor: risk.fonteDeRisco === fonte ? colors.primary : colors.border },
                        risk.fonteDeRisco === fonte && { backgroundColor: colors.primary + '15' }
                      ]}
                      onPress={() => updateField('fonteDeRisco', fonte)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, { color: risk.fonteDeRisco === fonte ? colors.primary : colors.foreground }]}>
                        {fonte}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Descrição da Fonte</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={risk.descricaoFonte}
                  onChangeText={v => updateField('descricaoFonte', v)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Ameaça</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={risk.ameaca}
                  onChangeText={v => updateField('ameaca', v)}
                  returnKeyType="done"
                />
              </View>
            </View>
          )}

          {step === 1 && (
            <View className="px-5 gap-4">
              <View style={[styles.infoBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>Forma 3</Text>
                <Text style={[styles.infoBoxText, { color: colors.foreground }]}>
                  "[Ameaça] ocasionando [impacto/efeitos]"
                </Text>
              </View>
              {risk.ameaca && risk.consequencia ? (
                <TouchableOpacity
                  style={[styles.generateBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={generateForma3}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                    Gerar Forma 3 automaticamente
                  </Text>
                </TouchableOpacity>
              ) : null}
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Consequência</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={risk.consequencia}
                  onChangeText={v => updateField('consequencia', v)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Descrição do Risco (Forma 3)</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border, minHeight: 100 }]}
                  value={risk.descricaoRisco}
                  onChangeText={v => updateField('descricaoRisco', v)}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View className="px-5 gap-4">
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Risco Estratégico?</Text>
                <View style={styles.toggleRow}>
                  {(['SIM', 'NÃO'] as const).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.toggleBtn,
                        { borderColor: risk.estrategico === opt ? colors.primary : colors.border },
                        risk.estrategico === opt && { backgroundColor: colors.primary + '15' }
                      ]}
                      onPress={() => updateField('estrategico', opt)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: risk.estrategico === opt ? colors.primary : colors.foreground, fontWeight: '600' }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Tipo de Risco</Text>
                <View style={styles.optionsGrid}>
                  {TIPOS_DE_RISCO.map(tipo => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.optionChip,
                        { borderColor: risk.tipoRisco === tipo ? colors.primary : colors.border },
                        risk.tipoRisco === tipo && { backgroundColor: colors.primary + '15' }
                      ]}
                      onPress={() => updateField('tipoRisco', tipo)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, { color: risk.tipoRisco === tipo ? colors.primary : colors.foreground }]}>
                        {tipo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {step === 3 && (
            <View className="px-5 gap-4">
              <SliderField label="Probabilidade" value={risk.probabilidade} onChange={v => updateField('probabilidade', v)} colors={colors} />
              <SliderField label="Impacto" value={risk.impacto} onChange={v => updateField('impacto', v)} colors={colors} />
              <View style={[styles.calcBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.calcLabel, { color: colors.muted }]}>Risco Inerente (P × I)</Text>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcValue, { color: getRiskLevel(risk.riscoInerente).color }]}>{risk.riscoInerente}</Text>
                  <View style={[styles.badge, { backgroundColor: getRiskLevel(risk.riscoInerente).color + '20' }]}>
                    <Text style={[styles.badgeText, { color: getRiskLevel(risk.riscoInerente).color }]}>{getRiskLevel(risk.riscoInerente).label}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {step === 4 && (
            <View className="px-5 gap-4">
              <SliderField label="Gravidade (G)" value={risk.gravidade} onChange={v => updateField('gravidade', v)} colors={colors} />
              <SliderField label="Urgência (U)" value={risk.urgencia} onChange={v => updateField('urgencia', v)} colors={colors} />
              <SliderField label="Tendência (T)" value={risk.tendencia} onChange={v => updateField('tendencia', v)} colors={colors} />
              <View style={[styles.calcBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.calcLabel, { color: colors.muted }]}>GUT Score (G × U × T)</Text>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcValue, { color: getGutLevel(risk.gutScore).color }]}>{risk.gutScore}</Text>
                  <View style={[styles.badge, { backgroundColor: getGutLevel(risk.gutScore).color + '20' }]}>
                    <Text style={[styles.badgeText, { color: getGutLevel(risk.gutScore).color }]}>{getGutLevel(risk.gutScore).label}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {step === 5 && (
            <View className="px-5 gap-4">
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Estratégia de Tratamento (MATE)</Text>
                <View style={styles.optionsGrid}>
                  {ESTRATEGIAS_TRATAMENTO.map(est => (
                    <TouchableOpacity
                      key={est}
                      style={[
                        styles.optionChip,
                        { borderColor: risk.tratamento === est ? colors.primary : colors.border },
                        risk.tratamento === est && { backgroundColor: colors.primary + '15' }
                      ]}
                      onPress={() => updateField('tratamento', est)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, { color: risk.tratamento === est ? colors.primary : colors.foreground }]}>
                        {est}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Controles</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={risk.controles}
                  onChangeText={v => updateField('controles', v)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Responsável</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={risk.responsavel}
                  onChangeText={v => updateField('responsavel', v)}
                  returnKeyType="done"
                />
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Prazo</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={risk.prazo}
                  onChangeText={v => updateField('prazo', v)}
                  returnKeyType="done"
                />
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>KRI</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={risk.kri}
                  onChangeText={v => updateField('kri', v)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          )}

          {step === 6 && (
            <View className="px-5 gap-4">
              <SliderField label="Redução Pretendida" value={risk.reducaoPretendida} onChange={v => updateField('reducaoPretendida', v)} colors={colors} />
              <SliderField label="Risco Residual" value={risk.riscoResidual} onChange={v => updateField('riscoResidual', v)} colors={colors} />
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Eficácia do Tratamento</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={risk.eficaciaTratamento}
                  onChangeText={v => updateField('eficaciaTratamento', v)}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={[styles.bottomNav, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {step > 0 ? (
            <TouchableOpacity
              style={[styles.navBtn, { borderColor: colors.border }]}
              onPress={() => setStep(s => s - 1)}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>Anterior</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}

          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.primary }]}
              onPress={() => setStep(s => s + 1)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Próximo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.success }]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar Alterações</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function SliderField({ label, value, onChange, colors }: { label: string; value: number; onChange: (v: number) => void; colors: any }) {
  return (
    <View>
      <Text style={[styles.label, { color: colors.muted }]}>{label}: <Text style={{ color: colors.primary, fontWeight: '700' }}>{value}</Text></Text>
      <View style={styles.sliderRow}>
        {[1, 2, 3, 4, 5].map(n => {
          const levelColor = n <= 2 ? '#10B981' : n === 3 ? '#F59E0B' : n === 4 ? '#F97316' : '#EF4444';
          const isSelected = value === n;
          return (
            <TouchableOpacity
              key={n}
              style={[
                styles.sliderBtn,
                { borderColor: isSelected ? levelColor : colors.border },
                isSelected && { backgroundColor: levelColor + '20' }
              ]}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerStep: { fontSize: 14 },
  progressBar: { height: 3 },
  progressFill: { height: 3, borderRadius: 2 },
  scrollContent: { flexGrow: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  readonlyField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionText: { fontSize: 13, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  infoBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  infoBoxTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoBoxText: { fontSize: 13, fontStyle: 'italic' },
  generateBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  sliderRow: { flexDirection: 'row', gap: 8 },
  sliderBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  sliderBtnText: { fontSize: 16, fontWeight: '700' },
  calcBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  calcLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calcValue: { fontSize: 36, fontWeight: '800' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
});
