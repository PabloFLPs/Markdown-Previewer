/**
 * Recent documents — stored only in this browser (localStorage).
 * Capped by count and size so it never crowds out the current document.
 */

export interface HistoryEntry {
  id: string
  filename: string | null
  content: string
  savedContent: string
  updatedAt: number
}

const KEY = 'markdown-preview:history'
export const HISTORY_LIMIT = 15
const MAX_ENTRY_CHARS = 400_000 // skip huge docs rather than evict everything else
const MAX_TOTAL_CHARS = 2_000_000

export function newDocId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is HistoryEntry =>
        !!e && typeof e.id === 'string' && typeof e.content === 'string' && typeof e.updatedAt === 'number',
    )
  } catch {
    return []
  }
}

function persist(entries: HistoryEntry[]): HistoryEntry[] {
  // Trim to limits (newest first), then retry smaller if the quota is hit.
  let list = entries.slice(0, HISTORY_LIMIT)
  let total = 0
  list = list.filter((e) => (total += e.content.length + e.savedContent.length) <= MAX_TOTAL_CHARS)
  while (list.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list))
      return list
    } catch {
      list = list.slice(0, -1)
    }
  }
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Ignore.
  }
  return []
}

/** Insert or update, moving the entry to the top. Empty documents are not kept. */
export function upsertHistory(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  if (!entry.content.trim() || entry.content.length > MAX_ENTRY_CHARS) return entries
  const rest = entries.filter((e) => e.id !== entry.id)
  return persist([entry, ...rest])
}

export function removeHistory(entries: HistoryEntry[], id: string): HistoryEntry[] {
  return persist(entries.filter((e) => e.id !== id))
}

export function clearHistory(): HistoryEntry[] {
  return persist([])
}

/** Same file opened again → reuse its entry instead of duplicating it. */
export function findDuplicate(entries: HistoryEntry[], filename: string | null, content: string) {
  return entries.find((e) => e.filename === filename && e.content === content)
}

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.round((now - ts) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} d ago`
  return new Date(ts).toLocaleDateString()
}

/** First heading or first non-empty line — a human title for untitled docs. */
export function entryTitle(e: Pick<HistoryEntry, 'filename' | 'content'>): string {
  if (e.filename) return e.filename
  const heading = /^#{1,6}\s+(.+)$/m.exec(e.content)?.[1]
  const first = heading ?? e.content.split('\n').find((l) => l.trim())?.trim() ?? 'Untitled'
  return first.length > 48 ? `${first.slice(0, 47)}…` : first
}
