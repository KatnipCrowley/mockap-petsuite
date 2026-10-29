import type { CSSProperties, ReactNode } from 'react'
import { iniciales } from './api'
import { assetUrl } from './media'

export type CoverStat = { label: string; value: ReactNode }

/**
 * Encabezado tipo perfil para el Inicio de cada rol: portada, avatar, identidad, insignias, acciones y cifras.
 * Las cifras siempre vienen de datos reales de la cuenta; nunca se rellenan con valores de muestra.
 */
export function ProfileCover({ eyebrow, title, subtitle, avatar, image, badges, actions, stats }: {
  eyebrow?: string; title: string; subtitle?: ReactNode; avatar?: ReactNode; image?: string | null
  badges?: ReactNode; actions?: ReactNode; stats?: CoverStat[]
}) {
  const art = image ? { '--cover-image': `url(${assetUrl(image)})` } as CSSProperties : undefined
  return <header className={`profile-cover${image ? ' has-image' : ''}`}>
    <div className="profile-cover-art" style={art} aria-hidden="true" />
    <div className="profile-cover-main">
      <div className="profile-cover-avatar" aria-hidden="true">{avatar ?? iniciales(title)}</div>
      <div className="profile-cover-id">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="profile-cover-sub">{subtitle}</p>}
        {badges && <div className="profile-cover-badges">{badges}</div>}
      </div>
      {actions && <div className="profile-cover-actions">{actions}</div>}
    </div>
    {!!stats?.length && <dl className="profile-cover-stats">{stats.map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>}
  </header>
}
