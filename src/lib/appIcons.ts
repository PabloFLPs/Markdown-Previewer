/** App icon variants — used for the favicon / tab icon and the header logo. */

export type AppIconId = 'classic' | 'mono' | 'outline' | 'sunset'

const M = 'M9 22V10l7 7 7-7v12'

const ICONS: Record<AppIconId, { label: string; svg: string }> = {
  classic: {
    label: 'Classic',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#2563eb"/><path d="${M}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  mono: {
    label: 'Mono',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0d1117"/><path d="${M}" fill="none" stroke="#e6edf3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  outline: {
    label: 'Outline',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="#fff" stroke="#0d9488" stroke-width="2"/><path d="${M}" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  sunset: {
    label: 'Sunset',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#s)"/><path d="${M}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
}

export const APP_ICON_IDS = Object.keys(ICONS) as AppIconId[]
export const appIconLabel = (id: AppIconId) => ICONS[id].label
export const appIconUrl = (id: AppIconId) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ICONS[id].svg)}`

const KEY = 'markdown-preview:app-icon'

export function loadAppIcon(): AppIconId {
  try {
    const v = localStorage.getItem(KEY) as AppIconId | null
    return v && v in ICONS ? v : 'classic'
  } catch {
    return 'classic'
  }
}

export function saveAppIcon(id: AppIconId): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Ignore.
  }
}

/** Swap the tab/favicon (and apple-touch-icon) and the accent palette at runtime. */
export function applyAppIcon(id: AppIconId): void {
  if (id === 'classic') delete document.documentElement.dataset.accent
  else document.documentElement.dataset.accent = id
  const href = appIconUrl(id)
  for (const rel of ['icon', 'apple-touch-icon']) {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      document.head.appendChild(link)
    }
    link.type = 'image/svg+xml'
    link.href = href
  }
}
