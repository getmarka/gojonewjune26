import { sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/**
 * A student's call-in request to unlock their single free trial lesson.
 * Self-serve booking of *any* lesson requires either an active subscription
 * or a `completed` call request paired with zero prior bookings (see
 * `lessonsRoute.post("/:id/book")`). The call itself (level/format match,
 * scheduling) happens off-platform — staff just flips the status here.
 */
export const callRequestStatus = pgEnum("call_request_status", [
  "pending",
  "scheduled",
  "completed",
  "cancelled",
]);

export const callRequests = pgTable("call_requests", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: callRequestStatus().notNull().default("pending"),
  preferredContact: text(),
  notes: text(),
  requestedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  scheduledAt: timestamp({ withTimezone: true }),
  resolvedAt: timestamp({ withTimezone: true }),
  resolvedBy: text().references(() => user.id),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const subscriptionPlan = pgEnum("subscription_plan", [
  "individual",
  "group",
  "correspondence",
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid().default(sql`uuidv7()`).primaryKey(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  plan: subscriptionPlan().notNull(),
  status: subscriptionStatus().notNull().default("trialing"),
  provider: text().notNull().default("cloudpayments"),
  providerCustomerId: text(),
  providerSubscriptionId: text(),
  currentPeriodEnd: timestamp({ withTimezone: true }),
  cancelAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export type CallRequest = typeof callRequests.$inferSelect;
export type NewCallRequest = typeof callRequests.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
