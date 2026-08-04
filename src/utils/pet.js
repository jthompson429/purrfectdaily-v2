import { format, differenceInCalendarYears, differenceInCalendarMonths, differenceInCalendarDays } from "date-fns";

// Date-only strings ("YYYY-MM-DD") are UTC midnight when parsed by new Date(),
// which shifts the displayed day in local time. Parse them as local dates instead.
const parseDateLocal = (iso) => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

export const formatBirthDate = (iso) => {
  if (!iso) return "";
  const d = parseDateLocal(iso);
  if (!d) return "";
  return format(d, "MMM d, yyyy");
};

// Calculates a readable age from a birth date (full precision internally).
export const formatAge = (iso) => {
  if (!iso) return "";
  const birth = parseDateLocal(iso);
  if (!birth) return "";
  const now = new Date();
  if (birth > now) return "";

  const years = differenceInCalendarYears(now, birth);
  if (years >= 1) {
    const months = differenceInCalendarMonths(now, birth) % 12;
    if (months > 0) return `${years} yr${years > 1 ? "s" : ""} ${months} mo`;
    return `${years} yr${years > 1 ? "s" : ""}`;
  }

  const months = differenceInCalendarMonths(now, birth);
  if (months >= 1) return `${months} mo${months > 1 ? "s" : ""}`;

  const days = differenceInCalendarDays(now, birth);
  return `${days} day${days !== 1 ? "s" : ""}`;
};