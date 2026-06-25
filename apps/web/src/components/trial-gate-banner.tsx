import { requestCallAction } from "@/app/lessons/actions";
import type { BookingEligibilityDto } from "@gojo/shared";

/**
 * Renders nothing once the student has an active/trialing subscription —
 * the booking calendar just works at that point. Otherwise explains exactly
 * where they are in the trial funnel: request a call → wait → free lesson →
 * pick a plan.
 */
export function TrialGateBanner({ eligibility }: { eligibility: BookingEligibilityDto }) {
  if (eligibility.canBookFreely) {
    return null;
  }

  if (eligibility.trialAvailable) {
    return (
      <div className="mt-6 rounded-lg border-2 border-gojo-ink bg-gojo-orange-soft px-5 py-4 text-sm font-bold text-gojo-ink">
        🎉 Звонок прошёл — забронируй свой бесплатный урок из списка ниже. Он у тебя один, выбирай с
        умом.
      </div>
    );
  }

  if (eligibility.trialUsed) {
    return (
      <div className="mt-6 rounded-lg border-2 border-gojo-ink bg-gojo-surface px-5 py-4 text-sm">
        <p className="font-bold">Бесплатный урок уже использован.</p>
        <p className="mt-1 text-gojo-ink-muted">
          Чтобы бронировать дальше — выбери тариф и оформи подписку. Пока это делаем вручную: напиши
          на{" "}
          <a href="mailto:ruslan@gojolearn.ru" className="text-gojo-orange hover:underline">
            ruslan@gojolearn.ru
          </a>
          .
        </p>
      </div>
    );
  }

  const status = eligibility.callRequest?.status;

  if (status === "pending") {
    return (
      <div className="mt-6 rounded-lg border-2 border-gojo-ink bg-gojo-surface px-5 py-4 text-sm font-bold">
        Заявка на звонок отправлена — мы свяжемся в течение 24 часов, чтобы назначить твой
        бесплатный урок.
      </div>
    );
  }

  if (status === "scheduled") {
    const when = eligibility.callRequest?.scheduledAt
      ? new Intl.DateTimeFormat("ru-RU", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(eligibility.callRequest.scheduledAt))
      : null;
    return (
      <div className="mt-6 rounded-lg border-2 border-gojo-ink bg-gojo-surface px-5 py-4 text-sm font-bold">
        Звонок назначен{when ? ` на ${when}` : ""}. После него откроется бронь бесплатного урока.
      </div>
    );
  }

  // No call request yet (or it was cancelled) — invite them to request one.
  return (
    <div className="card-pop mt-6 rounded-lg border-2 border-gojo-ink bg-gojo-ink p-5">
      <p className="font-serif text-[18px] font-bold text-white">Сначала — короткий звонок</p>
      <p className="mt-1 text-sm text-white/65">
        Чтобы подобрать тебе правильный формат и уровень, перед бесплатным уроком мы созваниваемся
        5–10 минут. После звонка бронь откроется сама.
      </p>
      <form action={requestCallAction} className="mt-4">
        <button
          type="submit"
          className="btn-pop rounded-md border-2 border-white bg-gojo-orange px-5 py-2.5 text-sm font-bold text-white"
        >
          Запросить звонок →
        </button>
      </form>
    </div>
  );
}
