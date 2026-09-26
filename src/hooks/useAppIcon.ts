import { useCallback, useEffect, useState } from 'react'
import { applyAppIcon, loadAppIcon, saveAppIcon, type AppIconId } from '../lib/appIcons'

export function useAppIcon() {
  const [icon, setIconState] = useState<AppIconId>(loadAppIcon)
  useEffect(() => applyAppIcon(icon), [icon])
  const setIcon = useCallback((id: AppIconId) => {
    setIconState(id)
    saveAppIcon(id)
  }, [])
  return { icon, setIcon }
}
