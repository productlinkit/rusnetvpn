import { env } from '../../config/env'
import { successEnvelopeSchema } from './envelope'
import { ApiError, fromResponse, toApiError } from './errors'
import { gates } from './gates'
import { tokenStore } from './tokens'

/* ==========================================================================
   CLIENT

   The single HTTP entry point to the RusVPN backend, port of
   mobile/rusnetvpn/src/shared/api/client.ts. Four things happen here that must
   not be re-implemented per call site:

     1. Client identity headers.
     2. Envelope unwrapping — callers get `data`, validated against a schema.
     3. The global gates (ACC_001, AUTH_004), which the server can raise from
        any endpoint, so they are handled once rather than in each screen.
     4. Refresh-on-401, rotating both halves of the token pair exactly once
        even when a burst of calls fails together.

   It uses fetch rather than axios — the mobile app's choice buys interceptors,
   which on the web is the forty lines below and no dependency.

   ---------------------------------------------------------------------------
   Why this client does NOT send X-Device-Id / X-Platform / X-App-Version
   ---------------------------------------------------------------------------
   Those three are mandatory for the VPN clients, and deliberately absent here.

   X-Device-Id is what the server counts device slots against (BRD §5.7). A
   browser is not a VPN client: sending an id would burn one of the account's
   five slots the first time somebody signs in to read an invoice, and take it
   away from the phone that actually needs a tunnel. The backend supports this
   directly — `Service.registerDevice` returns early on an empty header and
   leaves the session unlinked rather than failing the login.

   X-Platform / X-App-Version drive the per-OS force-update gate. The website
   has no version in `app_versions`, and claiming `windows` would measure it
   against the Windows desktop app's minimum — an unrelated number that could
   lock the site out on a release day. `VersionGate` passes a request through
   when the platform header is absent, which is the documented behaviour for
   clients that are not versioned builds.
   ========================================================================== */

/* The gates themselves are registered by the session store — see gates.js. */
export { registerApiHandlers } from './gates'

/* ---------- the request itself ---------- */

function buildHeaders(extra) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': gates.currentLanguage(),
    ...extra,
  })
  const token = tokenStore.access()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

async function readBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function send(path, { method = 'GET', body, signal } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), env.requestTimeoutMs)
  /* a caller-supplied signal (unmount, navigation) has to be able to cancel
     the same request the timeout can */
  signal?.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    const response = await fetch(env.apiBaseUrl + path, {
      method,
      headers: buildHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    return { response, body: await readBody(response) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Refresh is a bare call, not routed back through `request`: re-entering the
 * 401 branch on failure could recurse.
 */
async function refreshAccessToken() {
  const refreshToken = tokenStore.refresh()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!response.ok) return null
    const payload = await response.json()
    const tokens = payload?.data?.tokens
    if (!tokens?.access_token || !tokens?.refresh_token) return null

    tokenStore.save({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
    return tokens.access_token
  } catch {
    return null
  }
}

/** In-flight refresh, shared so a burst of 401s triggers exactly one rotation. */
let refreshPromise = null

function rotateOnce() {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

/**
 * Runs a request and returns the envelope's `data`, validated.
 *
 * Validation is not ceremony: the page renders whatever comes back, and a
 * silently-changed field would otherwise surface as an undefined deep inside a
 * component. Failing at the boundary names the endpoint instead.
 */
export async function request(path, options = {}, schema) {
  let attempt
  try {
    attempt = await send(path, options)
  } catch (error) {
    throw toApiError(error)
  }

  let { response, body } = attempt

  if (!response.ok) {
    let error = fromResponse(response.status, body)

    // --- global gates, in the order the server can raise them ---------------

    if (error.code === 'ACC_001') {
      gates.onSuspended(error.suspension ?? {})
      throw error
    }

    // A replayed refresh token means the server revoked every session in the
    // family. There is nothing left to refresh with, so retrying would only
    // earn a second 401 — go straight to sign-in.
    if (error.code === 'AUTH_004') {
      gates.onForceLogout()
      throw error
    }

    // --- expired access token: rotate once, then replay ---------------------

    if (error.code === 'AUTH_001' && !options._retried && tokenStore.refresh()) {
      const token = await rotateOnce()
      if (token) {
        try {
          attempt = await send(path, { ...options, _retried: true })
        } catch (e) {
          throw toApiError(e)
        }
        ;({ response, body } = attempt)
        if (!response.ok) throw fromResponse(response.status, body)
      } else {
        gates.onForceLogout()
        throw error
      }
    } else {
      throw error
    }
  }

  const envelope = successEnvelopeSchema.safeParse(body)
  if (!envelope.success) throw new ApiError('UNKNOWN', { status: response.status })

  if (!schema) return envelope.data.data
  const parsed = schema.safeParse(envelope.data.data)
  if (!parsed.success) {
    if (import.meta.env.DEV) {
      console.warn(
        `[api] response shape mismatch for ${options.method ?? 'GET'} ${path}:`,
        parsed.error.issues,
      )
    }
    throw new ApiError('UNKNOWN', { status: response.status })
  }
  return parsed.data
}

export const api = {
  get: (path, schema) => request(path, { method: 'GET' }, schema),
  post: (path, body, schema) => request(path, { method: 'POST', body }, schema),
  patch: (path, body, schema) => request(path, { method: 'PATCH', body }, schema),
  /** For endpoints whose payload we do not need. Still raises on failure. */
  postVoid: (path, body) => request(path, { method: 'POST', body }),
}
