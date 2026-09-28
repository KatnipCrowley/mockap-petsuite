import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Clock3, MapPin, MessageCircle, Phone, X } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Photo, rubroFoto } from './media'
import { api, clp, errorText, iniciales, type PymePerfil, type PymeResumen, type Comuna } from './api'
import { businessContactSchema } from './validators'

const rubros = [['', 'Todas'], ['veterinaria', 'Veterinarias'], ['tienda', 'Tiendas'], ['peluqueria', 'Peluquerías']] as const
const rubroLabel: Record<string, string> = { veterinaria: 'Veterinaria', tienda: 'Tienda', peluqueria: 'Peluquería', otro: 'Servicio Pet-Care' }
type SentContact = { id: string; negocio: string; mensaje: string; respuesta: string | null; estado: 'nuevo' | 'leido' | 'respondido'; creado_en: string }

// Mapa Leaflet + OpenStreetMap (informe 2.1, decisión 6). Si las teselas no cargan, la lista sigue funcionando.
function PlacesMap({ places, onSelect }: { places: PymeResumen[]; onSelect: (p: PymeResumen) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const select = useRef(onSelect)
  useEffect(() => { select.current = onSelect }, [onSelect])

  useEffect(() => {
    if (!box.current || map.current) return
    map.current = L.map(box.current, { scrollWheelZoom: false }).setView([-40.5735, -73.1335], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; Colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => { map.current?.remove(); map.current = null }
  }, [])

  useEffect(() => {
    if (!map.current || !layer.current) return
    layer.current.clearLayers()
    const points: L.LatLngTuple[] = []
    places.forEach((p, i) => {
      if (p.latitud == null || p.longitud == null) return
      const at: L.LatLngTuple = [Number(p.latitud), Number(p.longitud)]
      points.push(at)
      L.marker(at, { title: p.nombre_comercial, icon: L.divIcon({ className: 'leaflet-num-pin', html: `<span>${i + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .on('click', () => select.current(p)).addTo(layer.current!)
    })
    if (points.length) map.current.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 })
  }, [places])

  return <div ref={box} className="leaflet-box" role="region" aria-label="Mapa de negocios Pet-Care" />
}

export function DirectoryView() {
  const [places, setPlaces] = useState<PymeResumen[] | null>(null)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [comuna, setComuna] = useState('')
  const [rubro, setRubro] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PymeResumen | null>(null)
  const [error, setError] = useState('')
  const [showContacts, setShowContacts] = useState(false)
  const [sentContacts, setSentContacts] = useState<SentContact[] | null>(null)
  const [contactError, setContactError] = useState('')
  const loadContacts = () => api<SentContact[]>('/mis-contactos-pyme').then(rows => { setSentContacts(rows); setContactError('') }).catch(e => setContactError(errorText(e)))

  useEffect(() => { api<Comuna[]>('/comunas').then(setComunas).catch(() => undefined) }, [])
  useEffect(() => {
    const qs = new URLSearchParams({ ...(comuna ? { comuna } : {}), ...(rubro ? { rubro } : {}) }).toString()
    api<PymeResumen[]>(`/pymes${qs ? `?${qs}` : ''}`).then(p => { setPlaces(p); setError('') }).catch(e => setError(errorText(e)))
  }, [comuna, rubro])

  const shown = (places || []).filter(p => `${p.nombre_comercial} ${p.descripcion || ''} ${p.comuna}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="page directory-page"><div className="directory-hero"><div><p className="eyebrow">DIRECTORIO PET-CARE</p><h1>Encuentra servicios para tu mascota</h1><p>Veterinarias, tiendas y peluquerías de tu comuna, con su catálogo y contacto directo.</p></div></div>
    <div className="directory-contact-bar"><span>¿Ya escribiste a un negocio? Consulta aquí sus respuestas.</span><button className="secondary" onClick={() => { setShowContacts(!showContacts); if (!showContacts) void loadContacts() }}><MessageCircle size={16} /> {showContacts ? 'Ocultar consultas' : 'Mis consultas'}</button></div>
    {showContacts && <section className="directory-my-contacts"><div className="pet-section-head"><div><p className="eyebrow">CONVERSACIONES</p><h2>Mis consultas</h2></div><button className="text-button" onClick={() => void loadContacts()}>Actualizar</button></div>{contactError && <p className="form-error" role="alert">{contactError}</p>}{sentContacts?.map(row => <article key={row.id} className="directory-contact-item"><div><strong>{row.negocio}</strong><small>{new Date(row.creado_en).toLocaleString('es-CL')} · {row.estado === 'respondido' ? 'Respondida' : row.estado === 'leido' ? 'Leída' : 'Enviada'}</small></div><p>{row.mensaje}</p>{row.respuesta && <div className="business-contact-answer"><strong>Respuesta del negocio</strong><p>{row.respuesta}</p></div>}</article>)}{sentContacts?.length === 0 && <div className="empty-results">Todavía no tienes consultas a negocios.</div>}</section>}
    <div className="directory-toolbar"><div className="search-field"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca por nombre o servicio" /></div><select aria-label="Comuna" value={comuna} onChange={e => setComuna(e.target.value)}><option value="">Todas las comunas</option>{comunas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
    <div className="category-tabs">{rubros.map(([value, label]) => <button key={label} className={rubro === value ? 'category-tab active' : 'category-tab'} onClick={() => setRubro(value)}>{label}</button>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="directory-layout"><div className="business-results"><div className="results-count"><strong>{places ? `${shown.length} ${shown.length === 1 ? 'lugar' : 'lugares'}` : 'Cargando...'}</strong><span>Negocios verificados por PetSuite</span></div>
      {shown.map(p => <button key={p.id} className="business-card store-card" onClick={() => setSelected(p)}><Photo src={p.foto_portada || rubroFoto[p.rubro] || rubroFoto.otro} nombre={p.nombre_comercial} className="business-logo business-thumb" /><div className="business-info"><div className="business-card-top"><strong>{p.nombre_comercial}</strong></div><span>{rubroLabel[p.rubro] || p.rubro} · {p.comuna}</span><small>{p.descripcion}</small><div className="business-meta">{p.direccion}</div></div><ChevronRight className="chevron" size={18} /></button>)}
      {places && shown.length === 0 && <div className="empty-results">No encontramos negocios con estos filtros.</div>}</div>
      <div className="map-card"><div className="map-header"><strong>Mapa</strong><span>{shown.length} en el mapa</span></div><PlacesMap places={shown} onSelect={setSelected} /></div></div>
    {selected && <PymeModal id={selected.id} onClose={() => setSelected(null)} onContactSent={() => { if (showContacts) void loadContacts() }} />}
  </section>
}

function PymeModal({ id, onClose, onContactSent }: { id: string; onClose: () => void; onContactSent: () => void }) {
  const [pyme, setPyme] = useState<PymePerfil | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [contactError, setContactError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api<PymePerfil>(`/pymes/${id}`).then(setPyme).catch(e => setError(errorText(e))) }, [id])
  const track = (tipo: 'vista_item' | 'clic_contacto' | 'clic_whatsapp', item_id?: string) => { api(`/pymes/${id}/eventos`, { method: 'POST', body: { tipo, ...(item_id ? { item_id } : {}) } }).catch(() => undefined) }
  const submitContact = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = businessContactSchema.safeParse({ mensaje: message, contacto: contact })
    if (!parsed.success) { setContactError(parsed.error.issues[0]?.message || 'Revisa tu consulta'); return }
    setBusy(true); setContactError('')
    try { await api(`/pymes/${id}/contactos`, { method: 'POST', body: parsed.data }); setSent(true); setMessage(''); onContactSent() } catch (e) { setContactError(errorText(e)) } finally { setBusy(false) }
  }
  if (!pyme) return <div className="modal-backdrop"><article className="modal store-modal"><button className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><p className="muted">{error || 'Cargando perfil...'}</p></article></div>
  const wa = pyme.whatsapp?.replace(/\D/g, '')
  return <div className="modal-backdrop"><article className="modal store-modal"><button className="close" aria-label="Cerrar" onClick={onClose}><X size={20} /></button><Photo src={pyme.foto_portada || rubroFoto[pyme.rubro] || rubroFoto.otro} nombre={pyme.nombre_comercial} className="business-hero modal-photo" /><p className="eyebrow">{(rubroLabel[pyme.rubro] || pyme.rubro).toUpperCase()} · {pyme.comuna?.toUpperCase()}</p><h2>{pyme.nombre_comercial}</h2><p className="muted">{pyme.descripcion}</p>
    <div className="store-info">{pyme.direccion && <span><MapPin size={16} /> {pyme.direccion}</span>}{Object.entries(pyme.horario || {}).map(([dia, h]) => <span key={dia}><Clock3 size={16} /> {dia}: {h}</span>)}</div>
    <div className="section-heading"><h3>Catálogo</h3></div>
    <p className="muted">Precios referenciales. La compra y el pago se coordinan directamente con el negocio.</p>
    <div className="product-list">{pyme.catalogo.length ? pyme.catalogo.map(item => <div className="product-row" key={item.id} onClick={() => { setOpen(open === item.id ? null : item.id); track('vista_item', item.id) }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') { setOpen(open === item.id ? null : item.id); track('vista_item', item.id) } }}><div><strong>{item.nombre}</strong><small>{item.tipo === 'servicio' ? 'Servicio' : 'Producto'}{open === item.id && item.descripcion ? ` · ${item.descripcion}` : ''}</small></div><b>{clp(item.precio_referencial_clp)}</b></div>) : <p className="muted">Este negocio aún no publica su catálogo.</p>}</div>
    <div className="qr-actions">{pyme.telefono && <a className="secondary" href={`tel:${pyme.telefono}`} onClick={() => track('clic_contacto')}><Phone size={16} /> Llamar</a>}{wa && <a className="primary" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={() => track('clic_whatsapp')}><MessageCircle size={16} /> WhatsApp</a>}</div>
    {!pyme.telefono && !wa && <p className="muted">Este negocio no publicó un medio de contacto.</p>}
    <section className="directory-contact-form"><p className="eyebrow">CONTACTO EN PETSUITE</p><h3>Escribe a {pyme.nombre_comercial}</h3><p className="muted">Tu consulta llegará a su bandeja. Podrás leer su respuesta en «Mis consultas».</p>{sent && <p className="business-saved" role="status"><MessageCircle size={17} /> Consulta enviada. Revisa «Mis consultas» para ver la respuesta.</p>}<form onSubmit={submitContact} noValidate><label>Mensaje<textarea maxLength={500} rows={4} value={message} onChange={e => { setMessage(e.target.value); setContactError(''); setSent(false) }} placeholder="Cuéntale qué necesitas..." /></label><label>Dato de contacto (opcional)<input maxLength={120} value={contact} onChange={e => setContact(e.target.value)} placeholder="Correo o teléfono si quieres compartirlo" /></label>{contactError && <p className="form-error" role="alert">{contactError}</p>}<button className="primary" disabled={busy}>{busy ? 'Enviando...' : 'Enviar consulta'}</button></form></section>
    <button className="secondary full" onClick={onClose}>Seguir explorando</button></article></div>
}
