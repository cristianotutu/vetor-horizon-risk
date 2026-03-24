// ============================================================
// RISK ENGINE CORE — Motor de Cálculo de Risco Decision-Grade
// Framework: COSO ERM + ISO 31000 + FAIR + ISACA RISK IT
// ============================================================

import { Risk, FinancialImpact } from './models';
import { FINANCIAL_DATA } from './financial-data';

// ============================================================
// 1. TIPOS E CONFIGURAÇÃO DO MOTOR
// ============================================================

export type ScenarioPreset = 'baseline' | 'stress' | 'extreme';
export type RiskLayer = 'Regulatório' | 'Operacional' | 'Estratégico' | 'Reputacional';
export type IndicatorType = 'leading' | 'lagging';

export interface EngineConfig {
  /** Cenário ativo */
  scenario: ScenarioPreset;
  /** Pesos normalizados para composite score (soma = 1.0) */
  weights: NormalizedWeights;
  /** Thresholds de apetite de risco */
  appetite: RiskAppetiteThresholds;
  /** Multiplicadores de cenário */
  scenarioMultipliers: Record<ScenarioPreset, ScenarioMultiplier>;
  /** Fator de correlação global (0 = independentes, 1 = totalmente correlacionados) */
  correlationFactor: number;
}

export interface NormalizedWeights {
  /** Peso do Risco Inerente (P×I) no composite score */
  inherent: number;
  /** Peso do GUT Score no composite score */
  gut: number;
  /** Peso do Impacto Financeiro (ALE normalizado) no composite score */
  financial: number;
  /** Peso da Eficácia dos Controles no composite score */
  controlEffectiveness: number;
}

export interface RiskAppetiteThresholds {
  /** Score abaixo do qual o risco é aceito */
  acceptable: number;
  /** Score acima do qual o risco é tolerado com monitoramento */
  tolerable: number;
  /** Score acima do qual o risco é inaceitável (requer ação imediata) */
  intolerable: number;
  /** Perda financeira máxima aceitável (R$) */
  maxAcceptableLoss: number;
}

export interface ScenarioMultiplier {
  label: string;
  description: string;
  /** Multiplicador de probabilidade */
  probabilityMultiplier: number;
  /** Multiplicador de impacto financeiro */
  financialMultiplier: number;
  /** Multiplicador de urgência (GUT) */
  urgencyMultiplier: number;
}

export interface CompositeScore {
  /** Score composto final (0-100) */
  total: number;
  /** Contribuição do risco inerente */
  inherentContribution: number;
  /** Contribuição do GUT */
  gutContribution: number;
  /** Contribuição financeira */
  financialContribution: number;
  /** Contribuição da eficácia dos controles (reduz o score) */
  controlContribution: number;
  /** Fórmula legível */
  formula: string;
  /** Drivers (fatores que mais influenciam) */
  drivers: string[];
  /** Premissas do cálculo */
  assumptions: string[];
  /** Nível de confiança do modelo (0-100%) */
  confidence: number;
}

export interface RiskCorrelation {
  sourceId: string;
  targetId: string;
  /** Tipo de correlação */
  type: 'cascading' | 'amplifying' | 'mitigating';
  /** Força da correlação (0-1) */
  strength: number;
  /** Descrição da relação */
  description: string;
}

export interface RiskIndicator {
  riskId: string;
  name: string;
  type: IndicatorType;
  /** Valor atual */
  currentValue: number;
  /** Threshold de alerta */
  warningThreshold: number;
  /** Threshold crítico */
  criticalThreshold: number;
  /** Unidade de medida */
  unit: string;
  /** Status derivado */
  status: 'normal' | 'warning' | 'critical';
  /** Tendência */
  trend: 'improving' | 'stable' | 'deteriorating';
}

export interface SensitivityResult {
  variable: string;
  baseValue: number;
  /** Impacto de +10% na variável sobre o composite score */
  impactPlus10: number;
  /** Impacto de -10% na variável sobre o composite score */
  impactMinus10: number;
  /** Elasticidade (% mudança no score / % mudança na variável) */
  elasticity: number;
}

export interface EnrichedRisk extends Risk {
  /** Score composto calculado pelo engine */
  compositeScore: CompositeScore;
  /** Camada de risco (framework) */
  riskLayer: RiskLayer;
  /** Classificação de apetite */
  appetiteStatus: 'acceptable' | 'tolerable' | 'intolerable';
  /** Score ajustado pelo cenário */
  scenarioAdjustedScore: number;
  /** Indicadores */
  indicators: RiskIndicator[];
  /** Correlações */
  correlations: RiskCorrelation[];
  /** Análise de sensibilidade */
  sensitivity: SensitivityResult[];
  /** Score de eficácia do controle (0-100) */
  controlEffectivenessScore: number;
  /** Score residual normalizado (0-100) */
  residualNormalized: number;
  /** Ranking global */
  globalRank: number;
  /** Early warning signals */
  earlyWarnings: string[];
}

// ============================================================
// 2. CONFIGURAÇÃO PADRÃO
// ============================================================

export const DEFAULT_CONFIG: EngineConfig = {
  scenario: 'baseline',
  weights: {
    inherent: 0.30,
    gut: 0.25,
    financial: 0.30,
    controlEffectiveness: 0.15,
  },
  appetite: {
    acceptable: 25,
    tolerable: 55,
    intolerable: 75,
    maxAcceptableLoss: 5000000, // R$ 5M
  },
  scenarioMultipliers: {
    baseline: {
      label: 'Baseline',
      description: 'Cenário normal de operação. Probabilidades e impactos conforme avaliação padrão.',
      probabilityMultiplier: 1.0,
      financialMultiplier: 1.0,
      urgencyMultiplier: 1.0,
    },
    stress: {
      label: 'Stress',
      description: 'Cenário adverso: crise econômica, perda de cliente-chave, ou incidente cibernético moderado. Probabilidades +30%, impactos financeiros +50%.',
      probabilityMultiplier: 1.3,
      financialMultiplier: 1.5,
      urgencyMultiplier: 1.2,
    },
    extreme: {
      label: 'Extreme',
      description: 'Cenário catastrófico: pandemia, ataque cibernético massivo, ou colapso de fornecedor crítico. Probabilidades +60%, impactos financeiros +100%.',
      probabilityMultiplier: 1.6,
      financialMultiplier: 2.0,
      urgencyMultiplier: 1.5,
    },
  },
  correlationFactor: 0.3,
};

// ============================================================
// 3. MAPEAMENTO DE CAMADAS DE RISCO
// ============================================================

const LAYER_MAP: Record<string, RiskLayer> = {
  'Risco Estratégico': 'Estratégico',
  'Risco Operacional': 'Operacional',
  'Risco Financeiro': 'Estratégico',
  'Risco de Conformidade (Regulatório e Legal)': 'Regulatório',
  'Risco de Segurança da Informação (Cibernético)': 'Operacional',
  'Risco Tecnológico': 'Operacional',
  'Risco Reputacional': 'Reputacional',
  'Risco Ambiental e Climático': 'Regulatório',
  'Risco Humano (Pessoas e Cultura Organizacional)': 'Operacional',
  'Risco de Cadeia de Suprimentos': 'Operacional',
};

// ============================================================
// 4. CORRELAÇÕES ENTRE RISCOS (EFEITOS CASCATA)
// ============================================================

export const RISK_CORRELATIONS: RiskCorrelation[] = [
  // Cibersegurança → Reputação
  { sourceId: 'R005', targetId: 'R009', type: 'cascading', strength: 0.8, description: 'Ataque cibernético causa dano reputacional direto' },
  // Cibersegurança → Conformidade
  { sourceId: 'R005', targetId: 'R012', type: 'cascading', strength: 0.7, description: 'Vazamento de dados gera multas LGPD' },
  // Fornecedor SAP → Operação
  { sourceId: 'R003', targetId: 'R006', type: 'amplifying', strength: 0.6, description: 'Indisponibilidade SAP amplifica erros de precificação' },
  // Segurança física → Operação
  { sourceId: 'R004', targetId: 'R010', type: 'cascading', strength: 0.5, description: 'Assalto em CD causa parada operacional' },
  // Turnover → Cultura → Operação
  { sourceId: 'R011', targetId: 'R013', type: 'amplifying', strength: 0.6, description: 'Alta rotatividade deteriora cultura organizacional' },
  // Regulatório → Financeiro
  { sourceId: 'R012', targetId: 'R008', type: 'cascading', strength: 0.7, description: 'Multas regulatórias impactam resultado financeiro' },
  // Fornecedor único → Cadeia de suprimentos
  { sourceId: 'R003', targetId: 'R022', type: 'amplifying', strength: 0.7, description: 'Dependência de fornecedor único amplifica risco de cadeia' },
  // Reputação → Receita
  { sourceId: 'R009', targetId: 'R006', type: 'cascading', strength: 0.5, description: 'Dano reputacional reduz vendas e receita' },
  // Clima → Cadeia de suprimentos
  { sourceId: 'R014', targetId: 'R022', type: 'amplifying', strength: 0.4, description: 'Eventos climáticos disrumpem cadeia logística' },
  // Governança → Todos os estratégicos
  { sourceId: 'R007', targetId: 'R008', type: 'amplifying', strength: 0.5, description: 'Falha de governança amplifica riscos financeiros' },
  // TPRM → Operacional
  { sourceId: 'R015', targetId: 'R010', type: 'cascading', strength: 0.6, description: 'Falha de terceiro causa interrupção operacional' },
  // Cibersegurança → Financeiro
  { sourceId: 'R005', targetId: 'R008', type: 'cascading', strength: 0.6, description: 'Ataque cibernético gera perdas financeiras diretas' },
];

// ============================================================
// 5. INDICADORES LEADING/LAGGING POR RISCO
// ============================================================

function generateIndicators(risk: Risk): RiskIndicator[] {
  const indicators: RiskIndicator[] = [];
  const id = risk.id;

  // Indicador LAGGING universal: score de risco inerente
  indicators.push({
    riskId: id,
    name: 'Risco Inerente (P×I)',
    type: 'lagging',
    currentValue: risk.riscoInerente,
    warningThreshold: 12,
    criticalThreshold: 20,
    unit: 'score',
    status: risk.riscoInerente >= 20 ? 'critical' : risk.riscoInerente >= 12 ? 'warning' : 'normal',
    trend: 'stable',
  });

  // Indicador LAGGING: GUT Score
  indicators.push({
    riskId: id,
    name: 'GUT Score',
    type: 'lagging',
    currentValue: risk.gutScore,
    warningThreshold: 27,
    criticalThreshold: 64,
    unit: 'score',
    status: risk.gutScore >= 64 ? 'critical' : risk.gutScore >= 27 ? 'warning' : 'normal',
    trend: risk.tendencia >= 4 ? 'deteriorating' : risk.tendencia <= 2 ? 'improving' : 'stable',
  });

  // Indicadores LEADING baseados no tipo de risco
  if (risk.tipoRisco.includes('Cibernético') || risk.tipoRisco.includes('Tecnológico')) {
    indicators.push({
      riskId: id, name: 'Vulnerabilidades Não Corrigidas', type: 'leading',
      currentValue: risk.riscoInerente >= 20 ? 15 : risk.riscoInerente >= 12 ? 8 : 3,
      warningThreshold: 10, criticalThreshold: 20, unit: 'count',
      status: risk.riscoInerente >= 20 ? 'critical' : 'normal',
      trend: risk.tendencia >= 4 ? 'deteriorating' : 'stable',
    });
  }

  if (risk.tipoRisco.includes('Operacional')) {
    indicators.push({
      riskId: id, name: 'Incidentes Operacionais/Mês', type: 'leading',
      currentValue: risk.riscoInerente >= 15 ? 5 : 2,
      warningThreshold: 3, criticalThreshold: 8, unit: 'count/mês',
      status: risk.riscoInerente >= 15 ? 'warning' : 'normal',
      trend: 'stable',
    });
  }

  if (risk.tipoRisco.includes('Conformidade') || risk.tipoRisco.includes('Regulatório')) {
    indicators.push({
      riskId: id, name: 'Dias para Próximo Deadline Regulatório', type: 'leading',
      currentValue: risk.riscoInerente >= 15 ? 15 : 90,
      warningThreshold: 30, criticalThreshold: 7, unit: 'dias',
      status: risk.riscoInerente >= 15 ? 'warning' : 'normal',
      trend: 'stable',
    });
  }

  if (risk.tipoRisco.includes('Humano') || risk.tipoRisco.includes('Cultura')) {
    indicators.push({
      riskId: id, name: 'Taxa de Turnover Mensal', type: 'leading',
      currentValue: risk.riscoInerente >= 12 ? 8.5 : 3.2,
      warningThreshold: 5, criticalThreshold: 10, unit: '%',
      status: risk.riscoInerente >= 12 ? 'warning' : 'normal',
      trend: risk.tendencia >= 4 ? 'deteriorating' : 'stable',
    });
  }

  return indicators;
}

// ============================================================
// 6. FUNÇÕES DE CÁLCULO DO MOTOR
// ============================================================

/** Normaliza um valor para escala 0-100 */
function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/** Calcula eficácia do controle (0-100) baseado nos dados disponíveis */
function calculateControlEffectiveness(risk: Risk): number {
  let score = 0;
  let factors = 0;

  // Tem controles definidos?
  if (risk.controles && risk.controles.trim().length > 10) {
    score += 20; factors++;
    // Mais controles = mais eficaz
    const controlCount = risk.controles.split(/[;\n,]/).filter(c => c.trim().length > 3).length;
    score += Math.min(15, controlCount * 3);
  }

  // Tem responsável?
  if (risk.responsavel && risk.responsavel.trim().length > 2) {
    score += 10; factors++;
  }

  // Tem prazo?
  if (risk.prazo && risk.prazo.trim().length > 0) {
    score += 10; factors++;
  }

  // Tem KRI?
  if (risk.kri && risk.kri.trim().length > 5) {
    score += 15; factors++;
  }

  // Tem medição?
  if (risk.quemMede && risk.quemMede.trim().length > 2) {
    score += 10; factors++;
  }

  // Tem eficácia documentada?
  if (risk.eficaciaTratamento && risk.eficaciaTratamento.trim().length > 5) {
    score += 10; factors++;
  }

  // Redução pretendida
  if (risk.reducaoPretendida > 0) {
    score += Math.min(10, risk.reducaoPretendida * 2);
  }

  return Math.min(100, score);
}

/** Calcula o Composite Score de um risco */
function calculateCompositeScore(
  risk: Risk,
  config: EngineConfig,
  financialData?: FinancialImpact
): CompositeScore {
  const scenario = config.scenarioMultipliers[config.scenario];
  const w = config.weights;

  // 1. Risco Inerente normalizado (1-25 → 0-100)
  const adjustedP = Math.min(5, risk.probabilidade * scenario.probabilityMultiplier);
  const adjustedInerente = adjustedP * risk.impacto;
  const inherentNorm = normalize(adjustedInerente, 1, 25);

  // 2. GUT normalizado (1-125 → 0-100)
  const adjustedU = Math.min(5, risk.urgencia * scenario.urgencyMultiplier);
  const adjustedGut = risk.gravidade * adjustedU * risk.tendencia;
  const gutNorm = normalize(adjustedGut, 1, 125);

  // 3. Financeiro normalizado (ALE ou perda média → 0-100)
  let financialNorm = 50; // default se não há dados
  if (financialData) {
    const adjustedLoss = financialData.perdaMediaEsperada * scenario.financialMultiplier;
    // Escala: R$ 0 = 0, R$ 50M+ = 100
    financialNorm = normalize(adjustedLoss, 0, 50000000);
  }

  // 4. Eficácia dos controles (reduz o score)
  const controlEff = calculateControlEffectiveness(risk);
  const controlReduction = (controlEff / 100) * w.controlEffectiveness * 100;

  // Composite Score
  const rawScore = (inherentNorm * w.inherent) + (gutNorm * w.gut) + (financialNorm * w.financial);
  const total = Math.max(0, Math.min(100, rawScore - controlReduction));

  // Drivers (top 3 fatores que mais contribuem)
  const contributions = [
    { name: `Risco Inerente (P${risk.probabilidade}×I${risk.impacto}=${risk.riscoInerente})`, value: inherentNorm * w.inherent },
    { name: `GUT (G${risk.gravidade}×U${risk.urgencia}×T${risk.tendencia}=${risk.gutScore})`, value: gutNorm * w.gut },
    { name: `Impacto Financeiro (${financialData ? `R$ ${(financialData.perdaMediaEsperada / 1000000).toFixed(1)}M` : 'N/D'})`, value: financialNorm * w.financial },
    { name: `Eficácia Controles (${controlEff.toFixed(0)}%)`, value: -controlReduction },
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const drivers = contributions.slice(0, 3).map(c => `${c.name}: ${c.value >= 0 ? '+' : ''}${c.value.toFixed(1)}pts`);

  // Fórmula legível
  const formula = `Score = (Inerente×${w.inherent} + GUT×${w.gut} + Financeiro×${w.financial}) - Controles×${w.controlEffectiveness}\n= (${inherentNorm.toFixed(1)}×${w.inherent} + ${gutNorm.toFixed(1)}×${w.gut} + ${financialNorm.toFixed(1)}×${w.financial}) - ${controlReduction.toFixed(1)}\n= ${total.toFixed(1)}`;

  // Premissas
  const assumptions = [
    `Cenário: ${scenario.label} (prob ×${scenario.probabilityMultiplier}, fin ×${scenario.financialMultiplier})`,
    `Pesos: Inerente ${(w.inherent * 100).toFixed(0)}%, GUT ${(w.gut * 100).toFixed(0)}%, Financeiro ${(w.financial * 100).toFixed(0)}%, Controles ${(w.controlEffectiveness * 100).toFixed(0)}%`,
    financialData ? `ALE (FAIR): R$ ${(financialData.fair?.ale ?? financialData.perdaMediaEsperada).toLocaleString('pt-BR')}` : 'Dados financeiros não disponíveis — usando estimativa padrão',
  ];

  // Confiança do modelo
  let confidence = 60; // base
  if (financialData?.fair) confidence += 15;
  if (risk.kri && risk.kri.length > 5) confidence += 10;
  if (risk.controles && risk.controles.length > 10) confidence += 5;
  if (risk.eficaciaTratamento && risk.eficaciaTratamento.length > 5) confidence += 5;
  if (risk.responsavel && risk.responsavel.length > 2) confidence += 5;
  confidence = Math.min(95, confidence);

  return {
    total: Math.round(total * 10) / 10,
    inherentContribution: Math.round(inherentNorm * w.inherent * 10) / 10,
    gutContribution: Math.round(gutNorm * w.gut * 10) / 10,
    financialContribution: Math.round(financialNorm * w.financial * 10) / 10,
    controlContribution: Math.round(controlReduction * 10) / 10,
    formula,
    drivers,
    assumptions,
    confidence,
  };
}

/** Análise de sensibilidade: como cada variável afeta o score */
function calculateSensitivity(
  risk: Risk,
  config: EngineConfig,
  financialData?: FinancialImpact
): SensitivityResult[] {
  const baseScore = calculateCompositeScore(risk, config, financialData).total;
  const results: SensitivityResult[] = [];

  // Sensibilidade à probabilidade
  const riskHighP = { ...risk, probabilidade: Math.min(5, risk.probabilidade * 1.1) };
  const riskLowP = { ...risk, probabilidade: Math.max(1, risk.probabilidade * 0.9) };
  const highP = calculateCompositeScore(riskHighP, config, financialData).total;
  const lowP = calculateCompositeScore(riskLowP, config, financialData).total;
  results.push({
    variable: 'Probabilidade',
    baseValue: risk.probabilidade,
    impactPlus10: Math.round((highP - baseScore) * 10) / 10,
    impactMinus10: Math.round((lowP - baseScore) * 10) / 10,
    elasticity: Math.round(((highP - lowP) / (0.2 * baseScore || 1)) * 100) / 100,
  });

  // Sensibilidade ao impacto
  const riskHighI = { ...risk, impacto: Math.min(5, risk.impacto * 1.1) };
  const riskLowI = { ...risk, impacto: Math.max(1, risk.impacto * 0.9) };
  const highI = calculateCompositeScore(riskHighI, config, financialData).total;
  const lowI = calculateCompositeScore(riskLowI, config, financialData).total;
  results.push({
    variable: 'Impacto',
    baseValue: risk.impacto,
    impactPlus10: Math.round((highI - baseScore) * 10) / 10,
    impactMinus10: Math.round((lowI - baseScore) * 10) / 10,
    elasticity: Math.round(((highI - lowI) / (0.2 * baseScore || 1)) * 100) / 100,
  });

  // Sensibilidade ao impacto financeiro
  if (financialData) {
    const finHigh: FinancialImpact = { ...financialData, perdaMediaEsperada: financialData.perdaMediaEsperada * 1.1 };
    const finLow: FinancialImpact = { ...financialData, perdaMediaEsperada: financialData.perdaMediaEsperada * 0.9 };
    const highF = calculateCompositeScore(risk, config, finHigh).total;
    const lowF = calculateCompositeScore(risk, config, finLow).total;
    results.push({
      variable: 'Perda Financeira',
      baseValue: financialData.perdaMediaEsperada,
      impactPlus10: Math.round((highF - baseScore) * 10) / 10,
      impactMinus10: Math.round((lowF - baseScore) * 10) / 10,
      elasticity: Math.round(((highF - lowF) / (0.2 * baseScore || 1)) * 100) / 100,
    });
  }

  return results;
}

/** Gera early warning signals para um risco */
function generateEarlyWarnings(risk: Risk, compositeScore: number, config: EngineConfig, financialData?: FinancialImpact): string[] {
  const warnings: string[] = [];

  if (compositeScore >= config.appetite.intolerable) {
    warnings.push(`CRÍTICO: Score ${compositeScore.toFixed(1)} acima do limite intolerável (${config.appetite.intolerable}). Ação imediata requerida.`);
  }

  if (risk.tendencia >= 4) {
    warnings.push(`TENDÊNCIA CRESCENTE: Fator T=${risk.tendencia}/5 indica deterioração. Risco pode escalar nas próximas avaliações.`);
  }

  if (risk.riscoInerente >= 20 && calculateControlEffectiveness(risk) < 40) {
    warnings.push(`CONTROLES INSUFICIENTES: Risco crítico (P×I=${risk.riscoInerente}) com eficácia de controles abaixo de 40%.`);
  }

  if (financialData && financialData.perdaMediaEsperada > config.appetite.maxAcceptableLoss) {
    warnings.push(`EXPOSIÇÃO FINANCEIRA: Perda esperada R$ ${(financialData.perdaMediaEsperada / 1000000).toFixed(1)}M excede apetite de R$ ${(config.appetite.maxAcceptableLoss / 1000000).toFixed(1)}M.`);
  }

  if (!risk.kri || risk.kri.trim().length < 5) {
    warnings.push(`SEM KRI: Risco sem indicadores-chave definidos. Monitoramento prejudicado.`);
  }

  if (!risk.responsavel || risk.responsavel.trim().length < 3) {
    warnings.push(`SEM RESPONSÁVEL: Risco sem owner definido. Accountability comprometida.`);
  }

  return warnings;
}

// ============================================================
// 7. FUNÇÃO PRINCIPAL: ENRIQUECER RISCOS
// ============================================================

export function enrichRisks(risks: Risk[], config: EngineConfig = DEFAULT_CONFIG): EnrichedRisk[] {
  // Primeiro passo: calcular scores para todos
  const enriched: EnrichedRisk[] = risks.map(risk => {
    const financialData = FINANCIAL_DATA[risk.id];
    const compositeScore = calculateCompositeScore(risk, config, financialData);
    const controlEff = calculateControlEffectiveness(risk);
    const residualNorm = Math.max(0, compositeScore.total * (1 - controlEff / 100));

    // Classificação de apetite
    let appetiteStatus: 'acceptable' | 'tolerable' | 'intolerable';
    if (compositeScore.total <= config.appetite.acceptable) {
      appetiteStatus = 'acceptable';
    } else if (compositeScore.total <= config.appetite.tolerable) {
      appetiteStatus = 'tolerable';
    } else {
      appetiteStatus = 'intolerable';
    }

    // Correlações deste risco
    const correlations = RISK_CORRELATIONS.filter(
      c => c.sourceId === risk.id || c.targetId === risk.id
    );

    // Score ajustado com correlações
    const cascadingBoost = correlations
      .filter(c => c.targetId === risk.id && c.type === 'cascading')
      .reduce((sum, c) => sum + c.strength * 5, 0);
    const scenarioAdjustedScore = Math.min(100, compositeScore.total + cascadingBoost);

    return {
      ...risk,
      compositeScore,
      riskLayer: LAYER_MAP[risk.tipoRisco] || 'Operacional',
      appetiteStatus,
      scenarioAdjustedScore: Math.round(scenarioAdjustedScore * 10) / 10,
      indicators: generateIndicators(risk),
      correlations,
      sensitivity: calculateSensitivity(risk, config, financialData),
      controlEffectivenessScore: controlEff,
      residualNormalized: Math.round(residualNorm * 10) / 10,
      globalRank: 0, // será preenchido abaixo
      earlyWarnings: generateEarlyWarnings(risk, compositeScore.total, config, financialData),
    };
  });

  // Segundo passo: ranking global por composite score (desc)
  enriched.sort((a, b) => b.compositeScore.total - a.compositeScore.total);
  enriched.forEach((r, i) => { r.globalRank = i + 1; });

  return enriched;
}

// ============================================================
// 8. FUNÇÕES AUXILIARES DE AGREGAÇÃO
// ============================================================

/** Calcula métricas agregadas do portfólio */
export function calculatePortfolioMetrics(enrichedRisks: EnrichedRisk[], config: EngineConfig = DEFAULT_CONFIG) {
  const total = enrichedRisks.length;
  if (total === 0) return null;

  const avgScore = enrichedRisks.reduce((s, r) => s + r.compositeScore.total, 0) / total;
  const maxScore = Math.max(...enrichedRisks.map(r => r.compositeScore.total));
  const avgConfidence = enrichedRisks.reduce((s, r) => s + r.compositeScore.confidence, 0) / total;
  const avgControlEff = enrichedRisks.reduce((s, r) => s + r.controlEffectivenessScore, 0) / total;

  const byAppetite = {
    acceptable: enrichedRisks.filter(r => r.appetiteStatus === 'acceptable').length,
    tolerable: enrichedRisks.filter(r => r.appetiteStatus === 'tolerable').length,
    intolerable: enrichedRisks.filter(r => r.appetiteStatus === 'intolerable').length,
  };

  const byLayer: Record<RiskLayer, number> = {
    'Regulatório': enrichedRisks.filter(r => r.riskLayer === 'Regulatório').length,
    'Operacional': enrichedRisks.filter(r => r.riskLayer === 'Operacional').length,
    'Estratégico': enrichedRisks.filter(r => r.riskLayer === 'Estratégico').length,
    'Reputacional': enrichedRisks.filter(r => r.riskLayer === 'Reputacional').length,
  };

  const totalFinancialExposure = enrichedRisks.reduce((s, r) => {
    const fin = FINANCIAL_DATA[r.id];
    return s + (fin?.perdaMediaEsperada ?? 0);
  }, 0);

  const scenarioMultiplier = config.scenarioMultipliers[config.scenario].financialMultiplier;
  const scenarioAdjustedExposure = totalFinancialExposure * scenarioMultiplier;

  const totalWarnings = enrichedRisks.reduce((s, r) => s + r.earlyWarnings.length, 0);
  const criticalWarnings = enrichedRisks.filter(r => r.earlyWarnings.some(w => w.startsWith('CRÍTICO'))).length;

  return {
    totalRisks: total,
    averageCompositeScore: Math.round(avgScore * 10) / 10,
    maxCompositeScore: Math.round(maxScore * 10) / 10,
    averageConfidence: Math.round(avgConfidence),
    averageControlEffectiveness: Math.round(avgControlEff),
    byAppetite,
    byLayer,
    totalFinancialExposure,
    scenarioAdjustedExposure,
    totalWarnings,
    criticalWarnings,
    scenario: config.scenario,
    scenarioLabel: config.scenarioMultipliers[config.scenario].label,
  };
}

/** Simula remoção/mitigação de um risco e retorna impacto no portfólio */
export function simulateMitigation(
  enrichedRisks: EnrichedRisk[],
  riskId: string,
  mitigationLevel: number, // 0-100 (% de redução)
  config: EngineConfig = DEFAULT_CONFIG
) {
  const before = calculatePortfolioMetrics(enrichedRisks, config)!;
  const targetRisk = enrichedRisks.find(r => r.id === riskId);
  if (!targetRisk) return null;

  const reduction = mitigationLevel / 100;
  const newScore = targetRisk.compositeScore.total * (1 - reduction);
  const scoreDelta = targetRisk.compositeScore.total - newScore;

  // Impacto em riscos correlacionados
  const cascadeImpact = targetRisk.correlations
    .filter(c => c.sourceId === riskId)
    .map(c => ({
      targetId: c.targetId,
      reduction: scoreDelta * c.strength * 0.3,
      description: c.description,
    }));

  const totalCascadeReduction = cascadeImpact.reduce((s, c) => s + c.reduction, 0);

  const financialData = FINANCIAL_DATA[riskId];
  const financialSaved = financialData
    ? financialData.perdaMediaEsperada * reduction
    : 0;

  return {
    riskId,
    riskDescription: targetRisk.descricaoRisco,
    mitigationLevel,
    scoreBefore: targetRisk.compositeScore.total,
    scoreAfter: Math.round(newScore * 10) / 10,
    directReduction: Math.round(scoreDelta * 10) / 10,
    cascadeImpact,
    totalCascadeReduction: Math.round(totalCascadeReduction * 10) / 10,
    portfolioScoreBefore: before.averageCompositeScore,
    portfolioScoreAfter: Math.round((before.averageCompositeScore - (scoreDelta + totalCascadeReduction) / before.totalRisks) * 10) / 10,
    financialSaved,
    investmentRequired: financialData?.investimentoPreventivo ?? 0,
    roi: financialData ? Math.round((financialSaved / (financialData.investimentoPreventivo || 1)) * 100) : 0,
  };
}
