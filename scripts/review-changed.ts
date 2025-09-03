/* scripts/review-changed.ts */
import 'dotenv/config';
import OpenAI from 'openai';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

// === Config personalizable ===
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'; // cámbialo al que prefieras
const BASE_BRANCH = process.env.BASE_BRANCH ?? 'main';     // rama a comparar
const MAX_CHARS_PER_FILE = 40_000; // troceo simple por tamaño

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1) Descubre archivos cambiados vs main
function changedFiles(): string[] {
  const out = execSync(`git diff --name-only ${BASE_BRANCH}...HEAD`, { encoding: 'utf8' });
  return out.split('\n').map(s => s.trim()).filter(Boolean)
    .filter(f => /\.(ts|tsx|js|jsx|css|scss|json|md|yml|yaml|html|py|cs|java|sql)$/i.test(f)); // ajusta extensiones
}

// 2) Prompt de revisión pidiendo un patch unificado
function buildSystemPrompt() {
  return `
Eres un revisor de código senior. Objetivo:
- Detecta bugs, fallos de tipado, fugas de recursos, malas prácticas y vulnerabilidades.
- Propón correcciones en formato **diff unificado** (patch) listo para \`git apply\`.
- Incluye SOLO los archivos que modificas, con contextos correctos.
- Mantén el estilo del proyecto (Prettier/ESLint si aplican).
- NO inventes funciones externas no existentes: si algo falta, márcalo como TODO o propone una implementación mínima.
- Si el archivo está bien, no lo toques.

Formato de salida:
1) Un bloque \`\`\`diff ... \`\`\` con TODOS los cambios.
2) Luego una lista breve de "Notas de revisión" (máx 10 bullets) con razones y riesgos.
`;
}

function fileChunk(name: string, content: string) {
  if (content.length <= MAX_CHARS_PER_FILE) return content;
  // recorta por tamaño (estrategia simple)
  return content.slice(0, MAX_CHARS_PER_FILE);
}

async function main() {
  const files = changedFiles();
  if (files.length === 0) {
    console.log('No hay archivos cambiados respecto a la rama base.');
    return;
  }

  const fileBundles = files.map(f => {
    const content = readFileSync(f, 'utf8');
    return `=== FILE: ${f} ===\n${fileChunk(f, content)}\n`;
  }).join('\n');

  const system = buildSystemPrompt();
  const user = `
Proyecto: ${path.basename(process.cwd())}
Rama base: ${BASE_BRANCH}
Archivos cambiados (${files.length}):
${files.map(f => `- ${f}`).join('\n')}

Contenido (recortado si es muy grande):
${fileBundles}
`;

  const resp = await client.responses.create({
    model: MODEL,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
  });

  // Extrae el texto resultante
  const out = resp.output_text ?? '';
  if (!out.trim()) {
    console.error('No se recibió respuesta del modelo.');
    return;
  }

  // Guarda salida
  if (!existsSync('ai-reviews')) mkdirSync('ai-reviews');
  const stamp = Date.now();
  const outPath = `ai-reviews/review-${stamp}.md`;
  writeFileSync(outPath, out, 'utf8');
  console.log(`Revisión generada en: ${outPath}`);

  // También intenta extraer bloque ```diff ... ```
  const diffMatch = out.match(/```diff([\s\S]*?)```/);
  if (diffMatch) {
    const patch = diffMatch[1].replace(/^\n/, '');
    const patchPath = `ai-reviews/patch-${stamp}.diff`;
    writeFileSync(patchPath, patch, 'utf8');
    console.log(`Patch guardado en: ${patchPath}`);
    console.log('Aplícalo (revisando antes) con:');
    console.log(`  git apply --reject --whitespace=fix ${patchPath}`);
  } else {
    console.warn('No se encontró bloque de diff en la respuesta. Revisa el archivo .md para ver sugerencias.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
