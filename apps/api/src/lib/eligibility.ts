import { bookings, callRequests, subscriptions } from "@gojo/db";
import type { BookingEligibilityDto, CallRequestDto, SubscriptionDto } from "@gojo/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db.ts";

function toCallRequestDtoBare(r: typeof callRequests.$inferSelect): CallRequestDto {
  return {
    id: r.id,
    userId: r.userId,
    status: r.status,
    preferredContact: r.preferredContact ?? null,
    notes: r.notes ?? null,
    requestedAt: r.requestedAt.toISOString(),
    scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  };
}

function toSubscriptionDtoBare(s: typeof subscriptions.$inferSelect): SubscriptionDto {
  return {
    id: s.id,
    plan: s.plan,
    status: s.status,
    currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
  };
}

/**
 * The single source of truth for "can this student book a lesson right now".
 *
 * Rules:
 * - An active/trialing subscription with no expired period → book freely.
 * - Otherwise: exactly one lesson is free, but only after a staff member has
 *   marked the student's call request `completed`. Once they have *any*
 *   booking ever, the trial is consumed.
 */
export async function getBookingEligibility(userId: string): Promise<BookingEligibilityDto> {
  const [activeSub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ["trialing", "active"])),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const now = new Date();
  const subStillValid =
    !!activeSub && (!activeSub.currentPeriodEnd || activeSub.currentPeriodEnd > now);

  if (subStillValid) {
    return {
      canBookFreely: true,
      trialAvailable: false,
      trialUsed: false,
      callRequest: null,
      activeSubscription: toSubscriptionDtoBare(activeSub),
    };
  }

  const [latestCallRequest] = await db
    .select()
    .from(callRequests)
    .where(eq(callRequests.userId, userId))
    .orderBy(desc(callRequests.createdAt))
    .limit(1);

  const [anyBooking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.studentId, userId))
    .limit(1);
  const trialUsed = !!anyBooking;

  const trialAvailable = !trialUsed && latestCallRequest?.status === "completed";

  return {
    canBookFreely: false,
    trialAvailable,
    trialUsed,
    callRequest: latestCallRequest ? toCallRequestDtoBare(latestCallRequest) : null,
    activeSubscription: null,
  };
}

export async function canBookLesson(userId: string): Promise<boolean> {
  const e = await getBookingEligibility(userId);
  return e.canBookFreely || e.trialAvailable;
}
