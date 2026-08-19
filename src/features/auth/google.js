import { env, googleSignInEnabled } from '../../config/env'

/* ==========================================================================
   GOOGLE SIGN-IN

   Google Identity Services, loaded on demand. The mobile app uses the native
   SDK; on the web the equivalent is a script from accounts.google.com, and the
   only thing that crosses to our backend is the ID token it hands back — the
   backend verifies the signature and audience itself and ignores everything
   else the client might claim.

   The script is fetched the first time somebody clicks the button rather than
   on page load: nobody should pay for a third-party script to read a pricing
   table, and it keeps Google off the critical path of the first paint.

   The whole module is dead code unless VITE_GOOGLE_CLIENT_ID is set, which is
   also when the backend mounts POST /auth/google — the button is hidden
   otherwise, so the two ends agree on whether the feature exists.
   ========================================================================== */

const SRC = 'https://accounts.google.com/gsi/client'

let loader = null

function loadScript() {
  loader ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      // let a later click try again instead of caching the failure forever
      loader = null
      reject(new Error('google-unavailable'))
    }
    document.head.appendChild(el)
  })
  return loader
}

/**
 * Opens Google's account chooser and resolves with an ID token.
 *
 * `initialize` is called per attempt rather than once at load, because the
 * callback has to close over *this* promise's resolve — GIS holds exactly one
 * callback and a stale one would resolve a promise nobody is waiting on.
 *
 * The prompt can decline to show (the user dismissed it too often, a browser
 * blocks third-party state). That is reported as a rejection rather than left
 * to hang, so the button can go back to being clickable.
 */
export async function requestGoogleIdToken() {
  if (!googleSignInEnabled) throw new Error('google-sign-in-disabled')
  await loadScript()

  return new Promise((resolve, reject) => {
    let settled = false
    const done = (fn) => (value) => {
      if (settled) return
      settled = true
      fn(value)
    }
    const ok = done(resolve)
    const fail = done(reject)

    window.google.accounts.id.initialize({
      client_id: env.googleClientId,
      callback: (response) =>
        response?.credential ? ok(response.credential) : fail(new Error('google-no-credential')),
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    })

    window.google.accounts.id.prompt((notification) => {
      if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
        fail(new Error('google-prompt-unavailable'))
      }
    })
  })
}
