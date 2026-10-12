// Adaptador de Orcob (Organización de Cobranzas Orcob Ltda.): recaudación de suscripciones y cobranza de deudas vencidas.
// Orcob no publica un API abierto. Este módulo fija el contrato que PetSuite espera, para reemplazarlo por la integración
// real (convenio, credenciales y webhook de pagos) sin tocar las reglas de negocio.
// Ley 21.719: Orcob actúa como encargado de tratamiento por cuenta de PetSuite. Solo recibe los datos mínimos del deudor
// comercial (la empresa), nunca datos de tutores, mascotas ni fichas de salud.

export type CobroOrcob = { id_cobro: string; codigo_pago: string; monto_clp: number; glosa: string; emitido_en: string }
export type DatosDeudor = { rut_empresa: string; razon_social: string; correo_contacto: string; monto_clp: number; periodo: string; dias_mora: number }
export type CasoOrcob = { id_caso: string; estado: 'en_gestion'; recibido_en: string }

const correlativo = () => Math.floor(Math.random() * 1e8).toString().padStart(8, '0')

/** Emite un cobro de recaudación: el cliente paga con el código en los canales de Orcob y Orcob avisa a PetSuite. */
export function crearCobro(datos: { rut_empresa: string; monto_clp: number; glosa: string }): CobroOrcob {
  return { id_cobro: `ORC-${correlativo()}`, codigo_pago: correlativo(), monto_clp: datos.monto_clp, glosa: datos.glosa, emitido_en: new Date().toISOString() }
}

/** Deriva una deuda vencida a cobranza extrajudicial. Devuelve el número de caso que entrega Orcob. */
export function derivarCobranza(datos: DatosDeudor): CasoOrcob {
  if (!/^\d{7,8}-[\dkK]$/.test(datos.rut_empresa) || datos.monto_clp <= 0) throw new Error('Datos de deudor incompletos')
  return { id_caso: `ORC-CB-${correlativo()}`, estado: 'en_gestion', recibido_en: new Date().toISOString() }
}
