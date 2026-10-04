import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

// Node's TS loader needs explicit extensions for the imports Vite resolves automatically.
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
  removeItem: key => values.delete(key),
}

const { handle } = await import('./mock/server.ts')
const { resetDemo } = await import('./mock/db.ts')

async function login(correo, rol) {
  const result = await handle('POST', '/auth/login', { correo, clave: 'petsuite123' }, null)
  return { token: result.token, id: result.usuario.id, rol, nombre: result.usuario.nombre_visible, comunaId: result.usuario.comuna_id }
}

test('the owner can edit a profile and the verified directory reflects it', async () => {
  resetDemo()
  const owner = await login('tienda@petsuite.cl', 'pyme')
  const [pyme] = await handle('GET', '/pymes/mias', undefined, owner)
  const initial = await handle('GET', `/pymes/${pyme.id}/perfil`, undefined, owner)
  const saved = await handle('PATCH', `/pymes/${pyme.id}/perfil`, {
    nombre_comercial: 'Huellitas del Sur', descripcion: 'Alimentos y accesorios', comuna_id: 1,
    direccion: 'Avenida Osorno 12', telefono: '646123456', whatsapp: '56912345678',
    horario: { 'lun-vie': '10:00-19:00', sab: '10:00-14:00', dom: 'Cerrado' },
    latitud: -40.57, longitud: -73.13, foto_portada: '/img/collares.jpg',
  }, owner)
  assert.equal(saved.nombre_comercial, 'Huellitas del Sur')
  assert.equal(saved.rut_empresa, initial.rut_empresa)
  const publicProfile = await handle('GET', `/pymes/${pyme.id}`, undefined, null)
  assert.equal(publicProfile.nombre_comercial, saved.nombre_comercial)
  assert.equal(publicProfile.foto_portada, '/img/collares.jpg')
  assert.equal(publicProfile.horario.dom, 'Cerrado')
  const clinician = await login('clinico@petsuite.cl', 'clinico')
  await assert.rejects(() => handle('PATCH', `/pymes/${pyme.id}/perfil`, { ...saved, latitud: null, longitud: null }, clinician), e => e.status === 403)
})

test('a tutor enquiry stays private to its business and the tutor can read the reply', async () => {
  resetDemo()
  const owner = await login('tienda@petsuite.cl', 'pyme')
  const tutor = await login('tutor@petsuite.cl', 'tutor')
  const other = await login('clinico@petsuite.cl', 'clinico')
  const [pyme] = await handle('GET', '/pymes/mias', undefined, owner)
  const { id } = await handle('POST', `/pymes/${pyme.id}/contactos`, { mensaje: '¿Tienen alimento para perros adultos?', contacto: '' }, tutor)
  const inbox = await handle('GET', `/pymes/${pyme.id}/contactos`, undefined, owner)
  assert.equal(inbox[0].id, id)
  assert.equal(inbox[0].estado, 'nuevo')
  await assert.rejects(() => handle('GET', `/pymes/${pyme.id}/contactos`, undefined, other), e => e.status === 403)
  await assert.rejects(() => handle('POST', `/pymes/${pyme.id}/contactos`, { mensaje: 'Consulta sin sesión', contacto: '' }, null), e => e.status === 401)
  await handle('PATCH', `/pymes/${pyme.id}/contactos/${id}`, { estado: 'respondido', respuesta: 'Sí, tenemos stock disponible.' }, owner)
  const sent = await handle('GET', '/mis-contactos-pyme', undefined, tutor)
  assert.equal(sent[0].respuesta, 'Sí, tenemos stock disponible.')
  assert.equal(sent[0].negocio, pyme.nombre_comercial)
})

test('existing demo databases without a contact inbox are migrated on read', async () => {
  resetDemo()
  const legacy = JSON.parse(localStorage.getItem('petsuite-mock-db-v1'))
  delete legacy.contactos_pymes
  localStorage.setItem('petsuite-mock-db-v1', JSON.stringify(legacy))
  const tutor = await login('tutor@petsuite.cl', 'tutor')
  assert.deepEqual(await handle('GET', '/mis-contactos-pyme', undefined, tutor), [])
  assert.deepEqual(JSON.parse(localStorage.getItem('petsuite-mock-db-v1')).contactos_pymes, [])
})
