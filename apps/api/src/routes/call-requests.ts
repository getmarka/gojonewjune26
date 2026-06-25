import { callRequests, user as userTable } from "@gojo/db";
import { createCallRequestInput, updateCallRequestInput } from "@gojo/shared";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type AuthContext, requireAuth, requireTeacher } from "../auth/middleware.ts";
import { db } from "../db.ts";
import { toCallRequestDto } from "./mappers.ts";

export const callRequestsRoute = new Hono<AuthContext>();

/**
 * Student asks for the intro call that unlocks their free trial lesson.
 * Idempotent: re-requesting while one is still pending/scheduled just
 * returns the existing row instead of stacking duplicates.
 */
callRequestsRoute.post("/", requireAuth, zValidator("json", createCallRequestInput), async (c) => {
  const u = c.get("user")!;
  const body = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(callRequests)
    .where(eq(callRequests.userId, u.id))
    .orderBy(desc(callRequests.createdAt))
    .limit(1);

  if (existing && (existing.status === "pending" || existing.status === "scheduled")) {
    return c.json(toCallRequestDto(existing));
  }

  const [row] = await db
    .insert(callRequests)
    .values({ userId: u.id, preferredContact: body.preferredContact, notes: body.notes })
    .returning();
  if (!row) throw new HTTPException(500, { message: "failed to create call request" });
  return c.json(toCallRequestDto(row), 201);
});

callRequestsRoute.get("/me", requireAuth, async (c) => {
  const u = c.get("user")!;
  const [row] = await db
    .select()
    .from(callRequests)
    .where(eq(callRequests.userId, u.id))
    .orderBy(desc(callRequests.createdAt))
    .limit(1);
  return c.json(row ? toCallRequestDto(row) : null);
});

/** Ops queue — pending/scheduled requests waiting on a human to call the student. */
callRequestsRoute.get("/", requireAuth, requireTeacher, async (c) => {
  const rows = await db
    .select({ request: callRequests, nickname: userTable.nickname, email: userTable.email })
    .from(callRequests)
    .innerJoin(userTable, eq(userTable.id, callRequests.userId))
    .orderBy(desc(callRequests.requestedAt))
    .limit(100);

  return c.json(
    rows.map((r) => toCallRequestDto(r.request, { nickname: r.nickname, email: r.email })),
  );
});

callRequestsRoute.patch(
  "/:id",
  requireAuth,
  requireTeacher,
  zValidator("json", updateCallRequestInput),
  async (c) => {
    const u = c.get("user")!;
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const [existing] = await db.select().from(callRequests).where(eq(callRequests.id, id)).limit(1);
    if (!existing) throw new HTTPException(404, { message: "call request not found" });

    const patch: Partial<typeof callRequests.$inferInsert> = {
      status: body.status,
      updatedAt: new Date(),
    };
    if (body.scheduledAt !== undefined) patch.scheduledAt = new Date(body.scheduledAt);
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.status === "completed" || body.status === "cancelled") {
      patch.resolvedAt = new Date();
      patch.resolvedBy = u.id;
    }

    const [row] = await db
      .update(callRequests)
      .set(patch)
      .where(eq(callRequests.id, id))
      .returning();
    if (!row) throw new HTTPException(500, { message: "update failed" });
    return c.json(toCallRequestDto(row));
  },
);
