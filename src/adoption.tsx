import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, Check, CirclePlus, Heart, MapPin, PawPrint, ShieldCheck, X } from 'lucide-react'
import { Loading, LogoMark, Photo } from './media'
import { api, errorText, iniciales, type Comuna, type FichaDatos } from './api'

type AnimalResumen = { id: string; nombre: string; especie: string; raza: string | null; edad_estimada: string | null; estado_salud: string | null; foto_url: string | null; ong: string; comuna: string }
type AnimalDetalle = AnimalResumen & { historia: string | null; vacunas: { nombre: string; fecha: string }[] | null; ong_tipo: string; ong_descripcion: string | null; ong_contacto: string | null; ong_redes: string | null }

const tipoOng: Record<string, string> = { refugio: 'Refugio', rescatista_independiente: 'Rescatista independiente', agrupacion: 'Agrupación' }

// UC-26 · Catálogo público de adopción: se explora sin cuenta (RF-09).
export function AdoptionCatalog({ standalone }: { standalone?: boolean }) {
  const [animals, setAnimals] = useState<AnimalResumen[] | null>(null)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [comuna, setComuna] = useState('')
  const [especie, setEspecie] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { api<Comuna[]>('/comunas').then(setComunas).catch(() => undefined) }, [])
  useEffect(() => {
    const qs = new URLSearchParams({ ...(comuna ? { comuna } : {}), ...(especie ? { especie } : {}) }).toString()
    api<AnimalResumen[]>(`/adopciones${qs ? `?${qs}` : ''}`).then(a => { setAnimals(a); setError('') }).catch(e => setError(errorText(e)))
  }, [comuna, especie])

  const content = <section className="page directory-page">
    <div className="directory-hero"><div><p className="eyebrow">ADOPCIÓN RESPONSABLE</p><h1>Animales que buscan un hogar</h1><p>Organizaciones de rescate de la Región de Los Lagos publican aquí a los animales en adopción. No necesitas una cuenta para explorar ni para pedir información.</p></div></div>
    <div className="directory-toolbar"><select aria-label="Especie" value={especie} onChange={e => setEspecie(e.target.value)}><option value="">Todas las especies</option><option value="perro">Perros</option><option value="gato">Gatos</option><option value="otro">Otros</option></select><select aria-label="Comuna" value={comuna} onChange={e => setComuna(e.target.value)}><option value="">Todas las comunas</option>{comunas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="pet-grid adoption-grid">{animals?.map(a => <button key={a.id} className="pet-card" onClick={() => setSelected(a.id)}><Photo src={a.foto_url} nombre={a.nombre} className="pet-photo adoption-photo" /><div className="pet-info"><strong>{a.nombre}</strong><span>{a.especie[0].toUpperCase() + a.especie.slice(1)}{a.raza ? ` · ${a.raza}` : ''}{a.edad_estimada ? ` · ${a.edad_estimada}` : ''}</span><small><MapPin size={13} /> {a.comuna} · {a.ong}</small></div></button>)}</div>
    {animals && animals.length === 0 && <div className="empty-results">No hay animales en adopción con estos filtros por ahora.</div>}
    {!animals && !error && <Loading />}
    {selected && <AnimalModal id={selected} onClose={() => setSelected(null)} />}
  </section>

  if (!standalone) return content
  return <div className="emergency-page adoption-public"><main style={{ width: 'min(1100px, 100%)' }}><div className="public-emergency-brand" style={{ justifyContent: 'space-between' }}><span><span className="brand-mark"><LogoMark /></span> PetSuite <span>ADOPCIONES</span></span><a className="secondary" href="/">Ingresar a PetSuite</a></div>{content}</main></div>
}

function AnimalModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [animal, setAnimal] = useState<AnimalDetalle | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ mensaje: '', nombre: '', contacto: '' })
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api<AnimalDetalle>(`/adopciones/${id}`).then(setAnimal).catch(e => setError(errorText(e))) }, [id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.mensaje.trim().length < 10) { setError('Cuéntale a la organización por qué quieres adoptar (mínimo 10 caracteres)'); return }
    setBusy(true); setError('')
    try { await api(`/adopciones/${id}/solicitudes`, { method: 'POST', body: { mensaje: form.mensaje.trim(), ...(form.nombre.trim() && { nombre: form.nombre.trim() }), ...(form.contacto.trim() && { contacto: form.contacto.trim() }) } }); setSent(true) } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  if (!animal) return <div className="modal-backdrop"><article className="modal store-modal"><button className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>{error ? <p className="muted">{error}</p> : <Loading />}</article></div>
  return <div className="modal-backdrop"><article className="modal store-modal"><button className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>
    <Photo src={animal.foto_url} nombre={animal.nombre} className="business-hero modal-photo" />
    <p className="eyebrow">EN ADOPCIÓN · {animal.comuna.toUpperCase()}</p><h2>{animal.nombre}</h2>
    <p className="muted">{animal.especie[0].toUpperCase() + animal.especie.slice(1)}{animal.raza ? ` · ${animal.raza}` : ''}{animal.edad_estimada ? ` · ${animal.edad_estimada}` : ''}</p>
    {animal.historia && <><div className="section-heading"><h3>Su historia</h3></div><p>{animal.historia}</p></>}
    <div className="health-facts"><div><span>Estado de salud</span><strong>{animal.estado_salud || 'Consultar a la organización'}</strong></div><div><span>Vacunas registradas</span><strong>{animal.vacunas?.length ? animal.vacunas.map(v => v.nombre).join(', ') : 'Sin registro'}</strong></div></div>
    <div className="section-heading"><h3>Organización</h3></div><p><strong>{animal.ong}</strong> · {tipoOng[animal.ong_tipo] || animal.ong_tipo}</p>{animal.ong_descripcion && <p className="muted">{animal.ong_descripcion}</p>}
    {sent ? <div className="alert-card"><div className="alert-icon"><Check size={22} /></div><div><strong>Solicitud enviada</strong><p>La organización revisará tu mensaje y coordinará la entrega contigo por el medio que compartiste. Tus datos no se muestran públicamente.</p></div></div>
      : <form onSubmit={submit} noValidate><div className="section-heading"><h3>Quiero adoptar a {animal.nombre}</h3></div>
        <p className="muted">Tu mensaje llega solo a la organización. El nombre y el contacto son opcionales; sin un medio de contacto la organización no podrá responderte.</p>
        <label className="composer-label">Mensaje<textarea rows={4} maxLength={1000} value={form.mensaje} onChange={e => { setForm({ ...form, mensaje: e.target.value }); setError('') }} placeholder="Cuéntanos sobre tu hogar y tu experiencia con animales" /></label>
        <div className="form-grid"><label>Tu nombre (opcional)<input maxLength={80} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label><label>Correo o teléfono (opcional)<input maxLength={120} value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} /></label></div>
        {error && <p className="form-error" role="alert">{error}</p>}<button className="primary full" disabled={busy}><Heart size={16} /> {busy ? 'Enviando...' : 'Enviar solicitud de adopción'}</button></form>}
  </article></div>
}

// ---------------- Panel de la ONG ----------------
type Ong = { id: string; nombre: string; tipo: string; comuna: string; estado_verificacion: 'pendiente' | 'aprobada' | 'rechazada' }
type MiAnimal = { id: string; foto_url: string | null; nombre: string; especie: string; raza: string | null; edad_estimada: string | null; estado_salud: string | null; historia: string | null; historial_salud: FichaDatos; estado: 'disponible' | 'en_proceso' | 'adoptado'; mascota_id: string | null; publicado: boolean; solicitudes_abiertas: number; visitas_7d: number }
type Solicitud = { id: string; solicitante_nombre: string | null; solicitante_contacto: string | null; mensaje: string; estado: 'nueva' | 'en_conversacion' | 'concretada' | 'cerrada'; creado_en: string }

const estadoLabel = { disponible: 'Disponible', en_proceso: 'En proceso', adoptado: 'Adoptado' }

function Metric({ label, value, trend }: { label: string; value: string; trend: string }) { return <div className="metric-card"><small>{label}</small><strong>{value}</strong><span>{trend}</span></div> }

export function OngArea({ active }: { active: string }) {
  const [ong, setOng] = useState<Ong | null | undefined>(undefined)
  const [error, setError] = useState('')
  const reload = useCallback(() => api<Ong | null>('/ong/mia').then(setOng).catch(e => setError(errorText(e))), [])
  useEffect(() => { void reload() }, [reload])
  if (ong === undefined) return <section className="page">{error ? <p className="muted">{error}</p> : <Loading />}</section>
  if (!ong) return <RegisterOng onDone={reload} />
  return <>{active === 'animals' ? <Animals ong={ong} /> : <Overview ong={ong} />}</>
}

function RegisterOng({ onDone }: { onDone: () => void }) {
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [form, setForm] = useState({ nombre: '', tipo: 'refugio', comuna_id: 1, descripcion: '', contacto: '', redes_sociales: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { api<Comuna[]>('/comunas').then(setComunas).catch(() => undefined) }, [])
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.nombre.trim().length < 2) { setError('Ingresa el nombre de la organización'); return }
    setBusy(true); setError('')
    try { await api('/ong', { method: 'POST', body: { nombre: form.nombre.trim(), tipo: form.tipo, comuna_id: form.comuna_id, ...(form.descripcion && { descripcion: form.descripcion }), ...(form.contacto && { contacto: form.contacto }), ...(form.redes_sociales && { redes_sociales: form.redes_sociales }) } }); onDone() } catch (e) { setError(errorText(e)); setBusy(false) }
  }
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">ORGANIZACIÓN DE RESCATE Y ADOPCIÓN</p><h1>Registra tu organización</h1><p className="muted">Participar en PetSuite es gratis. Tus animales se publican en el catálogo público cuando el equipo verifique tu organización.</p></div></div>
    <form className="settings-card" onSubmit={submit} noValidate><div className="settings-form-grid">
      <label>Nombre de la organización o rescatista<input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label>
      <label>Tipo<select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="refugio">Refugio</option><option value="rescatista_independiente">Rescatista independiente</option><option value="agrupacion">Agrupación</option></select></label>
      <label>Comuna donde operas<select value={form.comuna_id} onChange={e => setForm({ ...form, comuna_id: Number(e.target.value) })}>{comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <label>Contacto público (correo o teléfono)<input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} /></label>
      <label>Redes sociales<input value={form.redes_sociales} onChange={e => setForm({ ...form, redes_sociales: e.target.value })} placeholder="@tu_organizacion" /></label></div>
      <label className="composer-label">Descripción de vuestra labor<textarea rows={3} maxLength={1000} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></label>
      {error && <div className="form-error" role="alert">{error}</div>}<div className="settings-actions"><button className="primary" disabled={busy}>{busy ? 'Enviando...' : 'Enviar para verificación'}</button></div></form></section>
}

function StatusBanner({ ong }: { ong: Ong }) {
  if (ong.estado_verificacion === 'aprobada') return null
  return <div className="alert-card"><div className="alert-icon"><AlertCircle size={22} /></div><div><strong>Tu organización está: {ong.estado_verificacion === 'pendiente' ? 'en verificación' : 'rechazada'}</strong><p>{ong.estado_verificacion === 'pendiente' ? 'Puedes preparar tus animales: se guardan como borrador y se publican en el catálogo cuando el equipo PetSuite te verifique.' : 'Contacta al equipo PetSuite para revisar tu solicitud.'}</p></div></div>
}

function Overview({ ong }: { ong: Ong }) {
  const [animals, setAnimals] = useState<MiAnimal[]>([])
  useEffect(() => { api<MiAnimal[]>('/ong/animales').then(setAnimals).catch(() => setAnimals([])) }, [])
  const published = animals.filter(a => a.publicado).length
  return <section className="page business-page"><div className="business-welcome"><div><p className="eyebrow">TU ORGANIZACIÓN EN PETSUITE</p><h1>{ong.nombre}</h1><p>{tipoOng[ong.tipo] || ong.tipo} · {ong.comuna}. Tus animales atraen a nuevos tutores a toda la comunidad.</p></div><ShieldCheck size={38} strokeWidth={1.5} /></div>
    <StatusBanner ong={ong} />
    <div className="business-stats"><Metric label="Animales publicados" value={String(published)} trend={`${animals.length} en total`} /><Metric label="Solicitudes abiertas" value={String(animals.reduce((s, a) => s + a.solicitudes_abiertas, 0))} trend="Por responder" /><Metric label="Visitas (7 días)" value={String(animals.reduce((s, a) => s + a.visitas_7d, 0))} trend="Al catálogo público" /></div></section>
}

const parseLines = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [nombre, fecha] = l.split('|').map(s => s.trim()); return { nombre, fecha: fecha || new Date().toISOString().slice(0, 10) } })
const linesOf = (f: FichaDatos | undefined) => (f?.vacunas || []).map(v => `${v.nombre} | ${v.fecha}`).join('\n')

function Animals({ ong }: { ong: Ong }) {
  const [animals, setAnimals] = useState<MiAnimal[] | null>(null)
  const [editing, setEditing] = useState<MiAnimal | 'new' | null>(null)
  const [reviewing, setReviewing] = useState<MiAnimal | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<MiAnimal[]>('/ong/animales').then(a => { setAnimals(a); setError('') }).catch(e => setError(errorText(e))), [])
  useEffect(() => { void load() }, [load])
  const setEstado = async (a: MiAnimal, estado: 'disponible' | 'en_proceso') => { try { await api(`/ong/animales/${a.id}`, { method: 'PUT', body: { nombre: a.nombre, especie: a.especie, estado } }); await load() } catch (e) { setError(errorText(e)) } }
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">ADOPCIONES</p><h1>Mis animales</h1><p className="muted">Publica animales en el catálogo público y gestiona las solicitudes de adopción.</p></div><button className="primary" onClick={() => setEditing('new')}><CirclePlus size={17} /> Publicar animal</button></div>
    <StatusBanner ong={ong} />
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="catalog-list">{animals?.map(a => <div className="catalog-item" key={a.id}><Photo src={a.foto_url} nombre={a.nombre} className="pet-photo small-photo" /><div className="catalog-item-main"><strong>{a.nombre}</strong><p>{a.especie}{a.raza ? ` · ${a.raza}` : ''}{a.edad_estimada ? ` · ${a.edad_estimada}` : ''}</p><small>{estadoLabel[a.estado]} · {a.estado === 'adoptado' ? (a.mascota_id ? 'Ficha Única creada' : 'Pendiente de vincular la Ficha Única') : a.publicado ? 'Publicado' : 'Borrador (sin publicar)'} · {a.visitas_7d} visitas en 7 días · {a.solicitudes_abiertas} solicitudes abiertas</small></div>
      <div className="qr-actions"><button className="secondary" onClick={() => setReviewing(a)}>{a.estado === 'adoptado' && !a.mascota_id ? 'Vincular ficha' : 'Solicitudes'}</button>{a.estado !== 'adoptado' && <><button className="secondary" onClick={() => setEditing(a)}>Editar</button><button className="text-button" onClick={() => setEstado(a, a.estado === 'disponible' ? 'en_proceso' : 'disponible')}>{a.estado === 'disponible' ? 'Marcar no disponible' : 'Marcar disponible'}</button></>}</div></div>)}
      {animals && animals.length === 0 && <div className="empty-results">Aún no has publicado animales.</div>}</div>
    {editing && <AnimalForm animal={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load() }} />}
    {reviewing && <Review animal={reviewing} onClose={() => { setReviewing(null); void load() }} />}
  </section>
}

function AnimalForm({ animal, onClose, onSaved }: { animal: MiAnimal | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ nombre: animal?.nombre || '', especie: animal?.especie || 'perro', raza: animal?.raza || '', edad_estimada: animal?.edad_estimada || '', estado_salud: animal?.estado_salud || '', historia: animal?.historia || '', vacunas: linesOf(animal?.historial_salud) })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.nombre.trim().length < 1) { setError('Ingresa el nombre del animal'); return }
    const vacunas = parseLines(form.vacunas)
    if (vacunas.some(v => !/^\d{4}-\d{2}-\d{2}$/.test(v.fecha))) { setError('Escribe las vacunas como «Nombre | AAAA-MM-DD», una por línea'); return }
    setBusy(true); setError('')
    const historial_salud = { ...(animal?.historial_salud || {}), vacunas }
    const body = { nombre: form.nombre.trim(), especie: form.especie, ...(form.raza && { raza: form.raza }), ...(form.edad_estimada && { edad_estimada: form.edad_estimada }), ...(form.estado_salud && { estado_salud: form.estado_salud }), ...(form.historia && { historia: form.historia }), historial_salud }
    try { animal ? await api(`/ong/animales/${animal.id}`, { method: 'PUT', body }) : await api('/ong/animales', { method: 'POST', body }); await onSaved() } catch (e) { setError(errorText(e)); setBusy(false) }
  }
  const set = (k: string, v: string) => setForm({ ...form, [k]: v })
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">{animal ? 'EDITAR ANIMAL' : 'NUEVO ANIMAL EN ADOPCIÓN'}</p><h2>{animal ? animal.nombre : 'Publica un animal'}</h2>
    <div className="form-grid"><label>Nombre<input value={form.nombre} onChange={e => set('nombre', e.target.value)} /></label><label>Especie<select value={form.especie} onChange={e => set('especie', e.target.value)}><option value="perro">Perro</option><option value="gato">Gato</option><option value="otro">Otro</option></select></label><label>Raza (aprox.)<input value={form.raza} onChange={e => set('raza', e.target.value)} /></label><label>Edad estimada<input value={form.edad_estimada} onChange={e => set('edad_estimada', e.target.value)} placeholder="1 a 2 años" /></label></div>
    <label className="composer-label">Estado de salud<input value={form.estado_salud} onChange={e => set('estado_salud', e.target.value)} placeholder="Ej.: sano, esterilizado y vacunado" /></label>
    <label className="composer-label">Historia de rescate<textarea rows={3} maxLength={2000} value={form.historia} onChange={e => set('historia', e.target.value)} /></label>
    <label className="composer-label">Vacunas (una por línea: Nombre | AAAA-MM-DD)<textarea rows={3} value={form.vacunas} onChange={e => set('vacunas', e.target.value)} placeholder="Óctuple | 2026-07-02" /></label>
    {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</button></div></form></div>
}

// SP5.3 / UC-29 · Revisar solicitudes, coordinar y concretar la adopción con traspaso de la Ficha Única.
function Review({ animal, onClose }: { animal: MiAnimal; onClose: () => void }) {
  const [items, setItems] = useState<Solicitud[] | null>(null)
  const [correo, setCorreo] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const pendingLink = animal.estado === 'adoptado' && !animal.mascota_id
  const load = useCallback(() => api<Solicitud[]>(`/ong/animales/${animal.id}/solicitudes`).then(setItems).catch(e => setError(errorText(e))), [animal.id])
  useEffect(() => { void load() }, [load])
  const act = async (fn: () => Promise<unknown>) => { setError(''); try { await fn(); await load() } catch (e) { setError(errorText(e)) } }
  const setEstado = (s: Solicitud, estado: 'en_conversacion' | 'cerrada') => act(() => api(`/ong/solicitudes/${s.id}`, { method: 'PATCH', body: { estado } }))
  const finish = (s: Solicitud | null) => act(async () => {
    const r = await api<{ vinculada: boolean }>(`/ong/animales/${animal.id}/adopcion`, { method: 'POST', body: { ...(s && { solicitud_id: s.id }), ...(correo.trim() && { correo: correo.trim() }) } })
    setResult(r.vinculada ? `Listo: se creó la Ficha Única de ${animal.nombre} en la cuenta del adoptante, con su historial de salud.` : `${animal.nombre} quedó como adoptado. El adoptante aún no tiene cuenta de tutor: invítalo a registrarse en PetSuite y luego vincula su Ficha Única con su correo.`)
  })
  const link = () => act(async () => { await api(`/ong/animales/${animal.id}/vincular`, { method: 'POST', body: { correo: correo.trim() } }); setResult('Ficha Única vinculada a la cuenta del adoptante.') })
  return <div className="modal-backdrop"><article className="modal store-modal"><button className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">SOLICITUDES DE ADOPCIÓN</p><h2>{animal.nombre}</h2>
    {result && <div className="alert-card"><div className="alert-icon"><Check size={22} /></div><div><strong>{result}</strong></div></div>}
    {!pendingLink && <>
      {items?.map(s => <div className="catalog-item" key={s.id}><div><strong>{s.solicitante_nombre || 'Anónimo'}</strong><p>{s.mensaje}</p><small>{s.solicitante_contacto ? `Contacto: ${s.solicitante_contacto}` : 'No dejó contacto'} · {new Date(s.creado_en).toLocaleDateString('es-CL')} · {s.estado.replace('_', ' ')}</small></div>
        {(s.estado === 'nueva' || s.estado === 'en_conversacion') && <div className="qr-actions">{s.estado === 'nueva' && <button className="secondary" onClick={() => setEstado(s, 'en_conversacion')}>En conversación</button>}<button className="primary" onClick={() => finish(s)}>Concretar adopción</button><button className="text-button" onClick={() => setEstado(s, 'cerrada')}>Descartar</button></div>}</div>)}
      {items && items.length === 0 && <div className="empty-results">Aún no hay solicitudes para {animal.nombre}.</div>}
      <label className="composer-label">Correo del adoptante en PetSuite (opcional: vincula su Ficha Única si ya es tutor)<input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="adoptante@correo.cl" /></label>
      {animal.estado !== 'adoptado' && <button className="secondary" onClick={() => finish(null)}>Marcar como adoptado sin solicitud <ArrowRight size={14} /></button>}</>}
    {pendingLink && <><p className="muted">Esta adopción quedó pendiente de vincular. Cuando el adoptante se registre como tutor, escribe su correo:</p><label className="composer-label">Correo del adoptante<input type="email" value={correo} onChange={e => setCorreo(e.target.value)} /></label><button className="primary" onClick={link}>Vincular Ficha Única</button></>}
    {error && <p className="form-error" role="alert">{error}</p>}</article></div>
}
