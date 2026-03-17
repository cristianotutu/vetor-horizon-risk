<p align="center">
  <img src="assets/images/vetor-horizon-logo.png" alt="Vetor Horizon" width="180" />
</p>

<h1 align="center">Vetor Horizon — Gestão de Riscos Corporativos</h1>

<p align="center">
  Aplicativo de gestão e análise de riscos baseado na <strong>metodologia ICAPT v5</strong>, desenvolvido como estudo de caso para a empresa <strong>DAMACORP</strong>.
</p>

<p align="center">
  <a href="https://vetor-horizon-risk.netlify.app">
    <img src="https://img.shields.io/badge/🌐_Demo_Online-vetor--horizon--risk.netlify.app-0a7ea4?style=for-the-badge" alt="Demo Online" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo_SDK-54-blue?logo=expo" alt="Expo SDK 54" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61dafb?logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/NativeWind-4-38bdf8?logo=tailwindcss" alt="NativeWind" />
  <img src="https://img.shields.io/badge/Netlify-Deploy-00c7b7?logo=netlify" alt="Netlify" />
</p>

---

## Sobre o Projeto

O **Vetor Horizon** é uma plataforma de gestão de riscos corporativos que implementa a metodologia **ICAPT (Identificação, Classificação, Avaliação, Priorização e Tratamento)** em sua versão 5. O aplicativo foi desenvolvido como parte de um estudo de caso acadêmico para a empresa fictícia **DAMACORP**, uma companhia de comércio eletrônico com sede em São Paulo, faturamento de R$ 350 milhões/ano e aproximadamente 1.000 colaboradores.

O sistema permite o cadastro, análise e acompanhamento de **25 riscos corporativos** (R003–R027), abrangendo categorias como riscos operacionais, financeiros, tecnológicos, cibernéticos, regulatórios, reputacionais, ambientais e humanos. Cada risco é avaliado com base em matrizes de **Probabilidade × Impacto (P×I)** e priorizado pela metodologia **GUT (Gravidade, Urgência e Tendência)**, com estratégias de tratamento definidas pelo framework **MATE (Mitigar, Aceitar, Transferir, Evitar)**.

## Funcionalidades

| Tela | Descrição |
|------|-----------|
| **Dashboard** | Visão geral com contadores por criticidade (Crítico, Alto, Médio, Baixo), matriz de risco P×I interativa e distribuição por tipo |
| **Riscos** | Lista completa dos 25 riscos com busca, filtros por criticidade e detalhamento individual com controles, KRI e eficácia |
| **Evolução** | Comparativo entre 3 aulas (Aula 3 → 4 → 5) com timeline visual, modos Resumo/Comparativo/Matrizes e seletor de período |
| **Estratégico** | Análise estratégica com distribuição por tipo de risco, estratégias MATE, origem (interno/externo) e riscos estratégicos |
| **Tabelas** | Tabelas detalhadas de P×I e GUT com ordenação e exportação |
| **Sobre** | Informações do estudo de caso, metodologia ICAPT, estatísticas e equipe de consultores |

## Metodologia ICAPT

A metodologia ICAPT é um framework estruturado para gestão de riscos corporativos, composto por 5 etapas sequenciais:

1. **Identificação** — Identificar fontes de risco (internas e externas), ameaças e descrever o risco na Forma 3
2. **Classificação** — Classificar como estratégico (SIM/NÃO) e definir o tipo de risco conforme taxonomia
3. **Avaliação** — Avaliar Probabilidade (1–5) × Impacto (1–5) = Risco Inerente (1–25)
4. **Priorização** — Priorizar com GUT: Gravidade × Urgência × Tendência (1–125)
5. **Tratamento** — Definir estratégia MATE (Mitigar, Aceitar, Transferir, Evitar), controles e KRIs

### Normas de Referência

| Norma | Aplicação |
|-------|-----------|
| **ISO 31000** | Gestão de riscos — Diretrizes |
| **ISO 27001** | Segurança da informação |
| **ISO 22301** | Continuidade de negócios |
| **ISO 45000** | Saúde e segurança ocupacional |

## Estudo de Caso — DAMACORP

| Atributo | Valor |
|----------|-------|
| **Nome** | DAMACORP |
| **Setor** | Comércio Eletrônico |
| **Sede** | São Paulo – SP |
| **Unidades** | Barueri (SP), Rio de Janeiro (RJ), Curitiba (PR) |
| **Funcionários** | ~1.000 colaboradores |
| **Faturamento** | R$ 350 milhões/ano |
| **Operação** | 24/7, 365 dias/ano |
| **Cadeia de Valor** | E-commerce B2C e B2B, logística integrada, 3 centros de distribuição |

## Tecnologias

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| Expo SDK | 54 | Framework mobile multiplataforma |
| React Native | 0.81 | Interface nativa iOS/Android/Web |
| TypeScript | 5.9 | Tipagem estática |
| NativeWind | 4 | Tailwind CSS para React Native |
| Expo Router | 6 | Navegação baseada em arquivos |
| Vitest | 2.x | Testes unitários |

## Estrutura do Projeto

```
vetor-horizon-risk/
├── app/                    # Telas do aplicativo (Expo Router)
│   ├── (tabs)/             # Navegação por abas
│   │   ├── index.tsx       # Dashboard
│   │   ├── risks.tsx       # Lista de Riscos
│   │   ├── evolution.tsx   # Evolução entre Aulas
│   │   ├── strategic.tsx   # Análise Estratégica
│   │   ├── tables.tsx      # Tabelas P×I e GUT
│   │   └── settings.tsx    # Sobre o Projeto
│   └── risk/[id].tsx       # Detalhe do Risco
├── assets/images/          # Ícones e logo
├── components/             # Componentes reutilizáveis
├── data/                   # Planilha Excel fonte dos dados
├── hooks/                  # React hooks customizados
├── lib/                    # Lógica principal
│   ├── evolution-data.ts   # Dados das 3 aulas (Aula 3, 4 e 5)
│   ├── risk-context.tsx    # Contexto global de riscos
│   └── models.ts           # Tipos e interfaces
├── scripts/                # Scripts utilitários
│   └── extract-risks.mjs  # Extração automática da planilha
├── netlify.toml            # Configuração de deploy Netlify
└── package.json
```

## Como Executar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 9+

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/cristianotutu/vetor-horizon-risk.git
cd vetor-horizon-risk

# Instalar dependências
pnpm install

# Iniciar o servidor de desenvolvimento
pnpm dev
```

O aplicativo estará disponível em `http://localhost:8081` (versão web).

### Executar no celular

```bash
# Gerar QR code para Expo Go
pnpm qr
```

Escaneie o QR code com o aplicativo **Expo Go** (disponível na App Store e Google Play).

## Atualização Automática de Dados

O projeto inclui um script de extração automática que lê a planilha Excel e gera o código TypeScript correspondente:

```bash
# Extrair dados da planilha para TypeScript
pnpm extract
```

O script lê o arquivo `data/VetorHorizon-Grupo5.xlsx` e atualiza automaticamente o `lib/evolution-data.ts` com os riscos extraídos.

### Pipeline de Deploy

Ao fazer push de alterações para o branch `main`, o Netlify detecta automaticamente e executa o build, publicando a versão atualizada em [vetor-horizon-risk.netlify.app](https://vetor-horizon-risk.netlify.app).

## Consultores — Vetor Horizon

Equipe de consultores responsáveis pela análise e gestão de riscos do estudo de caso DAMACORP:

- **Cristiano Siqueira Israel**
- **Danielli Mezavilla Pinto**
- **Karolina Guimarães Negrizolo**
- **Matheus Augusto Arduini**
- **Pedro Ricci Righeti**

## Licença

Este projeto foi desenvolvido para fins acadêmicos como parte do programa de estudos do **IDESP**. Todos os dados da empresa DAMACORP são fictícios e utilizados exclusivamente para fins educacionais.

---

<p align="center">
  <strong>Vetor Horizon</strong> — Consultoria de Risco<br/>
  Estudo de Caso DAMACORP · IDESP
</p>
