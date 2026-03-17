#!/usr/bin/env node
/**
 * extract-risks.mjs
 * 
 * Extrai dados de riscos da planilha VetorHorizon-Grupo5.xlsx
 * e gera automaticamente o arquivo lib/evolution-data.ts
 * 
 * Uso:
 *   node scripts/extract-risks.mjs
 *   node scripts/extract-risks.mjs --input data/MinhaPlanilha.xlsx
 * 
 * A planilha deve seguir o formato ICAPT padrão:
 *   - Aba "Riscos"
 *   - Cabeçalhos na linha 4
 *   - Dados a partir da linha 7 (linhas 5-6 são exemplos)
 *   - Colunas: ID, Fonte, Descrição, Ameaça, Risco, Estratégico, Tipo,
 *     P, I, PxI, Consequência, G, U, T, GUT, Tratamento, Controles,
 *     Responsável, Prazo, KRI, Ação KRI, Quem Mede, Quando Mede,
 *     Redução, Residual, Eficácia
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Dynamic import of xlsx
import * as _XLSX from 'xlsx';
const XLSX = _XLSX.default || _XLSX;

// --- Configuration ---
const DEFAULT_INPUT = resolve(PROJECT_ROOT, 'data/VetorHorizon-Grupo5.xlsx');
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'lib/evolution-data.ts');
const SHEET_NAME = 'Riscos';
const DATA_START_ROW = 7; // Row 7 = R003 (first real risk)
const EXAMPLE_ROWS = [5, 6]; // R001, R002 are examples

// Column mapping (1-indexed as in Excel)
const COL = {
  ID: 1,
  FONTE_RISCO: 2,
  DESC_FONTE: 3,
  AMEACA: 4,
  DESC_RISCO: 5,
  ESTRATEGICO: 6,
  TIPO_RISCO: 7,
  PROBABILIDADE: 8,
  IMPACTO: 9,
  RISCO_INERENTE: 10,
  CONSEQUENCIA: 11,
  GRAVIDADE: 12,
  URGENCIA: 13,
  TENDENCIA: 14,
  GUT_SCORE: 15,
  TRATAMENTO: 16,
  CONTROLES: 17,
  RESPONSAVEL: 18,
  PRAZO: 19,
  KRI: 20,
  ACAO_KRI: 21,
  QUEM_MEDE: 22,
  QUANDO_MEDE: 23,
  REDUCAO: 24,
  RESIDUAL: 25,
  EFICACIA: 26,
};

// --- Helpers ---
function getCell(sheet, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
  const cell = sheet[addr];
  return cell ? cell.v : null;
}

function getString(sheet, row, col) {
  const val = getCell(sheet, row, col);
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function getInt(sheet, row, col) {
  const val = getCell(sheet, row, col);
  if (val === null || val === undefined) return 0;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

function normalizeRiskId(raw) {
  const cleaned = String(raw).trim().replace(/\s+/g, '');
  const match = cleaned.match(/R\s*0*(\d+)/i);
  if (!match) return null;
  return `R${match[1].padStart(3, '0')}`;
}

function escapeTS(s) {
  if (!s) return '';
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

// --- Extract risks from a sheet ---
function extractRisks(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const maxRow = range.e.r + 1; // 1-indexed
  const risks = [];

  for (let row = DATA_START_ROW; row <= maxRow; row++) {
    const rawId = getString(sheet, row, COL.ID);
    if (!rawId) continue;

    const riskId = normalizeRiskId(rawId);
    if (!riskId) continue;

    // Skip if ID number is less than 3 (examples)
    const idNum = parseInt(riskId.replace('R', ''), 10);
    if (idNum < 3) continue;

    const risk = {
      id: riskId,
      fonteDeRisco: getString(sheet, row, COL.FONTE_RISCO),
      descricaoFonte: getString(sheet, row, COL.DESC_FONTE),
      ameaca: getString(sheet, row, COL.AMEACA),
      descricaoRisco: getString(sheet, row, COL.DESC_RISCO),
      estrategico: getString(sheet, row, COL.ESTRATEGICO).toUpperCase().startsWith('SIM') ? 'SIM' : 'NÃO',
      tipoRisco: getString(sheet, row, COL.TIPO_RISCO),
      probabilidade: getInt(sheet, row, COL.PROBABILIDADE),
      impacto: getInt(sheet, row, COL.IMPACTO),
      riscoInerente: getInt(sheet, row, COL.RISCO_INERENTE),
      consequencia: getString(sheet, row, COL.CONSEQUENCIA),
      gravidade: getInt(sheet, row, COL.GRAVIDADE),
      urgencia: getInt(sheet, row, COL.URGENCIA),
      tendencia: getInt(sheet, row, COL.TENDENCIA),
      gutScore: getInt(sheet, row, COL.GUT_SCORE),
      tratamento: getString(sheet, row, COL.TRATAMENTO),
      controles: getString(sheet, row, COL.CONTROLES),
      responsavel: getString(sheet, row, COL.RESPONSAVEL),
      prazo: getString(sheet, row, COL.PRAZO),
      kri: getString(sheet, row, COL.KRI),
      acaoKri: getString(sheet, row, COL.ACAO_KRI),
      quemMede: getString(sheet, row, COL.QUEM_MEDE),
      quandoMede: getString(sheet, row, COL.QUANDO_MEDE),
      reducaoPretendida: getInt(sheet, row, COL.REDUCAO),
      riscoResidual: getInt(sheet, row, COL.RESIDUAL),
      eficaciaTratamento: getString(sheet, row, COL.EFICACIA),
    };

    // Validate: must have at least ID, fonte and probabilidade
    if (risk.fonteDeRisco && risk.probabilidade > 0) {
      risks.push(risk);
    }
  }

  return risks;
}

// --- Generate TypeScript for a risk array ---
function generateRiskArrayTS(varName, risks) {
  const lines = [`export const ${varName}: Risk[] = [`];

  for (const r of risks) {
    lines.push('  {');
    lines.push(`    id: '${r.id}',`);
    lines.push(`    fonteDeRisco: '${escapeTS(r.fonteDeRisco)}',`);
    lines.push(`    descricaoFonte: '${escapeTS(r.descricaoFonte)}',`);
    lines.push(`    ameaca: '${escapeTS(r.ameaca)}',`);
    lines.push(`    descricaoRisco: '${escapeTS(r.descricaoRisco)}',`);
    lines.push(`    estrategico: '${r.estrategico}',`);
    lines.push(`    tipoRisco: '${escapeTS(r.tipoRisco)}',`);
    lines.push(`    probabilidade: ${r.probabilidade},`);
    lines.push(`    impacto: ${r.impacto},`);
    lines.push(`    riscoInerente: ${r.riscoInerente},`);
    lines.push(`    consequencia: '${escapeTS(r.consequencia)}',`);
    lines.push(`    gravidade: ${r.gravidade},`);
    lines.push(`    urgencia: ${r.urgencia},`);
    lines.push(`    tendencia: ${r.tendencia},`);
    lines.push(`    gutScore: ${r.gutScore},`);
    lines.push(`    tratamento: '${escapeTS(r.tratamento)}',`);
    lines.push(`    controles: '${escapeTS(r.controles)}',`);
    lines.push(`    responsavel: '${escapeTS(r.responsavel)}',`);
    lines.push(`    prazo: '${escapeTS(r.prazo)}',`);
    lines.push(`    kri: '${escapeTS(r.kri)}',`);
    lines.push(`    acaoKri: '${escapeTS(r.acaoKri)}',`);
    lines.push(`    quemMede: '${escapeTS(r.quemMede)}',`);
    lines.push(`    quandoMede: '${escapeTS(r.quandoMede)}',`);
    lines.push(`    reducaoPretendida: ${r.reducaoPretendida},`);
    lines.push(`    riscoResidual: ${r.riscoResidual},`);
    lines.push(`    eficaciaTratamento: '${escapeTS(r.eficaciaTratamento)}',`);
    lines.push(`    createdAt: new Date().toISOString(),`);
    lines.push(`    updatedAt: new Date().toISOString(),`);
    lines.push('  },');
  }

  lines.push('];');
  return lines.join('\n');
}

// --- Compute evolution changes between two risk sets ---
function computeEvolution(oldRisks, newRisks) {
  const oldMap = new Map(oldRisks.map(r => [r.id, r]));
  const changes = [];

  for (const newR of newRisks) {
    const oldR = oldMap.get(newR.id);
    if (!oldR) {
      // New risk
      changes.push({
        riskId: newR.id,
        type: 'new',
        changes: [`Novo risco adicionado`],
      });
    } else {
      // Check for modifications
      const diffs = [];
      if (oldR.gutScore !== newR.gutScore) diffs.push(`GUT: ${oldR.gutScore}→${newR.gutScore}`);
      if (oldR.probabilidade !== newR.probabilidade) diffs.push(`Probabilidade: ${oldR.probabilidade}→${newR.probabilidade}`);
      if (oldR.impacto !== newR.impacto) diffs.push(`Impacto: ${oldR.impacto}→${newR.impacto}`);
      if (oldR.tipoRisco !== newR.tipoRisco) diffs.push('Tipo de risco alterado');
      if (oldR.tratamento !== newR.tratamento) diffs.push('Tratamento atualizado');
      if (oldR.responsavel !== newR.responsavel && newR.responsavel) diffs.push('Responsável atualizado');
      if (!oldR.controles && newR.controles) diffs.push('Controles definidos');
      else if (oldR.controles !== newR.controles && newR.controles) diffs.push('Controles detalhados');
      if (!oldR.consequencia && newR.consequencia) diffs.push('Consequência definida');
      else if (oldR.consequencia !== newR.consequencia && newR.consequencia) diffs.push('Consequência detalhada');
      if (!oldR.kri && newR.kri) diffs.push('KRI definido');
      else if (oldR.kri !== newR.kri && newR.kri) diffs.push('KRI atualizado');
      if (!oldR.eficaciaTratamento && newR.eficaciaTratamento) diffs.push('Eficácia de tratamento definida');
      else if (oldR.eficaciaTratamento !== newR.eficaciaTratamento && newR.eficaciaTratamento) diffs.push('Eficácia de tratamento atualizada');

      if (diffs.length > 0) {
        changes.push({ riskId: newR.id, type: 'modified', changes: diffs });
      } else {
        changes.push({ riskId: newR.id, type: 'unchanged', changes: [] });
      }
    }
  }

  return changes;
}

function generateEvolutionTS(varName, changes) {
  const lines = [`export const ${varName}: EvolutionChange[] = [`];
  for (const c of changes) {
    if (c.type === 'unchanged') continue; // Skip unchanged
    const changesStr = c.changes.map(ch => `'${escapeTS(ch)}'`).join(', ');
    lines.push(`  { riskId: '${c.riskId}', type: '${c.type}', changes: [${changesStr}] },`);
  }
  lines.push('];');
  return lines.join('\n');
}

// --- Main ---
function main() {
  // Parse args
  const args = process.argv.slice(2);
  let inputFile = DEFAULT_INPUT;
  const inputIdx = args.indexOf('--input');
  if (inputIdx !== -1 && args[inputIdx + 1]) {
    inputFile = resolve(args[inputIdx + 1]);
  }

  if (!existsSync(inputFile)) {
    console.error(`❌ Planilha não encontrada: ${inputFile}`);
    console.error(`   Coloque a planilha em data/VetorHorizon-Grupo5.xlsx`);
    process.exit(1);
  }

  console.log(`📊 Lendo planilha: ${inputFile}`);
  const workbook = XLSX.readFile(inputFile);

  // Find the Riscos sheet
  let sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    // Try first sheet
    const firstSheet = workbook.SheetNames[0];
    console.log(`⚠️  Aba "${SHEET_NAME}" não encontrada, usando "${firstSheet}"`);
    sheet = workbook.Sheets[firstSheet];
  }

  // Extract current risks (Aula 5 / latest)
  const currentRisks = extractRisks(sheet);
  console.log(`✅ Extraídos ${currentRisks.length} riscos: ${currentRisks.map(r => r.id).join(', ')}`);

  // Read existing evolution-data.ts to preserve historical data (Aula 3, Aula 4)
  let existingContent = '';
  if (existsSync(OUTPUT_FILE)) {
    existingContent = readFileSync(OUTPUT_FILE, 'utf-8');
  }

  // Extract RISKS_AULA3 and RISKS_AULA4 from existing file if present
  let aula3Section = '';
  let aula4Section = '';
  let evolution3to4Section = '';

  if (existingContent) {
    // Extract RISKS_AULA3
    const a3Match = existingContent.match(/(export const RISKS_AULA3: Risk\[\] = \[[\s\S]*?\n\];)/);
    if (a3Match) aula3Section = a3Match[1];

    // Extract RISKS_AULA4
    const a4Match = existingContent.match(/(export const RISKS_AULA4: Risk\[\] = \[[\s\S]*?\n\];)/);
    if (a4Match) aula4Section = a4Match[1];

    // Extract EVOLUTION_3_TO_4
    const e34Match = existingContent.match(/(export const EVOLUTION_3_TO_4: EvolutionChange\[\] = \[[\s\S]*?\n\];)/);
    if (e34Match) evolution3to4Section = e34Match[1];
  }

  // Parse RISKS_AULA4 to compute evolution 4→5
  let aula4Risks = [];
  if (aula4Section) {
    // Simple extraction of IDs from Aula 4 for comparison
    const idMatches = [...aula4Section.matchAll(/id:\s*'(R\d+)'/g)];
    const a4Ids = idMatches.map(m => m[1]);
    
    // Build minimal risk objects for evolution comparison
    // Extract key fields using regex
    const riskBlocks = aula4Section.split(/\n  \{/).slice(1);
    for (const block of riskBlocks) {
      const getId = block.match(/id:\s*'(R\d+)'/);
      const getGut = block.match(/gutScore:\s*(\d+)/);
      const getProb = block.match(/probabilidade:\s*(\d+)/);
      const getImp = block.match(/impacto:\s*(\d+)/);
      const getTipo = block.match(/tipoRisco:\s*'([^']+)'/);
      const getTrat = block.match(/tratamento:\s*'([^']*?)'/);
      const getResp = block.match(/responsavel:\s*'([^']*?)'/);
      const getCtrl = block.match(/controles:\s*'([^']*?)'/);
      const getCons = block.match(/consequencia:\s*'([^']*?)'/);
      const getKri = block.match(/kri:\s*'([^']*?)'/);
      const getEfic = block.match(/eficaciaTratamento:\s*'([^']*?)'/);

      if (getId) {
        aula4Risks.push({
          id: getId[1],
          gutScore: getGut ? parseInt(getGut[1]) : 0,
          probabilidade: getProb ? parseInt(getProb[1]) : 0,
          impacto: getImp ? parseInt(getImp[1]) : 0,
          tipoRisco: getTipo ? getTipo[1] : '',
          tratamento: getTrat ? getTrat[1] : '',
          responsavel: getResp ? getResp[1] : '',
          controles: getCtrl ? getCtrl[1] : '',
          consequencia: getCons ? getCons[1] : '',
          kri: getKri ? getKri[1] : '',
          eficaciaTratamento: getEfic ? getEfic[1] : '',
        });
      }
    }
  }

  // Compute evolution 4→5
  const evolution4to5 = aula4Risks.length > 0
    ? computeEvolution(aula4Risks, currentRisks)
    : currentRisks.map(r => ({ riskId: r.id, type: 'new', changes: ['Risco inicial'] }));

  // Generate the full TypeScript file
  const parts = [
    `// ============================================================`,
    `// ARQUIVO GERADO AUTOMATICAMENTE - NÃO EDITAR MANUALMENTE`,
    `// Gerado por: scripts/extract-risks.mjs`,
    `// Data: ${new Date().toISOString()}`,
    `// Planilha: ${inputFile.split('/').pop()}`,
    `// Total de riscos extraídos: ${currentRisks.length}`,
    `// ============================================================`,
    ``,
    `import { Risk } from './models';`,
    ``,
  ];

  // Add historical data if available
  if (aula3Section) {
    parts.push(aula3Section);
    parts.push('');
  }

  if (aula4Section) {
    parts.push(aula4Section);
    parts.push('');
  }

  // Add current risks (Aula 5)
  parts.push(generateRiskArrayTS('RISKS_AULA5', currentRisks));
  parts.push('');

  // Evolution interface
  parts.push(`export interface EvolutionChange {`);
  parts.push(`  riskId: string;`);
  parts.push(`  type: 'new' | 'modified' | 'unchanged';`);
  parts.push(`  changes: string[];`);
  parts.push(`}`);
  parts.push('');

  // Evolution data
  if (evolution3to4Section) {
    parts.push('// Changes from Aula 3 to Aula 4');
    parts.push(evolution3to4Section);
    parts.push('');
  }

  parts.push('// Changes from Aula 4 to Aula 5');
  parts.push(generateEvolutionTS('EVOLUTION_4_TO_5', evolution4to5));
  parts.push('');

  parts.push('// Legacy compatibility');
  parts.push('export const EVOLUTION_SUMMARY = EVOLUTION_4_TO_5;');
  parts.push('');

  const output = parts.join('\n');
  writeFileSync(OUTPUT_FILE, output, 'utf-8');

  console.log(`📝 Arquivo gerado: ${OUTPUT_FILE}`);
  console.log(`   - RISKS_AULA5: ${currentRisks.length} riscos`);
  if (aula4Risks.length > 0) {
    const newCount = evolution4to5.filter(e => e.type === 'new').length;
    const modCount = evolution4to5.filter(e => e.type === 'modified').length;
    console.log(`   - EVOLUTION_4_TO_5: ${newCount} novos, ${modCount} modificados`);
  }
  console.log(`✅ Extração concluída com sucesso!`);
}

main();
