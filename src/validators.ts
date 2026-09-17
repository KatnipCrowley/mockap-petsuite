import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Ingresa un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const petSchema = z.object({
  name: z.string().min(2, 'Ingresa el nombre de tu mascota'),
  species: z.string().min(2, 'Ingresa la especie'),
  breed: z.string().min(2, 'Ingresa la raza'),
  age: z.coerce.number().min(0).max(40),
  weight: z.coerce.number().positive('El peso debe ser mayor que cero'),
  color: z.string().min(2, 'Ingresa el color'),
})

export const communityPostSchema = z.object({
  type: z.enum(['Extravío', 'Encuentro', 'Recomendación']),
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres'),
  body: z.string().min(15, 'Cuéntanos un poco más para ayudar a la comunidad'),
  location: z.string().min(2, 'Ingresa una comuna o ubicación'),
})

export const communityCommentSchema = z.object({
  text: z.string().min(2, 'Escribe un comentario'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type PetInput = z.infer<typeof petSchema>
export type CommunityPostInput = z.infer<typeof communityPostSchema>
