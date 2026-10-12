// Roles y permisos por módulo. Fuente única para el mock (RBAC) y para los menús.
// Los roles de plataforma se asignan por PetSuite; los roles internos de una Pyme los asigna su dueño.

export type Rol = 'tutor' | 'ong' | 'pyme' | 'jefe_local' | 'clinico' | 'asesor' | 'admin'

// Módulos de una Pyme (tenant). El dueño los tiene todos salvo Pacientes, que es del personal clínico.
export const MODULOS_PYME = ['perfil', 'sucursales', 'catalogo', 'contactos', 'metricas', 'equipo', 'publicidad', 'convenios', 'suscripcion', 'pacientes'] as const
// Módulos de plataforma: el asesor gestiona cuentas comerciales; el administrador además usuarios, moderación y privacidad.
export const MODULOS_PLATAFORMA = ['cuentas', 'aprobaciones', 'cobranza', 'correos', 'usuarios', 'moderacion', 'privacidad'] as const

export type ModuloPyme = typeof MODULOS_PYME[number]
export type ModuloPlataforma = typeof MODULOS_PLATAFORMA[number]
export type Modulo = ModuloPyme | ModuloPlataforma

export const moduloLabel: Record<Modulo, string> = {
  perfil: 'Perfil del negocio', sucursales: 'Sucursales', catalogo: 'Catálogo', contactos: 'Consultas de clientes', metricas: 'Métricas', equipo: 'Equipo y permisos',
  publicidad: 'Publicidad', convenios: 'Convenios y cupones', suscripcion: 'Suscripción y pagos', pacientes: 'Pacientes (Ficha Única)',
  cuentas: 'Cuentas Pyme y ONG', aprobaciones: 'Aprobaciones', cobranza: 'Cobranza (Orcob)', correos: 'Correos enviados', usuarios: 'Usuarios', moderacion: 'Moderación', privacidad: 'Privacidad (Ley 21.719)',
}

export const rolLabel: Record<Rol, string> = {
  tutor: 'Tutor de mascotas', ong: 'ONG de rescate y adopción', pyme: 'Dueño o administrador de Pyme', jefe_local: 'Jefe de local',
  clinico: 'Personal clínico veterinario', asesor: 'Asesor PetSuite', admin: 'Administrador PetSuite',
}

// Qué puede recibir cada rol interno y con qué parte por defecto. El dueño puede ajustar dentro de lo permitido.
export const ROLES_EQUIPO = {
  jefe_local: { permitidos: ['perfil', 'catalogo', 'contactos', 'metricas', 'publicidad', 'convenios'], porDefecto: ['perfil', 'catalogo', 'contactos', 'metricas'] },
  clinico: { permitidos: ['pacientes', 'contactos'], porDefecto: ['pacientes'] },
} as const satisfies Record<'jefe_local' | 'clinico', { permitidos: readonly ModuloPyme[]; porDefecto: readonly ModuloPyme[] }>

export type RolEquipo = keyof typeof ROLES_EQUIPO

export const PERMISOS_DUENO: ModuloPyme[] = MODULOS_PYME.filter(m => m !== 'pacientes')
export const PERMISOS_ASESOR: ModuloPlataforma[] = ['cuentas', 'aprobaciones', 'cobranza', 'correos']
export const PERMISOS_ADMIN: ModuloPlataforma[] = [...MODULOS_PLATAFORMA]

export const puede = (permisos: readonly string[] | undefined, modulo: Modulo) => !!permisos?.includes(modulo)
