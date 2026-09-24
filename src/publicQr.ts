import type { Pet, PublicPet } from './types'
import { publicPetSchema } from './validators'

// The fragment carries only the fields explicitly listed for public emergencies.
// It remains readable without the tutor's localStorage, including on another device.
export function toPublicPet(pet: Pet): PublicPet {
  return publicPetSchema.parse({
    version: 1,
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    initials: pet.initials,
    allergies: (pet.allergies || []).filter(Boolean),
    conditions: (pet.conditions || []).filter(Boolean),
    emergencyNotes: pet.emergencyNotes || '',
  })
}

export function createPublicQrUrl(pet: Pet, origin: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify(toPublicPet(pet)))
  const encoded = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${origin}/#emergency/v1/${encoded}`
}

export function readPublicQr(hash: string): PublicPet | null {
  const match = /^#emergency\/v1\/([A-Za-z0-9_-]+)$/.exec(hash)
  if (!match || match[1].length > 3000) return null
  try {
    const encoded = match[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0))
    return publicPetSchema.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
  } catch {
    return null
  }
}
