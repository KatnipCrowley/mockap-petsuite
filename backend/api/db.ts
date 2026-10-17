// Acceso a PostgreSQL para el API. Cada solicitud corre en una transacción: si la ruta falla, no queda nada a medias.
import pg from 'pg'

export type Row = Record<string, any>
/** Consulta parametrizada dentro de la transacción de la solicitud. */
export type Sql = <T extends Row = Row>(text: string, params?: unknown[]) => Promise<T[]>
export type Database = { tx<T>(fn: (sql: Sql) => Promise<T>): Promise<T>; close(): Promise<void> }

// Mismos formatos que el mock: fechas de calendario como 'AAAA-MM-DD', coordenadas como el texto
// numérico más corto ('-40.5735') y momentos como ISO 8601 con milisegundos.
export const PARSERS: Record<number, (value: string) => unknown> = {
  1082: value => value,
  1700: value => String(Number(value)),
}
for (const [oid, parser] of Object.entries(PARSERS)) pg.types.setTypeParser(Number(oid), parser)

export function normalizarFila<T extends Row>(row: T): T {
  const r: Row = row
  for (const key in r) if (r[key] instanceof Date) r[key] = r[key].toISOString()
  return row
}

export function pgDatabase(connectionString: string, max = Number(process.env.PG_POOL_MAX || 5)): Database {
  const pool = new pg.Pool({ connectionString, max })
  return {
    async tx(fn) {
      const client = await pool.connect()
      const sql: Sql = async (text, params = []) => (await client.query(text, params)).rows.map(normalizarFila)
      try {
        await client.query('begin')
        const result = await fn(sql)
        await client.query('commit')
        return result
      } catch (error) {
        await client.query('rollback').catch(() => undefined)
        throw error
      } finally {
        client.release()
      }
    },
    close: () => pool.end(),
  }
}
