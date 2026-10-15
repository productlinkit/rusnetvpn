import { z } from 'zod'

/* ==========================================================================
   ENVELOPE

   The API envelope from BRD §12.3, same as
   mobile/rusnetvpn/src/shared/api/envelope.ts. Every response — success or
   failure — has this shape, so unwrapping happens once in client.js rather
   than in each caller.

     Success: { status: true,  msg, data?, meta? }
     Error:   { status: false, error_code, msg, error?[], data? }

   `msg` is always a translation key (`success.auth.login`,
   `error.auth.invalidCredentials`). The page has no i18next, so it renders the
   server's own `msg_localized` — which the backend fills whenever the request
   carried Accept-Language — and falls back to a local table keyed by
   `error_code`. See errors.js.
   ========================================================================== */

export const metaSchema = z.object({
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
  total_pages: z.number(),
})

/* `msg` is the key; `msg_localized` is the backend's own rendering of it for
   the Accept-Language this client sent. Optional, because an error that never
   reached the API (a proxy page) has neither — see resolveFieldMessage. */
export const fieldErrorSchema = z.object({
  field: z.string(),
  msg: z.string(),
  msg_localized: z.string().optional(),
})

export const successEnvelopeSchema = z.object({
  status: z.literal(true),
  msg: z.string(),
  data: z.unknown().optional(),
  meta: metaSchema.optional(),
  msg_localized: z.string().optional(),
})

export const errorEnvelopeSchema = z.object({
  status: z.literal(false),
  error_code: z.string(),
  msg: z.string(),
  error: z.array(fieldErrorSchema).optional(),
  data: z.unknown().optional(),
  msg_localized: z.string().optional(),
})

/** Payload the backend attaches to APP_001 (426). */
export const forceUpdateDataSchema = z.object({
  latest_version: z.string().optional(),
  min_supported_version: z.string().optional(),
  store_url: z.string().optional(),
})

/** Payload attached to ACC_001 (403) — the account is suspended. */
export const suspendedDataSchema = z.object({
  account_id: z.string().optional(),
  support_url: z.string().optional(),
})
