import { useEffect, useId, useRef } from 'react'

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'

/** Mantiene el teclado dentro del diálogo y devuelve el foco al control que lo abrió. */
export function useModalFocus<T extends HTMLElement>(onClose: () => void, initialFocus?: string, phase?: string) {
  const modalRef = useRef<T>(null)
  const closeRef = useRef(onClose)
  const openerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  closeRef.current = onClose

  useEffect(() => {
    const modal = modalRef.current ?? [...document.querySelectorAll<T>('.modal-backdrop .modal')].at(-1)
    if (!modal) return
    if (!openerRef.current && document.activeElement instanceof HTMLElement) openerRef.current = document.activeElement
    const backdrop = modal.closest<HTMLElement>('.modal-backdrop')
    const previousOverflow = document.body.style.overflow
    const inertSiblings: HTMLElement[] = []
    const title = modal.querySelector<HTMLElement>('h2')
    if (!modal.hasAttribute('role')) modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    if (title && !modal.hasAttribute('aria-labelledby') && !modal.hasAttribute('aria-label')) {
      if (!title.id) title.id = titleId
      modal.setAttribute('aria-labelledby', title.id)
    }
    if (!modal.hasAttribute('tabindex')) modal.tabIndex = -1

    const controls = () => [...modal.querySelectorAll<HTMLElement>(focusable)]
      .filter(control => control.getClientRects().length > 0 && getComputedStyle(control).visibility !== 'hidden')
    const first = initialFocus === ':scope' ? modal : initialFocus ? modal.querySelector<HTMLElement>(initialFocus) : null
    ;(first?.getClientRects().length ? first : controls()[0] || modal).focus()

    // El modal puede estar dentro de una vista; solo se vuelven inertes sus hermanos, no sus ancestros.
    let child: HTMLElement | null = backdrop
    while (child?.parentElement) {
      for (const sibling of child.parentElement.children) {
        if (sibling !== child && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true
          inertSiblings.push(sibling)
        }
      }
      child = child.parentElement
    }
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = controls()
      if (!items.length) { event.preventDefault(); modal.focus(); return }
      const active = document.activeElement
      if (event.shiftKey && (active === items[0] || !modal.contains(active))) {
        event.preventDefault(); items.at(-1)?.focus()
      } else if (!event.shiftKey && (active === items.at(-1) || !modal.contains(active))) {
        event.preventDefault(); items[0].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      for (const sibling of inertSiblings) sibling.inert = false
      document.body.style.overflow = previousOverflow
      queueMicrotask(() => {
        if (document.querySelector('.modal-backdrop [role="dialog"]')) return
        if (openerRef.current?.isConnected) openerRef.current.focus()
        else document.querySelector<HTMLElement>('[aria-current="page"]')?.focus()
      })
    }
  }, [initialFocus, phase, titleId])

  return modalRef
}
