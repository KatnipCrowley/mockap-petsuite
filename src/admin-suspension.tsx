import { useEffect, useState } from 'react'
import { CalendarDays, ShieldAlert, X } from 'lucide-react'
import { api, errorText } from './api'
import { Loading } from './media'
import { userSuspensionSchema } from './validators'

export type AccountSummary = {
  id: string; nombre_visible: string; correo?: string; rol?: string; estado?: string
  suspension?: { tipo: 'temporal' | 'permanente'; dias: number | null; hasta: string | null; motivo: string; mensaje: string; aplicada_en: string } | null
}
type Complaint = { id: string; motivo: string; estado: string; creado_en: string; reportante: string; contenido: string | null }
type Reason = 'acoso' | 'spam' | 'contenido_inapropiado' | 'suplantacion' | 'incumplimiento_normas' | 'otro'

const reasons: { value: Reason; label: string }[] = [
  { value: 'acoso', label: 'Acoso' }, { value: 'spam', label: 'Spam' },
  { value: 'contenido_inapropiado', label: 'Contenido inapropiado' }, { value: 'suplantacion', label: 'Suplantación' },
  { value: 'incumplimiento_normas', label: 'Normas de la comunidad' }, { value: 'otro', label: 'Otro motivo' },
]
const reasonLabel = (value: string) => reasons.find(reason => reason.value === value)?.label || value

export function SuspensionReview({ user, initialView = 'suspend', relatedReportId, onClose, onConfirmed }: {
  user: AccountSummary; initialView?: 'reports' | 'suspend'; relatedReportId?: string; onClose: () => void; onConfirmed: () => Promise<void>
}) {
  const [view, setView] = useState(initialView)
  const [complaints, setComplaints] = useState<Complaint[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [tipo, setTipo] = useState<'temporal' | 'permanente'>('temporal')
  const [dias, setDias] = useState('7')
  const [motivo, setMotivo] = useState<Reason | ''>('')
  const [mensaje, setMensaje] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    api<Complaint[]>(`/admin/usuarios/${user.id}/denuncias`)
      .then(rows => { if (mounted) { setComplaints(rows); setLoadError('') } })
      .catch(e => { if (mounted) setLoadError(errorText(e)) })
    return () => { mounted = false }
  }, [user.id])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onClose])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = userSuspensionSchema.safeParse({ tipo, dias: tipo === 'temporal' ? Number(dias) : null, motivo, mensaje })
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Revisa la medida'); return }
    if (!confirmed) { setError('Confirma que revisaste la medida antes de aplicarla'); return }
    if (!complaints) { setError('Espera a que cargue el historial de denuncias'); return }
    setBusy(true); setError('')
    try {
      await api(`/admin/usuarios/${user.id}`, { method: 'PATCH', body: { estado: 'suspendido', suspension: parsed.data, ...(relatedReportId ? { reporte_id: relatedReportId } : {}) } })
      await onConfirmed(); onClose()
    } catch (e) { setError(errorText(e)) } finally { setBusy(false) }
  }

  return <div className="modal-backdrop account-review-backdrop"><article className="modal account-review-modal" role="dialog" aria-modal="true" aria-labelledby="account-review-title">
    <button type="button" className="close" aria-label="Cerrar revisión" autoFocus onClick={onClose}><X size={21} /></button>
    <div className="account-review-heading"><p className="eyebrow">GESTIÓN DE CUENTAS · PETSUITE</p><h2 id="account-review-title">{view === 'reports' ? 'Denuncias del usuario' : 'Revisar suspensión'}</h2><p className="muted">{user.nombre_visible}{user.correo ? ` · ${user.correo}` : ''}</p></div>
    <div className="account-review-tabs" role="group" aria-label="Secciones de revisión"><button type="button" className={view === 'reports' ? 'active' : ''} aria-pressed={view === 'reports'} onClick={() => setView('reports')}>Denuncias {complaints && `(${complaints.length})`}</button>{user.estado !== 'suspendido' && <button type="button" className={view === 'suspend' ? 'active' : ''} aria-pressed={view === 'suspend'} onClick={() => setView('suspend')}>Suspensión</button>}</div>
    <div className="account-review-grid"><section className="account-review-evidence"><div className="account-review-section-title"><div><p className="eyebrow">ANTECEDENTES</p><h3>Denuncias por sus publicaciones</h3></div><span className="account-review-count">{complaints?.length ?? '—'}</span></div><p className="muted">Contenido, motivo y mensajes enviados por quienes denunciaron. Se muestran denuncias abiertas y revisadas.</p>
      {loadError && <p className="form-error" role="alert">{loadError}</p>}{!complaints && !loadError && <Loading rows={2} />}
      {complaints?.length === 0 && <div className="account-review-empty"><ShieldAlert size={24} /><strong>Sin denuncias registradas</strong><p>Esta cuenta no tiene publicaciones denunciadas en PetSuite.</p></div>}
      {!!complaints?.length && <div className="account-review-complaints">{complaints.map(report => <article className={report.id === relatedReportId ? 'account-complaint highlighted' : 'account-complaint'} key={report.id}><div className="account-complaint-heading"><span>{report.estado === 'abierto' ? 'Pendiente' : 'Revisada'}</span><small>{new Date(report.creado_en).toLocaleString('es-CL')}</small></div><strong>Publicación afectada</strong><p>{report.contenido || 'El contenido ya no está disponible.'}</p><strong>Mensaje de la denuncia</strong><p>“{report.motivo}”</p><small>Denunció: {report.reportante}</small></article>)}</div>}
    </section>
    {view === 'suspend' && user.estado !== 'suspendido' ? <form className="account-review-form" onSubmit={submit} noValidate><p className="eyebrow">MEDIDA PARA LA CUENTA</p><h3>Tipo de suspensión</h3><div className="account-suspension-types"><label className={tipo === 'temporal' ? 'active' : ''}><input type="radio" name="tipo-suspension" checked={tipo === 'temporal'} onChange={() => { setTipo('temporal'); setError('') }} /><span><strong>Temporal</strong><small>Se reactiva automáticamente al vencer.</small></span></label><label className={tipo === 'permanente' ? 'active' : ''}><input type="radio" name="tipo-suspension" checked={tipo === 'permanente'} onChange={() => { setTipo('permanente'); setError('') }} /><span><strong>Permanente</strong><small>Requiere reactivación manual.</small></span></label></div>
      {tipo === 'temporal' && <label className="account-days">Duración en días <small>Mínimo 1, máximo 3650</small><input type="number" min="1" max="3650" step="1" value={dias} onChange={event => { setDias(event.target.value); setError('') }} /></label>}
      <fieldset className="account-quick-reasons"><legend>Razón de la suspensión</legend><p className="muted">Selecciona un motivo rápido y explica la medida en el mensaje.</p><div>{reasons.map(reason => <button key={reason.value} type="button" className={motivo === reason.value ? 'active' : ''} aria-pressed={motivo === reason.value} onClick={() => { setMotivo(reason.value); setError('') }}>{reason.label}</button>)}</div></fieldset>
      <label className="account-decision-message">Mensaje de la decisión <small>Obligatorio · mínimo 10 caracteres</small><textarea rows={4} maxLength={1000} value={mensaje} onChange={event => { setMensaje(event.target.value); setError('') }} placeholder="Explica por qué se aplica la medida y qué debe saber el usuario..." /></label>
      {relatedReportId && <p className="account-related-note">Al confirmar también se ocultará la publicación denunciada y se cerrarán sus denuncias abiertas.</p>}
      <div className="account-decision-summary"><CalendarDays size={19} /><span>Medida: <strong>{tipo === 'temporal' ? `${dias || '—'} ${dias === '1' ? 'día' : 'días'}` : 'permanente'}</strong>{motivo && ` · ${reasonLabel(motivo)}`}</span></div>
      <label className="account-confirm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> Confirmo que revisé la cuenta y quiero aplicar esta suspensión.</label>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="account-review-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button type="submit" className="primary" disabled={busy || !complaints}>{busy ? 'Aplicando...' : 'Confirmar suspensión'}</button></div>
    </form> : <div className="account-review-side-note"><p className="eyebrow">ESTADO DE LA CUENTA</p>{user.suspension ? <><h3>Suspensión {user.suspension.tipo}</h3><p>Motivo: {reasonLabel(user.suspension.motivo)}</p>{user.suspension.hasta && <p>Hasta el {new Date(user.suspension.hasta).toLocaleString('es-CL')}</p>}<p>{user.suspension.mensaje}</p></> : <><h3>{user.estado === 'suspendido' ? 'Cuenta suspendida' : 'Cuenta activa'}</h3><p>Consulta los antecedentes antes de decidir si corresponde una medida.</p>{user.estado !== 'suspendido' && <button type="button" className="primary" onClick={() => setView('suspend')}>Revisar suspensión</button>}</>}</div>}
    </div>
  </article></div>
}
