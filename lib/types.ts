export type LongevityInfluence = 'pro_longevity' | 'anti_longevity' | 'unclear';

export type Split = 'main' | 'counterfactual';

export interface Entry {
  id: number;
  symbol: string;
  organism: string;
  full_name: string | null;
  protein_names: string[];
  go_mf_terms: string[];
  longevity_influence: LongevityInfluence;
  functional_description_redacted: string;
  functional_description_raw: string;
}

export type MechanismClass =
  | 'genomic_instability'
  | 'telomere_attrition'
  | 'epigenetic_alterations'
  | 'loss_of_proteostasis'
  | 'disabled_macroautophagy'
  | 'deregulated_nutrient_sensing'
  | 'mitochondrial_dysfunction'
  | 'cellular_senescence'
  | 'stem_cell_exhaustion'
  | 'altered_intercellular_communication'
  | 'chronic_inflammation'
  | 'dysbiosis'
  | 'other'
  | 'unclear';

export interface SolverOutput {
  longevity_influence: LongevityInfluence;
  confidence: number;
  mechanism_class: MechanismClass;
  reasoning: string;
  key_pathways: string[];
}

export type FailureMode =
  | 'correct'
  | 'right_answer_wrong_reasoning'
  | 'confident_wrong'
  | 'appropriately_uncertain'
  | 'hallucinated_specifics'
  | 'overhedged'
  | 'other_wrong';

export interface AdvisorOutput {
  answer_correct: boolean;
  mechanism_correct: boolean;
  reasoning_quality: 1 | 2 | 3 | 4 | 5;
  failure_mode: FailureMode;
  notes: string;
  ground_truth_questionable: boolean;
}

// --- UI / query types ---

export interface ClassBreakdown {
  n: number;
  accuracy: number;
}

export interface CalibrationBucket {
  confidence_bin: string;
  n: number;
  accuracy: number;
}

export interface RunAggregates {
  aggregated_at: string;
  total_entries: number;
  main_accuracy: number;
  counterfactual_accuracy: number;
  contamination_gap_pp: number;
  mechanism_accuracy_main: number;
  advisor_kappa_vs_expert: number | null;
  failure_mode_counts: Partial<Record<FailureMode, number>>;
  calibration_buckets: CalibrationBucket[];
  class_breakdown_main: Partial<Record<LongevityInfluence, ClassBreakdown>>;
}

export interface RunRow {
  id: number;
  model: string;
  completed_at: string | null;
  is_primary: boolean;
  aggregates: RunAggregates | null;
}

export interface ResultRow {
  run_id: number;
  entry_id: number;
  split: Split;
  prompt_sent: string;
  solver: SolverOutput;
  advisor: AdvisorOutput;
  api_latency_ms: number | null;
}

export interface EntryWithResult extends Entry {
  result_main: ResultRow | null;
}
