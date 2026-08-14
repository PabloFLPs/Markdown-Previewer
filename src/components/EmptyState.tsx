import { FileText, FolderOpen } from 'lucide-react'

interface EmptyStateProps {
  isDragging: boolean
  onOpenFile: () => void
}

export function EmptyState({ isDragging, onOpenFile }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div
        className={`flex w-full max-w-md flex-col items-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? 'border-accent bg-accent/5 dark:border-dark-accent dark:bg-dark-accent/10'
            : 'border-line dark:border-dark-line'
        }`}
      >
        <FileText
          className={`mb-4 h-10 w-10 ${isDragging ? 'text-accent dark:text-dark-accent' : 'text-ink-muted dark:text-dark-ink-muted'}`}
        />
        <p className="text-sm font-medium text-ink dark:text-dark-ink">
          {isDragging ? 'Drop it here' : 'Drop a Markdown file here'}
        </p>
        <p className="mt-1 text-xs text-ink-muted dark:text-dark-ink-muted">or</p>
        <button
          type="button"
          onClick={onOpenFile}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent dark:border-dark-line dark:bg-dark-surface-soft dark:text-dark-ink dark:hover:border-dark-accent dark:hover:text-dark-accent"
        >
          <FolderOpen className="h-4 w-4" />
          Open a .md file
        </button>
        <p className="mt-6 text-xs text-ink-muted dark:text-dark-ink-muted">
          Supports .md and .markdown files — everything stays in your browser.
        </p>
      </div>
    </div>
  )
}