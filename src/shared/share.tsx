import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'

/** Enlace absoluto a una vista pública (#adopciones, #ong/<id>, #qr/<token>) que respeta la base de GitHub Pages. */
export const publicUrl = (hash: string) => `${window.location.origin}${import.meta.env.BASE_URL}${hash}`

/** En el teléfono abre el menú para compartir del sistema; en escritorio copia el enlace. */
export function ShareButton({ hash, title, text, label = 'Compartir', className = 'secondary' }: { hash: string; title: string; text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const url = publicUrl(hash)
  const native = typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches
  const share = async () => {
    if (native) {
      try { await navigator.share({ title, text, url }); return } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2500) } catch { window.prompt('Copia este enlace para compartirlo', url) }
  }
  return <><button type="button" className={className} onClick={share}>{copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />} {copied ? 'Enlace copiado' : native ? label : 'Copiar enlace'}</button><span className="sr-only" role="status" aria-live="polite">{copied ? 'Enlace copiado' : ''}</span></>
}
