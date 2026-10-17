// El servidor HTTP con PostgreSQL (PGlite): QR entre clientes distintos, revocación, CORS y persistencia al reiniciar.
import assert from 'node:assert/strict'
import test from 'node:test'
import { createApiServer } from '../server.mjs'

const values = new Map()
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }

const { pgliteDatabase } = await import('./pglite.ts')
const { migrate } = await import('../db/migrate.mjs')
const { seedDemo } = await import('../db/seed.mjs')

test('con PostgreSQL, el QR y su aviso funcionan entre clientes distintos y sobreviven a un reinicio', async () => {
  const { database, client } = await pgliteDatabase()
  await migrate(client, () => {})
  await seedDemo(client, { log: () => {} })
  const iniciar = async () => {
    const server = await createApiServer({ database, origins: 'http://localhost:5173' })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    return server
  }
  let server = await iniciar()
  const call = async (path, { method = 'GET', token, body, origin } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1${path}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: response.status === 204 ? null : await response.json() }
  }
  try {
    assert.equal((await call('/auth/login', { method: 'POST', body: { correo: 'tutor@petsuite.cl', clave: 'otra' } })).status, 401)
    const login = await call('/auth/login', { method: 'POST', body: { correo: 'tutor@petsuite.cl', clave: 'petsuite123' } })
    assert.equal(login.status, 200)
    const token = login.data.token
    const { data: mascotas } = await call('/mascotas', { token })
    const luna = mascotas.find(p => p.nombre === 'Luna')

    const publica = await call(`/qr/${luna.token_activo}`)
    assert.equal(publica.status, 200)
    assert.equal(publica.data.nombre, 'Luna')
    assert.deepEqual(Object.keys(publica.data).sort(), ['alergias', 'alertasCriticas', 'condiciones', 'especie', 'foto_url', 'nombre', 'notaEmergencia', 'raza'])

    assert.equal((await call(`/qr/${luna.token_activo}/mensajes`, { method: 'POST', body: { mensaje: 'Encontré a Luna cerca de la plaza.', nombre: 'Vecina' } })).status, 200)
    assert.equal((await call(`/mascotas/${luna.id}/mensajes`, { token })).data[0].mensaje, 'Encontré a Luna cerca de la plaza.')
    assert.equal((await call(`/mascotas/${luna.id}/medallas`, { method: 'POST', token })).status, 200)
    assert.equal((await call(`/qr/${luna.token_activo}`)).status, 404)
    const nueva = (await call('/mascotas', { token })).data.find(p => p.id === luna.id).token_activo
    assert.equal((await call('/mascotas', { origin: 'https://no-autorizado.example', token })).status, 403)
    assert.equal((await call('/mascotas', { token: 'inventado' })).status, 401)

    await new Promise(resolve => server.close(resolve))
    server = await iniciar()
    assert.equal((await call(`/qr/${nueva}`)).status, 200)
    assert.equal((await call('/mascotas', { token })).status, 200, 'la sesión sigue en la base tras reiniciar')
    const [{ n }] = (await client.query('select count(*)::int as n from sesiones')).rows
    assert.equal(n, 1, 'la base guarda la sesión, nunca el token en claro')
    assert.equal((await client.query('select 1 from sesiones where token_hash = convert_to($1, \'utf8\')', [token])).rows.length, 0)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await database.close()
  }
})
