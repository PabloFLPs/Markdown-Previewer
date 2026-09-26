/// <reference lib="webworker" />
/**
 * Laya inference worker (scaffold).
 *
 * Protocol (see layaEngine.ts):
 *   in:  { id, op: 'load' } | { id, op: 'choice'|'score'|'noul', payload } | { id, op: 'cancel' }
 *   out: { id, ok: true, result } | { id, ok: false, error } | { op: 'progress', loaded, total }
 *
 * Model runtime is intentionally not wired yet — open question #1 in
 * "SMART-ASSIST — Implementation Context.md" (exact ONNX export + JS API).
 * Plug it into `loadModel` / `infer` below; everything around it is ready.
 */

type Req = { id: number; op: 'load' | 'choice' | 'score' | 'noul' | 'cancel'; payload?: unknown }

const cancelled = new Set<number>()
let model: { infer(op: string, payload: unknown): Promise<unknown> } | null = null

async function loadModel(): Promise<typeof model> {
  // TODO(laya): e.g. transformers.js `pipeline(...)` or onnxruntime-web InferenceSession,
  // preferring WebGPU (`'gpu' in navigator`) and falling back to WASM. Report
  // progress with postMessage({ op: 'progress', loaded, total }).
  throw new Error('Local model runtime is not configured yet.')
}

self.onmessage = async (e: MessageEvent<Req>) => {
  const { id, op, payload } = e.data
  if (op === 'cancel') {
    cancelled.add(payload as number)
    return
  }
  try {
    if (op === 'load') {
      model ??= await loadModel()
      self.postMessage({ id, ok: true, result: null })
      return
    }
    if (!model) throw new Error('Model not loaded')
    const result = await model.infer(op, payload)
    if (cancelled.delete(id)) return
    self.postMessage({ id, ok: true, result })
  } catch (err) {
    if (cancelled.delete(id)) return
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
