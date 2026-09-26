import type { Decision, DecisionEngine } from './types.ts'
import { softmax, toDecision } from './types.ts'
import { classifyLanguage } from './heuristics/language.ts'
import { classifyPaste } from './heuristics/paste.ts'
import { readabilityScores } from './heuristics/readability.ts'
import { structureProbability } from './heuristics/structure.ts'
import { Q } from './questions.ts'

/**
 * Always-available engine. Same contract as the model engine, backed by
 * keyword/regex scoring. Question ids route to the matching scorer.
 */
export class HeuristicEngine implements DecisionEngine {
  readonly kind = 'heuristic' as const

  async ready(): Promise<void> {}

  async choice<T extends string>(state: string, q: string, options: Record<T, string>): Promise<Decision<T>> {
    const keys = Object.keys(options) as T[]
    let scores: Record<string, number>
    if (q === Q.fenceLanguage) scores = classifyLanguage(state)
    else if (q === Q.pasteKind) scores = classifyPaste(state)
    else throw new Error(`HeuristicEngine: unknown choice question "${q}"`)
    return toDecision(
      keys,
      keys.map((k) => scores[k] ?? -10),
    )
  }

  async score(state: string, q: string, scale: string[]): Promise<{ value: number; probs: number[] }> {
    if (q !== Q.readability) throw new Error(`HeuristicEngine: unknown score question "${q}"`)
    const logits = readabilityScores(state, scale.length)
    const probs = softmax(logits)
    return { value: probs.indexOf(Math.max(...probs)), probs }
  }

  async noul(state: string, statement: string): Promise<number> {
    return structureProbability(state, statement)
  }
}
