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
import { loadAssistMode, loadSplitRatio, saveAssistMode, saveSplitRatio } from './lib/storage'
import { AboutPage } from './components/AboutPage'
import { SAMPLE_DOCUMENT } from './lib/sampleDocument'
import { Presence } from './components/motion'
import { SuggestionBar } from './components/SuggestionBar'
import { useAppIcon } from './hooks/useAppIcon'
import { appIconUrl } from './lib/appIcons'
import { useSmartAssist } from './assist/useSmartAssist'
import type { AssistMode } from './assist/types'
import type { ViewMode } from './lib/viewMode'

const EXIT_MS = 220
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
    history: recent,
    openFromHistory,
    removeFromHistory,
    clearHistory,
  } = useMarkdownFile()
  const { theme, toggleTheme } = useTheme()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [splitRatio, setSplitRatio] = useState(loadSplitRatio)
  const copiedTimer = useRef<number | null>(null)
  const [assistMode, setAssistMode] = useState<AssistMode>(loadAssistMode)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const assist = useSmartAssist({
    mode: assistMode,
    text: document?.content ?? '',
    textareaRef,
    onChange: updateContent,
  })

  const { icon: appIcon, setIcon: setAppIcon } = useAppIcon()
  const [showAbout, setShowAbout] = useState(() => window.location.hash === '#about')
  const [aboutClosing, setAboutClosing] = useState(false)
  const aboutTimer = useRef<number | null>(null)
  // Play the exit animation, then unmount.
  const hideAbout = useCallback(() => {
    if (aboutTimer.current) return
    setAboutClosing(true)
    aboutTimer.current = window.setTimeout(() => {
      aboutTimer.current = null
      setAboutClosing(false)
      setShowAbout(false)
    }, EXIT_MS)
  }, [])
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#about') setShowAbout(true)
      else hideAbout()
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [hideAbout])
  const openAbout = useCallback(() => {
    window.location.hash = 'about'
  }, [])
  const closeAbout = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    hideAbout()
  }, [hideAbout])

  // Editor enter/exit: the pane slides in from the right, and back out on close.
  const [editorClosing, setEditorClosing] = useState(false)
  const editorTimer = useRef<number | null>(null)
  const changeViewMode = useCallback(
    (mode: ViewMode) => {
      if (mode === 'edit') {
        if (editorTimer.current) window.clearTimeout(editorTimer.current)
        editorTimer.current = null
        setEditorClosing(false)
        setViewMode('edit')
        return
      }
      if (viewMode !== 'edit' || editorTimer.current) return
      setEditorClosing(true)
      editorTimer.current = window.setTimeout(() => {
        editorTimer.current = null
        setEditorClosing(false)
        setViewMode('preview')
      }, EXIT_MS)
    },
    [viewMode],
  )

  const handleAssistModeChange = useCallback((mode: AssistMode) => {
    setAssistMode(mode)
    saveAssistMode(mode)
  }, [])

  const editor = document && (
    <MarkdownEditor
      value={document.content}
      onChange={updateContent}
      textareaRef={textareaRef}
      {...(assist.enabled ? assist.handlers : {})}
    >
      <Presence
        show={assist.enabled && !!assist.suggestion}
        enter=""
        exit="anim-slide-down"
        duration={160}
        className="pointer-events-none absolute inset-x-3 bottom-3 z-10"
      >
        {assist.enabled && assist.suggestion && (
          <SuggestionBar key={assist.suggestion.key} suggestion={assist.suggestion} onAccept={assist.accept} onDismiss={assist.dismiss} />
        )}
      </Presence>
    </MarkdownEditor>
  )

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

  // No "discard?" prompts: the current document is kept in Recent before switching.
  const handleOpenHistory = useCallback(
    (entry: Parameters<typeof openFromHistory>[0]) => {
      openFromHistory(entry)
      if (showAbout) closeAbout()
      setViewMode(isDesktop ? 'preview' : 'edit')
    },
    [openFromHistory, showAbout, closeAbout, isDesktop],
  )

  const handleNew = useCallback(() => {
    newDocument()
    setViewMode('edit')
  }, [newDocument])

  const handleTrySmartAssist = useCallback(() => {
    pasteText(SAMPLE_DOCUMENT)
    handleAssistModeChange(assistMode === 'off' ? 'heuristics' : assistMode)
    closeAbout()
    setViewMode('edit')
  }, [pasteText, handleAssistModeChange, assistMode, closeAbout])

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
  // Previous screen — lets the preview skip its fade when it's revealed by the editor closing.
  const view = showAbout ? 'about' : !hasDocument ? 'empty' : editing ? 'edit' : 'preview'
  const prevView = useRef(view)
  const currentView = useRef(view)
  if (currentView.current !== view) {
    prevView.current = currentView.current
    currentView.current = view
  }

  return (
    <div
      className={`flex flex-col bg-surface text-ink dark:bg-dark-surface dark:text-dark-ink ${
        editing ? 'h-dvh overflow-clip' : 'min-h-dvh'
      }`}
    >
      <Header
        hasDocument={hasDocument}
        filename={document?.filename ?? null}
        isDirty={isDirty}
        viewMode={editorClosing ? 'preview' : viewMode}
        onViewModeChange={changeViewMode}
        onNew={handleNew}
        onOpen={handleImport}
        onCopy={handleCopy}
        copied={copied}
        onExport={handleExport}
        theme={theme}
        onToggleTheme={toggleTheme}
        isDesktop={isDesktop}
        assistMode={assistMode}
        assistStatus={assist.status}
        onAssistModeChange={handleAssistModeChange}
        onAbout={openAbout}
        appIconSrc={appIconUrl(appIcon)}
        history={recent}
        currentDocId={document?.id}
        onOpenHistory={handleOpenHistory}
        onRemoveHistory={removeFromHistory}
        onClearHistory={clearHistory}
        showingAbout={showAbout}
      />

      <Presence show={isDragging} duration={160} className="pointer-events-none fixed inset-0 z-50">
        <div className="flex h-full items-center justify-center bg-accent/10 backdrop-blur-[1px] dark:bg-dark-accent/10">
          <div className="anim-pop rounded-xl border-2 border-dashed border-accent bg-surface px-10 py-6 text-sm font-medium text-accent dark:border-dark-accent dark:bg-dark-surface dark:text-dark-accent">
            Drop to open
          </div>
        </div>
      </Presence>

      {showAbout ? (
        <AboutPage
          closing={aboutClosing}
          onBack={closeAbout}
          onTrySmartAssist={handleTrySmartAssist}
          appIcon={appIcon}
          onAppIconChange={setAppIcon}
        />
      ) : !document ? (
        <EmptyState
          isDragging={isDragging}
          onOpenFile={handleImport}
          onPaste={handlePasteFromClipboard}
          history={recent}
          onOpenHistory={handleOpenHistory}
          onRemoveHistory={removeFromHistory}
        />
      ) : editing ? (
        isDesktop ? (
          <SplitPanes
            closing={editorClosing}
            animateWidth={document.content.length < 40_000}
            ratio={splitRatio}
            onRatioChange={handleChangeSplitRatio}
            left={
              <main>
                <MarkdownPreview content={document.content} readability={assist.readability} />
              </main>
            }
            right={
              <main className="h-full">
                {editor}
              </main>
            }
          />
        ) : (
          <>
            <main className={`min-h-0 flex-1 ${editorClosing ? 'anim-slide-out-right' : 'anim-slide-in-right'}`}>
              {editor}
            </main>
            <div className="shrink-0 border-t border-line bg-surface p-3 dark:border-dark-line dark:bg-dark-surface">
              <button
                type="button"
                onClick={() => changeViewMode('preview')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong dark:bg-dark-accent dark:text-dark-surface dark:hover:bg-dark-accent-strong"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
            </div>
          </>
        )
      ) : (
        <main key="preview" className={`flex flex-1 flex-col ${prevView.current === 'edit' ? '' : 'anim-fade'}`}>
          <MarkdownPreview content={document.content} readability={assist.readability} />
        </main>
      )}

      {document && !showAbout && (
        <footer className="anim-fade flex min-h-8 shrink-0 pb-[env(safe-area-inset-bottom)] items-center justify-center gap-4 border-t border-line bg-surface text-xs text-ink-muted dark:border-dark-line dark:bg-dark-surface dark:text-dark-ink-muted">
          <span>{countWords(document.content)} words</span>
          <span>{document.content.length} characters</span>
        </footer>
      )}

      <Presence show={!!error} enter="" exit="anim-slide-down" duration={160} className="fixed bottom-4 right-4 z-50">
        {error && (
        <div
          role="alert"
          className="anim-slide-up flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-300"
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
      </Presence>
    </div>
  )
}
