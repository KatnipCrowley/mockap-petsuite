// Conexión a PostgreSQL (Supabase, creado desde el Marketplace de Vercel).
// DATABASE_URL usa el pooler en modo transacción (puerto 6543, para el API) y
// DATABASE_URL_UNPOOLED el pooler en modo sesión (puerto 5432, para migraciones y seed).
import pg from 'pg'

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('Falta DATABASE_URL en .env. Ver backend/db/README.md')
  // El modo SSL viene en la cadena (sslmode). Pocas conexiones: en Vercel cada función abre las suyas.
  return new pg.Pool({ connectionString, max: Number(process.env.PG_POOL_MAX || 5) })
}
