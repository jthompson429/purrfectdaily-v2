import { format, parseISO, differenceInWeeks, startOfDay } from "date-fns";

export const TODAY = format(new Date(), "yyyy-MM-dd");

export function getWeekNumber(startDate, checkDate = new Date()) {
  if (!startDate) return null;
  const start = parseISO(startDate);
  const check = startOfDay(checkDate);
  const weeks = differenceInWeeks(check, start);
  return weeks + 1; // 1-indexed
}

// For custom_date_ranges schedule_type, schedule_rule stores JSON like:
// { active: [["2026-05-27","2026-06-03"], ...], off: [["2026-06-04","2026-06-09"], ...] }
function parseCustomDateRanges(scheduleRule) {
  try {
    return typeof scheduleRule === "string" ? JSON.parse(scheduleRule) : scheduleRule;
  } catch {
    return null;
  }
}

function isInRanges(todayStr, ranges) {
  if (!ranges) return false;
  return ranges.some(([start, end]) => todayStr >= start && todayStr <= end);
}

// Find the next active range start date after today
function nextActiveDate(todayStr, activeRanges) {
  if (!activeRanges) return null;
  const future = activeRanges
    .filter(([start]) => start > todayStr)
    .sort((a, b) => (a[0] > b[0] ? 1 : -1));
  return future.length > 0 ? future[0][0] : null;
}

export function getMedicationStatus(med) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  if (med.archived) return { active: false, reason: "completed" };

  // Custom date ranges (e.g. Itrafungol on/off cycles)
  if (med.schedule_type === "custom_date_ranges" && med.schedule_rule) {
    const ranges = parseCustomDateRanges(med.schedule_rule);
    if (ranges) {
      const inActive = isInRanges(todayStr, ranges.active);
      const inOff = isInRanges(todayStr, ranges.off);

      if (inActive) return { active: true, reason: "active_week" };

      if (inOff) {
        const next = nextActiveDate(todayStr, ranges.active);
        const offWarning = next
          ? `DO NOT GIVE today. This is an off-cycle day in the treatment cycle. Give only on active treatment days shown in the medication schedule. Next active dose date: ${next}.`
          : "DO NOT GIVE today. This is an off-cycle day in the treatment cycle. Give only on active treatment days shown in the medication schedule.";
        return { active: false, reason: "off_week", offWarning };
      }

      // Outside all ranges entirely
      const allActive = ranges.active || [];
      const allDates = allActive.map(r => r[0]);
      const started = allDates.some(d => d <= todayStr);
      if (!started) return { active: false, reason: "not_started" };
      return { active: false, reason: "completed" };
    }
  }

  if (med.start_date && todayStr < med.start_date) {
    return { active: false, reason: "not_started" };
  }
  if (med.end_date && todayStr > med.end_date) {
    return { active: false, reason: "completed" };
  }

  if (med.schedule_type === "specific_days") {
    const scheduleDays = Array.isArray(med.schedule_days) ? med.schedule_days : [];
    const dueToday = scheduleDays.includes(new Date().getDay());
    return {
      active: dueToday,
      reason: dueToday ? "scheduled_day" : "not_scheduled",
    };
  }

  if (med.schedule_type === "alternate_weeks" && med.start_date && med.active_week_pattern) {
    const weekNum = getWeekNumber(med.start_date, new Date());
    const activeWeeks = med.active_week_pattern.split(",").map(w => parseInt(w.trim()));
    const isActive = activeWeeks.includes(weekNum);
    const next = !isActive ? (() => {
      // Find next active week's Monday
      return null; // fallback — custom ranges preferred
    })() : null;
    return {
      active: isActive,
      weekNum,
      reason: isActive ? "active_week" : "off_week",
      offWarning: "DO NOT GIVE today. This is an off-cycle day in the treatment cycle. Give only on active treatment days shown in the medication schedule.",
    };
  }

  // Human-defined and PRN schedules remain available in Pet Profiles for
  // recording, but do not create automatic required work on Today.
  if (med.schedule_type === "custom" || med.frequency === "custom" || med.frequency === "as_needed") {
    return { active: false, reason: "manual_schedule" };
  }

  return { active: true, reason: "active" };
}

export function formatTime(str) {
  if (!str) return "";
  try {
    return new Date(str).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return str;
  }
}