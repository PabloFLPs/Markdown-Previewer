export interface StoredDocument {
  id?: string
  filename: string | null
  content: string
  savedContent: string
}

const DOC_KEY = 'markdown-preview:doc'
const SPLIT_KEY = 'markdown-preview:split'

export function loadDocument(): StoredDocument | null {
  try {
    const raw = localStorage.getItem(DOC_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredDocument> | null
    if (typeof parsed?.content !== 'string') return null
    const isEmptyUntitled =
      parsed.content === '' && !parsed.filename && !parsed.savedContent
    if (isEmptyUntitled) return null
    return {
      id: typeof parsed.id === 'string' ? parsed.id : undefined,
      filename: typeof parsed.filename === 'string' ? parsed.filename : null,
      content: parsed.content,
      savedContent:
        typeof parsed.savedContent === 'string' ? parsed.savedContent : parsed.content,
    }
  } catch {
    return null
  }
}

export function saveDocument(doc: StoredDocument): void {
  try {
    localStorage.setItem(DOC_KEY, JSON.stringify(doc))
  } catch {
    // Storage unavailable or full — persistence is best-effort.
  }
}

export function clearStoredDocument(): void {
  try {
    localStorage.removeItem(DOC_KEY)
  } catch {
    // Ignore.
  }
}

export function loadSplitRatio(): number {
  try {
    const raw = localStorage.getItem(SPLIT_KEY)
    const value = raw ? Number.parseFloat(raw) : Number.NaN
    return value >= 20 && value <= 80 ? value : 50
  } catch {
    return 50
  }
}

export function saveSplitRatio(ratio: number): void {
  try {
    localStorage.setItem(SPLIT_KEY, String(ratio))
  } catch {
    // Ignore.
  }
}

export type StoredAssistMode = 'off' | 'heuristics' | 'model'
const ASSIST_KEY = 'markdown-preview:assist'

export function loadAssistMode(): StoredAssistMode {
  try {
    const raw = localStorage.getItem(ASSIST_KEY)
    return raw === 'heuristics' || raw === 'model' ? raw : 'off'
  } catch {
    return 'off'
  }
}

export function saveAssistMode(mode: StoredAssistMode): void {
  try {
    localStorage.setItem(ASSIST_KEY, mode)
  } catch {
    // Ignore.
  }
}
