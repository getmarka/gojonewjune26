import { z } from "zod";

export const callRequestStatusSchema = z.enum(["pending", "scheduled", "completed", "cancelled"]);
export type CallRequestStatus = z.infer<typeof callRequestStatusSchema>;

export const callRequestDto = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  studentNickname: z.string().nullable().optional(),
  studentEmail: z.string().nullable().optional(),
  status: callRequestStatusSchema,
  preferredContact: z.string().nullable(),
  notes: z.string().nullable(),
  requestedAt: z.string(),
  scheduledAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
});
export type CallRequestDto = z.infer<typeof callRequestDto>;

export const createCallRequestInput = z.object({
  preferredContact: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateCallRequestInput = z.infer<typeof createCallRequestInput>;

export const updateCallRequestInput = z.object({
  status: callRequestStatusSchema,
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateCallRequestInput = z.infer<typeof updateCallRequestInput>;

export const subscriptionPlanSchema = z.enum(["individual", "group", "correspondence"]);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const subscriptionStatusSchema = z.enum(["trialing", "active", "past_due", "canceled"]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionDto = z.object({
  id: z.string().uuid(),
  plan: subscriptionPlanSchema,
  status: subscriptionStatusSchema,
  currentPeriodEnd: z.string().nullable(),
});
export type SubscriptionDto = z.infer<typeof subscriptionDto>;

/**
 * What the *current* viewer is allowed to do right now, computed server-side.
 * Drives the CTA shown on /lessons and the dashboard ("Запросить звонок" vs
 * "Выбери тариф" vs the normal booking calendar).
 */
export const bookingEligibilityDto = z.object({
  canBookFreely: z.boolean(),
  trialAvailable: z.boolean(),
  trialUsed: z.boolean(),
  callRequest: callRequestDto.nullable(),
  activeSubscription: subscriptionDto.nullable(),
});
export type BookingEligibilityDto = z.infer<typeof bookingEligibilityDto>;
