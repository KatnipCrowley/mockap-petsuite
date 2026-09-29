import { useCallback, useEffect, useState } from 'react'
import { Pencil, Search, X } from 'lucide-react'
import { Loading, Photo } from './media'
import { api, emptyFicha, errorText, fechaCorta, type FichaDatos, type RegistroMeta } from './api'
import { BusinessProfile, RegisterPyme, usePyme } from './business'

type Paciente = { id: string; nombre: string; especie: string; raza: string | null; foto_url?: string | null; tutor: string; permiso: 'lectura' | 'escritura'; vigente_hasta: string; alertas: string[] | null }
type FichaResp = { id: string; datos_clinicos: FichaDatos; version: number }
type Tipo = 'atencion' | 'vacuna' | 'tratamiento'
type Evento = RegistroMeta & { id?: string; tipo: Tipo; fecha: string; titulo: string; notas?: string; proxima?: string }

const tipoLabel: Record<Tipo, string> = { atencion: 'Atención', vacuna: 'Vacuna', tratamiento: 'Tratamiento' }
const filtros = ['Todos', 'Con alertas', 'Con registro', 'Por vencer'] as const
const porVencer = (p: Paciente) => new Date(p.vigente_hasta).getTime() - Date.now() < 3 * 86_400_000

const eventosDe = (d: FichaDatos): Evento[] => [
  ...d.vacunas.map(v => ({ ...v, tipo: 'vacuna' as const, titulo: v.nombre })),
  ...d.atenciones.map(a => ({ ...a, tipo: 'atencion' as const, titulo: a.motivo })),
  ...d.tratamientos.map(t => ({ ...t, tipo: 'tratamiento' as const, fecha: t.inicio || '', titulo: t.descripcion })),
].sort((a, b) => b.fecha.localeCompare(a.fecha))

// UC-17 / UC-18 · La clínica solo ve fichas cuyo acceso otorgó el tutor y sigue vigente (UC-23).
export function ClinicalArea({ active }: { active: string }) {
  const { pyme, loading, error, reload } = usePyme()
  const [patients, setPatients] = useState<Paciente[] | null>(null)
  const [open, setOpen] = useState<Paciente | null>(null)
  const [query, setQuery] = useState('')
  const [filtro, setFiltro] = useState<typeof filtros[number]>('Todos')
  const loadPatients = useCallback(() => api<Paciente[]>('/mascotas/accesibles').then(setPatients).catch(() => setPatients([])), [])
  useEffect(() => { void loadPatients() }, [loadPatients])

  if (loading) return <section className="page">{error ? <p className="muted">{error}</p> : <Loading />}</section>
  if (!pyme) return <RegisterPyme veterinaria onDone={reload} />
  if (active === 'clinic-profile') return <BusinessProfile pyme={pyme} />
  const list = patients || []
  const alerts = list.filter(p => p.alertas && p.alertas.length).length
  const q = query.trim().toLocaleLowerCase('es')
  const shown = list.filter(p => `${p.nombre} ${p.tutor} ${p.raza || ''}`.toLocaleLowerCase('es').includes(q) && (
    filtro === 'Todos' || (filtro === 'Con alertas' && !!p.alertas?.length) || (filtro === 'Con registro' && p.permiso === 'escritura') || (filtro === 'Por vencer' && porVencer(p))))

  return <section className="page clinical-page"><div className="page-title"><div><p className="eyebrow">ATENCIÓN VETERINARIA · {pyme.nombre_comercial.toUpperCase()}</p><h1>{active === 'patients' ? 'Pacientes' : 'Tu jornada clínica'}</h1><p className="muted">Fichas que los tutores compartieron contigo por un tiempo limitado.</p></div></div>
    {pyme.estado_verificacion !== 'aprobada' && <div className="alert-card"><div><strong>Tu clínica está: {pyme.estado_verificacion === 'pendiente' ? 'en verificación' : pyme.estado_verificacion}</strong><p>Los tutores solo pueden compartir fichas con veterinarias verificadas.</p></div></div>}
    <div className="clinical-summary"><div><strong>{list.length}</strong><span>Fichas con acceso vigente</span></div><div><strong>{alerts}</strong><span>Con alertas críticas</span></div><div><strong>{list.filter(porVencer).length}</strong><span>Accesos que vencen en 3 días</span></div></div>
    <div className="clinical-panel"><div className="chart-heading"><div><p className="eyebrow">PACIENTES</p><h2>Accesos otorgados</h2></div></div>
      {list.length > 0 && <div className="list-toolbar"><label className="search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar paciente</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca por mascota, tutor o raza" /></label><div className="category-tabs">{filtros.map(f => <button key={f} className={filtro === f ? 'category-tab active' : 'category-tab'} onClick={() => setFiltro(f)}>{f}</button>)}</div></div>}
      {shown.map(p => <div className="patient-row" key={p.id}><Photo src={p.foto_url} nombre={p.nombre} className="pet-photo small-photo" /><div><strong>{p.nombre}</strong><small>{p.tutor} · {p.permiso === 'escritura' ? 'lectura y registro' : 'solo lectura'} · acceso hasta {new Date(p.vigente_hasta).toLocaleDateString('es-CL')}{porVencer(p) ? ' (vence pronto)' : ''}</small></div><span className={p.alertas?.length ? 'clinical-alert' : 'clinical-ok'}>{p.alertas?.length ? p.alertas[0] : 'Sin alertas'}</span><button className="secondary" onClick={() => setOpen(p)}>Abrir ficha</button></div>)}
      {patients && list.length === 0 && <div className="empty-results">Aún no tienes fichas compartidas. El tutor puede otorgarte acceso desde la ficha de su mascota.</div>}
      {list.length > 0 && shown.length === 0 && <div className="empty-results">Ningún paciente coincide con la búsqueda.</div>}</div>
    {open && <FichaModal paciente={open} clinicaId={pyme.id} onClose={() => { setOpen(null); void loadPatients() }} />}
  </section>
}

const vacio = () => ({ tipo: 'atencion' as Tipo, fecha: new Date().toISOString().slice(0, 10), titulo: '', notas: '', proxima: '' })

function FichaModal({ paciente, clinicaId, onClose }: { paciente: Paciente; clinicaId: string; onClose: () => void }) {
  const [ficha, setFicha] = useState<FichaResp | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(vacio)
  const [editando, setEditando] = useState<Evento | null>(null)
  const [anulando, setAnulando] = useState<Evento | null>(null)
  const [motivo, setMotivo] = useState('')
  const load = useCallback(() => api<FichaResp>(`/mascotas/${paciente.id}/ficha`).then(setFicha).catch(e => setError(errorText(e))), [paciente.id])
  useEffect(() => { void load() }, [load])
  const escribe = paciente.permiso === 'escritura'

  // Cada escritura lleva la versión leída: si otra persona guardó antes, el API responde 409 y se recarga.
  const run = async (fn: (version: number) => Promise<unknown>) => {
    if (!ficha) return
    try { await fn(ficha.version); setError(''); setForm(vacio()); setEditando(null); setAnulando(null); setMotivo(''); await load() } catch (e) { setError(errorText(e)); if ((e as { status?: number }).status === 409) await load() }
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (form.titulo.trim().length < 3) { setError('Describe el registro'); return }
    const body = { fecha: form.fecha, titulo: form.titulo.trim(), ...(form.notas.trim() && { notas: form.notas.trim() }), ...(form.tipo === 'vacuna' && form.proxima && { proxima: form.proxima }) }
    void run(version => editando
      ? api(`/mascotas/${paciente.id}/registros/${editando.id}`, { method: 'PATCH', body: { version, ...body } })
      : api(`/mascotas/${paciente.id}/registros`, { method: 'POST', body: { version, tipo: form.tipo, ...body } }))
  }
  const anular = (event: React.FormEvent) => {
    event.preventDefault()
    if (motivo.trim().length < 5) { setError('Indica el motivo de la anulación (mínimo 5 caracteres)'); return }
    void run(version => api(`/mascotas/${paciente.id}/registros/${anulando!.id}/anular`, { method: 'POST', body: { version, motivo: motivo.trim() } }))
  }
  const editar = (e: Evento) => { setAnulando(null); setEditando(e); setForm({ tipo: e.tipo, fecha: e.fecha, titulo: e.titulo, notas: e.notas || '', proxima: e.proxima || '' }) }

  const d = ficha ? { ...emptyFicha(), ...ficha.datos_clinicos } : null
  return <div className="modal-backdrop"><article className="modal store-modal"><button className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">FICHA ÚNICA DE SALUD · {escribe ? 'LECTURA Y REGISTRO' : 'SOLO LECTURA'}</p><h2>{paciente.nombre}</h2><p className="muted">{paciente.especie}{paciente.raza ? ` · ${paciente.raza}` : ''} · Tutor: {paciente.tutor}</p>
    {!d && (error ? <p className="muted">{error}</p> : <Loading rows={1} />)}
    {d && <><div className="health-facts"><div><span>Alergias</span><strong>{d.alergias.length ? d.alergias.map(a => a.agente).join(', ') : 'No registradas'}</strong></div><div><span>Condiciones</span><strong>{d.condiciones.length ? d.condiciones.join(', ') : 'No registradas'}</strong></div><div><span>Medicamentos</span><strong>{d.medicamentos.length ? d.medicamentos.join(', ') : 'No registrados'}</strong></div></div>
      <div className="section-heading"><h3>Historial</h3></div>
      <div className="medical-timeline">{eventosDe(d).map((e, i) => {
        const propio = escribe && e.registrado_por === clinicaId && !e.anulado
        return <div className={e.anulado ? 'medical-event is-void' : 'medical-event'} key={e.id || `${e.tipo}${i}`}><div><span>{tipoLabel[e.tipo]}{e.fecha ? ` · ${e.fecha}` : ''}</span><strong>{e.titulo}</strong>{e.notas && <p>{e.notas}</p>}{e.proxima && <p>Próxima dosis: {fechaCorta(e.proxima)}</p>}<small className="event-author">{e.clinica ? `Registrado por ${e.clinica}` : 'Registrado por el tutor'}{e.anulado ? ` · Anulado: ${e.anulado.motivo}` : ''}</small></div>
          {propio && <div className="event-actions"><button className="text-button" onClick={() => editar(e)}><Pencil size={14} /> Editar</button><button className="text-button danger-text" onClick={() => { setEditando(null); setAnulando(e); setMotivo('') }}>Anular</button></div>}</div>
      })}</div>
      {anulando && <form className="void-form" onSubmit={anular} noValidate><p><strong>Anular «{anulando.titulo}»</strong><br /><small>El registro queda tachado con el motivo, visible para el tutor. No se borra.</small></p><label>Motivo<input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. registrado en la mascota equivocada" /></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setAnulando(null)}>Cancelar</button><button className="primary">Anular registro</button></div></form>}
      {escribe ? <form className="settings-form-grid" onSubmit={submit} noValidate>
        {editando && <p className="form-note">Editando «{editando.titulo}»</p>}
        <label>Tipo<select value={form.tipo} disabled={!!editando} onChange={e => setForm({ ...form, tipo: e.target.value as Tipo })}><option value="atencion">Atención</option><option value="vacuna">Vacuna</option><option value="tratamiento">Tratamiento</option></select></label><label>Fecha<input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></label><label>Registro<input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></label><label>Notas<input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></label>
        {form.tipo === 'vacuna' && <label>Próxima dosis (opcional)<input type="date" min={form.fecha} value={form.proxima} onChange={e => setForm({ ...form, proxima: e.target.value })} /></label>}
        <div className="form-actions-inline">{editando && <button type="button" className="secondary" onClick={() => { setEditando(null); setForm(vacio()) }}>Cancelar edición</button>}<button className="primary">{editando ? 'Guardar cambios' : 'Registrar en la ficha'}</button></div></form> : <p className="muted">El tutor te dio acceso de solo lectura.</p>}
    </>}
    {error && d && <p className="form-error" role="alert">{error}</p>}</article></div>
}
