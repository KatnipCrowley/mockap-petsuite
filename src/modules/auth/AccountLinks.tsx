import { useEffect, useRef, useState } from 'react'
import { api, errorText, sessionFrom, setSession, type AuthResponse, type Session } from '../../shared/api'
import { newPasswordSchema } from '../../shared/validators'
import { AuthShell } from './Login'

/** #verificar/<token>: confirma el correo y deja la sesión iniciada. */
export function VerifyEmail({ token, onLogin, onExit }: { token: string; onLogin: (session: Session) => void; onExit: () => void }) {
  const [error, setError] = useState('')
  const started = useRef(false)
  useEffect(() => {
    // El enlace sirve una sola vez: se envía una vez aunque React monte el componente dos veces en desarrollo.
    if (started.current) return
    started.current = true
    api<AuthResponse>('/auth/verificar', { method: 'POST', body: { token } })
      .then(data => { const session = sessionFrom(data); setSession(session); onLogin(session) })
      .catch(e => setError(errorText(e)))
  }, [token, onLogin])
  return <AuthShell><div className="login-card">
    {error
      ? <><div><p className="eyebrow">CONFIRMACIÓN DE CORREO</p><h2>No pudimos confirmar tu correo</h2></div><div className="form-error" role="alert">{error}</div><button type="button" className="primary full" onClick={onExit}>Ir a ingresar</button></>
      : <div role="status"><p className="eyebrow">CONFIRMACIÓN DE CORREO</p><h2>Activando tu cuenta</h2><p className="muted">Un momento, estamos confirmando tu correo.</p></div>}
  </div></AuthShell>
}

/** #restablecer/<token>: crea una contraseña nueva, por recuperación o por invitación de una Pyme o del asesor. */
export function ResetPassword({ token, onDone, onExit }: { token: string; onDone: () => void; onExit: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [field, setField] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = newPasswordSchema.safeParse({ password, confirm })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const f = String(issue?.path[0] || 'password')
      setError(issue?.message || 'Revisa la contraseña'); setField(f)
      requestAnimationFrame(() => document.getElementById(`reset-${f}`)?.focus())
      return
    }
    setBusy(true); setError(''); setField('')
    try {
      await api('/auth/restablecer', { method: 'POST', body: { token, clave: parsed.data.password } })
      setDone(true)
      onDone()
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }
  const props = (f: string) => ({ id: `reset-${f}`, 'aria-invalid': field === f, 'aria-describedby': field === f ? 'reset-field-error' : undefined })

  if (done) return <AuthShell><div className="login-card" role="status"><div><p className="eyebrow">CONTRASEÑA LISTA</p><h2>Ya puedes ingresar</h2><p className="muted">Guardamos tu nueva contraseña. Por seguridad, cerramos las sesiones que tenías abiertas en otros dispositivos.</p></div><button type="button" className="primary full" onClick={onExit}>Ingresar</button></div></AuthShell>
  return <AuthShell><form className="login-card" onSubmit={submit} noValidate>
    <div><p className="eyebrow">TU CONTRASEÑA</p><h2>Crea una contraseña nueva</h2><p className="muted">Usa al menos 8 caracteres. El enlace sirve una sola vez.</p></div>
    <label>Nueva contraseña<input {...props('password')} type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); if (field === 'password') { setError(''); setField('') } }} /></label>
    <label>Repite la contraseña<input {...props('confirm')} type="password" autoComplete="new-password" value={confirm} onChange={e => { setConfirm(e.target.value); if (field === 'confirm') { setError(''); setField('') } }} /></label>
    {error && <div id={field ? 'reset-field-error' : undefined} className="form-error" role={field ? undefined : 'alert'}>{error}</div>}
    <button className="primary full" disabled={busy}>{busy ? 'Un momento...' : 'Guardar contraseña'}</button>
    <button type="button" className="text-button" onClick={onExit}>Volver a ingresar</button>
  </form></AuthShell>
}
