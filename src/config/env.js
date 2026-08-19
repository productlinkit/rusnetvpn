/* ==========================================================================
   ENV

   Mirrors mobile/rusnetvpn/src/config/env.ts. Vite only exposes variables
   prefixed VITE_, and inlines them at build time — so this is a build-time
   choice, not a runtime one. See .env.example.
   ========================================================================== */

const raw = import.meta.env

export const env = {
  mode: raw.MODE,
  /** Base URL including the API version prefix, e.g. http://localhost:8090/api/v1 */
  apiBaseUrl: (raw.VITE_API_BASE_URL || 'http://localhost:8090/api/v1').replace(/\/+$/, ''),
  requestTimeoutMs: Number(raw.VITE_REQUEST_TIMEOUT_MS || 15000),
  /**
   * Web OAuth client id for Google Sign-In. Empty means the feature is off for
   * this build — the button stays hidden rather than failing on click.
   *
   * The backend applies the mirror image of this rule: with no client id
   * configured it does not mount POST /auth/google at all, so the two agree on
   * when the feature exists instead of offering a login that answers 404.
   */
  googleClientId: raw.VITE_GOOGLE_CLIENT_ID || '',
}

export const googleSignInEnabled = env.googleClientId !== ''
