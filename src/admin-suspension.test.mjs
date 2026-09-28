import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

registerHooks({ resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier)) {
    return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context)
  }
  return nextResolve(specifier, context)
} })

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}

const { handle } = await import('./mock/server.ts')
const { resetDemo } = await import('./mock/db.ts')

async function login(correo, rol) {
  const { token, usuario } = await handle('POST', '/auth/login', { correo, clave: 'petsuite123' }, null)
  return { token, id: usuario.id, nombre: usuario.nombre_visible, comunaId: usuario.comuna_id, rol }
}

const suspension = (tipo, dias) => ({ tipo, dias, motivo: 'acoso', mensaje: 'La cuenta fue suspendida por acoso reiterado.' })

test('denuncias are restricted to admins; a temporary suspension requires days and expires', async () => {
  resetDemo()
  const admin = await login('admin@petsuite.cl', 'admin')
  const ana = await login('tutor@petsuite.cl', 'tutor')
  const diego = await login('tutor2@petsuite.cl', 'tutor')
  const [post] = await handle('GET', '/muro?comuna=1', undefined, ana)
  await handle('POST', '/reportes', { objeto_tipo: 'publicacion', objeto_id: post.id, motivo: 'Mensajes insistentes e inapropiados' }, diego)

  const reports = await handle('GET', `/admin/usuarios/${ana.id}/denuncias`, undefined, admin)
  assert.equal(reports.length, 1)
  assert.equal(reports[0].reportante, 'Diego Ruiz')
  assert.equal(reports[0].contenido, post.texto)
  await assert.rejects(() => handle('GET', `/admin/usuarios/${ana.id}/denuncias`, undefined, ana), e => e.status === 403)
  await assert.rejects(() => handle('PATCH', `/admin/usuarios/${ana.id}`, { estado: 'suspendido' }, admin), e => e.status === 400)
  await assert.rejects(() => handle('PATCH', `/admin/usuarios/${ana.id}`, { estado: 'suspendido', suspension: suspension('temporal', 0) }, admin), e => e.status === 400)
  await handle('PATCH', `/admin/usuarios/${ana.id}`, { estado: 'suspendido', suspension: suspension('temporal', 1) }, admin)

  const users = await handle('GET', '/admin/usuarios', undefined, admin)
  const affected = users.find(user => user.id === ana.id)
  assert.equal(affected.estado, 'suspendido')
  assert.equal(affected.suspension.motivo, 'acoso')
  assert.equal(affected.suspension.dias, 1)
  assert.ok(new Date(affected.suspension.hasta).getTime() > Date.now())
  await assert.rejects(() => login('tutor@petsuite.cl', 'tutor'), e => e.status === 403)

  const saved = JSON.parse(localStorage.getItem('petsuite-mock-db-v1'))
  saved.usuarios.find(user => user.id === ana.id).suspension.hasta = new Date(Date.now() - 1000).toISOString()
  localStorage.setItem('petsuite-mock-db-v1', JSON.stringify(saved))
  await login('tutor@petsuite.cl', 'tutor')
  const revived = (await handle('GET', '/admin/usuarios', undefined, admin)).find(user => user.id === ana.id)
  assert.equal(revived.estado, 'activo')
  assert.equal(revived.suspension, null)
})

test('permanent suspension from a report hides the post and can be manually reversed', async () => {
  resetDemo()
  const admin = await login('admin@petsuite.cl', 'admin')
  const ana = await login('tutor@petsuite.cl', 'tutor')
  const diego = await login('tutor2@petsuite.cl', 'tutor')
  const [post] = await handle('GET', '/muro?comuna=1', undefined, ana)
  const report = await handle('POST', '/reportes', { objeto_tipo: 'publicacion', objeto_id: post.id, motivo: 'Publicación con contenido ofensivo' }, diego)
  await assert.rejects(() => handle('PATCH', `/admin/usuarios/${diego.id}`, { estado: 'suspendido', suspension: suspension('permanente', null), reporte_id: report.id }, admin), e => e.status === 400)
  await handle('PATCH', `/admin/usuarios/${ana.id}`, { estado: 'suspendido', suspension: suspension('permanente', null), reporte_id: report.id }, admin)
  const affected = (await handle('GET', '/admin/usuarios', undefined, admin)).find(user => user.id === ana.id)
  assert.equal(affected.suspension.tipo, 'permanente')
  assert.equal(affected.suspension.hasta, null)
  assert.deepEqual(await handle('GET', '/admin/reportes', undefined, admin), [])
  assert.equal((await handle('GET', `/admin/usuarios/${ana.id}/denuncias`, undefined, admin))[0].estado, 'resuelto_ocultado')
  await handle('PATCH', `/admin/usuarios/${ana.id}`, { estado: 'activo' }, admin)
  assert.equal((await handle('GET', '/admin/usuarios', undefined, admin)).find(user => user.id === ana.id).suspension, null)
})
