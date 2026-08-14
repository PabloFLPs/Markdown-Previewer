import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Header } from './components/Header'
import { EmptyState } from './components/EmptyState'
import { MarkdownPreview } from './components/MarkdownPreview'
import { MarkdownEditor } from './components/MarkdownEditor'
import { useMarkdownFile } from './hooks/useMarkdownFile'
import { useTheme } from './hooks/useTheme'
import { downloadMarkdown, fallbackFilename, openFilePicker } from './lib/file'

function countWords(content: string): number {
  const match = content.trim().match(/\S+/g)
  return match ? match.length : 0
}

export default function App() {
  const { document, viewMode, setViewMode, openFile, updateContent, error, clearError } =
    useMarkdownFile()
  const { theme, toggleTheme } = useTheme()
  const [isDragging, setIsDragging] = useState(false)

  const handleExport = useCallback(() => {
    if (!document) return
    downloadMarkdown(fallbackFilename(document.filename), document.content)
  }, [document])

  const handleImport = useCallback(() => {
    openFilePicker(openFile)
  }, [openFile])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      const key = e.key.toLowerCase()
      if (key === 'o') {
        e.preventDefault()
        handleImport()
      } else if (key === 's') {
        e.preventDefault()
        handleExport()
      } else if (key === 'e') {
        e.preventDefault()
        setViewMode((prev) => (prev === 'preview' ? 'edit' : 'preview'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleImport, handleExport, setViewMode])

  useEffect(() => {
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')

    const handleDragOver = (e: DragEvent) => {
      if (hasFiles(e)) {
        e.preventDefault()
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setIsDragging(false)
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) openFile(file)
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [openFile])

  return (
    <div className="flex h-full flex-col bg-surface text-ink dark:bg-dark-surface dark:text-dark-ink">
      <Header
        filename={document?.filename ?? null}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={handleExport}
        onImport={handleImport}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-accent/10 backdrop-blur-[1px] dark:bg-dark-accent/10">
          <div className="rounded-xl border-2 border-dashed border-accent bg-surface px-10 py-6 text-sm font-medium text-accent dark:border-dark-accent dark:bg-dark-surface dark:text-dark-accent">
            Drop to open
          </div>
        </div>
      )}

      {!document ? (
        <EmptyState isDragging={isDragging} onOpenFile={handleImport} />
      ) : viewMode === 'preview' ? (
        <MarkdownPreview content={document.content} />
      ) : (
        <MarkdownEditor
          value={document.content}
          onChange={updateContent}
          onExit={() => setViewMode('preview')}
        />
      )}

      {document && (
        <footer className="flex h-8 shrink-0 items-center justify-center gap-4 border-t border-line bg-surface text-xs text-ink-muted dark:border-dark-line dark:bg-dark-surface dark:text-dark-ink-muted">
          <span>{countWords(document.content)} words</span>
          <span>{document.content.length} characters</span>
        </footer>
      )}

      {error && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss error"
            className="text-red-500 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}