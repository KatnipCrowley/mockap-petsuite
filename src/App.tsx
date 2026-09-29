import { useEffect, useState } from 'react'
import { ChartColumn, Check, CreditCard, Heart, House, Package, PawPrint, Settings, ShieldCheck, Stethoscope, Store, Users } from 'lucide-react'
import { LogoMark } from './media'
import { api, getSession, setSession, type ApiRole, type Session } from './api'
import { Login } from './Login'
import { EmergencyView, TutorArea } from './tutor'
import { BusinessArea } from './business'
import { ClinicalArea } from './clinical'
import { AdminArea } from './admin'
import { AdoptionCatalog, OngArea } from './adoption'
import { resetDemo } from './mock/db'

const roleMenus: Record<ApiRole, readonly (readonly [string, string])[]> = {
  tutor: [['Inicio', 'home'], ['Mis mascotas', 'pets'], ['Directorio', 'directory'], ['Adopciones', 'adoption'], ['Muro comunal', 'community'], ['Configuración', 'settings']],
  ong: [['Inicio', 'ong-home'], ['Mis animales', 'animals'], ['Configuración', 'settings']],
  pyme: [['Inicio', 'business-home'], ['Catálogo', 'catalog'], ['Perfil del negocio', 'business-profile'], ['Métricas', 'metrics'], ['Suscripción', 'subscription'], ['Configuración', 'settings']],
  clinico: [['Inicio', 'clinical-home'], ['Pacientes', 'patients'], ['Perfil de la clínica', 'clinic-profile'], ['Configuración', 'settings']],
  admin: [['Inicio', 'admin-home'], ['Usuarios', 'users'], ['Moderación', 'moderation'], ['Pymes y suscripciones', 'subscriptions'], ['Verificar ONG', 'ongs'], ['Configuración', 'settings']],
}
const firstView: Record<ApiRole, string> = { tutor: 'home', pyme: 'business-home', clinico: 'clinical-home', admin: 'admin-home', ong: 'ong-home' }

const navIcons: Record<string, typeof House> = {
  home: House, pets: PawPrint, directory: Store, community: Users, settings: Settings,
  'business-home': House, catalog: Package, metrics: ChartColumn, subscription: CreditCard,
  'clinical-home': House, patients: Stethoscope, 'admin-home': House, users: Users, moderation: ShieldCheck, subscriptions: CreditCard,
  adoption: Heart, 'ong-home': House, animals: PawPrint, ongs: ShieldCheck, 'business-profile': Store, 'clinic-profile': Store,
}


type ThemeName = 'original' | 'océano' | 'bosque' | 'lavanda' | 'coral' | 'vino'
type ColorMode = 'light' | 'dark' | 'system'

const themeOptions: { name: ThemeName; color: string; label: string }[] = [
  { name: 'original', color: '#0e7c72', label: 'PetSuite' },
  { name: 'océano', color: '#1a6fa0', label: 'Océano' },
  { name: 'bosque', color: '#3a7d44', label: 'Bosque' },
  { name: 'lavanda', color: '#6b4fbb', label: 'Lavanda' },
  { name: 'coral', color: '#d4553f', label: 'Coral' },
  { name: 'vino', color: '#8a3a55', label: 'Vino' },
]


function applyAppearance(theme: ThemeName, mode: ColorMode, brightness: number) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.mode = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'
  root.style.setProperty('--brightness-dark', `${Math.max(0, 100 - brightness) * 0.7}%`)
  root.style.setProperty('--brightness-light', `${Math.max(0, brightness - 100) * 0.45}%`)
}

const roleLabels: Record<ApiRole, string> = { tutor: 'Tutor de mascotas', pyme: 'Administrador de Pyme', clinico: 'Personal clínico veterinario', admin: 'Administrador PetSuite', ong: 'ONG de rescate y adopción' }

type Profile = { name: string; email: string; phone: string; avatar: string }

function App() {
  const [user, setUser] = useState<Session | null>(getSession)
  const [active, setActive] = useState(() => { const s = getSession(); return s ? firstView[s.rol] : 'home' })
  const [theme, setTheme] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('petsuite-theme')
    return themeOptions.some(option => option.name === stored) ? stored as ThemeName : 'original'
  })
  const [mode, setMode] = useState<ColorMode>(() => (localStorage.getItem('petsuite-mode') as ColorMode) || 'light')
  const [brightness, setBrightness] = useState(() => Number(localStorage.getItem('petsuite-brightness')) || 100)
  const [profile, setProfile] = useState<Profile>({ name: '', email: '', phone: '', avatar: '' })
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const applyMode = () => applyAppearance(theme, mode, brightness)
    applyMode(); localStorage.setItem('petsuite-theme', theme); localStorage.setItem('petsuite-mode', mode); localStorage.setItem('petsuite-brightness', String(brightness))
    if (mode === 'system') { const media = window.matchMedia('(prefers-color-scheme: dark)'); media.addEventListener('change', applyMode); return () => media.removeEventListener('change', applyMode) }
  }, [theme, mode, brightness])

  useEffect(() => { const updateHash = () => setHash(window.location.hash); window.addEventListener('hashchange', updateHash); return () => window.removeEventListener('hashchange', updateHash) }, [])

  // El perfil se completa con los datos reales de la cuenta; teléfono y avatar son preferencias locales de este navegador.
  useEffect(() => {
    if (!user) return
    const stored = JSON.parse(localStorage.getItem(`petsuite-profile-${user.id}`) || '{}') as Partial<Profile>
    setProfile({ name: user.nombre, email: '', phone: stored.phone || '', avatar: user.nombre.slice(0, 2).toUpperCase() })
    api<{ correo: string }>('/auth/yo').then(me => setProfile(p => ({ ...p, email: me.correo }))).catch(() => undefined)
  }, [user])

  if (hash.startsWith('#qr/')) return <EmergencyView token={hash.slice(4)} />
  if (hash.startsWith('#emergency/')) return <EmergencyView token={null} />
  if (hash.startsWith('#adopciones')) return <AdoptionCatalog standalone />
  if (!user) return <Login onLogin={session => { setUser(session); setActive(firstView[session.rol]) }} />

  const logout = () => { setSession(null); setUser(null) }
  const saveProfile = (next: Profile) => { setProfile(next); localStorage.setItem(`petsuite-profile-${user.id}`, JSON.stringify({ phone: next.phone })) }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><LogoMark /></span><span>Pet<span>Suite</span></span></div>
        <div className="profile-mini"><div className="avatar">{user.nombre.slice(0, 2).toUpperCase()}</div><div><strong>{user.nombre}</strong><small>{roleLabels[user.rol]}</small></div></div>
        <nav aria-label="Navegación principal">{roleMenus[user.rol].map(([label, id]) => { const Icon = navIcons[id]; return <button className={active === id ? 'nav-item active' : 'nav-item'} aria-current={active === id ? 'page' : undefined} aria-label={label} title={label} onClick={() => setActive(id)} key={id}><Icon className="nav-icon" size={19} strokeWidth={1.8} /><span>{label}</span></button> })}</nav>
        <div className="sidebar-bottom" />
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="mobile-brand brand"><span className="brand-mark"><LogoMark /></span><span>Pet<span>Suite</span></span></div><div className="topbar-context">{roleLabels[user.rol]}</div><div className="top-actions"><div className="avatar small" aria-label={user.nombre}>{user.nombre.slice(0, 2).toUpperCase()}</div></div></header>
        {active !== 'settings' && user.rol === 'tutor' && <TutorArea active={active} setActive={setActive} name={user.nombre} />}
        {active !== 'settings' && user.rol === 'pyme' && <BusinessArea active={active} />}
        {active !== 'settings' && user.rol === 'clinico' && <ClinicalArea active={active} />}
        {active !== 'settings' && user.rol === 'admin' && <AdminArea active={active} />}
        {active !== 'settings' && user.rol === 'ong' && <OngArea active={active} />}
        {active === 'settings' && <div className="settings-workspace"><TabbedSettingsView profile={profile} setProfile={saveProfile} theme={theme} setTheme={setTheme} mode={mode} setMode={setMode} brightness={brightness} setBrightness={setBrightness} onLogout={logout} /><section className="settings-card profile-session-card"><div><p className="eyebrow">SESIÓN</p><h2>Salir de PetSuite</h2><p className="muted">Cierra la sesión de este dispositivo.</p></div><button type="button" className="secondary" onClick={logout}>Cerrar sesión</button></section></div>}
      </main>
    </div>
  )
}


function TabbedSettingsView({ profile, setProfile, theme, setTheme, mode, setMode, brightness, setBrightness, onLogout }: { profile: { name: string; email: string; phone: string; avatar: string }; setProfile: (profile: { name: string; email: string; phone: string; avatar: string }) => void; theme: ThemeName; setTheme: (theme: ThemeName) => void; mode: ColorMode; setMode: (mode: ColorMode) => void; brightness: number; setBrightness: (brightness: number) => void; onLogout: () => void }) {
  const [section, setSection] = useState('profile')
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState(() => localStorage.getItem('petsuite-notifications') !== 'false')
  const [publicProfile, setPublicProfile] = useState(() => localStorage.getItem('petsuite-public-profile') !== 'false')
  const [draftTheme, setDraftTheme] = useState(theme)
  const [draftMode, setDraftMode] = useState(mode)
  const [draftBrightness, setDraftBrightness] = useState(brightness)
  useEffect(() => {
    if (section !== 'appearance') return
    const preview = () => applyAppearance(draftTheme, draftMode, draftBrightness)
    preview()
    if (draftMode === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener('change', preview)
      return () => { media.removeEventListener('change', preview); applyAppearance(theme, mode, brightness) }
    }
    return () => applyAppearance(theme, mode, brightness)
  }, [section, draftTheme, draftMode, draftBrightness, theme, mode, brightness])
  useEffect(() => {
    if (section !== 'appearance') {
      setDraftTheme(theme)
      setDraftMode(mode)
      setDraftBrightness(brightness)
    }
  }, [section, theme, mode, brightness])
  const saveProfile = (event: React.FormEvent) => { event.preventDefault(); setProfile({ ...draft, avatar: draft.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() }); setSaved(true); window.setTimeout(() => setSaved(false), 2200) }
  const toggle = (key: 'notifications' | 'publicProfile', value: boolean) => { if (key === 'notifications') { setNotifications(value); localStorage.setItem('petsuite-notifications', String(value)) } else { setPublicProfile(value); localStorage.setItem('petsuite-public-profile', String(value)) } }
  const confirmAppearance = () => { setTheme(draftTheme); setMode(draftMode); setBrightness(draftBrightness); setSaved(true); window.setTimeout(() => setSaved(false), 2200) }
  const sections = [['profile', 'Perfil'], ['appearance', 'Apariencia'], ['notifications', 'Notificaciones'], ['privacy', 'Privacidad']] as const
  return <section className="page settings-page"><div className="page-title"><div><p className="eyebrow">TU CUENTA</p><h1>Configuración</h1><p className="muted">Personaliza tu experiencia en PetSuite.</p></div></div><div className="settings-layout"><div className="settings-nav">{sections.map(([id, label]) => <button key={id} className={section === id ? 'settings-nav-item active' : 'settings-nav-item'} onClick={() => setSection(id)}>{label}</button>)}</div><div className="settings-content">{section === 'profile' && <form className="settings-card" onSubmit={saveProfile}><div className="settings-card-heading"><div><p className="eyebrow">INFORMACIÓN PERSONAL</p><h2>Perfil</h2></div><div className="profile-avatar">{draft.avatar}</div></div><div className="settings-form-grid"><label>Nombre completo<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label><label>Correo electrónico<input type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label><label>Teléfono<input value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /></label></div><div className="settings-actions"><span className="save-message">{saved ? 'Cambios guardados' : ''}</span><button className="primary">Guardar cambios</button></div></form>}{section === 'appearance' && <div className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">PERSONALIZA LA INTERFAZ</p><h2>Apariencia</h2><p className="muted">Previsualiza y confirma tus preferencias visuales.</p></div></div><div className="theme-options">{themeOptions.map(option => <button type="button" key={option.name} className={draftTheme === option.name ? 'theme-option selected' : 'theme-option'} onClick={() => setDraftTheme(option.name)}><span className="theme-swatch" style={{ background: option.color }} /><span>{option.label}</span>{draftTheme === option.name && <Check size={16} aria-hidden="true" />}</button>)}</div><div className="mode-options"><button type="button" className={draftMode === 'light' ? 'mode-option active' : 'mode-option'} onClick={() => setDraftMode('light')}>Claro</button><button type="button" className={draftMode === 'dark' ? 'mode-option active' : 'mode-option'} onClick={() => setDraftMode('dark')}>Oscuro</button><button type="button" className={draftMode === 'system' ? 'mode-option active' : 'mode-option'} onClick={() => setDraftMode('system')}>Sistema</button></div><label className="brightness-control">Brillo de la interfaz <output>{draftBrightness}%</output><input type="range" min="70" max="115" value={draftBrightness} onChange={event => setDraftBrightness(Number(event.target.value))} /></label><div className="settings-actions"><span className="save-message">{saved ? 'Preferencias confirmadas' : ''}</span><button type="button" className="primary" onClick={confirmAppearance}>Confirmar cambios</button></div></div>}{section === 'notifications' && <div className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">PREFERENCIAS</p><h2>Notificaciones</h2><p className="muted">Controla los avisos que recibes de PetSuite.</p></div></div><SettingRow title="Avisos de la comunidad" text="Recibe novedades sobre publicaciones y contactos." value={notifications} onChange={value => toggle('notifications', value)} /></div>}{section === 'privacy' && <><div className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">VISIBILIDAD</p><h2>Privacidad</h2><p className="muted">Decide qué información pueden ver otros tutores.</p></div></div><SettingRow title="Perfil público" text="Permite que otros vean tu nombre en el muro comunal." value={publicProfile} onChange={value => toggle('publicProfile', value)} /></div><div className="settings-card"><div><p className="eyebrow">MODO DEMOSTRACIÓN</p><h2>Datos de demostración</h2><p className="muted">Sin servidor, los datos viven solo en este navegador: un QR abierto en otro teléfono mostrará «Medalla no válida». Restablecer borra lo que creaste aquí y cierra la sesión.</p></div><button type="button" className="secondary" onClick={() => { if (window.confirm('¿Restablecer los datos de demostración? Se perderán las mascotas, publicaciones y cambios hechos en este navegador.')) { resetDemo(); onLogout() } }}>Restablecer datos de demostración</button></div><div className="settings-card danger-card"><div><p className="eyebrow">SESIÓN</p><h2>Salir de PetSuite</h2><p className="muted">Cierra la sesión de este dispositivo.</p></div><button type="button" className="secondary danger-button" onClick={onLogout}>Cerrar sesión</button></div></>}</div></div></section>
}

function SettingRow({ title, text, value, onChange }: { title: string; text: string; value: boolean; onChange: (value: boolean) => void }) { return <div className="setting-row"><div><strong>{title}</strong><p>{text}</p></div><button type="button" aria-label={`Cambiar ${title}`} className={value ? 'toggle on' : 'toggle'} onClick={() => onChange(!value)} /></div> }

export default App
