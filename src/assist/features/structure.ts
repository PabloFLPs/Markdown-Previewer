import type { DecisionEngine, Suggestion } from '../types.ts'
import { findStructureCandidates, type StructureKind } from '../prefilter.ts'
import { hash } from './codeFence.ts'

const LABELS: Record<StructureKind, string> = {
  'heading-bold': 'Make this a heading?',
  'heading-nospace': 'Make this a heading?',
  'heading-wiki': 'Make this a heading?',
  'list-nospace': 'Make this a list item?',
  'ordered-nospace': 'Make this a numbered item?',
}

/** F3 — `noul` per candidate line; skips the line being typed. */
export async function suggestStructure(
  text: string,
  cursor: number,
  engine: DecisionEngine,
  isDismissed: (key: string) => boolean,
  signal?: AbortSignal,
  threshold = 0.8,
): Promise<Suggestion | null> {
  const candidates = findStructureCandidates(text)
    .filter((c) => cursor < c.lineStart || cursor > c.lineEnd)
    .sort((a, b) => Math.abs(a.lineStart - cursor) - Math.abs(b.lineStart - cursor))

  for (const c of candidates.slice(0, 5)) {
    const key = `structure:${hash(c.text)}`
    if (isDismissed(key)) continue
    const p = await engine.noul(c.context, c.statement)
    if (signal?.aborted) return null
    // Binary gate: p ≥ threshold implies margin over (1 - p) ≥ 0.6.
    if (p < threshold) continue
    return {
      key,
      feature: 'structure',
      label: LABELS[c.kind],
      detail: `${c.text.trim()}  →  ${c.replacement.trim()}`,
      confidence: p,
      edit: { from: c.lineStart, to: c.lineEnd, insert: c.replacement },
      expected: c.text,
    }
  }
  return null
}
