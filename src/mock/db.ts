// Base de datos simulada del modo demo: estado inicial (seed) y persistencia en localStorage.
// Las claves se guardan sin cifrar solo porque es una demostración; el API real usa bcrypt.
import type { ApiRole, FichaDatos } from '../api'

export type Rubro = 'veterinaria' | 'tienda' | 'peluqueria' | 'otro'
export type Verificacion = 'pendiente' | 'aprobada' | 'rechazada' | 'suspendida'

export type Usuario = { id: string; correo: string; clave: string; rol: ApiRole; nombre_visible: string; comuna_id: number | null; estado: 'activo' | 'suspendido'; creado_en: string }
export type MascotaRow = { id: string; tutor_id: string; nombre: string; especie: string; raza: string | null; sexo: string | null; fecha_nacimiento: string | null; foto_url: string | null; datos_clinicos: FichaDatos; ficha_version: number; creado_en: string }
export type Medalla = { id: string; mascota_id: string; token: string; estado: 'activa' | 'inactiva' | 'reemplazada'; emitida_en: string }
export type Escaneo = { id: string; medalla_id: string; ocurrido_en: string }
export type MensajeQr = { id: string; medalla_id: string; remitente_nombre: string | null; remitente_contacto: string | null; mensaje: string; latitud: string | null; longitud: string | null; estado: 'nuevo' | 'leido' | 'respondido'; enviado_en: string }
export type Acceso = { id: string; mascota_id: string; pyme_id: string; otorgado_por: string; permiso: 'lectura' | 'escritura'; vigente_hasta: string; revocado_en: string | null }
export type Pyme = { id: string; propietario_id: string; nombre_comercial: string; rut_empresa: string; rubro: Rubro; descripcion: string | null; comuna_id: number; direccion: string | null; latitud: string | null; longitud: string | null; telefono: string | null; whatsapp: string | null; horario: Record<string, string>; estado_verificacion: Verificacion; creado_en: string }
export type Item = { id: string; pyme_id: string; tipo: 'producto' | 'servicio'; nombre: string; descripcion: string | null; precio_referencial_clp: number | null; disponible: boolean; creado_en: string }
export type EventoPyme = { id: string; pyme_id: string; item_id: string | null; tipo: 'visita_perfil' | 'vista_item' | 'clic_contacto' | 'clic_whatsapp'; ocurrido_en: string }
export type Plan = { id: number; nombre: string; precio_mensual_clp: number; max_items_catalogo: number }
export type Suscripcion = { id: string; pyme_id: string; plan_id: number; inicio: string; fin: string; estado: 'pendiente' | 'activa' | 'vencida' | 'cancelada' }
export type Pago = { id: string; suscripcion_id: string; monto_clp: number; referencia: string | null; estado: 'pendiente' | 'confirmado' | 'rechazado'; pagado_en: string }
export type Publicacion = { id: string; autor_id: string; comuna_id: number; mascota_id: string | null; tipo: 'extravio' | 'encuentro' | 'recomendacion'; texto: string; estado: 'publicada' | 'oculta'; creado_en: string }
export type Comentario = { id: string; autor_id: string; publicacion_id: string; texto: string; creado_en: string }
export type Reaccion = { publicacion_id: string; usuario_id: string }
export type Reporte = { id: string; reportante_id: string; objeto_tipo: 'publicacion'; objeto_id: string; motivo: string; estado: 'abierto' | 'resuelto_ocultado' | 'resuelto_mantenido'; creado_en: string }
export type Ong = { id: string; propietario_id: string; nombre: string; tipo: 'refugio' | 'rescatista_independiente' | 'agrupacion'; descripcion: string | null; comuna_id: number; contacto: string | null; redes_sociales: string | null; estado_verificacion: 'pendiente' | 'aprobada' | 'rechazada'; creado_en: string }
export type Animal = { id: string; ong_id: string; nombre: string; especie: string; raza: string | null; edad_estimada: string | null; estado_salud: string | null; historia: string | null; historial_salud: FichaDatos; foto_url: string | null; estado: 'disponible' | 'en_proceso' | 'adoptado'; mascota_id: string | null; publicado_en: string }
export type Solicitud = { id: string; animal_id: string; solicitante_nombre: string | null; solicitante_contacto: string | null; mensaje: string; estado: 'nueva' | 'en_conversacion' | 'concretada' | 'cerrada'; creado_en: string }
export type EventoAdopcion = { id: string; animal_id: string; ocurrido_en: string }

export type Db = {
  comunas: { id: number; nombre: string }[]
  planes: Plan[]
  usuarios: Usuario[]
  sesiones: Record<string, string>
  mascotas: MascotaRow[]
  medallas: Medalla[]
  escaneos: Escaneo[]
  mensajes: MensajeQr[]
  accesos: Acceso[]
  pymes: Pyme[]
  catalogo: Item[]
  eventos: EventoPyme[]
  suscripciones: Suscripcion[]
  pagos: Pago[]
  publicaciones: Publicacion[]
  comentarios: Comentario[]
  reacciones: Reaccion[]
  reportes: Reporte[]
  ongs: Ong[]
  animales: Animal[]
  solicitudes: Solicitud[]
  eventos_adopcion: EventoAdopcion[]
}

const KEY = 'petsuite-mock-db-v1'
export const CLAVE_DEMO = 'petsuite123'

export const uid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()
export const dayOffset = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }

export const ficha = (d: Partial<FichaDatos> = {}): FichaDatos => ({ condiciones: [], medicamentos: [], notaEmergencia: '', vacunas: [], alergias: [], tratamientos: [], atenciones: [], alertasCriticas: [], ...d })

function seed(): Db {
  const t = now()
  const db: Db = {
    comunas: [{ id: 1, nombre: 'Osorno' }, { id: 2, nombre: 'Puerto Montt' }, { id: 3, nombre: 'Castro' }],
    planes: [{ id: 1, nombre: 'Básico', precio_mensual_clp: 15000, max_items_catalogo: 20 }, { id: 2, nombre: 'Plus', precio_mensual_clp: 25000, max_items_catalogo: 60 }],
    usuarios: [], sesiones: {}, mascotas: [], medallas: [], escaneos: [], mensajes: [], accesos: [], pymes: [], catalogo: [], eventos: [],
    suscripciones: [], pagos: [], publicaciones: [], comentarios: [], reacciones: [], reportes: [], ongs: [], animales: [], solicitudes: [], eventos_adopcion: [],
  }
  const user = (correo: string, rol: ApiRole, nombre: string, comuna: number) => {
    const u: Usuario = { id: uid(), correo, clave: CLAVE_DEMO, rol, nombre_visible: nombre, comuna_id: comuna, estado: 'activo', creado_en: t }
    db.usuarios.push(u)
    return u.id
  }
  const tutor = user('tutor@petsuite.cl', 'tutor', 'Ana Soto', 1)
  const tutor2 = user('tutor2@petsuite.cl', 'tutor', 'Diego Ruiz', 2)
  const clinico = user('clinico@petsuite.cl', 'clinico', 'Dr. Luis Pérez', 1)
  const tienda = user('tienda@petsuite.cl', 'pyme', 'Huellitas Osorno', 1)
  user('admin@petsuite.cl', 'admin', 'Equipo PetSuite', 1)

  const pyme = (owner: string, nombre: string, rut: string, rubro: Rubro, comuna: number, direccion: string, lat: number, lng: number) => {
    const p: Pyme = {
      id: uid(), propietario_id: owner, nombre_comercial: nombre, rut_empresa: rut, rubro, descripcion: `${nombre}: atención cercana para tu mascota.`, comuna_id: comuna,
      direccion, latitud: String(lat), longitud: String(lng), telefono: null, whatsapp: null, horario: { 'lun-vie': '09:00-18:00', sab: '10:00-14:00' }, estado_verificacion: 'aprobada', creado_en: t,
    }
    db.pymes.push(p)
    const s: Suscripcion = { id: uid(), pyme_id: p.id, plan_id: 1, inicio: dayOffset(0), fin: dayOffset(30), estado: 'activa' }
    db.suscripciones.push(s)
    db.pagos.push({ id: uid(), suscripcion_id: s.id, monto_clp: 15000, referencia: 'TRF-DEMO', estado: 'confirmado', pagado_en: t })
    return p.id
  }
  pyme(clinico, 'Clínica Veterinaria Sur', '76111222-3', 'veterinaria', 1, 'Mackenna 1020, Osorno', -40.5735, -73.1335)
  const shop = pyme(tienda, 'Huellitas Osorno', '76333444-5', 'tienda', 1, 'Ramírez 550, Osorno', -40.5745, -73.1350)
  pyme(tienda, 'Peluquería Canina Patagonia', '76555666-7', 'peluqueria', 2, 'Varas 300, Puerto Montt', -41.4689, -72.9411)

  for (const [nombre, descripcion, precio, tipo] of [
    ['Alimento adulto 15 kg', 'Alimento seco para perros adultos', 42990, 'producto'],
    ['Arnés ajustable', 'Arnés acolchado talla M', 12990, 'producto'],
    ['Shampoo hipoalergénico', 'Para pieles sensibles', 7990, 'producto'],
    ['Baño y corte', 'Servicio de peluquería', 18000, 'servicio'],
  ] as const) db.catalogo.push({ id: uid(), pyme_id: shop, tipo, nombre, descripcion, precio_referencial_clp: precio, disponible: true, creado_en: t })

  const luna: MascotaRow = {
    id: uid(), tutor_id: tutor, nombre: 'Luna', especie: 'perro', raza: 'Labrador', sexo: 'hembra', fecha_nacimiento: null, foto_url: '/img/perro-retrato.jpg', ficha_version: 1, creado_en: t,
    datos_clinicos: ficha({
      vacunas: [{ nombre: 'Antirrábica', fecha: '2026-03-14', proxima: '2027-03-14' }],
      alergias: [{ agente: 'Pollo', reaccion: 'Dermatitis', gravedad: 'moderada' }],
      atenciones: [{ fecha: '2026-05-10', motivo: 'Control anual', notas: 'Sin hallazgos' }],
      alertasCriticas: ['Requiere medicación diaria'],
    }),
  }
  db.mascotas.push(luna)
  db.medallas.push({ id: uid(), mascota_id: luna.id, token: uid().replace(/-/g, ''), estado: 'activa', emitida_en: t })

  db.publicaciones.push(
    { id: uid(), autor_id: tutor2, comuna_id: 2, mascota_id: null, tipo: 'encuentro', texto: 'Encontré un gato gris cerca del terminal.', estado: 'publicada', creado_en: t },
    { id: uid(), autor_id: tutor, comuna_id: 1, mascota_id: null, tipo: 'recomendacion', texto: 'Recomiendo la clínica de Mackenna, muy buena atención.', estado: 'publicada', creado_en: t },
  )

  const ong = (correo: string, nombre: string, tipo: Ong['tipo'], comuna: number, estado: Ong['estado_verificacion']) => {
    const o: Ong = { id: uid(), propietario_id: user(correo, 'ong', nombre, comuna), nombre, tipo, descripcion: `${nombre}: rescatamos y damos en adopción responsable a perros y gatos de la zona.`, comuna_id: comuna, contacto: correo, redes_sociales: null, estado_verificacion: estado, creado_en: t }
    db.ongs.push(o)
    return o.id
  }
  const patitas = ong('ong@petsuite.cl', 'Patitas del Sur', 'refugio', 1, 'aprobada')
  const nueva = ong('ong2@petsuite.cl', 'Rescate Nuevo', 'rescatista_independiente', 2, 'pendiente')
  const historial = () => ficha({ vacunas: [{ nombre: 'Óctuple', fecha: '2026-07-02' }], tratamientos: [{ descripcion: 'Desparasitación', inicio: '2026-07-02' }] })
  const animal = (ong_id: string, nombre: string, especie: string, raza: string, edad: string, salud: string | null, historia: string, foto: string | null, h = historial()): Animal =>
    ({ id: uid(), ong_id, nombre, especie, raza, edad_estimada: edad, estado_salud: salud, historia, historial_salud: h, foto_url: foto, estado: 'disponible', mascota_id: null, publicado_en: t })
  db.animales.push(
    animal(patitas, 'Canela', 'perro', 'Mestiza', '1 a 2 años', 'Sana, esterilizada y vacunada', 'Rescatada de la vía pública en Osorno. Es cariñosa y se lleva bien con otros perros.', '/img/canela.jpg'),
    animal(patitas, 'Tomás', 'gato', 'Europeo', '6 meses', 'Sano y desparasitado', 'Encontrado junto a su camada. Juguetón y muy sociable.', '/img/gato-atigrado.jpg'),
    animal(patitas, 'Bruno', 'perro', 'Beagle', '4 años', 'Sano, vacunado y con chip', 'Entregado por su familia al mudarse. Tranquilo, ideal para departamento.', '/img/beagle.jpg'),
    animal(patitas, 'Miel', 'perro', 'Cachorra mestiza', '3 meses', 'Vacunada y desparasitada', 'Nació en un rescate. Juguetona y sociable con niños.', '/img/cachorro.jpg'),
    animal(patitas, 'Nube', 'gato', 'Mestizo', '2 años', 'Sano y esterilizado', 'Encontrada en una feria. Cariñosa, le gusta dormir en el regazo.', '/img/gato-3777622.jpg'),
    animal(nueva, 'Borrador', 'perro', 'Mestizo', '3 años', null, 'Aún sin publicar: la ONG no está verificada.', null, ficha()),
  )
  return db
}

function stored(): Db | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) as Db : null
  } catch { return null /* almacenamiento no disponible o dañado */ }
}

export let db: Db = stored() ?? seed()

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* sin almacenamiento, los datos duran hasta recargar */ }
}

// El seed se guarda de inmediato para que todas las pestañas compartan los mismos identificadores.
save()

/** Relee el estado guardado: otra pestaña (por ejemplo, la ficha pública del QR) pudo haberlo cambiado. */
export function refresh() {
  const s = stored()
  if (s) db = s
}

/** Restaura los datos de demostración y borra todo lo creado en este navegador. */
export function resetDemo() {
  db = seed()
  save()
}
