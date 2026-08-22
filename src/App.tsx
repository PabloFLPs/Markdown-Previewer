import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Eye, X } from 'lucide-react'
import { Header } from './components/Header'
import { EmptyState } from './components/EmptyState'
import { MarkdownPreview } from './components/MarkdownPreview'
import { MarkdownEditor } from './components/MarkdownEditor'
import { SplitPanes } from './components/SplitPanes'
import { useMarkdownFile } from './hooks/useMarkdownFile'
import { useTheme } from './hooks/useTheme'
import { useMediaQuery } from './hooks/useMediaQuery'
import {
  copyTextToClipboard,
  downloadMarkdown,
  fallbackFilename,
  openFilePicker,
} from './lib/file'
import { loadSplitRatio, saveSplitRatio } from './lib/storage'
import type { ViewMode } from './lib/viewMode'

const DESKTOP_QUERY = '(min-width: 768px)'
const COPIED_RESET_MS = 1600

function countWords(content: string): number {
  const match = content.trim().match(/\S+/g)
  return match ? match.length : 0
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

export default function App() {
  const {
    document,
    isDirty,
    openFile,
    pasteText,
    newDocument,
    updateContent,
    markSaved,
    error,
    clearError,
    setError,
  } = useMarkdownFile()
  const { theme, toggleTheme } = useTheme()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [splitRatio, setSplitRatio] = useState(loadSplitRatio)
  const copiedTimer = useRef<number | null>(null)

  const showResult = useCallback(
    (created: boolean) => {
      if (created) setViewMode(isDesktop ? 'preview' : 'edit')
    },
    [isDesktop],
  )

  const handleImport = useCallback(() => {
    openFilePicker(async (file) => {
      showResult(await openFile(file))
    })
  }, [openFile, showResult])

  const handlePasteFromClipboard = useCallback(async (): Promise<boolean> => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) return false
      pasteText(text)
      showResult(true)
      return true
    } catch {
      return false
    }
  }, [pasteText, showResult])

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return
    newDocument()
    setViewMode('edit')
  }, [isDirty, newDocument])

  const handleExport = useCallback(() => {
    if (!document) return
    downloadMarkdown(fallbackFilename(document.filename), document.content)
    markSaved()
  }, [document, markSaved])

  const handleCopy = useCallback(async () => {
    if (!document) return
    const ok = await copyTextToClipboard(document.content)
    if (ok) {
      setCopied(true)
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_RESET_MS)
    } else {
      setError('Failed to copy to clipboard.')
    }
  }, [document, setError])

  useEffect(
    () => () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
    },
    [],
  )

  // Small screens start in the editor.
  const checkedInitialMode = useRef(false)
  useEffect(() => {
    if (checkedInitialMode.current) return
    checkedInitialMode.current = true
    if (!isDesktop && document) setViewMode('edit')
  }, [isDesktop, document])

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
      } else if (key === 'n' && !e.shiftKey) {
        e.preventDefault()
        handleNew()
      } else if (key === 'c' && e.shiftKey) {
        e.preventDefault()
        handleCopy()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleImport, handleExport, handleNew, handleCopy])

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
      if (file) {
        openFile(file).then((ok) => {
          if (ok) setViewMode(isDesktop ? 'preview' : 'edit')
        })
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [openFile, isDesktop])

  // Paste Markdown anywhere outside the editor.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return
      const text = e.clipboardData?.getData('text/plain')
      if (!text?.trim()) return
      e.preventDefault()
      pasteText(text)
      showResult(true)
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [pasteText, showResult])

  const handleChangeSplitRatio = useCallback((ratio: number) => {
    setSplitRatio(ratio)
    saveSplitRatio(ratio)
  }, [])

  const hasDocument = document !== null
  const editing = hasDocument && viewMode === 'edit'

  return (
    <div
      className={`flex flex-col bg-surface text-ink dark:bg-dark-surface dark:text-dark-ink ${
        editing ? 'h-dvh overflow-hidden' : 'min-h-dvh'
      }`}
    >
      <Header
        hasDocument={hasDocument}
        filename={document?.filename ?? null}
        isDirty={isDirty}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNew={handleNew}
        onOpen={handleImport}
        onCopy={handleCopy}
        copied={copied}
        onExport={handleExport}
        theme={theme}
        onToggleTheme={toggleTheme}
        isDesktop={isDesktop}
      />

      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-accent/10 backdrop-blur-[1px] dark:bg-dark-accent/10">
          <div className="rounded-xl border-2 border-dashed border-accent bg-surface px-10 py-6 text-sm font-medium text-accent dark:border-dark-accent dark:bg-dark-surface dark:text-dark-accent">
            Drop to open
          </div>
        </div>
      )}

      {!document ? (
        <EmptyState isDragging={isDragging} onOpenFile={handleImport} onPaste={handlePasteFromClipboard} />
      ) : editing ? (
        isDesktop ? (
          <SplitPanes
            ratio={splitRatio}
            onRatioChange={handleChangeSplitRatio}
            left={
              <main>
                <MarkdownPreview content={document.content} />
              </main>
            }
            right={
              <main className="h-full">
                <MarkdownEditor value={document.content} onChange={updateContent} />
              </main>
            }
          />
        ) : (
          <>
            <main className="min-h-0 flex-1">
              <MarkdownEditor value={document.content} onChange={updateContent} />
            </main>
            <div className="shrink-0 border-t border-line bg-surface p-3 dark:border-dark-line dark:bg-dark-surface">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-dark-accent dark:text-dark-surface dark:hover:bg-blue-500"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
            </div>
          </>
        )
      ) : (
        <main className="flex flex-1 flex-col">
          <MarkdownPreview content={document.content} />
        </main>
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
