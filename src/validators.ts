import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const petSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre de tu mascota').max(80, 'El nombre no puede superar 80 caracteres'),
  species: z.string().trim().min(2, 'Ingresa la especie').max(60, 'La especie es demasiado larga'),
  breed: z.string().trim().min(2, 'Ingresa la raza').max(80, 'La raza es demasiado larga'),
  age: z.coerce.number().min(0).max(40),
  weight: z.coerce.number().positive('El peso debe ser mayor que cero'),
  color: z.string().trim().min(2, 'Ingresa el color').max(80, 'El color es demasiado largo'),
})

const healthList = z.string().max(240, 'Resume los datos en menos de 240 caracteres').refine(value => {
  const items = value.split(',').map(item => item.trim()).filter(Boolean)
  return items.length <= 8 && items.every(item => item.length <= 80)
}, 'Usa hasta 8 elementos de máximo 80 caracteres, separados por comas')

export const petHealthSchema = z.object({
  allergies: healthList,
  conditions: healthList,
  medications: healthList,
  emergencyNotes: z.string().max(160, 'La nota pública no puede superar 160 caracteres'),
})

export const medicalEntrySchema = z.object({
  date: z.iso.date('Indica una fecha válida'),
  type: z.enum(['Vacuna', 'Atención', 'Tratamiento']),
  title: z.string().trim().min(3, 'Describe la atención').max(80, 'Usa un título más breve'),
  notes: z.string().trim().max(500, 'La descripción no puede superar 500 caracteres'),
})

export const publicPetSchema = z.strictObject({
  version: z.literal(1),
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  species: z.string().min(1).max(60),
  breed: z.string().min(1).max(80),
  initials: z.string().max(4),
  allergies: z.array(z.string().max(80)).max(8),
  conditions: z.array(z.string().max(80)).max(8),
  emergencyNotes: z.string().max(160),
})

export const emergencyContactSchema = z.object({ message: z.string().trim().min(10, 'Escribe al menos 10 caracteres').max(500, 'El mensaje es demasiado largo') })

export const communityPostSchema = z.object({
  type: z.enum(['Extravío', 'Encuentro', 'Recomendación']),
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres'),
  body: z.string().min(15, 'Cuéntanos un poco más para ayudar a la comunidad'),
  location: z.string().min(2, 'Ingresa una comuna o ubicación'),
})

export const communityCommentSchema = z.object({
  text: z.string().min(2, 'Escribe un comentario'),
})

export const moderationMessageSchema = z.string().trim().min(10, 'Escribe un mensaje de al menos 10 caracteres').max(1000, 'El mensaje no puede superar 1000 caracteres')

export const moderationSuspensionSchema = z.object({
  duration: z.enum(['temporary', 'permanent']),
  days: z.coerce.number().int('Ingresa un número entero de días').min(1, 'Indica al menos 1 día').max(3650, 'El máximo es 3650 días'),
  message: moderationMessageSchema,
})

export type LoginInput = z.infer<typeof loginSchema>
export type PetInput = z.infer<typeof petSchema>
export type CommunityPostInput = z.infer<typeof communityPostSchema>
