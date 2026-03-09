# ICAPT Risk Manager - Design Document

## Visão Geral

Aplicativo móvel de gestão de riscos corporativos baseado na metodologia ICAPT (Identificação, Classificação, Avaliação, Priorização e Tratamento). O app permite cadastrar e gerenciar riscos no formato da **Forma 3** (Fonte de risco ocasionando impacto), com todas as etapas do ciclo ICAPT. Contexto: estudo de caso DAMACORP (e-commerce).

## Paleta de Cores

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| primary | #1E3A5F | #4A90D9 | Azul corporativo - botões, destaques |
| background | #F8F9FA | #121416 | Fundo geral |
| surface | #FFFFFF | #1C1F22 | Cards e superfícies elevadas |
| foreground | #1A1A2E | #E8EAED | Texto principal |
| muted | #6B7280 | #9CA3AF | Texto secundário |
| border | #E2E5E9 | #2D3238 | Bordas e divisores |
| success | #10B981 | #34D399 | Risco baixo, sucesso |
| warning | #F59E0B | #FBBF24 | Risco médio, alertas |
| error | #EF4444 | #F87171 | Risco alto/crítico |

## Telas do Aplicativo

### 1. Dashboard (Tab Home)
Tela principal com resumo executivo dos riscos cadastrados.

**Conteúdo:**
- Header com nome da empresa "DAMACORP" e subtítulo "ICAPT Risk Manager"
- Card de resumo: total de riscos, distribuição por nível (Crítico/Alto/Médio/Baixo)
- Matriz de Risco 5x5 visual (Probabilidade x Impacto) com contagem de riscos por célula
- Lista dos Top 5 riscos por GUT Score
- Botão flutuante "+" para adicionar novo risco

### 2. Lista de Riscos (Tab Riscos)
Lista completa de todos os riscos cadastrados com filtros.

**Conteúdo:**
- Barra de busca por texto
- Filtros: Tipo de Risco, Fonte de Risco, Nível de Risco
- FlatList de cards de risco mostrando: ID, descrição Forma 3, nível de risco (badge colorido), GUT Score
- Cada card é clicável e leva ao detalhe

### 3. Tabelas de Referência (Tab Tabelas)
Tabelas de impacto, probabilidade e prioridade GUT para consulta.

**Conteúdo:**
- Seção "Tabela de Impacto" (5 níveis x 6 critérios)
- Seção "Tabela de Probabilidade" (5 níveis)
- Seção "Tabela de Prioridade GUT" (5 níveis para G, U, T)
- Seção "Matriz de Risco" (5x5 com cores)

### 4. Configurações (Tab Config)
Configurações do app e informações de referência.

**Conteúdo:**
- Informações da empresa (DAMACORP)
- Sobre a metodologia ICAPT
- Exemplos de riscos baseados em normas ISO
- Alternância de tema claro/escuro

### 5. Formulário de Novo Risco (Modal/Stack)
Formulário multi-step para cadastro completo de risco seguindo ICAPT.

**Steps:**
1. **Identificação**: ID automático, Fonte de Risco (dropdown), Descrição da Fonte, Ameaça
2. **Descrição**: Descrição do Risco na Forma 3 ("[Ameaça] ocasionando [impacto]"), campo auxiliar para gerar automaticamente
3. **Classificação**: Estratégico (SIM/NÃO), Tipo de Risco (dropdown)
4. **Avaliação**: Probabilidade (1-5), Impacto (1-5), Risco Inerente (calculado), Consequência
5. **Priorização**: Gravidade (1-5), Urgência (1-5), Tendência (1-5), GUT Score (calculado)
6. **Tratamento**: Estratégia MATE (dropdown), Controles, Responsável, Prazo, KRI
7. **Risco Residual**: Redução pretendida, Risco Residual, Eficácia do tratamento

### 6. Detalhe do Risco (Stack)
Visualização completa de um risco cadastrado.

**Conteúdo:**
- Header com ID e badge de nível
- Seções colapsáveis para cada etapa ICAPT
- Indicadores visuais (Probabilidade x Impacto, GUT Score)
- Botões de editar e excluir

## Fluxos Principais

### Cadastro de Risco
Home > Botão "+" > Step 1 (Identificação) > Step 2 (Descrição Forma 3) > Step 3 (Classificação) > Step 4 (Avaliação) > Step 5 (Priorização) > Step 6 (Tratamento) > Step 7 (Residual) > Salvar > Lista de Riscos

### Consulta de Risco
Tab Riscos > Buscar/Filtrar > Tap no Card > Tela de Detalhe > Editar ou Voltar

### Consulta de Tabelas
Tab Tabelas > Scroll entre tabelas de referência > Consultar valores para preenchimento

## Navegação

- **Tab Bar** com 4 abas: Dashboard, Riscos, Tabelas, Config
- **Stack** para: Formulário de Novo Risco, Detalhe do Risco, Edição de Risco

## Armazenamento

- **AsyncStorage** para persistência local de todos os riscos
- Dados pré-carregados com os exemplos da planilha DAMACORP (R001, R002)
- Listas de referência (fontes, ameaças, tipos) embutidas no app

## Tipografia

- Títulos: 24-28px bold
- Subtítulos: 18-20px semibold
- Corpo: 14-16px regular
- Labels: 12-13px medium, cor muted
