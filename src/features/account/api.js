import { z } from 'zod'
import { api, request } from '../../shared/api/client'
import { planSchema } from '../billing/api'

/* ==========================================================================
   ACCOUNT ENDPOINTS

   Everything the My Account page reads or writes. Shapes match
   backend/internal/modules/user/dto.go and .../billing/dto.go.

   Money is a **string** on the wire (`decimal.Decimal`). It stays a string all
   the way to the screen — parsing it to a float to render it is how "47.99"
   becomes "47.989999999999995", and no display needs the arithmetic.
   ========================================================================== */

const subscriptionSchema = z.object({
  status: z.string(), // free | active | past_due | cancelled | expired
  plan: planSchema.nullable(),
  pending_plan: planSchema.nullable(),
  started_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  auto_renew: z.boolean(),
  days_remaining: z.number(),
  max_devices: z.number(),
  is_premium: z.boolean(),
  /* VPN minutes per day, or -1 for no cap. The page used to claim
     "1 GB / day", a limit this product has never had. */
  daily_minutes: z.number().default(0),
  benefits: z.array(z.string()).default([]),
})

const transactionSchema = z.object({
  id: z.string(),
  order_no: z.string(),
  date: z.string(),
  plan_name_key: z.string(),
  plan_name: z.string().default(''),
  amount: z.string(),
  currency: z.string(),
  status: z.string(),
  payment_method: z.string().nullable(),
  invoice_no: z.string().nullable(),
})

const deviceListSchema = z.object({
  max_devices: z.number(),
  used: z.number(),
  devices: z
    .array(
      z.object({
        id: z.string(),
        model: z.string(),
        platform: z.string(),
        os_version: z.string(),
        app_version: z.string(),
        last_active_at: z.string(),
        is_current: z.boolean(),
      }),
    )
    .default([]),
})

const settingsSchema = z.object({
  kill_switch: z.boolean(),
  auto_connect: z.boolean(),
  split_tunneling_enabled: z.boolean(),
  preferred_protocol_code: z.string().nullable(),
  notifications: z.record(z.string(), z.unknown()).default({}),
  updated_at: z.string(),
})

const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  is_read: z.boolean(),
  sent_at: z.string(),
})

const cancelReasonSchema = z.object({
  id: z.string(),
  reason_key: z.string(),
  reason: z.string().default(''),
  sort_order: z.number(),
})

const invoiceSchema = z.object({
  invoice_no: z.string(),
  invoice_url: z.string(),
  generated_at: z.string(),
})

/* A list endpoint answers with `data: []` and the page count in `meta`. The
   account page never paginates — it shows the first page of receipts and of
   notifications — so the items are all that is returned here. */
const listOf = (item) => z.array(item).default([])

export const getSubscription = () => api.get('/subscriptions/current', subscriptionSchema)
export const getTransactions = () => api.get('/transactions', listOf(transactionSchema))
export const getDevices = () => api.get('/me/devices', deviceListSchema)
export const getSettings = () => api.get('/me/settings', settingsSchema)
export const getNotifications = () => api.get('/notifications', listOf(notificationSchema))
export const getCancelReasons = () => api.get('/cancel-reasons', listOf(cancelReasonSchema))

export const getInvoice = (id) => api.get(`/transactions/${id}/invoice`, invoiceSchema)

export const removeDevice = (id) => request(`/me/devices/${id}`, { method: 'DELETE' })

/**
 * Settings are a partial update: fields left out keep their stored value, so
 * one switch can be saved without sending the other four back.
 */
export const saveNotificationPrefs = (notifications) =>
  request('/me/settings', { method: 'PUT', body: { notifications } }, settingsSchema)

export const changePassword = ({ oldPassword, newPassword }) =>
  request('/me/password', {
    method: 'PATCH',
    body: { old_password: oldPassword, new_password: newPassword },
  })

/**
 * Turning auto-renewal off IS cancelling: the backend has no separate switch.
 * The subscription stays live until `expires_at`, which is what the copy on
 * the panel promises.
 */
export const cancelSubscription = ({ reasonId, reasonText }) =>
  api.postVoid('/subscriptions/cancel', { reason_id: reasonId, reason_text: reasonText || '' })

export const reactivateSubscription = () => api.postVoid('/subscriptions/reactivate', {})

/** Soft delete (BR-12), confirmed with the account password rather than an OTP. */
export const deleteAccount = (password) => request('/me', { method: 'DELETE', body: { password } })
