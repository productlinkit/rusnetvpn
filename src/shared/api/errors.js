import { errorEnvelopeSchema, suspendedDataSchema } from './envelope'

/* ==========================================================================
   ERRORS

   Port of mobile/rusnetvpn/src/shared/api/errors.ts. The rest of the app never
   sees fetch or HTTP — every failure arrives as an ApiError carrying the
   server's own `error_code`.
   ========================================================================== */

/**
 * The codes the backend documents as worth handling explicitly (BRD §12.4),
 * plus the two the client raises when the server never got to answer.
 */
export const CODES = [
  'VALIDATION_001', // 422 — field errors present
  'AUTH_001', // 401 — token missing/expired
  'AUTH_002', // 401 — wrong email or password
  'AUTH_003', // 401 — OTP wrong or expired
  'AUTH_004', // 401 — refresh replayed, all sessions revoked
  'AUTH_005', // 401 — email not verified
  'ACC_001', // 403 — account suspended
  'DEV_001', // 409 — device slots full
  'SRV_001', // 403 — premium-only location
  'SUBS_003', // 409 — already subscribed
  'APP_001', // 426 — below min_supported_version
  'RATE_001', // 429 — rate limited
]

/**
 * Last-resort copy, used only when the server did not send `msg_localized` —
 * which happens when the request never reached it at all. It is deliberately
 * short: the server's own catalogue is the source of truth for wording, and
 * duplicating it here would guarantee the two drift.
 */
const FALLBACK = {
  VALIDATION_001: 'Please check the highlighted fields.',
  AUTH_001: 'Your session has expired. Please sign in again.',
  AUTH_002: 'Incorrect email or password.',
  AUTH_003: 'The verification code is invalid or has expired.',
  AUTH_004: 'Your session is no longer valid. Please sign in again.',
  AUTH_005: 'Please verify your email first.',
  ACC_001: 'Your account has been suspended. Please contact support.',
  DEV_001: 'You have reached the device limit for your plan.',
  RATE_001: 'Too many attempts. Please wait a moment and try again.',
  APP_001: 'This version is no longer supported.',
  NETWORK: 'No connection. Check your network and try again.',
  TIMEOUT: 'The request timed out. Please try again.',
  UNKNOWN: 'Something went wrong. Please try again.',
}

export class ApiError extends Error {
  constructor(code, options = {}) {
    super(options.i18nKey || code)
    this.name = 'ApiError'
    this.code = code
    /** The server's translation key, e.g. `error.auth.invalidCredentials`. */
    this.i18nKey = options.i18nKey
    this.status = options.status
    /** field name -> message, from the envelope's `error[]`. */
    this.fieldErrors = options.fieldErrors
    /** The server's own rendering of `msg`, honouring Accept-Language. */
    this.localizedMessage = options.localizedMessage
    this.data = options.data
  }

  /** What to actually show a person. */
  get text() {
    return this.localizedMessage || FALLBACK[this.code] || FALLBACK.UNKNOWN
  }

  /** True when the user should be sent to the code screen, not shown a toast. */
  get needsEmailVerification() {
    return this.code === 'AUTH_005'
  }

  get suspension() {
    if (this.code !== 'ACC_001') return undefined
    const parsed = suspendedDataSchema.safeParse(this.data)
    return parsed.success ? parsed.data : undefined
  }
}

/** Collapse the envelope's `error[]` into field -> message. */
function toFieldErrors(errors) {
  if (!errors?.length) return undefined
  const out = {}
  for (const e of errors) {
    // First message wins: the UI has one slot per input, and the server orders
    // them by declaration, so the first is the most specific failure.
    if (out[e.field] === undefined) out[e.field] = e.msg
  }
  return out
}

/**
 * Normalize anything the network layer throws into a single ApiError.
 *
 * Two shapes arrive here: a proper error envelope (the common case), and
 * everything else — a proxy's HTML error page, a dropped connection, an abort.
 * The second group must still produce something renderable, never an unhandled
 * rejection.
 */
export function toApiError(error) {
  if (error instanceof ApiError) return error
  if (error?.name === 'AbortError') return new ApiError('TIMEOUT')
  if (error instanceof TypeError) {
    // fetch rejects with TypeError for DNS failures, refused connections and
    // CORS preflight rejections alike — from here they are all "no answer".
    return new ApiError('NETWORK')
  }
  return new ApiError('UNKNOWN')
}

/** Build an ApiError from a non-2xx response whose body we have already read. */
export function fromResponse(status, body) {
  const envelope = errorEnvelopeSchema.safeParse(body)
  if (envelope.success) {
    const { error_code, msg, error, data, msg_localized } = envelope.data
    return new ApiError(CODES.includes(error_code) ? error_code : 'UNKNOWN', {
      i18nKey: msg,
      status,
      fieldErrors: toFieldErrors(error),
      localizedMessage: msg_localized,
      data,
    })
  }
  // A non-envelope body means something between us and the API answered — a
  // proxy, a load balancer, an offline page. Status is all we can trust.
  return new ApiError(status === 401 ? 'AUTH_001' : 'UNKNOWN', { status })
}
