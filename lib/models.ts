// ============================================================
// ICAPT Risk Manager - Data Models & Reference Data
// ============================================================

// --- Core Risk Model ---
export interface Risk {
  id: string; // e.g. "R003"
  // 1. Identificação
  fonteDeRisco: string; // dropdown value
  descricaoFonte: string;
  ameaca: string;
  // 2. Descrição (Forma 3)
  descricaoRisco: string; // "[Ameaça] ocasionando [impacto]"
  // 3. Classificação
  estrategico: 'SIM' | 'NÃO';
  tipoRisco: string;
  // 4. Avaliação
  probabilidade: number; // 1-5
  impacto: number; // 1-5
  riscoInerente: number; // probabilidade * impacto
  consequencia: string;
  // 5. Priorização GUT
  gravidade: number; // 1-5
  urgencia: number; // 1-5
  tendencia: number; // 1-5
  gutScore: number; // G * U * T
  // 6. Tratamento
  tratamento: string; // MATE
  controles: string;
  responsavel: string;
  prazo: string;
  kri: string;
  acaoKri: string;
  quemMede: string;
  quandoMede: string;
  // 7. Risco Residual
  reducaoPretendida: number; // 1-5
  riscoResidual: number; // 1-5
  eficaciaTratamento: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// --- Reference Data ---

export const FONTES_DE_RISCO = [
  'FE - Mercado',
  'FE - Fornecedores',
  'FE - Clientes',
  'FE - Governo',
  'FE - Cibersegurança ou Tecnológicas externas',
  'FE - Meio ambiente',
  'FI - Recursos Humanos e força de trabalho',
  'FI - Diretoria / Liderança / Sócios',
  'FI - Processos internos',
  'FI - Tecnológicas internas',
  'FI - Segurança, saúde e meio ambiente',
] as const;

export const TIPOS_DE_RISCO = [
  'Risco Estratégico',
  'Risco Operacional',
  'Risco Financeiro',
  'Risco de Conformidade (Regulatório e Legal)',
  'Risco de Segurança da Informação (Cibernético)',
  'Risco Tecnológico',
  'Risco Reputacional',
  'Risco Ambiental e Climático',
  'Risco Humano (Pessoas e Cultura Organizacional)',
  'Risco de Cadeia de Suprimentos',
] as const;

export const ESTRATEGIAS_TRATAMENTO = [
  'Mitigar',
  'Aceitar',
  'Transferir',
  'Evitar',
  'Mitigar e Transferir',
] as const;

export const NIVEIS_IMPACTO = [
  { nivel: 1, rotulo: 'Muito Baixo', cor: '#10B981' },
  { nivel: 2, rotulo: 'Baixo', cor: '#6EE7B7' },
  { nivel: 3, rotulo: 'Médio', cor: '#F59E0B' },
  { nivel: 4, rotulo: 'Alto', cor: '#F97316' },
  { nivel: 5, rotulo: 'Muito Alto', cor: '#EF4444' },
] as const;

export const NIVEIS_PROBABILIDADE = [
  { nivel: 1, rotulo: 'Muito Baixa', descricao: 'Extremamente improvável' },
  { nivel: 2, rotulo: 'Baixa', descricao: 'Possível, mas improvável' },
  { nivel: 3, rotulo: 'Média', descricao: 'Pode ocorrer a qualquer momento' },
  { nivel: 4, rotulo: 'Alta', descricao: 'Alta probabilidade' },
  { nivel: 5, rotulo: 'Muito Alta', descricao: 'Praticamente certo' },
] as const;

export const TABELA_IMPACTO_DETALHADA = [
  {
    nivel: 5, rotulo: 'Muito Alto',
    financeiro: 'Acima de 50% do faturamento',
    reputacao: 'Dano catastrófico à imagem, gestão de crises em larga escala',
    operacional: 'Interrupção total dos processos críticos por período indeterminado',
    legal: 'Suspensão total de atividades por determinação regulatória',
    ambiental: 'Desastre ambiental severo, impactos irreversíveis',
    social: 'Impacto humano severo, perda de vidas',
  },
  {
    nivel: 4, rotulo: 'Alto',
    financeiro: 'De 30,01% a 50% do faturamento',
    reputacao: 'Dano grave à imagem corporativa, ampla repercussão',
    operacional: 'Interrupção total dos processos críticos por período superior ao tolerável',
    legal: 'Sanções e penalidades regulatórias severas',
    ambiental: 'Incidente ambiental grave, danos significativos',
    social: 'Evento crítico afetando comunidades em raio de 50km',
  },
  {
    nivel: 3, rotulo: 'Médio',
    financeiro: 'De 10,01% a 30% do faturamento',
    reputacao: 'Dano significativo, afetando stakeholders',
    operacional: 'Perda de eficiência operacional e capacidade gerencial',
    legal: 'Multas financeiras de médio porte',
    ambiental: 'Danos ambientais moderados',
    social: 'Impacto em áreas habitadas de pequena escala',
  },
  {
    nivel: 2, rotulo: 'Baixo',
    financeiro: 'De 5,01% a 10% do faturamento',
    reputacao: 'Impacto moderado, restrito a clientes e parceiros',
    operacional: 'Atrasos e degradação de desempenho operacional',
    legal: 'Advertências, multas leves',
    ambiental: 'Impacto ambiental pontual',
    social: 'Impacto restrito a local específico',
  },
  {
    nivel: 1, rotulo: 'Muito Baixo',
    financeiro: 'Até 5% do faturamento',
    reputacao: 'Impacto mínimo, perceptível apenas internamente',
    operacional: 'Pequena redução na eficiência operacional',
    legal: 'Atenção regulatória mínima',
    ambiental: 'Impacto ambiental mínimo',
    social: 'Impacto localizado, sem efeitos significativos',
  },
];

export const TABELA_GUT = [
  {
    nivel: 5,
    gravidade: 'Impacto catastrófico, comprometendo a continuidade do negócio',
    urgencia: 'Requer ação imediata para evitar consequências graves',
    tendencia: 'O problema crescerá exponencialmente',
  },
  {
    nivel: 4,
    gravidade: 'Impacto grave, exigindo medidas urgentes',
    urgencia: 'Precisa ser resolvido o mais rápido possível',
    tendencia: 'O problema se agravará rapidamente',
  },
  {
    nivel: 3,
    gravidade: 'Impacto moderado, causando prejuízos operacionais',
    urgencia: 'Deve ser resolvido em alguns dias',
    tendencia: 'O problema tende a crescer progressivamente',
  },
  {
    nivel: 2,
    gravidade: 'Impacto pequeno, facilmente reversível',
    urgencia: 'Pode esperar algumas semanas',
    tendencia: 'O problema pode piorar, mas lentamente',
  },
  {
    nivel: 1,
    gravidade: 'Impacto insignificante, sem efeitos relevantes',
    urgencia: 'Pode ser resolvido a longo prazo',
    tendencia: 'O problema não piora com o tempo',
  },
];

// --- Risk Level Helpers ---

export function getRiskLevel(score: number): { label: string; color: string } {
  if (score >= 20) return { label: 'Crítico', color: '#EF4444' };
  if (score >= 12) return { label: 'Alto', color: '#F97316' };
  if (score >= 6) return { label: 'Médio', color: '#F59E0B' };
  if (score >= 2) return { label: 'Baixo', color: '#10B981' };
  return { label: 'Muito Baixo', color: '#6EE7B7' };
}

export function getGutLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Crítico', color: '#EF4444' };
  if (score >= 36) return { label: 'Alto', color: '#F97316' };
  if (score >= 12) return { label: 'Médio', color: '#F59E0B' };
  return { label: 'Baixo', color: '#10B981' };
}

export function getMatrixColor(prob: number, imp: number): string {
  const score = prob * imp;
  if (score >= 20) return '#EF4444';
  if (score >= 12) return '#F97316';
  if (score >= 6) return '#F59E0B';
  if (score >= 2) return '#86EFAC';
  return '#6EE7B7';
}

// --- Initial Sample Data (from DAMACORP spreadsheet) ---

export const INITIAL_RISKS: Risk[] = [
  {
    id: 'R003',
    fonteDeRisco: 'FE - Meio ambiente',
    descricaoFonte: 'Raios e descargas elétricas em região com alta incidência, infraestrutura de proteção insuficiente no Data Center.',
    ameaca: 'Raio atingindo infraestrutura do Data Center',
    descricaoRisco: 'Raio ocasionando perda total de DC, interrompendo todas as operações de e-commerce e causando prejuízos financeiros significativos.',
    estrategico: 'SIM',
    tipoRisco: 'Risco Operacional',
    probabilidade: 2,
    impacto: 5,
    riscoInerente: 10,
    consequencia: 'Perda total do Data Center, interrupção completa das operações de e-commerce, perda de dados, prejuízos financeiros e reputacionais graves.',
    gravidade: 5,
    urgencia: 4,
    tendencia: 2,
    gutScore: 40,
    tratamento: 'Mitigar e Transferir',
    controles: 'Redundância de DC em nuvem, Backups offsite, Seguro patrimonial, Para-raios e proteção elétrica, Plano de Disaster Recovery.',
    responsavel: 'CIO',
    prazo: '6 meses',
    kri: 'Disponibilidade do DC; Tempo de recuperação em testes de DR; Status dos backups offsite',
    acaoKri: 'Ativar plano de Disaster Recovery e failover para DC secundário',
    quemMede: 'CIO',
    quandoMede: 'Mensalmente',
    reducaoPretendida: 4,
    riscoResidual: 1,
    eficaciaTratamento: 'RTO/RPO em testes de DR. Disponibilidade do DC secundário. Cobertura do seguro patrimonial.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'R004',
    fonteDeRisco: 'FI - Processos internos',
    descricaoFonte: 'Funcionários insatisfeitos ou ex-funcionários com acesso a sistemas críticos, falta de controles de acesso adequados.',
    ameaca: 'Sabotagem por colaborador interno',
    descricaoRisco: 'Sabotagem ocasionando parada operacional abrupta das operações, comprometendo sistemas críticos e causando perdas financeiras e de dados.',
    estrategico: 'SIM',
    tipoRisco: 'Risco de Segurança da Informação (Cibernético)',
    probabilidade: 3,
    impacto: 4,
    riscoInerente: 12,
    consequencia: 'Parada operacional abrupta, perda ou corrupção de dados, danos à reputação, possíveis processos judiciais.',
    gravidade: 4,
    urgencia: 4,
    tendencia: 3,
    gutScore: 48,
    tratamento: 'Mitigar',
    controles: 'Controle de acesso rigoroso (princípio do menor privilégio), Monitoramento de atividades de usuários, Processo de offboarding seguro, Segregação de funções, Backups regulares.',
    responsavel: 'CISO',
    prazo: '3 meses',
    kri: 'Número de acessos privilegiados ativos; Tempo médio de revogação de acesso pós-desligamento; Alertas de comportamento anômalo',
    acaoKri: 'Revogar acessos imediatamente e investigar atividade suspeita',
    quemMede: 'CISO',
    quandoMede: 'Semanalmente',
    reducaoPretendida: 3,
    riscoResidual: 2,
    eficaciaTratamento: 'Tempo de revogação de acesso. Número de incidentes internos. Taxa de conformidade com política de acesso.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'R005',
    fonteDeRisco: 'FE - Governo',
    descricaoFonte: 'Novas regulamentações de proteção de dados (LGPD), fiscalização intensificada, mudanças na legislação tributária.',
    ameaca: 'Descumprimento de LGPD por vazamento de dados',
    descricaoRisco: 'Ransomware ocasionando acesso ou vazamento de dados, eventual descumprimento de LGPD, resultando em multas severas e danos reputacionais.',
    estrategico: 'SIM',
    tipoRisco: 'Risco de Conformidade (Regulatório e Legal)',
    probabilidade: 3,
    impacto: 4,
    riscoInerente: 12,
    consequencia: 'Multas de até 2% do faturamento por infração à LGPD, processos judiciais, perda de confiança dos clientes, danos reputacionais graves.',
    gravidade: 4,
    urgencia: 5,
    tendencia: 4,
    gutScore: 80,
    tratamento: 'Mitigar',
    controles: 'Programa de conformidade LGPD, DPO nomeado, Criptografia de dados pessoais, Política de privacidade atualizada, Treinamento de colaboradores, Resposta a incidentes de dados.',
    responsavel: 'DPO / Jurídico',
    prazo: '6 meses',
    kri: 'Número de incidentes de vazamento de dados; Tempo de resposta a solicitações de titulares; Nível de conformidade LGPD',
    acaoKri: 'Notificar ANPD e titulares, acionar plano de resposta a incidentes de dados',
    quemMede: 'DPO',
    quandoMede: 'Mensalmente',
    reducaoPretendida: 3,
    riscoResidual: 2,
    eficaciaTratamento: 'Nível de conformidade LGPD. Tempo de resposta a incidentes. Resultado de auditorias de privacidade.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function generateRiskId(existingRisks: Risk[]): string {
  const maxNum = existingRisks.reduce((max, r) => {
    const num = parseInt(r.id.replace(/\D/g, ''), 10);
    return num > max ? num : max;
  }, 0);
  return `R${String(maxNum + 1).padStart(3, '0')}`;
}

export function createEmptyRisk(id: string): Risk {
  const now = new Date().toISOString();
  return {
    id,
    fonteDeRisco: '',
    descricaoFonte: '',
    ameaca: '',
    descricaoRisco: '',
    estrategico: 'NÃO',
    tipoRisco: '',
    probabilidade: 1,
    impacto: 1,
    riscoInerente: 1,
    consequencia: '',
    gravidade: 1,
    urgencia: 1,
    tendencia: 1,
    gutScore: 1,
    tratamento: '',
    controles: '',
    responsavel: '',
    prazo: '',
    kri: '',
    acaoKri: '',
    quemMede: '',
    quandoMede: '',
    reducaoPretendida: 1,
    riscoResidual: 1,
    eficaciaTratamento: '',
    createdAt: now,
    updatedAt: now,
  };
}
