import { gates } from './gates'

/* ==========================================================================
   FIELD MESSAGES

   Where the words under a rejected input come from.

   The backend answers every request with both halves of each message: the
   translation key and its rendering for the Accept-Language this client sent
   (response.FieldError). So the first and normal source is the server:

       {"field":"password", "msg":"error.validation.passwordWeak",
        "msg_localized":"Kata sandi harus terdiri dari minimal 8 karakter…"}

   That is the whole point of sending the language up: one catalogue, in the
   backend, in every language it supports — not one per client, drifting.

   The table below is the offline fallback, for the case where the server's
   sentence never arrived: a proxy error page, a dropped connection, or an old
   backend that predates per-field localization. It is keyed by language
   because the page has a language picker, and an Indonesian visitor reading an
   Indonesian toast above English field errors was the exact bug this replaced.

   Key convention, stated outright by `keyFor` in
   backend/internal/pkg/validatorx/validatorx.go:

       error.validation.<field><Rule>

   "falling back to a generic per-rule key when the field is unknown to the
   locale files (the i18n bundle resolves the fallback, not this function)."

   So resolving is two steps here as well, and the second is not optional: the
   backend emits keys it does not itself spell out. `name` failing `min=2`
   produces `error.validation.nameTooShort`, which is in no locale file — only
   the generic `error.validation.tooShort` is.
   ========================================================================== */

/* Copied from the backend locale files (internal/pkg/i18n/locales) so the
   wording matches when the fallback does have to be used.

   `confirmMismatch` and `samePassword` are the two entries with no server
   counterpart. The first cannot have one: no request carries a confirm field,
   so "the two password boxes differ" is a question only the form can ask. The
   second is a rule the API simply does not enforce. They live here so those
   answers reach the visitor in the same language as every other field
   message. */
const CATALOGUE = {
  en: {
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
    confirmMismatch: 'Passwords do not match.',
    samePassword: 'Pick something different from your current password.',
  },
  id: {
    required: 'Kolom ini wajib diisi.',
    invalid: 'Nilai ini tidak valid.',
    tooShort: 'Nilai ini terlalu pendek.',
    tooLong: 'Nilai ini terlalu panjang.',
    tooSmall: 'Nilai ini terlalu kecil.',
    tooLarge: 'Nilai ini terlalu besar.',
    mismatch: 'Nilai ini tidak cocok.',
    length: 'Panjang nilai ini salah.',
    emailRequired: 'Email wajib diisi.',
    emailInvalid: 'Masukkan alamat email yang valid.',
    phoneInvalid: 'Masukkan nomor telepon yang valid.',
    passwordRequired: 'Kata sandi wajib diisi.',
    passwordWeak: 'Kata sandi harus terdiri dari minimal 8 karakter dan mengandung huruf serta angka.',
    nameRequired: 'Nama wajib diisi.',
    otpRequired: 'Kode verifikasi wajib diisi.',
    otpLength: 'Kode verifikasi harus terdiri dari 6 digit.',
    confirmMismatch: 'Kata sandi tidak cocok.',
    samePassword: 'Pilih kata sandi yang berbeda dari kata sandi Anda saat ini.',
  },
}

const DEFAULT_LANG = 'en'
const PREFIX = 'error.validation.'

/** `nameTooShort` -> `tooShort`; `emailInvalid` -> `invalid`. */
function genericRule(leaf) {
  const match = leaf.match(/^[a-z0-9]+((?:[A-Z][a-z0-9]*)+)$/)
  if (!match) return null
  const rule = match[1]
  return rule.charAt(0).toLowerCase() + rule.slice(1)
}

/**
 * Look one key up in the local table, in the picked language and then English.
 *
 * Returns null when the key resolves to nothing at all, which is the signal to
 * fall back to the envelope's own message rather than print a key at someone.
 */
export function resolveFieldMessage(key, lang = gates.currentLanguage()) {
  if (!key || !key.startsWith(PREFIX)) return null

  const leaf = key.slice(PREFIX.length)
  const rule = genericRule(leaf)

  for (const l of [lang, DEFAULT_LANG]) {
    const table = CATALOGUE[l]
    if (!table) continue
    if (table[leaf]) return table[leaf]
    if (rule && table[rule]) return table[rule]
  }
  return null
}

/**
 * The message to print under one input.
 *
 * The server's rendering first — it is authoritative, complete, and already in
 * the right language. The table above only covers for its absence.
 */
export function fieldMessage(entry, lang) {
  return entry?.msg_localized || resolveFieldMessage(entry?.msg, lang)
}
