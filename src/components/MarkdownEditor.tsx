import { useEffect, useRef } from 'react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      placeholder="Write your Markdown here..."
      className="h-full w-full resize-none bg-surface px-6 py-8 font-mono text-sm leading-7 text-ink caret-accent outline-none placeholder:text-ink-muted dark:bg-dark-surface dark:text-dark-ink dark:caret-dark-accent dark:placeholder:text-dark-ink-muted"
    />
  )
}
