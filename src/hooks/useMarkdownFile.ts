import { useCallback, useState } from 'react'
import { isMarkdownFile, readFileAsText } from '../lib/file'

export type ViewMode = 'preview' | 'edit'

export interface MarkdownDocument {
  filename: string
  content: string
}

export function useMarkdownFile() {
  const [document, setDocument] = useState<MarkdownDocument | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [error, setError] = useState<string | null>(null)

  const openFile = useCallback(async (file: File) => {
    if (!isMarkdownFile(file.name)) {
      setError('Please select a Markdown file (.md).')
      return
    }
    try {
      const content = await readFileAsText(file)
      setDocument({ filename: file.name, content })
      setViewMode('preview')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read the file.')
    }
  }, [])

  const updateContent = useCallback((content: string) => {
    setDocument((prev) => (prev ? { ...prev, content } : prev))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { document, viewMode, setViewMode, openFile, updateContent, error, setError, clearError }
}