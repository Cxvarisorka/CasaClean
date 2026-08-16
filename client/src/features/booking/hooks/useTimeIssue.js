import { useCallback, useMemo } from "react";
import { useTranslation } from "@/i18n";
import { formatDuration } from "../utils/duration";
import { describeTimeIssue } from "../utils/timeWindow";

/*
 * useTimeIssue
 * ------------
 * The chosen start time checked against the chosen SERVICE's advance-notice
 * rule, the chosen CITY's working hours and the booking's duration, already
 * worded for the customer. `utils/timeWindow.js` decides *whether* it's
 * bookable; this adds the locale and the formatted duration ("a 1 h 25 min
 * visit…").
 *
 * Shared, because two steps need the same verdict: ScheduleStep, where it blocks
 * Continue, and ReviewStep, where it catches the one path around that guard — a
 * customer who goes back, lengthens the booking, then jumps forward through the
 * progress bar without passing the schedule step again.
 *
 * `describe()` re-runs the check on demand rather than reading the memo, for the
 * two rules that decay with the clock: "not already past today" and the 48-hour
 * notice, both of which can turn a slot that was valid when typed into one that
 * isn't by the time Continue is pressed.
 */
export function useTimeIssue({ city, service, durationMinutes, date, time }) {
  const { t } = useTranslation();

  const describe = useCallback(() => {
    const issue = describeTimeIssue({ city, service, durationMinutes, date, time });
    if (!issue) return { issue: null, message: null };
    return {
      issue,
      message: t(`booking.schedule.timeIssue.${issue.code}`, {
        ...issue.params,
        duration: formatDuration(t, durationMinutes),
        // The remaining-time messages read as "2 h", not "120 minutes".
        remainingDuration: formatDuration(t, issue.params?.remaining ?? 0),
      }),
    };
  }, [city, service, durationMinutes, date, time, t]);

  const current = useMemo(() => describe(), [describe]);

  return { ...current, describe };
}

export default useTimeIssue;
