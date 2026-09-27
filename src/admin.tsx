import { useCallback, useEffect, useState } from 'react'
import { Check, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { api, clp, errorText, iniciales } from './api'

type OngPendiente = { id: string; nombre: string; tipo: string; descripcion: string | null; contacto: string | null; comuna: string; estado_verificacion: string; animales: number }
type Resumen = { ong_pendientes?: number; animales_disponibles?: number; usuarios: number; suspendidos: number; pymes_activas: number; pymes_pendientes: number; reportes_abiertos: number; escaneos: number; ingresos_30d: number }
type Usuario = { id: string; correo: string; rol: string; nombre_visible: string; estado: 'activo' | 'suspendido' | 'eliminado' }
type Reporte = { id: string; objeto_tipo: string; objeto_id: string; motivo: string; creado_en: string; reportante: string; contenido: string | null; autor: string | null; autor_id: string | null }
type PymePendiente = { id: string; nombre_comercial: string; rut_empresa: string; rubro: string; comuna: string; estado_verificacion: string; referencia: string | null; monto_clp: number | null }

const rolLabel: Record<string, string> = { tutor: 'Tutor', pyme: 'Pyme', clinico: 'Clínico', admin: 'Administrador', ong: 'ONG' }

function Metric({ label, value, trend }: { label: string; value: string; trend: string }) { return <div className="metric-card"><small>{label}</small><strong>{value}</strong><span>{trend}</span></div> }

export function AdminArea({ active }: { active: string }) {
  if (active === 'users') return <Users />
  if (active === 'moderation') return <Moderation />
  if (active === 'subscriptions') return <Pymes />
  if (active === 'ongs') return <Ongs />
  return <Overview />
}

function Overview() {
  const [r, setR] = useState<Resumen | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<Resumen>('/admin/resumen').then(setR).catch(e => setError(errorText(e))) }, [])
  return <section className="page admin-page"><div className="page-title"><div><p className="eyebrow">CENTRO DE CONTROL</p><h1>Resumen de PetSuite</h1><p className="muted">Datos en vivo de la base de datos de la plataforma.</p></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {r && <><div className="admin-metrics"><Metric label="Usuarios registrados" value={String(r.usuarios)} trend={`${r.suspendidos} suspendidos`} /><Metric label="Pymes verificadas" value={String(r.pymes_activas)} trend={`${r.pymes_pendientes} por verificar`} /><Metric label="Escaneos de QR" value={String(r.escaneos)} trend="Total histórico" /><Metric label="Ingresos (30 días)" value={clp(r.ingresos_30d)} trend="Pagos confirmados" /></div>
      <div className="admin-bottom-grid"><article className="admin-table-card"><div className="chart-heading"><div><p className="eyebrow">PENDIENTES</p><h2>Requiere tu atención</h2></div></div><div className="health-stat warning"><span className="status-dot" /><div><strong>{r.reportes_abiertos} reportes abiertos</strong><small>Meta de resolución: 24 horas</small></div></div><div className="health-stat warning"><span className="status-dot" /><div><strong>{r.pymes_pendientes} Pymes en verificación</strong><small>Revisa el pago por transferencia</small></div></div><div className="health-stat warning"><span className="status-dot" /><div><strong>{r.ong_pendientes ?? 0} ONG en verificación</strong><small>{r.animales_disponibles ?? 0} animales disponibles en el catálogo</small></div></div></article></div></>}
  </section>
}

function Users() {
  const [users, setUsers] = useState<Usuario[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'Todos' | 'Activos' | 'Suspendidos'>('Todos')
  const [error, setError] = useState('')
  const load = useCallback(() => api<Usuario[]>(`/admin/usuarios${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`).then(u => { setUsers(u); setError('') }).catch(e => setError(errorText(e))), [query])
  useEffect(() => { const t = setTimeout(() => { void load() }, 250); return () => clearTimeout(t) }, [load])
  const set = async (u: Usuario, estado: 'activo' | 'suspendido') => { try { await api(`/admin/usuarios/${u.id}`, { method: 'PATCH', body: { estado } }); await load() } catch (e) { setError(errorText(e)) } }
  const shown = (users || []).filter(u => filter === 'Todos' || (filter === 'Activos' ? u.estado === 'activo' : u.estado === 'suspendido'))
  return <section className="page admin-page"><div className="page-title"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Gestión de usuarios</h1><p className="muted">Busca, filtra y administra las cuentas de PetSuite.</p></div><span className="admin-total">{users?.length ?? 0} cuentas</span></div>
    <div className="user-toolbar"><div className="search-field"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre o correo" /></div></div>
    <div className="user-filters">{(['Todos', 'Activos', 'Suspendidos'] as const).map(v => <button key={v} className={filter === v ? 'category-tab active' : 'category-tab'} onClick={() => setFilter(v)}>{v}</button>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="admin-table-card user-table polished-user-table"><div className="user-table-head"><span>USUARIO</span><span>ROL</span><span>ESTADO</span><span>ACCIÓN</span></div>
      {shown.map(u => <div className="user-row" key={u.id}><div className="avatar">{iniciales(u.nombre_visible || u.correo)}</div><div className="user-identity"><strong>{u.nombre_visible}</strong><small>{u.correo}</small></div><span className="user-role">{rolLabel[u.rol] || u.rol}</span><span className={`user-status ${u.estado}`}>{u.estado === 'activo' ? 'Activo' : 'Suspendido'}</span>{u.rol === 'admin' ? <span /> : <button className={u.estado === 'activo' ? 'secondary' : 'primary'} onClick={() => set(u, u.estado === 'activo' ? 'suspendido' : 'activo')}>{u.estado === 'activo' ? 'Suspender' : 'Reactivar'}</button>}</div>)}
      {users && shown.length === 0 && <div className="empty-results">No encontramos usuarios con estos filtros.</div>}</div></section>
}

// UC-20 · Cola de reportes, más antiguos primero. Ocultar o mantener; reincidencia → suspender al autor (UC-21).
function Moderation() {
  const [reports, setReports] = useState<Reporte[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(() => api<Reporte[]>('/admin/reportes').then(setReports).catch(e => setError(errorText(e))), [])
  useEffect(() => { void load() }, [load])
  const decide = async (r: Reporte, decision: 'ocultar' | 'mantener') => { try { await api(`/admin/reportes/${r.id}`, { method: 'PATCH', body: { decision } }); await load() } catch (e) { setError(errorText(e)) } }
  const suspend = async (r: Reporte) => {
    if (!r.autor_id || !window.confirm(`¿Suspender la cuenta de ${r.autor}? Perderá el acceso hasta que la reactives.`)) return
    try { await api(`/admin/usuarios/${r.autor_id}`, { method: 'PATCH', body: { estado: 'suspendido' } }); await decide(r, 'ocultar') } catch (e) { setError(errorText(e)) }
  }
  const shown = (reports || []).filter(r => `${r.autor} ${r.contenido} ${r.motivo}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
  const n = reports?.length ?? 0
  return <section className="page admin-page moderation-page"><div className="page-title"><div><p className="eyebrow">MODERACIÓN DEL MURO</p><h1>Reportes de contenido</h1><p className="muted">Revisa cada reporte contra las normas de la comunidad y decide.</p></div><span className="moderation-title-count">{n} {n === 1 ? 'pendiente' : 'pendientes'}</span></div>
    <section className="moderation-panel" aria-label="Cola de reportes"><div className="moderation-panel-header"><div><p className="eyebrow">CASOS ABIERTOS</p><h2>Cola de revisión</h2><p className="muted">{n ? 'Ordenados del más antiguo al más reciente.' : 'Todos los reportes han sido revisados.'}</p></div><label className="moderation-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar reporte</span><input type="search" placeholder="Buscar autor o contenido" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {shown.length ? <div className="moderation-list">{shown.map(r => <article className="moderation-row" key={r.id}><div className="moderation-identity"><div className="avatar moderation-avatar">{iniciales(r.autor || '??')}</div><div><h3>{r.autor || 'Autor desconocido'}</h3><p>“{r.contenido || 'Contenido no disponible'}”</p><p><small>Motivo: {r.motivo} · Reportó {r.reportante} · {new Date(r.creado_en).toLocaleString('es-CL')}</small></p></div></div><div className="moderation-actions"><button type="button" className="secondary" onClick={() => decide(r, 'mantener')}><Check size={16} /> Mantener</button><button type="button" className="secondary" onClick={() => decide(r, 'ocultar')}><ShieldAlert size={16} /> Ocultar</button><button type="button" className="primary" onClick={() => suspend(r)}><ShieldAlert size={16} /> Ocultar y suspender</button></div></article>)}</div> : <div className="moderation-empty"><ShieldCheck size={30} strokeWidth={1.5} /><h3>{query ? 'Sin resultados' : 'Todo al día'}</h3><p>{query ? 'Prueba con otra búsqueda.' : 'No hay reportes por revisar.'}</p></div>}
    </section></section>
}

// UC-19 · Verificación de Pymes y pago por transferencia (SP3.2).
function Pymes() {
  const [state, setState] = useState<'pendiente' | 'aprobada' | 'rechazada' | 'suspendida'>('pendiente')
  const [rows, setRows] = useState<PymePendiente[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<PymePendiente[]>(`/admin/pymes?estado=${state}`).then(setRows).catch(e => setError(errorText(e))), [state])
  useEffect(() => { void load() }, [load])
  const decide = async (p: PymePendiente, decision: 'aprobar' | 'rechazar' | 'suspender') => { try { await api(`/admin/pymes/${p.id}/verificacion`, { method: 'PATCH', body: { decision } }); await load() } catch (e) { setError(errorText(e)) } }
  return <section className="page admin-page"><div className="page-title"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Pymes y suscripciones</h1><p className="muted">Verifica el negocio y el pago por transferencia antes de publicar su perfil.</p></div></div>
    <div className="user-filters">{(['pendiente', 'aprobada', 'rechazada', 'suspendida'] as const).map(v => <button key={v} className={state === v ? 'category-tab active' : 'category-tab'} onClick={() => setState(v)}>{v[0].toUpperCase() + v.slice(1)}s</button>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="admin-table-card user-table">{rows?.map(p => <div className="user-row" key={p.id}><div className="avatar">{iniciales(p.nombre_comercial)}</div><div className="user-identity"><strong>{p.nombre_comercial}</strong><small>{p.rut_empresa} · {p.rubro} · {p.comuna}</small><small>Pago: {clp(p.monto_clp)}{p.referencia ? ` · ref. ${p.referencia}` : ' · sin referencia'}</small></div><span className={`user-status ${p.estado_verificacion === 'aprobada' ? 'activo' : 'suspendido'}`}>{p.estado_verificacion}</span>
      <div>{p.estado_verificacion !== 'aprobada' && <button className="primary" onClick={() => decide(p, 'aprobar')}>Aprobar y activar</button>}{p.estado_verificacion === 'pendiente' && <button className="secondary" onClick={() => decide(p, 'rechazar')}>Rechazar</button>}{p.estado_verificacion === 'aprobada' && <button className="secondary" onClick={() => decide(p, 'suspender')}>Suspender</button>}</div></div>)}
      {rows && rows.length === 0 && <div className="empty-results">No hay Pymes en este estado.</div>}</div></section>
}

// UC-28 · Verificar ONG. Hasta entonces sus animales quedan como borrador y no salen en el catálogo público.
function Ongs() {
  const [state, setState] = useState<'pendiente' | 'aprobada' | 'rechazada'>('pendiente')
  const [rows, setRows] = useState<OngPendiente[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<OngPendiente[]>(`/admin/ong?estado=${state}`).then(setRows).catch(e => setError(errorText(e))), [state])
  useEffect(() => { void load() }, [load])
  const decide = async (o: OngPendiente, decision: 'aprobar' | 'rechazar') => { try { await api(`/admin/ong/${o.id}/verificacion`, { method: 'PATCH', body: { decision } }); await load() } catch (e) { setError(errorText(e)) } }
  return <section className="page admin-page"><div className="page-title"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Verificación de ONG</h1><p className="muted">Revisa las organizaciones de rescate y adopción antes de publicar sus animales en el catálogo.</p></div></div>
    <div className="user-filters">{(['pendiente', 'aprobada', 'rechazada'] as const).map(v => <button key={v} className={state === v ? 'category-tab active' : 'category-tab'} onClick={() => setState(v)}>{v[0].toUpperCase() + v.slice(1)}s</button>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="admin-table-card user-table">{rows?.map(o => <div className="user-row" key={o.id}><div className="avatar">{iniciales(o.nombre)}</div><div className="user-identity"><strong>{o.nombre}</strong><small>{o.tipo.replace('_', ' ')} · {o.comuna}{o.contacto ? ` · ${o.contacto}` : ''}</small><small>{o.animales} {o.animales === 1 ? 'animal cargado' : 'animales cargados'}</small></div><span className={`user-status ${o.estado_verificacion === 'aprobada' ? 'activo' : 'suspendido'}`}>{o.estado_verificacion}</span>
      <div>{o.estado_verificacion !== 'aprobada' && <button className="primary" onClick={() => decide(o, 'aprobar')}>Aprobar</button>}{o.estado_verificacion === 'pendiente' && <button className="secondary" onClick={() => decide(o, 'rechazar')}>Rechazar</button>}</div></div>)}
      {rows && rows.length === 0 && <div className="empty-results">No hay organizaciones en este estado.</div>}</div></section>
}
