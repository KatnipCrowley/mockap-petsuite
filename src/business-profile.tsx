import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Check, MapPin } from 'lucide-react'
import { api, errorText, type Comuna, type PymeResumen } from './api'
import type { MiPyme } from './business'
import { Loading, Photo, rubroFoto } from './media'
import { businessProfileSchema } from './validators'

type EditableProfile = PymeResumen & { rut_empresa: string; comuna_id: number; estado_verificacion: string }
type Draft = {
  nombre_comercial: string; descripcion: string; comuna_id: number; direccion: string; telefono: string; whatsapp: string;
  latitud: string; longitud: string; horario: { 'lun-vie': string; sab: string; dom: string }; foto_portada: string | null
}

const photos = ['/img/vet-2.jpg', '/img/collares.jpg', '/img/groomer-2.jpg', '/img/accesorios.jpg'] as const

function LocationPicker({ lat, lng, onChange }: { lat: string; lng: string; onChange: (lat: string, lng: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const pin = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!box.current) return
    const initial: L.LatLngTuple = lat && lng ? [Number(lat), Number(lng)] : [-40.5735, -73.1335]
    const instance = L.map(box.current, { scrollWheelZoom: false }).setView(initial, 13)
    map.current = instance
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; Colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance)
    instance.on('click', event => onChange(event.latlng.lat.toFixed(5), event.latlng.lng.toFixed(5)))
    return () => { instance.remove(); map.current = null; pin.current = null }
  }, [onChange])

  useEffect(() => {
    if (!map.current) return
    const latitude = Number(lat), longitude = Number(lng)
    if (!lat || !lng || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      pin.current?.remove(); pin.current = null; return
    }
    const location: L.LatLngTuple = [latitude, longitude]
    if (pin.current) pin.current.setLatLng(location)
    else pin.current = L.marker(location).addTo(map.current)
    map.current.setView(location, map.current.getZoom())
  }, [lat, lng])

  return <div ref={box} className="business-location-map" role="region" aria-label="Ubicación de tu negocio. Haz clic para colocar el marcador." />
}

export function BusinessProfile({ pyme, onSaved }: { pyme: MiPyme; onSaved: () => Promise<void> }) {
  const [profile, setProfile] = useState<EditableProfile | null>(null)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [form, setForm] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([api<EditableProfile>(`/pymes/${pyme.id}/perfil`), api<Comuna[]>('/comunas')])
      .then(([p, options]) => {
        if (!alive) return
        setProfile(p); setComunas(options)
        setForm({ nombre_comercial: p.nombre_comercial, descripcion: p.descripcion || '', comuna_id: p.comuna_id, direccion: p.direccion || '', telefono: p.telefono || '', whatsapp: p.whatsapp || '', latitud: p.latitud || '', longitud: p.longitud || '', horario: { 'lun-vie': p.horario?.['lun-vie'] || '', sab: p.horario?.sab || '', dom: p.horario?.dom || '' }, foto_portada: p.foto_portada || null })
        setLoading(false)
      })
      .catch(e => { if (alive) { setError(errorText(e)); setLoading(false) } })
    return () => { alive = false }
  }, [pyme.id])

  const movePin = useCallback((latitude: string, longitude: string) => setForm(previous => previous && { ...previous, latitud: latitude, longitud: longitude }), [])
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm(previous => previous && { ...previous, [key]: value })

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form) return
    setError(''); setSaved(false)
    const result = businessProfileSchema.safeParse({
      ...form,
      latitud: form.latitud.trim() === '' ? null : Number(form.latitud),
      longitud: form.longitud.trim() === '' ? null : Number(form.longitud),
    })
    if (!result.success) { setError(result.error.issues[0]?.message || 'Revisa el perfil'); return }
    setBusy(true)
    try {
      const updated = await api<EditableProfile>(`/pymes/${pyme.id}/perfil`, { method: 'PATCH', body: result.data })
      setProfile(updated); await onSaved(); setSaved(true)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  return <section className="page business-profile-page"><div className="page-title"><div><p className="eyebrow">TU VITRINA PET-CARE</p><h1>Perfil del negocio</h1><p className="muted">Mantén actualizada la información que aparece en el directorio.</p></div></div>
    {loading ? <Loading rows={2} /> : !form || !profile ? <p className="form-error" role="alert">{error || 'No se pudo cargar el perfil.'}</p> : <form className="business-profile-layout" onSubmit={submit} noValidate>
      <div className="business-profile-main">
        <section className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">DATOS DEL NEGOCIO</p><h2>Información pública</h2></div></div><div className="settings-form-grid"><label>Nombre comercial<input maxLength={100} value={form.nombre_comercial} onChange={e => set('nombre_comercial', e.target.value)} /></label><label>Comuna<select value={form.comuna_id} onChange={e => set('comuna_id', Number(e.target.value))}>{comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label><label>Dirección<input maxLength={200} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Calle y número" /></label><label>Teléfono<input maxLength={20} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Ej.: +56 64 234 5678" /></label><label>WhatsApp<input maxLength={20} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="Ej.: 56912345678" /></label></div><label className="business-profile-description">Descripción<textarea maxLength={1000} rows={4} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Cuéntale a la comunidad qué ofrece tu negocio" /></label></section>
        <section className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">VISITAS Y UBICACIÓN</p><h2>Horario y mapa</h2></div></div><div className="settings-form-grid"><label>Lunes a viernes<input maxLength={80} value={form.horario['lun-vie']} onChange={e => set('horario', { ...form.horario, 'lun-vie': e.target.value })} placeholder="09:00-18:00" /></label><label>Sábado<input maxLength={80} value={form.horario.sab} onChange={e => set('horario', { ...form.horario, sab: e.target.value })} placeholder="Cerrado" /></label><label>Domingo<input maxLength={80} value={form.horario.dom} onChange={e => set('horario', { ...form.horario, dom: e.target.value })} placeholder="Cerrado" /></label></div><p className="muted business-location-hint"><MapPin size={16} /> Marca tu ubicación en el mapa o ingresa ambas coordenadas.</p><LocationPicker lat={form.latitud} lng={form.longitud} onChange={movePin} /><div className="settings-form-grid business-coordinates"><label>Latitud<input inputMode="decimal" value={form.latitud} onChange={e => set('latitud', e.target.value)} placeholder="-40.5735" /></label><label>Longitud<input inputMode="decimal" value={form.longitud} onChange={e => set('longitud', e.target.value)} placeholder="-73.1335" /></label></div></section>
      </div>
      <div className="business-profile-side"><section className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">IDENTIDAD VISUAL</p><h2>Portada</h2></div></div><Photo src={form.foto_portada || rubroFoto[profile.rubro] || rubroFoto.otro} nombre={form.nombre_comercial} className="business-profile-cover" /><p className="muted">Elige una fotografía de demostración para tu ficha en el directorio.</p><div className="business-cover-options">{photos.map(src => <button type="button" key={src} className={form.foto_portada === src ? 'business-cover-option active' : 'business-cover-option'} onClick={() => set('foto_portada', src)} aria-label={`Elegir portada ${src.split('/').pop()?.replace('.jpg', '')}`} aria-pressed={form.foto_portada === src}><Photo src={src} nombre="Portada" className="business-cover-thumb" /></button>)}</div></section>
        <section className="settings-card business-profile-verification"><p className="eyebrow">DATOS VERIFICADOS</p><h2>{profile.estado_verificacion === 'aprobada' ? 'Negocio verificado' : 'Estado: ' + profile.estado_verificacion}</h2><p className="muted">{profile.rubro} · RUT {profile.rut_empresa}</p><p className="muted">Para cambiar el RUT o rubro debes contactar a PetSuite.</p></section>
        <div className="business-profile-submit">{error && <p className="form-error" role="alert">{error}</p>}{saved && <p className="business-saved" role="status"><Check size={17} /> Cambios guardados en el directorio.</p>}<button className="primary full" disabled={busy}>{busy ? 'Guardando...' : 'Guardar perfil'}</button></div>
      </div>
    </form>}
  </section>
}
