export type UserRole = 'tutor' | 'business' | 'clinical' | 'admin'

export type Pet = {
  id: string
  name: string
  species: string
  breed: string
  age: number
  weight: number
  color: string
  initials: string
  allergies: string[]
  qrActive: boolean
}

export type DemoUser = { name: string; email: string; role: UserRole; label: string }

export type BusinessCategory = 'Veterinaria' | 'Tienda' | 'Peluquería' | 'Tienda de mascotas'

export type Business = {
  id: string
  name: string
  category: BusinessCategory
  commune: string
  address: string
  distance: string
  description: string
  initials: string
  open: boolean
  featured?: boolean
}

export type PostType = 'Extravío' | 'Encuentro' | 'Recomendación'

export type CommunityComment = { id: string; author: string; text: string }

export type CommunityPost = {
  id: string
  type: PostType
  author: string
  location: string
  time: string
  title: string
  body: string
  initials: string
  reactions: number
  reacted: boolean
  comments: CommunityComment[]
  reported: boolean
}

export type Product = { id: string; businessId: string; name: string; category: string; price: number; stock: number; description: string }

export type Order = { id: string; businessId: string; customer: string; items: { productId: string; name: string; quantity: number; price: number }[]; total: number; delivery: 'Retiro en tienda' | 'Despacho'; status: 'Recibido' | 'Confirmado' | 'Preparando' | 'Enviado' | 'Completado' }
