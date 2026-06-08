// Human-oversight rating attached to every paper. The single source of truth for
// the levels, their display labels, and their order (low → high oversight).
export const OVERSIGHT_LEVELS = ['minimal', 'low', 'medium', 'high'] as const;
export type OversightLevel = (typeof OVERSIGHT_LEVELS)[number];

export const OVERSIGHT_LABEL: Record<OversightLevel, string> = {
  minimal: 'None / Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function oversightLabel(level: string): string {
  return (OVERSIGHT_LABEL as Record<string, string>)[level] ?? 'None / Minimal';
}
