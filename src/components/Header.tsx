import {
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  FilePlus2,
  FolderOpen,
  PenLine,
  Eye,
} from 'lucide-react'
import type { ViewMode } from '../lib/viewMode'
import { ThemeToggle } from './ThemeToggle'
import type { Theme } from '../hooks/useTheme'

interface HeaderProps {
  hasDocument: boolean
  filename: string | null
  isDirty: boolean
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onNew: () => void
  onOpen: () => void
  onCopy: () => void
  copied: boolean
  onExport: () => void
  theme: Theme
  onToggleTheme: () => void
  isDesktop: boolean
}

const actionButton =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent dark:border-dark-line dark:bg-dark-surface-soft dark:text-dark-ink dark:hover:border-dark-accent dark:hover:text-dark-accent'

export function Header({
  hasDocument,
  filename,
  isDirty,
  viewMode,
  onViewModeChange,
  onNew,
  onOpen,
  onCopy,
  copied,
  onExport,
  theme,
  onToggleTheme,
  isDesktop,
}: HeaderProps) {
  const showBackToEditor = !isDesktop && hasDocument && viewMode === 'preview'
  const editing = viewMode === 'edit'

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 dark:border-dark-line dark:bg-dark-surface">
      <div className="flex min-w-0 items-center gap-2.5">
        {showBackToEditor ? (
          <button
            type="button"
            onClick={() => onViewModeChange('edit')}
            className="-ml-2 inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-ink transition-colors hover:text-accent dark:text-dark-ink dark:hover:text-dark-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <>
            <span className="shrink-0 text-sm font-semibold tracking-tight text-ink dark:text-dark-ink">
              Markdown Previewer
            </span>
            {hasDocument && (
              <span className="hidden min-w-0 items-baseline gap-1 truncate text-sm text-ink-muted sm:flex dark:text-dark-ink-muted">
                <span className="text-line dark:text-dark-line">/</span>
                <span className="truncate font-mono">{filename ?? 'Untitled'}</span>
                {isDirty && (
                  <span
                    aria-label="Unsaved changes"
                    title="Unsaved changes"
                    className="text-accent dark:text-dark-accent"
                  >
                    *
                  </span>
                )}
              </span>
            )}
          </>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {hasDocument && isDesktop && (
          <button
            type="button"
            onClick={() => onViewModeChange(editing ? 'preview' : 'edit')}
            title={editing ? 'View rendered preview' : 'Live editor'}
            className={actionButton}
          >
            {editing ? <Eye className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />}
            <span>{editing ? 'Preview' : 'Edit'}</span>
          </button>
        )}

        {hasDocument && (
          <button
            type="button"
            onClick={onCopy}
            title="Copy Markdown (Ctrl/Cmd + Shift + C)"
            className={copied ? `${actionButton} border-accent text-accent dark:border-dark-accent dark:text-dark-accent` : actionButton}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
            <span className={copied ? '' : 'hidden md:inline'}>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}

        <button type="button" onClick={onNew} title="New document (Ctrl/Cmd + N)" className={actionButton}>
          <FilePlus2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">New</span>
        </button>

        <button type="button" onClick={onOpen} title="Open a Markdown file (Ctrl/Cmd + O)" className={actionButton}>
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Open</span>
        </button>

        {hasDocument && (
          <button
            type="button"
            onClick={onExport}
            title="Export Markdown (Ctrl/Cmd + S)"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-2.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 dark:bg-dark-accent dark:text-dark-surface dark:hover:bg-blue-500"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
