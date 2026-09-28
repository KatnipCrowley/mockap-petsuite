import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createApiServer } from './server.mjs'

test('a shared API serves a QR and its message to different clients, and revokes the old token', async () => {
  const file = join(tmpdir(), 'opencode', `petsuite-api-${randomUUID()}.json`)
  let server = await createApiServer({ file, origins: 'http://localhost:5173' })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api/v1`
  const call = async (path, { method = 'GET', token, body, origin } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: response.status === 204 ? null : await response.json() }
  }
  try {
    const login = await call('/auth/login', { method: 'POST', body: { correo: 'tutor@petsuite.cl', clave: 'petsuite123' } })
    assert.equal(login.status, 200)
    const tutorToken = login.data.token
    const { data: pets } = await call('/mascotas', { token: tutorToken })
    const luna = pets.find(p => p.nombre === 'Luna')
    const oldToken = luna.token_activo

    const publicView = await call(`/qr/${oldToken}`) // sin token de sesión ni almacenamiento del tutor
    assert.equal(publicView.status, 200)
    assert.equal(publicView.data.nombre, 'Luna')
    assert.ok(!('medicamentos' in publicView.data))
    assert.ok(!('tutor_id' in publicView.data))

    const sent = await call(`/qr/${oldToken}/mensajes`, { method: 'POST', body: { mensaje: 'Encontré a Luna cerca de la plaza.', nombre: 'Vecina' } })
    assert.equal(sent.status, 200)
    const inbox = await call(`/mascotas/${luna.id}/mensajes`, { token: tutorToken })
    assert.equal(inbox.data[0].mensaje, 'Encontré a Luna cerca de la plaza.')

    assert.equal((await call(`/mascotas/${luna.id}/medallas`, { method: 'POST', token: tutorToken })).status, 200)
    assert.equal((await call(`/qr/${oldToken}`)).status, 404)
    const { data: updated } = await call('/mascotas', { token: tutorToken })
    const newToken = updated.find(p => p.id === luna.id).token_activo
    assert.equal((await call(`/qr/${newToken}`)).status, 200)
    assert.equal((await call('/mascotas', { origin: 'https://no-autorizado.example', token: tutorToken })).status, 403)

    await new Promise(resolve => server.close(resolve))
    server = await createApiServer({ file, origins: 'http://localhost:5173' })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const restarted = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/qr/${newToken}`)
    assert.equal(restarted.status, 200) // la ficha sigue disponible tras reiniciar el servidor
  } finally {
    await new Promise(resolve => server.close(resolve))
    rmSync(file, { force: true })
  }
})
