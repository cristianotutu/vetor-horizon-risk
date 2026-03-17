# Vetor Horizon - Deploy Automático via GitHub + Netlify

Este guia explica como configurar o pipeline de deploy automático para que, ao atualizar a planilha de riscos no GitHub, o aplicativo web seja atualizado automaticamente no Netlify.

## Arquitetura do Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Você faz    │────▶│ GitHub       │────▶│ Script       │────▶│ Netlify      │
│  upload da   │     │ detecta      │     │ extrai dados │     │ publica      │
│  planilha    │     │ mudança      │     │ e faz build  │     │ o site       │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

O fluxo funciona assim:

1. Você faz upload de uma nova versão da planilha `.xlsx` na pasta `data/` do repositório GitHub.
2. O GitHub Actions detecta a mudança e executa o workflow automaticamente.
3. O script `extract-risks.mjs` lê a planilha e gera o código TypeScript com os dados atualizados.
4. O Expo faz o build da versão web do aplicativo.
5. O Netlify recebe os arquivos e publica o site atualizado.

## Pré-requisitos

Você precisará de contas gratuitas nos seguintes serviços:

| Serviço | URL | Para que serve |
|---------|-----|----------------|
| **GitHub** | https://github.com | Hospedar o código e a planilha |
| **Netlify** | https://netlify.com | Hospedar o site web do aplicativo |

## Passo 1: Criar o Repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repositório: `vetor-horizon-riscos` (ou outro nome de sua preferência)
3. Visibilidade: **Private** (recomendado, pois contém dados corporativos)
4. Clique em **Create repository**
5. Siga as instruções para fazer o push do código (veja a seção "Push Inicial" abaixo)

## Passo 2: Configurar o Netlify

### 2.1 Criar o site no Netlify

1. Acesse https://app.netlify.com
2. Clique em **Add new site** > **Import an existing project**
3. Selecione **GitHub** como provedor
4. Autorize o Netlify a acessar seu repositório
5. Selecione o repositório `vetor-horizon-riscos`
6. Configure o build:
   - **Build command:** `pnpm install && node scripts/extract-risks.mjs && npx expo export --platform web`
   - **Publish directory:** `dist`
7. Clique em **Deploy site**

### 2.2 Obter o Token e Site ID do Netlify

Para o deploy via GitHub Actions (opcional, pois o Netlify já faz build automático):

1. No Netlify, vá em **User Settings** > **Applications** > **Personal access tokens**
2. Clique em **New access token**, dê um nome (ex: "GitHub Actions") e copie o token
3. No painel do site, vá em **Site configuration** > **General** > copie o **Site ID**

### 2.3 Adicionar Secrets no GitHub

1. No seu repositório GitHub, vá em **Settings** > **Secrets and variables** > **Actions**
2. Clique em **New repository secret** e adicione:

| Nome do Secret | Valor |
|----------------|-------|
| `NETLIFY_AUTH_TOKEN` | O token pessoal do Netlify |
| `NETLIFY_SITE_ID` | O Site ID do Netlify |

## Passo 3: Push Inicial do Código

No terminal do seu computador, execute:

```bash
# Clone ou inicialize o repositório
git init
git remote add origin https://github.com/SEU_USUARIO/vetor-horizon-riscos.git

# Adicione todos os arquivos
git add .
git commit -m "🚀 Versão inicial do Vetor Horizon"

# Envie para o GitHub
git branch -M main
git push -u origin main
```

## Como Atualizar a Planilha

Existem duas formas de atualizar a planilha:

### Opção A: Via interface web do GitHub (mais fácil)

1. Acesse seu repositório no GitHub
2. Navegue até a pasta `data/`
3. Clique em **Add file** > **Upload files**
4. Arraste a nova planilha `.xlsx` (mantenha o nome `VetorHorizon-Grupo5.xlsx`)
5. Escreva uma mensagem de commit (ex: "Atualização Aula 6")
6. Clique em **Commit changes**
7. O deploy será disparado automaticamente

### Opção B: Via linha de comando

```bash
# Copie a nova planilha para a pasta data/
cp ~/Downloads/NovaPlanilha.xlsx data/VetorHorizon-Grupo5.xlsx

# Commit e push
git add data/VetorHorizon-Grupo5.xlsx
git commit -m "📊 Atualização da planilha - Aula 6"
git push
```

## Formato da Planilha

A planilha deve seguir o formato ICAPT padrão:

| Coluna | Campo | Obrigatório |
|--------|-------|-------------|
| A | ID do Risco (ex: R 003) | Sim |
| B | Fonte de Risco | Sim |
| C | Descrição da Fonte | Sim |
| D | Ameaça | Sim |
| E | Descrição do Risco | Sim |
| F | Estratégico (SIM/NÃO) | Sim |
| G | Tipo de Risco | Sim |
| H | Probabilidade (1-5) | Sim |
| I | Impacto (1-5) | Sim |
| J | Risco Inerente (PxI) | Sim |
| K | Consequência | Não |
| L | Gravidade (1-5) | Sim |
| M | Urgência (1-5) | Sim |
| N | Tendência (1-5) | Sim |
| O | GUT Score | Sim |
| P | Tratamento (MATE) | Não |
| Q | Controles | Não |
| R | Responsável | Não |
| S | Prazo | Não |
| T | KRI | Não |
| U | Ação se KRI atingido | Não |
| V | Quem Mede | Não |
| W | Quando Mede | Não |
| X | Redução Pretendida | Não |
| Y | Risco Residual | Não |
| Z | Eficácia do Tratamento | Não |

A aba deve se chamar **"Riscos"** e os dados reais começam na **linha 7** (linhas 5-6 são exemplos que serão ignorados).

## Estrutura do Projeto

```
vetor-horizon-riscos/
├── .github/
│   └── workflows/
│       └── update-risks.yml    ← GitHub Actions (CI/CD)
├── data/
│   └── VetorHorizon-Grupo5.xlsx ← Planilha de riscos (ATUALIZE AQUI)
├── scripts/
│   └── extract-risks.mjs       ← Script de extração automática
├── lib/
│   └── evolution-data.ts        ← Dados gerados automaticamente
├── app/                         ← Código do aplicativo
├── netlify.toml                 ← Configuração do Netlify
├── DEPLOY.md                    ← Este arquivo
└── package.json
```

## Solução de Problemas

### O deploy falhou no GitHub Actions

1. Vá em **Actions** no seu repositório GitHub
2. Clique no workflow que falhou
3. Verifique os logs para identificar o erro
4. Problemas comuns:
   - **Secrets não configurados:** Verifique se `NETLIFY_AUTH_TOKEN` e `NETLIFY_SITE_ID` estão corretos
   - **Planilha com formato incorreto:** Verifique se a aba se chama "Riscos" e os dados começam na linha 7

### O site não atualizou

1. Verifique se o commit foi feito na branch `main`
2. Verifique se a planilha está na pasta `data/`
3. Verifique os logs do Netlify em https://app.netlify.com

### Quero testar localmente antes de fazer push

```bash
# Extrair dados da planilha
pnpm extract

# Rodar testes
pnpm test

# Ver o app localmente
pnpm dev
```

## Duas Opções de Deploy

Você pode escolher entre duas abordagens:

### Opção 1: Netlify Build (Recomendada - Mais Simples)

O Netlify faz o build automaticamente quando detecta um push no GitHub. Basta conectar o repositório ao Netlify e ele cuida do resto. Neste caso, o arquivo `netlify.toml` já contém toda a configuração necessária.

**Vantagem:** Não precisa configurar secrets no GitHub.

### Opção 2: GitHub Actions + Netlify Deploy

O GitHub Actions faz o build e envia para o Netlify. Útil se você quiser mais controle sobre o processo (ex: rodar testes antes do deploy).

**Vantagem:** Mais controle, testes automatizados antes do deploy.

Ambas as opções funcionam com o mesmo repositório. Se usar a Opção 1, pode desativar o workflow do GitHub Actions.
