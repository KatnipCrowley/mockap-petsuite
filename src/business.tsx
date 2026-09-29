import { useCallback, useEffect, useState } from 'react'
import { Pencil, ShoppingBag, Tag, X } from 'lucide-react'
import { api, clp, errorText, fechaCorta, hoy, ofertaVigente, type Comuna, type ItemCatalogo, type PymeResumen } from './api'
import { Loading } from './media'

export type MiPyme = { id: string; nombre_comercial: string; rubro: string; estado_verificacion: 'pendiente' | 'aprobada' | 'rechazada' | 'suspendida'; comuna_id: number; solicitud_pendiente?: boolean; suscripcion: { estado: string; fin: string; plan: string; plan_id: number; precio: number; max_items: number } | null }
type Planes = { id: number; nombre: string; precio_mensual_clp: number; max_items_catalogo: number }[]
type Totales = Record<'visita_perfil' | 'vista_item' | 'clic_contacto' | 'clic_whatsapp', number>
type Metricas = { totales: Totales; anteriores: Totales; ofertas_vigentes: number; por_dia: { dia: string; eventos: number }[]; items_mas_vistos: { nombre: string; vistas: number }[] }

const estadoTexto: Record<MiPyme['estado_verificacion'], string> = { pendiente: 'En verificación', aprobada: 'Verificada', rechazada: 'Rechazada', suspendida: 'Suspendida' }
const planesRespaldo: Planes = [{ id: 1, nombre: 'Básico', precio_mensual_clp: 15000, max_items_catalogo: 20 }, { id: 2, nombre: 'Plus', precio_mensual_clp: 25000, max_items_catalogo: 60 }]

function Metric({ label, value, trend }: { label: string; value: string; trend: string }) { return <div className="metric-card"><small>{label}</small><strong>{value}</strong><span>{trend}</span></div> }

// Diferencia contra los 30 días anteriores, en palabras.
const comparar = (actual: number, previo: number) => {
  if (!actual && !previo) return 'Sin actividad en ambos periodos'
  const d = actual - previo
  return d === 0 ? 'Igual que los 30 días anteriores' : `${d > 0 ? '+' : ''}${d} frente a los 30 días anteriores`
}

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
    api<Planes>('/planes').then(setPlanes).catch(() => setPlanes(planesRespaldo))
  }, [])
  const set = (key: string, value: string | number) => setForm({ ...form, [key]: value })
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.nombre_comercial.trim().length < 2) { setError('Ingresa el nombre de tu negocio'); return }
    const lat = form.latitud ? Number(form.latitud) : undefined, lng = form.longitud ? Number(form.longitud) : undefined
    setBusy(true); setError('')
    try {
      await api('/pymes', { method: 'POST', body: { nombre_comercial: form.nombre_comercial.trim(), rut_empresa: form.rut_empresa.trim(), rubro: form.rubro, comuna_id: form.comuna_id, plan_id: form.plan_id, ...(form.direccion && { direccion: form.direccion }), ...(form.telefono && { telefono: form.telefono }), ...(form.whatsapp && { whatsapp: form.whatsapp }), ...(form.descripcion && { descripcion: form.descripcion }), ...(form.referencia_pago && { referencia_pago: form.referencia_pago }), ...(lat !== undefined && !Number.isNaN(lat) && { latitud: lat }), ...(lng !== undefined && !Number.isNaN(lng) && { longitud: lng }) } })
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
  if (active === 'catalog') return <Catalog pyme={pyme} />
  if (active === 'business-profile') return <BusinessProfile pyme={pyme} />
  if (active === 'metrics') return <MetricsView pyme={pyme} />
  if (active === 'subscription') return <Subscription pyme={pyme} onChange={reload} />
  return <Overview pyme={pyme} />
}

function Overview({ pyme }: { pyme: MiPyme }) {
  const [m, setM] = useState<Metricas | null>(null)
  useEffect(() => { api<Metricas>(`/pymes/${pyme.id}/metricas`).then(setM).catch(() => setM(null)) }, [pyme.id])
  const t = m?.totales, a = m?.anteriores
  return <section className="page business-page"><div className="business-welcome"><div><p className="eyebrow">TU NEGOCIO EN PETSUITE</p><h1>{pyme.nombre_comercial}</h1><p>Perfil, catálogo y métricas de tu vitrina en el directorio.</p></div><ShoppingBag size={38} strokeWidth={1.5} /></div>
    <StatusBanner pyme={pyme} />
    <div className="business-stats"><Metric label="Visitas al perfil" value={String(t?.visita_perfil ?? 0)} trend={t && a ? comparar(t.visita_perfil, a.visita_perfil) : 'Últimos 30 días'} /><Metric label="Vistas de productos" value={String(t?.vista_item ?? 0)} trend={t && a ? comparar(t.vista_item, a.vista_item) : 'Últimos 30 días'} /><Metric label="Clics de contacto" value={String((t?.clic_contacto ?? 0) + (t?.clic_whatsapp ?? 0))} trend={t && a ? comparar(t.clic_contacto + t.clic_whatsapp, a.clic_contacto + a.clic_whatsapp) : 'Últimos 30 días'} /></div>
    <div className="business-activity"><p className="eyebrow">SUSCRIPCIÓN</p><h2>{pyme.suscripcion ? `Plan ${pyme.suscripcion.plan} · ${pyme.suscripcion.estado}` : 'Sin suscripción'}</h2><p>{pyme.suscripcion ? `Vigente hasta el ${new Date(pyme.suscripcion.fin).toLocaleDateString('es-CL')}. Tarifa plana de ${clp(pyme.suscripcion.precio)} al mes, sin comisiones por venta.` : 'Registra tu pago para activar la publicación.'}{pyme.solicitud_pendiente ? ' Tienes una renovación o cambio de plan en revisión.' : ''}</p>{m && m.ofertas_vigentes > 0 && <p><span className="chip chip-warn"><Tag size={13} /> {m.ofertas_vigentes} {m.ofertas_vigentes === 1 ? 'oferta vigente' : 'ofertas vigentes'}</span></p>}</div></section>
}

// ---------- Catálogo ----------
const estadoOferta = (item: ItemCatalogo) => {
  const o = item.oferta
  if (!o) return null
  if (ofertaVigente(o)) return <span className="chip chip-warn"><Tag size={13} /> Oferta {clp(o.precio_clp)} hasta el {fechaCorta(o.hasta)}</span>
  if (o.desde > hoy()) return <span className="chip chip-info">Oferta programada desde el {fechaCorta(o.desde)}</span>
  return <span className="chip">Oferta terminada</span>
}

function Catalog({ pyme }: { pyme: MiPyme }) {
  const [items, setItems] = useState<ItemCatalogo[] | null>(null)
  const [draft, setDraft] = useState({ tipo: 'producto' as 'producto' | 'servicio', nombre: '', categoria: '', precio: '' })
  const [categoria, setCategoria] = useState('Todas')
  const [editing, setEditing] = useState<ItemCatalogo | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<ItemCatalogo[]>(`/pymes/${pyme.id}/catalogo`).then(setItems).catch(e => setError(errorText(e))), [pyme.id])
  useEffect(() => { void load() }, [load])
  const categorias = [...new Set((items || []).map(i => i.categoria).filter((c): c is string => !!c))].sort()
  const add = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    if (draft.nombre.trim().length < 2) { setError('Ingresa el nombre del ítem'); return }
    const precio = draft.precio.trim() ? Number(draft.precio.replace(/\D/g, '')) : undefined
    try { await api(`/pymes/${pyme.id}/catalogo`, { method: 'POST', body: { tipo: draft.tipo, nombre: draft.nombre.trim(), ...(draft.categoria.trim() && { categoria: draft.categoria.trim() }), ...(precio !== undefined && { precio_referencial_clp: precio }) } }); setDraft({ ...draft, nombre: '', precio: '' }); await load() } catch (e) { setError(errorText(e)) }
  }
  // PUT conserva los campos omitidos: basta con enviar lo que cambia.
  const update = async (item: ItemCatalogo, changes: Partial<ItemCatalogo>) => { try { await api(`/pymes/${pyme.id}/catalogo/${item.id}`, { method: 'PUT', body: { tipo: item.tipo, nombre: item.nombre, ...changes } }); await load() } catch (e) { setError(errorText(e)) } }
  const remove = async (item: ItemCatalogo) => { if (!window.confirm(`¿Eliminar «${item.nombre}» del catálogo?`)) return; try { await api(`/pymes/${pyme.id}/catalogo/${item.id}`, { method: 'DELETE' }); await load() } catch (e) { setError(errorText(e)) } }
  const shown = (items || []).filter(i => categoria === 'Todas' || (categoria === 'Sin categoría' ? !i.categoria : i.categoria === categoria))
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">GESTIÓN B2B</p><h1>Catálogo</h1><p className="muted">Productos y servicios con precio referencial, visibles en tu perfil del directorio.{pyme.suscripcion ? ` Tu plan permite hasta ${pyme.suscripcion.max_items} ítems (usas ${items?.length ?? 0}).` : ''}</p></div></div>
    <StatusBanner pyme={pyme} />
    <form className="catalog-form" onSubmit={add} noValidate><select aria-label="Tipo" value={draft.tipo} onChange={e => setDraft({ ...draft, tipo: e.target.value as 'producto' | 'servicio' })}><option value="producto">Producto</option><option value="servicio">Servicio</option></select><input aria-label="Nombre" value={draft.nombre} onChange={e => setDraft({ ...draft, nombre: e.target.value })} placeholder="Nombre del producto o servicio" /><input aria-label="Categoría" list="catalog-categories" value={draft.categoria} onChange={e => setDraft({ ...draft, categoria: e.target.value })} placeholder="Categoría (ej. Alimentos)" /><input aria-label="Precio referencial" inputMode="numeric" value={draft.precio} onChange={e => setDraft({ ...draft, precio: e.target.value })} placeholder="Precio referencial" /><button className="primary">Agregar</button></form>
    <datalist id="catalog-categories">{categorias.map(c => <option key={c} value={c} />)}</datalist>
    {error && <p className="form-error" role="alert">{error}</p>}
    {categorias.length > 0 && <div className="category-tabs">{['Todas', ...categorias, ...((items || []).some(i => !i.categoria) ? ['Sin categoría'] : [])].map(c => <button key={c} className={categoria === c ? 'category-tab active' : 'category-tab'} onClick={() => setCategoria(c)}>{c}</button>)}</div>}
    {!items && !error && <Loading />}
    <div className="catalog-list">{shown.map(item => <div className="catalog-item" key={item.id}><div className="catalog-item-main"><strong>{item.nombre}</strong><p>{item.tipo === 'servicio' ? 'Servicio' : 'Producto'}{item.categoria ? ` · ${item.categoria}` : ''}{item.descripcion ? ` · ${item.descripcion}` : ''}</p><b>{clp(item.precio_referencial_clp)}</b><div className="chip-row">{!item.disponible && <span className="chip">Oculto</span>}{item.sin_stock && <span className="chip chip-alert">Sin stock</span>}{estadoOferta(item)}</div></div>
      <div className="catalog-item-actions"><button className={item.disponible ? 'toggle on' : 'toggle'} aria-label={`Mostrar u ocultar ${item.nombre}`} title={item.disponible ? 'Visible en el directorio' : 'Oculto'} onClick={() => update(item, { disponible: !item.disponible })} /><button className="secondary" onClick={() => setEditing(item)}><Pencil size={15} /> Editar</button><button className="text-button" onClick={() => remove(item)}>Eliminar</button></div></div>)}
      {items && shown.length === 0 && <div className="empty-results">{items.length ? 'No hay ítems en esta categoría.' : 'Todavía no tienes ítems en tu catálogo.'}</div>}</div>
    {editing && <ItemModal item={editing} categorias={categorias} onClose={() => setEditing(null)} onSave={async changes => { await api(`/pymes/${pyme.id}/catalogo/${editing.id}`, { method: 'PUT', body: changes }); setEditing(null); await load() }} />}
  </section>
}

function ItemModal({ item, categorias, onClose, onSave }: { item: ItemCatalogo; categorias: string[]; onClose: () => void; onSave: (changes: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({
    tipo: item.tipo, nombre: item.nombre, descripcion: item.descripcion || '', categoria: item.categoria || '', precio: item.precio_referencial_clp != null ? String(item.precio_referencial_clp) : '',
    sin_stock: !!item.sin_stock, en_oferta: !!item.oferta, oferta_precio: item.oferta ? String(item.oferta.precio_clp) : '', desde: item.oferta?.desde || hoy(), hasta: item.oferta?.hasta || '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const num = (v: string) => v.trim() ? Number(v.replace(/\D/g, '')) : null
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.nombre.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres'); return }
    const precio = num(form.precio), ofertaPrecio = num(form.oferta_precio)
    if (form.en_oferta && (ofertaPrecio == null || !form.hasta)) { setError('Completa el precio y la fecha de término de la oferta'); return }
    setBusy(true); setError('')
    try {
      await onSave({ tipo: form.tipo, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, categoria: form.categoria.trim() || null, precio_referencial_clp: precio, sin_stock: form.sin_stock, oferta: form.en_oferta ? { precio_clp: ofertaPrecio, desde: form.desde, hasta: form.hasta } : null })
    } catch (e) { setError(errorText(e)); setBusy(false) }
  }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit} noValidate><button type="button" className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="eyebrow">CATÁLOGO</p><h2>Editar ítem</h2><p className="muted">Los precios son referenciales: la compra se coordina directamente con tu negocio.</p>
    <div className="form-grid"><label>Tipo<select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as 'producto' | 'servicio' })}><option value="producto">Producto</option><option value="servicio">Servicio</option></select></label><label>Nombre<input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label><label>Categoría<input list="item-categories" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></label><label>Precio referencial<input inputMode="numeric" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} /></label></div>
    <datalist id="item-categories">{categorias.map(c => <option key={c} value={c} />)}</datalist>
    <label className="composer-label">Descripción<textarea rows={3} maxLength={1000} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></label>
    <label className="check-row"><input type="checkbox" checked={form.sin_stock} onChange={e => setForm({ ...form, sin_stock: e.target.checked })} /> Sin stock por ahora (se muestra en el directorio, marcado)</label>
    <label className="check-row"><input type="checkbox" checked={form.en_oferta} onChange={e => setForm({ ...form, en_oferta: e.target.checked })} /> Publicar como oferta destacada</label>
    {form.en_oferta && <div className="form-grid"><label>Precio de oferta<input inputMode="numeric" value={form.oferta_precio} onChange={e => setForm({ ...form, oferta_precio: e.target.value })} /></label><label>Desde<input type="date" value={form.desde} onChange={e => setForm({ ...form, desde: e.target.value })} /></label><label>Hasta<input type="date" min={form.desde} value={form.hasta} onChange={e => setForm({ ...form, hasta: e.target.value })} /></label></div>}
    {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar cambios'}</button></div></form></div>
}

// ---------- Perfil del negocio (también lo usa la clínica) ----------
type Perfil = PymeResumen & { rut_empresa: string; estado_verificacion: string }

export function BusinessProfile({ pyme }: { pyme: { id: string; nombre_comercial: string } }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [form, setForm] = useState({ descripcion: '', direccion: '', telefono: '', whatsapp: '', lunVie: '', sab: '', dom: '', servicios: '', latitud: '', longitud: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api<Perfil>(`/pymes/${pyme.id}/perfil`).then(p => {
      setPerfil(p)
      setForm({ descripcion: p.descripcion || '', direccion: p.direccion || '', telefono: p.telefono || '', whatsapp: p.whatsapp || '', lunVie: p.horario['lun-vie'] || '', sab: p.horario.sab || '', dom: p.horario.dom || '', servicios: (p.servicios || []).join(', '), latitud: p.latitud || '', longitud: p.longitud || '' })
    }).catch(e => setError(errorText(e)))
  }, [pyme.id])
  const set = (key: keyof typeof form, value: string) => { setForm({ ...form, [key]: value }); setSaved(false) }
  const coord = (v: string) => v.trim() ? Number(v.replace(',', '.')) : null
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const lat = coord(form.latitud), lng = coord(form.longitud)
    if ((lat != null && Number.isNaN(lat)) || (lng != null && Number.isNaN(lng))) { setError('Latitud y longitud deben ser números, por ejemplo -40.5735'); return }
    const servicios = form.servicios.split(',').map(s => s.trim()).filter(Boolean)
    setBusy(true); setError('')
    try {
      await api(`/pymes/${pyme.id}/perfil`, { method: 'PATCH', body: { descripcion: form.descripcion, direccion: form.direccion, telefono: form.telefono, whatsapp: form.whatsapp, horario: { 'lun-vie': form.lunVie, sab: form.sab, dom: form.dom }, servicios, latitud: lat, longitud: lng } })
      setSaved(true)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  if (!perfil) return <section className="page role-page">{error ? <p className="form-error" role="alert">{error}</p> : <Loading rows={2} />}</section>
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">PERFIL PÚBLICO</p><h1>{perfil.rubro === 'veterinaria' ? 'Perfil de la clínica' : 'Perfil del negocio'}</h1><p className="muted">Así te encuentran los tutores en el directorio Pet-Care.</p></div></div>
    <div className="profile-identity"><div><small>Nombre comercial</small><strong>{perfil.nombre_comercial}</strong></div><div><small>RUT</small><strong>{perfil.rut_empresa}</strong></div><div><small>Comuna</small><strong>{perfil.comuna}</strong></div><p className="muted">El nombre, el RUT y el rubro los verifica el equipo PetSuite. Para cambiarlos, contáctanos.</p></div>
    <form className="settings-card" onSubmit={submit} noValidate>
      <label className="composer-label">Descripción<textarea rows={3} maxLength={1000} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Qué ofreces y qué te distingue" /></label>
      <label className="composer-label">Servicios destacados (separados por comas, máximo 12)<input value={form.servicios} onChange={e => set('servicios', e.target.value)} placeholder={perfil.rubro === 'veterinaria' ? 'Consulta general, Vacunación, Urgencias' : 'Despacho a domicilio, Asesoría'} /></label>
      <div className="settings-form-grid">
        <label>Dirección<input value={form.direccion} onChange={e => set('direccion', e.target.value)} /></label>
        <label>Teléfono<input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+56 64 123 4567" /></label>
        <label>WhatsApp<input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="56912345678" /></label>
        <label>Horario lunes a viernes<input value={form.lunVie} onChange={e => set('lunVie', e.target.value)} placeholder="09:00-18:00" /></label>
        <label>Horario sábado<input value={form.sab} onChange={e => set('sab', e.target.value)} placeholder="10:00-14:00 (vacío si cierra)" /></label>
        <label>Horario domingo<input value={form.dom} onChange={e => set('dom', e.target.value)} placeholder="Vacío si cierra" /></label>
        <label>Latitud (mapa)<input value={form.latitud} onChange={e => set('latitud', e.target.value)} placeholder="-40.5735" /></label>
        <label>Longitud (mapa)<input value={form.longitud} onChange={e => set('longitud', e.target.value)} placeholder="-73.1335" /></label>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="settings-actions"><span className="save-message">{saved ? 'Perfil actualizado en el directorio' : ''}</span><button className="primary" disabled={busy}>{busy ? 'Guardando...' : 'Guardar perfil'}</button></div></form></section>
}

// ---------- Métricas ----------
function MetricsView({ pyme }: { pyme: MiPyme }) {
  const [m, setM] = useState<Metricas | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<Metricas>(`/pymes/${pyme.id}/metricas`).then(setM).catch(e => setError(errorText(e))) }, [pyme.id])
  if (!m) return <section className="page role-page">{error ? <p className="muted">{error}</p> : <Loading />}</section>
  const t = m.totales, a = m.anteriores, max = Math.max(1, ...m.por_dia.map(d => d.eventos))
  const contactos = t.clic_contacto + t.clic_whatsapp
  const canales = [['Llamadas', t.clic_contacto, a.clic_contacto], ['WhatsApp', t.clic_whatsapp, a.clic_whatsapp]] as const
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">GESTIÓN B2B</p><h1>Panel de métricas</h1><p className="muted">Cómo te encuentra la comunidad. Últimos 30 días comparados con los 30 anteriores.</p></div></div>
    <div className="metric-grid"><Metric label="Visitas al perfil" value={String(t.visita_perfil)} trend={comparar(t.visita_perfil, a.visita_perfil)} /><Metric label="Vistas de ítems" value={String(t.vista_item)} trend={comparar(t.vista_item, a.vista_item)} /><Metric label="Clics de contacto" value={String(contactos)} trend={comparar(contactos, a.clic_contacto + a.clic_whatsapp)} /></div>
    <article className="admin-chart-card"><div className="chart-heading"><div><p className="eyebrow">ACTIVIDAD</p><h2>Eventos por día</h2></div></div>{m.por_dia.length ? <div className="bar-chart" aria-label="Eventos por día">{m.por_dia.map(d => <div className="bar-column" key={d.dia}><span style={{ height: `${Math.max(6, (d.eventos / max) * 100)}%` }} /><small>{new Date(d.dia).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</small></div>)}</div> : <p className="muted">Aún no hay actividad registrada.</p>}</article>
    <div className="metrics-split">
      <div className="role-panel"><p className="eyebrow">CONTACTO POR CANAL</p><h2>Cómo te escriben</h2><div className="channel-list">{canales.map(([label, n, prev]) => <div key={label}><div className="channel-head"><strong>{label}</strong><small>{n} · {comparar(n, prev)}</small></div><div className="channel-bar" aria-hidden="true"><span style={{ width: `${contactos ? (n / contactos) * 100 : 0}%` }} /></div></div>)}</div>{!contactos && <p className="muted">Publica tu teléfono y WhatsApp en el perfil para recibir contactos.</p>}</div>
      <div className="role-panel"><p className="eyebrow">MÁS VISTOS</p><h2>Ítems con más interés</h2><div className="role-list">{m.items_mas_vistos.length ? m.items_mas_vistos.map(i => <div key={i.nombre}><span className="list-dot" /><strong>{i.nombre}</strong><small>{i.vistas} {i.vistas === 1 ? 'vista' : 'vistas'}</small></div>) : <div><span className="list-dot soft" /><strong>Sin vistas de ítems todavía</strong></div>}</div>{m.ofertas_vigentes > 0 && <p className="muted">Tienes {m.ofertas_vigentes} {m.ofertas_vigentes === 1 ? 'oferta vigente' : 'ofertas vigentes'} destacadas en el directorio.</p>}</div>
    </div></section>
}

// ---------- Suscripción ----------
type Periodo = { id: string; estado: string; inicio: string; fin: string; plan: string; precio_mensual_clp: number; pagos: { id: string; monto_clp: number; estado: string; referencia: string | null }[] | null }
const periodoTexto: Record<string, string> = { activa: 'Activa', pendiente: 'En revisión', vencida: 'Vencida', cancelada: 'Cancelada' }

function Subscription({ pyme, onChange }: { pyme: MiPyme; onChange: () => Promise<void> }) {
  const [rows, setRows] = useState<Periodo[] | null>(null)
  const [planes, setPlanes] = useState<Planes>([])
  const [form, setForm] = useState({ plan_id: pyme.suscripcion?.plan_id || 1, referencia: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const load = useCallback(() => api<Periodo[]>(`/pymes/${pyme.id}/suscripcion`).then(setRows).catch(() => setRows([])), [pyme.id])
  useEffect(() => { void load(); api<Planes>('/planes').then(setPlanes).catch(() => setPlanes(planesRespaldo)) }, [load])
  const pendiente = rows?.some(r => r.estado === 'pendiente')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setDone('')
    if (form.referencia.trim().length < 3) { setError('Ingresa la referencia de la transferencia'); return }
    try {
      const r = await api<{ inicio: string; fin: string }>(`/pymes/${pyme.id}/suscripcion`, { method: 'POST', body: { plan_id: form.plan_id, referencia_pago: form.referencia.trim() } })
      setDone(`Solicitud enviada. Cuando el equipo confirme la transferencia, el periodo irá del ${new Date(`${r.inicio}T12:00:00`).toLocaleDateString('es-CL')} al ${new Date(`${r.fin}T12:00:00`).toLocaleDateString('es-CL')}.`)
      setForm({ ...form, referencia: '' }); await load(); await onChange()
    } catch (e) { setError(errorText(e)) }
  }
  const actual = planes.find(p => p.id === pyme.suscripcion?.plan_id)
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">GESTIÓN B2B</p><h1>Suscripción</h1><p className="muted">Tarifa plana mensual, sin comisiones por venta. En esta versión el pago es por transferencia y lo verifica el equipo PetSuite.</p></div></div>
    <StatusBanner pyme={pyme} />
    {pyme.estado_verificacion === 'aprobada' && <form className="settings-card" onSubmit={submit} noValidate><div className="settings-card-heading"><div><p className="eyebrow">RENOVAR O CAMBIAR DE PLAN</p><h2>{actual ? `Tu plan actual: ${actual.nombre}` : 'Elige un plan'}</h2><p className="muted">Transfiere el monto del plan y registra la referencia. El nuevo periodo empieza al terminar el actual, sin perder días.</p></div></div>
      {pendiente ? <p className="muted">Tienes una solicitud en revisión. Podrás enviar otra cuando el equipo la confirme o la rechace.</p> : <div className="settings-form-grid"><label>Plan<select value={form.plan_id} onChange={e => setForm({ ...form, plan_id: Number(e.target.value) })}>{planes.map(p => <option key={p.id} value={p.id}>{p.nombre} · {clp(p.precio_mensual_clp)}/mes · hasta {p.max_items_catalogo} ítems{p.id === actual?.id ? ' (renovar)' : ''}</option>)}</select></label><label>Referencia de la transferencia<input value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="N.º o glosa" /></label></div>}
      {error && <div className="form-error" role="alert">{error}</div>}{done && <p className="save-message" role="status">{done}</p>}
      {!pendiente && <div className="settings-actions"><span /><button className="primary">Enviar solicitud</button></div>}</form>}
    <div className="catalog-list">{rows?.map(s => <div className="catalog-item" key={s.id}><div><strong>Plan {s.plan} · {clp(s.precio_mensual_clp)} al mes</strong><p>{new Date(`${s.inicio}T12:00:00`).toLocaleDateString('es-CL')} al {new Date(`${s.fin}T12:00:00`).toLocaleDateString('es-CL')}</p>{s.pagos?.map(p => <small key={p.id}>Pago {clp(p.monto_clp)} · {p.estado}{p.referencia ? ` · ${p.referencia}` : ''}</small>)}</div><span className={`user-status ${s.estado === 'activa' ? 'activo' : 'suspendido'}`}>{periodoTexto[s.estado] || s.estado}</span></div>)}{rows && rows.length === 0 && <div className="empty-results">No hay suscripciones registradas.</div>}</div></section>
}
