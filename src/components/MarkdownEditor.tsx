import { useEffect, useRef } from 'react'
import { useI18n } from '../hooks/useI18n'
import type { ClipboardEventHandler, KeyboardEventHandler, ReactEventHandler, ReactNode, RefObject } from 'react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>
  onPaste?: ClipboardEventHandler<HTMLTextAreaElement>
  onSelect?: ReactEventHandler<HTMLTextAreaElement>
  /** Overlay UI rendered over the editor (e.g. Smart Assist suggestion bar). */
  children?: ReactNode
}

export function MarkdownEditor({
  value,
  onChange,
  textareaRef,
  onKeyDown,
  onPaste,
  onSelect,
  children,
}: MarkdownEditorProps) {
  const { t } = useI18n()
  const localRef = useRef<HTMLTextAreaElement>(null)
  const ref = textareaRef ?? localRef

  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [ref])

  return (
    <div className="relative h-full w-full">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onSelect={onSelect}
        spellCheck={false}
        placeholder={t('editor.placeholder')}
        className="h-full w-full resize-none bg-surface px-4 py-6 sm:px-6 sm:py-8 font-mono text-sm leading-7 text-ink caret-accent outline-none placeholder:text-ink-muted dark:bg-dark-surface dark:text-dark-ink dark:caret-dark-accent dark:placeholder:text-dark-ink-muted"
      />
      {children}
    </div>
  )
}
