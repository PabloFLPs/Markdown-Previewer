import { useEffect, useRef, useState } from 'react'
import { History } from 'lucide-react'
import type { HistoryEntry } from '../lib/history'
import { HistoryList } from './HistoryList'
import { Presence } from './motion'

interface HistoryMenuProps {
  entries: HistoryEntry[]
  currentId?: string
  onOpen: (entry: HistoryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
  /** Mobile: bigger tap target, full-width sheet under the header. */
  compact?: boolean
}

export function HistoryMenu({ entries, currentId, onOpen, onRemove, onClear, compact = false }: HistoryMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // ⌘/Ctrl + Shift + H toggles the menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Recent documents"
        aria-expanded={open}
        title="Recent documents (Ctrl/Cmd + Shift + H)"
        className={`group inline-flex items-center ${compact ? 'h-9 w-9' : 'h-8 w-8'} justify-center rounded-md border bg-surface transition-colors dark:bg-dark-surface-soft ${
          open
            ? 'border-accent text-accent dark:border-dark-accent dark:text-dark-accent'
            : 'border-line text-ink-muted hover:border-accent hover:text-accent dark:border-dark-line dark:text-dark-ink-muted dark:hover:border-dark-accent dark:hover:text-dark-accent'
        }`}
      >
        <History className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45" />
      </button>

      <Presence
        show={open}
        enter="anim-menu-in"
        exit="anim-menu-out"
        duration={140}
        className={
          compact
            ? 'fixed inset-x-3 top-[3.75rem] z-40 origin-top'
            : 'absolute right-0 top-10 z-40 w-80 origin-top-right'
        }
      >
        <div className="rounded-lg border border-line bg-surface p-1.5 shadow-lg dark:border-dark-line dark:bg-dark-surface-soft">
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
              Recent
            </span>
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all recent documents? The open document stays open.')) onClear()
                }}
                className="text-xs text-ink-muted hover:text-red-600 dark:text-dark-ink-muted dark:hover:text-red-400"
              >
                Clear all
              </button>
            )}
          </div>
          {entries.length === 0 ? (
            <p className="px-2.5 py-4 text-center text-xs text-ink-muted dark:text-dark-ink-muted">
              Documents you open or write show up here.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <HistoryList
                entries={entries}
                currentId={currentId}
                onRemove={onRemove}
                onOpen={(e) => {
                  setOpen(false)
                  onOpen(e)
                }}
              />
            </div>
          )}
          <p className="border-t border-line px-2.5 pb-1 pt-2 text-[11px] text-ink-muted dark:border-dark-line dark:text-dark-ink-muted">
            Stored only in this browser.
          </p>
        </div>
      </Presence>
    </div>
  )
}
