import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, StyleSheet, Platform } from "react-native";
import { useState, useMemo, useCallback} from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useRisks } from "@/lib/risk-context";
import { getRiskLevel, getGutLevel, Risk } from "@/lib/models";
import { GlowCard } from "@/components/ui/glow-card";
import Animated, { FadeInDown } from "react-native-reanimated";

// ─── DESIGN TOKENS ────────────────────────────────────────────
const C = {
  bg: '#0A0E14',
  card: '#0D1117',
  cardAlt: '#111820',
  border: '#1A3A2A',
  cyan: '#00E5FF',
  green: '#00FF88',
  yellow: '#FFD600',
  red: '#FF3D3D',
  orange: '#FF8C00',
  purple: '#A855F7',
  blue: '#3B82F6',
  text: '#E0F0E0',
  muted: '#6B8A7A',
  white: '#FFFFFF',
};

function fmt(val: number): string {
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}K`;
  return `R$ ${val.toFixed(0)}`;
}

function pct(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(0)}%` : '0%';
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function ReportScreen() {
  const { risks } = useRisks();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [currentSlide, setCurrentSlide] = useState(0);

  // ─── COMPUTED DATA ────────────────────────────────────────
  const data = useMemo(() => {
    const total = risks.length;
    const criticos = risks.filter(r => r.riscoInerente >= 20);
    const altos = risks.filter(r => r.riscoInerente >= 12 && r.riscoInerente < 20);
    const medios = risks.filter(r => r.riscoInerente >= 6 && r.riscoInerente < 12);
    const baixos = risks.filter(r => r.riscoInerente < 6);

    // Financial
    const totalPerdaAlta = risks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaAltaDemanda || 0), 0);
    const totalPerdaBaixa = risks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaBaixaDemanda || 0), 0);
    const totalPerdaMedia = risks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaMediaEsperada || 0), 0);
    const totalInvestimento = risks.reduce((s, r) => s + (r.impactoFinanceiro?.investimentoPreventivo || 0), 0);
    const totalPerdaEvitada = risks.reduce((s, r) => s + (r.impactoFinanceiro?.perdaEvitada || 0), 0);
    const roiGlobal = totalInvestimento > 0 ? (totalPerdaEvitada / totalInvestimento) * 100 : 0;

    // Residual
    const totalInerente = risks.reduce((s, r) => s + r.riscoInerente, 0);
    const totalResidual = risks.reduce((s, r) => s + (r.riscoResidual || r.riscoInerente), 0);
    const reducaoGlobal = totalInerente > 0 ? ((1 - totalResidual / totalInerente) * 100) : 0;

    // Top 10 GUT
    const top10 = [...risks].sort((a, b) => b.gutScore - a.gutScore).slice(0, 10);

    // Top 5 financial
    const top5Financial = [...risks]
      .filter(r => r.impactoFinanceiro)
      .sort((a, b) => (b.impactoFinanceiro?.perdaMediaEsperada || 0) - (a.impactoFinanceiro?.perdaMediaEsperada || 0))
      .slice(0, 5);

    // Top 5 ROI
    const top5ROI = [...risks]
      .filter(r => r.impactoFinanceiro && r.impactoFinanceiro.roiPrevencao > 0)
      .sort((a, b) => (b.impactoFinanceiro?.roiPrevencao || 0) - (a.impactoFinanceiro?.roiPrevencao || 0))
      .slice(0, 5);

    // MATE distribution
    const mate: Record<string, number> = {};
    risks.forEach(r => {
      const t = r.tratamento || 'Não definido';
      mate[t] = (mate[t] || 0) + 1;
    });

    // By type
    const byType: Record<string, Risk[]> = {};
    risks.forEach(r => {
      const t = r.tipoRisco || 'Não classificado';
      if (!byType[t]) byType[t] = [];
      byType[t].push(r);
    });

    // 4 Ameaças Críticas (agrupadas por tema)
    const threatGroups = [
      {
        title: 'Cibersegurança',
        color: C.red,
        icon: '🛡',
        risks: risks.filter(r =>
          r.tipoRisco.includes('Cibernético') || r.tipoRisco.includes('Tecnológico') ||
          r.descricaoRisco.toLowerCase().includes('ransomware') || r.descricaoRisco.toLowerCase().includes('vazamento') ||
          r.descricaoRisco.toLowerCase().includes('cibernético') || r.descricaoRisco.toLowerCase().includes('hacker')
        ),
        desc: 'Ataques cibernéticos, vazamento de dados e vulnerabilidades tecnológicas que ameaçam a operação digital.',
      },
      {
        title: 'Continuidade de Negócios',
        color: C.orange,
        icon: '⚡',
        risks: risks.filter(r =>
          r.descricaoRisco.toLowerCase().includes('continuidade') || r.descricaoRisco.toLowerCase().includes('indisponibilidade') ||
          r.descricaoRisco.toLowerCase().includes('cloud') || r.descricaoRisco.toLowerCase().includes('datacenter') ||
          r.descricaoRisco.toLowerCase().includes('sap') || r.descricaoRisco.toLowerCase().includes('erp') ||
          r.descricaoRisco.toLowerCase().includes('infraestrutura')
        ),
        desc: 'Dependência de provedores únicos, ausência de PCN e vulnerabilidades na infraestrutura crítica.',
      },
      {
        title: 'Competitividade e Mercado',
        color: C.yellow,
        icon: '📉',
        risks: risks.filter(r =>
          r.tipoRisco.includes('Mercado') || r.tipoRisco.includes('Competitivo') ||
          r.descricaoRisco.toLowerCase().includes('concorrência') || r.descricaoRisco.toLowerCase().includes('market') ||
          r.descricaoRisco.toLowerCase().includes('marketplace') || r.descricaoRisco.toLowerCase().includes('preço')
        ),
        desc: 'Perda de market share por concorrentes subsidiados, guerras de preço e mudanças no comportamento do consumidor.',
      },
      {
        title: 'Governança e Compliance',
        color: C.purple,
        icon: '⚖',
        risks: risks.filter(r =>
          r.tipoRisco.includes('Governança') || r.tipoRisco.includes('Compliance') || r.tipoRisco.includes('Regulatório') ||
          r.descricaoRisco.toLowerCase().includes('lgpd') || r.descricaoRisco.toLowerCase().includes('regulatório') ||
          r.descricaoRisco.toLowerCase().includes('compliance') || r.descricaoRisco.toLowerCase().includes('societário') ||
          r.descricaoRisco.toLowerCase().includes('governança')
        ),
        desc: 'Riscos regulatórios, conflitos societários e fragilidades na estrutura de governança corporativa.',
      },
    ];

    // FAIR/COSO metrics
    const faturamento = 350000000; // R$ 350M/ano
    const ebitdaMargin = 0.135; // 13.5%
    const ebitda = faturamento * ebitdaMargin; // R$ 47.25M
    const apetiteRiscoPct = 0.05; // 5% do EBITDA = limite aceitável
    const apetiteRisco = ebitda * apetiteRiscoPct; // ~R$ 2.36M
    const toleranciaRisco = ebitda * 0.15; // 15% do EBITDA = tolerância máxima
    const capacidadeRisco = ebitda * 0.30; // 30% do EBITDA = capacidade máxima

    return {
      total, criticos, altos, medios, baixos,
      totalPerdaAlta, totalPerdaBaixa, totalPerdaMedia,
      totalInvestimento, totalPerdaEvitada, roiGlobal,
      totalInerente, totalResidual, reducaoGlobal,
      top10, top5Financial, top5ROI, mate, byType, threatGroups,
      faturamento, ebitda, ebitdaMargin, apetiteRisco, toleranciaRisco, capacidadeRisco,
    };
  }, [risks]);

  // ─── SLIDE DEFINITIONS ────────────────────────────────────
  const slides = useMemo(() => [
    { id: 0, title: 'ABERTURA', subtitle: 'Por que estamos aqui?', color: C.cyan },
    { id: 1, title: 'CONTEXTO', subtitle: 'O que é risco e por que importa', color: C.blue },
    { id: 2, title: 'METODOLOGIA', subtitle: 'ICAPT — Como avaliamos', color: C.cyan },
    { id: 3, title: 'AMEAÇAS CRÍTICAS', subtitle: 'As 4 ameaças aos objetivos', color: C.red },
    { id: 4, title: 'MAPA DE CALOR', subtitle: 'Onde estamos hoje', color: C.orange },
    { id: 5, title: 'IMPACTO FINANCEIRO', subtitle: 'O custo da inação', color: C.red },
    { id: 6, title: 'PLANO DE TRATAMENTO', subtitle: 'Retomando o controle (MATE)', color: C.green },
    { id: 7, title: 'GOVERNANÇA', subtitle: 'O papel do Conselho', color: C.purple },
    { id: 8, title: 'BENEFÍCIOS', subtitle: 'O que a DAMACORP ganha', color: C.green },
    { id: 9, title: 'PRÓXIMOS PASSOS', subtitle: 'Decisões para hoje', color: C.yellow },
  ], []);

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < slides.length) setCurrentSlide(idx);
  }, [slides.length]);

  // ─── SLIDE COMPONENTS ─────────────────────────────────────

  const SlideAbertura = () => (
    <View style={st.slideContent}>
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 3, marginBottom: 16 }}>VETOR HORIZON CONSULTORIA</Text>
        <Text style={{ color: C.text, fontSize: isDesktop ? 28 : 22, fontWeight: '800', fontFamily: 'monospace', textAlign: 'center', lineHeight: isDesktop ? 38 : 30 }}>
          Riscos Estratégicos:{'\n'}O Que Não Vemos{'\n'}Pode Custar Caro
        </Text>
        <View style={{ height: 2, width: 60, backgroundColor: C.cyan, marginVertical: 16, borderRadius: 1 }} />
        <Text style={{ color: C.muted, fontSize: 13, fontFamily: 'monospace', textAlign: 'center', marginBottom: 8 }}>Relatório Executivo de Avaliação de Riscos (ERM)</Text>
        <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', textAlign: 'center' }}>Apresentado à Alta Administração e Sócios da DAMACORP</Text>
      </View>
      {/* Ambição vs Exposição */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12, marginTop: 16 }}>
        <View style={{ flex: 1, backgroundColor: C.green + '08', borderWidth: 1, borderColor: C.green + '30', borderRadius: 10, padding: 16 }}>
          <Text style={{ color: C.green, fontSize: 13, fontWeight: '800', fontFamily: 'monospace', marginBottom: 12 }}>A AMBIÇÃO</Text>
          {['10+ anos de disrupção e sucesso de mercado', 'EBITDA líquido atual de 13,50%', 'Meta: 26% de crescimento de market share em 5 anos'].map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Text style={{ color: C.green, fontSize: 12 }}>▲</Text>
              <Text style={{ color: C.text, fontSize: 12, fontFamily: 'monospace', flex: 1, lineHeight: 18 }}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, backgroundColor: C.red + '08', borderWidth: 1, borderColor: C.red + '30', borderRadius: 10, padding: 16 }}>
          <Text style={{ color: C.red, fontSize: 13, fontWeight: '800', fontFamily: 'monospace', marginBottom: 12 }}>A EXPOSIÇÃO</Text>
          {['Zero formalização de Plano de Continuidade (PCN)', `${data.criticos.length} riscos críticos sem controles formais`, `Exposição financeira de até ${fmt(data.totalPerdaAlta)}`].map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Text style={{ color: C.red, fontSize: 12 }}>▼</Text>
              <Text style={{ color: C.text, fontSize: 12, fontFamily: 'monospace', flex: 1, lineHeight: 18 }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ backgroundColor: C.red + '10', borderWidth: 1, borderColor: C.red + '25', borderRadius: 8, padding: 14, marginTop: 16 }}>
        <Text style={{ color: C.text, fontSize: 12, fontFamily: 'monospace', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' }}>
          "O sucesso passado criou uma falsa sensação de segurança. A infraestrutura que trouxe a DAMACORP até aqui não suportará a escala do futuro."
        </Text>
      </View>
    </View>
  );

  const SlideContexto = () => (
    <View style={st.slideContent}>
      <Text style={st.slideQuestion}>A DAMACORP está preparada para os desafios do futuro?</Text>
      <View style={{ backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>DEFINIÇÃO — ISO 31000</Text>
        <Text style={{ color: C.text, fontSize: 12, fontFamily: 'monospace', lineHeight: 20 }}>
          "Risco é o efeito da incerteza nos objetivos. Pode ser positivo (oportunidade) ou negativo (ameaça), e é medido pela combinação da probabilidade de ocorrência e da magnitude do impacto."
        </Text>
      </View>
      <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 12 }}>POR QUE A GESTÃO DE RISCOS É ESTRATÉGICA?</Text>
      {[
        { title: 'Crescimento exige exposição controlada', desc: 'A meta de 26% de market share em 5 anos multiplica os riscos operacionais e tecnológicos.' },
        { title: 'Governança de riscos protege o EBITDA', desc: `Com EBITDA de ${fmt(data.ebitda)}/ano, cada risco não gerenciado é uma ameaça direta à rentabilidade.` },
        { title: 'Frameworks internacionais como padrão', desc: 'ISO 31000, COSO ERM, FAIR Institute e RISK IT (ISACA) fundamentam nossa análise.' },
        { title: 'Política corporativa de riscos', desc: 'Não reinventamos a roda — utilizamos os termos, definições e melhores práticas das normas internacionais.' },
      ].map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.cyan + '15', borderWidth: 1, borderColor: C.cyan + '30', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.cyan, fontSize: 12, fontWeight: '800', fontFamily: 'monospace' }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>{item.title}</Text>
            <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', lineHeight: 17, marginTop: 2 }}>{item.desc}</Text>
          </View>
        </View>
      ))}
      {/* Framework badges */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {['ISO 31000', 'ISO 27001', 'ISO 22301', 'COSO ERM', 'FAIR Institute', 'RISK IT (ISACA)'].map(fw => (
          <View key={fw} style={{ backgroundColor: C.cyan + '10', borderWidth: 1, borderColor: C.cyan + '25', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: C.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>{fw}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const SlideMetodologia = () => (
    <View style={st.slideContent}>
      <Text style={{ color: C.text, fontSize: isDesktop ? 20 : 17, fontWeight: '800', fontFamily: 'monospace', marginBottom: 4 }}>Como Avaliamos o Seu Negócio</Text>
      <Text style={{ color: C.muted, fontSize: 12, fontFamily: 'monospace', marginBottom: 20 }}>Metodologia ICAPT v5 — 5 etapas estruturadas</Text>
      {[
        { step: '1', title: 'Identificação', desc: 'Mapeamento de fontes de risco, ameaças e vulnerabilidades', color: C.cyan },
        { step: '2', title: 'Classificação', desc: 'Categorização em pilares (Estratégico, Operacional, Tecnológico)', color: C.blue },
        { step: '3', title: 'Análise', desc: 'Mensuração técnica de Probabilidade × Impacto + GUT', color: C.yellow },
        { step: '4', title: 'Priorização', desc: 'Curva de Pareto (80/20) para isolar o que é crítico', color: C.orange },
        { step: '5', title: 'Tratamento', desc: 'Definição da estratégia MATE e indicadores KRI', color: C.green },
      ].map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: item.color + '15', borderWidth: 1, borderColor: item.color + '30', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: item.color, fontSize: 16, fontWeight: '800', fontFamily: 'monospace' }}>{item.step}</Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ color: item.color, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' }}>{item.title}</Text>
            <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', lineHeight: 16, marginTop: 2 }}>{item.desc}</Text>
          </View>
          {i < 4 && <View style={{ position: 'absolute', left: 19, top: 42, width: 2, height: 10, backgroundColor: item.color + '30' }} />}
        </View>
      ))}
      <View style={{ backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginTop: 8 }}>
        <Text style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace', textAlign: 'center' }}>
          Baseado nos frameworks internacionais ISO 31000, ISO 22301, ISO 27005, COSO ERM e FAIR Institute
        </Text>
      </View>
    </View>
  );

  const SlideAmeacas = () => (
    <View style={st.slideContent}>
      <Text style={{ color: C.text, fontSize: isDesktop ? 20 : 17, fontWeight: '800', fontFamily: 'monospace', marginBottom: 4 }}>As 4 Ameaças Críticas aos Nossos Objetivos</Text>
      <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', marginBottom: 16 }}>Agrupamento estratégico dos {data.total} riscos identificados</Text>
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12, flexWrap: 'wrap' }}>
        {data.threatGroups.map((group, i) => (
          <View key={i} style={{ flex: isDesktop ? 1 : undefined, minWidth: isDesktop ? 200 : undefined, backgroundColor: group.color + '08', borderWidth: 1, borderColor: group.color + '30', borderRadius: 10, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>{group.icon}</Text>
              <Text style={{ color: group.color, fontSize: 13, fontWeight: '800', fontFamily: 'monospace', flex: 1 }}>{group.title}</Text>
            </View>
            <Text style={{ color: C.text, fontSize: 11, fontFamily: 'monospace', lineHeight: 17, marginBottom: 8 }}>{group.desc}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {group.risks.slice(0, 4).map(r => (
                <View key={r.id} style={{ backgroundColor: group.color + '15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: group.color, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>{r.id}</Text>
                </View>
              ))}
              {group.risks.length > 4 && (
                <View style={{ backgroundColor: group.color + '15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: group.color, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>+{group.risks.length - 4}</Text>
                </View>
              )}
            </View>
            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: group.color + '20', paddingTop: 6 }}>
              <Text style={{ color: group.color, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{group.risks.length} riscos mapeados</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const SlideMapaCalor = () => {
    // Build 5x5 matrix
    const matrix: Record<string, Risk[]> = {};
    risks.forEach(r => {
      const key = `${r.probabilidade}-${r.impacto}`;
      if (!matrix[key]) matrix[key] = [];
      matrix[key].push(r);
    });
    const getColor = (p: number, i: number) => {
      const score = p * i;
      if (score >= 20) return C.red;
      if (score >= 12) return C.orange;
      if (score >= 6) return C.yellow;
      return C.green;
    };

    return (
      <View style={st.slideContent}>
        <Text style={{ color: C.text, fontSize: isDesktop ? 20 : 17, fontWeight: '800', fontFamily: 'monospace', marginBottom: 4 }}>O Mapa de Calor: Onde Estamos Hoje</Text>
        <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', marginBottom: 16 }}>Risco Inerente — Probabilidade × Impacto</Text>
        {/* Matrix */}
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <View style={{ width: 20, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 8, fontFamily: 'monospace', transform: [{ rotate: '-90deg' }], width: 80 }}>PROBABILIDADE</Text>
          </View>
          <View style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map(p => (
              <View key={p} style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
                <View style={{ width: 18, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>{p}</Text>
                </View>
                {[1, 2, 3, 4, 5].map(imp => {
                  const cellRisks = matrix[`${p}-${imp}`] || [];
                  const cellColor = getColor(p, imp);
                  const cellSize = isDesktop ? 60 : 48;
                  return (
                    <View key={imp} style={{ flex: 1, height: cellSize, backgroundColor: cellColor + '20', borderWidth: 1, borderColor: cellColor + '40', borderRadius: 4, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <Text style={{ color: cellColor + '60', fontSize: 10, fontWeight: '700', fontFamily: 'monospace', position: 'absolute', top: 2, left: 4 }}>{p * imp}</Text>
                      {cellRisks.length > 0 && (
                        <View style={{ backgroundColor: cellColor, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' }}>
                          <Text style={{ color: '#000', fontSize: 9, fontWeight: '800', fontFamily: 'monospace' }}>{cellRisks.length}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 2, marginTop: 4, marginLeft: 18 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>{i}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: C.muted, fontSize: 8, fontFamily: 'monospace', textAlign: 'center', marginTop: 2 }}>IMPACTO</Text>
          </View>
        </View>
        {/* Summary */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {[
            { label: 'Crítico (≥20)', count: data.criticos.length, color: C.red },
            { label: 'Alto (12-19)', count: data.altos.length, color: C.orange },
            { label: 'Médio (6-11)', count: data.medios.length, color: C.yellow },
            { label: 'Baixo (<6)', count: data.baixos.length, color: C.green },
          ].map(item => (
            <View key={item.label} style={{ flex: 1, minWidth: 70, backgroundColor: item.color + '10', borderWidth: 1, borderColor: item.color + '25', borderRadius: 6, padding: 8, alignItems: 'center' }}>
              <Text style={{ color: item.color, fontSize: 18, fontWeight: '800', fontFamily: 'monospace' }}>{item.count}</Text>
              <Text style={{ color: C.muted, fontSize: 8, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center', marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: C.red + '10', borderWidth: 1, borderColor: C.red + '25', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <Text style={{ color: C.text, fontSize: 11, fontFamily: 'monospace', textAlign: 'center', lineHeight: 18, fontStyle: 'italic' }}>
            "A maioria absoluta das nossas exposições críticas encontra-se sem controles formais. Estamos operando na zona vermelha da matriz."
          </Text>
        </View>
      </View>
    );
  };

  const SlideImpactoFinanceiro = () => (
    <View style={st.slideContent}>
      <Text style={{ color: C.text, fontSize: isDesktop ? 20 : 17, fontWeight: '800', fontFamily: 'monospace', marginBottom: 4 }}>O Custo da Inação: Impacto Financeiro</Text>
      <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', marginBottom: 16 }}>Cenários com e sem gestão de riscos — Modelo FAIR</Text>
      {/* Cenário SEM gestão */}
      <View style={{ backgroundColor: C.red + '08', borderWidth: 1, borderColor: C.red + '30', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <Text style={{ color: C.red, fontSize: 11, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 10 }}>CENÁRIO SEM GESTÃO DE RISCOS</Text>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' }}>EXPOSIÇÃO ALTA DEMANDA</Text>
            <Text style={{ color: C.red, fontSize: 22, fontWeight: '800', fontFamily: 'monospace' }}>{fmt(data.totalPerdaAlta)}</Text>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>Black Friday / Natal</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' }}>EXPOSIÇÃO BAIXA DEMANDA</Text>
            <Text style={{ color: C.orange, fontSize: 22, fontWeight: '800', fontFamily: 'monospace' }}>{fmt(data.totalPerdaBaixa)}</Text>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>Período normal</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' }}>PERDA MÉDIA ESPERADA</Text>
            <Text style={{ color: C.yellow, fontSize: 22, fontWeight: '800', fontFamily: 'monospace' }}>{fmt(data.totalPerdaMedia)}</Text>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>Anualizada (FAIR)</Text>
          </View>
        </View>
      </View>
      {/* Cenário COM gestão */}
      <View style={{ backgroundColor: C.green + '08', borderWidth: 1, borderColor: C.green + '30', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <Text style={{ color: C.green, fontSize: 11, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 10 }}>CENÁRIO COM GESTÃO DE RISCOS</Text>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' }}>INVESTIMENTO PREVENTIVO</Text>
            <Text style={{ color: C.cyan, fontSize: 22, fontWeight: '800', fontFamily: 'monospace' }}>{fmt(data.totalInvestimento)}</Text>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>Controles + Contingências</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' }}>PERDA EVITADA</Text>
            <Text style={{ color: C.green, fontSize: 22, fontWeight: '800', fontFamily: 'monospace' }}>{fmt(data.totalPerdaEvitada)}</Text>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>Economia projetada</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace', fontWeight: '700' }}>ROI DA PREVENÇÃO</Text>
            <Text style={{ color: C.green, fontSize: 22, fontWeight: '800', fontFamily: 'monospace' }}>{data.roiGlobal.toFixed(0)}%</Text>
            <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>Retorno sobre investimento</Text>
          </View>
        </View>
      </View>
      {/* Top 5 maiores perdas */}
      <Text style={{ color: C.red, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>TOP 5 — MAIORES PERDAS ESPERADAS (ALE — FAIR)</Text>
      <View style={{ backgroundColor: C.cardAlt, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
        {data.top5Financial.map((r, i) => (
          <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border + '40', backgroundColor: i % 2 === 0 ? C.cardAlt : C.card }}>
            <Text style={{ width: 45, color: C.text, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{r.id}</Text>
            <Text style={{ flex: 1, color: C.muted, fontSize: 9, fontFamily: 'monospace' }} numberOfLines={1}>{r.descricaoRisco.substring(0, 50)}...</Text>
            <Text style={{ width: 70, color: C.red, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>{fmt(r.impactoFinanceiro?.perdaMediaEsperada || 0)}</Text>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: C.green + '10', borderWidth: 1, borderColor: C.green + '25', borderRadius: 8, padding: 12, marginTop: 12 }}>
        <Text style={{ color: C.text, fontSize: 11, fontFamily: 'monospace', textAlign: 'center', lineHeight: 18, fontStyle: 'italic' }}>
          "Investir em controles preventivos reduz em até 80% o impacto financeiro de um incidente crítico."
        </Text>
      </View>
    </View>
  );

  const SlideTratamento = () => {
    const mateItems = [
      { strategy: 'Mitigar', desc: 'Reduzir probabilidade e/ou impacto', color: C.green, icon: '✓', actions: ['Contratar CISO imediato', 'Estruturar SGCN e BIA (ISO 22301)', 'Implementar SOC 24/7 e WAF'] },
      { strategy: 'Aceitar', desc: 'Risco consciente com reserva', color: C.muted, icon: '○', actions: ['Assumir risco residual de mercado', 'Reserva de contingência (3 meses Opex)', 'Monitorar via KRIs trimestrais'] },
      { strategy: 'Transferir', desc: 'Compartilhar o peso', color: C.blue, icon: '↔', actions: ['Estratégia Multi-Cloud (Exit Plan)', 'Apólice de Cyber Insurance', 'SLAs com penalidades contratuais'] },
      { strategy: 'Evitar', desc: 'Cortar a raiz', color: C.red, icon: '✕', actions: ['Encerrar política BYOD permissiva', 'NDAs blindados para agências', 'Segregação de acesso por função'] },
    ];
    return (
      <View style={st.slideContent}>
        <Text style={{ color: C.text, fontSize: isDesktop ? 20 : 17, fontWeight: '800', fontFamily: 'monospace', marginBottom: 4 }}>Plano de Ação: Retomando o Controle</Text>
        <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', marginBottom: 16 }}>Modelo MATE — Mitigar, Aceitar, Transferir, Evitar</Text>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10, flexWrap: 'wrap' }}>
          {mateItems.map((item, i) => (
            <View key={i} style={{ flex: isDesktop ? 1 : undefined, minWidth: isDesktop ? 150 : undefined, backgroundColor: item.color + '08', borderWidth: 1, borderColor: item.color + '30', borderRadius: 10, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: item.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: item.color, fontSize: 12, fontWeight: '800' }}>{item.icon}</Text>
                </View>
                <View>
                  <Text style={{ color: item.color, fontSize: 12, fontWeight: '800', fontFamily: 'monospace' }}>{item.strategy}</Text>
                  <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>{item.desc}</Text>
                </View>
              </View>
              {item.actions.map((action, j) => (
                <View key={j} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: item.color, fontSize: 9 }}>▸</Text>
                  <Text style={{ color: C.text, fontSize: 10, fontFamily: 'monospace', flex: 1, lineHeight: 15 }}>{action}</Text>
                </View>
              ))}
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: item.color + '20', paddingTop: 6 }}>
                <Text style={{ color: item.color, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>
                  {Object.entries(data.mate).filter(([k]) => k.includes(item.strategy)).reduce((s, [, v]) => s + v, 0)} riscos
                </Text>
              </View>
            </View>
          ))}
        </View>
        {/* Eficácia comprovada */}
        <Text style={{ color: C.green, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1, marginTop: 16, marginBottom: 8 }}>REDUÇÃO COMPROVADA DE EXPOSIÇÃO</Text>
        <View style={{ backgroundColor: C.cardAlt, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', backgroundColor: C.card, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ flex: 1, color: C.cyan, fontSize: 9, fontWeight: '700', fontFamily: 'monospace' }}>AMEAÇA</Text>
            <Text style={{ width: 55, color: C.red, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>INERENTE</Text>
            <Text style={{ width: 20, color: C.muted, fontSize: 9, textAlign: 'center' }}>→</Text>
            <Text style={{ width: 55, color: C.green, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>RESIDUAL</Text>
            <Text style={{ width: 50, color: C.green, fontSize: 9, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>REDUÇÃO</Text>
          </View>
          {data.top10.slice(0, 5).map((r, i) => {
            const red = r.riscoInerente > 0 ? ((1 - (r.riscoResidual || r.riscoInerente) / r.riscoInerente) * 100) : 0;
            return (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border + '40', backgroundColor: i % 2 === 0 ? C.cardAlt : C.card }}>
                <Text style={{ flex: 1, color: C.text, fontSize: 10, fontFamily: 'monospace' }} numberOfLines={1}>{r.id} — {r.descricaoRisco.substring(0, 30)}...</Text>
                <View style={{ width: 55, alignItems: 'center' }}>
                  <View style={{ backgroundColor: C.red + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ color: C.red, fontSize: 10, fontWeight: '800', fontFamily: 'monospace' }}>{r.riscoInerente}</Text>
                  </View>
                </View>
                <Text style={{ width: 20, color: C.yellow, fontSize: 12, fontWeight: '800', textAlign: 'center' }}>→</Text>
                <View style={{ width: 55, alignItems: 'center' }}>
                  <View style={{ backgroundColor: C.green + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ color: C.green, fontSize: 10, fontWeight: '800', fontFamily: 'monospace' }}>{r.riscoResidual || r.riscoInerente}</Text>
                  </View>
                </View>
                <Text style={{ width: 50, color: red > 0 ? C.green : C.muted, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>{red > 0 ? `↓${red.toFixed(0)}%` : '—'}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const SlideGovernanca = () => (
    <View style={st.slideContent}>
      <Text style={{ color: C.text, fontSize: isDesktop ? 20 : 17, fontWeight: '800', fontFamily: 'monospace', marginBottom: 4 }}>A Governança Começa e Termina no Topo</Text>
      <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', marginBottom: 16 }}>O papel do Conselho de Administração — COSO ERM / RISK IT (ISACA)</Text>
      {/* Apetite de Risco */}
      <View style={{ backgroundColor: C.purple + '08', borderWidth: 1, borderColor: C.purple + '30', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: C.purple, fontSize: 11, fontWeight: '800', fontFamily: 'monospace', letterSpacing: 1, marginBottom: 12 }}>APETITE DE RISCO — COSO ERM / FAIR INSTITUTE</Text>
        <Text style={{ color: C.text, fontSize: 11, fontFamily: 'monospace', lineHeight: 18, marginBottom: 12 }}>
          Apetite de risco é o nível de risco que a organização está disposta a aceitar na busca de seus objetivos estratégicos. Para a DAMACORP, recomendamos:
        </Text>
        <View style={{ gap: 8 }}>
          {[
            { label: 'APETITE DE RISCO', value: fmt(data.apetiteRisco), desc: '5% do EBITDA — Limite aceitável', color: C.green, pct: 5 },
            { label: 'TOLERÂNCIA A RISCO', value: fmt(data.toleranciaRisco), desc: '15% do EBITDA — Tolerância máxima', color: C.yellow, pct: 15 },
            { label: 'CAPACIDADE DE RISCO', value: fmt(data.capacidadeRisco), desc: '30% do EBITDA — Capacidade máxima', color: C.red, pct: 30 },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: item.color, fontSize: 10, fontWeight: '700', fontFamily: 'monospace' }}>{item.label}</Text>
                <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace' }}>{item.desc}</Text>
              </View>
              <Text style={{ color: item.color, fontSize: 16, fontWeight: '800', fontFamily: 'monospace' }}>{item.value}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 12, backgroundColor: C.border, borderRadius: 6, overflow: 'hidden', flexDirection: 'row', marginTop: 12 }}>
          <View style={{ width: '5%', backgroundColor: C.green, borderRadius: 6 }} />
          <View style={{ width: '10%', backgroundColor: C.yellow }} />
          <View style={{ width: '15%', backgroundColor: C.red }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: C.green, fontSize: 8, fontFamily: 'monospace' }}>Aceitável</Text>
          <Text style={{ color: C.yellow, fontSize: 8, fontFamily: 'monospace' }}>Tolerável</Text>
          <Text style={{ color: C.red, fontSize: 8, fontFamily: 'monospace' }}>Inaceitável</Text>
        </View>
      </View>
      {/* 3 Pilares */}
      {[
        { num: '1', title: 'Definir o Apetite de Risco', desc: `Estabelecer limite claro de quanto risco a DAMACORP aceita em prol do crescimento de 26%. Recomendação: até ${fmt(data.apetiteRisco)} (5% do EBITDA).`, color: C.cyan },
        { num: '2', title: 'Exigir Indicadores (KRIs)', desc: 'Transformar a segurança em métrica de negócio. Monitorar painéis de risco nas reuniões de conselho. Cada KRI com threshold e ação automática.', color: C.green },
        { num: '3', title: 'Financiar a Resiliência', desc: `Aprovar orçamento de ${fmt(data.totalInvestimento)} para controles e liderança especializada (CISO, SGCN). A segurança não é custo, é blindagem do EBITDA.`, color: C.yellow },
      ].map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: item.color + '15', borderWidth: 1, borderColor: item.color + '30', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: item.color, fontSize: 14, fontWeight: '800', fontFamily: 'monospace' }}>{item.num}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: item.color, fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>{item.title}</Text>
            <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', lineHeight: 17, marginTop: 2 }}>{item.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const SlideBeneficios = () => (
    <View style={st.slideContent}>
      <Text style={{ color: C.text, fontSize: isDesktop ? 20 : 17, fontWeight: '800', fontFamily: 'monospace', marginBottom: 4 }}>O Que a DAMACORP Ganha com Isso?</Text>
      <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', marginBottom: 16 }}>Conectando riscos a rentabilidade, crescimento e competitividade</Text>
      {[
        { title: 'Redução de Perdas Financeiras', desc: `Economia projetada de ${fmt(data.totalPerdaEvitada)}/ano com investimento de ${fmt(data.totalInvestimento)} — ROI de ${data.roiGlobal.toFixed(0)}%.`, color: C.green, metric: fmt(data.totalPerdaEvitada), metricLabel: 'ECONOMIA/ANO' },
        { title: 'Previsibilidade e Controle', desc: `Redução de ${data.reducaoGlobal.toFixed(0)}% no risco inerente total. De ${data.criticos.length} riscos críticos para monitoramento contínuo via KRIs.`, color: C.cyan, metric: `${data.reducaoGlobal.toFixed(0)}%`, metricLabel: 'REDUÇÃO RISCO' },
        { title: 'Compliance e Reputação', desc: 'Conformidade com LGPD, ISO 31000, ISO 27001. Proteção da marca e confiança de investidores e stakeholders.', color: C.blue, metric: '6', metricLabel: 'FRAMEWORKS' },
        { title: 'Blindagem do EBITDA', desc: `EBITDA de ${fmt(data.ebitda)}/ano protegido por controles formais. Apetite de risco definido em ${fmt(data.apetiteRisco)} (5% EBITDA).`, color: C.yellow, metric: fmt(data.ebitda), metricLabel: 'EBITDA PROTEGIDO' },
      ].map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, backgroundColor: item.color + '05', borderWidth: 1, borderColor: item.color + '20', borderRadius: 10, padding: 14 }}>
          <View style={{ width: 70, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: item.color, fontSize: 16, fontWeight: '800', fontFamily: 'monospace' }}>{item.metric}</Text>
            <Text style={{ color: item.color + '80', fontSize: 7, fontWeight: '700', fontFamily: 'monospace', textAlign: 'center', marginTop: 2 }}>{item.metricLabel}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: item.color, fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>{item.title}</Text>
            <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', lineHeight: 17, marginTop: 2 }}>{item.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const SlideProximosPassos = () => (
    <View style={st.slideContent}>
      <Text style={{ color: C.text, fontSize: isDesktop ? 20 : 17, fontWeight: '800', fontFamily: 'monospace', marginBottom: 4 }}>Decisões Para Hoje: O Caminho da Resiliência</Text>
      <Text style={{ color: C.muted, fontSize: 11, fontFamily: 'monospace', marginBottom: 20 }}>Roadmap de implementação em 90 dias</Text>
      {[
        {
          phase: 'Dia 1 a 30',
          title: 'URGÊNCIA',
          color: C.red,
          items: [
            `Aprovar budget de ${fmt(data.totalInvestimento)} para investimento preventivo`,
            'Contratar CISO e iniciar desenho da arquitetura Multi-Cloud',
            `Priorizar tratamento dos ${data.criticos.length} riscos críticos (P×I ≥ 20)`,
            'Ativar controles emergenciais de cibersegurança',
          ],
        },
        {
          phase: 'Dia 30 a 60',
          title: 'ESTRUTURAÇÃO',
          color: C.orange,
          items: [
            'Iniciar mapeamento formal do SGCN e BIA (Análise de Impacto de Negócios)',
            'Implementar programa TPRM com SLAs e auditorias de terceiros',
            'Configurar monitoramento automatizado de KRIs',
            'Treinar equipes em cultura de risco e compliance',
          ],
        },
        {
          phase: 'Dia 60 a 90',
          title: 'GOVERNANÇA',
          color: C.green,
          items: [
            'Instituir o Comitê Executivo de Riscos e Compliance',
            'Formalizar política de apetite de risco aprovada pelo Conselho',
            'Realizar primeira simulação de crise e Disaster Recovery',
            'Publicar primeiro relatório trimestral de riscos ao Conselho',
          ],
        },
      ].map((horizon, i) => (
        <View key={i} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: horizon.color + '15', borderWidth: 1, borderColor: horizon.color + '30', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: horizon.color, fontSize: 9, fontWeight: '800', fontFamily: 'monospace' }}>{horizon.phase.split(' ')[1]}-{horizon.phase.split(' ')[3]}</Text>
            </View>
            <View>
              <Text style={{ color: horizon.color, fontSize: 12, fontWeight: '800', fontFamily: 'monospace' }}>{horizon.phase}</Text>
              <Text style={{ color: horizon.color + '80', fontSize: 10, fontFamily: 'monospace' }}>{horizon.title}</Text>
            </View>
          </View>
          {horizon.items.map((item, j) => (
            <View key={j} style={{ flexDirection: 'row', paddingLeft: 52, marginBottom: 6, gap: 8 }}>
              <Text style={{ color: horizon.color, fontSize: 10 }}>▸</Text>
              <Text style={{ color: C.text, fontSize: 11, lineHeight: 17, fontFamily: 'monospace', flex: 1 }}>{item}</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={{ backgroundColor: C.cyan + '10', borderWidth: 1, borderColor: C.cyan + '25', borderRadius: 8, padding: 14, marginTop: 4 }}>
        <Text style={{ color: C.text, fontSize: 12, fontFamily: 'monospace', textAlign: 'center', lineHeight: 20, fontStyle: 'italic' }}>
          "A resiliência corporativa não é um projeto de TI.{'\n'}É a garantia inegociável do nosso futuro."
        </Text>
      </View>
      {/* Footer */}
      <View style={{ alignItems: 'center', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border }}>
        <Text style={{ color: C.cyan, fontSize: 10, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 2 }}>VETOR HORIZON CONSULTORIA</Text>
        <Text style={{ color: C.muted, fontSize: 9, fontFamily: 'monospace', marginTop: 4 }}>ICAPT v5 — ISO 31000 | COSO ERM | FAIR Institute | RISK IT (ISACA)</Text>
      </View>
    </View>
  );

  const slideComponents = [
    SlideAbertura, SlideContexto, SlideMetodologia, SlideAmeacas,
    SlideMapaCalor, SlideImpactoFinanceiro, SlideTratamento,
    SlideGovernanca, SlideBeneficios, SlideProximosPassos,
  ];

  const CurrentSlideComponent = slideComponents[currentSlide];

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Navigation Bar */}
        <View style={{ backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 4, paddingHorizontal: isDesktop ? 16 : 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, alignItems: 'center' }}>
            {slides.map((slide, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => goTo(i)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: isDesktop ? 14 : 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: currentSlide === i ? slide.color + '20' : 'transparent',
                  borderWidth: currentSlide === i ? 1 : 0,
                  borderColor: slide.color + '40',
                }}
              >
                <Text style={{
                  color: currentSlide === i ? slide.color : C.muted,
                  fontSize: isDesktop ? 10 : 9,
                  fontWeight: currentSlide === i ? '800' : '600',
                  fontFamily: 'monospace',
                  letterSpacing: 0.5,
                }}>
                  {i + 1}. {slide.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Slide Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: isDesktop ? 12 : 10, paddingBottom: 40 }}
        >
          <Animated.View entering={FadeInDown.duration(300)} key={currentSlide}>
            {/* Slide Header */}
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: slides[currentSlide].color + '15', borderWidth: 1, borderColor: slides[currentSlide].color + '30', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: slides[currentSlide].color, fontSize: 10, fontWeight: '800', fontFamily: 'monospace' }}>{currentSlide + 1}</Text>
                </View>
                <Text style={{ color: slides[currentSlide].color, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1.5 }}>{slides[currentSlide].title}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace', marginLeft: 36 }}>{slides[currentSlide].subtitle}</Text>
            </View>

            <View style={{ maxWidth: isDesktop ? 1200 : undefined, alignSelf: isDesktop ? 'center' : undefined, width: '100%' }}>
              <CurrentSlideComponent />
            </View>
          </Animated.View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 6, paddingHorizontal: isDesktop ? 16 : 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => goTo(currentSlide - 1)}
            activeOpacity={0.7}
            style={{ opacity: currentSlide === 0 ? 0.3 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: C.cyan + '10' }}
            disabled={currentSlide === 0}
          >
            <Text style={{ color: C.cyan, fontSize: 14, fontWeight: '800' }}>←</Text>
            <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}>Anterior</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 4 }}>
            {slides.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
                <View style={{ width: currentSlide === i ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: currentSlide === i ? slides[i].color : C.border }} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => goTo(currentSlide + 1)}
            activeOpacity={0.7}
            style={{ opacity: currentSlide === slides.length - 1 ? 0.3 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: C.cyan + '10' }}
            disabled={currentSlide === slides.length - 1}
          >
            <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}>Próximo</Text>
            <Text style={{ color: C.cyan, fontSize: 14, fontWeight: '800' }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

// ─── STYLES ─────────────────────────────────────────────────
const st = StyleSheet.create({
  slideContent: {
    gap: 0,
  },
  slideQuestion: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
});
