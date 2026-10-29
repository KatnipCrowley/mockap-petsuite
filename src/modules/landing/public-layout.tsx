import { getSession } from '../../shared/api'
import { LogoMark } from '../../shared/media'

type Seccion = 'inicio' | 'explorar' | 'adopciones' | 'negocios'
const enlaces: [Seccion, string, string][] = [['explorar', 'Explorar', '#explorar'], ['adopciones', 'Adopciones', '#adopciones'], ['negocios', 'Para negocios', '#planes']]

// «#» vuelve a la raíz: la landing para visitantes, el panel para quien ya inició sesión.
export function PublicBrand({ size = 32 }: { size?: number }) {
  return <a className="public-brand" href="#" aria-label="PetSuite, ir al inicio"><span className="brand-mark"><LogoMark size={size} /></span><span>Pet<span>Suite</span></span></a>
}

/** Encabezado de las páginas sin sesión: landing, Explorar y perfil público del local. */
export function PublicHeader({ current }: { current?: Seccion }) {
  const conSesion = !!getSession()
  return <header className="public-header"><div className="public-header-inner">
    <PublicBrand />
    <nav className="public-nav" aria-label="Secciones de PetSuite">{enlaces.map(([id, label, href]) => <a key={id} href={href} aria-current={current === id ? 'page' : undefined}>{label}</a>)}</nav>
    <div className="public-account">{conSesion
      ? <a className="primary" href="#">Ir a mi cuenta</a>
      : <><a className="secondary" href="#ingresar">Ingresar</a><a className="primary public-signup" href="#registro">Crear cuenta</a></>}</div>
  </div></header>
}

export function PublicFooter() {
  return <footer className="public-footer"><div className="public-footer-inner">
    <div className="public-footer-brand"><PublicBrand size={28} /><p>Servicios Pet-Care de tu comuna, ficha de salud con QR y comunidad en un solo lugar.</p></div>
    <nav aria-label="Enlaces del pie de página"><a href="#explorar">Explorar</a><a href="#adopciones">Adopciones</a><a href="#planes">Planes para negocios</a><a href="#registro">Crear cuenta</a><a href="#ingresar">Ingresar</a></nav>
    <small>© {new Date().getFullYear()} PetSuite · Fotos de demostración: Pexels</small>
  </div></footer>
}
