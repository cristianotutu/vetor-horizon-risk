import { ScrollView, Text, View, StyleSheet, useWindowDimensions, Image, TouchableOpacity, Linking, Platform } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRisks } from "@/lib/risk-context";
import { useEngine } from "@/lib/engine-context";
import { WizardButton } from "@/components/wizard-overlay";
import { ScenarioPreset, DEFAULT_CONFIG } from "@/lib/risk-engine";

const vetorHorizonLogo = require("@/assets/images/vetor-horizon-logo.png");
const MONO = Platform.OS === 'web' ? 'monospace' : undefined;

type SettingsTab = 'engine' | 'about';

export default function SettingsScreen() {
  const colors = useColors();
  const { risks } = useRisks();
  const engine = useEngine();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [activeTab, setActiveTab] = useState<SettingsTab>('engine');

  const renderTabButton = (tab: SettingsTab, label: string) => (
    <TouchableOpacity
      key={tab}
      onPress={() => setActiveTab(tab)}
      style={[
        s.tabBtn,
        { borderColor: activeTab === tab ? '#00E5FF' : colors.border, backgroundColor: activeTab === tab ? '#00E5FF10' : 'transparent' },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[s.tabBtnText, { color: activeTab === tab ? '#00E5FF' : colors.muted, fontFamily: MONO }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="flex-1" edges={isDesktop ? [] : ["top", "left", "right"]}>
      <ScrollView contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]} showsVerticalScrollIndicator={false}>
        {/* Tab Switcher */}
        <View style={s.tabRow}>
          {renderTabButton('engine', 'MOTOR DE RISCO')}
          {renderTabButton('about', 'SOBRE')}
        </View>

        {activeTab === 'engine' ? (
          <EnginePanel engine={engine} colors={colors} isDesktop={isDesktop} />
        ) : (
          <AboutPanel colors={colors} risks={risks} isDesktop={isDesktop} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// ============================================================
// ENGINE PANEL
// ============================================================

function EnginePanel({ engine, colors, isDesktop }: { engine: ReturnType<typeof useEngine>; colors: any; isDesktop: boolean }) {
  const { config, portfolioMetrics, setScenario, setWeights, setAppetite, resetConfig } = engine;
  const pm = portfolioMetrics;

  return (
    <View style={s.panelContainer}>
      {/* Portfolio Health Summary */}
      {pm && (
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: '#00E5FF', fontFamily: MONO }]}>SAÚDE DO PORTFÓLIO</Text>
          <View style={[s.metricsRow, isDesktop && { flexDirection: 'row' }]}>
            <MetricBox label="Score Médio" value={pm.averageCompositeScore.toFixed(1)} unit="/100" color={pm.averageCompositeScore > 55 ? '#FF3D3D' : pm.averageCompositeScore > 25 ? '#FFD600' : '#00FF88'} colors={colors} />
            <MetricBox label="Score Máximo" value={pm.maxCompositeScore.toFixed(1)} unit="/100" color={pm.maxCompositeScore > 75 ? '#FF3D3D' : '#FF8C00'} colors={colors} />
            <MetricBox label="Confiança Média" value={`${pm.averageConfidence}%`} unit="" color={pm.averageConfidence > 70 ? '#00FF88' : '#FFD600'} colors={colors} />
            <MetricBox label="Eficácia Controles" value={`${pm.averageControlEffectiveness}%`} unit="" color={pm.averageControlEffectiveness > 50 ? '#00FF88' : '#FF8C00'} colors={colors} />
          </View>
          <View style={[s.metricsRow, isDesktop && { flexDirection: 'row' }, { marginTop: 6 }]}>
            <MetricBox label="Intoleráveis" value={String(pm.byAppetite.intolerable)} unit={`/${pm.totalRisks}`} color="#FF3D3D" colors={colors} />
            <MetricBox label="Toleráveis" value={String(pm.byAppetite.tolerable)} unit={`/${pm.totalRisks}`} color="#FFD600" colors={colors} />
            <MetricBox label="Aceitáveis" value={String(pm.byAppetite.acceptable)} unit={`/${pm.totalRisks}`} color="#00FF88" colors={colors} />
            <MetricBox label="Exposição Total" value={`R$ ${(pm.scenarioAdjustedExposure / 1000000).toFixed(0)}M`} unit="" color="#FF8C00" colors={colors} />
          </View>
          {pm.criticalWarnings > 0 && (
            <View style={[s.warningBanner, { backgroundColor: '#FF3D3D10', borderColor: '#FF3D3D30' }]}>
              <Text style={{ color: '#FF3D3D', fontSize: 11, fontWeight: '700', fontFamily: MONO }}>
                ⚠ {pm.criticalWarnings} ALERTAS CRÍTICOS | {pm.totalWarnings} alertas totais
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Scenario Selection */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.sectionTitle, { color: '#00E5FF', fontFamily: MONO }]}>CENÁRIO ATIVO</Text>
        <Text style={[s.sectionDesc, { color: colors.muted }]}>
          Selecione o cenário para ajustar multiplicadores de probabilidade e impacto financeiro em todo o sistema.
        </Text>
        <View style={[s.scenarioRow, isDesktop && { flexDirection: 'row' }]}>
          {(['baseline', 'stress', 'extreme'] as ScenarioPreset[]).map(sc => {
            const mult = config.scenarioMultipliers[sc];
            const isActive = config.scenario === sc;
            const scColor = sc === 'baseline' ? '#00FF88' : sc === 'stress' ? '#FFD600' : '#FF3D3D';
            return (
              <TouchableOpacity
                key={sc}
                onPress={() => setScenario(sc)}
                style={[
                  s.scenarioCard,
                  { borderColor: isActive ? scColor : colors.border, backgroundColor: isActive ? scColor + '10' : 'transparent' },
                ]}
                activeOpacity={0.7}
              >
                <View style={[s.scenarioBadge, { backgroundColor: scColor + '20' }]}>
                  <Text style={{ color: scColor, fontSize: 11, fontWeight: '800', fontFamily: MONO }}>{mult.label.toUpperCase()}</Text>
                </View>
                <Text style={[s.scenarioDesc, { color: colors.muted }]}>{mult.description}</Text>
                <View style={s.scenarioMults}>
                  <Text style={[s.multText, { color: colors.foreground, fontFamily: MONO }]}>Prob: ×{mult.probabilityMultiplier}</Text>
                  <Text style={[s.multText, { color: colors.foreground, fontFamily: MONO }]}>Fin: ×{mult.financialMultiplier}</Text>
                  <Text style={[s.multText, { color: colors.foreground, fontFamily: MONO }]}>Urg: ×{mult.urgencyMultiplier}</Text>
                </View>
                {isActive && <View style={[s.activeBar, { backgroundColor: scColor }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Weight Calibration */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.sectionTitle, { color: '#00E5FF', fontFamily: MONO }]}>CALIBRAÇÃO DE PESOS</Text>
        <Text style={[s.sectionDesc, { color: colors.muted }]}>
          Pesos normalizados para o Composite Score. A soma é automaticamente normalizada para 100%.
        </Text>
        <Text style={[s.formulaBox, { color: '#00E5FF', backgroundColor: '#00E5FF08', borderColor: '#00E5FF20', fontFamily: MONO }]}>
          Score = (Inerente × W₁ + GUT × W₂ + Financeiro × W₃) − Controles × W₄
        </Text>
        <View style={s.weightsGrid}>
          <WeightSlider label="Risco Inerente (P×I)" value={config.weights.inherent} color="#FF8C00" onAdjust={(delta) => setWeights({ ...config.weights, inherent: Math.max(0.05, config.weights.inherent + delta) })} />
          <WeightSlider label="GUT Score" value={config.weights.gut} color="#FFD600" onAdjust={(delta) => setWeights({ ...config.weights, gut: Math.max(0.05, config.weights.gut + delta) })} />
          <WeightSlider label="Impacto Financeiro" value={config.weights.financial} color="#FF3D3D" onAdjust={(delta) => setWeights({ ...config.weights, financial: Math.max(0.05, config.weights.financial + delta) })} />
          <WeightSlider label="Eficácia Controles" value={config.weights.controlEffectiveness} color="#00FF88" onAdjust={(delta) => setWeights({ ...config.weights, controlEffectiveness: Math.max(0.05, config.weights.controlEffectiveness + delta) })} />
        </View>
      </View>

      {/* Risk Appetite Thresholds */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.sectionTitle, { color: '#00E5FF', fontFamily: MONO }]}>APETITE DE RISCO</Text>
        <Text style={[s.sectionDesc, { color: colors.muted }]}>
          Thresholds que classificam cada risco como Aceitável, Tolerável ou Intolerável.
        </Text>
        <View style={s.appetiteVisual}>
          <View style={s.appetiteBar}>
            <View style={[s.appetiteSegment, { flex: config.appetite.acceptable, backgroundColor: '#00FF8830' }]}>
              <Text style={[s.appetiteLabel, { color: '#00FF88', fontFamily: MONO }]}>ACEITÁVEL</Text>
              <Text style={[s.appetiteValue, { color: '#00FF88', fontFamily: MONO }]}>0-{config.appetite.acceptable}</Text>
            </View>
            <View style={[s.appetiteSegment, { flex: config.appetite.tolerable - config.appetite.acceptable, backgroundColor: '#FFD60030' }]}>
              <Text style={[s.appetiteLabel, { color: '#FFD600', fontFamily: MONO }]}>TOLERÁVEL</Text>
              <Text style={[s.appetiteValue, { color: '#FFD600', fontFamily: MONO }]}>{config.appetite.acceptable}-{config.appetite.tolerable}</Text>
            </View>
            <View style={[s.appetiteSegment, { flex: 100 - config.appetite.tolerable, backgroundColor: '#FF3D3D30' }]}>
              <Text style={[s.appetiteLabel, { color: '#FF3D3D', fontFamily: MONO }]}>INTOLERÁVEL</Text>
              <Text style={[s.appetiteValue, { color: '#FF3D3D', fontFamily: MONO }]}>{config.appetite.tolerable}-100</Text>
            </View>
          </View>
          <View style={s.appetiteControls}>
            <ThresholdControl label="Limite Aceitável" value={config.appetite.acceptable} color="#00FF88" onAdjust={(delta) => setAppetite({ ...config.appetite, acceptable: Math.max(5, Math.min(config.appetite.tolerable - 5, config.appetite.acceptable + delta)) })} />
            <ThresholdControl label="Limite Tolerável" value={config.appetite.tolerable} color="#FFD600" onAdjust={(delta) => setAppetite({ ...config.appetite, tolerable: Math.max(config.appetite.acceptable + 5, Math.min(95, config.appetite.tolerable + delta)) })} />
            <ThresholdControl label="Perda Máx. Aceitável" value={config.appetite.maxAcceptableLoss / 1000000} color="#FF8C00" suffix="M" onAdjust={(delta) => setAppetite({ ...config.appetite, maxAcceptableLoss: Math.max(1000000, config.appetite.maxAcceptableLoss + delta * 1000000) })} />
          </View>
        </View>
      </View>

      {/* Risk Layers Distribution */}
      {pm && (
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: '#00E5FF', fontFamily: MONO }]}>DISTRIBUIÇÃO POR CAMADA</Text>
          <View style={s.layersGrid}>
            {([
              { key: 'Regulatório', color: '#8B5CF6', icon: '⚖️' },
              { key: 'Operacional', color: '#FF8C00', icon: '⚙️' },
              { key: 'Estratégico', color: '#3B82F6', icon: '🎯' },
              { key: 'Reputacional', color: '#F43F5E', icon: '🛡️' },
            ] as const).map(layer => (
              <View key={layer.key} style={[s.layerCard, { borderColor: layer.color + '30', backgroundColor: layer.color + '08' }]}>
                <Text style={{ fontSize: 18 }}>{layer.icon}</Text>
                <Text style={[s.layerCount, { color: layer.color, fontFamily: MONO }]}>{pm.byLayer[layer.key]}</Text>
                <Text style={[s.layerLabel, { color: colors.muted, fontFamily: MONO }]}>{layer.key}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Model Transparency */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.sectionTitle, { color: '#00E5FF', fontFamily: MONO }]}>TRANSPARÊNCIA DO MODELO</Text>
        <View style={s.transparencyGrid}>
          <TransparencyItem title="Composite Score" desc="Score = (Inerente×W₁ + GUT×W₂ + Financeiro×W₃) − Controles×W₄. Escala 0-100. Cada componente normalizado individualmente." colors={colors} />
          <TransparencyItem title="Risco Inerente" desc="P×I (1-25), normalizado para 0-100. P ajustada pelo multiplicador de cenário. Sem controles aplicados." colors={colors} />
          <TransparencyItem title="GUT Score" desc="G×U×T (1-125), normalizado para 0-100. U ajustada pelo multiplicador de urgência do cenário." colors={colors} />
          <TransparencyItem title="Impacto Financeiro" desc="ALE (FAIR) ou Perda Média Esperada, normalizado para 0-100 (escala: R$ 0 = 0, R$ 50M = 100). Ajustado pelo multiplicador financeiro." colors={colors} />
          <TransparencyItem title="Eficácia Controles" desc="Score 0-100 baseado em: controles documentados, responsável, prazo, KRI, medição e eficácia. Reduz o composite score proporcionalmente ao peso W₄." colors={colors} />
          <TransparencyItem title="Correlações" desc="Efeitos cascata entre riscos (ex: cibersegurança → reputação). Força 0-1. Boost no score do risco-alvo proporcional à força × 5pts." colors={colors} />
        </View>
      </View>

      {/* Reset Button */}
      <TouchableOpacity
        onPress={resetConfig}
        style={[s.resetBtn, { borderColor: '#FF3D3D30' }]}
        activeOpacity={0.7}
      >
        <Text style={{ color: '#FF3D3D', fontSize: 12, fontWeight: '700', fontFamily: MONO }}>RESTAURAR CONFIGURAÇÃO PADRÃO</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// ABOUT PANEL (existing content)
// ============================================================

function AboutPanel({ colors, risks, isDesktop }: { colors: any; risks: any[]; isDesktop: boolean }) {
  return (
    <View style={s.panelContainer}>
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <Image source={vetorHorizonLogo} style={{ width: isDesktop ? 160 : 120, height: isDesktop ? 160 : 120, borderRadius: 16 }} resizeMode="contain" />
        <Text style={[s.aboutTitle, { color: colors.foreground }]}>Sobre o Projeto</Text>
        <Text style={[s.aboutSub, { color: colors.muted }]}>Informações do estudo de caso e metodologia</Text>
      </View>

      <View style={[s.aboutGrid, isDesktop && { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {/* Company Info */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1, minWidth: 280 }]}>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>🏢 Empresa - Estudo de Caso</Text>
          <View style={s.infoGrid}>
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
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1, minWidth: 280 }]}>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>📋 Metodologia ICAPT</Text>
          <Text style={[s.sectionDesc, { color: colors.muted }]}>
            Framework estruturado para gestão de riscos corporativos em 5 etapas sequenciais.
          </Text>
          {[
            { n: '1', title: 'Identificação', desc: 'Fontes de risco, ameaças e Forma 3', color: '#3B82F6' },
            { n: '2', title: 'Classificação', desc: 'Estratégico (SIM/NÃO) e tipo de risco', color: '#8B5CF6' },
            { n: '3', title: 'Avaliação', desc: 'P (1-5) × I (1-5) = Risco Inerente (1-25)', color: '#F59E0B' },
            { n: '4', title: 'Priorização', desc: 'GUT: G × U × T (1-125)', color: '#F97316' },
            { n: '5', title: 'Tratamento', desc: 'MATE + Controles + KRIs', color: '#10B981' },
          ].map(step => (
            <View key={step.n} style={s.stepRow}>
              <View style={[s.stepBadge, { backgroundColor: step.color + '15' }]}>
                <Text style={{ color: step.color, fontSize: 11, fontWeight: '800' }}>{step.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{step.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1, minWidth: 280 }]}>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>📊 Estatísticas e Referências</Text>
          <View style={s.statsGrid}>
            <StatBox label="Riscos" value={String(risks.length)} colors={colors} />
            <StatBox label="Modelo" value="ICAPT v5" colors={colors} />
            <StatBox label="Base" value="ISO 31000" colors={colors} />
            <StatBox label="Complementar" value="ISO 27001" colors={colors} />
          </View>
        </View>

        {/* Consultants */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1, minWidth: 280 }]}>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>👥 Consultores - Vetor Horizon</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { name: 'Cristiano Siqueira Israel', color: '#00E5FF' },
              { name: 'Danielli Mezavilla Pinto', color: '#FF8C00' },
              { name: 'Karolina Guimarães Negrizolo', color: '#00FF88' },
              { name: 'Matheus Augusto Arduini', color: '#FFD600' },
            ].map((c, idx) => (
              <View key={idx} style={{ flex: 1, minWidth: 120, backgroundColor: c.color + '08', borderWidth: 1, borderColor: c.color + '25', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.color + '20', borderWidth: 2, borderColor: c.color + '40', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: c.color }}>{c.name.charAt(0)}</Text>
                </View>
                <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{c.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Link + Tutorial */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 8 }]}>
        <Text style={[s.cardTitle, { color: colors.foreground }]}>🌐 Acesso Público</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://vetor-horizon-risk.netlify.app')}
          style={[s.linkCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>https://vetor-horizon-risk.netlify.app</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 10 }}>
        <WizardButton />
      </View>

      <View style={s.footer}>
        <Text style={[s.footerBrand, { color: colors.foreground }]}>Vetor Horizon</Text>
        <Text style={{ color: colors.muted, fontSize: 10 }}>Consultoria de Risco | DAMACORP - IDESP | v1.0.0</Text>
      </View>
    </View>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MetricBox({ label, value, unit, color, colors }: { label: string; value: string; unit: string; color: string; colors: any }) {
  return (
    <View style={[s.metricBox, { borderColor: color + '30', backgroundColor: color + '08' }]}>
      <Text style={{ color, fontSize: 18, fontWeight: '800', fontFamily: MONO }}>{value}<Text style={{ fontSize: 10, fontWeight: '500' }}>{unit}</Text></Text>
      <Text style={{ color: colors.muted, fontSize: 9, fontFamily: MONO, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function WeightSlider({ label, value, color, onAdjust }: { label: string; value: number; color: string; onAdjust: (delta: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <View style={s.weightRow}>
      <Text style={{ color: '#9BA1A6', fontSize: 11, flex: 1, fontFamily: MONO }}>{label}</Text>
      <View style={s.weightControls}>
        <TouchableOpacity onPress={() => onAdjust(-0.05)} style={[s.weightBtn, { borderColor: color + '40' }]} activeOpacity={0.6}>
          <Text style={{ color, fontSize: 14, fontWeight: '700' }}>−</Text>
        </TouchableOpacity>
        <View style={[s.weightValue, { backgroundColor: color + '15' }]}>
          <Text style={{ color, fontSize: 13, fontWeight: '800', fontFamily: MONO }}>{pct}%</Text>
        </View>
        <TouchableOpacity onPress={() => onAdjust(0.05)} style={[s.weightBtn, { borderColor: color + '40' }]} activeOpacity={0.6}>
          <Text style={{ color, fontSize: 14, fontWeight: '700' }}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.weightBar, { backgroundColor: color + '15' }]}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color + '60', borderRadius: 2 }} />
      </View>
    </View>
  );
}

function ThresholdControl({ label, value, color, suffix, onAdjust }: { label: string; value: number; color: string; suffix?: string; onAdjust: (delta: number) => void }) {
  return (
    <View style={s.thresholdRow}>
      <Text style={{ color: '#9BA1A6', fontSize: 11, flex: 1, fontFamily: MONO }}>{label}</Text>
      <View style={s.weightControls}>
        <TouchableOpacity onPress={() => onAdjust(-5)} style={[s.weightBtn, { borderColor: color + '40' }]} activeOpacity={0.6}>
          <Text style={{ color, fontSize: 14, fontWeight: '700' }}>−</Text>
        </TouchableOpacity>
        <View style={[s.weightValue, { backgroundColor: color + '15' }]}>
          <Text style={{ color, fontSize: 13, fontWeight: '800', fontFamily: MONO }}>{suffix === 'M' ? `R$ ${value.toFixed(0)}M` : value}</Text>
        </View>
        <TouchableOpacity onPress={() => onAdjust(5)} style={[s.weightBtn, { borderColor: color + '40' }]} activeOpacity={0.6}>
          <Text style={{ color, fontSize: 14, fontWeight: '700' }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TransparencyItem({ title, desc, colors }: { title: string; desc: string; colors: any }) {
  return (
    <View style={s.transparencyItem}>
      <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }}>{desc}</Text>
    </View>
  );
}

function InfoItem({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={s.infoItem}>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '500', flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', flex: 2, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[s.statBox, { borderColor: colors.border }]}>
      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 10, paddingBottom: 8 },
  scrollDesktop: { paddingHorizontal: 14 },
  tabRow: { flexDirection: 'row', gap: 6, paddingVertical: 8 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tabBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  panelContainer: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 10, padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  sectionDesc: { fontSize: 11, lineHeight: 15, marginBottom: 8 },
  metricsRow: { gap: 6 },
  metricBox: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, alignItems: 'center', minWidth: 80 },
  warningBanner: { marginTop: 8, padding: 8, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
  scenarioRow: { gap: 6 },
  scenarioCard: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, position: 'relative', overflow: 'hidden' },
  scenarioBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginBottom: 6 },
  scenarioDesc: { fontSize: 10, lineHeight: 14, marginBottom: 6 },
  scenarioMults: { gap: 2 },
  multText: { fontSize: 10, fontWeight: '600' },
  activeBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  formulaBox: { fontSize: 11, fontWeight: '600', padding: 8, borderRadius: 6, borderWidth: 1, marginBottom: 8, textAlign: 'center' },
  weightsGrid: { gap: 6 },
  weightRow: { gap: 4 },
  weightControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weightBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  weightValue: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, minWidth: 50, alignItems: 'center' },
  weightBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  appetiteVisual: { gap: 8 },
  appetiteBar: { flexDirection: 'row', height: 36, borderRadius: 6, overflow: 'hidden' },
  appetiteSegment: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  appetiteLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  appetiteValue: { fontSize: 10, fontWeight: '600' },
  appetiteControls: { gap: 6 },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  layersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  layerCard: { flex: 1, minWidth: 80, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  layerCount: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  layerLabel: { fontSize: 9, marginTop: 2 },
  transparencyGrid: { gap: 6 },
  transparencyItem: { padding: 8, backgroundColor: '#00E5FF06', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#00E5FF30' },
  resetBtn: { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4 },
  aboutTitle: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  aboutSub: { fontSize: 12, marginTop: 2 },
  aboutGrid: { gap: 8 },
  infoGrid: { gap: 0 },
  infoItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#E2E8F020' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statBox: { flex: 1, minWidth: '40%' as any, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  stepBadge: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  linkCard: { padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  footer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  footerBrand: { fontSize: 15, fontWeight: '800' },
});
