import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

// Node's built-in TypeScript support needs the explicit extension used by Vite's bundler.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === './validators' && context.parentURL?.endsWith('/publicQr.ts')) {
    return nextResolve(new URL('./validators.ts', context.parentURL).href, context)
  }
  return nextResolve(specifier, context)
} })

const { createPublicQrUrl, readPublicQr } = await import('./publicQr.ts')

const pet = {
  id: 'luna', name: 'Luna Ñuñoa', species: 'Perro', breed: 'Mestiza', initials: 'LU',
  allergies: ['Pollo'], conditions: ['Dermatitis'], emergencyNotes: 'Evitar el pollo.',
  medications: ['Medicamento privado'], medicalHistory: [{ id: '1', notes: 'Consulta privada' }],
  color: 'Canela', age: 4, weight: 12.4, qrActive: true,
}

test('a QR opens with public health data without access to the tutor browser', () => {
  const url = createPublicQrUrl(pet, 'https://petsuite.example')
  const snapshot = readPublicQr(new URL(url).hash)
  assert.equal(snapshot.name, 'Luna Ñuñoa')
  assert.deepEqual(snapshot.allergies, ['Pollo'])
  assert.deepEqual(snapshot.conditions, ['Dermatitis'])
  assert.equal(snapshot.emergencyNotes, 'Evitar el pollo.')
  assert.ok(!url.includes('Medicamento privado'))
  assert.equal('medications' in snapshot, false)
  assert.equal('medicalHistory' in snapshot, false)
  assert.equal('weight' in snapshot, false)
})

test('invalid, oversized and legacy links never expose a private pet', () => {
  assert.equal(readPublicQr('#emergency/luna'), null)
  assert.equal(readPublicQr('#emergency/v1/not-valid'), null)
  assert.equal(readPublicQr(`#emergency/v1/${'a'.repeat(3001)}`), null)
  const withPrivateField = { ...readPublicQr(new URL(createPublicQrUrl(pet, 'https://petsuite.example')).hash), medications: ['No público'] }
  const encoded = Buffer.from(JSON.stringify(withPrivateField)).toString('base64url')
  assert.equal(readPublicQr(`#emergency/v1/${encoded}`), null)
})

test('a generated QR is a snapshot and editing the pet requires a new QR', () => {
  const oldHash = new URL(createPublicQrUrl(pet, 'https://petsuite.example')).hash
  const changedHash = new URL(createPublicQrUrl({ ...pet, allergies: ['Pollo', 'Abejas'] }, 'https://petsuite.example')).hash
  assert.notEqual(oldHash, changedHash)
  assert.deepEqual(readPublicQr(oldHash).allergies, ['Pollo'])
  assert.deepEqual(readPublicQr(changedHash).allergies, ['Pollo', 'Abejas'])
})

test('a QR on GitHub Pages keeps the repository path', () => {
  const url = new URL(createPublicQrUrl(pet, 'https://example.github.io/mockap-petsuite/'))
  assert.equal(url.pathname, '/mockap-petsuite/')
  assert.equal(readPublicQr(url.hash).name, pet.name)
})
