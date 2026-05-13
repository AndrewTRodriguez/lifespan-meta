import type { LongevityInfluence, FailureMode, MechanismClass } from './types';
import { HALLMARKS } from './hallmarks';

// --- Longevity influence ---

export function displayLongevity(value: LongevityInfluence): string {
  switch (value) {
    case 'pro_longevity': return 'Pro-longevity';
    case 'anti_longevity': return 'Anti-longevity';
    case 'unclear': return 'Unclear';
  }
}

export function longevityInfluenceColor(value: LongevityInfluence): {
  bg: string; text: string;
} {
  switch (value) {
    case 'pro_longevity':
      return { bg: 'var(--color-success-bg)', text: 'var(--color-success)' };
    case 'anti_longevity':
      return { bg: 'var(--color-error-bg)', text: 'var(--color-error)' };
    case 'unclear':
      return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)' };
  }
}

// --- Failure mode ---

export function displayFailureMode(value: FailureMode): string {
  switch (value) {
    case 'correct': return 'Correct';
    case 'right_answer_wrong_reasoning': return 'Right answer, wrong reasoning';
    case 'confident_wrong': return 'Confident wrong';
    case 'appropriately_uncertain': return 'Appropriately uncertain';
    case 'hallucinated_specifics': return 'Hallucinated specifics';
    case 'overhedged': return 'Overhedged';
    case 'other_wrong': return 'Other wrong';
  }
}

export function failureModeColor(value: FailureMode): {
  bg: string; text: string;
} {
  switch (value) {
    case 'correct':
      return { bg: 'var(--color-success-bg)', text: 'var(--color-success)' };
    case 'appropriately_uncertain':
      return { bg: '#D1FAE5', text: '#065F46' };
    case 'right_answer_wrong_reasoning':
    case 'overhedged':
      return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)' };
    case 'confident_wrong':
    case 'hallucinated_specifics':
      return { bg: 'var(--color-error-bg)', text: 'var(--color-error)' };
    case 'other_wrong':
      return { bg: 'var(--color-neutral-bg)', text: 'var(--color-neutral)' };
  }
}

// Solid fill color for failure mode bar charts.
export function failureModeBarColor(value: FailureMode): string {
  switch (value) {
    case 'correct':
    case 'appropriately_uncertain':
      return 'var(--color-success)';
    case 'right_answer_wrong_reasoning':
    case 'overhedged':
      return 'var(--color-warning)';
    case 'confident_wrong':
    case 'hallucinated_specifics':
      return 'var(--color-error)';
    case 'other_wrong':
      return 'var(--color-neutral)';
  }
}

// --- Mechanism / hallmark ---

export function displayMechanism(value: MechanismClass): string {
  return HALLMARKS[value]?.displayName ?? value;
}

// --- Formatting ---

export function formatPercent(value: number, decimals = 1): string {
  return (value * 100).toFixed(decimals) + '%';
}

export function formatPercentInt(value: number): string {
  return Math.round(value * 100) + '%';
}
