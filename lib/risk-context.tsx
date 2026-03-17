import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Risk, generateRiskId, createEmptyRisk } from './models';
import { RISKS_AULA4 } from './evolution-data';

const STORAGE_KEY = '@icapt_risks_v6';
const INITIALIZED_KEY = '@icapt_initialized_v6';

interface RiskContextType {
  risks: Risk[];
  loading: boolean;
  addRisk: (risk: Risk) => Promise<void>;
  updateRisk: (risk: Risk) => Promise<void>;
  deleteRisk: (id: string) => Promise<void>;
  getRisk: (id: string) => Risk | undefined;
  getNextId: () => string;
}

const RiskContext = createContext<RiskContextType>({
  risks: [],
  loading: true,
  addRisk: async () => {},
  updateRisk: async () => {},
  deleteRisk: async () => {},
  getRisk: () => undefined,
  getNextId: () => 'R003',
});

export function RiskProvider({ children }: { children: React.ReactNode }) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRisks();
  }, []);

  const loadRisks = async () => {
    try {
      const initialized = await AsyncStorage.getItem(INITIALIZED_KEY);
      if (!initialized) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(RISKS_AULA4));
        await AsyncStorage.setItem(INITIALIZED_KEY, 'true');
        setRisks(RISKS_AULA4);
      } else {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setRisks(JSON.parse(stored));
        }
      }
    } catch (e) {
      console.error('Error loading risks:', e);
      setRisks(RISKS_AULA4);
    } finally {
      setLoading(false);
    }
  };

  const saveRisks = async (newRisks: Risk[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRisks));
    } catch (e) {
      console.error('Error saving risks:', e);
    }
  };

  const addRisk = useCallback(async (risk: Risk) => {
    const updated = [...risks, risk];
    setRisks(updated);
    await saveRisks(updated);
  }, [risks]);

  const updateRisk = useCallback(async (risk: Risk) => {
    const updated = risks.map(r => r.id === risk.id ? { ...risk, updatedAt: new Date().toISOString() } : r);
    setRisks(updated);
    await saveRisks(updated);
  }, [risks]);

  const deleteRisk = useCallback(async (id: string) => {
    const updated = risks.filter(r => r.id !== id);
    setRisks(updated);
    await saveRisks(updated);
  }, [risks]);

  const getRisk = useCallback((id: string) => {
    return risks.find(r => r.id === id);
  }, [risks]);

  const getNextId = useCallback(() => {
    return generateRiskId(risks);
  }, [risks]);

  return (
    <RiskContext.Provider value={{ risks, loading, addRisk, updateRisk, deleteRisk, getRisk, getNextId }}>
      {children}
    </RiskContext.Provider>
  );
}

export function useRisks() {
  return useContext(RiskContext);
}
