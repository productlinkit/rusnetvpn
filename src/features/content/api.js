import { z } from 'zod'
import { api } from '../../shared/api/client'

/* ==========================================================================
   PUBLIC CONTENT

   FAQs and the legal documents, from backend/internal/modules/platform.

   Already resolved to the request's language by the server — these live in
   the database as one string per locale, so the page renders `question` and
   `answer` directly. Which language it gets is decided by the Accept-Language
   header the API client sends, i.e. by the picker in the header.
   ========================================================================== */

const faqSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string(),
  answer: z.string(),
  sort_order: z.number(),
})

export const getFaqs = () => api.get('/content/faqs', z.array(faqSchema))

const legalSchema = z.object({
  type: z.string(),
  version: z.string(),
  content: z.string(),
  published_at: z.string(),
})

/** `type` is 'terms' or 'privacy'. */
export const getLegal = (type) => api.get(`/content/legal/${type}`, legalSchema)
