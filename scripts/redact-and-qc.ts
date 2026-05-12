// scripts/redact-and-qc.ts
import fs from 'node:fs';
import readline from 'node:readline';

const FORBIDDEN_TERMS = [
  'longevity', 'lifespan', 'life span', 'life-span',
  'aging', 'ageing', 'life-extension', 'life extension',
  'senescence', 'senescent', 'survival',
  'pro-longevity', 'anti-longevity',
  'lifelong', 'death', 'mortality',
];

const PROTECTED_TERMS = [
  'death receptor', 'death domain', 'death-inducing',
  'survival motor neuron', 'cell survival',
];

function redact(text: string): { redacted: string; density: number } {
  let result = text;
  let hits = 0;

  // Protect first by stashing
  const stash = new Map<string, string>();
  PROTECTED_TERMS.forEach((term, i) => {
    const placeholder = `__PROTECTED_${i}__`;
    const regex = new RegExp(term, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, placeholder);
      stash.set(placeholder, term);
    }
  });

  // Redact forbidden terms
  for (const term of FORBIDDEN_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = result.match(regex);
    if (matches) {
      hits += matches.length;
      result = result.replace(regex, '[REDACTED]');
    }
  }

  // Restore protected terms
  stash.forEach((original, placeholder) => {
    result = result.replaceAll(placeholder, original);
  });

  const totalWords = text.split(/\s+/).filter(Boolean).length;
  return { redacted: result, density: totalWords > 0 ? hits / totalWords : 0 };
}

interface QcResult {
  passed: boolean;
  reasons: string[];
}

function runQc(entry: any, redacted: string, density: number): QcResult {
  const reasons: string[] = [];

  if (entry.go_mf_terms.length === 0) {
    reasons.push('no GO molecular function terms');
  }

  const wordCount = redacted.split(/\s+/).filter(Boolean).length;
  if (wordCount < 5) {
    reasons.push(`insufficient content (${wordCount} words after redaction)`);
  }

  if (density > 0.3) {
    reasons.push(`high redaction density (${(density * 100).toFixed(0)}%)`);
  }

  // Defense in depth: any forbidden term still present?
  const leaks = FORBIDDEN_TERMS.filter(t =>
    new RegExp(`\\b${t}\\b`, 'i').test(redacted)
  );
  if (leaks.length > 0) {
    reasons.push(`leakage detected: ${leaks.join(', ')}`);
  }

  return { passed: reasons.length === 0, reasons };
}

const UNINFORMATIVE_GO = new Set(['molecular_function', 'biological_process', 'cellular_component']);

function compose(entry: any): string {
  const nameParts = [entry.full_name, ...entry.protein_names]
    .filter(Boolean)
    .map((s: string) => s.replace(/[.;]+$/, ''));
  const uniqueNames = [...new Set(nameParts)];  // drop duplicate name/protein

  const goTerms = entry.go_mf_terms
    .filter((t: string) => !UNINFORMATIVE_GO.has(t.toLowerCase()))
    .map((s: string) => s.replace(/[.;]+$/, ''));

  return [...uniqueNames, ...goTerms].join('. ') + '.';
}

async function main() {
  fs.mkdirSync('data/processed', { recursive: true });
  const passOut = fs.createWriteStream('data/processed/passed.jsonl');
  const dropOut = fs.createWriteStream('data/processed/dropped.jsonl');

  const input = readline.createInterface({
    input: fs.createReadStream('data/raw/ncbi_genes.jsonl')
  });

  let total = 0, passed = 0;

  for await (const line of input) {
    total++;
    const entry = JSON.parse(line);
    const composed = compose(entry);
    const { redacted, density } = redact(composed);
    const qc = runQc(entry, redacted, density);

    const out = {
      ...entry,
      functional_description_raw: composed,
      functional_description_redacted: redacted,
      redaction_density: density,
      qc_passed: qc.passed,
      qc_reasons: qc.reasons,
    };

    (qc.passed ? passOut : dropOut).write(JSON.stringify(out) + '\n');
    if (qc.passed) passed++;
  }

  passOut.end();
  dropOut.end();
  console.log(`Total: ${total}. Passed: ${passed}. Dropped: ${total - passed}.`);
}

main();
