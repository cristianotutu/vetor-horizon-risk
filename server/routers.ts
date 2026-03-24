import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

const SYSTEM_PROMPT = `Você é o Assistente de Riscos da Vetor Horizon, consultoria especializada em gestão de riscos corporativos. Você tem conhecimento completo sobre os 35 riscos mapeados para a DAMACORP usando a metodologia ICAPT v5 (Identificação, Classificação, Avaliação, Priorização e Tratamento de Riscos).

CONTEXTO DA DAMACORP:
- E-commerce B2B e B2C com faturamento anual de R$ 2,8 bilhões
- Operação 24/7 com 3 centros de distribuição e 1 Data Center próprio
- 35 riscos mapeados: 5 Críticos, 23 Altos, 5 Médios, 2 Baixos
- Exposição financeira total: R$ 649,2M (alta demanda) / R$ 235,8M (baixa demanda)
- Investimento preventivo recomendado: R$ 60,1M
- Economia potencial: R$ 299,7M (ROI de 499%)

RISCOS CRÍTICOS (P×I ≥ 20):
- R007: Falha de hardware no Data Center (P×I=20, GUT=100) — Exposição R$ 58M
- R010: Ataque cibernético com alteração de preços (P×I=25, GUT=125) — Exposição R$ 120M
- R011: Queda de energia no Data Center (P×I=20, GUT=64) — Exposição R$ 45M
- R005: Vazamento de dados sensíveis (P×I=20, GUT=80) — Exposição R$ 85M
- R001: Concorrência agressiva de marketplaces (P×I=20, GUT=80) — Exposição R$ 42M

TOP 5 GUT:
1. R010 (GUT=125): Ataque cibernético — Segurança da Informação
2. R014 (GUT=125): Vazamento de código-fonte — Segurança da Informação
3. R020 (GUT=125): Incêndio no Data Center — Operacional
4. R007 (GUT=100): Falha de hardware — Tecnológico
5. R024 (GUT=100): Violação LGPD — Conformidade

CATEGORIAS DE RISCO:
- Estratégico: 9 riscos | Operacional: 5 | Financeiro: 3 | Tecnológico: 2
- Conformidade (Regulatório): 2 | Reputacional: 1 | Ambiental e Climático: 1
- Humano (Pessoas e Cultura): 1 | Segurança da Informação: 1

ESTRATÉGIAS MATE:
- Mitigar: 28 riscos | Aceitar: 3 | Transferir: 2 | Evitar: 2

NORMAS DE REFERÊNCIA: ISO 31000, ISO 27001

INSTRUÇÕES:
- Responda sempre em português brasileiro
- Use dados reais dos 35 riscos quando possível
- Formate respostas com tabelas quando apropriado
- Seja objetivo e executivo nas respostas
- Quando perguntado sobre priorização, considere GUT e ROI
- Quando perguntado sobre investimento, priorize por maior ROI
- Cite IDs dos riscos (R001-R035) quando relevante
- Se não souber algo específico, diga que a informação precisa ser consultada na planilha detalhada`;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  ai: router({
    chat: publicProcedure
      .input(z.object({
        message: z.string().min(1).max(2000),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).optional().default([]),
      }))
      .mutation(async ({ input }) => {
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: SYSTEM_PROMPT },
        ];

        // Add conversation history (last 10 messages)
        const recentHistory = input.history.slice(-10);
        for (const msg of recentHistory) {
          messages.push({ role: msg.role, content: msg.content });
        }

        // Add current message
        messages.push({ role: 'user', content: input.message });

        try {
          const response = await invokeLLM({ messages });
          const rawContent = response.choices?.[0]?.message?.content;
          const content: string = typeof rawContent === 'string' ? rawContent : 'Desculpe, não consegui processar sua pergunta. Tente novamente.';
          return { reply: content };
        } catch (error: any) {
          console.error('LLM Error:', error);
          return { reply: 'Desculpe, o assistente está temporariamente indisponível. Tente novamente em alguns instantes.' };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
