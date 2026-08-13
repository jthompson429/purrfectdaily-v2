import { addDays, addMonths, addYears, differenceInCalendarDays, format } from "date-fns";

// Date-only strings ("YYYY-MM-DD") parse as UTC midnight; shift to local to avoid off-by-one.
const toLocal = (iso) => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

export const fmtDate = (iso) => {
  const d = toLocal(iso);
  return d ? format(d, "MMM d, yyyy") : "—";
};
export const fmtShort = (iso) => {
  const d = toLocal(iso);
  return d ? format(d, "MMM d") : "—";
};

export const intervalDays = (frequency, customDays) => {
  switch (frequency) {
    case "monthly": return 30;
    case "every_3_months": return 90;
    case "annual": return 365;
    case "custom": return customDays || 30;
    default: return 30;
  }
};

export const nextDueDate = (dateGiven, frequency, customDays) => {
  const d = toLocal(dateGiven);
  if (!d) return null;
  if (frequency === "monthly") return addMonths(d, 1);
  if (frequency === "every_3_months") return addMonths(d, 3);
  if (frequency === "annual") return addYears(d, 1);
  return addDays(d, customDays || 30);
};

export const frequencyLabel = (frequency, customDays) => {
  switch (frequency) {
    case "monthly": return "Monthly";
    case "every_3_months": return "Every 3 months";
    case "annual": return "Annual";
    case "custom": return `Every ${customDays || 30} days`;
    default: return "Monthly";
  }
};

// green = current, yellow = due within 7 days, red = overdue
export const preventativeStatus = (p) => {
  const next = nextDueDate(p.date_given, p.frequency, p.custom_interval_days);
  if (!next) return { color: "muted", pct: 0, daysRemaining: null, next };
  const start = toLocal(p.date_given);
  const now = new Date();
  const total = Math.max(1, differenceInCalendarDays(next, start));
  const elapsed = Math.min(total, Math.max(0, differenceInCalendarDays(now, start)));
  const daysRemaining = differenceInCalendarDays(next, now);
  let color = "green";
  if (daysRemaining < 0) color = "red";
  else if (daysRemaining <= 7) color = "yellow";
  return { color, pct: Math.round((elapsed / total) * 100), daysRemaining, next };
};

export const vaccinationStatus = (v) => {
  if (!v.due_date) return { color: "green", label: "Current" };
  const due = toLocal(v.due_date);
  const days = differenceInCalendarDays(due, new Date());
  if (days < 0) return { color: "red", label: "Overdue" };
  if (days <= 30) return { color: "yellow", label: "Due Soon" };
  return { color: "green", label: "Current" };
};

export const isMedicationActive = (m) => {
  if (m.archived) return false;
  const end = toLocal(m.end_date);
  if (end && end < new Date(new Date().toDateString())) return false;
  const start = toLocal(m.start_date);
  if (start && start > new Date(new Date().toDateString())) return false;
  return true;
};

export const todayStr = () => format(new Date(), "yyyy-MM-dd");

const doseSlotsFor = (frequency) => {
  if (frequency === "once_daily") return ["morning"];
  if (frequency === "twice_daily") return ["morning", "evening"];
  if (frequency === "thrice_daily") return ["morning", "afternoon", "evening"];
  return ["morning"];
};
export const doseSlots = (med) => doseSlotsFor(med.frequency);

// Medication doses use CompletionLog as their canonical administration record.
// Keeping the id deterministic lets Today and Pet Profiles read the same record.
export const medicationTaskId = (medId, slot) => `med_${medId}_${slot}`;

export const buildReminders = (pet, preventatives, vaccinations, medications, weightLogs) => {
  const out = [];
  preventatives.forEach((p) => {
    const st = preventativeStatus(p);
    if (st.daysRemaining == null) return;
    if (st.daysRemaining < 0) out.push({ urgency: 0, label: `${p.name} overdue` });
    else if (st.daysRemaining === 0) out.push({ urgency: 1, label: `${p.name} due today` });
    else if (st.daysRemaining === 1) out.push({ urgency: 1, label: `${p.name} due tomorrow` });
    else if (st.daysRemaining <= 7) out.push({ urgency: 2, label: `${p.name} due in ${st.daysRemaining} days` });
  });
  vaccinations.forEach((v) => {
    const st = vaccinationStatus(v);
    const label = v.name === "custom" ? v.custom_name || "Vaccine" : v.name.toUpperCase();
    if (st.color === "red") out.push({ urgency: 0, label: `${label} overdue` });
    else if (st.color === "yellow") out.push({ urgency: 3, label: `${label} due soon` });
  });
  medications.filter(isMedicationActive).forEach((m) => {
    out.push({ urgency: 2, label: `${m.medication_name} dose today` });
  });
  if (weightLogs && weightLogs.length) {
    const sorted = [...weightLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const last = sorted[0];
    if (last) {
      const days = differenceInCalendarDays(new Date(), toLocal(last.date));
      if (days >= 30) out.push({ urgency: 4, label: `Weigh ${pet?.name || "pet"} — ${days} days since last` });
    }
  }
  out.sort((a, b) => a.urgency - b.urgency);
  return out;
};

export const buildMedicalHistory = (preventatives, vaccinations, vetVisits, medications) => {
  const events = [];
  preventatives.forEach((p) => {
    if (p.date_given) events.push({ date: p.date_given, title: `${p.name} applied`, kind: "preventative" });
  });
  vaccinations.forEach((v) => {
    if (v.date_given) {
      const label = v.name === "custom" ? v.custom_name || "Vaccine" : `${v.name.toUpperCase()} vaccine`;
      events.push({ date: v.date_given, title: label, detail: v.veterinarian, kind: "vaccination" });
    }
  });
  vetVisits.forEach((v) => {
    if (v.date) events.push({ date: v.date, title: v.reason || "Vet visit", detail: v.diagnosis || v.treatment, kind: "visit" });
  });
  medications.forEach((m) => {
    if (m.start_date) events.push({ date: m.start_date, title: `${m.medication_name} started`, kind: "medication" });
  });
  return events.filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const COLOR_MAP = {
  green: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "text-green-400", bar: "bg-green-400" },
  yellow: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "text-yellow-400", bar: "bg-yellow-400" },
  orange: { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", text: "text-orange-400", bar: "bg-orange-400" },
  red: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "text-red-400", bar: "bg-red-400" },
  purple: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "text-purple-400", bar: "bg-purple-400" },
  blue: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "text-blue-400", bar: "bg-blue-400" },
  muted: { bg: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.08)", text: "text-muted-foreground", bar: "bg-muted-foreground/30" },
};