import { describe, it, expect } from 'vitest';
import { RISKS_AULA3, RISKS_AULA4, RISKS_AULA5, EVOLUTION_3_TO_4, EVOLUTION_4_TO_5, EVOLUTION_SUMMARY } from '../evolution-data';
import { getRiskLevel, getGutLevel } from '../models';

describe('Evolution Data - Aula 3', () => {
  it('should have 16 risks in Aula 3 (R003-R019, excluding R001, R002, R015)', () => {
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
  it('should have 19 risks in Aula 4', () => {
    expect(RISKS_AULA4.length).toBe(19);
  });

  it('Aula 4 should have 3 more risks than Aula 3 (R021, R022, R023)', () => {
    expect(RISKS_AULA4.length - RISKS_AULA3.length).toBe(3);
  });

  it('R001 and R002 should not exist in any dataset', () => {
    expect(RISKS_AULA3.find(r => r.id === 'R001')).toBeUndefined();
    expect(RISKS_AULA3.find(r => r.id === 'R002')).toBeUndefined();
    expect(RISKS_AULA4.find(r => r.id === 'R001')).toBeUndefined();
    expect(RISKS_AULA4.find(r => r.id === 'R002')).toBeUndefined();
    expect(RISKS_AULA5.find(r => r.id === 'R001')).toBeUndefined();
    expect(RISKS_AULA5.find(r => r.id === 'R002')).toBeUndefined();
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

  it('all GUT scores should be G*U*T', () => {
    RISKS_AULA4.forEach(r => {
      expect(r.gutScore).toBe(r.gravidade * r.urgencia * r.tendencia);
    });
  });

  it('all G, U, T values should be between 1-5', () => {
    RISKS_AULA4.forEach(r => {
      expect(r.gravidade).toBeGreaterThanOrEqual(1);
      expect(r.gravidade).toBeLessThanOrEqual(5);
      expect(r.urgencia).toBeGreaterThanOrEqual(1);
      expect(r.urgencia).toBeLessThanOrEqual(5);
      expect(r.tendencia).toBeGreaterThanOrEqual(1);
      expect(r.tendencia).toBeLessThanOrEqual(5);
    });
  });
});

describe('Evolution Data - Aula 5', () => {
  it('should have 24 risks in Aula 5', () => {
    expect(RISKS_AULA5.length).toBe(24);
  });

  it('Aula 5 should have 5 new risks compared to Aula 4 (R015, R020, R024, R025, R026)', () => {
    const a4Ids = new Set(RISKS_AULA4.map(r => r.id));
    const newIds = RISKS_AULA5.filter(r => !a4Ids.has(r.id)).map(r => r.id).sort();
    expect(newIds).toEqual(['R015', 'R020', 'R024', 'R025', 'R026']);
  });

  it('all Aula 5 risks should have valid fields', () => {
    RISKS_AULA5.forEach(r => {
      expect(r.fonteDeRisco).toBeTruthy();
      expect(r.tipoRisco).toBeTruthy();
      expect(r.probabilidade).toBeGreaterThanOrEqual(1);
      expect(r.impacto).toBeGreaterThanOrEqual(1);
    });
  });

  it('all Aula 5 GUT scores should be G*U*T', () => {
    RISKS_AULA5.forEach(r => {
      expect(r.gutScore).toBe(r.gravidade * r.urgencia * r.tendencia);
    });
  });

  it('all Aula 5 risks should have consequencia filled', () => {
    RISKS_AULA5.forEach(r => {
      expect(r.consequencia).toBeTruthy();
    });
  });

  it('all Aula 5 risks should have KRI filled', () => {
    RISKS_AULA5.forEach(r => {
      expect(r.kri).toBeTruthy();
    });
  });

  it('all Aula 5 G, U, T values should be between 1-5', () => {
    RISKS_AULA5.forEach(r => {
      expect(r.gravidade).toBeGreaterThanOrEqual(1);
      expect(r.gravidade).toBeLessThanOrEqual(5);
      expect(r.urgencia).toBeGreaterThanOrEqual(1);
      expect(r.urgencia).toBeLessThanOrEqual(5);
      expect(r.tendencia).toBeGreaterThanOrEqual(1);
      expect(r.tendencia).toBeLessThanOrEqual(5);
    });
  });
});

describe('Evolution 3 to 4', () => {
  it('should have entries for Aula 3→4 transition', () => {
    expect(EVOLUTION_3_TO_4.length).toBeGreaterThan(0);
  });

  it('should have 3 new risks R021, R022, R023', () => {
    const newIds = EVOLUTION_3_TO_4.filter(e => e.type === 'new').map(e => e.riskId).sort();
    expect(newIds).toEqual(['R021', 'R022', 'R023']);
  });

  it('modified risks should have changes listed', () => {
    const modified = EVOLUTION_3_TO_4.filter(e => e.type === 'modified');
    expect(modified.length).toBeGreaterThan(0);
    modified.forEach(m => {
      expect(m.changes.length).toBeGreaterThan(0);
    });
  });
});

describe('Evolution 4 to 5', () => {
  it('should have entries for Aula 4→5 transition', () => {
    expect(EVOLUTION_4_TO_5.length).toBeGreaterThan(0);
  });

  it('should have 5 new risks (R015, R020, R024, R025, R026)', () => {
    const newIds = EVOLUTION_4_TO_5.filter(e => e.type === 'new').map(e => e.riskId).sort();
    expect(newIds).toEqual(['R015', 'R020', 'R024', 'R025', 'R026']);
  });

  it('modified risks should have changes listed', () => {
    const modified = EVOLUTION_4_TO_5.filter(e => e.type === 'modified');
    expect(modified.length).toBeGreaterThan(0);
    modified.forEach(m => {
      expect(m.changes.length).toBeGreaterThan(0);
    });
  });

  it('EVOLUTION_SUMMARY should be an alias for EVOLUTION_4_TO_5', () => {
    expect(EVOLUTION_SUMMARY).toBe(EVOLUTION_4_TO_5);
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
