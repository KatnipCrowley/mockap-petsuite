// Utilidades compartidas por las rutas: validación, errores, fechas y el registro de rutas.
// Las reglas y mensajes son los mismos de src/mock/server.ts, que sigue siendo el contrato del API.
import { z } from 'zod'
import { ApiError } from '../../src/shared/errors'
import type { Session } from '../../src/shared/api'
import type { Row, Sql } from './db'

z.config(z.locales.es())

export type Req = { params: Record<string, string>; query: URLSearchParams; body: unknown; session: Session | null; sql: Sql }
export type Handler = (req: Req) => unknown

export const fail = (status: number, message: string): never => { throw new ApiError(message, status) }

export function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const r = schema.safeParse(body ?? {})
  if (!r.success) {
    const issue = r.error.issues[0]
    const campo = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    fail(400, issue ? `${campo}${issue.message}` : 'Datos inválidos')
  }
  return (r as { data: z.infer<T> }).data
}

export const uid = () => crypto.randomUUID()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Un identificador que no es UUID no existe: se consulta como null para responder 404 en vez de un error de la base. */
export const idDe = (s: unknown) => typeof s === 'string' && UUID.test(s) ? s : null
// Estrictamente creciente, como en el mock: dos registros de una misma solicitud no comparten hora y el orden por fecha es estable.
let ultimo = 0
export const now = () => { ultimo = Math.max(Date.now(), ultimo + 1); return new Date(ultimo).toISOString() }
// Fechas en UTC, igual que el mock (dayOffset de src/mock/db.ts).
export const dayOffset = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
export const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()
export const diasEntre = (desde: string, hasta: string) => Math.round((new Date(`${hasta}T12:00:00Z`).getTime() - new Date(`${desde}T12:00:00Z`).getTime()) / 86_400_000)
export const sumarDias = (iso: string, dias: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10) }
export const mesActual = () => dayOffset(0).slice(0, 7)

export const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
export const sinEnlaces = (t: string) => !/https?|www\./i.test(t)
// Orden alfabético del mock (localeCompare), que no depende de la intercalación configurada en la base.
export const porTexto = <T>(clave: (x: T) => string) => (a: T, b: T) => clave(a).localeCompare(clave(b))

// Rutas en el mismo orden que el mock: la primera que coincide responde.
export const routes: [string, string, Handler][] = []
export const on = (method: string, path: string, h: Handler) => { routes.push([method, path, h]) }

export const una = async <T extends Row = Row>(sql: Sql, text: string, params: unknown[] = []) => (await sql<T>(text, params))[0] as T | undefined
export const contar = async (sql: Sql, text: string, params: unknown[] = []) => Number((await sql(text, params))[0]?.n ?? 0)

// Las comunas solo cambian por migración: se leen una vez por proceso.
let comunas: Map<number, string> | null = null
export async function comunasDe(sql: Sql) {
  comunas ??= new Map((await sql<{ id: number; nombre: string }>('select id, nombre from comunas')).map(c => [c.id, c.nombre]))
  return comunas
}
