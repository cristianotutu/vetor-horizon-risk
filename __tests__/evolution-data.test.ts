import { describe, it, expect } from 'vitest';
import {
  RISKS_AULA3,
  RISKS_AULA4,
  RISKS_AULA5,
  RISKS_AULA6,
  AULA_RISK_COUNTS,
  EVOLUTION_3_TO_4,
  EVOLUTION_4_TO_5,
  EVOLUTION_5_TO_6,
  EVOLUTION_3_TO_6,
} from '../lib/evolution-data';

describe('Evolution Data - Risk Counts', () => {
  it('RISKS_AULA3 should have exactly 16 risks', () => {
    expect(RISKS_AULA3.length).toBe(16);
  });

  it('RISKS_AULA4 should have exactly 22 risks', () => {
    expect(RISKS_AULA4.length).toBe(22);
  });

  it('RISKS_AULA5 should have exactly 25 risks', () => {
    expect(RISKS_AULA5.length).toBe(25);
  });

  it('RISKS_AULA6 should have exactly 35 risks', () => {
    expect(RISKS_AULA6.length).toBe(35);
  });

  it('AULA_RISK_COUNTS should match actual array lengths', () => {
    expect(AULA_RISK_COUNTS.aula3).toBe(RISKS_AULA3.length);
    expect(AULA_RISK_COUNTS.aula4).toBe(RISKS_AULA4.length);
    expect(AULA_RISK_COUNTS.aula5).toBe(RISKS_AULA5.length);
    expect(AULA_RISK_COUNTS.aula6).toBe(RISKS_AULA6.length);
  });

  it('AULA_RISK_COUNTS should be 16→22→25→35', () => {
    expect(AULA_RISK_COUNTS).toEqual({
      aula3: 16,
      aula4: 22,
      aula5: 25,
      aula6: 35,
    });
  });
});

describe('Evolution Data - Progression', () => {
  it('each aula should have more risks than the previous', () => {
    expect(RISKS_AULA4.length).toBeGreaterThan(RISKS_AULA3.length);
    expect(RISKS_AULA5.length).toBeGreaterThan(RISKS_AULA4.length);
    expect(RISKS_AULA6.length).toBeGreaterThan(RISKS_AULA5.length);
  });

  it('EVOLUTION_3_TO_4 should have entries for all AULA4 risks', () => {
    expect(EVOLUTION_3_TO_4.length).toBe(RISKS_AULA4.length);
  });

  it('EVOLUTION_4_TO_5 should have entries for all AULA5 risks', () => {
    expect(EVOLUTION_4_TO_5.length).toBe(RISKS_AULA5.length);
  });

  it('EVOLUTION_5_TO_6 should have entries for all AULA6 risks', () => {
    expect(EVOLUTION_5_TO_6.length).toBe(RISKS_AULA6.length);
  });

  it('EVOLUTION_3_TO_6 should have entries for all AULA6 risks', () => {
    expect(EVOLUTION_3_TO_6.length).toBe(RISKS_AULA6.length);
  });

  it('EVOLUTION_3_TO_4 should have new risks (22-16=6 new)', () => {
    const newRisks = EVOLUTION_3_TO_4.filter(e => e.type === 'new');
    expect(newRisks.length).toBe(22 - 16);
  });

  it('EVOLUTION_4_TO_5 should have new risks (25-22=3 new)', () => {
    const newRisks = EVOLUTION_4_TO_5.filter(e => e.type === 'new');
    expect(newRisks.length).toBe(25 - 22);
  });

  it('EVOLUTION_5_TO_6 should have new risks (35-25=10 new)', () => {
    const newRisks = EVOLUTION_5_TO_6.filter(e => e.type === 'new');
    expect(newRisks.length).toBe(35 - 25);
  });
});

describe('Evolution Data - Risk IDs', () => {
  it('all risks should have valid IDs', () => {
    for (const risk of [...RISKS_AULA3, ...RISKS_AULA4, ...RISKS_AULA5, ...RISKS_AULA6]) {
      expect(risk.id).toMatch(/^R0\d{2}$/);
    }
  });

  it('AULA3 risks should have unique IDs', () => {
    const ids = RISKS_AULA3.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('AULA4 risks should have unique IDs', () => {
    const ids = RISKS_AULA4.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('AULA5 risks should have unique IDs', () => {
    const ids = RISKS_AULA5.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('AULA6 risks should have unique IDs', () => {
    const ids = RISKS_AULA6.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('AULA3 risks should be a subset of AULA4 risks (by ID)', () => {
    const aula4Ids = new Set(RISKS_AULA4.map(r => r.id));
    for (const risk of RISKS_AULA3) {
      expect(aula4Ids.has(risk.id)).toBe(true);
    }
  });

  it('AULA4 risks should be a subset of AULA5 risks (by ID)', () => {
    const aula5Ids = new Set(RISKS_AULA5.map(r => r.id));
    for (const risk of RISKS_AULA4) {
      expect(aula5Ids.has(risk.id)).toBe(true);
    }
  });

  it('AULA5 risks should be a subset of AULA6 risks (by ID)', () => {
    const aula6Ids = new Set(RISKS_AULA6.map(r => r.id));
    for (const risk of RISKS_AULA5) {
      expect(aula6Ids.has(risk.id)).toBe(true);
    }
  });
});

describe('Evolution Data - Risk Properties', () => {
  it('all risks should have required properties', () => {
    for (const risk of RISKS_AULA6) {
      expect(risk.id).toBeDefined();
      expect(risk.descricaoRisco).toBeDefined();
      expect(typeof risk.riscoInerente).toBe('number');
      expect(typeof risk.gutScore).toBe('number');
      expect(typeof risk.probabilidade).toBe('number');
      expect(typeof risk.impacto).toBe('number');
      expect(risk.probabilidade).toBeGreaterThanOrEqual(1);
      expect(risk.probabilidade).toBeLessThanOrEqual(5);
      expect(risk.impacto).toBeGreaterThanOrEqual(1);
      expect(risk.impacto).toBeLessThanOrEqual(5);
    }
  });

  it('riscoInerente should equal probabilidade * impacto', () => {
    for (const risk of RISKS_AULA6) {
      expect(risk.riscoInerente).toBe(risk.probabilidade * risk.impacto);
    }
  });
});
