import type { LongevityInfluence, FailureMode } from '@/lib/types';
import {
  displayLongevity,
  longevityInfluenceColor,
  displayFailureMode,
  failureModeColor,
} from '@/lib/format-display';

export function LongevityBadge({ value }: { value: LongevityInfluence }) {
  const colors = longevityInfluenceColor(value);
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[12px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {displayLongevity(value)}
    </span>
  );
}

export function FailureModeBadge({ value }: { value: FailureMode }) {
  const colors = failureModeColor(value);
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[12px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {displayFailureMode(value)}
    </span>
  );
}
