import {
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  FilePlus2,
  FolderOpen,
  PenLine,
  Info,
  Eye,
} from 'lucide-react'
import type { ViewMode } from '../lib/viewMode'
import { ThemeToggle } from './ThemeToggle'
import type { Theme } from '../hooks/useTheme'
import { AssistToggle } from './AssistToggle'
import { CollapseX } from './motion'
import { HistoryMenu } from './HistoryMenu'
import type { HistoryEntry } from '../lib/history'
import type { AssistMode } from '../assist/types'
import type { EngineStatus } from '../assist/useSmartAssist'

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
  assistMode: AssistMode
  assistStatus: EngineStatus
  onAssistModeChange: (mode: AssistMode) => void
  onAbout: () => void
  appIconSrc: string
  history: HistoryEntry[]
  currentDocId?: string
  onOpenHistory: (entry: HistoryEntry) => void
  onRemoveHistory: (id: string) => void
  onClearHistory: () => void
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
  assistMode,
  assistStatus,
  onAssistModeChange,
  onAbout,
  appIconSrc,
  history,
  currentDocId,
  onOpenHistory,
  onRemoveHistory,
  onClearHistory,
}: HeaderProps) {
  const showBackToEditor = !isDesktop && hasDocument && viewMode === 'preview'
  const editing = viewMode === 'edit'

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 dark:border-dark-line dark:bg-dark-surface">
      <div className="flex min-w-0 items-center gap-2.5">
        {showBackToEditor ? (
          <button
            key="back"
            type="button"
            onClick={() => onViewModeChange('edit')}
            className="anim-slide-in-left -ml-2 inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-ink transition-colors hover:text-accent dark:text-dark-ink dark:hover:text-dark-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <>
            <img src={appIconSrc} alt="" className="h-5 w-5 shrink-0" />
            <span className="shrink-0 text-sm font-semibold tracking-tight text-ink dark:text-dark-ink">
              Smart Markdown Previewer
            </span>
            {hasDocument && (
              <span className="anim-rise hidden min-w-0 items-baseline gap-1 truncate text-sm text-ink-muted sm:flex dark:text-dark-ink-muted">
                <span className="text-line dark:text-dark-line">/</span>
                <span className="truncate font-mono">{filename ?? 'Untitled'}</span>
                {isDirty && (
                  <span
                    aria-label="Unsaved changes"
                    title="Unsaved changes"
                    className="anim-pop text-accent dark:text-dark-accent"
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
        <CollapseX show={hasDocument && editing}>
          <AssistToggle mode={assistMode} status={assistStatus} onChange={onAssistModeChange} />
        </CollapseX>

        <CollapseX show={hasDocument && isDesktop}>
          <button
            type="button"
            onClick={() => onViewModeChange(editing ? 'preview' : 'edit')}
            title={editing ? 'View rendered preview' : 'Live editor'}
            className={actionButton}
          >
            <span key={editing ? 'p' : 'e'} className="anim-spin-in inline-flex">
              {editing ? <Eye className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />}
            </span>
            <span key={editing ? 'pt' : 'et'} className="anim-rise">{editing ? 'Preview' : 'Edit'}</span>
          </button>
        </CollapseX>

        <CollapseX show={hasDocument}>
          <button
            type="button"
            onClick={onCopy}
            title="Copy Markdown (Ctrl/Cmd + Shift + C)"
            className={copied ? `${actionButton} border-accent text-accent dark:border-dark-accent dark:text-dark-accent` : actionButton}
          >
            {copied ? <Check className="anim-pop h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
            <span key={copied ? 'c' : 'n'} className={copied ? 'anim-rise' : 'hidden md:inline'}>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </CollapseX>

        <button type="button" onClick={onNew} title="New document (Ctrl/Cmd + N)" className={actionButton}>
          <FilePlus2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">New</span>
        </button>

        <button type="button" onClick={onOpen} title="Open a Markdown file (Ctrl/Cmd + O)" className={actionButton}>
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Open</span>
        </button>

        <CollapseX show={hasDocument}>
          <button
            type="button"
            onClick={onExport}
            title="Export Markdown (Ctrl/Cmd + S)"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-2.5 text-xs font-medium text-white transition-colors hover:bg-accent-strong dark:bg-dark-accent dark:text-dark-surface dark:hover:bg-dark-accent-strong"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </CollapseX>

        <HistoryMenu
          entries={history}
          currentId={currentDocId}
          onOpen={onOpenHistory}
          onRemove={onRemoveHistory}
          onClear={onClearHistory}
        />

        <button
          type="button"
          onClick={onAbout}
          aria-label="About & features"
          title="About & features"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-ink-muted transition-colors hover:border-accent hover:text-accent dark:border-dark-line dark:bg-dark-surface-soft dark:text-dark-ink-muted dark:hover:border-dark-accent dark:hover:text-dark-accent"
        >
          <Info className="h-4 w-4" />
        </button>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
