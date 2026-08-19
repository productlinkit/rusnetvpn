/* ==========================================================================
   TOKEN STORAGE

   The mobile app keeps tokens in the Keychain/Keystore
   (mobile/rusnetvpn/src/shared/storage/secureStore.ts). A browser has no
   equivalent: localStorage is readable by any script that gets onto the page,
   and an httpOnly cookie — the one storage JavaScript genuinely cannot read —
   has to be set by the backend, which today issues bearer tokens in a JSON
   body instead.

   So localStorage it is, with the tradeoff stated rather than hidden: an XSS
   on this origin can lift the session. The page ships no third-party script
   and no user-generated HTML, which is what keeps that from being a live hole.
   Moving to httpOnly refresh cookies is a backend change, not a client one.
   ========================================================================== */

const KEY = {
  access: 'rusvpn.access_token',
  refresh: 'rusvpn.refresh_token',
  user: 'rusvpn.user',
}

/** Safari in private mode throws on setItem; a failed write must not throw. */
function safe(fn, fallback = null) {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export const tokenStore = {
  access: () => safe(() => localStorage.getItem(KEY.access)),
  refresh: () => safe(() => localStorage.getItem(KEY.refresh)),

  /**
   * Both halves rotate together (BR-11). Storing only the new access token
   * would leave the old refresh token in place, and presenting it again is
   * exactly the replay that revokes the whole token family.
   */
  save({ accessToken, refreshToken }) {
    safe(() => {
      localStorage.setItem(KEY.access, accessToken)
      localStorage.setItem(KEY.refresh, refreshToken)
    })
  },

  clear() {
    safe(() => {
      localStorage.removeItem(KEY.access)
      localStorage.removeItem(KEY.refresh)
      localStorage.removeItem(KEY.user)
    })
  },
}

/**
 * The user is cached beside the token so a reload paints the signed-in nav on
 * the first frame instead of flashing "Login" until GET /me answers. It is a
 * cache, not the truth — the profile call that follows overwrites it.
 */
export const userCache = {
  read() {
    const raw = safe(() => localStorage.getItem(KEY.user))
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },
  write(user) {
    safe(() => localStorage.setItem(KEY.user, JSON.stringify(user)))
  },
}
