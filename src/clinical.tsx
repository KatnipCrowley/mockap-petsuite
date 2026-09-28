import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Loading, Photo } from './media'
import { api, emptyFicha, errorText, iniciales, type FichaDatos } from './api'
import { RegisterPyme, usePyme } from './business'
import { medicalEntrySchema } from './validators'

type Paciente = { id: string; nombre: string; especie: string; raza: string | null; foto_url?: string | null; tutor: string; permiso: 'lectura' | 'escritura'; vigente_hasta: string; alertas: string[] | null }
type FichaResp = { id: string; datos_clinicos: FichaDatos; version: number }

// UC-17 / UC-18 · La clínica solo ve fichas cuyo acceso otorgó el tutor y sigue vigente (UC-23).
export function ClinicalArea({ active }: { active: string }) {
  const { pyme, loading, error, reload } = usePyme()
  const [patients, setPatients] = useState<Paciente[] | null>(null)
  const [open, setOpen] = useState<Paciente | null>(null)
  const loadPatients = useCallback(() => api<Paciente[]>('/mascotas/accesibles').then(setPatients).catch(() => setPatients([])), [])
  useEffect(() => { void loadPatients() }, [loadPatients])

  if (loading) return <section className="page">{error ? <p className="muted">{error}</p> : <Loading />}</section>
  if (!pyme) return <RegisterPyme veterinaria onDone={reload} />
  const list = patients || []
  const alerts = list.filter(p => p.alertas && p.alertas.length).length

  return <section className="page clinical-page"><div className="page-title"><div><p className="eyebrow">ATENCIÓN VETERINARIA · {pyme.nombre_comercial.toUpperCase()}</p><h1>{active === 'patients' ? 'Pacientes' : 'Tu jornada clínica'}</h1><p className="muted">Fichas que los tutores compartieron contigo por un tiempo limitado.</p></div></div>
    {pyme.estado_verificacion !== 'aprobada' && <div className="alert-card"><div><strong>Tu clínica está: {pyme.estado_verificacion === 'pendiente' ? 'en verificación' : pyme.estado_verificacion}</strong><p>Los tutores solo pueden compartir fichas con veterinarias verificadas.</p></div></div>}
    <div className="clinical-summary"><div><strong>{list.length}</strong><span>Fichas con acceso vigente</span></div><div><strong>{alerts}</strong><span>Con alertas críticas</span></div><div><strong>{list.filter(p => p.permiso === 'escritura').length}</strong><span>Con permiso de registro</span></div></div>
    <div className="clinical-panel"><div className="chart-heading"><div><p className="eyebrow">PACIENTES</p><h2>Accesos otorgados</h2></div></div>
      {list.map(p => <div className="patient-row" key={p.id}><Photo src={p.foto_url} nombre={p.nombre} className="pet-photo small-photo" /><div><strong>{p.nombre}</strong><small>{p.tutor} · acceso hasta {new Date(p.vigente_hasta).toLocaleDateString('es-CL')}</small></div><span className={p.alertas?.length ? 'clinical-alert' : 'clinical-ok'}>{p.alertas?.length ? p.alertas[0] : 'Sin alertas'}</span><button className="secondary" onClick={() => setOpen(p)}>Abrir ficha</button></div>)}
      {patients && list.length === 0 && <div className="empty-results">Aún no tienes fichas compartidas. El tutor puede otorgarte acceso desde la ficha de su mascota.</div>}</div>
    {open && <FichaModal paciente={open} onClose={() => { setOpen(null); void loadPatients() }} />}
  </section>
}

function FichaModal({ paciente, onClose }: { paciente: Paciente; onClose: () => void }) {
  const [ficha, setFicha] = useState<FichaResp | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ tipo: 'atencion', fecha: new Date().toISOString().slice(0, 10), titulo: '', notas: '' })
  const load = useCallback(() => api<FichaResp>(`/mascotas/${paciente.id}/ficha`).then(setFicha).catch(e => setError(errorText(e))), [paciente.id])
  useEffect(() => { void load() }, [load])

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ficha) return
    const type = ({ vacuna: 'Vacuna', tratamiento: 'Tratamiento', atencion: 'Atención' } as const)[form.tipo as 'vacuna' | 'tratamiento' | 'atencion']
    const parsed = medicalEntrySchema.safeParse({ type, date: form.fecha, title: form.titulo, notes: form.notas })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa el registro'); return }
    const d = { ...emptyFicha(), ...ficha.datos_clinicos }
    const id = crypto.randomUUID(), notas = parsed.data.notes || undefined
    if (parsed.data.type === 'Vacuna') d.vacunas = [...d.vacunas, { id, nombre: parsed.data.title, fecha: parsed.data.date, notas }]
    else if (parsed.data.type === 'Tratamiento') d.tratamientos = [...d.tratamientos, { id, descripcion: parsed.data.title, inicio: parsed.data.date, notas }]
    else d.atenciones = [...d.atenciones, { id, fecha: parsed.data.date, motivo: parsed.data.title, notas }]
    try {
      await api(`/mascotas/${paciente.id}/ficha`, { method: 'PUT', body: { version: ficha.version, datos_clinicos: d } })
      setForm({ ...form, titulo: '', notas: '' }); setError(''); await load()
    } catch (e) { setError(errorText(e)) }
  }

  const d = ficha ? { ...emptyFicha(), ...ficha.datos_clinicos } : null
  return <div className="modal-backdrop"><article className="modal store-modal"><button className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">FICHA ÚNICA DE SALUD · {paciente.permiso === 'escritura' ? 'LECTURA Y REGISTRO' : 'SOLO LECTURA'}</p><h2>{paciente.nombre}</h2><p className="muted">{paciente.especie}{paciente.raza ? ` · ${paciente.raza}` : ''} · Tutor: {paciente.tutor}</p>
    {!d && (error ? <p className="muted">{error}</p> : <Loading rows={1} />)}
    {d && <><div className="health-facts"><div><span>Alergias</span><strong>{d.alergias.length ? d.alergias.map(a => a.agente).join(', ') : 'No registradas'}</strong></div><div><span>Condiciones</span><strong>{d.condiciones.length ? d.condiciones.join(', ') : 'No registradas'}</strong></div><div><span>Medicamentos</span><strong>{d.medicamentos.length ? d.medicamentos.join(', ') : 'No registrados'}</strong></div></div>
      <div className="section-heading"><h3>Historial</h3></div>
      <div className="medical-timeline">{[...d.vacunas.map(v => ({ k: `v${v.id || v.nombre}`, t: 'Vacuna', f: v.fecha, n: v.nombre })), ...d.atenciones.map(a => ({ k: `a${a.id || a.motivo}`, t: 'Atención', f: a.fecha, n: a.motivo })), ...d.tratamientos.map(x => ({ k: `t${x.id || x.descripcion}`, t: 'Tratamiento', f: x.inicio || '', n: x.descripcion }))].sort((a, b) => b.f.localeCompare(a.f)).map(e => <div className="medical-event" key={e.k}><div><span>{e.t}{e.f ? ` · ${e.f}` : ''}</span><strong>{e.n}</strong></div></div>)}</div>
      {paciente.permiso === 'escritura' ? <form className="settings-form-grid" onSubmit={add} noValidate><label>Tipo<select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="atencion">Atención</option><option value="vacuna">Vacuna</option><option value="tratamiento">Tratamiento</option></select></label><label>Fecha<input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></label><label>Registro<input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></label><label>Notas<input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></label><button className="primary">Registrar en la ficha</button></form> : <p className="muted">El tutor te dio acceso de solo lectura.</p>}
    </>}
    {error && d && <p className="form-error" role="alert">{error}</p>}</article></div>
}
