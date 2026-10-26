// Multitenant: sucursales de cada Pyme y su equipo interno (jefes de local y personal clínico) con permisos por módulo.
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { correoEquipo } from '../../src/shared/cuentas'
import { ROLES_EQUIPO, type ModuloPyme, type Rol } from '../../src/shared/permissions'
import { auth, cerrarSesiones, cifrarClave, emitirToken, enviarCorreo } from './auth'
import { comunasDe, fail, idDe, now, on, parse, sinEnlaces, uid, una, type Req } from './core'
import type { Sql } from './db'
import { exigirCupo, miPyme, permisosEnPyme, planDe, type Miembro, type Pyme, type Sucursal } from './negocio'

const horario = z.object({ 'lun-vie': z.string().trim().max(80), sab: z.string().trim().max(80), dom: z.string().trim().max(80) })

// Acepta la cuenta si tiene cualquiera de los módulos; si no, responde con el error del último.
async function conModulo(req: Req, ...modulos: ModuloPyme[]): Promise<Pyme> {
  let error: unknown
  for (const m of modulos) { try { return await miPyme(req, m) } catch (e) { error = e } }
  throw error
}

// Cuenta creada por terceros (dueño de la Pyme o asesor): sin clave conocida, la persona crea la suya con el
// enlace de invitación que recibe por correo, y ese enlace también confirma su correo.
export async function nuevaCuenta(sql: Sql, correo: string, nombre: string, rol: Rol, comuna_id: number | null) {
  const c = correo.trim().toLowerCase()
  if (await una(sql, 'select 1 from usuarios where lower(correo) = $1', [c])) fail(409, 'Ese correo ya tiene una cuenta en PetSuite')
  const u = { id: uid(), correo: c, nombre_visible: nombre.trim() }
  await sql("insert into usuarios (id, correo, clave_hash, rol, nombre_visible, comuna_id, estado, creado_en) values ($1, $2, $3, $4, $5, $6, 'activo', $7)",
    [u.id, u.correo, await cifrarClave(randomBytes(32).toString('hex')), rol, u.nombre_visible, comuna_id, now()])
  return { u, enlace: await emitirToken(sql, u.id, 'invitacion') }
}

// ---------- Sucursales ----------
const sucursalSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa el nombre de la sucursal').max(80),
  comuna_id: z.number().int().positive(),
  direccion: z.string().trim().max(200),
  telefono: z.string().trim().max(20).regex(/^[\d+\s()-]*$/, 'Teléfono inválido'),
  whatsapp: z.string().trim().max(20).regex(/^[\d+\s]*$/, 'WhatsApp inválido: usa solo números'),
  horario,
  latitud: z.number().min(-90).max(90).nullable(),
  longitud: z.number().min(-180).max(180).nullable(),
  descripcion: z.string().trim().max(600).refine(sinEnlaces, 'No se permiten enlaces externos').default(''),
  servicios: z.array(z.string().trim().min(2).max(40)).max(12, 'Puedes destacar hasta 12 servicios').default([]),
})

async function vistaSucursal(sql: Sql, s: Sucursal) {
  const equipo = await sql<{ nombre: string }>('select u.nombre_visible as nombre from miembros m join usuarios u on u.id = m.usuario_id where m.sucursal_id = $1 order by m.creado_en', [s.id])
  return { ...s, comuna: (await comunasDe(sql)).get(s.comuna_id) ?? '', equipo: equipo.map(e => e.nombre) }
}

async function aplicarSucursal(sql: Sql, p: Pyme, d: z.infer<typeof sucursalSchema>) {
  if (!(await comunasDe(sql)).has(d.comuna_id)) fail(400, 'Comuna no válida')
  if (!(await planDe(sql, p.id)).beneficios.perfil_sucursal && (d.descripcion || d.servicios.length)) fail(422, 'La descripción y los servicios propios por sucursal están disponibles desde el plan Plata')
  return {
    nombre: d.nombre, comuna_id: d.comuna_id, direccion: d.direccion || null, telefono: d.telefono || null, whatsapp: d.whatsapp.replace(/\D/g, '') || null,
    horario: Object.fromEntries(Object.entries(d.horario).filter(([, h]) => h)), latitud: d.latitud === null ? null : String(d.latitud), longitud: d.longitud === null ? null : String(d.longitud),
    descripcion: d.descripcion || null, servicios: [...new Set(d.servicios)],
  }
}

const guardarSucursal = (sql: Sql, s: Sucursal) => sql(`insert into sucursales (id, pyme_id, nombre, comuna_id, direccion, telefono, whatsapp, horario, latitud, longitud, descripcion, servicios, creado_en)
  values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12::text[], $13)
  on conflict (id) do update set nombre = excluded.nombre, comuna_id = excluded.comuna_id, direccion = excluded.direccion, telefono = excluded.telefono, whatsapp = excluded.whatsapp,
    horario = excluded.horario, latitud = excluded.latitud, longitud = excluded.longitud, descripcion = excluded.descripcion, servicios = excluded.servicios`,
[s.id, s.pyme_id, s.nombre, s.comuna_id, s.direccion, s.telefono, s.whatsapp, JSON.stringify(s.horario), s.latitud, s.longitud, s.descripcion, s.servicios, s.creado_en])

on('GET', '/pymes/:id/sucursales', async req => {
  const p = await conModulo(req, 'sucursales', 'perfil')
  const acceso = await permisosEnPyme(req.sql, await auth(req), p)
  const propia = acceso?.miembro ? acceso.miembro.sucursal_id : undefined
  const sucursales = await req.sql<Sucursal>('select * from sucursales where pyme_id = $1 order by creado_en', [p.id])
  const visibles = sucursales.filter(s => propia === undefined || s.id === propia)
  const vistas = []
  for (const s of visibles) vistas.push(await vistaSucursal(req.sql, s))
  return vistas
})

on('POST', '/pymes/:id/sucursales', async req => {
  const p = await miPyme(req, 'sucursales')
  const d = parse(sucursalSchema, req.body)
  await exigirCupo(req.sql, p.id, 'sucursales')
  const s: Sucursal = { id: uid(), pyme_id: p.id, ...(await aplicarSucursal(req.sql, p, d)), creado_en: now() }
  await guardarSucursal(req.sql, s)
  return vistaSucursal(req.sql, s)
})

// El dueño edita cualquier sucursal; un jefe de local con «Perfil», solo la suya.
on('PUT', '/pymes/:id/sucursales/:sid', async req => {
  const p = await conModulo(req, 'sucursales', 'perfil')
  const acceso = await permisosEnPyme(req.sql, await auth(req), p)
  const s = await una<Sucursal>(req.sql, 'select * from sucursales where id = $1 and pyme_id = $2 for update', [idDe(req.params.sid), p.id])
  if (!s) return fail(404, 'Sucursal no encontrada')
  if (acceso?.miembro && acceso.miembro.sucursal_id !== s.id) return fail(403, 'Solo puedes editar la sucursal que tienes a cargo')
  Object.assign(s, await aplicarSucursal(req.sql, p, parse(sucursalSchema, req.body)))
  await guardarSucursal(req.sql, s)
  return vistaSucursal(req.sql, s)
})

// Al eliminar una sucursal, su equipo pasa a la casa matriz (la clave foránea deja sucursal_id en null).
on('DELETE', '/pymes/:id/sucursales/:sid', async req => {
  const p = await miPyme(req, 'sucursales')
  const filas = await req.sql('delete from sucursales where id = $1 and pyme_id = $2 returning id', [idDe(req.params.sid), p.id])
  if (!filas.length) return fail(404, 'Sucursal no encontrada')
  return undefined
})

// ---------- Equipo y permisos por módulo ----------
const MIEMBRO_VISTA = `m.id, m.rol, m.permisos, m.sucursal_id, case when m.sucursal_id is null then 'Casa matriz' else coalesce(s.nombre, 'Sucursal') end as sucursal,
  u.nombre_visible as nombre, u.correo, u.estado, m.creado_en`
const vistaMiembro = async (sql: Sql, id: string) => una(sql, `select ${MIEMBRO_VISTA} from miembros m join usuarios u on u.id = m.usuario_id left join sucursales s on s.id = m.sucursal_id where m.id = $1`, [id])

async function permisosValidos(sql: Sql, p: Pyme, rol: keyof typeof ROLES_EQUIPO, permisos: string[] | undefined, sucursal_id: string | null) {
  if (rol === 'clinico' && p.rubro !== 'veterinaria') fail(422, 'El personal clínico solo se agrega en veterinarias')
  if (sucursal_id && !(await una(sql, 'select 1 from sucursales where id = $1 and pyme_id = $2', [idDe(sucursal_id), p.id]))) fail(400, 'La sucursal no pertenece a tu negocio')
  const permitidos: readonly string[] = ROLES_EQUIPO[rol].permitidos
  const elegidos = permisos?.length ? permisos : [...ROLES_EQUIPO[rol].porDefecto]
  const fuera = elegidos.filter(x => !permitidos.includes(x))
  if (fuera.length) fail(422, `Un ${rol === 'clinico' ? 'clínico' : 'jefe de local'} no puede tener: ${fuera.join(', ')}`)
  return [...new Set(elegidos)] as ModuloPyme[]
}

const miembroSchema = z.object({
  nombre_visible: z.string().trim().min(2, 'Ingresa el nombre').max(80),
  correo: z.string().trim().email('Correo inválido').max(254),
  rol: z.enum(['jefe_local', 'clinico']),
  sucursal_id: z.string().nullable().default(null),
  permisos: z.array(z.string()).optional(),
})

on('GET', '/pymes/:id/equipo', async req => {
  const p = await miPyme(req, 'equipo')
  return req.sql(`select ${MIEMBRO_VISTA} from miembros m join usuarios u on u.id = m.usuario_id left join sucursales s on s.id = m.sucursal_id where m.pyme_id = $1 order by m.creado_en`, [p.id])
})

// Crea la cuenta del integrante y le envía por correo el enlace para crear su contraseña.
on('POST', '/pymes/:id/equipo', async req => {
  const p = await miPyme(req, 'equipo')
  const d = parse(miembroSchema, req.body)
  await exigirCupo(req.sql, p.id, 'usuarios')
  const permisos = await permisosValidos(req.sql, p, d.rol, d.permisos, d.sucursal_id)
  const { u, enlace } = await nuevaCuenta(req.sql, d.correo, d.nombre_visible, d.rol, p.comuna_id)
  const m: Miembro = { id: uid(), pyme_id: p.id, usuario_id: u.id, rol: d.rol, sucursal_id: d.sucursal_id, permisos, creado_en: now() }
  await req.sql('insert into miembros (id, pyme_id, usuario_id, rol, sucursal_id, permisos, creado_en) values ($1, $2, $3, $4, $5, $6::text[], $7)', [m.id, m.pyme_id, m.usuario_id, m.rol, m.sucursal_id, m.permisos, m.creado_en])
  const lugar = (d.sucursal_id ? (await una<{ nombre: string }>(req.sql, 'select nombre from sucursales where id = $1', [d.sucursal_id]))?.nombre : null) ?? 'la casa matriz'
  const correo = correoEquipo({ nombre: u.nombre_visible, negocio: p.nombre_comercial, rol: d.rol, lugar, permisos, enlace })
  await enviarCorreo(req.sql, u.correo, correo.asunto, correo.cuerpo, 'cuenta_equipo', enlace)
  return vistaMiembro(req.sql, m.id)
})

on('PATCH', '/pymes/:id/equipo/:mid', async req => {
  const p = await miPyme(req, 'equipo')
  const m = await una<Miembro>(req.sql, 'select * from miembros where id = $1 and pyme_id = $2 for update', [idDe(req.params.mid), p.id])
  if (!m) return fail(404, 'Integrante no encontrado')
  const d = parse(z.object({ permisos: z.array(z.string()), sucursal_id: z.string().nullable() }), req.body)
  if (!d.permisos.length) return fail(422, 'Asigna al menos un módulo o retira el acceso')
  const permisos = await permisosValidos(req.sql, p, m.rol, d.permisos, d.sucursal_id)
  await req.sql('update miembros set permisos = $2::text[], sucursal_id = $3 where id = $1', [m.id, permisos, d.sucursal_id])
  return vistaMiembro(req.sql, m.id)
})

// Retirar el acceso cierra sus sesiones y desactiva la cuenta; sus registros clínicos firmados se conservan.
on('DELETE', '/pymes/:id/equipo/:mid', async req => {
  const p = await miPyme(req, 'equipo')
  const [m] = await req.sql<Miembro>('delete from miembros where id = $1 and pyme_id = $2 returning *', [idDe(req.params.mid), p.id])
  if (!m) return fail(404, 'Integrante no encontrado')
  const u = await una<{ id: string; correo: string; nombre_visible: string }>(req.sql, 'select id, correo, nombre_visible from usuarios where id = $1', [m.usuario_id])
  if (u && !(await una(req.sql, 'select 1 from miembros where usuario_id = $1', [u.id]))) {
    await req.sql("update usuarios set estado = 'suspendido' where id = $1", [u.id])
    await req.sql('update suspensiones set levantada_en = $2 where usuario_id = $1 and levantada_en is null', [u.id, now()])
    await req.sql("insert into suspensiones (id, usuario_id, tipo, dias, hasta, motivo, mensaje, aplicada_en) values ($1, $2, 'permanente', null, null, 'otro', $3, $4)",
      [uid(), u.id, `${p.nombre_comercial} retiró tu acceso de equipo.`, now()])
    await cerrarSesiones(req.sql, u.id)
    await enviarCorreo(req.sql, u.correo, `Acceso retirado: ${p.nombre_comercial}`, `Hola, ${u.nombre_visible}:\n\n${p.nombre_comercial} retiró tu acceso de equipo en PetSuite.\n\nEquipo PetSuite`, 'cuenta_equipo')
  }
  return undefined
})
