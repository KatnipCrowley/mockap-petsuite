import { useCallback, useEffect, useState } from 'react'
import { CirclePlus, Heart, MessageCircle, Users, X } from 'lucide-react'
import { api, errorText, getSession, iniciales, type Comuna, type Mascota } from './api'
import { Loading } from './media'
import { communityCommentSchema, moderationMessageSchema, wallPostSchema } from './validators'

type Tipo = 'extravio' | 'encuentro' | 'recomendacion' | 'alerta' | 'evento' | 'adopcion'
type Comentario = { id: string; autor: string; texto: string; es_mio: boolean; editado: boolean }
type Post = {
  id: string; tipo: Tipo; texto: string; creado_en: string; editado: boolean; autor: string; es_mio: boolean; comuna_id: number
  sector: string | null; foto_url: string | null; fecha_evento: string | null; resuelto: boolean; urgente: boolean; mascota: string | null
  animal: { id: string; nombre: string; ong: string } | null
  reacciones: number; reaccione: boolean; guardado: boolean; comentarios: Comentario[]
}
type Reportable = { tipo: 'publicacion' | 'comentario'; id: string; autor: string }
type Filtro = 'Todos' | Tipo | 'Guardadas'

const tipoLabel: Record<Tipo, string> = { extravio: 'Extravío', encuentro: 'Encuentro', recomendacion: 'Recomendación', alerta: 'Alerta de salud', evento: 'Evento o campaña', adopcion: 'Adopción' }
const tipoClass: Record<Tipo, string> = { extravio: 'lost', encuentro: 'found', recomendacion: 'recommendation', alerta: 'alert', evento: 'event', adopcion: 'adoption' }
const tiposTutor: Tipo[] = ['recomendacion', 'extravio', 'encuentro', 'alerta', 'evento']
const ayuda: Partial<Record<Tipo, string>> = {
  extravio: 'Indica un sector o una referencia, nunca tu dirección exacta. Si eliges tu mascota, se agrega su foto.',
  encuentro: 'Describe al animal y dónde lo viste. No publiques datos de contacto: los vecinos te escriben por comentarios.',
  alerta: 'Describe el riesgo (cebos, animales agresivos, brotes) y el sector para que otros tutores tomen precauciones.',
  evento: 'Operativos de vacunación, esterilización o ferias de adopción. Indica la fecha y el lugar.',
}

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  if (min < 1440) return `Hace ${Math.round(min / 60)} h`
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

// RF-07 / RF-08 · Muro segmentado por comuna, con reacciones, comentarios, reportes y publicaciones guardadas.
export function CommunityView({ onAdoption }: { onAdoption?: () => void }) {
  const session = getSession()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [comuna, setComuna] = useState<number>(session?.comunaId || 1)
  const [filter, setFilter] = useState<Filtro>('Todos')
  const [query, setQuery] = useState('')
  const [orden, setOrden] = useState<'recientes' | 'apoyadas'>('recientes')
  const [composer, setComposer] = useState<Post | 'new' | null>(null)
  const [reporting, setReporting] = useState<Reportable | null>(null)
  const [commenting, setCommenting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const guardadas = filter === 'Guardadas'
  const load = useCallback(async () => {
    try { setPosts(await api<Post[]>(guardadas ? '/muro?guardadas=1' : `/muro?comuna=${comuna}`)); setError('') } catch (e) { setError(errorText(e)) }
  }, [comuna, guardadas])
  useEffect(() => { void load() }, [load])
  useEffect(() => { api<Comuna[]>('/comunas').then(setComunas).catch(() => undefined) }, [])

  const act = async (fn: () => Promise<unknown>) => { try { await fn(); await load() } catch (e) { setError(errorText(e)) } }
  const q = query.trim().toLocaleLowerCase('es')
  // Lo urgente (extravíos activos y alertas recientes) va primero al ordenar por fecha.
  const visible = (posts || [])
    .filter(p => (filter === 'Todos' || guardadas || p.tipo === filter) && (!q || `${p.texto} ${p.autor} ${p.sector || ''} ${p.mascota || ''} ${p.animal?.nombre || ''}`.toLocaleLowerCase('es').includes(q)))
    .sort((a, b) => orden === 'apoyadas' ? b.reacciones - a.reacciones || b.creado_en.localeCompare(a.creado_en) : Number(b.urgente) - Number(a.urgente) || b.creado_en.localeCompare(a.creado_en))
  const own = comuna === session?.comunaId
  const comunaName = comunas.find(c => c.id === comuna)?.nombre || ''
  const remove = (p: Post) => { if (window.confirm('¿Eliminar esta publicación? No se puede deshacer.')) void act(() => api(`/muro/${p.id}`, { method: 'DELETE' })) }

  return <section className="page community-page"><div className="page-title"><div><p className="eyebrow">COMUNIDAD PETSUITE · {guardadas ? 'GUARDADAS' : comunaName.toUpperCase()}</p><h1>Muro comunal</h1><p className="muted">Comparte, encuentra y ayuda a otros tutores de tu comuna.</p></div><button className="primary" onClick={() => setComposer('new')}><CirclePlus size={17} /> Publicar</button></div>
    <div className="community-intro"><div className="intro-icon"><Users size={20} /></div><div><strong>Una comunidad que se cuida</strong><p>Las publicaciones aparecen solo en el muro de la comuna de su autor. No se permiten enlaces externos.</p></div>{comunas.length > 0 && <select aria-label="Ver muro de otra comuna" value={comuna} disabled={guardadas} onChange={e => setComuna(Number(e.target.value))}>{comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.id === session?.comunaId ? ' (tu comuna)' : ''}</option>)}</select>}</div>
    <div className="list-toolbar"><label className="search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar en el muro</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca por texto, sector, autor o mascota" /></label><select aria-label="Ordenar publicaciones" value={orden} onChange={e => setOrden(e.target.value as 'recientes' | 'apoyadas')}><option value="recientes">Más recientes (urgentes primero)</option><option value="apoyadas">Más apoyadas</option></select></div>
    <div className="community-filters">{(['Todos', 'extravio', 'encuentro', 'alerta', 'evento', 'adopcion', 'recomendacion', 'Guardadas'] as const).map(v => <button key={v} className={filter === v ? 'category-tab active' : 'category-tab'} onClick={() => setFilter(v)}>{v === 'Todos' || v === 'Guardadas' ? v : tipoLabel[v]}</button>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="community-feed">{!posts && !error && <Loading />}
      {visible.map(post => <PostCard key={post.id} post={post} showComment={commenting === post.id} comunaAjena={guardadas && post.comuna_id !== session?.comunaId ? comunas.find(c => c.id === post.comuna_id)?.nombre : undefined}
        onReact={() => act(() => api(`/muro/${post.id}/reacciones`, { method: 'POST' }))}
        onSave={() => act(() => api(`/muro/${post.id}/guardar`, { method: 'POST' }))}
        onComment={() => setCommenting(commenting === post.id ? null : post.id)}
        onReport={target => setReporting(target)}
        onEdit={() => setComposer(post)} onDelete={() => remove(post)}
        onResolve={() => act(() => api(`/muro/${post.id}/resuelto`, { method: 'PATCH', body: { resuelto: !post.resuelto } }))}
        onAdoption={onAdoption}
        onAddComment={text => act(() => api(`/muro/${post.id}/comentarios`, { method: 'POST', body: { texto: text } }))}
        onEditComment={(c, text) => act(() => api(`/muro/comentarios/${c.id}`, { method: 'PATCH', body: { texto: text } }))}
        onDeleteComment={c => { if (window.confirm('¿Eliminar tu comentario?')) void act(() => api(`/muro/comentarios/${c.id}`, { method: 'DELETE' })) }} />)}
      {posts && visible.length === 0 && <div className="empty-results">{guardadas ? 'Aún no guardas publicaciones. Usa «Guardar» para volver a ellas después.' : q ? 'Ninguna publicación coincide con tu búsqueda.' : `Todavía no hay publicaciones de este tipo en ${comunaName || 'esta comuna'}.`}</div>}</div>
    {composer && <Composer post={composer === 'new' ? null : composer} onClose={() => setComposer(null)} onSaved={async () => { const nuevo = composer === 'new'; setComposer(null); if (nuevo && guardadas) setFilter('Todos'); if (nuevo && !own && session?.comunaId) setComuna(session.comunaId); else await load() }} />}
    {reporting && <ReportModal target={reporting} onClose={() => setReporting(null)} onSaved={() => setReporting(null)} />}
  </section>
}

type CardProps = {
  post: Post; showComment: boolean; comunaAjena?: string
  onReact: () => void; onSave: () => void; onComment: () => void; onReport: (t: Reportable) => void; onEdit: () => void; onDelete: () => void; onResolve: () => void; onAdoption?: () => void
  onAddComment: (text: string) => Promise<void> | void; onEditComment: (c: Comentario, text: string) => Promise<void> | void; onDeleteComment: (c: Comentario) => void
}

function PostCard({ post, showComment, comunaAjena, onReact, onSave, onComment, onReport, onEdit, onDelete, onResolve, onAdoption, onAddComment, onEditComment, onDeleteComment }: CardProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const parsed = communityCommentSchema.safeParse({ text }); if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa el comentario'); return }; await onAddComment(parsed.data.text); setText(''); setError('') }
  return <article className="community-post"><div className="post-top"><div className="post-avatar">{iniciales(post.autor)}</div><div><strong>{post.autor}</strong><small>{ago(post.creado_en)}</small></div></div><span className={`post-type ${tipoClass[post.tipo]}`}>{tipoLabel[post.tipo].toUpperCase()}</span><p>{post.texto}</p>
    <div className="post-actions"><button className={post.reaccione ? 'reacted' : ''} onClick={onReact}><Heart size={16} fill={post.reaccione ? 'currentColor' : 'none'} /> {post.reacciones}</button><button onClick={onComment}><MessageCircle size={16} /> {post.comentarios.length} comentarios</button><button onClick={onReport}>Reportar</button></div>
    {post.comentarios.length > 0 && <div className="comments">{post.comentarios.map(c => <div className="comment" key={c.id}><strong>{c.autor}</strong><span>{c.texto}</span></div>)}</div>}
    {showComment && <form className="comment-form" onSubmit={submit}><input aria-label="Comentario" maxLength={1000} value={text} onChange={e => { setText(e.target.value); setError('') }} placeholder="Escribe un comentario..." /><button className="primary">Enviar</button>{error && <p className="form-error" role="alert">{error}</p>}</form>}
  </article>
}

function Composer({ post, onClose, onSaved }: { post: Post | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ tipo: post?.tipo || 'recomendacion' as Tipo, texto: post?.texto || '', mascota_id: '', sector: post?.sector || '', fecha_evento: post?.fecha_evento || '' })
  const [pets, setPets] = useState<Mascota[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!post) api<Mascota[]>('/mascotas').then(setPets).catch(() => undefined) }, [post])
  const conSector = form.tipo !== 'recomendacion' && form.tipo !== 'adopcion'
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = wallPostSchema.safeParse(form)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa la publicación'); return }
    setBusy(true)
    try { await api('/muro', { method: 'POST', body: { tipo: parsed.data.tipo, texto: parsed.data.texto, ...(form.mascota_id && parsed.data.tipo === 'extravio' ? { mascota_id: form.mascota_id } : {}) } }); await onSaved() } catch (e) { setError(errorText(e)); setBusy(false) }
  }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">{post ? 'EDITAR PUBLICACIÓN' : 'NUEVA PUBLICACIÓN'}</p><h2>{post ? 'Corrige tu publicación' : 'Comparte con tu comunidad'}</h2><p className="muted">{ayuda[form.tipo] || 'Se publicará en el muro de tu comuna. No se permiten enlaces externos.'}</p>
    <div className="form-grid"><label>Tipo<select value={form.tipo} disabled={!!post} onChange={e => setForm({ ...form, tipo: e.target.value as Tipo })}>{(post ? [post.tipo] : tiposTutor).map(t => <option key={t} value={t}>{tipoLabel[t]}</option>)}</select></label>
      {!post && form.tipo === 'extravio' && pets.length > 0 && <label>Mascota extraviada<select value={form.mascota_id} onChange={e => setForm({ ...form, mascota_id: e.target.value })}><option value="">Ninguna en particular</option>{pets.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>}
      {conSector && <label>Sector o referencia<input maxLength={80} value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} placeholder="Ej. Plaza de Armas, sin dirección exacta" /></label>}
      {form.tipo === 'evento' && <label>Fecha del evento<input type="date" min={hoy()} value={form.fecha_evento} onChange={e => setForm({ ...form, fecha_evento: e.target.value })} /></label>}</div>
    <label className="composer-label">Descripción<textarea rows={5} maxLength={1000} value={form.texto} onChange={e => { setForm({ ...form, texto: e.target.value }); setError('') }} /></label>
    {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando...' : post ? 'Guardar cambios' : 'Publicar'}</button></div></form></div>
}

function ReportModal({ target, onClose, onSaved }: { target: Reportable; onClose: () => void; onSaved: () => void }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const que = target.tipo === 'comentario' ? 'el comentario' : 'la publicación'
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = moderationMessageSchema.safeParse(message)
    if (!result.success) { setError(result.error.issues[0]?.message || 'Explica el reporte'); return }
    try { await api('/reportes', { method: 'POST', body: { objeto_tipo: target.tipo, objeto_id: target.id, motivo: result.data.slice(0, 200) } }); setDone(true) } catch (e) { setError(errorText(e)) }
  }
  if (done) return <div className="modal-backdrop"><div className="modal report-post-modal"><p className="eyebrow">REPORTE ENVIADO</p><h2>Gracias por avisar</h2><p className="muted">El equipo de moderación revisará {que} en un plazo objetivo de 24 horas.</p><div className="modal-actions"><button className="primary" onClick={onSaved}>Listo</button></div></div></div>
  return <div className="modal-backdrop"><form className="modal report-post-modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar reporte" onClick={onClose}><X size={20} /></button><p className="eyebrow">REPORTAR {target.tipo === 'comentario' ? 'COMENTARIO' : 'PUBLICACIÓN'}</p><h2>Cuéntanos qué pasó</h2><p className="muted">Tu mensaje ayudará al equipo de moderación a revisar {que} de {target.autor}.</p><label htmlFor="report-post-reason">Motivo del reporte<textarea id="report-post-reason" rows={5} maxLength={200} value={message} onChange={e => { setMessage(e.target.value); setError('') }} placeholder="Describe lo sucedido..." /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" type="submit">Enviar reporte</button></div></form></div>
}
