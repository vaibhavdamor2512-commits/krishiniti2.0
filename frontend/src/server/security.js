const encoder = new TextEncoder()
const PBKDF2_ITERATIONS = 50000

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlToBytes(value) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function pbkdf2(password, salt, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const digest = await pbkdf2(password, salt)
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(digest)}`
}

export async function verifyPassword(password, stored) {
  const [algorithm, iterationsText, saltText, expectedText] = String(stored || '').split('$')
  if (algorithm !== 'pbkdf2_sha256' || !iterationsText || !saltText || !expectedText) return false
  const actual = await pbkdf2(password, base64UrlToBytes(saltText), Number(iterationsText))
  const expected = base64UrlToBytes(expectedText)
  if (actual.length !== expected.length) return false
  let different = 0
  for (let index = 0; index < actual.length; index += 1) different |= actual[index] ^ expected[index]
  return different === 0
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  return bytesToBase64Url(new Uint8Array(digest))
}

export async function createSession(db, userId) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)))
  const tokenHash = await hashToken(token)
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await db.prepare('INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(userId, tokenHash, expiresAt, createdAt).run()
  return token
}

export async function requireUser(request, db) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return null
  const tokenHash = await hashToken(token)
  const row = await db.prepare(`
    SELECT users.id, users.name, users.mobile, users.location, users.farm_size, users.preferred_language
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).bind(tokenHash, new Date().toISOString()).first()
  return row || null
}
