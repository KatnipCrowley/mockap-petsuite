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
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }

const { handle } = await import('../../mock/server.ts')
const { resetDemo, STORAGE_KEY } = await import('../../mock/db.ts')

async function login(correo, clave = 'petsuite123') {
  const { token, usuario } = await handle('POST', '/auth/login', { correo, clave }, null)
  return { token, id: usuario.id, rol: usuario.rol, nombre: usuario.nombre_visible, comunaId: usuario.comuna_id, permisos: usuario.permisos }
}
const pymeDe = async session => (await handle('GET', '/pymes/mias', undefined, session))[0]
const editDb = fn => { const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); fn(data); localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
const status = code => e => e.status === code

test('an expired paid plan falls back to Gratis after the grace days and its limits apply', async () => {
  resetDemo()
  const owner = await login('peluqueria@petsuite.cl')
  const pyme = await pymeDe(owner)
  assert.equal(pyme.plan.codigo, 'gratis')
  assert.equal(pyme.dias_mora, 35)
  for (let i = 1; i <= 5; i++) await handle('POST', `/pymes/${pyme.id}/catalogo`, { tipo: 'servicio', nombre: `Servicio ${i}` }, owner)
  await assert.rejects(() => handle('POST', `/pymes/${pyme.id}/catalogo`, { tipo: 'servicio', nombre: 'Servicio 6' }, owner), e => e.status === 422 && /Gratis/.test(e.message) && /Bronce/.test(e.message))
  await assert.rejects(() => handle('POST', `/pymes/${pyme.id}/banners`, { titulo: 'Corte de raza', texto: 'Agenda tu hora esta semana', destino: 'perfil', ubicacion: 'inicio', desde: new Date().toISOString().slice(0, 10), hasta: new Date().toISOString().slice(0, 10) }, owner), status(422))
  const directory = await handle('GET', '/pymes', undefined, null)
  assert.equal(directory[0].nombre_comercial, 'Clínica Veterinaria Sur', 'Oro aparece primero')
  assert.equal(directory[0].destacado, 2)
})

test('the owner creates a local manager whose credentials arrive by email and whose modules are enforced', async () => {
  resetDemo()
  const owner = await login('tienda@petsuite.cl')
  const pyme = await pymeDe(owner)
  await assert.rejects(() => handle('POST', `/pymes/${pyme.id}/equipo`, { nombre_visible: 'Vet', correo: 'vet@huellitas.cl', rol: 'clinico' }, owner), status(422))
  await assert.rejects(() => handle('POST', `/pymes/${pyme.id}/equipo`, { nombre_visible: 'Jefe', correo: 'nuevo@huellitas.cl', rol: 'jefe_local', permisos: ['suscripcion'] }, owner), status(422))
  await handle('POST', `/pymes/${pyme.id}/equipo`, { nombre_visible: 'Tomás Lagos', correo: 'nuevo@huellitas.cl', rol: 'jefe_local', sucursal_id: null }, owner)
  const mail = JSON.parse(localStorage.getItem(STORAGE_KEY)).correos.find(c => c.para === 'nuevo@huellitas.cl')
  const clave = /Clave temporal: (\S+)/.exec(mail.cuerpo)[1]
  const jefe = await login('nuevo@huellitas.cl', clave)
  assert.deepEqual(jefe.permisos, ['perfil', 'catalogo', 'contactos', 'metricas'])
  assert.ok(Array.isArray(await handle('GET', `/pymes/${pyme.id}/catalogo`, undefined, jefe)))
  await assert.rejects(() => handle('GET', `/pymes/${pyme.id}/equipo`, undefined, jefe), status(403))
  await assert.rejects(() => handle('GET', `/pymes/${pyme.id}/suscripcion`, undefined, jefe), status(403))
  // El jefe de Puerto Montt solo ve y edita su sucursal.
  const pm = await login('jefe@petsuite.cl')
  const propias = await handle('GET', `/pymes/${pyme.id}/sucursales`, undefined, pm)
  assert.equal(propias.length, 1)
  assert.equal(propias[0].nombre, 'Huellitas Puerto Montt')
})

test('banners and ONG profiles only go public after the advisor approves them', async () => {
  resetDemo()
  const ong = await login('ong@petsuite.cl')
  const asesor = await login('asesor@petsuite.cl')
  const tutor = await login('tutor@petsuite.cl')
  const hoy = new Date().toISOString().slice(0, 10)
  await assert.rejects(() => handle('POST', '/ong/banners', { titulo: 'Otra campaña', texto: 'Segundo banner de la ONG', destino: 'adopciones', ubicacion: 'inicio', desde: hoy, hasta: hoy }, ong), status(422))
  const before = await handle('GET', '/banners?ubicacion=inicio', undefined, null)
  assert.ok(!before.some(b => b.autor_tipo === 'ong'))
  const queue = await handle('GET', '/asesor/aprobaciones', undefined, asesor)
  await assert.rejects(() => handle('GET', '/asesor/aprobaciones', undefined, tutor), status(403))
  await assert.rejects(() => handle('PATCH', `/asesor/banners/${queue.banners[0].id}`, { decision: 'rechazar' }, asesor), status(400))
  await handle('PATCH', `/asesor/banners/${queue.banners[0].id}`, { decision: 'aprobar' }, asesor)
  assert.ok((await handle('GET', '/banners?ubicacion=inicio', undefined, null)).some(b => b.autor_tipo === 'ong'))

  const { publicado } = await handle('GET', '/ong/perfil', undefined, ong)
  await handle('PUT', '/ong/perfil', { perfil: { ...publicado, donaciones: { ...publicado.donaciones, numero: '99999999' } }, enviar: true }, ong)
  const [{ id: ongId }] = await handle('GET', '/ongs', undefined, null)
  assert.equal((await handle('GET', `/ongs/${ongId}`, undefined, null)).perfil.donaciones.numero, '00012345678', 'lo público no cambia sin aprobación')
  await handle('PATCH', `/asesor/ong-perfil/${ongId}`, { decision: 'aprobar' }, asesor)
  assert.equal((await handle('GET', `/ongs/${ongId}`, undefined, null)).perfil.donaciones.numero, '99999999')
})

test('an approved NGO coupon is redeemed at the business and the monthly goal grants the prize', async () => {
  resetDemo()
  const asesor = await login('asesor@petsuite.cl')
  const tienda = await login('tienda@petsuite.cl')
  const shop = await pymeDe(tienda)
  await assert.rejects(() => handle('POST', `/pymes/${shop.id}/canjes`, { codigo: 'PATITAS-HUELLITAS15' }, tienda), status(422))
  const [pendiente] = (await handle('GET', '/asesor/aprobaciones', undefined, asesor)).convenios
  await handle('PATCH', `/asesor/convenios/${pendiente.id}`, { decision: 'aprobar' }, asesor)
  const perfil = await handle('GET', `/pymes/${shop.id}`, undefined, null)
  assert.equal(perfil.cupones[0].codigo, 'PATITAS-HUELLITAS15')
  assert.equal((await handle('POST', `/pymes/${shop.id}/canjes`, { codigo: 'patitas-huellitas15' }, tienda)).canjes_mes, 1)

  const vetOwner = await login('veterinaria@petsuite.cl')
  const vet = await pymeDe(vetOwner)
  editDb(data => { data.convenios.find(c => c.codigo === 'PATITAS-SUR10').meta_mensual = 63 })
  const r = await handle('POST', `/pymes/${vet.id}/canjes`, { codigo: 'PATITAS-SUR10' }, vetOwner)
  assert.equal(r.premio, true)
  assert.ok(JSON.parse(localStorage.getItem(STORAGE_KEY)).correos.some(c => c.tipo === 'premio' && c.para === 'ong@petsuite.cl'))
})

test('Orcob confirms a plan upgrade and overdue debts are referred with minimal data', async () => {
  resetDemo()
  const tienda = await login('tienda@petsuite.cl')
  const shop = await pymeDe(tienda)
  const r = await handle('POST', `/pymes/${shop.id}/suscripcion`, { plan_id: 4, canal: 'orcob' }, tienda)
  assert.match(r.codigo_orcob, /^\d{8}$/)
  await handle('POST', `/pymes/${shop.id}/pagos/${r.pago_id}/orcob-confirmado`, undefined, tienda)
  const periodos = await handle('GET', `/pymes/${shop.id}/suscripcion`, undefined, tienda)
  assert.equal(periodos[0].plan, 'Oro')
  assert.equal(periodos[0].estado, 'activa')
  assert.equal(periodos[0].inicio, periodos[1].fin, 'la mejora empieza al terminar el periodo pagado')

  const asesor = await login('asesor@petsuite.cl')
  const cartera = await handle('GET', '/asesor/cobranza', undefined, asesor)
  const morosa = cartera.find(c => c.nombre_comercial === 'Peluquería Canina Patagonia')
  assert.equal(morosa.estado, 'degradada')
  assert.equal(morosa.derivable, true)
  assert.equal(cartera.find(c => c.nombre_comercial === 'Huellitas Osorno').derivable, false)
  const caso = await handle('POST', `/asesor/cobranza/${morosa.pyme_id}/derivar`, undefined, asesor)
  assert.deepEqual(Object.keys(caso.datos_enviados).sort(), ['correo_contacto', 'dias_mora', 'monto_clp', 'periodo', 'razon_social', 'rut_empresa'])
  await assert.rejects(() => handle('POST', `/asesor/cobranza/${morosa.pyme_id}/derivar`, undefined, asesor), status(422))
})

test('clinical staff reach shared records through their veterinary membership, not the business owner', async () => {
  resetDemo()
  const tutor = await login('tutor@petsuite.cl')
  const vetOwner = await login('veterinaria@petsuite.cl')
  const clinico = await login('clinico@petsuite.cl')
  const vet = await pymeDe(vetOwner)
  const [luna] = await handle('GET', '/mascotas', undefined, tutor)
  await handle('POST', `/mascotas/${luna.id}/accesos`, { pyme_id: vet.id, permiso: 'escritura', dias: 7 }, tutor)
  assert.equal((await handle('GET', '/mascotas/accesibles', undefined, clinico))[0].nombre, 'Luna')
  await assert.rejects(() => handle('GET', '/mascotas/accesibles', undefined, vetOwner), status(403))
  assert.equal((await pymeDe(clinico)).rol_interno, 'clinico')
})

test('privacy rights: data export excludes the password and an erasure request anonymises the account', async () => {
  resetDemo()
  const tutor = await login('tutor@petsuite.cl')
  const admin = await login('admin@petsuite.cl')
  const datos = await handle('GET', '/privacidad/mis-datos', undefined, tutor)
  assert.equal(datos.cuenta.correo, 'tutor@petsuite.cl')
  assert.equal('clave' in datos.cuenta, false)
  assert.equal(datos.mascotas[0].nombre, 'Luna')
  await handle('PATCH', '/privacidad/consentimientos', { comunicaciones: true }, tutor)
  const s = await handle('POST', '/privacidad/solicitudes', { derecho: 'supresion', detalle: 'Quiero eliminar mi cuenta y mis datos.' }, tutor)
  await assert.rejects(() => handle('POST', '/privacidad/solicitudes', { derecho: 'supresion', detalle: 'Segunda solicitud igual.' }, tutor), status(409))
  const asesor = await login('asesor@petsuite.cl')
  await assert.rejects(() => handle('GET', '/admin/privacidad', undefined, asesor), status(403))
  await handle('PATCH', `/admin/privacidad/${s.id}`, { estado: 'respondida', respuesta: 'Eliminamos tu cuenta y tus mascotas. Conservamos solo lo exigido por ley.' }, admin)
  await assert.rejects(() => login('tutor@petsuite.cl'), status(401))
  assert.equal((await handle('GET', '/admin/usuarios?q=eliminado', undefined, admin))[0].estado, 'eliminado')
})
