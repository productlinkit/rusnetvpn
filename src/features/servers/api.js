import { z } from 'zod'
import { api } from '../../shared/api/client'

/* ==========================================================================
   SERVER CATALOGUE

   GET /servers/locations — public, so the coverage section renders before
   anyone signs in. The same endpoint the mobile app's server picker uses,
   which is what keeps the two from disagreeing about where the fleet is.

   `has_free` marks a location a free account may connect to; `best_load` is
   the least-loaded server there, as a percentage.
   ========================================================================== */

const locationSchema = z.object({
  id: z.string(),
  country_code: z.string(),
  country_name: z.string(),
  city: z.string().nullable().optional(),
  flag_emoji: z.string().nullable().optional(),
  server_count: z.number(),
  has_free: z.boolean(),
  best_load: z.number(),
})

export const getLocations = () => api.get('/servers/locations', z.array(locationSchema))
