import { useCallback, useEffect, useState } from 'react'
import { applyAppIcon, loadAppIcon, saveAppIcon, type AppIconId, type IconTheme } from '../lib/appIcons'

export function useAppIcon(theme: IconTheme) {
  const [icon, setIconState] = useState<AppIconId>(loadAppIcon)
  useEffect(() => applyAppIcon(icon, theme), [icon, theme])
  const setIcon = useCallback((id: AppIconId) => {
    setIconState(id)
    saveAppIcon(id)
  }, [])
  return { icon, setIcon }
}
