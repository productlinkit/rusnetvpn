import { z } from 'zod'
import { api } from './client'

/* ==========================================================================
   THE LANGUAGE / CURRENCY CATALOGUE

   GET /locales — public, unauthenticated, because the language picker is on
   the marketing page and nobody has signed in to it.

   Two things come back and they answer different questions:

     · `languages` — what to offer in the picker.
     · `currencies` — how to PRINT an amount: the symbol, which side it goes
       on, and how many decimal places to show. Rupiah is written Rp 149.000,
       never Rp 149.000,00, and that is a property of the currency rather than
       of any one price.

   Which currency applies is not decided here: the server resolves it from
   Accept-Language and stamps it on every amount it sends, so a client renders
   `plan.currency` rather than guessing from the picker.
   ========================================================================== */

const currencySchema = z.object({
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  symbol_first: z.boolean(),
})

const languageSchema = z.object({
  code: z.string(),
  name: z.string(),
  native_name: z.string(),
  currency_code: z.string(),
  is_default: z.boolean(),
})

const catalogueSchema = z.object({
  languages: z.array(languageSchema).default([]),
  currencies: z.array(currencySchema).default([]),
  default_language: z.string().default('en'),
  resolved_language: z.string().default('en'),
  resolved_currency: z.string().default('USD'),
})

export const getLocales = () => api.get('/locales', catalogueSchema)
