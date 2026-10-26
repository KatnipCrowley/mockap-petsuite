// Crea la primera cuenta de administrador en una base real (sin cuentas demo) y muestra el enlace para crear su contraseña.
// Uso: npm run db:crear-admin -- correo@dominio.cl Nombre visible
// El enlace se imprime en esta terminal y vence en 7 días: solo debe ejecutarlo quien será el administrador.
import { createHash, randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import { createPool } from './pool.mjs'

const { VIGENCIA_HORAS, enlaceCuenta } = await import('../../src/shared/cuentas.ts')

/** Inserta la cuenta (sin clave conocida, correo sin confirmar) y su invitación; devuelve el enlace. */
export async function crearAdmin(client, correo, nombre, base = process.env.APP_URL || 'http://localhost:5173/') {
  correo = correo.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Correo inválido')
  if (!nombre.trim()) throw new Error('Falta el nombre visible')
  const { rows } = await client.query('select 1 from usuarios where lower(correo) = $1', [correo])
  if (rows.length) throw new Error('Ese correo ya tiene una cuenta')
  const token = randomBytes(16).toString('hex')
  await client.query('begin')
  try {
    const { rows: [u] } = await client.query("insert into usuarios (correo, clave_hash, rol, nombre_visible, estado) values ($1, $2, 'admin', $3, 'activo') returning id",
      [correo, await bcrypt.hash(randomBytes(32).toString('hex'), 10), nombre.trim()])
    await client.query("insert into tokens_cuenta (usuario_id, tipo, token_hash, expira_en) values ($1, 'invitacion', decode($2, 'hex'), $3)",
      [u.id, createHash('sha256').update(token).digest('hex'), new Date(Date.now() + VIGENCIA_HORAS.invitacion * 3_600_000).toISOString()])
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  }
  return enlaceCuenta(base, 'invitacion', token)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [correo, ...nombre] = process.argv.slice(2)
  let pool, client
  try {
    if (!correo || !nombre.length) throw new Error('Uso: npm run db:crear-admin -- correo@dominio.cl Nombre visible')
    pool = createPool(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)
    client = await pool.connect()
    const enlace = await crearAdmin(client, correo, nombre.join(' '))
    console.log(`Cuenta de administrador creada para ${correo.trim().toLowerCase()}.\nAbre este enlace para crear la contraseña (vence en ${VIGENCIA_HORAS.invitacion / 24} días; no lo compartas):\n${enlace}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    client?.release()
    await pool?.end()
  }
}
