import { useEffect, useRef } from 'react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onExit: () => void
}

export function MarkdownEditor({ value, onChange, onExit }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
            e.preventDefault()
            onExit()
          }
        }}
        spellCheck={false}
        placeholder="Write your Markdown here..."
        className="flex-1 resize-none bg-surface px-6 py-8 font-mono text-sm leading-7 text-ink caret-accent outline-none placeholder:text-ink-muted dark:bg-dark-surface dark:text-dark-ink dark:caret-dark-accent dark:placeholder:text-dark-ink-muted"
      />
    </main>
  )
}