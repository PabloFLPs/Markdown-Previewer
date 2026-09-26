import type { Decision, DecisionEngine } from './types.ts'
import { PROMPTS } from './questions.ts'

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void }

/**
 * Worker client for the Laya decision model. All inference runs off the main
 * thread; `cancelAll()` drops in-flight requests when the text changes.
 */
export class LayaEngine implements DecisionEngine {
  readonly kind = 'model' as const
  private worker: Worker
  private nextId = 1
  private pending = new Map<number, Pending>()
  private loading: Promise<void> | null = null
  onProgress?: (loaded: number, total: number) => void

  constructor() {
    this.worker = new Worker(new URL('./laya.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e) => {
      const msg = e.data
      if (msg.op === 'progress') return this.onProgress?.(msg.loaded, msg.total)
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      if (msg.ok) p.resolve(msg.result)
      else p.reject(new Error(msg.error))
    }
  }

  private call<R>(op: string, payload?: unknown): Promise<R> {
    const id = this.nextId++
    return new Promise<R>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      this.worker.postMessage({ id, op, payload })
    })
  }

  ready(): Promise<void> {
    this.loading ??= this.call<void>('load')
    return this.loading
  }

  cancelAll(): void {
    for (const [id, p] of this.pending) {
      this.worker.postMessage({ id: 0, op: 'cancel', payload: id })
      p.reject(new DOMException('Cancelled', 'AbortError'))
    }
    this.pending.clear()
  }

  choice<T extends string>(state: string, q: string, options: Record<T, string>): Promise<Decision<T>> {
    return this.call('choice', { state, question: PROMPTS[q] ?? q, options })
  }

  score(state: string, q: string, scale: string[]) {
    return this.call<{ value: number; probs: number[] }>('score', { state, question: PROMPTS[q] ?? q, scale })
  }

  noul(state: string, statement: string): Promise<number> {
    return this.call('noul', { state, statement })
  }

  dispose(): void {
    this.cancelAll()
    this.worker.terminate()
  }
}
