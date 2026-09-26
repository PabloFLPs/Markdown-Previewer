import { useEffect, useState } from 'react'
import { ClipboardPaste, FileText, FolderOpen } from 'lucide-react'
import type { HistoryEntry } from '../lib/history'
import { HistoryList } from './HistoryList'

interface EmptyStateProps {
  isDragging: boolean
  onOpenFile: () => void
  onPaste: () => Promise<boolean>
  history: HistoryEntry[]
  onOpenHistory: (entry: HistoryEntry) => void
  onRemoveHistory: (id: string) => void
}

export function EmptyState({ isDragging, onOpenFile, onPaste, history, onOpenHistory, onRemoveHistory }: EmptyStateProps) {
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (!hint) return
    const timer = window.setTimeout(() => setHint(null), 4000)
    return () => window.clearTimeout(timer)
  }, [hint])

  const handlePaste = async () => {
    const ok = await onPaste()
    if (!ok) setHint('Clipboard unavailable — press Ctrl/Cmd + V to paste.')
  }

  return (
    <div className="anim-rise flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div
        className={`flex w-full max-w-md flex-col items-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          isDragging
            ? 'scale-[1.02] border-accent bg-accent/5 dark:border-dark-accent dark:bg-dark-accent/10'
            : 'border-line dark:border-dark-line'
        }`}
      >
        <FileText
          className={`mb-4 h-10 w-10 transition-transform duration-300 ${isDragging ? '-translate-y-1 scale-110 ' : ''}${isDragging ? 'text-accent dark:text-dark-accent' : 'text-ink-muted dark:text-dark-ink-muted'}`}
        />
        <p className="text-sm font-medium text-ink dark:text-dark-ink">
          {isDragging ? 'Drop it here' : 'Drop a Markdown file here'}
        </p>
        <p className="mt-1 text-xs text-ink-muted dark:text-dark-ink-muted">or</p>
        <button
          type="button"
          onClick={onOpenFile}
          className="press mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent dark:border-dark-line dark:bg-dark-surface-soft dark:text-dark-ink dark:hover:border-dark-accent dark:hover:text-dark-accent"
        >
          <FolderOpen className="h-4 w-4" />
          Open a .md file
        </button>
        <p className="mt-1 text-xs text-ink-muted dark:text-dark-ink-muted">or</p>
        <button
          type="button"
          onClick={handlePaste}
          className="press mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent dark:border-dark-line dark:bg-dark-surface-soft dark:text-dark-ink dark:hover:border-dark-accent dark:hover:text-dark-accent"
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste Markdown
        </button>
        {hint && (
          <p role="status" className="anim-rise mt-3 text-xs text-accent dark:text-dark-accent">
            {hint}
          </p>
        )}
        <p className="mt-6 text-xs text-ink-muted dark:text-dark-ink-muted">
          Supports .md and .markdown files — everything stays in your browser.
        </p>
      </div>
      {history.length > 0 && (
        <section className="w-full max-w-md">
          <h2 className="mb-2 px-2.5 text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
            Recent
          </h2>
          <HistoryList entries={history} onOpen={onOpenHistory} onRemove={onRemoveHistory} limit={5} />
        </section>
      )}
    </div>
  )
}
