import { useCallback, useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { api, clp, errorText, type Comuna, type ItemCatalogo } from './api'
import { Loading } from './media'
import { BusinessProfile } from './business-profile'
import { BusinessContacts } from './business-contacts'
import { catalogItemFormSchema, registerPymeSchema } from './validators'

export type MiPyme = { id: string; nombre_comercial: string; rubro: string; estado_verificacion: 'pendiente' | 'aprobada' | 'rechazada' | 'suspendida'; comuna_id: number; suscripcion: { estado: string; fin: string; plan: string; precio: number; max_items: number } | null }
type Planes = { id: number; nombre: string; precio_mensual_clp: number; max_items_catalogo: number }[]
type Metricas = { totales: Record<string, number>; por_dia: { dia: string; eventos: number }[]; items_mas_vistos: { nombre: string; vistas: number }[] }

const estadoTexto: Record<MiPyme['estado_verificacion'], string> = { pendiente: 'En verificación', aprobada: 'Verificada', rechazada: 'Rechazada', suspendida: 'Suspendida' }

function Metric({ label, value, trend }: { label: string; value: string; trend: string }) { return <div className="metric-card"><small>{label}</small><strong>{value}</strong><span>{trend}</span></div> }

// Carga la Pyme del usuario. Si no tiene, ofrece el alta (UC-12).
export function usePyme() {
  const [pymes, setPymes] = useState<MiPyme[] | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => { try { setPymes(await api<MiPyme[]>('/pymes/mias')); setError('') } catch (e) { setError(errorText(e)) } }, [])
  useEffect(() => { void reload() }, [reload])
  return { pyme: pymes?.[0] || null, loading: pymes === null, error, reload }
}

export function RegisterPyme({ veterinaria, onDone }: { veterinaria?: boolean; onDone: () => void }) {
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [planes, setPlanes] = useState<Planes>([])
  const [form, setForm] = useState({ nombre_comercial: '', rut_empresa: '', rubro: veterinaria ? 'veterinaria' : 'tienda', comuna_id: 1, direccion: '', telefono: '', whatsapp: '', descripcion: '', plan_id: 1, referencia_pago: '', latitud: '', longitud: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api<Comuna[]>('/comunas').then(setComunas).catch(() => undefined)
    api<Planes>('/planes').then(setPlanes).catch(() => setPlanes([{ id: 1, nombre: 'Básico', precio_mensual_clp: 15000, max_items_catalogo: 20 }, { id: 2, nombre: 'Plus', precio_mensual_clp: 25000, max_items_catalogo: 60 }]))
  }, [])
  const set = (key: string, value: string | number) => setForm({ ...form, [key]: value })
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = registerPymeSchema.safeParse({ ...form, latitud: form.latitud.trim() ? Number(form.latitud) : null, longitud: form.longitud.trim() ? Number(form.longitud) : null })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa los datos del negocio'); return }
    const d = parsed.data
    setBusy(true); setError('')
    try {
      await api('/pymes', { method: 'POST', body: { nombre_comercial: d.nombre_comercial, rut_empresa: d.rut_empresa, rubro: d.rubro, comuna_id: d.comuna_id, plan_id: d.plan_id, ...(d.direccion && { direccion: d.direccion }), ...(d.telefono && { telefono: d.telefono }), ...(d.whatsapp && { whatsapp: d.whatsapp }), ...(d.descripcion && { descripcion: d.descripcion }), ...(d.referencia_pago && { referencia_pago: d.referencia_pago }), ...(d.latitud !== null && { latitud: d.latitud }), ...(d.longitud !== null && { longitud: d.longitud }) } })
      onDone()
    } catch (e) { setError(errorText(e)); setBusy(false) }
  }
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">ALTA DE NEGOCIO</p><h1>Registra tu negocio</h1><p className="muted">Tu perfil se publica en el directorio cuando el equipo de PetSuite verifique el negocio y tu pago por transferencia. Sin comisiones por venta.</p></div></div>
    <form className="settings-card" onSubmit={submit} noValidate><div className="settings-form-grid">
      <label>Nombre comercial<input value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)} /></label>
      <label>RUT de la empresa<input value={form.rut_empresa} onChange={e => set('rut_empresa', e.target.value)} placeholder="76123456-7" /></label>
      {!veterinaria && <label>Rubro<select value={form.rubro} onChange={e => set('rubro', e.target.value)}><option value="tienda">Tienda</option><option value="peluqueria">Peluquería</option><option value="otro">Otro servicio Pet-Care</option></select></label>}
      <label>Comuna<select value={form.comuna_id} onChange={e => set('comuna_id', Number(e.target.value))}>{comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
      <label>Dirección<input value={form.direccion} onChange={e => set('direccion', e.target.value)} /></label>
      <label>Teléfono<input value={form.telefono} onChange={e => set('telefono', e.target.value)} /></label>
      <label>WhatsApp<input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="56912345678" /></label>
      <label>Latitud (mapa, opcional)<input value={form.latitud} onChange={e => set('latitud', e.target.value)} placeholder="-40.5735" /></label>
      <label>Longitud (mapa, opcional)<input value={form.longitud} onChange={e => set('longitud', e.target.value)} placeholder="-73.1335" /></label>
      <label>Plan de tarifa plana<select value={form.plan_id} onChange={e => set('plan_id', Number(e.target.value))}>{planes.map(p => <option key={p.id} value={p.id}>{p.nombre} · {clp(p.precio_mensual_clp)}/mes · hasta {p.max_items_catalogo} ítems</option>)}</select></label>
      <label>Referencia de la transferencia<input value={form.referencia_pago} onChange={e => set('referencia_pago', e.target.value)} placeholder="N.º o glosa" /></label>
    </div>
      <label className="composer-label">Descripción<textarea rows={3} maxLength={1000} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} /></label>
      {error && <div className="form-error" role="alert">{error}</div>}<div className="settings-actions"><button className="primary" disabled={busy}>{busy ? 'Enviando...' : 'Enviar para verificación'}</button></div></form></section>
}

function StatusBanner({ pyme }: { pyme: MiPyme }) {
  if (pyme.estado_verificacion === 'aprobada') return null
  return <div className="alert-card"><div className="alert-icon"><ShoppingBag size={22} /></div><div><strong>Tu negocio está: {estadoTexto[pyme.estado_verificacion]}</strong><p>{pyme.estado_verificacion === 'pendiente' ? 'Revisaremos tus datos y tu pago. Mientras tanto puedes preparar tu catálogo; se publicará al aprobarse.' : 'Contacta al equipo PetSuite para revisar tu solicitud.'}</p></div></div>
}

export function BusinessArea({ active }: { active: string }) {
  const { pyme, loading, error, reload } = usePyme()
  if (loading) return <section className="page">{error ? <p className="muted">{error}</p> : <Loading />}</section>
  if (!pyme) return <RegisterPyme onDone={reload} />
  if (active === 'business-profile') return <BusinessProfile pyme={pyme} onSaved={reload} />
  if (active === 'catalog') return <Catalog pyme={pyme} />
  if (active === 'contacts') return <BusinessContacts pyme={pyme} />
  if (active === 'metrics') return <MetricsView pyme={pyme} />
  if (active === 'subscription') return <Subscription pyme={pyme} />
  return <Overview pyme={pyme} />
}

function Overview({ pyme }: { pyme: MiPyme }) {
  const [m, setM] = useState<Metricas | null>(null)
  useEffect(() => { api<Metricas>(`/pymes/${pyme.id}/metricas`).then(setM).catch(() => setM(null)) }, [pyme.id])
  const t = m?.totales || {}
  return <section className="page business-page"><div className="business-welcome"><div><p className="eyebrow">TU NEGOCIO EN PETSUITE</p><h1>{pyme.nombre_comercial}</h1><p>Perfil, catálogo y métricas de tu vitrina en el directorio.</p></div><ShoppingBag size={38} strokeWidth={1.5} /></div>
    <StatusBanner pyme={pyme} />
    <div className="business-stats"><Metric label="Visitas al perfil" value={String(t.visita_perfil || 0)} trend="Últimos 30 días" /><Metric label="Vistas de productos" value={String(t.vista_item || 0)} trend="Últimos 30 días" /><Metric label="Clics de contacto" value={String((t.clic_contacto || 0) + (t.clic_whatsapp || 0))} trend="Últimos 30 días" /></div>
    <div className="business-activity"><p className="eyebrow">SUSCRIPCIÓN</p><h2>{pyme.suscripcion ? `Plan ${pyme.suscripcion.plan} · ${pyme.suscripcion.estado}` : 'Sin suscripción'}</h2><p>{pyme.suscripcion ? `Vigente hasta el ${new Date(pyme.suscripcion.fin).toLocaleDateString('es-CL')}. Tarifa plana de ${clp(pyme.suscripcion.precio)} al mes, sin comisiones por venta.` : 'Registra tu pago para activar la publicación.'}</p></div></section>
}

function Catalog({ pyme }: { pyme: MiPyme }) {
  const [items, setItems] = useState<ItemCatalogo[] | null>(null)
  const [draft, setDraft] = useState({ tipo: 'producto' as 'producto' | 'servicio', nombre: '', descripcion: '', precio: '' })
  const [editing, setEditing] = useState<ItemCatalogo | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<ItemCatalogo[]>(`/pymes/${pyme.id}/catalogo`).then(setItems).catch(e => setError(errorText(e))), [pyme.id])
  useEffect(() => { void load() }, [load])
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    const parsed = catalogItemFormSchema.safeParse(draft)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa el ítem'); return }
    const precio = parsed.data.precio ? Number(parsed.data.precio) : undefined
    try {
      await api(`/pymes/${pyme.id}/catalogo${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PUT' : 'POST', body: { tipo: parsed.data.tipo, nombre: parsed.data.nombre, descripcion: parsed.data.descripcion, ...(precio !== undefined && { precio_referencial_clp: precio }), ...(editing && { disponible: editing.disponible }) } })
      setDraft({ tipo: 'producto', nombre: '', descripcion: '', precio: '' }); setEditing(null); await load()
    } catch (e) { setError(errorText(e)) }
  }
  const edit = (item: ItemCatalogo) => { setEditing(item); setDraft({ tipo: item.tipo, nombre: item.nombre, descripcion: item.descripcion || '', precio: item.precio_referencial_clp == null ? '' : String(item.precio_referencial_clp) }); setError('') }
  const toggle = async (item: ItemCatalogo) => { try { await api(`/pymes/${pyme.id}/catalogo/${item.id}`, { method: 'PUT', body: { tipo: item.tipo, nombre: item.nombre, descripcion: item.descripcion ?? undefined, precio_referencial_clp: item.precio_referencial_clp ?? undefined, disponible: !item.disponible } }); await load() } catch (e) { setError(errorText(e)) } }
  const remove = async (item: ItemCatalogo) => { if (!window.confirm(`¿Eliminar «${item.nombre}» del catálogo?`)) return; try { await api(`/pymes/${pyme.id}/catalogo/${item.id}`, { method: 'DELETE' }); if (editing?.id === item.id) setEditing(null); await load() } catch (e) { setError(errorText(e)) } }
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">GESTIÓN B2B</p><h1>Catálogo</h1><p className="muted">Productos y servicios con precio referencial, visibles en tu perfil del directorio.{pyme.suscripcion ? ` Tu plan permite hasta ${pyme.suscripcion.max_items} ítems.` : ''}</p></div></div>
    <StatusBanner pyme={pyme} />
    <form className="catalog-form business-catalog-form" onSubmit={submit} noValidate><select aria-label="Tipo" value={draft.tipo} onChange={e => setDraft({ ...draft, tipo: e.target.value as 'producto' | 'servicio' })}><option value="producto">Producto</option><option value="servicio">Servicio</option></select><input aria-label="Nombre" value={draft.nombre} onChange={e => setDraft({ ...draft, nombre: e.target.value })} placeholder="Nombre del producto o servicio" /><input aria-label="Descripción" value={draft.descripcion} onChange={e => setDraft({ ...draft, descripcion: e.target.value })} placeholder="Descripción" /><input aria-label="Precio referencial" inputMode="numeric" value={draft.precio} onChange={e => setDraft({ ...draft, precio: e.target.value })} placeholder="Precio en pesos" /><div className="business-catalog-actions"><button className="primary">{editing ? 'Guardar' : 'Agregar'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setDraft({ tipo: 'producto', nombre: '', descripcion: '', precio: '' }); setError('') }}>Cancelar</button>}</div></form>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="catalog-list">{items?.map(item => <div className="catalog-item" key={item.id}><div className="catalog-item-main"><strong>{item.nombre}</strong><p>{item.tipo === 'servicio' ? 'Servicio' : 'Producto'}{item.descripcion ? ` · ${item.descripcion}` : ''}</p><b>{clp(item.precio_referencial_clp)}</b></div><div className="business-catalog-row-actions"><button className={item.disponible ? 'toggle on' : 'toggle'} aria-label={`Mostrar u ocultar ${item.nombre}`} onClick={() => toggle(item)} /><button className="text-button" onClick={() => edit(item)}>Editar</button><button className="text-button" onClick={() => void remove(item)}>Eliminar</button></div></div>)}{items && items.length === 0 && <div className="empty-results">Todavía no tienes ítems en tu catálogo.</div>}</div></section>
}

function MetricsView({ pyme }: { pyme: MiPyme }) {
  const [m, setM] = useState<Metricas | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<Metricas>(`/pymes/${pyme.id}/metricas`).then(setM).catch(e => setError(errorText(e))) }, [pyme.id])
  if (!m) return <section className="page role-page">{error ? <p className="muted">{error}</p> : <Loading />}</section>
  const t = m.totales, max = Math.max(1, ...m.por_dia.map(d => d.eventos))
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">GESTIÓN B2B</p><h1>Panel de métricas</h1><p className="muted">Cómo te encuentra la comunidad. Últimos 30 días.</p></div></div>
    <div className="metric-grid"><Metric label="Visitas al perfil" value={String(t.visita_perfil || 0)} trend="Vistas de tu ficha" /><Metric label="Vistas de ítems" value={String(t.vista_item || 0)} trend="Interés en tu catálogo" /><Metric label="Clics de contacto" value={String((t.clic_contacto || 0) + (t.clic_whatsapp || 0))} trend="Llamadas y WhatsApp" /></div>
    <article className="admin-chart-card"><div className="chart-heading"><div><p className="eyebrow">ACTIVIDAD</p><h2>Eventos por día</h2></div></div>{m.por_dia.length ? <div className="bar-chart" aria-label="Eventos por día">{m.por_dia.map(d => <div className="bar-column" key={d.dia}><span style={{ height: `${Math.max(6, (d.eventos / max) * 100)}%` }} /><small>{new Date(d.dia).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</small></div>)}</div> : <p className="muted">Aún no hay actividad registrada.</p>}</article>
    <div className="role-panel"><p className="eyebrow">MÁS VISTOS</p><h2>Ítems con más interés</h2><div className="role-list">{m.items_mas_vistos.length ? m.items_mas_vistos.map(i => <div key={i.nombre}><span className="list-dot" /><strong>{i.nombre}</strong><small>{i.vistas} {i.vistas === 1 ? 'vista' : 'vistas'}</small></div>) : <div><span className="list-dot soft" /><strong>Sin vistas de ítems todavía</strong></div>}</div></div></section>
}

function Subscription({ pyme }: { pyme: MiPyme }) {
  const [rows, setRows] = useState<{ id: string; estado: string; inicio: string; fin: string; plan: string; precio_mensual_clp: number; pagos: { id: string; monto_clp: number; estado: string; referencia: string | null }[] | null }[] | null>(null)
  useEffect(() => { api<NonNullable<typeof rows>>(`/pymes/${pyme.id}/suscripcion`).then(setRows).catch(() => setRows([])) }, [pyme.id])
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">GESTIÓN B2B</p><h1>Suscripción</h1><p className="muted">Tarifa plana mensual, sin comisiones por venta. En esta versión el pago es por transferencia y lo verifica el equipo PetSuite.</p></div></div>
    <StatusBanner pyme={pyme} />
    <div className="catalog-list">{rows?.map(s => <div className="catalog-item" key={s.id}><div><strong>Plan {s.plan} · {clp(s.precio_mensual_clp)} al mes</strong><p>{new Date(s.inicio).toLocaleDateString('es-CL')} al {new Date(s.fin).toLocaleDateString('es-CL')}</p>{s.pagos?.map(p => <small key={p.id}>Pago {clp(p.monto_clp)} · {p.estado}{p.referencia ? ` · ${p.referencia}` : ''}</small>)}</div><span className={`user-status ${s.estado === 'activa' ? 'activo' : 'suspendido'}`}>{s.estado}</span></div>)}{rows && rows.length === 0 && <div className="empty-results">No hay suscripciones registradas.</div>}</div></section>
}
