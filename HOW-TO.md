# Vetor Horizon — Guia de Uso (How-To)

**Plataforma de Gestão de Riscos Corporativos — DAMACORP**

**Versão:** 1.0.0 | **Metodologia:** ICAPT v5 | **Frameworks:** FAIR Institute, COSO ERM, RISK IT (ISACA)

---

## Visão Geral

O Vetor Horizon é uma plataforma de gestão de riscos corporativos que permite visualizar, analisar e apresentar os 35 riscos mapeados da DAMACORP. O aplicativo possui 7 menus principais, cada um com uma função específica. Na primeira vez que você acessar qualquer menu, um **wizard tutorial** aparecerá automaticamente explicando o que aquela tela faz e como utilizá-la.

---

## 1. Dashboard

**Ícone:** Escudo | **Propósito:** Visão consolidada de todos os riscos

O Dashboard é a tela principal do aplicativo e oferece uma visão completa do panorama de riscos da DAMACORP. Ao acessar, você encontra:

**Cards de Resumo por Criticidade** — Na parte superior, 5 cards mostram a contagem de riscos por nível: Total (35), Críticos (PxI igual ou superior a 20), Altos (PxI de 12 a 19), Médios (PxI de 6 a 11) e Baixos (PxI de 1 a 5). Cada card é clicável e abre uma lista filtrada dos riscos daquele nível.

**Fluxo de Risco (3 Matrizes)** — A seção principal apresenta 3 matrizes de risco dispostas da esquerda para a direita em formato de fluxo:

| Matriz | Cor | O que mostra |
|--------|-----|-------------|
| **Inerente** | Vermelha | Risco ANTES dos controles. Mostra a exposição bruta de cada risco (Probabilidade x Impacto originais). |
| **Deslocamento** | Amarela | Mostra a migração de cada risco do estado inerente para o residual. Inclui tabela com ID do risco, score inerente, score residual e percentual de redução. |
| **Residual** | Verde | Risco APÓS os controles. Mostra a exposição real considerando as medidas de mitigação implementadas. |

Cada célula da matriz exibe o número de riscos naquela posição e o valor financeiro agregado em R$. Clique em qualquer célula para ver a lista de riscos daquele quadrante. O botão "?" ao lado de cada título de matriz exibe uma explicação do conceito.

**Distribuição por Tipo** — Gráfico de barras horizontais mostrando quantos riscos existem em cada categoria (Operacional, Cibernético, Financeiro, etc.), com indicador de nível máximo.

**Top 10 Riscos por GUT** — Lista dos 10 riscos com maior pontuação GUT (Gravidade x Urgência x Tendência), com badges de criticidade e link para o detalhe de cada risco.

**Impacto Financeiro Consolidado** — Painel com 4 indicadores: Exposição Total em Alta Demanda (Black Friday/Natal), Exposição em Baixa Demanda (período normal), Investimento Preventivo necessário e Economia Potencial com ROI.

**Resumo Executivo** — 4 KPIs: riscos estratégicos, GUT médio, PxI médio e riscos em tratamento.

**Como usar:** Clique nos cards, nas células da matriz ou nos riscos listados para navegar para os detalhes. O botão "Novo Risco" no canto superior direito permite cadastrar riscos adicionais.

---

## 2. Riscos

**Ícone:** Lista | **Propósito:** Catálogo completo dos 35 riscos

A tela de Riscos apresenta o catálogo completo de todos os riscos mapeados. Funcionalidades:

**Busca** — Campo de busca no topo permite localizar riscos por ID (ex.: R003), descrição, tipo ou fonte de risco.

**Filtros por Criticidade** — Botões de filtro rápido: Todos, Crítico, Alto, Médio, Baixo. Clique em um filtro para mostrar apenas os riscos daquele nível.

**Lista de Riscos** — Cada risco é exibido como um card com: ID, tipo de risco, badge de criticidade (cor), score GUT, descrição resumida, tratamento e responsável.

**Detalhe do Risco** — Ao clicar em qualquer risco, abre a tela de detalhes com todos os campos ICAPT v5:

| Seção | Campos |
|-------|--------|
| **Identificação** | ID, Fonte de Risco, Ameaça, Descrição (Forma 3) |
| **Classificação** | Tipo de Risco, Estratégico (SIM/NÃO), Origem (Interno/Externo) |
| **Avaliação** | Probabilidade (1-5), Impacto (1-5), Risco Inerente (PxI), Risco Residual |
| **Priorização GUT** | Gravidade, Urgência, Tendência, Score GUT |
| **Tratamento** | Estratégia MATE, Controles Existentes, Novos Controles, KRI |
| **Impacto Financeiro** | Perda Alta/Baixa Demanda, Investimento Preventivo, Perda Evitada, ROI |
| **FAIR/COSO/RISK IT** | SLE, ARO, ALE, Apetite, Tolerância, Capacidade, Domínio, Cenário |

**Como usar:** Use a busca para encontrar riscos específicos. Clique em um risco para ver todos os detalhes. O botão de edição permite modificar os dados do risco.

---

## 3. Evolução

**Ícone:** Gráfico de linha | **Propósito:** Comparativo entre versões (Aulas 03 a 06)

A tela de Evolução permite acompanhar como os riscos mudaram ao longo das 4 versões do estudo de caso:

**Seletor de Comparação** — Escolha o período de comparação: 3v4, 4v5, 5v6 ou 3v6 (comparação completa).

**Cards de Resumo** — Mostram quantos riscos são novos (verde), modificados (amarelo) e inalterados (cinza) entre as versões selecionadas. Cada card é clicável e abre a lista dos riscos naquela categoria.

**Matrizes Comparativas** — Duas matrizes lado a lado mostrando a distribuição dos riscos na versão anterior e na versão atual, permitindo visualizar a migração entre quadrantes.

**Lista de Mudanças** — Detalhamento de cada risco que mudou, mostrando o que foi alterado (probabilidade, impacto, tratamento, etc.).

**Como usar:** Selecione o modo de comparação desejado. Clique nos cards coloridos para ver os riscos de cada categoria. Use as matrizes para visualizar a migração.

---

## 4. Estratégico

**Ícone:** Gráfico de barras | **Propósito:** Visão para apresentação ao conselho

A tela Estratégica consolida as informações mais relevantes para apresentações ao board/conselho:

**Distribuição por Tipo de Risco** — Gráfico mostrando quantos riscos existem em cada categoria, com indicador de criticidade máxima.

**Análise MATE** — Distribuição das estratégias de tratamento: Mitigar, Aceitar, Transferir e Evitar, com contagem e percentual.

**TPRM (Third-Party Risk Management)** — Análise de riscos de terceiros e cadeia de suprimentos.

**Investimentos Preventivos — Priorizados por ROI** — Card interativo que, ao ser clicado, abre um modal com a lista de todos os riscos ordenados por ROI (retorno sobre investimento). Para cada risco, mostra: investimento necessário, perda evitada e ROI percentual. A lista é compacta e cabe inteiramente na tela mobile.

**Impacto Financeiro por Risco** — Card interativo que mostra os riscos ordenados por maior exposição financeira (perda em alta demanda).

**Como usar:** Esta é a tela ideal para preparar apresentações ao conselho. Clique nos cards de Investimento e Impacto para ver as listas detalhadas. Use os dados de ROI para justificar prioridades de investimento.

---

## 5. Relatório Executivo

**Ícone:** Documento | **Propósito:** Apresentação formal ao conselho de administração

O Relatório Executivo é uma apresentação com **10 slides** seguindo o roteiro 10-20-30 (10 slides, 20 minutos, fonte 30pt) do E-Book 3 de Apresentações Executivas. Os slides são:

| Slide | Título | Conteúdo |
|-------|--------|----------|
| 1 | Capa | Título, subtítulo, data e consultoria |
| 2 | Panorama de Riscos | Visão geral dos 35 riscos por criticidade e tipo |
| 3 | Impacto Financeiro | Exposição total em R$ (alta e baixa demanda), investimento e economia |
| 4 | Top 5 Riscos Críticos | Os 5 riscos com maior score PxI e GUT |
| 5 | Análise FAIR | Quantificação financeira: SLE, ARO e ALE dos principais riscos |
| 6 | Governança COSO/RISK IT | Apetite, tolerância e capacidade de risco; domínios ISACA |
| 7 | Estratégias de Tratamento | Distribuição MATE e eficácia dos controles |
| 8 | Investimentos Preventivos | Top investimentos priorizados por ROI |
| 9 | Benefícios Esperados | Economia potencial, redução de exposição e ROI consolidado |
| 10 | Próximos Passos | Recomendações e cronograma de ações |

**Navegação:** Use as setas laterais ou os indicadores de página (bolinhas) na parte inferior para navegar entre os slides. O indicador de slide atual mostra "Slide X de 10".

**Como usar:** Navegue pelos 10 slides sequencialmente para uma apresentação completa ao conselho. Cada slide foi projetado para ser autoexplicativo, sem jargões técnicos, com foco em linguagem executiva e valores financeiros em R$.

---

## 6. Tabelas

**Ícone:** Grade | **Propósito:** Referência técnica da metodologia ICAPT v5

A tela de Tabelas apresenta as tabelas de referência utilizadas na avaliação de riscos:

**Tabela de Impacto Detalhada** — Mostra os 5 níveis de impacto (1 a 5) com descrições para 6 dimensões: Financeiro, Reputação, Operacional, Legal, Ambiental e Social. Cada célula descreve o que significa aquele nível naquela dimensão.

**Tabela GUT** — Explica os critérios de Gravidade (1-5), Urgência (1-5) e Tendência (1-5), com descrições de cada nível e fórmula de cálculo (G x U x T).

**Níveis de Probabilidade** — Tabela com os 5 níveis de probabilidade (Raro, Improvável, Possível, Provável, Quase Certo) e suas descrições.

**Matriz de Classificação de Risco** — Tabela com as faixas de classificação: Baixo (1-5), Médio (6-11), Alto (12-19) e Crítico (20-25).

**Como usar:** Consulte estas tabelas durante workshops de avaliação de riscos para justificar as classificações atribuídas. São o material de referência oficial da metodologia ICAPT v5.

---

## 7. Sobre

**Ícone:** Engrenagem | **Propósito:** Informações do projeto e configurações

A tela Sobre apresenta:

**Informações da Empresa** — Dados da DAMACORP: setor, sede, unidades, funcionários, faturamento e cadeia de valor.

**Metodologia ICAPT** — Explicação das 5 etapas da metodologia com descrições detalhadas.

**Forma 3** — Explicação do formato padrão de descrição de riscos com exemplos.

**Estatísticas** — Contagem de riscos cadastrados, versão do modelo e normas de referência.

**Consultores** — Lista da equipe Vetor Horizon responsável pelo estudo de caso.

**Reabrir Tutorial** — Lista de todos os menus com botão para reabrir o wizard tutorial de cada um. Útil para relembrar as funcionalidades de qualquer tela.

**Como usar:** Consulte esta tela para informações de referência sobre o projeto. Use a seção "Reabrir Tutorial" para rever o wizard de qualquer menu.

---

## Dicas Gerais

**Navegação** — No desktop, use a sidebar à esquerda para navegar entre os menus. No mobile, use a barra de abas na parte inferior.

**Interatividade** — A maioria dos elementos é clicável: cards, células da matriz, badges de criticidade, riscos na lista, etc. Explore clicando nos elementos para ver informações detalhadas.

**Cores** — O sistema de cores segue o padrão de criticidade: Vermelho (Crítico), Laranja (Alto), Amarelo (Médio) e Verde (Baixo). Estas cores são consistentes em todas as telas.

**Valores Financeiros** — Todos os valores em R$ são baseados nos frameworks FAIR, COSO e RISK IT, calculados a partir dos dados de cada risco. Os valores consideram cenários de alta demanda (Black Friday/Natal) e baixa demanda (período normal).

**Wizard Tutorial** — Na primeira visita a cada menu, um tutorial aparece automaticamente. Para reabrir qualquer tutorial, acesse o menu "Sobre" e use a seção "Reabrir Tutorial".

---

**Vetor Horizon** — Consultoria de Risco | Estudo de Caso DAMACORP — IDESP
