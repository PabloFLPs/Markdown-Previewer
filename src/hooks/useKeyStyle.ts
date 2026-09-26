import { useCallback, useState } from 'react'
import { loadKeyStyle, saveKeyStyle, type KeyStyle } from '../lib/keyStyle'

export function useKeyStyle() {
  const [keyStyle, setState] = useState<KeyStyle>(loadKeyStyle)
  const setKeyStyle = useCallback((s: KeyStyle) => {
    setState(s)
    saveKeyStyle(s)
  }, [])
  return { keyStyle, setKeyStyle }
}
