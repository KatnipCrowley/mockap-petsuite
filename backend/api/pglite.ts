// PostgreSQL en memoria (PGlite) para las pruebas: mismo esquema, migraciones y formatos que la base real, sin servidor.
import { PGlite, type Transaction } from '@electric-sql/pglite'
import { normalizarFila, PARSERS, type Database, type Row, type Sql } from './db'

export async function pgliteDatabase() {
  const pg = await PGlite.create({ parsers: PARSERS })
  const sqlDe = (q: PGlite | Transaction): Sql => async (text, params = []) => (await q.query<Row>(text, params)).rows.map(normalizarFila) as never
  const database: Database = {
    tx: fn => pg.transaction(tx => fn(sqlDe(tx))),
    close: () => pg.close(),
  }
  // Cliente con la interfaz de pg, para backend/db/migrate.mjs y seed.mjs (los scripts de varias sentencias van por exec).
  const client = { query: async (text: string, params?: unknown[]) => params ? pg.query(text, params) : (await pg.exec(text)).at(-1) ?? { rows: [] } }
  return { database, client, sql: sqlDe(pg) }
}
