import type { DecisionEngine, ReadabilityMark } from '../types.ts'
import { passesGate } from '../types.ts'
import { splitSections } from '../prefilter.ts'
import { Q, READABILITY_SCALE } from '../questions.ts'

/** F4 — one `score` per `##` section. Silent when the engine isn't sure. */
export async function scoreReadability(
  text: string,
  engine: DecisionEngine,
  signal?: AbortSignal,
): Promise<ReadabilityMark[]> {
  const marks: ReadabilityMark[] = []
  for (const section of splitSections(text)) {
    if (section.body.trim().split(/\s+/).length < 30) continue
    const r = await engine.score(section.body, Q.readability, READABILITY_SCALE)
    if (signal?.aborted) return []
    if (!passesGate(r.probs, 0.5, 0.15)) continue
    marks.push({ heading: section.heading, value: r.value, label: READABILITY_SCALE[r.value] })
  }
  return marks
}
