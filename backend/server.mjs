// API HTTP compartido para la demostración. Usa las mismas rutas y permisos del mock,
// pero almacena el estado en un archivo del servidor en vez del navegador.
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'

registerHooks({ resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier)) {
    return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context)
  }
  return nextResolve(specifier, context)
} })

const KEY = 'petsuite-mock-db-v1'
const MAX_BODY = 1_048_576

function fileStorage(file) {
  return {
    getItem(key) {
      if (key !== KEY) return null
      try { return readFileSync(file, 'utf8') } catch (error) { if (error.code === 'ENOENT') return null; throw error }
    },
    setItem(key, value) {
      if (key !== KEY) return
      mkdirSync(dirname(file), { recursive: true })
      const temp = `${file}.${process.pid}.tmp`
      writeFileSync(temp, value, { mode: 0o600 })
      renameSync(temp, file)
    },
  }
}

export async function createApiServer({
  file = process.env.PETSUITE_DATA_FILE || resolve('data/petsuite.json'),
  origins = process.env.PETSUITE_CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173',
} = {}) {
  globalThis.localStorage = fileStorage(resolve(file))
  const [{ handle }, { ApiError }] = await Promise.all([import('../src/mock/server.ts'), import('../src/api.ts')])
  const allowed = new Set(origins.split(',').map(value => value.trim()).filter(Boolean))
  const respond = (res, status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(payload))
  }

  return createServer(async (req, res) => {
    const origin = req.headers.origin
    if (origin && !allowed.has(origin)) { respond(res, 403, { message: 'Origen no autorizado' }); return }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    const url = new URL(req.url || '/', 'http://localhost')
    if (url.pathname === '/healthz') { respond(res, 200, { ok: true }); return }
    if (!url.pathname.startsWith('/api/v1/')) { respond(res, 404, { message: 'No encontrado' }); return }
    try {
      let body
      if (req.method !== 'GET') {
        let bytes = 0
        const chunks = []
        for await (const chunk of req) {
          bytes += chunk.length
          if (bytes > MAX_BODY) { respond(res, 413, { message: 'Solicitud demasiado grande' }); return }
          chunks.push(chunk)
        }
        if (bytes) {
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
          catch { respond(res, 400, { message: 'JSON inválido' }); return }
        }
      }
      const bearer = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')
      // handle() consulta la sesión persistida y comprueba el rol en cada ruta protegida.
      const session = bearer ? { token: bearer[1], id: '', rol: 'tutor', nombre: '', comunaId: null } : null
      const path = url.pathname.slice('/api/v1'.length) + url.search
      const result = await handle(req.method || 'GET', path, body, session)
      if (result === undefined) { res.writeHead(204, { 'Cache-Control': 'no-store' }); res.end() }
      else respond(res, 200, result)
    } catch (error) {
      if (error instanceof ApiError) respond(res, error.status, { message: error.message })
      else { console.error(error); respond(res, 500, { message: 'Error interno del servidor' }) }
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.HOST || '127.0.0.1'
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.PETSUITE_ALLOW_DEMO_API !== '1') {
    console.error('Este API incluye cuentas demo. Define PETSUITE_ALLOW_DEMO_API=1 para permitir acceso desde la red.')
    process.exitCode = 1
  } else {
    const server = await createApiServer()
    server.listen(Number(process.env.PORT || 3000), host, () => console.log(`PetSuite API: http://${host}:${server.address().port}/api/v1`))
  }
}
