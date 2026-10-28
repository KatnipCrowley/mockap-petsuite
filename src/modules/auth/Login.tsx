import { useEffect, useState } from 'react'
import { QrCode, Store, Users } from 'lucide-react'
import { ApiError, api, enlaceDemo, errorText, modoDemo, sessionFrom, setSession, type AuthResponse, type Comuna, type Session } from '../../shared/api'
import { CORREO_SIN_CONFIRMAR, SEGUNDOS_ENTRE_ENVIOS, VIGENCIA_HORAS } from '../../shared/cuentas'
import { emailSchema, loginSchema, registrationSchema } from '../../shared/validators'
import { LogoMark } from '../../shared/media'

// login: ingresar; register: crear cuenta; recover: pedir enlace para una contraseña nueva;
// pending: la cuenta espera que se confirme el correo.
type Mode = 'login' | 'register' | 'recover' | 'pending'

// Actores principales primero (tutor, Pyme, ONG); después los internos de una Pyme y los de PetSuite.
// Solo existen en la demostración: la versión real no tiene cuentas de prueba.
const demoAccounts: { label: string; correo: string; detalle: string }[] = [
  { label: 'Tutor', correo: 'tutor@petsuite.cl', detalle: 'Ficha Única y QR' },
  { label: 'Pyme Plata', correo: 'tienda@petsuite.cl', detalle: 'Tienda con sucursal' },
  { label: 'Veterinaria Oro', correo: 'veterinaria@petsuite.cl', detalle: 'Dueña de la clínica' },
  { label: 'Pyme morosa', correo: 'peluqueria@petsuite.cl', detalle: 'Bajó a Gratis' },
  { label: 'ONG', correo: 'ong@petsuite.cl', detalle: 'Perfil, cupones y adopción' },
  { label: 'Jefe de local', correo: 'jefe@petsuite.cl', detalle: 'Sucursal Puerto Montt' },
  { label: 'Clínico', correo: 'clinico@petsuite.cl', detalle: 'Personal veterinario' },
  { label: 'Asesor', correo: 'asesor@petsuite.cl', detalle: 'Cuentas y aprobaciones' },
  { label: 'Admin', correo: 'admin@petsuite.cl', detalle: 'Plataforma y privacidad' },
]

const titles: Record<Exclude<Mode, 'pending'>, [string, string, string]> = {
  login: ['BIENVENIDO DE VUELTA', 'Ingresa a tu cuenta', 'Organiza todo lo importante para tus mascotas.'],
  register: ['CREA TU CUENTA GRATIS', 'Regístrate en PetSuite', 'Los tutores usan PetSuite sin costo.'],
  recover: ['RECUPERA TU ACCESO', 'Crea una contraseña nueva', 'Te enviaremos un enlace a tu correo.'],
}

/** Panel de marca y tarjeta: lo comparten el ingreso y las pantallas de los enlaces enviados por correo. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="login-page"><div className="login-art"><div className="art-orb" /><div className="brand light"><span className="brand-mark"><LogoMark /></span><span>Pet<span>Suite</span></span></div><div className="art-copy"><p className="eyebrow">TODO EN UN SOLO LUGAR</p><h1>Su mundo, mejor conectado.</h1><p>Ficha única de salud con QR de emergencia, directorio Pet-Care y muro comunal por comuna.</p>
    <ul className="art-features">
      <li><QrCode size={22} aria-hidden="true" /><span><strong>QR de emergencia</strong>Quien encuentre a tu mascota ve sus alergias y te avisa sin ver tus datos.</span></li>
      <li><Store size={22} aria-hidden="true" /><span><strong>Directorio Pet-Care</strong>Veterinarias, tiendas y peluquerías verificadas de tu comuna.</span></li>
      <li><Users size={22} aria-hidden="true" /><span><strong>Comunidad por comuna</strong>Extravíos, alertas de salud, eventos y adopciones cerca de ti.</span></li>
    </ul></div><div className="art-footer">PetSuite <span>Tu suite para mascotas</span></div></div>{children}</div>
}

/** En la demostración no salen correos: se ofrece abrir el enlace que quedó en la bandeja simulada. */
function DemoLink({ href }: { href: string | null }) {
  return href ? <p className="login-demo-link">Modo demostración: aquí no se envían correos. <a className="text-button" href={href}>Abrir el enlace del correo</a></p> : null
}

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [comunaId, setComunaId] = useState(1)
  const [regRole, setRegRole] = useState<'tutor' | 'pyme' | 'ong'>('tutor')
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [error, setError] = useState('')
  const [errorField, setErrorField] = useState('')
  const [info, setInfo] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [demoLink, setDemoLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { api<Comuna[]>('/comunas').then(setComunas).catch(() => setComunas([{ id: 1, nombre: 'Osorno' }, { id: 2, nombre: 'Puerto Montt' }, { id: 3, nombre: 'Castro' }])) }, [])

  const go = (next: Mode) => { setMode(next); setError(''); setErrorField(''); setInfo(''); setDemoLink(null) }
  const pending = (correo: string) => { setPendingEmail(correo.trim().toLowerCase()); go('pending'); setDemoLink(enlaceDemo(correo, 'verificar')) }
  const clearField = (field: string) => { if (errorField === field) { setError(''); setErrorField('') } }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(''); setErrorField(''); setInfo('')
    const parsed = mode === 'register' ? registrationSchema.safeParse({ email, password, name, comunaId, terms, privacy })
      : mode === 'recover' ? emailSchema.safeParse({ email }) : loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const field = String(issue?.path[0] || '')
      setError(issue?.message || 'Revisa los datos'); setErrorField(field)
      requestAnimationFrame(() => document.getElementById(`login-${field}`)?.focus())
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const session = sessionFrom(await api<AuthResponse>('/auth/login', { method: 'POST', body: { correo: email, clave: password } }))
        setSession(session)
        onLogin(session)
      } else if (mode === 'register') {
        const r = await api<{ correo: string }>('/auth/registro', { method: 'POST', body: { correo: email, clave: password, nombre_visible: name.trim(), comuna_id: comunaId, rol: regRole, acepta_terminos: true, acepta_privacidad: true, acepta_comunicaciones: marketing } })
        pending(r.correo)
      } else {
        await api('/auth/recuperar', { method: 'POST', body: { correo: email } })
        setInfo(`Si hay una cuenta con ${email.trim()}, te enviamos un enlace para crear una contraseña nueva. Vence en ${VIGENCIA_HORAS.restablecer} hora; revisa también la carpeta de spam.`)
        setDemoLink(enlaceDemo(email, 'restablecer'))
      }
    } catch (e) {
      // Clave correcta pero correo sin confirmar: se ofrece reenviar el enlace.
      if (mode === 'login' && e instanceof ApiError && e.status === 403 && e.message === CORREO_SIN_CONFIRMAR) pending(email)
      else setError(errorText(e))
    } finally { setBusy(false) }
  }

  const resend = async () => {
    setBusy(true); setError(''); setInfo('')
    try {
      await api('/auth/reenviar-verificacion', { method: 'POST', body: { correo: pendingEmail } })
      setInfo(`Si la cuenta sigue pendiente, enviamos un enlace nuevo a ${pendingEmail}. Puedes pedir otro cada ${SEGUNDOS_ENTRE_ENVIOS} segundos.`)
      setDemoLink(enlaceDemo(pendingEmail, 'verificar'))
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  const status = <p className={info ? 'save-message' : 'sr-only'} role="status" aria-live="polite">{info || (busy ? 'Un momento' : '')}</p>

  if (mode === 'pending') return <AuthShell><div className="login-card">
    <div><p className="eyebrow">ÚLTIMO PASO</p><h2>Revisa tu correo</h2><p className="muted">Enviamos un enlace a <strong>{pendingEmail}</strong> para activar tu cuenta. Vence en {VIGENCIA_HORAS.verificacion} horas. Si no lo ves, revisa la carpeta de spam.</p></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {status}
    <DemoLink href={demoLink} />
    <button type="button" className="primary full" disabled={busy} onClick={resend}>{busy ? 'Un momento...' : 'Reenviar correo'}</button>
    <button type="button" className="text-button" onClick={() => go('login')}>Volver a ingresar</button>
  </div></AuthShell>

  const [eyebrow, title, subtitle] = titles[mode]
  const fieldProps = (field: string) => ({ id: `login-${field}`, 'aria-invalid': errorField === field, 'aria-describedby': errorField === field ? 'login-field-error' : undefined })
  return <AuthShell>
    <form className="login-card" onSubmit={submit} noValidate>
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="muted">{subtitle}</p></div>
      {mode === 'register' && <><label>Nombre<input {...fieldProps('name')} value={name} onChange={e => { setName(e.target.value); clearField('name') }} autoComplete="name" /></label><label>Comuna<select {...fieldProps('comunaId')} value={comunaId} onChange={e => setComunaId(Number(e.target.value))}>{comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label><label>Tipo de cuenta<select value={regRole} onChange={e => setRegRole(e.target.value as 'tutor' | 'pyme' | 'ong')}><option value="tutor">Tutor de mascotas (gratis)</option><option value="pyme">Pyme (tienda, veterinaria, peluquería)</option><option value="ong">ONG de rescate y adopción (gratis)</option></select></label></>}
      <label>Correo electrónico<input {...fieldProps('email')} value={email} onChange={e => { setEmail(e.target.value); clearField('email') }} type="email" autoComplete="email" /></label>
      {mode !== 'recover' && <label>Contraseña<input {...fieldProps('password')} value={password} onChange={e => { setPassword(e.target.value); clearField('password') }} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}
      {mode === 'login' && <button type="button" className="text-button login-forgot" onClick={() => go('recover')}>¿Olvidaste tu contraseña?</button>}
      {mode === 'register' && <div className="consent-block" role="group" aria-label="Consentimientos">
        <label className="permanent-choice"><input {...fieldProps('terms')} type="checkbox" checked={terms} onChange={e => { setTerms(e.target.checked); clearField('terms') }} /> Acepto los términos de uso (obligatorio)</label>
        <label className="permanent-choice"><input {...fieldProps('privacy')} type="checkbox" checked={privacy} onChange={e => { setPrivacy(e.target.checked); clearField('privacy') }} /> Autorizo a PetSuite a tratar mis datos personales para prestar el servicio, según el aviso de privacidad (obligatorio)</label>
        <label className="permanent-choice"><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} /> Quiero recibir novedades y ofertas de negocios aliados (opcional)</label>
        <small className="muted">Ley 21.719: puedes revisar, descargar o pedir la eliminación de tus datos y retirar los consentimientos opcionales en Configuración &gt; Privacidad y datos.</small></div>}
      {error && <div id={errorField ? 'login-field-error' : undefined} className="form-error" role={errorField ? undefined : 'alert'}>{error}</div>}
      {status}
      <DemoLink href={demoLink} />
      <button className="primary full" disabled={busy}>{busy ? 'Un momento...' : mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</button>
      <button type="button" className="text-button" onClick={() => go(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}</button>
      {mode === 'login' && modoDemo && <><div className="login-divider"><span>cuentas de demostración · clave petsuite123</span></div><div className="demo-roles">{demoAccounts.map(a => <button type="button" key={a.correo} className="demo-role" title={a.detalle} onClick={() => { setEmail(a.correo); setPassword('petsuite123'); setError(''); setErrorField('') }}>{a.label}</button>)}</div></>}
      <a className="text-button" href="#adopciones">Ver animales en adopción (sin cuenta)</a>
      <a className="text-button" href="#planes">¿Tienes un negocio? Revisa los planes Gratis, Bronce, Plata y Oro</a>
      <p className="terms">Al ingresar aceptas nuestros <u>términos de uso</u> y <u>política de privacidad</u>.</p>
    </form>
  </AuthShell>
}
