import { useCallback, useEffect, useState } from 'react'
import { Heart, Home, MapPin, PawPrint, ShieldCheck, X } from 'lucide-react'
import { api, errorText, type CuponPublico } from './api'
import { LogoMark, Photo } from './media'
import { CouponList } from './promotions'
import { EmptyState, ErrorState, LoadingState } from './feedback'

export type OngPerfil = {
  mision: string; como_ayudar: string; necesidades: string[]; voluntariado: string; horario_visitas: string
  donaciones: { banco: string; tipo_cuenta: string; numero: string; titular: string; rut: string; correo: string } | null
  emblema: 'heart' | 'paw' | 'home' | 'shield'; color: 'acento' | 'calido' | 'info' | 'vino'
}
type Publica = { id: string; nombre: string; tipo: string; comuna: string; descripcion: string | null; contacto: string | null; redes_sociales: string | null; perfil: OngPerfil | null; animales: { id: string; nombre: string; especie: string; foto_url: string | null; edad_estimada: string | null }[]; cupones: CuponPublico[]; impacto: { canjes_mes: number; canjes_total: number; aliados: number } }

const emblemas = { heart: Heart, paw: PawPrint, home: Home, shield: ShieldCheck }
const tipoOng: Record<string, string> = { refugio: 'Refugio', rescatista_independiente: 'Rescatista independiente', agrupacion: 'Agrupación' }
const estadoPerfil = { sin_enviar: 'Borrador sin enviar', en_revision: 'En revisión del asesor', publicado: 'Publicado', rechazado: 'Con observaciones del asesor' }
const vacio: OngPerfil = { mision: '', como_ayudar: '', necesidades: [], voluntariado: '', horario_visitas: '', donaciones: null, emblema: 'heart', color: 'acento' }

function OngHero({ nombre, sub, perfil }: { nombre: string; sub: string; perfil: OngPerfil }) {
  const Icon = emblemas[perfil.emblema]
  return <div className={`ong-hero tone-${perfil.color}`}><span className="ong-emblem"><Icon size={30} strokeWidth={1.7} /></span><div><p className="eyebrow">{sub}</p><h1>{nombre}</h1><p>{perfil.mision || 'Cuenta aquí la misión de tu organización.'}</p></div></div>
}

function PerfilBody({ perfil }: { perfil: OngPerfil }) {
  return <div className="ong-sections">
    {perfil.como_ayudar && <section className="role-panel"><p className="eyebrow">CÓMO AYUDAR</p><p>{perfil.como_ayudar}</p></section>}
    {!!perfil.necesidades.length && <section className="role-panel"><p className="eyebrow">NECESITAMOS</p><div className="chip-row">{perfil.necesidades.map(n => <span key={n} className="chip chip-warn">{n}</span>)}</div></section>}
    {perfil.donaciones && <section className="role-panel"><p className="eyebrow">DONACIONES</p><dl className="donation-data"><dt>Banco</dt><dd>{perfil.donaciones.banco}</dd><dt>Tipo de cuenta</dt><dd>{perfil.donaciones.tipo_cuenta}</dd><dt>Número</dt><dd>{perfil.donaciones.numero}</dd><dt>Titular</dt><dd>{perfil.donaciones.titular}</dd><dt>RUT</dt><dd>{perfil.donaciones.rut}</dd><dt>Correo</dt><dd>{perfil.donaciones.correo}</dd></dl><p className="muted">Datos verificados por un asesor PetSuite. PetSuite no recibe ni intermedia donaciones.</p></section>}
    {(perfil.voluntariado || perfil.horario_visitas) && <section className="role-panel"><p className="eyebrow">VOLUNTARIADO Y VISITAS</p>{perfil.voluntariado && <p>{perfil.voluntariado}</p>}{perfil.horario_visitas && <p className="muted">Visitas: {perfil.horario_visitas}</p>}</section>}
  </div>
}

// CMS: la ONG arma su perfil público sin subir imágenes. Lo que guarda es un borrador; se publica cuando el asesor lo aprueba.
export function OngProfileEditor() {
  const [data, setData] = useState<{ nombre: string; estado_verificacion: string; publicado: OngPerfil | null; borrador: OngPerfil | null; estado: keyof typeof estadoPerfil; motivo: string | null } | null>(null)
  const [form, setForm] = useState<OngPerfil>(vacio)
  const [necesidades, setNecesidades] = useState('')
  const [donar, setDonar] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => api<NonNullable<typeof data>>('/ong/perfil').then(d => { setData(d); const p = d.borrador ?? d.publicado ?? vacio; setForm(p); setNecesidades(p.necesidades.join(', ')); setDonar(!!p.donaciones) }).catch(e => setError(errorText(e)))
  useEffect(() => { void load() }, [])
  const set = <K extends keyof OngPerfil>(k: K, v: OngPerfil[K]) => setForm({ ...form, [k]: v })
  const dona = form.donaciones ?? { banco: '', tipo_cuenta: '', numero: '', titular: '', rut: '', correo: '' }
  const setDona = (k: keyof typeof dona, v: string) => set('donaciones', { ...dona, [k]: v })
  const guardar = async (enviar: boolean) => {
    setBusy(true); setError(''); setNotice('')
    try {
      await api('/ong/perfil', { method: 'PUT', body: { perfil: { ...form, necesidades: necesidades.split(',').map(s => s.trim()).filter(Boolean), donaciones: donar ? dona : null }, enviar } })
      setNotice(enviar ? 'Enviado a revisión. Tu perfil público cambiará cuando el asesor lo apruebe.' : 'Borrador guardado.'); await load()
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
   if (!data) return <section className="page">{error ? <ErrorState message={error} onRetry={() => void load()} /> : <LoadingState label="Cargando perfil de ONG" />}</section>
  return <section className="page role-page"><div className="page-title"><div><p className="eyebrow">CMS DE TU ORGANIZACIÓN</p><h1>Perfil público</h1><p className="muted">Arma tu página sin subir imágenes: misión, necesidades, cómo donar y voluntariado. Un asesor revisa los cambios antes de publicarlos para proteger a quienes donan.</p></div><span className={`user-status ${data.estado === 'publicado' ? 'activo' : 'suspendido'}`}>{estadoPerfil[data.estado]}</span></div>
    {data.motivo && <div className="alert-card warn"><div><strong>Observaciones del asesor</strong><p>{data.motivo}</p></div></div>}
    {data.estado_verificacion !== 'aprobada' && <div className="alert-card"><div><strong>Tu organización aún no está verificada</strong><p>Puedes preparar el perfil; se publicará cuando el equipo te verifique.</p></div></div>}
    <div className="ong-editor"><div className="settings-card"><div className="form-grid"><label>Emblema<select value={form.emblema} onChange={e => set('emblema', e.target.value as OngPerfil['emblema'])}><option value="heart">Corazón</option><option value="paw">Huella</option><option value="home">Hogar</option><option value="shield">Escudo</option></select></label><label>Color<select value={form.color} onChange={e => set('color', e.target.value as OngPerfil['color'])}><option value="acento">Principal</option><option value="calido">Cálido</option><option value="info">Azul</option><option value="vino">Vino</option></select></label></div>
      <label className="composer-label">Misión<textarea rows={3} maxLength={600} value={form.mision} onChange={e => set('mision', e.target.value)} /></label>
      <label className="composer-label">Cómo ayudar<textarea rows={3} maxLength={600} value={form.como_ayudar} onChange={e => set('como_ayudar', e.target.value)} /></label>
      <label className="composer-label">Necesidades (separadas por comas)<input value={necesidades} onChange={e => setNecesidades(e.target.value)} placeholder="Alimento para cachorros, Mantas" /></label>
      <label className="composer-label">Voluntariado<textarea rows={2} maxLength={400} value={form.voluntariado} onChange={e => set('voluntariado', e.target.value)} /></label>
      <label className="composer-label">Horario de visitas<input maxLength={80} value={form.horario_visitas} onChange={e => set('horario_visitas', e.target.value)} /></label>
      <label className="check-row"><input type="checkbox" checked={donar} onChange={e => setDonar(e.target.checked)} /> Mostrar datos para donaciones por transferencia</label>
      {donar && <div className="form-grid"><label>Banco<input value={dona.banco} onChange={e => setDona('banco', e.target.value)} /></label><label>Tipo de cuenta<input value={dona.tipo_cuenta} onChange={e => setDona('tipo_cuenta', e.target.value)} /></label><label>Número<input value={dona.numero} onChange={e => setDona('numero', e.target.value)} /></label><label>Titular<input value={dona.titular} onChange={e => setDona('titular', e.target.value)} /></label><label>RUT<input value={dona.rut} onChange={e => setDona('rut', e.target.value)} placeholder="65123456-7" /></label><label>Correo<input type="email" value={dona.correo} onChange={e => setDona('correo', e.target.value)} /></label></div>}
      {error && <div className="form-error" role="alert">{error}</div>}{notice && <p className="save-message" role="status">{notice}</p>}
      <div className="settings-actions"><button type="button" className="secondary" disabled={busy} onClick={() => guardar(false)}>Guardar borrador</button><button type="button" className="primary" disabled={busy} onClick={() => guardar(true)}>Enviar a revisión</button></div></div>
      <div className="ong-preview"><p className="eyebrow">VISTA PREVIA</p><OngHero nombre={data.nombre} sub="ASÍ TE VERÁ LA COMUNIDAD" perfil={{ ...form, necesidades: necesidades.split(',').map(s => s.trim()).filter(Boolean), donaciones: donar ? dona : null }} /><PerfilBody perfil={{ ...form, necesidades: necesidades.split(',').map(s => s.trim()).filter(Boolean), donaciones: donar ? dona : null }} /></div></div>
  </section>
}

// Página pública de la ONG (#ong/<id>): versión aprobada, animales, cupones con negocios aliados e impacto.
export function PublicOngProfile({ id }: { id: string }) {
  const [ong, setOng] = useState<Publica | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api<Publica>(`/ongs/${id}`).then(value => { setOng(value); setError('') }).catch(e => setError(errorText(e))), [id])
  useEffect(() => { void load() }, [load])
  const perfil = ong?.perfil ?? { ...vacio, mision: ong?.descripcion ?? '' }
  return <div className="emergency-page adoption-public"><main style={{ width: 'min(1100px, 100%)' }}><div className="public-emergency-brand" style={{ justifyContent: 'space-between' }}><span><span className="brand-mark"><LogoMark /></span> PetSuite <span>ORGANIZACIONES</span></span><button className="secondary" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.hash = '#adopciones' }}><X size={15} /> Volver</button></div>
    {!ong ? (error ? <ErrorState message={error} onRetry={() => void load()} /> : <LoadingState label="Cargando organización pública" />) : <section className="page">
      <OngHero nombre={ong.nombre} sub={`${tipoOng[ong.tipo] || ong.tipo} · ${ong.comuna}`.toUpperCase()} perfil={perfil} />
      <div className="business-stats"><div className="metric-card"><small>Animales en adopción</small><strong>{ong.animales.length}</strong><span><MapPin size={13} /> {ong.comuna}</span></div><div className="metric-card"><small>Compras con sus cupones este mes</small><strong>{ong.impacto.canjes_mes}</strong><span>{ong.impacto.aliados} negocios aliados</span></div><div className="metric-card"><small>Impacto acumulado</small><strong>{ong.impacto.canjes_total}</strong><span>Canjes en negocios Pet-Care</span></div></div>
      {!!ong.cupones.length && <><div className="section-heading"><h3>Apoya comprando con sus cupones</h3></div><CouponList cupones={ong.cupones} por="negocio" /></>}
      <PerfilBody perfil={perfil} />
       {!!ong.animales.length ? <><div className="section-heading"><h3>Buscan un hogar</h3></div><div className="pet-grid adoption-grid">{ong.animales.map(a => <a key={a.id} className="pet-card" href="#adopciones"><Photo src={a.foto_url} nombre={a.nombre} className="pet-photo adoption-photo" /><div className="pet-info"><strong>{a.nombre}</strong><span>{a.especie}{a.edad_estimada ? ` · ${a.edad_estimada}` : ''}</span></div></a>)}</div></> : <EmptyState title="Sin animales en adopción" description="Explora otras organizaciones para encontrar a tu nuevo compañero." action="Ver adopciones" onAction={() => { window.location.hash = '#adopciones' }} />}
      {ong.contacto && <p className="muted">Contacto: {ong.contacto}{ong.redes_sociales ? ` · ${ong.redes_sociales}` : ''}</p>}
    </section>}</main></div>
}
