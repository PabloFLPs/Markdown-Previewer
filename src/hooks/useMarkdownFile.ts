import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMarkdownFile, readFileAsText } from '../lib/file'
import { loadDocument, saveDocument } from '../lib/storage'

export interface MarkdownDocument {
  filename: string | null
  content: string
  savedContent: string
}

const PERSIST_DELAY = 300

function getInitialDocument(): MarkdownDocument | null {
  const stored = loadDocument()
  return stored ? { ...stored } : null
}

export function useMarkdownFile() {
  const [document, setDocument] = useState<MarkdownDocument | null>(getInitialDocument)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!document) return
    const timer = window.setTimeout(() => saveDocument(document), PERSIST_DELAY)
    return () => window.clearTimeout(timer)
  }, [document])

  const isDirty = useMemo(
    () => (document ? document.content !== document.savedContent : false),
    [document],
  )

  const openFile = useCallback(async (file: File): Promise<boolean> => {
    if (!isMarkdownFile(file.name)) {
      setError('Please select a Markdown file (.md).')
      return false
    }
    try {
      const content = await readFileAsText(file)
      setDocument({ filename: file.name, content, savedContent: content })
      setError(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read the file.')
      return false
    }
  }, [])

  const pasteText = useCallback((text: string) => {
    setDocument({ filename: null, content: text, savedContent: '' })
    setError(null)
  }, [])

  const newDocument = useCallback(() => {
    setDocument({ filename: null, content: '', savedContent: '' })
    setError(null)
  }, [])

  const updateContent = useCallback((content: string) => {
    setDocument((prev) => (prev ? { ...prev, content } : prev))
  }, [])

  const markSaved = useCallback(() => {
    setDocument((prev) =>
      prev && prev.content !== prev.savedContent ? { ...prev, savedContent: prev.content } : prev,
    )
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { document, isDirty, openFile, pasteText, newDocument, updateContent, markSaved, error, clearError, setError }
}
