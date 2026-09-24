import type { CommunityPost } from './types'

export type ModeratedUser = { id: string; name: string; email: string; role: string; status: string }
export type ModerationCase = {
  target: { type: 'post' | 'profile'; title: string; detail: string; postId?: string }
  reason: string
  reporterMessages: { author: string; text: string }[]
  example?: boolean
}

const sampleCases: Record<string, ModerationCase> = {
  u3: {
    target: { type: 'profile', title: 'Perfil de Carlos Muñoz', detail: 'Cuenta de tutor en PetSuite; revisar sus interacciones antes de tomar una medida.' },
    reason: 'Comportamiento reportado en interacciones de la comunidad',
    reporterMessages: [
      { author: 'María C.', text: 'Recibí comentarios insistentes en una conversación del muro. Me gustaría que revisaran la cuenta.' },
      { author: 'Felipe S.', text: 'El usuario repitió mensajes fuera de tema en varias respuestas. Solicito una revisión.' },
    ],
    example: true,
  },
}

export function getModerationCase(user: ModeratedUser): ModerationCase {
  const posts = JSON.parse(localStorage.getItem('petsuite-posts') || '[]') as CommunityPost[]
  const post = posts.find(item => item.author === user.name && item.reported)
  if (post) {
    const messages = JSON.parse(localStorage.getItem('petsuite-moderation-post-messages') || '{}') as Record<string, { author: string; text: string }[]>
    return {
      target: { type: 'post', title: post.title, detail: post.body, postId: post.id },
      reason: 'Publicación reportada en el muro comunal',
      reporterMessages: messages[post.id] || [],
    }
  }
  return sampleCases[user.id] || {
    target: { type: 'profile', title: `Perfil de ${user.name}`, detail: `${user.role} · ${user.email}` },
    reason: 'Cuenta señalada para revisión',
    reporterMessages: [],
  }
}
