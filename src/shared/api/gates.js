/* ==========================================================================
   GLOBAL GATES

   The handlers the response interceptor calls when the server raises something
   no single screen can own — a suspended account, a revoked token family.

   They live in their own module, with no imports, for one reason: the session
   store has to register them, and the API client has to call them, but the
   client drags in zod and every wire schema behind it. Keeping the registry
   here is what lets the marketing page load without any of that — the auth
   runtime is imported on demand (see session.jsx).
   ========================================================================== */

const noop = () => {}

export const gates = {
  /** Refresh failed or the token family was revoked — drop the session. */
  onForceLogout: noop,
  /** ACC_001: the account is suspended. */
  onSuspended: noop,
  /** The language to advertise in Accept-Language. */
  currentLanguage: () => 'en',
}

/** Called once at app start, from the app layer. */
export function registerApiHandlers(next) {
  Object.assign(gates, next)
}
