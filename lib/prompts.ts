import { createHash } from 'node:crypto';

// Bump these strings when the corresponding prompt or tool schema changes.
export const SOLVER_VERSION = 'v1';
export const ADVISOR_VERSION = 'v1';

export const SOLVER_SYSTEM_PROMPT = `You are an expert in molecular biology of aging. Your task is to predict whether a gene's normal function promotes or opposes longevity in a model organism, based only on the gene's molecular function annotations.

You will receive:
- Gene symbol (sometimes blinded as "GENE-X")
- Organism
- Known functions (Gene Ontology Molecular Function terms and protein names)

Use the \`submit_prediction\` tool to return your answer.

Rules:
- If the symbol is "GENE-X" or similar placeholder, the symbol is intentionally blinded. Reason from the function description only.
- Choose "unclear" only if the function is too vague to support a prediction or if mechanisms genuinely conflict.
- For mechanism_class, pick the López-Otín 2023 hallmark of aging that best maps to this gene's primary molecular function.
- Be specific. Name the pathway or biochemical role; do not restate the answer.`;

export const ADVISOR_SYSTEM_PROMPT = `You are an expert reviewer grading an AI model's prediction about a gene's effect on longevity in a model organism. You will see:

1. The redacted entry the model was shown
2. The ground truth from the GenAge database (curator-assigned longevity influence)
3. The model's prediction, reasoning, and confidence

Your job is to grade strictly. A correct answer reached via wrong mechanistic reasoning is a notable, separate failure mode and must be flagged as such.

Use the \`submit_grade\` tool.`;

export const SUBMIT_PREDICTION_TOOL = {
  name: 'submit_prediction',
  description: "Submit your prediction for the gene's longevity influence.",
  input_schema: {
    type: 'object' as const,
    properties: {
      longevity_influence: {
        type: 'string',
        enum: ['pro_longevity', 'anti_longevity', 'unclear'],
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      mechanism_class: {
        type: 'string',
        enum: [
          'genomic_instability',
          'telomere_attrition',
          'epigenetic_alterations',
          'loss_of_proteostasis',
          'disabled_macroautophagy',
          'deregulated_nutrient_sensing',
          'mitochondrial_dysfunction',
          'cellular_senescence',
          'stem_cell_exhaustion',
          'altered_intercellular_communication',
          'chronic_inflammation',
          'dysbiosis',
          'other',
          'unclear',
        ],
      },
      reasoning: {
        type: 'string',
        description: '3-6 sentences. Name the specific pathway and molecular step. Do not restate the answer.',
      },
      key_pathways: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 3,
      },
    },
    required: ['longevity_influence', 'confidence', 'mechanism_class', 'reasoning', 'key_pathways'],
  },
};

export const SUBMIT_GRADE_TOOL = {
  name: 'submit_grade',
  description: "Submit your grade of the model's prediction.",
  input_schema: {
    type: 'object' as const,
    properties: {
      answer_correct: { type: 'boolean' },
      mechanism_correct: { type: 'boolean' },
      reasoning_quality: { type: 'integer', minimum: 1, maximum: 5 },
      failure_mode: {
        type: 'string',
        enum: [
          'correct',
          'right_answer_wrong_reasoning',
          'confident_wrong',
          'appropriately_uncertain',
          'hallucinated_specifics',
          'overhedged',
          'other_wrong',
        ],
      },
      notes: { type: 'string' },
      ground_truth_questionable: { type: 'boolean' },
    },
    required: [
      'answer_correct',
      'mechanism_correct',
      'reasoning_quality',
      'failure_mode',
      'notes',
      'ground_truth_questionable',
    ],
  },
};

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// Hashes change automatically if you edit the prompt or schema. Stored on the
// runs row so you can detect prompt drift across runs.
export const SOLVER_PROMPT_HASH = sha256(
  SOLVER_SYSTEM_PROMPT + JSON.stringify(SUBMIT_PREDICTION_TOOL),
);
export const ADVISOR_PROMPT_HASH = sha256(
  ADVISOR_SYSTEM_PROMPT + JSON.stringify(SUBMIT_GRADE_TOOL),
);
