// Cliente del API PetSuite. Por ahora NO hay servidor: cada llamada se resuelve en el navegador con mock/server.ts,
// que imita las rutas y reglas del API real y guarda los datos en localStorage.
// Para conectar el backend real basta con volver a `fetch('/api/v1' + path)` con el encabezado
// `Authorization: Bearer <token>` dentro de api(); el resto de la aplicación no cambia.
import { handle } from './mock/server'

export type ApiRole = 'tutor' | 'pyme' | 'clinico' | 'admin' | 'ong'
export type Session = { token: string; id: string; rol: ApiRole; nombre: string; comunaId: number | null }

const KEY = 'petsuite-session'

export const getSession = (): Session | null => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { return null }
}
export const setSession = (s: Session | null) => {
  try { s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY) } catch { /* almacenamiento no disponible */ }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const session = getSession()
  try {
    return await handle(options.method || 'GET', path, options.body, session) as T
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401 && session) { setSession(null); window.location.reload() }
      throw e
    }
    throw new ApiError('Ocurrió un error inesperado', 500)
  }
}

export const errorText = (e: unknown) => e instanceof Error ? e.message : 'Ocurrió un error inesperado'

// --- Tipos del API ---
export type Comuna = { id: number; nombre: string }

export type FichaDatos = {
  condiciones: string[]; medicamentos: string[]; notaEmergencia: string
  vacunas: { id?: string; nombre: string; fecha: string; proxima?: string; notas?: string }[]
  alergias: { agente: string; reaccion?: string; gravedad?: 'leve' | 'moderada' | 'grave' }[]
  tratamientos: { id?: string; descripcion: string; inicio?: string; fin?: string; notas?: string }[]
  atenciones: { id?: string; fecha: string; motivo: string; notas?: string }[]
  alertasCriticas: string[]
}

export const emptyFicha = (): FichaDatos => ({ condiciones: [], medicamentos: [], notaEmergencia: '', vacunas: [], alergias: [], tratamientos: [], atenciones: [], alertasCriticas: [] })

export type Mascota = {
  id: string; nombre: string; especie: string; raza: string | null; sexo: string | null; fecha_nacimiento: string | null; foto_url?: string | null
  token_activo: string | null; datos_clinicos: FichaDatos; ficha_version: number
}

export type PublicaEmergencia = { nombre: string; especie: string; raza: string | null; foto_url: string | null; alergias: { agente: string; gravedad?: string }[]; alertasCriticas: string[]; condiciones: string[]; notaEmergencia: string }

export type PymeResumen = { id: string; nombre_comercial: string; rubro: string; descripcion: string | null; comuna: string; direccion: string | null; latitud: string | null; longitud: string | null; telefono: string | null; whatsapp: string | null; horario: Record<string, string> }
export type ItemCatalogo = { id: string; tipo: 'producto' | 'servicio'; nombre: string; descripcion: string | null; precio_referencial_clp: number | null; disponible?: boolean }
export type PymePerfil = PymeResumen & { catalogo: ItemCatalogo[] }

export const clp = (n: number | null | undefined) => n == null ? 'Consultar precio' : `$${n.toLocaleString('es-CL')}`

export const edadDesde = (fecha: string | null) => {
  if (!fecha) return null
  const d = new Date(fecha), now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years--
  return Math.max(0, years)
}

export const iniciales = (nombre: string) => nombre.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '??'
