"use server";

import { ApiError, bookLesson, requestIntroCall } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function bookLessonAction(formData: FormData) {
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!lessonId) return;

  try {
    await bookLesson(lessonId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    throw e;
  }
  revalidatePath("/lessons");
  revalidatePath("/");
}

export async function requestCallAction() {
  try {
    await requestIntroCall();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    throw e;
  }
  revalidatePath("/lessons");
  revalidatePath("/");
}

/**
 * Used right after client-side signup on the landing page: the browser
 * already holds the fresh better-auth session cookie from `signUp.email`,
 * so this server action picks it up the same way `getCurrentUser()` does.
 */
export async function requestCallWithDetailsAction(preferredContact?: string, notes?: string) {
  try {
    await requestIntroCall(preferredContact, notes);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return;
    throw e;
  }
  revalidatePath("/lessons");
  revalidatePath("/");
}
