import type { DecisionEngine, Suggestion } from '../types.ts'
import { passesGate } from '../types.ts'
import { findBareFences } from '../prefilter.ts'
import { LANGUAGES, Q, type Language } from '../questions.ts'

export const FENCE_THRESHOLD = { threshold: 0.8, margin: 0.2 }

/** F1 — suggest a language tag for the nearest closed, untagged fence the cursor is NOT inside. */
export async function suggestFenceLanguage(
  text: string,
  cursor: number,
  engine: DecisionEngine,
  isDismissed: (key: string) => boolean,
  signal?: AbortSignal,
): Promise<Suggestion | null> {
  const fences = findBareFences(text)
    .filter((f) => (cursor < f.blockStart || cursor > f.blockEnd) && f.body.trim().length >= 3)
    .sort((a, b) => distance(a, cursor) - distance(b, cursor))

  for (const fence of fences.slice(0, 3)) {
    const key = `codeFence:${hash(fence.body)}`
    if (isDismissed(key)) continue
    const d = await engine.choice<Language>(fence.body, Q.fenceLanguage, LANGUAGES)
    if (signal?.aborted) return null
    const probs = Object.values(d.probs) as number[]
    if (d.choice === 'plaintext' || !passesGate(probs, FENCE_THRESHOLD.threshold, FENCE_THRESHOLD.margin)) continue
    return {
      key,
      feature: 'codeFence',
      label: `Add language “${d.choice}” to code block`,
      detail: LANGUAGES[d.choice],
      message: { key: 'suggest.fence', vars: { lang: d.choice } },
      confidence: d.probs[d.choice],
      edit: { from: fence.insertAt, to: fence.insertAt, insert: d.choice },
      expected: '',
    }
  }
  return null
}

function distance(f: { blockStart: number; blockEnd: number }, cursor: number): number {
  return cursor < f.blockStart ? f.blockStart - cursor : cursor - f.blockEnd
}

export function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}
