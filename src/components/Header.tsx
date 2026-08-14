import { Download, FilePlus2, PenLine, Eye } from 'lucide-react'
import type { ViewMode } from '../hooks/useMarkdownFile'
import { ThemeToggle } from './ThemeToggle'
import type { Theme } from '../hooks/useTheme'

interface HeaderProps {
  filename: string | null
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onExport: () => void
  onImport: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function Header({
  filename,
  viewMode,
  onViewModeChange,
  onExport,
  onImport,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const hasDocument = filename !== null

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 dark:border-dark-line dark:bg-dark-surface">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="text-sm font-semibold tracking-tight text-ink dark:text-dark-ink">
          Markdown Preview
        </span>
        {hasDocument && (
          <span className="hidden min-w-0 truncate text-sm text-ink-muted sm:inline dark:text-dark-ink-muted">
            <span className="mx-1 text-line dark:text-dark-line">/</span>
            <span className="truncate font-mono">{filename}</span>
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {hasDocument && (
          <div className="mr-1 flex rounded-md border border-line bg-surface-soft p-0.5 dark:border-dark-line dark:bg-dark-surface-soft">
            <button
              type="button"
              onClick={() => onViewModeChange('preview')}
              aria-pressed={viewMode === 'preview'}
              title="Preview"
              className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-surface text-ink shadow-sm dark:bg-dark-surface-raised dark:text-dark-ink'
                  : 'text-ink-muted hover:text-ink dark:text-dark-ink-muted dark:hover:text-dark-ink'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('edit')}
              aria-pressed={viewMode === 'edit'}
              title="Edit (Ctrl/Cmd + E)"
              className={`inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors ${
                viewMode === 'edit'
                  ? 'bg-surface text-ink shadow-sm dark:bg-dark-surface-raised dark:text-dark-ink'
                  : 'text-ink-muted hover:text-ink dark:text-dark-ink-muted dark:hover:text-dark-ink'
              }`}
            >
              <PenLine className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Edit</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onImport}
          title="Open a Markdown file (Ctrl/Cmd + O)"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent dark:border-dark-line dark:bg-dark-surface-soft dark:text-dark-ink dark:hover:border-dark-accent dark:hover:text-dark-accent"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open</span>
        </button>

        {hasDocument && (
          <button
            type="button"
            onClick={onExport}
            title="Export (Ctrl/Cmd + S)"
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