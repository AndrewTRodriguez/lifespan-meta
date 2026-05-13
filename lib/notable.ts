// Well-known longevity genes to feature on the dashboard.
// Mapped from GenAge model organisms DB:
//   daf-2 (id 120) — C. elegans insulin/IGF-1 receptor, canonical lifespan gene
//   sir-2.1 (id 483) — C. elegans sirtuin, NAD-dependent deacetylase
//   clk-1 (id 97)  — C. elegans mitochondrial enzyme, clk-1 mutants live longer
//   age-1 (id 7)   — C. elegans PI3K catalytic subunit, first aging gene cloned
//   foxo (id 201)  — Drosophila FOXO transcription factor (ortholog of human FOXO3)
//                    Note: FOXO3 is a human gene not in GenAge model organisms.
export const NOTABLE_ENTRY_IDS: number[] = [120, 483, 97, 7, 201];
