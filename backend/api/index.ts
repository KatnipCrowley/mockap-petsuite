// API de PetSuite sobre PostgreSQL. Mismo contrato que src/mock/server.ts (rutas, validaciones, mensajes y forma
// de las respuestas), así el frontend solo cambia VITE_API_URL. Cada solicitud corre en una transacción.
import type { Session } from '../../src/shared/api'
import { ApiError } from '../../src/shared/errors'
import { routes } from './core'
import type { Database } from './db'
// El orden de registro es el del mock: la primera ruta que coincide responde.
import './cuentas'
import './ficha'
import './pymes'
import './muro'
import './adopcion'
import './admin'
import './equipo'
import './promocion'
import './asesoria'
import './privacidad'

function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/'), b = path.split('/')
  if (a.length !== b.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) {
      try { params[a[i].slice(1)] = decodeURIComponent(b[i]) } catch { return null }
    } else if (a[i] !== b[i]) return null
  }
  return params
}

export type Handle = (method: string, fullPath: string, body: unknown, session: Session | null) => Promise<unknown>

export function createApi(database: Database): Handle {
  return async (method, fullPath, body, session) => {
    const [path, qs = ''] = fullPath.split('?')
    method = method.toUpperCase()
    for (const [m, pattern, h] of routes) {
      if (m !== method) continue
      const params = match(pattern, path)
      if (!params) continue
      try {
        return await database.tx(async sql => h({ params, query: new URLSearchParams(qs), body, session, sql }))
      } catch (error) {
        // Una restricción única que se adelantó a la validación (dos solicitudes simultáneas) es un conflicto, no un error interno.
        if ((error as { code?: string }).code === '23505') throw new ApiError('Ese registro ya existe', 409)
        throw error
      }
    }
    throw new ApiError('No encontrado', 404)
  }
}
