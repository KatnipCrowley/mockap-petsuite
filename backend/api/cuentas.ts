// Autenticación, registro y catálogos generales (comunas y planes).
import { z } from 'zod'
import { PLANES } from '../../src/modules/plans/plans'
import { VERSION_PRIVACIDAD } from '../../src/shared/legal'
import { auth, cifrarClave, claveCorrecta, crearSesion, enviarCorreo, levantarVencidas, permisosDe, USUARIO, usuarioPorId, type Usuario } from './auth'
import { comunasDe, fail, now, on, parse, porTexto, uid, una } from './core'
import type { Sql } from './db'

const sesionDe = async (sql: Sql, u: Usuario) => ({
  token: await crearSesion(sql, u.id),
  usuario: { id: u.id, rol: u.rol, nombre_visible: u.nombre_visible, comuna_id: u.comuna_id, permisos: await permisosDe(sql, u) },
})

// Ley 21.719: términos y tratamiento de datos son obligatorios; comunicaciones comerciales, opcionales.
export async function consentimientosIniciales(sql: Sql, usuarioId: string, comunicaciones: boolean) {
  const fecha = now()
  for (const [tipo, otorgado] of [['terminos', true], ['privacidad', true], ['comunicaciones', comunicaciones], ['metricas', true]] as const) {
    await sql('insert into consentimientos (usuario_id, tipo, otorgado, version, fecha) values ($1, $2, $3, $4, $5)', [usuarioId, tipo, otorgado, VERSION_PRIVACIDAD, fecha])
  }
}

on('POST', '/auth/login', async req => {
  const d = parse(z.object({ correo: z.string().trim().email('Correo inválido'), clave: z.string().min(1, 'Ingresa tu contraseña') }), req.body)
  const fila = await una<Usuario & { clave_hash: string }>(req.sql, `select ${USUARIO}, u.clave_hash from usuarios u where lower(u.correo) = $1`, [d.correo.toLowerCase()])
  // Se compara siempre, exista o no la cuenta, para no revelar qué correos están registrados por el tiempo de respuesta.
  if (!(await claveCorrecta(d.clave, fila?.clave_hash)) || !fila) return fail(401, 'Credenciales incorrectas')
  let u: Usuario | undefined = fila
  if (u.estado === 'suspendido') {
    await levantarVencidas(req.sql, u.id)
    u = await usuarioPorId(req.sql, u.id)
  }
  if (!u || u.estado !== 'activo') return fail(403, 'Tu cuenta está suspendida')
  return sesionDe(req.sql, u)
})

on('POST', '/auth/registro', async req => {
  const d = parse(z.object({
    correo: z.string().trim().email('Correo inválido').max(254),
    clave: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
    nombre_visible: z.string().trim().min(2, 'Ingresa tu nombre').max(80),
    comuna_id: z.number().int().positive(),
    rol: z.enum(['tutor', 'pyme', 'ong']).default('tutor'),
    acepta_terminos: z.literal(true, { message: 'Debes aceptar los términos de uso' }),
    acepta_privacidad: z.literal(true, { message: 'Debes autorizar el tratamiento de tus datos según el aviso de privacidad' }),
    acepta_comunicaciones: z.boolean().default(false),
  }), req.body)
  const correo = d.correo.toLowerCase()
  if (await una(req.sql, 'select 1 from usuarios where lower(correo) = $1', [correo])) return fail(409, 'Ese correo ya está registrado')
  if (!(await comunasDe(req.sql)).has(d.comuna_id)) return fail(400, 'Comuna no válida')
  const u: Usuario = { id: uid(), correo, rol: d.rol, nombre_visible: d.nombre_visible, comuna_id: d.comuna_id, estado: 'activo', bloqueo_tratamiento: false, creado_en: now() }
  await req.sql('insert into usuarios (id, correo, clave_hash, rol, nombre_visible, comuna_id, estado, creado_en) values ($1, $2, $3, $4, $5, $6, $7, $8)',
    [u.id, correo, await cifrarClave(d.clave), u.rol, u.nombre_visible, u.comuna_id, u.estado, u.creado_en])
  await consentimientosIniciales(req.sql, u.id, d.acepta_comunicaciones)
  await enviarCorreo(req.sql, correo, 'Bienvenida a PetSuite', `Hola, ${u.nombre_visible}:\n\nTu cuenta está lista.${d.rol === 'pyme' ? ' Registra tu negocio y elige un plan: el plan Gratis te publica en el directorio sin costo.' : d.rol === 'ong' ? ' Registra tu organización: participar es gratis.' : ' Crea la Ficha Única de tu mascota y activa su QR de emergencia.'}\n\nPuedes revisar o retirar tus consentimientos en Configuración > Privacidad.\n\nEquipo PetSuite`, 'bienvenida')
  return sesionDe(req.sql, u)
})

on('GET', '/auth/yo', async req => {
  const u = await auth(req)
  return { id: u.id, rol: u.rol, nombre_visible: u.nombre_visible, correo: u.correo, comuna_id: u.comuna_id, permisos: await permisosDe(req.sql, u) }
})
on('GET', '/comunas', async req => [...(await comunasDe(req.sql))].map(([id, nombre]) => ({ id, nombre })).sort(porTexto(c => c.nombre)))
on('GET', '/planes', () => PLANES)
