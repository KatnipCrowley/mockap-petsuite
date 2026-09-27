import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, CalendarDays, Check, ChevronRight, CirclePlus, Copy, Download, MessageCircle, PawPrint, Pencil, Printer, QrCode, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import QRCode from 'qrcode'
import { LogoMark, Loading, Photo } from './media'
import { api, edadDesde, emptyFicha, errorText, iniciales, type FichaDatos, type Mascota, type PublicaEmergencia, type PymeResumen } from './api'
import { emergencyContactSchema } from './validators'
import { AdoptionCatalog } from './adoption'
import { CommunityView } from './community'
import { DirectoryView } from './directory'

type Entry = { id: string; type: 'Vacuna' | 'Atención' | 'Tratamiento'; date: string; title: string; notes: string }

const splitList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)
const ficha = (pet: Mascota): FichaDatos => ({ ...emptyFicha(), ...pet.datos_clinicos })
const qrUrl = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}#qr/${token}`

const entriesOf = (pet: Mascota): Entry[] => {
  const f = ficha(pet)
  return [
    ...f.vacunas.map((v, i): Entry => ({ id: v.id || `v${i}`, type: 'Vacuna', date: v.fecha, title: v.nombre, notes: v.notas || '' })),
    ...f.atenciones.map((a, i): Entry => ({ id: a.id || `a${i}`, type: 'Atención', date: a.fecha, title: a.motivo, notes: a.notas || '' })),
    ...f.tratamientos.map((t, i): Entry => ({ id: t.id || `t${i}`, type: 'Tratamiento', date: t.inicio || '', title: t.descripcion, notes: t.notas || '' })),
  ].sort((a, b) => b.date.localeCompare(a.date))
}

// Reconstruye los tres arreglos JSONB de la ficha a partir de la lista unificada del historial.
const withEntries = (f: FichaDatos, entries: Entry[]): FichaDatos => ({
  ...f,
  vacunas: entries.filter(e => e.type === 'Vacuna').map(e => ({ id: e.id, nombre: e.title, fecha: e.date, ...(e.notes ? { notas: e.notes } : {}) })),
  atenciones: entries.filter(e => e.type === 'Atención').map(e => ({ id: e.id, fecha: e.date, motivo: e.title, ...(e.notes ? { notas: e.notes } : {}) })),
  tratamientos: entries.filter(e => e.type === 'Tratamiento').map(e => ({ id: e.id, descripcion: e.title, ...(e.date ? { inicio: e.date } : {}), ...(e.notes ? { notas: e.notes } : {}) })),
})

// La ficha se guarda con control de versión: si otra persona la cambió, el API responde 409 (CP-05).
const saveFicha = (pet: Mascota, next: FichaDatos) => api(`/mascotas/${pet.id}/ficha`, { method: 'PUT', body: { version: pet.ficha_version, datos_clinicos: next } })

// Se recarga al cambiar de vista para reflejar lo que registró una clínica o una adopción desde otra cuenta.
function usePets(view: string) {
  const [pets, setPets] = useState<Mascota[] | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => { try { setPets(await api<Mascota[]>('/mascotas')); setError('') } catch (e) { setError(errorText(e)) } }, [])
  useEffect(() => { void load() }, [load, view])
  return { pets, error, load }
}

export function TutorArea({ active, setActive, name }: { active: string; setActive: (id: string) => void; name: string }) {
  const { pets, error, load } = usePets(active)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Mascota | null>(null)
  const [qrPet, setQrPet] = useState<Mascota | null>(null)

  if (active === 'adoption') return <AdoptionCatalog />
  if (active === 'directory') return <DirectoryView />
  if (active === 'community') return <CommunityView />
  if (!pets) return <section className="page">{error ? <p className="muted">{error}</p> : <Loading />}</section>
  const selected = pets.find(p => p.id === selectedId) || pets[0] || null
  const pick = (pet: Mascota) => { setSelectedId(pet.id); setActive('pets') }

  return <>
    {active === 'home' && <Dashboard pets={pets} name={name} onSelect={pick} onPets={() => setActive('pets')} onCommunity={() => setActive('community')} onAdd={() => setShowAdd(true)} />}
    {active === 'pets' && <PetsView pets={pets} selected={selected} onSelect={pet => setSelectedId(pet.id)} onAdd={() => setShowAdd(true)} onQr={setQrPet} onEdit={setEditing} onChanged={load} />}
    {showAdd && <PetFormModal onClose={() => setShowAdd(false)} onSaved={async id => { await load(); setSelectedId(id); setShowAdd(false); setActive('pets') }} />}
    {editing && <PetFormModal pet={editing} onClose={() => setEditing(null)} onSaved={async () => { await load(); setEditing(null) }} />}
    {qrPet && <QrModal pet={pets.find(p => p.id === qrPet.id) || qrPet} onClose={() => setQrPet(null)} onChanged={load} />}
  </>
}

// Mascota destacada del inicio: foto, estado del QR, alergias y próxima vacuna.
function PetHero({ pet, onOpen }: { pet: Mascota; onOpen: () => void }) {
  const edad = edadDesde(pet.fecha_nacimiento)
  const proxima = (pet.datos_clinicos.vacunas || []).map(v => v.proxima).filter((d): d is string => !!d).sort()[0]
  const alergias = (pet.datos_clinicos.alergias || []).map(a => a.agente)
  return <article className="pet-hero">
    <Photo src={pet.foto_url} nombre={pet.nombre} className="pet-hero-photo" />
    <div className="pet-hero-body">
      <p className="eyebrow">TU COMPAÑERO</p>
      <h2>{pet.nombre}</h2>
      <p className="muted">{pet.raza || pet.especie}{edad != null ? ` · ${edad} ${edad === 1 ? 'año' : 'años'}` : ''}</p>
      <div className="pet-hero-chips">
        <span className={pet.token_activo ? 'chip chip-ok' : 'chip chip-warn'}><QrCode size={14} /> {pet.token_activo ? 'QR activo' : 'Sin QR activo'}</span>
        {alergias.slice(0, 2).map(a => <span key={a} className="chip chip-alert">Alergia: {a}</span>)}
        {proxima && <span className="chip chip-info">Próxima vacuna: {new Date(proxima + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
      </div>
      <button className="primary" onClick={onOpen}>Abrir ficha <ArrowRight size={16} /></button>
    </div>
  </article>
}

function Dashboard({ pets, name, onSelect, onPets, onCommunity, onAdd }: { pets: Mascota[]; name: string; onSelect: (pet: Mascota) => void; onPets: () => void; onCommunity: () => void; onAdd: () => void }) {
  const [latest, setLatest] = useState<{ autor: string; tipo: string; texto: string } | null>(null)
  useEffect(() => { api<{ autor: string; tipo: string; texto: string }[]>('/muro').then(p => setLatest(p[0] || null)).catch(() => setLatest(null)) }, [])
  const sinQr = pets.filter(p => !p.token_activo).length
  return <section className="page home-page">
    <div className="welcome"><div><p className="eyebrow">TU ESPACIO PETSUITE</p><h1>Hola, {name.split(' ')[0]}</h1><p className="muted">Todo lo importante para tus mascotas, en un solo lugar.</p></div><button className="primary" onClick={onAdd}><CirclePlus size={17} /> Agregar mascota</button></div>
    {pets[0] && <PetHero pet={pets[0]} onOpen={() => onSelect(pets[0])} />}
    <div className="alert-card"><div className="alert-icon"><QrCode size={22} /></div><div><strong>{sinQr ? `${sinQr} ${sinQr === 1 ? 'mascota sin' : 'mascotas sin'} medalla QR activa` : 'Su ficha de emergencia, siempre lista'}</strong><p>{sinQr ? 'Activa su QR para que quien la encuentre pueda avisarte sin ver tus datos personales.' : 'Revisa los datos de tus mascotas y accede a su QR cuando lo necesites.'}</p></div><button className="text-button" onClick={onPets}>Ver fichas <ArrowRight size={16} /></button></div>
    <section className="content-panel"><div className="section-heading"><div><p className="eyebrow">MIS MASCOTAS</p><h2>Sus fichas</h2></div><button className="text-button" onClick={onPets}>Ver todas <ArrowRight size={16} /></button></div>
      <div className="pet-grid">{pets.map(pet => <PetCard key={pet.id} pet={pet} onClick={() => onSelect(pet)} />)}<button className="add-card" onClick={onAdd}><CirclePlus size={25} /><strong>Agregar mascota</strong><small>Registra a un nuevo compañero</small></button></div>
    </section>
    <section className="content-panel"><div className="section-heading community-heading"><div><p className="eyebrow">COMUNIDAD</p><h2>Lo último en el muro de tu comuna</h2></div><button className="text-button" onClick={onCommunity}>Ir al muro <ArrowRight size={16} /></button></div>
      {latest ? <div className="post-preview"><div className="post-avatar">{iniciales(latest.autor)}</div><div><strong>{latest.autor}</strong><p>{latest.texto}</p><span className="post-tag">{latest.tipo.toUpperCase()}</span></div></div> : <p className="muted">Todavía no hay publicaciones en tu comuna.</p>}
    </section>
  </section>
}

function PetCard({ pet, onClick, compact, selected }: { pet: Mascota; onClick: () => void; compact?: boolean; selected?: boolean }) {
  const edad = edadDesde(pet.fecha_nacimiento)
  return <button className={`pet-card ${compact ? 'compact' : ''} ${selected ? 'selected' : ''}`} onClick={onClick}><Photo src={pet.foto_url} nombre={pet.nombre} /><div className="pet-info"><strong>{pet.nombre}</strong><span>{pet.raza || pet.especie}{edad != null ? ` · ${edad} ${edad === 1 ? 'año' : 'años'}` : ''}</span>{!compact && <small><b className={pet.token_activo ? 'status-dot' : 'status-dot inactive'} /> {pet.token_activo ? 'Medalla QR activa' : 'Sin medalla QR'}</small>}</div>{compact && <ChevronRight className="chevron" size={18} />}</button>
}

function PetsView({ pets, selected, onSelect, onAdd, onQr, onEdit, onChanged }: { pets: Mascota[]; selected: Mascota | null; onSelect: (pet: Mascota) => void; onAdd: () => void; onQr: (pet: Mascota) => void; onEdit: (pet: Mascota) => void; onChanged: () => Promise<void> }) {
  const [healthOpen, setHealthOpen] = useState(false)
  const [entryOpen, setEntryOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const persist = async (pet: Mascota, next: FichaDatos) => { await saveFicha(pet, next); await onChanged() }
  return <section className="page pets-page"><div className="page-title"><div><p className="eyebrow">TU ESPACIO</p><h1>Mis mascotas</h1><p className="muted">Ficha de salud, historial y QR de emergencia en un solo lugar.</p></div><button className="primary" onClick={onAdd}><CirclePlus size={17} /> Agregar mascota</button></div>
    <div className="pets-layout"><section className="pet-list content-panel"><div className="section-heading"><div><p className="eyebrow">TUS COMPAÑEROS</p><h2>Selecciona una ficha</h2></div><span className="pet-count">{pets.length}</span></div>{pets.map(pet => <PetCard key={pet.id} pet={pet} onClick={() => onSelect(pet)} compact selected={selected?.id === pet.id} />)}</section>
      {selected ? <PetDetail key={selected.id} pet={selected} onQr={() => onQr(selected)} onEdit={() => onEdit(selected)} onHealth={() => setHealthOpen(true)} onAddEntry={() => { setEditingEntry(null); setEntryOpen(true) }} onEditEntry={entry => { setEditingEntry(entry); setEntryOpen(true) }} /> : <div className="detail-card"><p className="muted">Agrega una mascota para comenzar su ficha de salud.</p></div>}</div>
    {selected && healthOpen && <HealthModal key={selected.id} pet={selected} onClose={() => setHealthOpen(false)} onSave={async next => { await persist(selected, next); setHealthOpen(false) }} />}
    {selected && entryOpen && <EntryModal key={`${selected.id}-${editingEntry?.id || 'new'}`} entry={editingEntry} onClose={() => setEntryOpen(false)} onSave={async entry => {
      const others = entriesOf(selected).filter(e => e.id !== editingEntry?.id)
      await persist(selected, withEntries(ficha(selected), [...others, entry])); setEntryOpen(false)
    }} />}
  </section>
}

function PetDetail({ pet, onQr, onEdit, onHealth, onAddEntry, onEditEntry }: { pet: Mascota; onQr: () => void; onEdit: () => void; onHealth: () => void; onAddEntry: () => void; onEditEntry: (entry: Entry) => void }) {
  const f = ficha(pet)
  const history = entriesOf(pet)
  const edad = edadDesde(pet.fecha_nacimiento)
  return <article className="detail-card health-detail"><div className="detail-head"><Photo src={pet.foto_url} nombre={pet.nombre} className="pet-photo large" /><div><p className="eyebrow">FICHA ÚNICA DE SALUD</p><h2>{pet.nombre}</h2><p className="muted">{pet.especie}{pet.raza ? ` · ${pet.raza}` : ''}</p></div><button type="button" className="secondary pet-edit-button" onClick={onEdit}><Pencil size={16} /> Editar datos</button></div>
    <div className="detail-stats"><div><small>Edad</small><strong>{edad == null ? 'Sin dato' : `${edad} ${edad === 1 ? 'año' : 'años'}`}</strong></div><div><small>Sexo</small><strong>{pet.sexo ? pet.sexo[0].toUpperCase() + pet.sexo.slice(1) : 'Sin dato'}</strong></div><div><small>Versión de ficha</small><strong>{pet.ficha_version}</strong></div></div>
    <section className="pet-health-section"><div className="pet-section-head"><div><p className="eyebrow">INFORMACIÓN CRÍTICA</p><h3>Datos de salud</h3></div><button className="secondary" onClick={onHealth}><Pencil size={15} /> Editar salud</button></div><div className="health-facts"><div><span>Alergias</span><strong>{f.alergias.length ? f.alergias.map(a => a.agente).join(', ') : 'No registradas'}</strong></div><div><span>Condiciones médicas</span><strong>{f.condiciones.length ? f.condiciones.join(', ') : 'No registradas'}</strong></div><div><span>Medicamentos · solo tutor</span><strong>{f.medicamentos.length ? f.medicamentos.join(', ') : 'No registrados'}</strong></div></div>{f.notaEmergencia && <p className="health-note"><AlertCircle size={17} /> {f.notaEmergencia}</p>}</section>
    <section className="pet-health-section"><div className="pet-section-head"><div><p className="eyebrow">REGISTRO PRIVADO</p><h3>Historial médico</h3></div><button className="secondary" onClick={onAddEntry}><CirclePlus size={16} /> Agregar registro</button></div>{history.length ? <div className="medical-timeline">{history.map(entry => <div className="medical-event" key={`${entry.type}-${entry.id}`}><div className="medical-event-icon"><CalendarDays size={17} /></div><div><span>{entry.type}{entry.date ? ` · ${new Date(`${entry.date}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</span><strong>{entry.title}</strong>{entry.notes && <p>{entry.notes}</p>}</div><button className="text-button" onClick={() => onEditEntry(entry)} aria-label={`Editar ${entry.title}`}>Editar</button></div>)}</div> : <p className="muted">Todavía no hay vacunas ni atenciones registradas.</p>}</section>
    <section className="pet-qr-section"><div className="pet-section-head"><div><p className="eyebrow">ACCESO DE EMERGENCIA</p><h3>Medalla QR</h3></div><span className={pet.token_activo ? 'pet-qr-badge active' : 'pet-qr-badge'}>{pet.token_activo ? 'Activa' : 'Sin medalla'}</span></div><p className="muted">El QR contiene solo un código opaco. La ficha pública muestra nombre, especie, raza, alergias, condiciones y la nota de emergencia; tus datos personales, medicamentos e historial nunca se exponen.</p><p className="pet-qr-warning">Si pierdes la medalla, genera una nueva o desactívala: el código anterior deja de funcionar de inmediato.</p><button className="primary" onClick={onQr}><QrCode size={17} /> {pet.token_activo ? 'Ver y compartir QR' : 'Generar medalla QR'}</button></section>
    <ClinicAccess pet={pet} />
    <PetMessages pet={pet} />
  </article>
}

type Acceso = { id: number; permiso: string; vigente_hasta: string; clinica: string }

function ClinicAccess({ pet }: { pet: Mascota }) {
  const [access, setAccess] = useState<Acceso[]>([])
  const [vets, setVets] = useState<PymeResumen[]>([])
  const [form, setForm] = useState({ pyme_id: '', permiso: 'lectura', dias: '7' })
  const [error, setError] = useState('')
  const reload = useCallback(() => api<Acceso[]>(`/mascotas/${pet.id}/accesos`).then(setAccess).catch(e => setError(errorText(e))), [pet.id])
  useEffect(() => { void reload(); api<PymeResumen[]>('/pymes?rubro=veterinaria').then(v => { setVets(v); setForm(prev => ({ ...prev, pyme_id: v[0]?.id || '' })) }).catch(() => undefined) }, [reload])
  const grant = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    try { await api(`/mascotas/${pet.id}/accesos`, { method: 'POST', body: { pyme_id: form.pyme_id, permiso: form.permiso, dias: Number(form.dias) } }); await reload() } catch (e) { setError(errorText(e)) }
  }
  const revoke = async (id: number) => { try { await api(`/mascotas/${pet.id}/accesos/${id}`, { method: 'DELETE' }); await reload() } catch (e) { setError(errorText(e)) } }
  return <section className="pet-health-section"><div className="pet-section-head"><div><p className="eyebrow">COMPARTIR CON UNA VETERINARIA</p><h3>Acceso temporal a la ficha</h3></div></div>
    <p className="muted">Solo tú decides quién puede ver o completar esta ficha, por un tiempo limitado. Cada acceso queda auditado.</p>
    {access.length > 0 && <div className="demo-contact-list">{access.map(a => <div key={a.id}><small>{a.permiso === 'escritura' ? 'Lectura y registro' : 'Solo lectura'} · hasta {new Date(a.vigente_hasta).toLocaleDateString('es-CL')}</small><p>{a.clinica} <button className="text-button" onClick={() => revoke(a.id)}>Revocar</button></p></div>)}</div>}
    {vets.length ? <form className="settings-form-grid" onSubmit={grant}><label>Veterinaria<select value={form.pyme_id} onChange={e => setForm({ ...form, pyme_id: e.target.value })}>{vets.map(v => <option key={v.id} value={v.id}>{v.nombre_comercial} · {v.comuna}</option>)}</select></label><label>Permiso<select value={form.permiso} onChange={e => setForm({ ...form, permiso: e.target.value })}><option value="lectura">Solo lectura</option><option value="escritura">Lectura y registro de atenciones</option></select></label><label>Días (máx. 30)<input type="number" min="1" max="30" value={form.dias} onChange={e => setForm({ ...form, dias: e.target.value })} /></label><button className="secondary">Otorgar acceso</button></form> : <p className="muted">Aún no hay veterinarias verificadas en el directorio.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>
}

type Mensaje = { id: string; remitente_nombre: string | null; remitente_contacto: string | null; mensaje: string; estado: string; enviado_en: string; latitud: string | null; longitud: string | null }

function PetMessages({ pet }: { pet: Mascota }) {
  const [messages, setMessages] = useState<Mensaje[]>([])
  const reload = useCallback(() => api<Mensaje[]>(`/mascotas/${pet.id}/mensajes`).then(setMessages).catch(() => undefined), [pet.id])
  useEffect(() => { void reload() }, [reload])
  const mark = async (id: string, estado: 'leido' | 'respondido') => { await api(`/mascotas/mensajes/${id}`, { method: 'PATCH', body: { estado } }); await reload() }
  if (!messages.length) return null
  return <section className="pet-health-section"><div className="pet-section-head"><div><p className="eyebrow">CONTACTO SEGURO</p><h3>Mensajes de quien encontró a {pet.nombre}</h3></div></div>
    <div className="demo-contact-list">{messages.map(m => <div key={m.id}><small>{new Date(m.enviado_en).toLocaleString('es-CL')} · {m.estado === 'nuevo' ? 'Nuevo' : m.estado === 'leido' ? 'Leído' : 'Respondido'}</small><p>{m.mensaje}</p>{(m.remitente_nombre || m.remitente_contacto) && <p><b>{m.remitente_nombre}</b> {m.remitente_contacto && `· ${m.remitente_contacto}`}</p>}{m.latitud && m.longitud && <a className="text-button" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${m.latitud}&mlon=${m.longitud}#map=17/${m.latitud}/${m.longitud}`}>Ver ubicación aproximada <ArrowRight size={14} /></a>}{m.estado !== 'respondido' && <button className="text-button" onClick={() => mark(m.id, m.estado === 'nuevo' ? 'leido' : 'respondido')}>{m.estado === 'nuevo' ? 'Marcar como leído' : 'Marcar como respondido'}</button>}</div>)}</div></section>
}

function HealthModal({ pet, onClose, onSave }: { pet: Mascota; onClose: () => void; onSave: (next: FichaDatos) => Promise<void> }) {
  const f = ficha(pet)
  const [form, setForm] = useState({ allergies: f.alergias.map(a => a.agente).join(', '), conditions: f.condiciones.join(', '), medications: f.medicamentos.join(', '), emergencyNotes: f.notaEmergencia })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const lists = [form.allergies, form.conditions, form.medications].map(splitList)
    if (lists.some(l => l.length > 8 || l.some(i => i.length > 80))) { setError('Usa hasta 8 elementos de máximo 80 caracteres, separados por comas'); return }
    if (form.emergencyNotes.length > 160) { setError('La nota pública no puede superar 160 caracteres'); return }
    setBusy(true)
    try {
      const known = new Map(f.alergias.map(a => [a.agente.toLowerCase(), a]))
      await onSave({ ...f, alergias: lists[0].map(agente => known.get(agente.toLowerCase()) || { agente }), condiciones: lists[1], medicamentos: lists[2], notaEmergencia: form.emergencyNotes.trim() })
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  return <div className="modal-backdrop"><form className="modal health-form-modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">FICHA DE {pet.nombre.toUpperCase()}</p><h2>Editar datos de salud</h2><p className="muted">Separa varios elementos con comas. Alergias, condiciones y nota de emergencia aparecerán en el QR.</p><div className="health-form-fields"><label>Alergias<input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="Ej.: pollo, penicilina" /></label><label>Condiciones médicas<input value={form.conditions} onChange={e => setForm({ ...form, conditions: e.target.value })} placeholder="Ej.: diabetes" /></label><label>Medicamentos (privado)<input value={form.medications} onChange={e => setForm({ ...form, medications: e.target.value })} placeholder="Ej.: tratamiento indicado por veterinaria" /></label><label>Nota pública de emergencia<textarea rows={3} maxLength={160} value={form.emergencyNotes} onChange={e => setForm({ ...form, emergencyNotes: e.target.value })} placeholder="Indicación importante para quien encuentre a tu mascota" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="secondary" type="button" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar salud'}</button></div></form></div>
}

function EntryModal({ entry, onClose, onSave }: { entry: Entry | null; onClose: () => void; onSave: (entry: Entry) => Promise<void> }) {
  const [form, setForm] = useState({ date: entry?.date || new Date().toISOString().slice(0, 10), type: entry?.type || 'Atención' as Entry['type'], title: entry?.title || '', notes: entry?.notes || '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { setError('Indica una fecha válida'); return }
    if (form.title.trim().length < 3) { setError('Describe la atención'); return }
    setBusy(true)
    try { await onSave({ id: entry?.id.match(/^[vat]\d+$/) ? crypto.randomUUID() : entry?.id || crypto.randomUUID(), type: form.type, date: form.date, title: form.title.trim().slice(0, 80), notes: form.notes.trim() }) } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  return <div className="modal-backdrop"><form className="modal health-form-modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">HISTORIAL PRIVADO</p><h2>{entry ? 'Editar registro' : 'Agregar atención o vacuna'}</h2><div className="health-form-fields"><label>Fecha<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label><label>Tipo<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Entry['type'] })}><option>Atención</option><option>Vacuna</option><option>Tratamiento</option></select></label><label>Nombre del registro<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ej.: vacuna antirrábica" /></label><label>Detalles<textarea rows={4} maxLength={500} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Indicaciones, resultados o próxima visita" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="secondary" type="button" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar registro'}</button></div></form></div>
}

function PetFormModal({ pet, onClose, onSaved }: { pet?: Mascota; onClose: () => void; onSaved: (id: string) => Promise<void> }) {
  const [form, setForm] = useState({ nombre: pet?.nombre || '', especie: pet?.especie || 'Perro', raza: pet?.raza || '', sexo: pet?.sexo || 'desconocido', fecha_nacimiento: pet?.fecha_nacimiento?.slice(0, 10) || '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.nombre.trim().length < 2) { setError('Ingresa el nombre de tu mascota'); return }
    const body = { nombre: form.nombre.trim(), especie: form.especie, sexo: form.sexo, ...(form.raza.trim() ? { raza: form.raza.trim() } : {}), ...(form.fecha_nacimiento ? { fecha_nacimiento: form.fecha_nacimiento } : {}) }
    setBusy(true)
    try {
      const saved = pet ? await api<{ id: string }>(`/mascotas/${pet.id}`, { method: 'PATCH', body }) : await api<{ id: string }>('/mascotas', { method: 'POST', body })
      await onSaved(saved.id)
    } catch (e) { setError(errorText(e)); setBusy(false) }
  }
  const set = (key: string, value: string) => setForm({ ...form, [key]: value })
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">{pet ? 'EDITAR FICHA' : 'NUEVA FICHA'}</p><h2>{pet ? `Datos de ${pet.nombre}` : 'Agrega un compañero'}</h2><p className="muted">{pet ? 'Actualiza su información básica.' : 'Se creará su Ficha Única de Salud.'}</p><div className="form-grid"><label>Nombre<input value={form.nombre} onChange={e => set('nombre', e.target.value)} /></label><label>Especie<select value={form.especie} onChange={e => set('especie', e.target.value)}><option>Perro</option><option>Gato</option><option>Otro</option></select></label><label>Raza<input value={form.raza} onChange={e => set('raza', e.target.value)} /></label><label>Sexo<select value={form.sexo} onChange={e => set('sexo', e.target.value)}><option value="desconocido">Desconocido</option><option value="macho">Macho</option><option value="hembra">Hembra</option></select></label><label>Fecha de nacimiento (aprox.)<input type="date" max={new Date().toISOString().slice(0, 10)} value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} /></label></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar ficha'}</button></div></form></div>
}

// UC-04 · Generar, reemplazar o desactivar la medalla. El QR lleva un token opaco, no datos.
function QrModal({ pet, onClose, onChanged }: { pet: Mascota; onClose: () => void; onChanged: () => Promise<void> }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const token = pet.token_activo
  const url = token ? qrUrl(token) : ''
  useEffect(() => {
    if (!url) { setSrc(''); return }
    QRCode.toDataURL(url, { width: 540, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#171717', light: '#ffffff' } }).then(setSrc).catch(() => setError('No se pudo generar el QR.'))
  }, [url])
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setError(''); try { await fn(); await onChanged() } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }
  const issue = () => act(() => api(`/mascotas/${pet.id}/medallas`, { method: 'POST' }))
  const disable = () => act(() => api(`/mascotas/${pet.id}/medallas/activa`, { method: 'DELETE' }))
  const download = () => { if (!src) return; const link = document.createElement('a'); link.href = src; link.download = `petsuite-${pet.nombre.toLowerCase()}-qr.png`; link.click() }
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setError('No se pudo copiar el enlace. Ábrelo en otra pestaña para compartirlo.') } }
  return <div className="modal-backdrop"><div className="modal qr-modal public-qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title"><button type="button" className="close" aria-label="Cerrar QR" onClick={onClose}><X size={20} /></button><p className="eyebrow">MEDALLA DE EMERGENCIA</p><h2 id="qr-title">QR de {pet.nombre}</h2>
    {token ? <>
      <p className="muted">Funciona sin iniciar sesión ni instalar nada, desde cualquier teléfono.</p>
      <div className="qr-display">{src ? <img src={src} alt={`Código QR de emergencia de ${pet.nombre}`} /> : <span>{error || 'Generando QR...'}</span>}</div>
      <div className="qr-actions"><button className="primary" disabled={!src} onClick={download}><Download size={16} /> Descargar PNG</button><button className="secondary" disabled={!src} onClick={() => window.print()}><Printer size={16} /> Imprimir</button></div>
      <div className="qr-link-actions"><button className="secondary" onClick={copy}><Copy size={16} /> {copied ? 'Enlace copiado' : 'Copiar enlace'}</button><a className="text-button" href={url} target="_blank" rel="noopener noreferrer">Ver ficha pública <ArrowRight size={16} /></a></div>
      <div className="qr-actions"><button className="secondary" disabled={busy} onClick={issue}>Reemplazar medalla</button><button className="secondary danger-button" disabled={busy} onClick={disable}>Desactivar</button></div>
      <p className="qr-disclaimer">Reemplazar o desactivar invalida el QR anterior al instante, aunque ya esté impreso.</p>
    </> : <>
      <p className="muted">Aún no hay una medalla activa. Al generarla se crea un código opaco que no contiene datos personales.</p>
      <button className="primary full" disabled={busy} onClick={issue}><QrCode size={17} /> {busy ? 'Generando...' : 'Generar medalla QR'}</button>
    </>}
    {error && token && <p className="form-error" role="alert">{error}</p>}
    {error && !token && <p className="form-error" role="alert">{error}</p>}
  </div></div>
}

// UC-10 / UC-11 · Vista pública: sin cuenta. El servidor solo entrega campos autorizados.
export function EmergencyView({ token }: { token: string | null }) {
  const [pet, setPet] = useState<PublicaEmergencia | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading')
  const [form, setForm] = useState({ message: '', name: '', contact: '' })
  const [place, setPlace] = useState<{ latitud: number; longitud: number } | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    api<PublicaEmergencia>(`/qr/${token}`).then(p => { setPet(p); setState('ok') }).catch(() => setState('invalid'))
  }, [token])

  if (state === 'loading') return <div className="emergency-page"><div className="emergency-card emergency-invalid"><PawPrint size={35} /><p className="muted">Cargando ficha...</p></div></div>
  if (state === 'invalid' || !pet) return <div className="emergency-page"><div className="emergency-card emergency-invalid"><QrCode size={35} /><h1>Medalla no válida</h1><p className="muted">Este código no está activo o no existe. Si encontraste una mascota, pide ayuda a un vecino o a una veterinaria cercana.</p><a className="secondary" href="/">Ir a PetSuite</a></div></div>
  if (sent) return <div className="emergency-page"><div className="emergency-card emergency-invalid"><div className="success-mark"><Check size={26} /></div><h1>Aviso enviado</h1><p className="muted">Enviamos tu mensaje al tutor de {pet.nombre}. Gracias por ayudar. No se muestran datos personales del tutor.</p></div></div>

  const locate = () => navigator.geolocation?.getCurrentPosition(
    pos => setPlace({ latitud: Number(pos.coords.latitude.toFixed(3)), longitud: Number(pos.coords.longitude.toFixed(3)) }),
    () => setError('No pudimos obtener tu ubicación. Puedes describir el lugar en el mensaje.'), { timeout: 8000 })
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = emergencyContactSchema.safeParse({ message: form.message })
    if (!result.success) { setError(result.error.issues[0]?.message || 'Revisa tu mensaje'); return }
    setBusy(true); setError('')
    try {
      await api(`/qr/${token}/mensajes`, { method: 'POST', body: { mensaje: result.data.message, ...(form.name.trim() ? { nombre: form.name.trim() } : {}), ...(form.contact.trim() ? { contacto: form.contact.trim() } : {}), ...(place || {}) } })
      setSent(true)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  return <div className="emergency-page"><main className="emergency-card public-emergency-card"><div className="public-emergency-brand"><span className="brand-mark"><LogoMark /></span> PetSuite <span>FICHA PÚBLICA</span></div><div className="emergency-hero"><Photo src={pet.foto_url} nombre={pet.nombre} className="emergency-pet-photo" /><div className="emergency-hero-text"><p className="eyebrow">INFORMACIÓN DE EMERGENCIA</p><h1>{pet.nombre}</h1><p className="emergency-subtitle">{pet.especie}{pet.raza ? ` · ${pet.raza}` : ''}</p></div></div>
    {pet.alertasCriticas.length > 0 && <div className="emergency-alert" role="alert"><TriangleAlert size={22} /><div><strong>Atención</strong><p>{pet.alertasCriticas.join(' · ')}</p></div></div>}
    <div className="public-emergency-facts"><div><strong>Alergias</strong><p>{pet.alergias.length ? pet.alergias.map(a => a.agente).join(', ') : 'No registradas'}</p></div><div><strong>Condiciones médicas</strong><p>{pet.condiciones.length ? pet.condiciones.join(', ') : 'No registradas'}</p></div>{pet.notaEmergencia && <div><strong>Indicación importante</strong><p>{pet.notaEmergencia}</p></div>}</div>
    <p className="privacy-note"><ShieldCheck size={14} /> Esta ficha no muestra teléfono, correo, dirección, medicamentos ni historial privado del tutor.</p>
    <section className="public-contact-demo"><h2>¿Encontraste a {pet.nombre}?</h2><p>Envía un aviso seguro: el tutor lo recibe sin que se revelen sus datos. Tus datos son opcionales y solo se usarán para coordinar la entrega.</p>
      <form onSubmit={submit} noValidate><label htmlFor="emergency-message">Mensaje<textarea id="emergency-message" rows={4} maxLength={500} value={form.message} onChange={e => { setForm({ ...form, message: e.target.value }); setError('') }} placeholder="Cuéntale dónde y cómo la encontraste..." /></label><label>Tu nombre (opcional)<input maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Cómo contactarte (opcional)<input maxLength={120} value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Teléfono o correo" /></label><button type="button" className="secondary full" onClick={locate}><MessageCircle size={16} /> {place ? 'Ubicación aproximada incluida' : 'Incluir mi ubicación aproximada'}</button>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy ? 'Enviando...' : 'Avisar al tutor'}</button></form></section></main></div>
}
