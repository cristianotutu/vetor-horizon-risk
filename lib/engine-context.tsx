import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EngineConfig,
  DEFAULT_CONFIG,
  ScenarioPreset,
  NormalizedWeights,
  RiskAppetiteThresholds,
  enrichRisks,
  calculatePortfolioMetrics,
  simulateMitigation,
  EnrichedRisk,
} from './risk-engine';
import { Risk } from './models';

const ENGINE_STORAGE_KEY = '@icapt_engine_config_v1';

interface EngineContextType {
  config: EngineConfig;
  enrichedRisks: EnrichedRisk[];
  portfolioMetrics: ReturnType<typeof calculatePortfolioMetrics>;
  setScenario: (scenario: ScenarioPreset) => void;
  setWeights: (weights: NormalizedWeights) => void;
  setAppetite: (appetite: RiskAppetiteThresholds) => void;
  setCorrelationFactor: (factor: number) => void;
  resetConfig: () => void;
  simulateRiskMitigation: (riskId: string, level: number) => ReturnType<typeof simulateMitigation>;
}

const EngineContext = createContext<EngineContextType>({
  config: DEFAULT_CONFIG,
  enrichedRisks: [],
  portfolioMetrics: null,
  setScenario: () => {},
  setWeights: () => {},
  setAppetite: () => {},
  setCorrelationFactor: () => {},
  resetConfig: () => {},
  simulateRiskMitigation: () => null,
});

export function EngineProvider({ children, risks }: { children: React.ReactNode; risks: Risk[] }) {
  const [config, setConfig] = useState<EngineConfig>(DEFAULT_CONFIG);

  // Load config from storage on mount
  React.useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(ENGINE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
        }
      } catch (e) {
        console.error('Error loading engine config:', e);
      }
    })();
  }, []);

  const saveConfig = useCallback(async (newConfig: EngineConfig) => {
    try {
      await AsyncStorage.setItem(ENGINE_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.error('Error saving engine config:', e);
    }
  }, []);

  const enrichedRisks = useMemo(() => enrichRisks(risks, config), [risks, config]);
  const portfolioMetrics = useMemo(() => calculatePortfolioMetrics(enrichedRisks, config), [enrichedRisks, config]);

  const setScenario = useCallback((scenario: ScenarioPreset) => {
    const newConfig = { ...config, scenario };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const setWeights = useCallback((weights: NormalizedWeights) => {
    // Normalize weights to sum to 1.0
    const sum = weights.inherent + weights.gut + weights.financial + weights.controlEffectiveness;
    const normalized: NormalizedWeights = {
      inherent: weights.inherent / sum,
      gut: weights.gut / sum,
      financial: weights.financial / sum,
      controlEffectiveness: weights.controlEffectiveness / sum,
    };
    const newConfig = { ...config, weights: normalized };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const setAppetite = useCallback((appetite: RiskAppetiteThresholds) => {
    const newConfig = { ...config, appetite };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const setCorrelationFactor = useCallback((factor: number) => {
    const newConfig = { ...config, correlationFactor: Math.max(0, Math.min(1, factor)) };
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [config, saveConfig]);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    saveConfig(DEFAULT_CONFIG);
  }, [saveConfig]);

  const simulateRiskMitigation = useCallback((riskId: string, level: number) => {
    return simulateMitigation(enrichedRisks, riskId, level, config);
  }, [enrichedRisks, config]);

  return (
    <EngineContext.Provider value={{
      config,
      enrichedRisks,
      portfolioMetrics,
      setScenario,
      setWeights,
      setAppetite,
      setCorrelationFactor,
      resetConfig,
      simulateRiskMitigation,
    }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine() {
  return useContext(EngineContext);
}
