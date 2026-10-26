import { CircleAlert, LockKeyhole, SearchX } from 'lucide-react'
import { Loading } from './media'

/** Estados compartidos para listas y vistas de todos los roles. */
export function LoadingState({ label = 'Cargando información', rows = 3 }: { label?: string; rows?: number }) {
  return <div className="feedback-state"><Loading rows={rows} label={label} /></div>
}

export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="feedback-state"><SearchX size={28} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>{action && onAction && <button type="button" className="secondary" onClick={onAction}>{action}</button>}</div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="feedback-state feedback-error" role="alert"><CircleAlert size={28} aria-hidden="true" /><h3>No pudimos cargar la información</h3><p>{message}</p><button type="button" className="secondary" onClick={onRetry}>Reintentar</button></div>
}

export function PermissionState({ description = 'Tu cuenta no tiene acceso a esta sección.' }: { description?: string }) {
  return <div className="feedback-state"><LockKeyhole size={28} aria-hidden="true" /><h3>Permiso insuficiente</h3><p>{description}</p></div>
}
