export const ACCEPTED_EXTENSIONS = ['.md', '.markdown']

export function isMarkdownFile(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}"`))
    reader.readAsText(file)
  })
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function openFilePicker(onFile: (file: File) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = ACCEPTED_EXTENSIONS.join(',')
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) onFile(file)
  }
  input.click()
}

export function fallbackFilename(filename: string | null): string {
  return filename && filename.trim() !== '' ? filename : 'document.md'
}