import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  useWindowDimensions, StyleSheet, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';

const WIZARD_PREFIX = '@icapt_wizard_menu_';

interface WizardStep {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  tips: string[];
  color: string;
}

// Wizard data per menu/screen
export const MENU_WIZARDS: Record<string, WizardStep> = {
  dashboard: {
    icon: '\u{1F6E1}\u{FE0F}',
    title: 'Dashboard',
    subtitle: 'Visão Consolidada de Riscos',
    description: 'O Dashboard é seu ponto de partida. Aqui você encontra o Fluxo de Risco (Inerente → Deslocamento → Residual) com 3 matrizes lado a lado, cards de resumo por criticidade, Top 10 GUT, Distribuição por Tipo e Impacto Financeiro Consolidado.',
    tips: [
      'As 3 matrizes mostram o fluxo: risco bruto → controles → risco residual',
      'Clique nas células da Matriz para ver os riscos daquele quadrante',
      'Os valores em R$ mostram a perda média esperada por quadrante',
      'Clique nos cards de criticidade para filtrar riscos',
      'O Resumo Executivo mostra KPIs para apresentação ao conselho',
    ],
    color: '#00E5FF',
  },
  risks: {
    icon: '\u{1F4CB}',
    title: 'Riscos',
    subtitle: 'Catálogo Completo ICAPT v5',
    description: 'Todos os 35 riscos mapeados com busca e filtros avançados. Cada risco pode ser expandido para ver todos os campos do ICAPT v5: identificação, classificação, avaliação, priorização GUT, tratamento e impacto financeiro.',
    tips: [
      'Use a busca para localizar riscos por ID, descrição ou tipo',
      'Filtre por nível (Crítico, Alto, Médio, Baixo)',
      'Clique em um risco para ver todos os detalhes ICAPT v5',
      'O botão + permite adicionar novos riscos ao catálogo',
    ],
    color: '#FF8C00',
  },
  evolution: {
    icon: '\u{1F4C8}',
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
  strategic: {
    icon: '\u{1F4CA}',
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
  report: {
    icon: '\u{1F4D1}',
    title: 'Relatório Executivo',
    subtitle: 'Apresentação ao Conselho',
    description: 'Relatório com 10 slides seguindo o roteiro 10-20-30 para apresentação ao conselho de administração. Inclui panorama de riscos, impacto financeiro FAIR, governança COSO/RISK IT, investimentos preventivos e próximos passos.',
    tips: [
      'Navegue entre os 10 slides com as setas ou indicadores de página',
      'Cada slide segue o padrão de apresentação executiva (sem jargões)',
      'Os valores financeiros usam frameworks FAIR, COSO e RISK IT (ISACA)',
      'Use como material de apoio para reuniões do conselho',
    ],
    color: '#A78BFA',
  },
  tables: {
    icon: '\u{1F4D1}',
    title: 'Tabelas',
    subtitle: 'Referência Técnica',
    description: 'Tabelas de referência da metodologia ICAPT v5: Impacto detalhado (Financeiro, Reputação, Operacional, Legal, Ambiental, Social), critérios GUT, níveis de probabilidade e faixas de classificação de risco.',
    tips: [
      'Consulte a Tabela de Impacto para justificar classificações',
      'A Tabela GUT explica os critérios de Gravidade, Urgência e Tendência',
      'Use como material de apoio durante workshops de avaliação de riscos',
    ],
    color: '#F472B6',
  },
  settings: {
    icon: '\u{2699}\u{FE0F}',
    title: 'Sobre',
    subtitle: 'Informações e Configurações',
    description: 'Informações sobre o aplicativo, versão, equipe de desenvolvimento e configurações. Aqui você também pode reabrir o tutorial de qualquer menu.',
    tips: [
      'Veja os créditos e informações do projeto',
      'Reabra o tutorial de qualquer menu a qualquer momento',
    ],
    color: '#6B8A7A',
  },
};

// ─── Context for per-menu wizard ───────────────────────────
interface WizardContextType {
  triggerWizard: (menuKey: string) => void;
  resetWizard: (menuKey: string) => void;
  resetAllWizards: () => void;
}

const WizardContext = createContext<WizardContextType>({
  triggerWizard: () => {},
  resetWizard: () => {},
  resetAllWizards: () => {},
});

export function useWizard() {
  return useContext(WizardContext);
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const triggerWizard = useCallback(async (menuKey: string) => {
    try {
      const seen = await AsyncStorage.getItem(WIZARD_PREFIX + menuKey);
      if (!seen) {
        setActiveMenu(menuKey);
        await AsyncStorage.setItem(WIZARD_PREFIX + menuKey, 'true');
      }
    } catch {}
  }, []);

  const resetWizard = useCallback(async (menuKey: string) => {
    try {
      await AsyncStorage.removeItem(WIZARD_PREFIX + menuKey);
      setActiveMenu(menuKey);
    } catch {}
  }, []);

  const resetAllWizards = useCallback(async () => {
    try {
      const keys = Object.keys(MENU_WIZARDS).map(k => WIZARD_PREFIX + k);
      await AsyncStorage.multiRemove(keys);
    } catch {}
  }, []);

  const handleClose = useCallback(() => {
    setActiveMenu(null);
  }, []);

  const step = activeMenu ? MENU_WIZARDS[activeMenu] : null;

  return (
    <WizardContext.Provider value={{ triggerWizard, resetWizard, resetAllWizards }}>
      {children}
      {step && (
        <Modal visible={!!activeMenu} transparent animationType="fade" onRequestClose={handleClose}>
          <View style={s.overlay}>
            <View style={[s.card, { maxWidth: isDesktop ? 520 : width - 32 }]}>
              {/* Header */}
              <View style={s.header}>
                <View style={s.headerLeft}>
                  <Text style={s.headerIcon}>{step.icon}</Text>
                  <Text style={s.headerTitle}>{step.title}</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={s.skipBtn}>
                  <Text style={s.skipText}>Fechar</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
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

              {/* Footer */}
              <View style={s.navRow}>
                <Text style={s.stepCounter}>Primeira visita</Text>
                <TouchableOpacity onPress={handleClose} style={[s.navBtn, { backgroundColor: step.color }]}>
                  <Text style={s.navBtnText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </WizardContext.Provider>
  );
}

// ─── Legacy WizardOverlay (now empty, kept for compatibility) ───
export function WizardOverlay() {
  return null;
}

// ─── Button to reopen wizard from settings ───────────────────
export function WizardButton({ onPress }: { onPress?: () => void }) {
  const { resetWizard } = useWizard();
  const [menuToOpen, setMenuToOpen] = useState<string | null>(null);

  return (
    <View style={{ gap: 8 }}>
      <Text style={wb.sectionTitle}>REABRIR TUTORIAL</Text>
      {Object.entries(MENU_WIZARDS).map(([key, step]) => (
        <TouchableOpacity
          key={key}
          onPress={() => {
            resetWizard(key);
            onPress?.();
          }}
          style={wb.button}
          activeOpacity={0.7}
        >
          <Text style={wb.icon}>{step.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={wb.title}>{step.title}</Text>
            <Text style={wb.subtitle}>{step.subtitle}</Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color="#6B8A7A" />
        </TouchableOpacity>
      ))}
    </View>
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
  navBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, minWidth: 120, alignItems: 'center' },
  navBtnText: { fontSize: 14, fontWeight: '800', color: '#0D1117', fontFamily: 'monospace' },
  stepCounter: { fontSize: 12, fontWeight: '700', color: '#6B8A7A', fontFamily: 'monospace' },
});

const wb = StyleSheet.create({
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#00E5FF', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 4 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111820', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1A3A2A' },
  icon: { fontSize: 20 },
  title: { fontSize: 13, fontWeight: '700', color: '#E0F0EA', fontFamily: 'monospace' },
  subtitle: { fontSize: 10, color: '#6B8A7A', fontFamily: 'monospace', marginTop: 1 },
});
