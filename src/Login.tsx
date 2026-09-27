import { useEffect, useState } from 'react'
import { PawPrint } from 'lucide-react'
import { api, errorText, setSession, type ApiRole, type Comuna, type Session } from './api'
import { loginSchema } from './validators'
import { LogoMark } from './media'

type Auth = { token: string; usuario: { id: string; rol: ApiRole; nombre_visible: string; comuna_id: number | null } }

const demoAccounts: { rol: ApiRole; label: string; correo: string }[] = [
  { rol: 'tutor', label: 'Tutor', correo: 'tutor@petsuite.cl' },
  { rol: 'pyme', label: 'Pyme', correo: 'tienda@petsuite.cl' },
  { rol: 'clinico', label: 'Clínico', correo: 'clinico@petsuite.cl' },
  { rol: 'ong', label: 'ONG', correo: 'ong@petsuite.cl' },
  { rol: 'admin', label: 'Admin', correo: 'admin@petsuite.cl' },
]

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [comunaId, setComunaId] = useState(1)
  const [regRole, setRegRole] = useState<'tutor' | 'pyme' | 'ong'>('tutor')
  const [terms, setTerms] = useState(false)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { api<Comuna[]>('/comunas').then(setComunas).catch(() => setComunas([{ id: 1, nombre: 'Osorno' }, { id: 2, nombre: 'Puerto Montt' }, { id: 3, nombre: 'Castro' }])) }, [])

  const finish = (data: Auth) => {
    const session: Session = { token: data.token, id: data.usuario.id, rol: data.usuario.rol, nombre: data.usuario.nombre_visible, comunaId: data.usuario.comuna_id }
    setSession(session)
    onLogin(session)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa los datos'); return }
    if (mode === 'register' && (name.trim().length < 2)) { setError('Ingresa tu nombre'); return }
    if (mode === 'register' && password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (mode === 'register' && !terms) { setError('Debes aceptar los términos y el aviso de privacidad'); return }
    setBusy(true)
    try {
      const data = mode === 'login'
        ? await api<Auth>('/auth/login', { method: 'POST', body: { correo: email, clave: password } })
        : await api<Auth>('/auth/registro', { method: 'POST', body: { correo: email, clave: password, nombre_visible: name.trim(), comuna_id: comunaId, rol: regRole, acepta_terminos: true } })
      finish(data)
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  return <div className="login-page"><div className="login-art"><div className="art-orb" /><div className="brand light"><span className="brand-mark"><LogoMark /></span><span>Pet<span>Suite</span></span></div><div className="art-copy"><p className="eyebrow">TODO EN UN SOLO LUGAR</p><h1>Su mundo, mejor conectado.</h1><p>Ficha única de salud con QR de emergencia, directorio Pet-Care y muro comunal por comuna.</p></div><div className="art-footer">PetSuite <span>Tu suite para mascotas</span></div></div>
    <form className="login-card" onSubmit={submit} noValidate>
      <div><p className="eyebrow">{mode === 'login' ? 'BIENVENIDO DE VUELTA' : 'CREA TU CUENTA GRATIS'}</p><h2>{mode === 'login' ? 'Ingresa a tu cuenta' : 'Regístrate en PetSuite'}</h2><p className="muted">{mode === 'login' ? 'Organiza todo lo importante para tus mascotas.' : 'Los tutores usan PetSuite sin costo.'}</p></div>
      {mode === 'register' && <><label>Nombre<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label><label>Comuna<select value={comunaId} onChange={e => setComunaId(Number(e.target.value))}>{comunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label><label>Tipo de cuenta<select value={regRole} onChange={e => setRegRole(e.target.value as 'tutor' | 'pyme' | 'ong')}><option value="tutor">Tutor de mascotas (gratis)</option><option value="pyme">Pyme (tienda, veterinaria, peluquería)</option><option value="ong">ONG de rescate y adopción (gratis)</option></select></label></>}
      <label>Correo electrónico<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" /></label>
      <label>Contraseña<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      {mode === 'register' && <label className="permanent-choice"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} /> Acepto los términos de uso y el aviso de privacidad</label>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary full" disabled={busy}>{busy ? 'Un momento...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
      <button type="button" className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}</button>
      {mode === 'login' && <><div className="login-divider"><span>cuentas de demostración · clave petsuite123</span></div><div className="demo-roles">{demoAccounts.map(a => <button type="button" key={a.rol} className="demo-role" onClick={() => { setEmail(a.correo); setPassword('petsuite123'); setError('') }}>{a.label}</button>)}</div></>}
      <a className="text-button" href="#adopciones">Ver animales en adopción (sin cuenta)</a>
      <p className="terms">Al ingresar aceptas nuestros <u>términos de uso</u> y <u>política de privacidad</u>.</p>
    </form></div>
}
