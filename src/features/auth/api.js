import { z } from 'zod'
import { api } from '../../shared/api/client'
import { tokenStore, userCache } from '../../shared/api/tokens'

/* ==========================================================================
   AUTH ENDPOINTS

   Matches backend/internal/modules/auth/dto.go exactly, the same way
   mobile/rusnetvpn/src/features/auth/api/authApi.ts does.

   Field names are snake_case because that is the wire contract; the mapping to
   the page's camelCase happens in `toSession` so exactly one place knows both.
   ========================================================================== */

// ---------------------------------------------------------------------------
// Wire schemas
// ---------------------------------------------------------------------------

const tokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expires_at: z.string(),
})

const userPayloadSchema = z.object({
  id: z.string(),
  account_type: z.enum(['guest', 'registered']),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  language: z.string(),
  is_verified: z.boolean(),
  tier: z.enum(['guest', 'free', 'premium']),
})

const sessionResponseSchema = z.object({
  user: userPayloadSchema,
  tokens: tokenPairSchema,
})

const registerResponseSchema = z.object({
  user: userPayloadSchema,
  otp_expires_at: z.string(),
  resend_after_ms: z.number(),
})

const otpResponseSchema = z.object({
  email: z.string(),
  purpose: z.string(),
  expires_at: z.string(),
  resend_after_ms: z.number(),
})

const profileSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  language: z.string(),
  account_type: z.string(),
  is_verified: z.boolean(),
  tier: z.string(),
  member_since: z.string(),
})

// ---------------------------------------------------------------------------
// App-facing shape
// ---------------------------------------------------------------------------

/**
 * What the rest of the page knows about the signed-in person.
 *
 * `local` and `initial` exist because the header renders an avatar letter and
 * a short name in three places; deriving them here means the three cannot
 * disagree.
 */
export function toUser(raw) {
  const email = raw.email ?? ''
  const name = raw.name ?? ''
  const local = name || email.split('@')[0] || 'you'
  return {
    id: raw.id,
    email,
    name: name || undefined,
    local,
    short: local.length > 12 ? local.slice(0, 12) + '…' : local,
    initial: (name.charAt(0) || email.charAt(0) || '?').toUpperCase(),
    tier: raw.tier === 'premium' ? 'premium' : 'free',
    isGuest: raw.account_type === 'guest',
    isVerified: raw.is_verified,
    language: raw.language,
  }
}

/** Commits a session: tokens first, so the very next call is authenticated. */
function commit(raw) {
  tokenStore.save({
    accessToken: raw.tokens.access_token,
    refreshToken: raw.tokens.refresh_token,
  })
  const user = toUser(raw.user)
  userCache.write(user)
  return user
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function login({ email, password }) {
  const data = await api.post('/auth/login', { email, password }, sessionResponseSchema)
  return commit(data)
}

/**
 * Exchanges a Google ID token for a session, creating the account on first use.
 *
 * Only the token travels: the server reads the email, name and subject from its
 * verified claims and ignores anything sent alongside, because a client-supplied
 * email would be unauthenticated and trivially forged.
 */
export async function googleSignIn(idToken) {
  const data = await api.post('/auth/google', { id_token: idToken }, sessionResponseSchema)
  return commit(data)
}

/**
 * Registration does *not* return a session: the account is unusable until the
 * emailed code is verified, so the caller must route to the code screen.
 */
export async function register({ name, email, password, language }) {
  const data = await api.post(
    '/auth/register',
    { name, email, password, language },
    registerResponseSchema,
  )
  return {
    email,
    purpose: 'register',
    expiresAt: data.otp_expires_at,
    resendAfterMs: data.resend_after_ms,
  }
}

/**
 * Verifying a `register` code returns a session and signs the user in; the
 * other purposes only confirm the code, so the response has no tokens. Which
 * one it is comes from parsing the answer rather than from trusting the
 * purpose we asked with, because the server is the one that decides.
 */
export async function verifyOtp({ email, code, purpose }) {
  const data = await api.post('/auth/otp/verify', { email, code, purpose })
  const parsed = sessionResponseSchema.safeParse(data)
  return parsed.success ? commit(parsed.data) : null
}

export async function resendOtp({ email, purpose }) {
  const data = await api.post('/auth/otp/resend', { email, purpose }, otpResponseSchema)
  return {
    email: data.email,
    purpose: data.purpose,
    expiresAt: data.expires_at,
    resendAfterMs: data.resend_after_ms,
  }
}

/**
 * The response is identical whether or not the address is registered — the
 * server will not reveal who has an account, so the UI must not either.
 */
export async function requestPasswordReset(email) {
  const data = await api.post('/auth/forgot-password', { email }, otpResponseSchema)
  return {
    email: data.email,
    purpose: 'forgot_password',
    expiresAt: data.expires_at,
    resendAfterMs: data.resend_after_ms,
  }
}

/** Every existing session is revoked by this (BR-11), including ours. */
export async function resetPassword({ email, code, password }) {
  await api.postVoid('/auth/reset-password', { email, code, password })
}

/** The signed-in profile, used to re-hydrate a session on a cold load. */
export async function fetchProfile() {
  const data = await api.get('/me', profileSchema)
  const user = toUser({ ...data, account_type: data.account_type })
  userCache.write(user)
  return user
}

/**
 * Logout is best-effort on the wire: the local session is cleared regardless,
 * so a network failure must not strand someone in a signed-in shell. It still
 * works while suspended, which is why it is worth attempting at all.
 */
export async function logout() {
  const refreshToken = tokenStore.refresh()
  try {
    await api.postVoid('/auth/logout', { refresh_token: refreshToken ?? '' })
  } catch {
    // Intentionally swallowed — see above.
  } finally {
    tokenStore.clear()
  }
}
