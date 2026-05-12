// scripts/sample-passed.ts — generates a 30-entry TSV for eyeball check
import fs from 'node:fs';
import readline from 'node:readline';

async function main() {
  const lines: any[] = [];
  const input = readline.createInterface({
    input: fs.createReadStream('data/processed/passed.jsonl')
  });
  for await (const line of input) lines.push(JSON.parse(line));

  // Random 30
  const sample = lines.sort(() => Math.random() - 0.5).slice(0, 30);

  const header = ['symbol', 'organism', 'longevity_influence', 'redacted_description'];
  const rows = [header.join('\t')];
  for (const e of sample) {
    rows.push([
      e.symbol,
      e.organism,
      e.longevity_influence,
      e.functional_description_redacted.replace(/\t|\n/g, ' '),
    ].join('\t'));
  }
  fs.writeFileSync('data/processed/qc_sample.tsv', rows.join('\n'));
  console.log('Written to data/processed/qc_sample.tsv');
}

main();
