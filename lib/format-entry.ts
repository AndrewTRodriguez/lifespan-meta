import type { Entry, Split } from './types';

// Bump this string when the template changes. Stored on each run row
// so old runs can be reproduced.
export const FORMAT_ENTRY_VERSION = 'v1';

export function formatEntry(entry: Entry, split: Split): string {
  const symbol = split === 'counterfactual' ? 'GENE-X' : entry.symbol;
  return `Gene: ${symbol}
Organism: ${entry.organism}
Known functions: ${entry.functional_description_redacted}`;
}
