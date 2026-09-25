import { useEffect } from 'react'
import type { EditorTool } from './editorModel'

export function useTransientPanels(tool: EditorTool, navigation: boolean,
  setTool: (tool: EditorTool) => void, setNavigation: (open: boolean) => void) {
  useEffect(() => {
    if (!tool && !navigation) return
    const close = () => { setTool(null); setNavigation(false) }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        document.querySelector<HTMLElement>('.is-focused .tool-rail-button[aria-expanded="true"], .is-focused .workspace-menu-button')?.focus()
      }
    }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(
        '.editor-tool-drawer, .editor-tool-rail, .agenda-navigation-drawer, .workspace-menu-button',
      )) close()
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('pointerdown', outside)
    }
  }, [tool, navigation, setTool, setNavigation])
}
