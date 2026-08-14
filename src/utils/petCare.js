import { addDays, addMonths, addYears, differenceInCalendarDays, format } from "date-fns";
import { getMedicationStatus } from "@/lib/dateUtils";

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
  if (!v.due_date) return { color: "muted", label: "No Due Date", daysRemaining: null };
  const due = toLocal(v.due_date);
  if (!due) return { color: "muted", label: "No Due Date", daysRemaining: null };
  const daysRemaining = differenceInCalendarDays(due, new Date());
  if (daysRemaining < 0) return { color: "red", label: "Overdue", daysRemaining };
  if (daysRemaining === 0) return { color: "yellow", label: "Due Today", daysRemaining };
  if (daysRemaining <= 30) return { color: "yellow", label: "Due Soon", daysRemaining };
  return { color: "green", label: "Current", daysRemaining };
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
  if (frequency === "as_needed" || frequency === "custom") return ["as_needed"];
  return ["morning"];
};
export const doseSlots = (med) => med.schedule_type === "custom" ? ["as_needed"] : doseSlotsFor(med.frequency);

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
    if (st.daysRemaining == null) return;
    if (st.daysRemaining < 0) out.push({ urgency: 0, label: `${label} overdue` });
    else if (st.daysRemaining === 0) out.push({ urgency: 1, label: `${label} due today` });
    else if (st.daysRemaining === 1) out.push({ urgency: 1, label: `${label} due tomorrow` });
    else if (st.daysRemaining <= 30) out.push({ urgency: 3, label: `${label} due in ${st.daysRemaining} days` });
  });
  medications.forEach((m) => {
    const status = getMedicationStatus(m);
    const manuallyRecorded = m.schedule_type === "custom" || m.frequency === "custom" || m.frequency === "as_needed";
    if (status.active && !manuallyRecorded) {
      out.push({ urgency: 2, label: `${m.medication_name} dose today` });
    }
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

const VISIT_TYPE_LABELS = {
  wellness: "Wellness",
  sick_visit: "Sick Visit",
  vaccination: "Vaccination",
  surgery: "Surgery",
  dental: "Dental",
  emergency: "Emergency",
  follow_up: "Follow-up",
  other: "Veterinary"
};

const vaccineLabel = (v) =>
  v.name === "custom" ? v.custom_name || "Custom vaccine" : v.name?.toUpperCase() || "Vaccine";

export const buildMedicalHistory = (preventatives, vaccinations, vetVisits, medications) => {
  const events = [];
  const visitIds = new Set(vetVisits.map((visit) => visit.id).filter(Boolean));

  preventatives.forEach((p) => {
    if (!p.date_given || (p.source_visit_id && visitIds.has(p.source_visit_id))) return;
    events.push({
      id: `preventative-${p.id || `${p.name}-${p.date_given}`}`,
      date: p.date_given,
      title: `${p.name} administered`,
      detail: frequencyLabel(p.frequency, p.custom_interval_days),
      kind: "preventative"
    });
  });

  vaccinations.forEach((v) => {
    if (!v.date_given || (v.source_visit_id && visitIds.has(v.source_visit_id))) return;
    events.push({
      id: `vaccination-${v.id || `${v.name}-${v.date_given}`}`,
      date: v.date_given,
      title: vaccineLabel(v),
      detail: v.veterinarian || "",
      summary: v.due_date ? `Next due ${fmtDate(v.due_date)}` : "",
      kind: "vaccination"
    });
  });

  vetVisits.forEach((visit) => {
    if (!visit.date) return;
    const visitType = VISIT_TYPE_LABELS[visit.visit_type] || "Veterinary";
    const vaccinationsGiven = (visit.vaccinations_given || []).map(vaccineLabel).filter(Boolean);
    const preventativesGiven = (visit.preventives_administered || []).map((item) => item.name).filter(Boolean);
    const medicationsPrescribed = (visit.medications_prescribed || []).map((item) => item.name).filter(Boolean);
    const careSummary = [
      vaccinationsGiven.length ? `Vaccines: ${vaccinationsGiven.join(", ")}` : "",
      preventativesGiven.length ? `Preventatives: ${preventativesGiven.join(", ")}` : "",
      medicationsPrescribed.length ? `Prescribed: ${medicationsPrescribed.join(", ")}` : "",
      visit.attachments?.length ? `${visit.attachments.length} attachment${visit.attachments.length === 1 ? "" : "s"}` : ""
    ].filter(Boolean).join(" · ");
    const clinicalSummary = visit.diagnosis
      ? `Diagnosis: ${visit.diagnosis}`
      : visit.treatment
        ? `Treatment: ${visit.treatment}`
        : "";

    events.push({
      id: `visit-${visit.id || visit.date}`,
      date: visit.date,
      title: visit.reason || `${visitType} visit`,
      detail: [visitType, visit.clinic, visit.veterinarian].filter(Boolean).join(" · "),
      summary: [clinicalSummary, careSummary].filter(Boolean).join(" · "),
      kind: "visit"
    });
  });

  medications.forEach((m) => {
    if (!m.start_date || (m.source_visit_id && visitIds.has(m.source_visit_id))) return;
    events.push({
      id: `medication-${m.id || `${m.medication_name}-${m.start_date}`}`,
      date: m.start_date,
      title: `${m.medication_name} started`,
      detail: m.dosage_instructions || frequencyLabel(m.frequency),
      kind: "medication"
    });
  });

  const kindOrder = { visit: 0, vaccination: 1, preventative: 2, medication: 3 };
  return events
    .filter((event) => event.date)
    .sort((a, b) => b.date.localeCompare(a.date) || kindOrder[a.kind] - kindOrder[b.kind]);
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