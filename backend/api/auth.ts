// Cuentas, sesiones y permisos. El token de sesión solo lo conoce el cliente: la base guarda su SHA-256.
import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PERMISOS_ADMIN, PERMISOS_ASESOR, PERMISOS_DUENO, type Rol } from '../../src/shared/permissions'
import { fail, now, uid, una, type Req } from './core'
import type { Sql } from './db'

export type Usuario = {
  id: string; correo: string; rol: Rol; nombre_visible: string; comuna_id: number | null
  estado: 'activo' | 'suspendido' | 'eliminado'; bloqueo_tratamiento: boolean; creado_en: string
}
export const USUARIO = 'u.id, u.correo, u.rol, u.nombre_visible, u.comuna_id, u.estado, u.bloqueo_tratamiento, u.creado_en'

const DIAS_SESION = 30
const RONDAS_BCRYPT = 10
// Hash de una clave que nadie tiene: comparar contra él iguala el tiempo de respuesta cuando el correo no existe.
const HASH_FALSO = bcrypt.hashSync('petsuite-sin-cuenta', RONDAS_BCRYPT)

const huella = (token: string) => createHash('sha256').update(token).digest('hex')
export const cifrarClave = (clave: string) => bcrypt.hash(clave, RONDAS_BCRYPT)
export const claveCorrecta = (clave: string, hash: string | null | undefined) => bcrypt.compare(clave, hash ?? HASH_FALSO)

export async function crearSesion(sql: Sql, usuarioId: string) {
  const token = randomBytes(32).toString('base64url')
  await sql("insert into sesiones (token_hash, usuario_id, creada_en, expira_en) values (decode($1, 'hex'), $2, $3, $4)",
    [huella(token), usuarioId, now(), new Date(Date.now() + DIAS_SESION * 86_400_000).toISOString()])
  return token
}
export const cerrarSesiones = (sql: Sql, usuarioId: string) => sql('delete from sesiones where usuario_id = $1', [usuarioId])

// Una suspensión temporal vencida se levanta al usar la cuenta, como refreshSuspension del mock. Sin usuario, revisa todas.
export async function levantarVencidas(sql: Sql, usuarioId?: string) {
  const params: unknown[] = [now()]
  if (usuarioId) params.push(usuarioId)
  await sql(`with s as (
      update suspensiones set levantada_en = $1
      where levantada_en is null and tipo = 'temporal' and hasta <= $1 ${usuarioId ? 'and usuario_id = $2' : ''}
      returning usuario_id)
    update usuarios set estado = 'activo' where estado = 'suspendido' and id in (select usuario_id from s)`, params)
}

export async function usuarioPorId(sql: Sql, id: string) {
  return una<Usuario>(sql, `select ${USUARIO} from usuarios u where u.id = $1`, [id])
}

// La sesión se resuelve una vez por solicitud aunque la ruta consulte auth varias veces.
const sesiones = new WeakMap<Req, Promise<Usuario | undefined>>()
async function usuarioDeSesion(req: Req) {
  let u = await una<Usuario>(req.sql, `select ${USUARIO} from sesiones s join usuarios u on u.id = s.usuario_id where s.token_hash = decode($1, 'hex') and s.expira_en > $2`,
    [huella(req.session!.token), now()])
  if (u?.estado === 'suspendido') {
    await levantarVencidas(req.sql, u.id)
    u = await usuarioPorId(req.sql, u.id)
  }
  return u
}

// RBAC: sin token válido 401; cuenta suspendida o rol distinto 403.
export async function auth(req: Req, ...roles: Rol[]): Promise<Usuario> {
  if (!req.session) return fail(401, 'Sesión requerida')
  let pendiente = sesiones.get(req)
  if (!pendiente) sesiones.set(req, pendiente = usuarioDeSesion(req))
  const u = await pendiente
  if (!u) return fail(401, 'Sesión inválida')
  if (u.estado !== 'activo') return fail(403, 'Tu cuenta está suspendida')
  if (roles.length && !roles.includes(u.rol)) return fail(403, 'Sin permiso')
  return u
}

export async function permisosDe(sql: Sql, u: Pick<Usuario, 'id' | 'rol'>): Promise<string[]> {
  if (u.rol === 'admin') return PERMISOS_ADMIN
  if (u.rol === 'asesor') return PERMISOS_ASESOR
  if (u.rol === 'pyme') return PERMISOS_DUENO
  if (u.rol === 'jefe_local' || u.rol === 'clinico') {
    const filas = await sql<{ permisos: string[] }>('select permisos from miembros where usuario_id = $1 order by creado_en', [u.id])
    return [...new Set(filas.flatMap(f => f.permisos))]
  }
  return []
}

export type Correo = { id: string; para: string; asunto: string; cuerpo: string; tipo: 'bienvenida' | 'cuenta_creada' | 'cuenta_equipo' | 'aprobacion' | 'convenio' | 'cobranza' | 'privacidad' | 'premio'; enviado_en: string }

// Bandeja de salida simulada: hasta tener proveedor de correo, los mensajes quedan registrados en la tabla correos.
export async function enviarCorreo(sql: Sql, para: string, asunto: string, cuerpo: string, tipo: Correo['tipo']) {
  if (para) await sql('insert into correos (id, para, asunto, cuerpo, tipo, enviado_en) values ($1, $2, $3, $4, $5, $6)', [uid(), para, asunto, cuerpo, tipo, now()])
}
export async function correoDe(sql: Sql, usuarioId: string | null | undefined) {
  return usuarioId ? (await una<{ correo: string }>(sql, 'select correo from usuarios where id = $1', [usuarioId]))?.correo ?? '' : ''
}
export async function avisarAsesores(sql: Sql, asunto: string, cuerpo: string) {
  const asesores = await sql<{ correo: string }>("select correo from usuarios where rol = 'asesor' and estado = 'activo' order by creado_en")
  for (const a of asesores) await enviarCorreo(sql, a.correo, asunto, cuerpo, 'aprobacion')
}
