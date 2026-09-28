import { useCallback, useEffect, useState } from 'react'
import { CirclePlus, Heart, MessageCircle, Users, X } from 'lucide-react'
import { api, errorText, getSession, iniciales, type Comuna, type Mascota } from './api'
import { Loading } from './media'
import { communityCommentSchema, moderationMessageSchema, wallPostSchema } from './validators'

type Tipo = 'extravio' | 'encuentro' | 'recomendacion'
type Post = { id: string; tipo: Tipo; texto: string; creado_en: string; autor: string; reacciones: number; reaccione: boolean; comentarios: { id: string; autor: string; texto: string }[] }

const tipoLabel: Record<Tipo, string> = { extravio: 'Extravío', encuentro: 'Encuentro', recomendacion: 'Recomendación' }
const tipoClass: Record<Tipo, string> = { extravio: 'lost', encuentro: 'found', recomendacion: 'recommendation' }

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  if (min < 1440) return `Hace ${Math.round(min / 60)} h`
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

// RF-07 / RF-08 · Muro segmentado por comuna, con reacciones, comentarios y reportes.
export function CommunityView() {
  const session = getSession()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [comuna, setComuna] = useState<number>(session?.comunaId || 1)
  const [filter, setFilter] = useState<'Todos' | Tipo>('Todos')
  const [composer, setComposer] = useState(false)
  const [reporting, setReporting] = useState<Post | null>(null)
  const [commenting, setCommenting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setPosts(await api<Post[]>(`/muro?comuna=${comuna}`)); setError('') } catch (e) { setError(errorText(e)) }
  }, [comuna])
  useEffect(() => { void load() }, [load])
  useEffect(() => { api<Comuna[]>('/comunas').then(setComunas).catch(() => undefined) }, [])

  const act = async (fn: () => Promise<unknown>) => { try { await fn(); await load() } catch (e) { setError(errorText(e)) } }
  const visible = (posts || []).filter(p => filter === 'Todos' || p.tipo === filter)
  const own = comuna === session?.comunaId
  const comunaName = comunas.find(c => c.id === comuna)?.nombre || ''

  return <section className="page community-page"><div className="page-title"><div><p className="eyebrow">COMUNIDAD PETSUITE · {comunaName.toUpperCase()}</p><h1>Muro comunal</h1><p className="muted">Comparte, encuentra y ayuda a otros tutores de tu comuna.</p></div><button className="primary" onClick={() => setComposer(true)}><CirclePlus size={17} /> Publicar</button></div>
    <div className="community-intro"><div className="intro-icon"><Users size={20} /></div><div><strong>Una comunidad que se cuida</strong><p>Las publicaciones aparecen solo en el muro de la comuna de su autor.</p></div>{comunas.length > 0 && <select aria-label="Ver muro de otra comuna" value={comuna} onChange={e => setComuna(Number(e.target.value))}>{comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.id === session?.comunaId ? ' (tu comuna)' : ''}</option>)}</select>}</div>
    <div className="community-filters">{(['Todos', 'extravio', 'encuentro', 'recomendacion'] as const).map(v => <button key={v} className={filter === v ? 'category-tab active' : 'category-tab'} onClick={() => setFilter(v)}>{v === 'Todos' ? 'Todos' : tipoLabel[v]}</button>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="community-feed">{!posts && !error && <Loading />}
      {visible.map(post => <PostCard key={post.id} post={post} showComment={commenting === post.id}
        onReact={() => act(() => api(`/muro/${post.id}/reacciones`, { method: 'POST' }))}
        onComment={() => setCommenting(commenting === post.id ? null : post.id)} onReport={() => setReporting(post)}
        onAddComment={text => act(() => api(`/muro/${post.id}/comentarios`, { method: 'POST', body: { texto: text } }))} />)}
      {posts && visible.length === 0 && <div className="empty-results">Todavía no hay publicaciones de este tipo en {comunaName || 'esta comuna'}.</div>}</div>
    {composer && <Composer onClose={() => setComposer(false)} onSaved={async () => { setComposer(false); if (!own && session?.comunaId) setComuna(session.comunaId); else await load() }} />}
    {reporting && <ReportModal post={reporting} onClose={() => setReporting(null)} onSaved={() => setReporting(null)} />}
  </section>
}

function PostCard({ post, onReact, onComment, onReport, showComment, onAddComment }: { post: Post; onReact: () => void; onComment: () => void; onReport: () => void; showComment: boolean; onAddComment: (text: string) => Promise<void> | void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const parsed = communityCommentSchema.safeParse({ text }); if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa el comentario'); return }; await onAddComment(parsed.data.text); setText(''); setError('') }
  return <article className="community-post"><div className="post-top"><div className="post-avatar">{iniciales(post.autor)}</div><div><strong>{post.autor}</strong><small>{ago(post.creado_en)}</small></div></div><span className={`post-type ${tipoClass[post.tipo]}`}>{tipoLabel[post.tipo].toUpperCase()}</span><p>{post.texto}</p>
    <div className="post-actions"><button className={post.reaccione ? 'reacted' : ''} onClick={onReact}><Heart size={16} fill={post.reaccione ? 'currentColor' : 'none'} /> {post.reacciones}</button><button onClick={onComment}><MessageCircle size={16} /> {post.comentarios.length} comentarios</button><button onClick={onReport}>Reportar</button></div>
    {post.comentarios.length > 0 && <div className="comments">{post.comentarios.map(c => <div className="comment" key={c.id}><strong>{c.autor}</strong><span>{c.texto}</span></div>)}</div>}
    {showComment && <form className="comment-form" onSubmit={submit}><input aria-label="Comentario" maxLength={1000} value={text} onChange={e => { setText(e.target.value); setError('') }} placeholder="Escribe un comentario..." /><button className="primary">Enviar</button>{error && <p className="form-error" role="alert">{error}</p>}</form>}
  </article>
}

function Composer({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ tipo: 'recomendacion' as Tipo, texto: '', mascota_id: '' })
  const [pets, setPets] = useState<Mascota[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { api<Mascota[]>('/mascotas').then(setPets).catch(() => undefined) }, [])
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = wallPostSchema.safeParse(form)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa la publicación'); return }
    setBusy(true)
    try { await api('/muro', { method: 'POST', body: { tipo: parsed.data.tipo, texto: parsed.data.texto, ...(form.mascota_id && parsed.data.tipo === 'extravio' ? { mascota_id: form.mascota_id } : {}) } }); await onSaved() } catch (e) { setError(errorText(e)); setBusy(false) }
  }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">NUEVA PUBLICACIÓN</p><h2>Comparte con tu comunidad</h2><p className="muted">Se publicará en el muro de tu comuna. No se permiten enlaces externos.</p>
    <div className="form-grid"><label>Tipo<select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as Tipo })}><option value="recomendacion">Recomendación</option><option value="extravio">Extravío</option><option value="encuentro">Encuentro</option></select></label>{form.tipo === 'extravio' && pets.length > 0 && <label>Mascota extraviada<select value={form.mascota_id} onChange={e => setForm({ ...form, mascota_id: e.target.value })}><option value="">Ninguna en particular</option>{pets.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>}</div>
    <label className="composer-label">Descripción<textarea rows={5} maxLength={1000} value={form.texto} onChange={e => { setForm({ ...form, texto: e.target.value }); setError('') }} /></label>
    {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Publicando...' : 'Publicar'}</button></div></form></div>
}

function ReportModal({ post, onClose, onSaved }: { post: Post; onClose: () => void; onSaved: () => void }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = moderationMessageSchema.safeParse(message)
    if (!result.success) { setError(result.error.issues[0]?.message || 'Explica el reporte'); return }
    try { await api('/reportes', { method: 'POST', body: { objeto_tipo: 'publicacion', objeto_id: post.id, motivo: result.data.slice(0, 200) } }); setDone(true) } catch (e) { setError(errorText(e)) }
  }
  if (done) return <div className="modal-backdrop"><div className="modal report-post-modal"><p className="eyebrow">REPORTE ENVIADO</p><h2>Gracias por avisar</h2><p className="muted">El equipo de moderación revisará la publicación en un plazo objetivo de 24 horas.</p><div className="modal-actions"><button className="primary" onClick={onSaved}>Listo</button></div></div></div>
  return <div className="modal-backdrop"><form className="modal report-post-modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar reporte" onClick={onClose}><X size={20} /></button><p className="eyebrow">REPORTAR PUBLICACIÓN</p><h2>Cuéntanos qué pasó</h2><p className="muted">Tu mensaje ayudará al equipo de moderación a revisar la publicación de {post.autor}.</p><label htmlFor="report-post-reason">Motivo del reporte<textarea id="report-post-reason" rows={5} maxLength={200} value={message} onChange={e => { setMessage(e.target.value); setError('') }} placeholder="Describe lo sucedido..." /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" type="submit">Enviar reporte</button></div></form></div>
}
