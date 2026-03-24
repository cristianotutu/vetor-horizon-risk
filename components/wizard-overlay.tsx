import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  useWindowDimensions, StyleSheet, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';

const WIZARD_SEEN_KEY = '@icapt_wizard_seen_v2';

interface WizardStep {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  tips: string[];
  color: string;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    icon: '🛡️',
    title: 'Dashboard',
    subtitle: 'Visão Consolidada',
    description: 'O Dashboard é seu ponto de partida. Aqui você encontra a Matriz de Risco interativa com valores financeiros em cada quadrante, cards de resumo por criticidade, Top 10 GUT e o Impacto Financeiro Consolidado.',
    tips: [
      'Clique nas células da Matriz para ver os riscos daquele quadrante',
      'Os valores em R$ mostram a perda média esperada por quadrante',
      'Clique nos cards de criticidade para filtrar riscos',
      'O Resumo Executivo mostra KPIs para apresentação ao conselho',
    ],
    color: '#00E5FF',
  },
  {
    icon: '📋',
    title: 'Riscos',
    subtitle: 'Catálogo Completo',
    description: 'A tela de Riscos apresenta todos os 35 riscos mapeados com busca e filtros. Cada risco pode ser expandido para ver todos os campos do ICAPT v5: identificação, classificação, avaliação, priorização GUT, tratamento e impacto financeiro.',
    tips: [
      'Use a busca para localizar riscos por ID, descrição ou tipo',
      'Filtre por nível (Crítico, Alto, Médio, Baixo)',
      'Clique em um risco para ver todos os detalhes ICAPT v5',
      'O botão + permite adicionar novos riscos ao catálogo',
    ],
    color: '#FF8C00',
  },
  {
    icon: '📈',
    title: 'Evolução',
    subtitle: 'Comparativo entre Versões',
    description: 'Acompanhe como os riscos evoluíram entre as Aulas 03, 04, 05 e 06. Veja quais riscos são novos, quais foram modificados e quais permaneceram inalterados, com matrizes comparativas lado a lado.',
    tips: [
      'Selecione o modo de comparação: 3v4, 4v5, 5v6 ou 3v6',
      'Cards coloridos mostram novos (verde), modificados (amarelo) e inalterados',
      'Clique nos cards para ver a lista de riscos em cada categoria',
      'As matrizes lado a lado mostram a migração de riscos entre quadrantes',
    ],
    color: '#4ADE80',
  },
  {
    icon: '📊',
    title: 'Estratégico',
    subtitle: 'Visão para o Board',
    description: 'A tela mais importante para apresentações ao conselho. Consolida distribuição por tipo, análise MATE, TPRM e os quadros interativos de Investimento Preventivo e Impacto Financeiro com listas priorizadas por ROI.',
    tips: [
      'Clique no card de Investimento para ver riscos priorizados por ROI',
      'Clique no card de Impacto para ver riscos por maior exposição',
      'A análise MATE mostra a distribuição das estratégias de tratamento',
      'Use esta tela como roteiro principal para apresentação ao conselho',
    ],
    color: '#FFD600',
  },
  {
    icon: '📑',
    title: 'Tabelas',
    subtitle: 'Referência Técnica',
    description: 'Tabelas de referência da metodologia ICAPT v5: Impacto detalhado (Financeiro, Reputação, Operacional, Legal, Ambiental, Social), critérios GUT, níveis de probabilidade e faixas de classificação de risco.',
    tips: [
      'Consulte a Tabela de Impacto para justificar classificações',
      'A Tabela GUT explica os critérios de Gravidade, Urgência e Tendência',
      'Use como material de apoio durante workshops de avaliação de riscos',
    ],
    color: '#A78BFA',
  },
  {
    icon: '🤖',
    title: 'Assistente de IA',
    subtitle: 'Perguntas Inteligentes',
    description: 'O botão flutuante no canto inferior direito abre o Assistente de IA, que tem conhecimento completo dos 35 riscos da DAMACORP. Faça perguntas em linguagem natural sobre riscos, priorização, investimentos e recomendações.',
    tips: [
      'Pergunte: "Quais são os 5 riscos com maior ROI?"',
      'Pergunte: "Resuma a exposição financeira por tipo de risco"',
      'Pergunte: "O que o conselho deveria priorizar nos próximos 3 meses?"',
      'As respostas são baseadas nos dados reais dos 35 riscos',
    ],
    color: '#F472B6',
  },
];

export function WizardOverlay() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  useEffect(() => {
    checkFirstTime();
  }, []);

  const checkFirstTime = async () => {
    try {
      const seen = await AsyncStorage.getItem(WIZARD_SEEN_KEY);
      if (!seen) {
        setVisible(true);
      }
    } catch {}
  };

  const handleClose = useCallback(async () => {
    setVisible(false);
    if (dontShowAgain) {
      try {
        await AsyncStorage.setItem(WIZARD_SEEN_KEY, 'true');
      } catch {}
    }
  }, [dontShowAgain]);

  const handleNext = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  }, [currentStep, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const step = WIZARD_STEPS[currentStep];
  const isLast = currentStep === WIZARD_STEPS.length - 1;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={[s.card, { maxWidth: isDesktop ? 520 : width - 32 }]}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerIcon}>🎯</Text>
              <Text style={s.headerTitle}>Como Usar</Text>
            </View>
            <TouchableOpacity onPress={handleSkip} style={s.skipBtn}>
              <Text style={s.skipText}>Pular</Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={s.progressRow}>
            {WIZARD_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  s.progressDot,
                  { backgroundColor: i === currentStep ? step.color : i < currentStep ? step.color + '60' : '#1E2A3A' },
                ]}
              />
            ))}
          </View>

          {/* Step Content */}
          <ScrollView style={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[s.iconCircle, { backgroundColor: step.color + '20', borderColor: step.color + '40' }]}>
              <Text style={s.stepIcon}>{step.icon}</Text>
            </View>

            <Text style={[s.stepTitle, { color: step.color }]}>{step.title}</Text>
            <Text style={s.stepSubtitle}>{step.subtitle}</Text>

            <Text style={s.stepDescription}>{step.description}</Text>

            <View style={s.tipsContainer}>
              <Text style={s.tipsTitle}>Dicas:</Text>
              {step.tips.map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <View style={[s.tipBullet, { backgroundColor: step.color }]} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Don't show again checkbox */}
          {isLast && (
            <TouchableOpacity
              onPress={() => setDontShowAgain(!dontShowAgain)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 8 }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                borderColor: dontShowAgain ? '#00E5FF' : '#6B8A7A',
                backgroundColor: dontShowAgain ? '#00E5FF' + '20' : 'transparent',
                justifyContent: 'center', alignItems: 'center',
              }}>
                {dontShowAgain && <Text style={{ color: '#00E5FF', fontSize: 12, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={{ color: '#6B8A7A', fontSize: 12, fontFamily: 'monospace' }}>Não mostrar novamente</Text>
            </TouchableOpacity>
          )}

          {/* Navigation */}
          <View style={s.navRow}>
            <TouchableOpacity
              onPress={handlePrev}
              style={[s.navBtn, s.navBtnSecondary, { opacity: currentStep === 0 ? 0.3 : 1 }]}
              disabled={currentStep === 0}
            >
              <Text style={s.navBtnSecondaryText}>Anterior</Text>
            </TouchableOpacity>

            <Text style={s.stepCounter}>{currentStep + 1} / {WIZARD_STEPS.length}</Text>

            <TouchableOpacity
              onPress={handleNext}
              style={[s.navBtn, { backgroundColor: step.color }]}
            >
              <Text style={s.navBtnText}>{isLast ? 'Começar' : 'Próximo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Button to reopen wizard from settings/about
export function WizardButton({ onPress }: { onPress?: () => void }) {
  const [visible, setVisible] = useState(false);

  const handlePress = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(WIZARD_SEEN_KEY);
    } catch {}
    setVisible(true);
    onPress?.();
  }, [onPress]);

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={wb.button}>
        <Text style={wb.icon}>🎯</Text>
        <View>
          <Text style={wb.title}>Como Usar</Text>
          <Text style={wb.subtitle}>Tutorial interativo da plataforma</Text>
        </View>
        <IconSymbol name="chevron.right" size={18} color="#6B8A7A" />
      </TouchableOpacity>
      {visible && <WizardOverlayControlled onClose={() => setVisible(false)} />}
    </>
  );
}

function WizardOverlayControlled({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleNext = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentStep, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const step = WIZARD_STEPS[currentStep];
  const isLast = currentStep === WIZARD_STEPS.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.card, { maxWidth: isDesktop ? 520 : width - 32 }]}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerIcon}>🎯</Text>
              <Text style={s.headerTitle}>Como Usar</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.skipBtn}>
              <Text style={s.skipText}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <View style={s.progressRow}>
            {WIZARD_STEPS.map((_, i) => (
              <View key={i} style={[s.progressDot, { backgroundColor: i === currentStep ? step.color : i < currentStep ? step.color + '60' : '#1E2A3A' }]} />
            ))}
          </View>
          <ScrollView style={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[s.iconCircle, { backgroundColor: step.color + '20', borderColor: step.color + '40' }]}>
              <Text style={s.stepIcon}>{step.icon}</Text>
            </View>
            <Text style={[s.stepTitle, { color: step.color }]}>{step.title}</Text>
            <Text style={s.stepSubtitle}>{step.subtitle}</Text>
            <Text style={s.stepDescription}>{step.description}</Text>
            <View style={s.tipsContainer}>
              <Text style={s.tipsTitle}>Dicas:</Text>
              {step.tips.map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <View style={[s.tipBullet, { backgroundColor: step.color }]} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={s.navRow}>
            <TouchableOpacity onPress={handlePrev} style={[s.navBtn, s.navBtnSecondary, { opacity: currentStep === 0 ? 0.3 : 1 }]} disabled={currentStep === 0}>
              <Text style={s.navBtnSecondaryText}>Anterior</Text>
            </TouchableOpacity>
            <Text style={s.stepCounter}>{currentStep + 1} / {WIZARD_STEPS.length}</Text>
            <TouchableOpacity onPress={handleNext} style={[s.navBtn, { backgroundColor: step.color }]}>
              <Text style={s.navBtnText}>{isLast ? 'Fechar' : 'Próximo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { backgroundColor: '#0D1117', borderRadius: 20, borderWidth: 1, borderColor: '#1A3A2A', width: '100%', maxHeight: '85%', overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#00E5FF', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1A2A3A' },
  skipText: { fontSize: 12, fontWeight: '700', color: '#6B8A7A', fontFamily: 'monospace' },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingVertical: 12 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, maxHeight: 400 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16 },
  stepIcon: { fontSize: 32 },
  stepTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', fontFamily: 'monospace', letterSpacing: 1 },
  stepSubtitle: { fontSize: 14, fontWeight: '600', color: '#6B8A7A', textAlign: 'center', marginTop: 4, fontFamily: 'monospace' },
  stepDescription: { fontSize: 14, color: '#9BA8B0', lineHeight: 22, marginTop: 16, textAlign: 'center' },
  tipsContainer: { marginTop: 20, backgroundColor: '#111820', borderRadius: 12, padding: 16, marginBottom: 16 },
  tipsTitle: { fontSize: 12, fontWeight: '800', color: '#00E5FF', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipBullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  tipText: { fontSize: 13, color: '#9BA8B0', lineHeight: 20, flex: 1 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1A3A2A' },
  navBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, minWidth: 100, alignItems: 'center' },
  navBtnSecondary: { backgroundColor: '#1A2A3A' },
  navBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: '#6B8A7A', fontFamily: 'monospace' },
  navBtnText: { fontSize: 14, fontWeight: '800', color: '#0D1117', fontFamily: 'monospace' },
  stepCounter: { fontSize: 12, fontWeight: '700', color: '#6B8A7A', fontFamily: 'monospace' },
});

const wb = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111820', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1A3A2A' },
  icon: { fontSize: 24 },
  title: { fontSize: 14, fontWeight: '700', color: '#E0F0EA', fontFamily: 'monospace' },
  subtitle: { fontSize: 11, color: '#6B8A7A', fontFamily: 'monospace', marginTop: 2 },
});
