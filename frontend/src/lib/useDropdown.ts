import { useEffect, useId, useMemo, useRef, useState } from 'react'

type UseDropdownOptions = {
  closeOnRouteChange?: boolean
}

export function useDropdown(options: UseDropdownOptions = {}) {
  const { closeOnRouteChange = false } = options

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const menuId = useId()

  const api = useMemo(() => {
    return {
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      close: () => setOpen(false),
      rootRef,
      buttonRef,
      menuRef,
      buttonProps: {
        ref: buttonRef,
        'aria-haspopup': 'menu' as const,
        'aria-expanded': open,
        'aria-controls': menuId,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'ArrowDown') setOpen(true)
        },
      },
      menuProps: {
        ref: menuRef,
        id: menuId,
        role: 'menu' as const,
        'aria-hidden': !open,
      },
      closeOnRouteChange,
    }
  }, [open, menuId, closeOnRouteChange])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      const target = e.target as Node | null
      if (!target) return
      if (root.contains(target)) return
      setOpen(false)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    // Move focus to menu for keyboard users.
    // (Buttons inside are focusable; this just gets you into the dropdown.)
    menuRef.current?.focus?.()
  }, [open])

  return api
}

