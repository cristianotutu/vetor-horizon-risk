import { describe, it, expect } from 'vitest';
import {
  getRiskLevel,
  getGutLevel,
  getMatrixColor,
  generateRiskId,
  createEmptyRisk,
  INITIAL_RISKS,
  FONTES_DE_RISCO,
  TIPOS_DE_RISCO,
  ESTRATEGIAS_TRATAMENTO,
  TABELA_IMPACTO_DETALHADA,
  NIVEIS_PROBABILIDADE,
  TABELA_GUT,
} from '../models';

describe('getRiskLevel', () => {
  it('returns Crítico for score >= 20', () => {
    expect(getRiskLevel(20).label).toBe('Crítico');
    expect(getRiskLevel(25).label).toBe('Crítico');
  });

  it('returns Alto for score >= 12 and < 20', () => {
    expect(getRiskLevel(12).label).toBe('Alto');
    expect(getRiskLevel(15).label).toBe('Alto');
  });

  it('returns Médio for score >= 6 and < 12', () => {
    expect(getRiskLevel(6).label).toBe('Médio');
    expect(getRiskLevel(10).label).toBe('Médio');
  });

  it('returns Baixo for score >= 2 and < 6', () => {
    expect(getRiskLevel(2).label).toBe('Baixo');
    expect(getRiskLevel(4).label).toBe('Baixo');
  });

  it('returns Muito Baixo for score < 2', () => {
    expect(getRiskLevel(1).label).toBe('Muito Baixo');
  });
});

describe('getGutLevel', () => {
  it('returns Crítico for score >= 80', () => {
    expect(getGutLevel(80).label).toBe('Crítico');
    expect(getGutLevel(125).label).toBe('Crítico');
  });

  it('returns Alto for score >= 36 and < 80', () => {
    expect(getGutLevel(36).label).toBe('Alto');
    expect(getGutLevel(64).label).toBe('Alto');
  });

  it('returns Médio for score >= 12 and < 36', () => {
    expect(getGutLevel(12).label).toBe('Médio');
    expect(getGutLevel(27).label).toBe('Médio');
  });

  it('returns Baixo for score < 12', () => {
    expect(getGutLevel(1).label).toBe('Baixo');
    expect(getGutLevel(8).label).toBe('Baixo');
  });
});

describe('getMatrixColor', () => {
  it('returns red for critical scores (prob*imp >= 20)', () => {
    expect(getMatrixColor(5, 4)).toBe('#EF4444');
    expect(getMatrixColor(4, 5)).toBe('#EF4444');
    expect(getMatrixColor(5, 5)).toBe('#EF4444');
  });

  it('returns orange for high scores (12-19)', () => {
    expect(getMatrixColor(3, 4)).toBe('#F97316');
    expect(getMatrixColor(4, 4)).toBe('#F97316');
  });

  it('returns yellow for medium scores (6-11)', () => {
    expect(getMatrixColor(2, 3)).toBe('#F59E0B');
    expect(getMatrixColor(3, 3)).toBe('#F59E0B');
  });

  it('returns green for low scores (2-5)', () => {
    expect(getMatrixColor(1, 2)).toBe('#86EFAC');
    expect(getMatrixColor(1, 5)).toBe('#86EFAC');
  });
});

describe('generateRiskId', () => {
  it('generates next sequential ID', () => {
    const risks = [
      { id: 'R001' },
      { id: 'R002' },
      { id: 'R003' },
    ] as any[];
    expect(generateRiskId(risks)).toBe('R004');
  });

  it('generates R001 for empty array', () => {
    expect(generateRiskId([])).toBe('R001');
  });

  it('handles non-sequential IDs', () => {
    const risks = [
      { id: 'R001' },
      { id: 'R005' },
    ] as any[];
    expect(generateRiskId(risks)).toBe('R006');
  });
});

describe('createEmptyRisk', () => {
  it('creates a risk with the given ID', () => {
    const risk = createEmptyRisk('R010');
    expect(risk.id).toBe('R010');
    expect(risk.probabilidade).toBe(1);
    expect(risk.impacto).toBe(1);
    expect(risk.riscoInerente).toBe(1);
    expect(risk.gutScore).toBe(1);
    expect(risk.estrategico).toBe('NÃO');
    expect(risk.descricaoRisco).toBe('');
  });
});

describe('INITIAL_RISKS', () => {
  it('has 5 pre-loaded risks', () => {
    expect(INITIAL_RISKS.length).toBe(3);
  });

  it('has correct IDs', () => {
    const ids = INITIAL_RISKS.map(r => r.id);
    expect(ids).not.toContain('R001');
    expect(ids).not.toContain('R002');
    expect(ids).toContain('R003');
    expect(ids).toContain('R004');
    expect(ids).toContain('R005');
  });

  it('has correct riscoInerente calculations', () => {
    INITIAL_RISKS.forEach(risk => {
      expect(risk.riscoInerente).toBe(risk.probabilidade * risk.impacto);
    });
  });

  it('has correct gutScore calculations', () => {
    INITIAL_RISKS.forEach(risk => {
      expect(risk.gutScore).toBe(risk.gravidade * risk.urgencia * risk.tendencia);
    });
  });

  it('all risks have Forma 3 descriptions with "ocasionando"', () => {
    INITIAL_RISKS.forEach(risk => {
      expect(risk.descricaoRisco.toLowerCase()).toContain('ocasionando');
    });
  });
});

describe('Reference data completeness', () => {
  it('has 11 fontes de risco', () => {
    expect(FONTES_DE_RISCO.length).toBe(11);
  });

  it('has 10 tipos de risco', () => {
    expect(TIPOS_DE_RISCO.length).toBe(10);
  });

  it('has 5 estratégias de tratamento', () => {
    expect(ESTRATEGIAS_TRATAMENTO.length).toBe(5);
  });

  it('has 5 levels in impacto table', () => {
    expect(TABELA_IMPACTO_DETALHADA.length).toBe(5);
  });

  it('has 5 levels in probabilidade table', () => {
    expect(NIVEIS_PROBABILIDADE.length).toBe(5);
  });

  it('has 5 levels in GUT table', () => {
    expect(TABELA_GUT.length).toBe(5);
  });

  it('impacto table has all 6 criteria', () => {
    TABELA_IMPACTO_DETALHADA.forEach(item => {
      expect(item.financeiro).toBeTruthy();
      expect(item.reputacao).toBeTruthy();
      expect(item.operacional).toBeTruthy();
      expect(item.legal).toBeTruthy();
      expect(item.ambiental).toBeTruthy();
      expect(item.social).toBeTruthy();
    });
  });
});
