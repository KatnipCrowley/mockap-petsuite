import type { LucideIcon } from 'lucide-react'

export type MetricTone = 'accent' | 'warm' | 'info' | 'success'

/** Indicador de un panel: ícono, cifra y contexto. Lo comparten los inicios de Pyme, ONG, asesor y administración. */
export function Metric({ label, value, trend, icon: Icon, tone = 'accent' }: { label: string; value: string; trend: string; icon?: LucideIcon; tone?: MetricTone }) {
  return <div className={`metric-card tone-${tone}`}>
    {Icon && <span className="metric-icon" aria-hidden="true"><Icon size={20} strokeWidth={2} /></span>}
    <small>{label}</small><strong>{value}</strong><span>{trend}</span>
  </div>
}
