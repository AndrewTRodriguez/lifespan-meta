// The 12 hallmarks defined by López-Otín, Blasco, Partridge, Serrano, and Kroemer
// in "Hallmarks of aging: An expanding universe" (Cell, 2023). Paraphrases below
// are original summaries; consult the paper for authoritative definitions.
//
// Andrew can revise any of these post-launch by editing this file.

export const HALLMARKS = {
  genomic_instability: {
    displayName: 'Genomic instability',
    paraphrase:
      'Accumulation of DNA damage and mutations over time, including double-strand breaks, base modifications, and chromosomal rearrangements that erode genome integrity.',
  },
  telomere_attrition: {
    displayName: 'Telomere attrition',
    paraphrase:
      'Progressive shortening of the protective DNA-protein caps at chromosome ends, eventually triggering replicative arrest or apoptosis when telomeres become critically short.',
  },
  epigenetic_alterations: {
    displayName: 'Epigenetic alterations',
    paraphrase:
      'Age-related drift in DNA methylation patterns, histone modifications, and chromatin organization that reshapes gene expression independently of changes to the underlying DNA sequence.',
  },
  loss_of_proteostasis: {
    displayName: 'Loss of proteostasis',
    paraphrase:
      'Decline in the cellular machinery that folds, refolds, and degrades proteins, leading to accumulation of misfolded and aggregated species.',
  },
  disabled_macroautophagy: {
    displayName: 'Disabled macroautophagy',
    paraphrase:
      'Reduced capacity for the bulk lysosomal degradation pathway that clears damaged organelles and protein aggregates, allowing cellular waste to accumulate.',
  },
  deregulated_nutrient_sensing: {
    displayName: 'Deregulated nutrient sensing',
    paraphrase:
      'Dysfunction of conserved pathways (insulin/IGF-1, mTOR, AMPK, sirtuins) that detect nutrient availability and coordinate cell growth, metabolism, and stress resistance.',
  },
  mitochondrial_dysfunction: {
    displayName: 'Mitochondrial dysfunction',
    paraphrase:
      'Decline in mitochondrial efficiency that lowers ATP output, raises reactive oxygen species (ROS), and disrupts the metabolic and signaling roles of these organelles.',
  },
  cellular_senescence: {
    displayName: 'Cellular senescence',
    paraphrase:
      'Accumulation of cells that have permanently exited the cell cycle but persist in tissues, often secreting inflammatory factors that affect surrounding cells.',
  },
  stem_cell_exhaustion: {
    displayName: 'Stem cell exhaustion',
    paraphrase:
      'Decline in the number and regenerative capacity of tissue-resident stem cells, undermining tissue maintenance and repair across the lifespan.',
  },
  altered_intercellular_communication: {
    displayName: 'Altered intercellular communication',
    paraphrase:
      'Disruption of signaling between cells, tissues, and organs (including neuroendocrine, paracrine, and immune signals) that coordinates organism-wide homeostasis.',
  },
  chronic_inflammation: {
    displayName: 'Chronic inflammation',
    paraphrase:
      'Persistent low-grade systemic inflammation ("inflammaging") that accompanies older age and contributes to many age-related diseases.',
  },
  dysbiosis: {
    displayName: 'Dysbiosis',
    paraphrase:
      'Disruption of the composition and function of resident microbial communities, particularly in the gut, with downstream effects on metabolism, immunity, and aging.',
  },
  other: {
    displayName: 'Other',
    paraphrase: 'Mechanisms outside the López-Otín 2023 hallmarks framework.',
  },
  unclear: {
    displayName: 'Unclear',
    paraphrase: "The model couldn't confidently assign a primary mechanism.",
  },
} as const;

export type HallmarkKey = keyof typeof HALLMARKS;
