// Aplica en orden las migraciones pendientes de backend/db/migrations. Uso: npm run db:migrate
// Cada archivo corre en su propia transacción y queda registrado en schema_migrations con su checksum,
// así una migración ya aplicada no se vuelve a ejecutar ni se puede editar sin que se note.
import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createPool } from './pool.mjs'

const DIR = new URL('./migrations/', import.meta.url)
const LOCK = 'petsuite_migraciones'

// Git en Windows puede cambiar los saltos de línea; se normalizan para que el checksum sea el mismo en todos los equipos.
const leer = nombre => readFileSync(new URL(nombre, DIR), 'utf8').replace(/\r\n/g, '\n')
const checksum = sql => createHash('sha256').update(sql).digest('hex')

/** Aplica las migraciones pendientes con un cliente ya conectado. Devuelve los nombres aplicados. */
export async function migrate(client, log = console.log) {
  // Evita que dos procesos migren a la vez (por ejemplo, dos despliegues simultáneos).
  await client.query('select pg_advisory_lock(hashtext($1))', [LOCK])
  try {
    await client.query('create table if not exists schema_migrations (nombre text primary key, checksum text not null, aplicada_en timestamptz not null default now())')
    const { rows } = await client.query('select nombre, checksum from schema_migrations')
    const aplicadas = new Map(rows.map(r => [r.nombre, r.checksum]))
    const nuevas = []
    for (const nombre of readdirSync(DIR).filter(f => f.endsWith('.sql')).sort()) {
      const sql = leer(nombre)
      const suma = checksum(sql)
      if (aplicadas.has(nombre)) {
        if (aplicadas.get(nombre) !== suma) throw new Error(`La migración ${nombre} cambió después de aplicarse. Crea una migración nueva en vez de editarla.`)
        continue
      }
      await client.query('begin')
      try {
        await client.query(sql)
        await client.query('insert into schema_migrations (nombre, checksum) values ($1, $2)', [nombre, suma])
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw new Error(`Falló ${nombre}: ${error.message}`, { cause: error })
      }
      log(`aplicada ${nombre}`)
      nuevas.push(nombre)
    }
    if (!nuevas.length) log('La base ya está al día.')
    // En Supabase, una tabla sin RLS queda expuesta en su API REST pública.
    const { rows: abiertas } = await client.query("select tablename from pg_tables where schemaname = 'public' and not rowsecurity order by tablename")
    if (abiertas.length) log(`AVISO: tablas sin RLS, expuestas en la API pública de Supabase: ${abiertas.map(r => r.tablename).join(', ')}`)
    return nuevas
  } finally {
    await client.query('select pg_advisory_unlock(hashtext($1))', [LOCK])
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Las migraciones usan el modo sesión: el modo transacción no conserva el bloqueo entre consultas.
  let pool, client
  try {
    pool = createPool(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)
    client = await pool.connect()
    await migrate(client)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    client?.release()
    await pool?.end()
  }
}
