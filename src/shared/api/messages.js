/* ==========================================================================
   FIELD MESSAGES

   The envelope's top-level `msg_localized` is rendered text, but the per-field
   `error[].msg` entries are translation *keys* — the server sends
   `error.validation.passwordWeak`, not a sentence. The mobile app runs those
   through i18next; this page has no catalogue, so it carries the one namespace
   it can actually receive.

   The keys follow a convention `keyFor` in
   backend/internal/pkg/validatorx/validatorx.go states outright:

       error.validation.<field><Rule>

   "falling back to a generic per-rule key when the field is unknown to the
   locale files (the i18n bundle resolves the fallback, not this function)."

   So resolving is two steps, and the second one is not optional: the backend
   emits keys it does not itself translate. `name` failing `min=2` produces
   `error.validation.nameTooShort`, which is in no locale file — only the
   generic `error.validation.tooShort` is. Without the fallback the field would
   show a raw key to the user.

   Only English lives here. A locale the page cannot render still gets a usable
   message from the envelope's `msg_localized` above the form.
   ========================================================================== */

const CATALOGUE = {
  required: 'This field is required.',
  invalid: 'This value is not valid.',
  tooShort: 'This value is too short.',
  tooLong: 'This value is too long.',
  tooSmall: 'This value is too small.',
  tooLarge: 'This value is too large.',
  mismatch: 'This value does not match.',
  length: 'This value has the wrong length.',
  emailRequired: 'Email is required.',
  emailInvalid: 'Enter a valid email address.',
  phoneInvalid: 'Enter a valid phone number.',
  passwordRequired: 'Password is required.',
  passwordWeak: 'Password must be at least 8 characters and include a letter and a number.',
  nameRequired: 'Name is required.',
  otpRequired: 'Verification code is required.',
  otpLength: 'The verification code must be 6 digits.',
}

const PREFIX = 'error.validation.'

/** `nameTooShort` -> `tooShort`; `emailInvalid` -> `invalid`. */
function genericRule(leaf) {
  const match = leaf.match(/^[a-z0-9]+((?:[A-Z][a-z0-9]*)+)$/)
  if (!match) return null
  const rule = match[1]
  return rule.charAt(0).toLowerCase() + rule.slice(1)
}

/**
 * Turn one `error[].msg` key into something a person can read.
 *
 * Returns null when the key resolves to nothing at all, which is the signal to
 * fall back to the envelope's own message rather than print a key.
 */
export function resolveFieldMessage(key) {
  if (!key) return null
  if (!key.startsWith(PREFIX)) return null

  const leaf = key.slice(PREFIX.length)
  if (CATALOGUE[leaf]) return CATALOGUE[leaf]

  const rule = genericRule(leaf)
  return (rule && CATALOGUE[rule]) || null
}
