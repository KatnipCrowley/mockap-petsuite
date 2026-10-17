import { useEffect, useRef, useState } from 'react'
import { Building2, ChevronRight, Clock3, Crown, MapPin, MessageCircle, Phone, Search, Tag, X } from 'lucide-react'
import { BannerStrip, CouponList } from '../promotions/promotions'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Photo, rubroFoto } from '../../shared/media'
import { api, clp, errorText, fechaCorta, iniciales, type PymePerfil, type PymeResumen, type Comuna } from '../../shared/api'
import { businessContactSchema } from '../../shared/validators'

const rubros = [['', 'Todas'], ['veterinaria', 'Veterinarias'], ['tienda', 'Tiendas'], ['peluqueria', 'Peluquerías']] as const
const rubroLabel: Record<string, string> = { veterinaria: 'Veterinaria', tienda: 'Tienda', peluqueria: 'Peluquería', otro: 'Servicio Pet-Care' }
const diaLabel: Record<string, string> = { 'lun-vie': 'Lunes a viernes', sab: 'Sábado', dom: 'Domingo' }
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
    // Un pin por casa matriz y otro por cada sucursal visible, con el mismo número del negocio.
    places.forEach((p, i) => [{ nombre: p.nombre_comercial, latitud: p.latitud, longitud: p.longitud }, ...(p.sucursales || []).map(s => ({ nombre: `${p.nombre_comercial} · ${s.nombre}`, latitud: s.latitud, longitud: s.longitud }))].forEach(lugar => {
      if (lugar.latitud == null || lugar.longitud == null) return
      const at: L.LatLngTuple = [Number(lugar.latitud), Number(lugar.longitud)]
      points.push(at)
      L.marker(at, { title: lugar.nombre, icon: L.divIcon({ className: 'leaflet-num-pin', html: `<span>${i + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .on('click', () => select.current(p)).addTo(layer.current!)
    }))
    if (points.length) map.current.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 })
  }, [places])

  return <div ref={box} className="leaflet-box" role="region" aria-label="Mapa de negocios Pet-Care" />
}

// La búsqueda cubre nombre, descripción, comunas, servicios de la empresa y de cada sucursal, y cupones con ONG.
const textoBusqueda = (p: PymeResumen) => [p.nombre_comercial, p.descripcion, p.comuna, ...(p.servicios || []), ...(p.sucursales || []).flatMap(s => [s.nombre, s.comuna, s.descripcion, ...s.servicios]), ...(p.cupones || []).flatMap(c => [c.titulo, c.ong])].filter(Boolean).join(' ').toLocaleLowerCase('es')

export function DirectoryView({ initialPyme, onOpened }: { initialPyme?: string | null; onOpened?: () => void } = {}) {
  const [places, setPlaces] = useState<PymeResumen[] | null>(null)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [comuna, setComuna] = useState('')
  const [rubro, setRubro] = useState('')
  const [query, setQuery] = useState('')
  const [soloOfertas, setSoloOfertas] = useState(false)
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

  const [abrir, setAbrir] = useState<string | null>(initialPyme ?? null)
  useEffect(() => { if (initialPyme) { setAbrir(initialPyme); onOpened?.() } }, [initialPyme, onOpened])
  const q = query.trim().toLocaleLowerCase('es')
  const shown = (places || []).filter(p => (!q || textoBusqueda(p).includes(q)) && (!soloOfertas || !!p.ofertas || !!p.cupones?.length))
  return <section className="page directory-page"><div className="directory-hero"><div><p className="eyebrow">DIRECTORIO PET-CARE</p><h1>Encuentra servicios para tu mascota</h1><p>Veterinarias, tiendas y peluquerías de tu comuna y todas sus sucursales, con catálogo, cupones de ONG y contacto directo.</p></div></div>
    <BannerStrip ubicacion="directorio" onPyme={setAbrir} />
    <div className="directory-contact-bar"><span>¿Ya escribiste a un negocio? Consulta aquí sus respuestas.</span><button className="secondary" onClick={() => { setShowContacts(!showContacts); if (!showContacts) void loadContacts() }}><MessageCircle size={16} /> {showContacts ? 'Ocultar consultas' : 'Mis consultas'}</button></div>
    {showContacts && <section className="directory-my-contacts"><div className="pet-section-head"><div><p className="eyebrow">CONVERSACIONES</p><h2>Mis consultas</h2></div><button className="text-button" onClick={() => void loadContacts()}>Actualizar</button></div>{contactError && <p className="form-error" role="alert">{contactError}</p>}{sentContacts?.map(row => <article key={row.id} className="directory-contact-item"><div><strong>{row.negocio}</strong><small>{new Date(row.creado_en).toLocaleString('es-CL')} · {row.estado === 'respondido' ? 'Respondida' : row.estado === 'leido' ? 'Leída' : 'Enviada'}</small></div><p>{row.mensaje}</p>{row.respuesta && <div className="business-contact-answer"><strong>Respuesta del negocio</strong><p>{row.respuesta}</p></div>}</article>)}{sentContacts?.length === 0 && <div className="empty-results">Todavía no tienes consultas a negocios.</div>}</section>}
    <div className="directory-toolbar"><label className="search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">Buscar negocio</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Busca por nombre, servicio, sucursal o cupón" /></label><select aria-label="Comuna" value={comuna} onChange={e => setComuna(e.target.value)}><option value="">Todas las comunas</option>{comunas.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}</select></div>
    <div className="category-tabs">{rubros.map(([value, label]) => <button key={label} className={rubro === value ? 'category-tab active' : 'category-tab'} onClick={() => setRubro(value)}>{label}</button>)}<button className={soloOfertas ? 'category-tab active' : 'category-tab'} aria-pressed={soloOfertas} onClick={() => setSoloOfertas(!soloOfertas)}><Tag size={14} /> Con ofertas o cupones</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="directory-layout"><div className="business-results"><div className="results-count"><strong>{places ? `${shown.length} ${shown.length === 1 ? 'lugar' : 'lugares'}` : 'Cargando...'}</strong><span>Negocios verificados por PetSuite</span></div>
      {shown.map((p, i) => <button key={p.id} className="business-card store-card" onClick={() => setSelected(p)}><Photo src={p.foto_portada || rubroFoto[p.rubro] || rubroFoto.otro} nombre={p.nombre_comercial} className="business-logo business-thumb" /><div className="business-info"><div className="business-card-top"><strong>{p.nombre_comercial}</strong>{p.destacado === 2 && <span className="chip chip-featured"><Crown size={12} /> Destacado</span>}{!!p.ofertas && <span className="chip chip-warn"><Tag size={12} /> {p.ofertas === 1 ? '1 oferta' : `${p.ofertas} ofertas`}</span>}{!!p.cupones?.length && <span className="chip chip-info">Cupón ONG</span>}</div><span>{rubroLabel[p.rubro] || p.rubro} · {p.comuna}{p.sucursales?.length ? ` · +${p.sucursales.length} ${p.sucursales.length === 1 ? 'sucursal' : 'sucursales'}` : ''}</span><small>{p.descripcion}</small><div className="business-meta">{p.direccion}</div></div><ChevronRight className="chevron" size={18} /></button>)}
      {places && shown.length === 0 && <div className="empty-results">No encontramos negocios con estos filtros.</div>}</div>
      <div className="map-card"><div className="map-header"><strong>Mapa</strong><span>{shown.length} en el mapa</span></div><PlacesMap places={shown} onSelect={setSelected} /></div></div>
    {(selected || abrir) && <PymeModal id={selected?.id ?? abrir!} onClose={() => { setSelected(null); setAbrir(null) }} onContactSent={() => { if (showContacts) void loadContacts() }} />}
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
    <div className="store-info">{pyme.direccion && <span><MapPin size={16} /> {pyme.direccion}</span>}{Object.entries(pyme.horario || {}).map(([dia, h]) => <span key={dia}><Clock3 size={16} /> {diaLabel[dia] || dia}: {h}</span>)}</div>
    {!!pyme.servicios?.length && <div className="chip-row service-chips" aria-label="Servicios destacados">{pyme.servicios.map(s => <span className="chip chip-info" key={s}>{s}</span>)}</div>}
    {!!pyme.cupones?.length && <><div className="section-heading"><h3>Cupones con ONG aliadas</h3></div><p className="muted">Presenta el código al pagar: tu compra apoya a la organización.</p><CouponList cupones={pyme.cupones} por="ong" /></>}
    {!!pyme.sucursales?.length && <><div className="section-heading"><h3>Sucursales</h3></div><div className="branch-list">{pyme.sucursales.map(s => <div key={s.id} className="branch-row"><Building2 size={18} aria-hidden="true" /><div><strong>{s.nombre}</strong><small>{s.direccion ? `${s.direccion} · ` : ''}{s.comuna}{Object.keys(s.horario).length ? ` · ${Object.entries(s.horario).map(([d, h]) => `${diaLabel[d] || d} ${h}`).join(', ')}` : ''}</small>{s.descripcion && <small>{s.descripcion}</small>}{!!s.servicios.length && <div className="chip-row">{s.servicios.map(x => <span key={x} className="chip">{x}</span>)}</div>}</div>{s.telefono && <a className="text-button" href={`tel:${s.telefono}`}>Llamar</a>}</div>)}</div></>}
    <div className="section-heading"><h3>Catálogo</h3></div>
    <p className="muted">Precios referenciales. La compra y el pago se coordinan directamente con el negocio.</p>
    <div className="product-list">{pyme.catalogo.length ? pyme.catalogo.map(item => <div className={item.oferta ? 'product-row has-offer' : 'product-row'} key={item.id} onClick={() => { setOpen(open === item.id ? null : item.id); track('vista_item', item.id) }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') { setOpen(open === item.id ? null : item.id); track('vista_item', item.id) } }}><div><strong>{item.nombre}</strong><small>{item.tipo === 'servicio' ? 'Servicio' : 'Producto'}{item.categoria ? ` · ${item.categoria}` : ''}{open === item.id && item.descripcion ? ` · ${item.descripcion}` : ''}</small>{(item.oferta || item.sin_stock) && <div className="chip-row">{item.oferta && <span className="chip chip-warn"><Tag size={12} /> Oferta hasta el {fechaCorta(item.oferta.hasta)}</span>}{item.sin_stock && <span className="chip chip-alert">Sin stock por ahora</span>}</div>}</div>{item.oferta ? <span className="price-offer"><s>{clp(item.precio_referencial_clp)}</s><b>{clp(item.oferta.precio_clp)}</b></span> : <b>{clp(item.precio_referencial_clp)}</b>}</div>) : <p className="muted">Este negocio aún no publica su catálogo.</p>}</div>
    <div className="qr-actions">{pyme.telefono && <a className="secondary" href={`tel:${pyme.telefono}`} onClick={() => track('clic_contacto')}><Phone size={16} /> Llamar</a>}{wa && <a className="primary" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={() => track('clic_whatsapp')}><MessageCircle size={16} /> WhatsApp</a>}</div>
    {!pyme.telefono && !wa && <p className="muted">Este negocio no publicó un medio de contacto.</p>}
    <section className="directory-contact-form"><p className="eyebrow">CONTACTO EN PETSUITE</p><h3>Escribe a {pyme.nombre_comercial}</h3><p className="muted">Tu consulta llegará a su bandeja. Podrás leer su respuesta en «Mis consultas».</p>{sent && <p className="business-saved" role="status"><MessageCircle size={17} /> Consulta enviada. Revisa «Mis consultas» para ver la respuesta.</p>}<form onSubmit={submitContact} noValidate><label>Mensaje<textarea maxLength={500} rows={4} value={message} onChange={e => { setMessage(e.target.value); setContactError(''); setSent(false) }} placeholder="Cuéntale qué necesitas..." /></label><label>Dato de contacto (opcional)<input maxLength={120} value={contact} onChange={e => setContact(e.target.value)} placeholder="Correo o teléfono si quieres compartirlo" /></label>{contactError && <p className="form-error" role="alert">{contactError}</p>}<button className="primary" disabled={busy}>{busy ? 'Enviando...' : 'Enviar consulta'}</button></form></section>
    <button className="secondary full" onClick={onClose}>Seguir explorando</button></article></div>
}
