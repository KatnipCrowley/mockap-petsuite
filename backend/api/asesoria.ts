// Gestión del asesor: cuentas creadas para Pymes y ONG, bandeja de correos y cobranza con Orcob.
import { z } from 'zod'
import { DIAS_DERIVAR_COBRANZA, planPorId } from '../../src/modules/plans/plans'
import { derivarCobranza } from '../../src/mock/orcob'
import { auth, correoDe, enviarCorreo } from './auth'
import { comunasDe, fail, idDe, now, on, parse, uid, una } from './core'
import type { Sql } from './db'
import { nuevaCuenta } from './equipo'
import { estadoPlanDe, PYME, suscripcionesDe, type Pyme, type Suscripcion } from './negocio'

// El asesor crea cuentas para Pymes u ONG que acompaña; la cuenta recibe su clave temporal por correo.
on('POST', '/asesor/cuentas', async req => {
  const asesor = await auth(req, 'asesor', 'admin')
  const d = parse(z.object({ tipo: z.enum(['pyme', 'ong']), correo: z.string().trim().email('Correo inválido'), nombre_visible: z.string().trim().min(2, 'Ingresa el nombre del contacto').max(80), comuna_id: z.number().int().positive() }), req.body)
  if (!(await comunasDe(req.sql)).has(d.comuna_id)) return fail(400, 'Comuna no válida')
  const { u, clave } = await nuevaCuenta(req.sql, d.correo, d.nombre_visible, d.tipo, d.comuna_id)
  await enviarCorreo(req.sql, u.correo, 'Tu cuenta PetSuite está lista', `Hola, ${u.nombre_visible}:\n\n${asesor.nombre_visible}, tu asesor PetSuite, creó tu cuenta de ${d.tipo === 'pyme' ? 'negocio' : 'organización'}.\n\nCorreo: ${u.correo}\nClave temporal: ${clave}\n\nAl ingresar, registra ${d.tipo === 'pyme' ? 'tu negocio y elige un plan (Gratis, Bronce, Plata u Oro)' : 'tu organización; participar es gratis'}. Al primer ingreso te pediremos aceptar el aviso de privacidad.\n\nEquipo PetSuite`, 'cuenta_creada')
  return { id: u.id, correo: u.correo }
})

// ---------- Correos ----------
const CORREO = 'id, para, asunto, cuerpo, tipo, enviado_en'
on('GET', '/correos/mios', async req => {
  const u = await auth(req)
  return req.sql(`select ${CORREO} from correos where para = $1 order by enviado_en desc`, [u.correo])
})
on('GET', '/admin/correos', async req => {
  await auth(req, 'admin', 'asesor')
  return req.sql(`select ${CORREO} from correos order by enviado_en desc limit 100`)
})

// ---------- Cobranza (Orcob) ----------
type Caso = { id: string; pyme_id: string; id_caso: string; monto_clp: number; dias_mora: number; datos_enviados: Record<string, string | number>; estado: string; derivado_por: string; derivado_en: string; cerrado_en: string | null }

async function cobranza(sql: Sql, p: Pyme, subs: Suscripcion[]) {
  const ultima = subs.filter(s => s.estado === 'activa').sort((a, b) => b.fin.localeCompare(a.fin))[0]
  if (!ultima) return null
  const e = estadoPlanDe(subs), plan = planPorId(ultima.plan_id)
  const caso = (await una<Caso>(sql, "select * from casos_cobranza where pyme_id = $1 and estado = 'en_gestion' order by derivado_en limit 1", [p.id])) ?? null
  const pendiente = !!(await una(sql, "select 1 from pagos pg join suscripciones s on s.id = pg.suscripcion_id where s.pyme_id = $1 and pg.estado = 'pendiente'", [p.id]))
  const estado = caso ? 'derivada' : e.dias_mora === 0 ? 'al_dia' : e.en_gracia ? 'en_gracia' : 'degradada'
  return {
    pyme_id: p.id, nombre_comercial: p.nombre_comercial, rut_empresa: p.rut_empresa, plan: plan.nombre, plan_vigente: e.plan.nombre, fin: ultima.fin, dias_mora: e.dias_mora,
    monto_clp: e.dias_mora ? plan.precio_mensual_clp : 0, estado, pago_pendiente: pendiente, caso,
    derivable: !caso && !pendiente && e.dias_mora > DIAS_DERIVAR_COBRANZA,
  }
}

on('GET', '/asesor/cobranza', async req => {
  await auth(req, 'asesor', 'admin')
  const pymes = await req.sql<Pyme>(`select ${PYME} from pymes p where p.estado_verificacion = 'aprobada' order by p.creado_en`)
  const subs = await suscripcionesDe(req.sql, pymes.map(p => p.id))
  const lista = []
  for (const p of pymes) { const c = await cobranza(req.sql, p, subs.get(p.id) ?? []); if (c) lista.push(c) }
  return lista.sort((a, b) => b.dias_mora - a.dias_mora)
})

// Solo se envían a Orcob los datos mínimos del deudor comercial; la Pyme recibe aviso de la derivación.
on('POST', '/asesor/cobranza/:pymeId/derivar', async req => {
  const u = await auth(req, 'asesor', 'admin')
  const p = await una<Pyme>(req.sql, `select ${PYME} from pymes p where p.id = $1`, [idDe(req.params.pymeId)])
  const c = p && await cobranza(req.sql, p, (await suscripcionesDe(req.sql, [p.id])).get(p.id) ?? [])
  if (!p || !c) return fail(404, 'Pyme sin suscripciones pagadas')
  if (!c.derivable) return fail(422, `Solo se derivan deudas con más de ${DIAS_DERIVAR_COBRANZA} días de mora, sin pagos en revisión ni casos abiertos`)
  const datos = { rut_empresa: p.rut_empresa, razon_social: p.nombre_comercial, correo_contacto: await correoDe(req.sql, p.propietario_id), monto_clp: c.monto_clp, periodo: `plan ${c.plan} vencido el ${c.fin}`, dias_mora: c.dias_mora }
  const r = derivarCobranza(datos)
  const caso: Caso = { id: uid(), pyme_id: p.id, id_caso: r.id_caso, monto_clp: c.monto_clp, dias_mora: c.dias_mora, datos_enviados: datos, estado: 'en_gestion', derivado_por: u.id, derivado_en: now(), cerrado_en: null }
  await req.sql('insert into casos_cobranza (id, pyme_id, id_caso, monto_clp, dias_mora, datos_enviados, estado, derivado_por, derivado_en) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)',
    [caso.id, caso.pyme_id, caso.id_caso, caso.monto_clp, caso.dias_mora, JSON.stringify(caso.datos_enviados), caso.estado, caso.derivado_por, caso.derivado_en])
  await enviarCorreo(req.sql, datos.correo_contacto, 'Aviso de derivación a cobranza', `Hola:\n\nTu suscripción PetSuite (${datos.periodo}) registra ${c.dias_mora} días de mora por ${c.monto_clp.toLocaleString('es-CL')} CLP.\nLa deuda fue derivada a Orcob (Organización de Cobranzas Orcob Ltda.), caso ${r.id_caso}, que podrá contactarte.\nOrcob solo recibió: RUT y nombre de la empresa, correo de contacto, monto, periodo y días de mora.\n\nPuedes regularizar renovando tu plan desde Suscripción.\n\nEquipo PetSuite`, 'cobranza')
  return caso
})

on('PATCH', '/asesor/cobranza/casos/:id', async req => {
  await auth(req, 'asesor', 'admin')
  const d = parse(z.object({ estado: z.enum(['pagado', 'cerrado']) }), req.body)
  const caso = await una<Caso>(req.sql, "update casos_cobranza set estado = $2, cerrado_en = $3 where id = $1 and estado = 'en_gestion' returning *", [idDe(req.params.id), d.estado, now()])
  if (!caso) return fail(404, 'Caso no disponible')
  return caso
})
