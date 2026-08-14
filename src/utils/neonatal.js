import { format, formatDistanceToNow } from "date-fns";
import { jsPDF } from "jspdf";

export const DEFAULT_FEEDING_INTERVAL_HOURS = 8;
export const feedingIntervalHours = (value) => {
  const candidate = typeof value === "object" ? value?.feeding_interval_hours : value;
  const numeric = Number(candidate);
  return Number.isFinite(numeric) && numeric >= 0.5 && numeric <= 24 ? numeric : DEFAULT_FEEDING_INTERVAL_HOURS;
};
export const feedingsPerDay = (intervalHours) => 24 / feedingIntervalHours(intervalHours);

export const toLocalInput = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromLocalInput = (str) => (str ? new Date(str).toISOString() : "");

export const nowLocalInput = () => toLocalInput(new Date());

export const formatDateTime = (iso) => (iso ? format(new Date(iso), "MMM d, h:mm a") : "—");

export const formatTime = (iso) => (iso ? format(new Date(iso), "h:mm a") : "—");

export const timeAgo = (iso) => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : "—");

export const isToday = (iso) => iso && format(new Date(iso), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

export const feedingStatus = (lastFeedingIso, intervalHours = DEFAULT_FEEDING_INTERVAL_HOURS) => {
  if (!lastFeedingIso) return { status: "unknown", label: "No feedings yet", tone: "muted", diffMin: null, due: null };
  const now = new Date();
  const due = new Date(new Date(lastFeedingIso).getTime() + feedingIntervalHours(intervalHours) * 60 * 60 * 1000);
  const diffMin = (due - now) / 60000;
  if (diffMin < -15) return { status: "overdue", label: "Overdue", tone: "red", diffMin, due };
  if (diffMin <= 5) return { status: "feed_now", label: "Feed Now", tone: "orange", diffMin, due };
  if (diffMin <= 30) return { status: "due_soon", label: "Due Soon", tone: "yellow", diffMin, due };
  return { status: "ok", label: "OK", tone: "green", diffMin, due };
};

export const formatCountdown = (ms) => {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  if (ms < 0) return `Overdue ${h > 0 ? h + "h " : ""}${m}m`;
  return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
};

export const weightTrend = (weights) => {
  const sorted = [...weights].sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
  if (sorted.length === 0) return { hasData: false, latest: null, isFirst: false, change: null, avgDaily: null };
  const latest = sorted[0].weight_g;
  if (sorted.length === 1) return { hasData: true, latest, isFirst: true, change: null, avgDaily: null };
  const prev = sorted[1].weight_g;
  const change = latest - prev;
  const oldest = sorted[sorted.length - 1];
  const spanDays = (new Date(sorted[0].date_time) - new Date(oldest.date_time)) / (24 * 60 * 60 * 1000);
  let avgDaily = null;
  if (spanDays >= 1) avgDaily = (latest - oldest.weight_g) / spanDays;
  return { hasData: true, latest, isFirst: false, change, avgDaily };
};

export const feedingSummary = (feedings) => {
  const today = feedings.filter((f) => isToday(f.date_time));
  const kmrFeedings = today.filter((f) => f.amount_ml > 0);
  const totalKmr = kmrFeedings.reduce((s, f) => s + (f.amount_ml || 0), 0);
  const count = today.length;
  const avgMl = kmrFeedings.length ? totalKmr / kmrFeedings.length : 0;
  const times = today.map((f) => new Date(f.date_time).getTime()).sort((a, b) => a - b);
  let longest = null;
  let shortest = null;
  if (times.length >= 2) {
    const diffs = [];
    for (let i = 1; i < times.length; i++) diffs.push((times[i] - times[i - 1]) / (60 * 60 * 1000));
    longest = Math.max(...diffs);
    shortest = Math.min(...diffs);
  }
  return { totalKmr, count, avgMl, longest, shortest };
};

export const formatDurationShort = (ms) => {
  const totalMin = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
};

// Combined, glanceable kitten care status for the status card.
// color: green | yellow | red | gray
export const kittenStatus = ({ lastFeeding, trend, now = Date.now(), feedingInterval = DEFAULT_FEEDING_INTERVAL_HOURS }) => {
  const hasFeed = !!lastFeeding && !!lastFeeding.date_time;
  let feedDueIn = null;
  let feedOverdue = false;
  let feedDueSoon = false;
  let feedOk = false;
  if (hasFeed) {
    const due = new Date(lastFeeding.date_time).getTime() + feedingIntervalHours(feedingInterval) * 60 * 60 * 1000;
    feedDueIn = due - now;
    feedOverdue = feedDueIn < 0;
    feedDueSoon = !feedOverdue && feedDueIn <= 15 * 60 * 1000;
    feedOk = !feedOverdue && feedDueIn > 15 * 60 * 1000;
  }

  const hasWeights = trend.hasData;
  const weightFirst = trend.isFirst;
  const weightChange = hasWeights && !weightFirst ? trend.change : null;
  const weightDown = weightChange != null && weightChange < 0;
  const weightUnchanged = weightChange != null && weightChange === 0;
  const weightUp = weightChange != null && weightChange > 0;
  const noData = !hasFeed || !hasWeights;

  let color = "gray";
  if (feedOverdue || weightDown) color = "red";
  else if (feedDueSoon || weightUnchanged) color = "yellow";
  else if (noData || weightFirst) color = "gray";
  else if (feedOk && weightUp) color = "green";

  return {
    color, hasFeed, feedOverdue, feedDueIn, feedDueSoon, feedOk,
    hasWeights, weightFirst, weightChange, weightDown, weightUnchanged, weightUp, noData,
  };
};

// One concise summary line for the status card.
export const kittenStatusLine = (status, { lastFeeding }) => {
  const lastFed = lastFeeding ? timeAgo(lastFeeding.date_time) : null;
  const weightPart = () => {
    if (status.weightDown) return `Weight down ${Math.abs(status.weightChange).toFixed(0)} g`;
    if (status.weightUnchanged) return "Weight unchanged";
    if (status.weightUp) return "Weight stable";
    return "Building weight baseline";
  };

  if (status.color === "red") {
    if (status.feedOverdue) {
      const overdueMin = Math.round(Math.abs(status.feedDueIn) / 60000);
      return `Feeding overdue by ${overdueMin} min • ${status.weightDown ? weightPart() : "Weight stable"}`;
    }
    return `Last fed ${lastFed} • ${weightPart()}`;
  }
  if (status.color === "yellow") {
    if (status.feedDueSoon) {
      const dueMin = Math.round(status.feedDueIn / 60000);
      return `Feed due in ${dueMin} min • ${status.weightUnchanged ? "Weight unchanged" : "Weight stable"}`;
    }
    return `Last fed ${lastFed} • Weight unchanged`;
  }
  if (status.color === "green") {
    const parts = [`Last fed ${lastFed}`, "Weight stable"];
    if (status.feedOk && status.feedDueIn > 0) parts.push(`Next feeding in ${formatDurationShort(status.feedDueIn)}`);
    return parts.join(" • ");
  }
  return "First day of care • Building baseline data";
};

export const buildReport = (kitten, feedings, weights, eliminations, motherLogs) => {
  const sortDesc = (a, b) => new Date(b.date_time) - new Date(a.date_time);
  const f = [...feedings].sort(sortDesc);
  const w = [...weights].sort(sortDesc);
  const e = [...eliminations].sort(sortDesc);
  const m = [...motherLogs].sort(sortDesc);
  const lines = [];
  lines.push("NEONATAL FOSTER CARE REPORT");
  lines.push("============================");
  lines.push(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`);
  if (kitten) {
    lines.push("");
    lines.push("KITTEN PROFILE");
    lines.push(`Name / ID: ${kitten.name}`);
    lines.push(`Estimated birth: ${kitten.birth_date ? formatDateTime(kitten.birth_date) : "—"}`);
    lines.push(`Current weight: ${kitten.current_weight_g != null ? kitten.current_weight_g + " g" : "—"}`);
    lines.push(`Mother present: ${kitten.mother_present ? "Yes" : "No"}`);
    lines.push(`Supplementing KMR: ${kitten.supplementing_kmr ? "Yes" : "No"}`);
    lines.push(`Feeding schedule: Every ${feedingIntervalHours(kitten)} hours`);
    if (kitten.notes) lines.push(`Notes: ${kitten.notes}`);
  }
  lines.push("");
  lines.push(`WEIGHT LOG (${w.length})`);
  w.forEach((x) => lines.push(`- ${formatDateTime(x.date_time)}: ${x.weight_g} g${x.notes ? " — " + x.notes : ""}`));
  lines.push("");
  lines.push(`FEEDING LOG (${f.length})`);
  f.forEach((x) => lines.push(`- ${formatDateTime(x.date_time)} | ${x.method} | ${x.amount_ml || 0} mL | nursing: ${x.nursing_observed} | suck: ${x.suck_strength}${x.notes ? " | " + x.notes : ""}`));
  lines.push("");
  lines.push(`ELIMINATION LOG (${e.length})`);
  e.forEach((x) => lines.push(`- ${formatDateTime(x.date_time)} | pee: ${x.urinated ? "yes" : "no"} | poop: ${x.defecated ? "yes" : "no"} | stimulated: ${x.stimulated_by_human ? "yes" : "no"} | mom: ${x.mom_assisted ? "yes" : "no"}${x.notes ? " | " + x.notes : ""}`));
  lines.push("");
  lines.push(`MOTHER CARE LOG (${m.length})`);
  m.forEach((x) => lines.push(`- ${formatDateTime(x.date_time)} | ate: ${x.ate ? "yes" : "no"} | drank: ${x.drank_water ? "yes" : "no"} | nursing: ${x.nursing_observed}${x.food_notes ? " | food: " + x.food_notes : ""}${x.behavior_notes ? " | behavior: " + x.behavior_notes : ""}`));
  return lines.join("\n");
};

export const generateFosterReportPDF = (kitten, feedings, weights, eliminations, motherLogs) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 42;
  let y = margin;
  const usableW = pageW - margin * 2;
  const truncate = (s, max) => { s = String(s ?? ""); return s.length > max ? s.slice(0, Math.max(1, max - 1)) + "…" : s; };

  const sortDesc = (a, b) => new Date(b.date_time) - new Date(a.date_time);
  const f = [...feedings].sort(sortDesc);
  const w = [...weights].sort(sortDesc);
  const e = [...eliminations].sort(sortDesc);
  const m = [...motherLogs].sort(sortDesc);

  const startWeight = w.length ? w[w.length - 1].weight_g : kitten?.current_weight_g ?? null;
  const currentWeight = w.length ? w[0].weight_g : kitten?.current_weight_g ?? null;
  const totalChange = startWeight != null && currentWeight != null ? currentWeight - startWeight : null;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Neonatal Foster Care Report", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, margin, y);
  y += 22;
  doc.setTextColor(0);

  const sectionTitle = (title) => {
    if (y > pageH - 70) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, margin, y);
    y += 6;
    doc.setDrawColor(210);
    doc.line(margin, y, pageW - margin, y);
    y += 16;
  };

  const kv = (label, value) => {
    if (y > pageH - 40) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value ?? "—"), margin + 140, y);
    y += 15;
  };

  sectionTitle("Kitten Information");
  kv("Name / ID", kitten?.name);
  kv("Estimated DOB", kitten?.birth_date ? format(new Date(kitten.birth_date), "MMM d, yyyy h:mm a") : "—");
  kv("Current Weight", currentWeight != null ? `${currentWeight} g` : "—");
  kv("Starting Weight", startWeight != null ? `${startWeight} g` : "—");
  kv("Total Weight Change", totalChange != null ? `${totalChange >= 0 ? "+" : ""}${totalChange.toFixed(1)} g` : "—");
  kv("Mother Present", kitten ? (kitten.mother_present ? "Yes" : "No") : "—");
  kv("Supplementing KMR", kitten ? (kitten.supplementing_kmr ? "Yes" : "No") : "—");
  kv("Feeding Schedule", kitten ? `Every ${feedingIntervalHours(kitten)} hours` : "—");
  y += 8;

  const drawTable = (headers, rows, colWidths) => {
    const rowH = 14;
    const headerH = 16;
    const charsPerPt = 1 / 4.6;
    const renderHeader = () => {
      doc.setFillColor(235);
      doc.rect(margin, y - 11, usableW, headerH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(40);
      let x = margin + 5;
      headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });
      doc.setTextColor(0);
      y += headerH;
    };
    renderHeader();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    rows.forEach((row, ri) => {
      if (y > pageH - 30) { doc.addPage(); y = margin; renderHeader(); doc.setFont("helvetica", "normal"); doc.setFontSize(8); }
      if (ri % 2 === 1) { doc.setFillColor(248); doc.rect(margin, y - 11, usableW, rowH, "F"); }
      let x = margin + 5;
      row.forEach((cell, i) => {
        const max = Math.floor(colWidths[i] * charsPerPt) - 1;
        doc.text(truncate(cell, max), x, y);
        x += colWidths[i];
      });
      y += rowH;
    });
    y += 12;
  };

  sectionTitle("Weight History");
  if (w.length) drawTable(["Date / Time", "Weight (g)", "Notes"], w.map((x) => [format(new Date(x.date_time), "MMM d, h:mm a"), `${x.weight_g}`, x.notes || ""]), [230, 90, usableW - 320]);
  else { doc.setFontSize(9); doc.text("No weight records.", margin, y); y += 14; }

  sectionTitle("Feeding History");
  if (f.length) drawTable(["Date / Time", "Amount", "Method", "Nursing", "Notes"], f.map((x) => [format(new Date(x.date_time), "MMM d, h:mm a"), `${x.amount_ml || 0} mL`, x.method, x.nursing_observed, x.notes || ""]), [150, 70, 90, 90, usableW - 400]);
  else { doc.setFontSize(9); doc.text("No feeding records.", margin, y); y += 14; }

  sectionTitle("Elimination Log");
  if (e.length) drawTable(["Date / Time", "Urinated", "Defecated", "Notes"], e.map((x) => [format(new Date(x.date_time), "MMM d, h:mm a"), x.urinated ? "Yes" : "No", x.defecated ? "Yes" : "No", x.notes || ""]), [190, 90, 90, usableW - 370]);
  else { doc.setFontSize(9); doc.text("No elimination records.", margin, y); y += 14; }

  sectionTitle("Mother Care");
  if (m.length) drawTable(["Date / Time", "Ate", "Drank", "Nursing", "Notes"], m.map((x) => [format(new Date(x.date_time), "MMM d, h:mm a"), x.ate ? "Yes" : "No", x.drank_water ? "Yes" : "No", x.nursing_observed, `${x.food_notes || ""}${x.behavior_notes ? (x.food_notes ? " | " : "") + x.behavior_notes : ""}`]), [150, 60, 60, 90, usableW - 360]);
  else { doc.setFontSize(9); doc.text("No mother care records.", margin, y); y += 14; }

  sectionTitle("General Notes");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const notesLines = doc.splitTextToSize(kitten?.notes || "No general notes recorded.", usableW);
  doc.text(notesLines, margin, y);

  doc.save(`neonatal-foster-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

// === Multi-kitten support ===

// Per-kitten compact summary for the Primary Neonatal Dashboard.
// Returns status, current weight, weight change, last feeding, next due, etc.
export const kittenSummary = (kitten, allFeedings, allWeights, allEliminations, now = Date.now()) => {
  const feedings = (allFeedings || []).filter((f) => f.kitten_id === kitten.id);
  const weights = (allWeights || []).filter((w) => w.kitten_id === kitten.id);
  const eliminations = (allEliminations || []).filter((e) => e.kitten_id === kitten.id);

  const sortedF = [...feedings].sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
  const sortedW = [...weights].sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

  const lastFeeding = sortedF[0] || null;
  const lastWeight = sortedW[0] || null;
  const prevWeight = sortedW[1] || null;
  const weightToday = lastWeight ? isToday(lastWeight.date_time) : false;
  const weightChange = lastWeight && prevWeight ? lastWeight.weight_g - prevWeight.weight_g : null;
  const fStatus = feedingStatus(lastFeeding?.date_time, kitten.feeding_interval_hours);
  const currentWeight = lastWeight?.weight_g ?? kitten.current_weight_g ?? null;

  // Status priority: overdue > weight_decreased > no_feedings > no_weight_today > due_soon > on_track
  let status = "on_track";
  let statusLabel = "On Track";
  let statusColor = "green";

  if (fStatus.status === "overdue") {
    status = "overdue"; statusLabel = "Overdue"; statusColor = "red";
  } else if (weightChange !== null && weightChange < 0) {
    status = "weight_decreased"; statusLabel = "Weight Decreased"; statusColor = "red";
  } else if (!lastFeeding) {
    status = "needs_attention"; statusLabel = "Needs Attention"; statusColor = "yellow";
  } else if (!weightToday) {
    status = "no_weight_today"; statusLabel = "No Weight Today"; statusColor = "yellow";
  } else if (fStatus.status === "feed_now" || fStatus.status === "due_soon") {
    status = "due_soon"; statusLabel = "Due Soon"; statusColor = "yellow";
  }

  return {
    kitten,
    lastFeeding,
    lastWeight,
    weightToday,
    weightChange,
    currentWeight,
    feedingStatus: fStatus,
    nextFeedingDue: fStatus.due,
    status,
    statusLabel,
    statusColor,
    feedingMethod: lastFeeding?.method || null,
    feedingNursing: lastFeeding?.nursing_observed || null,
    feedingsCount: feedings.length,
    weightsCount: weights.length,
    lastElimination: eliminations[0] || null,
  };
};

// Aggregate dashboard stats across all active kittens.
export const neonatalDashboardStats = (kittens, feedings, weights, eliminations, now = Date.now()) => {
  const activeKittens = (kittens || []).filter((k) => k.active !== false);
  const summaries = activeKittens.map((k) => kittenSummary(k, feedings, weights, eliminations, now));

  return {
    totalActive: activeKittens.length,
    feedingsDueNow: summaries.filter((s) => s.feedingStatus.status === "feed_now").length,
    feedingsDueSoon: summaries.filter((s) => s.feedingStatus.status === "due_soon").length,
    overdue: summaries.filter((s) => s.status === "overdue").length,
    noWeightToday: summaries.filter((s) => s.status === "no_weight_today").length,
    weightGains: summaries.filter((s) => s.weightChange !== null && s.weightChange > 0).length,
    weightLosses: summaries.filter((s) => s.weightChange !== null && s.weightChange < 0).length,
    needsAttention: summaries.filter((s) => s.status === "needs_attention").length,
    summaries,
  };
};

export const formatWeightChange = (change) => {
  if (change === null || change === undefined) return "—";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)} g`;
};

// Group kittens by their group_id, returning ungrouped kittens separately.
export const kittensByGroup = (kittens) => {
  const groups = {};
  const ungrouped = [];
  (kittens || []).forEach((k) => {
    if (k.group_id) {
      if (!groups[k.group_id]) groups[k.group_id] = [];
      groups[k.group_id].push(k);
    } else {
      ungrouped.push(k);
    }
  });
  return { groups, ungrouped };
};

// Group type display labels.
export const GROUP_TYPE_LABELS = {
  litter: "Litter",
  intake_group: "Intake Group",
  nursing_mother_group: "Nursing Mother Group",
  unrelated: "Unrelated Kittens",
};