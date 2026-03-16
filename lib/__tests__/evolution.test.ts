import { describe, it, expect } from 'vitest';
import { RISKS_AULA3, RISKS_AULA4, EVOLUTION_SUMMARY } from '../evolution-data';
import { getRiskLevel, getGutLevel } from '../models';

describe('Evolution Data - Aula 3', () => {
  it('should have 16 risks in Aula 3 (R001 and R002 removed)', () => {
    expect(RISKS_AULA3.length).toBe(16);
  });

  it('all Aula 3 risks should have valid IDs', () => {
    RISKS_AULA3.forEach(r => {
      expect(r.id).toMatch(/^R\d{3}$/);
    });
  });

  it('all Aula 3 risks should have probabilidade between 1-5', () => {
    RISKS_AULA3.forEach(r => {
      expect(r.probabilidade).toBeGreaterThanOrEqual(1);
      expect(r.probabilidade).toBeLessThanOrEqual(5);
    });
  });

  it('all Aula 3 risks should have impacto between 1-5', () => {
    RISKS_AULA3.forEach(r => {
      expect(r.impacto).toBeGreaterThanOrEqual(1);
      expect(r.impacto).toBeLessThanOrEqual(5);
    });
  });

  it('riscoInerente should equal probabilidade * impacto', () => {
    RISKS_AULA3.forEach(r => {
      expect(r.riscoInerente).toBe(r.probabilidade * r.impacto);
    });
  });
});

describe('Evolution Data - Aula 4', () => {
  it('should have 19 risks in Aula 4 (R001 and R002 removed)', () => {
    expect(RISKS_AULA4.length).toBe(19);
  });

  it('Aula 4 should have 3 more risks than Aula 3', () => {
    expect(RISKS_AULA4.length - RISKS_AULA3.length).toBe(3);
  });

  it('R001 and R002 should not exist in any dataset', () => {
    expect(RISKS_AULA3.find(r => r.id === 'R001')).toBeUndefined();
    expect(RISKS_AULA3.find(r => r.id === 'R002')).toBeUndefined();
    expect(RISKS_AULA4.find(r => r.id === 'R001')).toBeUndefined();
    expect(RISKS_AULA4.find(r => r.id === 'R002')).toBeUndefined();
  });

  it('new risks in Aula 4 should be R021, R022, R023', () => {
    const a3Ids = new Set(RISKS_AULA3.map(r => r.id));
    const newIds = RISKS_AULA4.filter(r => !a3Ids.has(r.id)).map(r => r.id).sort();
    expect(newIds).toEqual(['R021', 'R022', 'R023']);
  });

  it('all Aula 4 risks should have valid fields', () => {
    RISKS_AULA4.forEach(r => {
      expect(r.fonteDeRisco).toBeTruthy();
      expect(r.tipoRisco).toBeTruthy();
      expect(r.probabilidade).toBeGreaterThanOrEqual(1);
      expect(r.impacto).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Evolution Summary', () => {
  it('should have entries for all Aula 4 risks', () => {
    expect(EVOLUTION_SUMMARY.length).toBe(RISKS_AULA4.length);
  });

  it('should not have entries for R001 or R002', () => {
    expect(EVOLUTION_SUMMARY.find(e => e.riskId === 'R001')).toBeUndefined();
    expect(EVOLUTION_SUMMARY.find(e => e.riskId === 'R002')).toBeUndefined();
  });

  it('should have 3 new risks', () => {
    const newEntries = EVOLUTION_SUMMARY.filter(e => e.type === 'new');
    expect(newEntries.length).toBe(3);
  });

  it('should have modified risks with changes listed', () => {
    const modified = EVOLUTION_SUMMARY.filter(e => e.type === 'modified');
    expect(modified.length).toBeGreaterThan(0);
    modified.forEach(m => {
      expect(m.changes.length).toBeGreaterThan(0);
    });
  });

  it('unchanged risks should have empty changes', () => {
    const unchanged = EVOLUTION_SUMMARY.filter(e => e.type === 'unchanged');
    unchanged.forEach(u => {
      expect(u.changes.length).toBe(0);
    });
  });
});

describe('Risk Level Helpers', () => {
  it('getRiskLevel should classify correctly', () => {
    expect(getRiskLevel(25).label).toBe('Crítico');
    expect(getRiskLevel(20).label).toBe('Crítico');
    expect(getRiskLevel(15).label).toBe('Alto');
    expect(getRiskLevel(12).label).toBe('Alto');
    expect(getRiskLevel(8).label).toBe('Médio');
    expect(getRiskLevel(4).label).toBe('Baixo');
    expect(getRiskLevel(1).label).toBe('Muito Baixo');
  });

  it('getGutLevel should classify correctly', () => {
    expect(getGutLevel(80).label).toBe('Crítico');
    expect(getGutLevel(36).label).toBe('Alto');
    expect(getGutLevel(12).label).toBe('Médio');
    expect(getGutLevel(8).label).toBe('Baixo');
  });
});
