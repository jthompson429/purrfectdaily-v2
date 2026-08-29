import { useState, useMemo, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, PawPrint, ChevronDown, ChevronUp, BellRing, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays, format } from "date-fns";

import DailyProgressHeader from "@/components/care/DailyProgressHeader";
import PetSectionHeader from "@/components/care/PetSectionHeader";
import CareTaskCard from "@/components/care/CareTaskCard";
import MedOffWarningCard from "@/components/care/MedOffWarningCard";
import DailySummaryScreen from "@/components/care/DailySummaryScreen";
import TaskFormDialog from "@/components/care/TaskFormDialog";
import AssignmentMigrationDialog from "@/components/care/AssignmentMigrationDialog";
import { getMedicationStatus } from "@/lib/dateUtils";
import { taskAssignmentType, isGroupName, ASSIGNMENT_ICON } from "@/utils/assignment";
import { doseSlots, medicationTaskId, preventativeStatus, vaccinationStatus } from "@/utils/petCare";
import { neonatalDashboardStats } from "@/utils/neonatal";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsBulkUpdate } from "@/lib/workspaceApi";

const TODAY = format(new Date(), "yyyy-MM-dd");

const localDate = (value) => value ? new Date(`${value.slice(0, 10)}T00:00:00`) : null;
const daysFromToday = (value) => {
  const date = localDate(value);
  return date && !Number.isNaN(date.getTime()) ? differenceInCalendarDays(date, new Date()) : null;
};
const dueText = (days) => days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue` : days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`;

function taskSortScore(task) {
  if (task.care_type === "critical_medical") return 0;
  if (task.priority === "critical") return 1;
  if (task.priority === "high") return 2;
  if (task.care_type === "routine") return 3;
  return 4;
}

function medToTasks(med) {
  return doseSlots(med).map((slot) => ({
    id: medicationTaskId(med.id, slot),
    _medId: med.id,
    _doseSlot: slot,
    title: `Give ${med.medication_name}`,
    pet_id: med.pet_id || "",
    assignment_type: "pet",
    category: "medication",
    care_type: med.critical === false ? "routine" : "critical_medical",
    instructions: med.dosage_instructions || "",
    scheduled_time: slot,
    requires_photo: med.requires_photo || false,
    proof_instructions: med.requires_photo ? "Photo proof of medication given." : "",
    warning_text: "",
    priority: med.critical === false ? "normal" : "critical",
    sort_order: -1,
    active: true,
    _isMedTask: true,
  }));
}

function isTaskFullyDone(task, log) {
  if (!log || log.status !== "done") return false;
  if (task.requires_photo && !log.photo_url) return false;
  return true;
}

export default function Dashboard() {
  const { activeWorkspaceId, canWrite } = useWorkspace();
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [collapsedPets, setCollapsedPets] = useState({});
  const [filter, setFilter] = useState("all");
  const [sortMode, setSortMode] = useState("default");
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [migration, setMigration] = useState({ open: false, pending: [] });
  const completionFiredRef = useRef(false);
  const qc = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: pets = [] } = useQuery({
    queryKey: ["pets", activeWorkspaceId],
    queryFn: () => base44.entities.PetProfile.filter({ workspace_id: activeWorkspaceId }, "sort_order"),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["careTasks", activeWorkspaceId],
    queryFn: () => base44.entities.CareTask.filter({ workspace_id: activeWorkspaceId }, "sort_order"),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["completionLogs", TODAY, activeWorkspaceId],
    queryFn: () => base44.entities.CompletionLog.filter({ workspace_id: activeWorkspaceId, completion_date: TODAY }),
  });

  const { data: meds = [] } = useQuery({
    queryKey: ["medications", activeWorkspaceId],
    queryFn: () => base44.entities.MedicationSchedule.filter({ workspace_id: activeWorkspaceId }),
  });

  const { data: preventatives = [] } = useQuery({
    queryKey: ["allPreventatives", activeWorkspaceId],
    queryFn: () => base44.entities.Preventative.filter({ workspace_id: activeWorkspaceId }),
  });

  const { data: vaccinations = [] } = useQuery({
    queryKey: ["allVaccinations", activeWorkspaceId],
    queryFn: () => base44.entities.Vaccination.filter({ workspace_id: activeWorkspaceId }),
  });

  const { data: vetVisits = [] } = useQuery({
    queryKey: ["allVetVisits", activeWorkspaceId],
    queryFn: () => base44.entities.VetVisit.filter({ workspace_id: activeWorkspaceId }),
  });

  const { data: neonatalKittens = [] } = useQuery({
    queryKey: ["neonatalKittens", activeWorkspaceId],
    queryFn: () => base44.entities.NeonatalKitten.filter({ workspace_id: activeWorkspaceId }),
  });
  const { data: neonatalFeedings = [] } = useQuery({
    queryKey: ["neonatalFeedings", activeWorkspaceId],
    queryFn: () => base44.entities.NeonatalFeeding.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300),
  });
  const { data: neonatalWeights = [] } = useQuery({
    queryKey: ["neonatalWeights", activeWorkspaceId],
    queryFn: () => base44.entities.NeonatalWeight.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300),
  });
  const { data: neonatalEliminations = [] } = useQuery({
    queryKey: ["neonatalEliminations", activeWorkspaceId],
    queryFn: () => base44.entities.NeonatalElimination.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300),
  });

  const { data: payConfigs = [] } = useQuery({
    queryKey: ["payConfig", activeWorkspaceId],
    queryFn: () => base44.entities.PayConfig.filter({ workspace_id: activeWorkspaceId }),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["dailyNotifications", TODAY, activeWorkspaceId],
    queryFn: () => base44.entities.DailyNotification.filter({ workspace_id: activeWorkspaceId, notification_date: TODAY }),
  });

  const payConfig = payConfigs[0] || null;

  useEffect(() => {
    if (!tasks.length || !pets.length) return;
    if (localStorage.getItem("careAssignmentMigrated") === "1" && migration.open) return;
    const need = tasks.filter(t => !t.assignment_type);
    if (need.length === 0) return;
    const groupPetIds = pets.filter(p => isGroupName(p.name)).map(p => p.id);
    const autoUpdates = [];
    const pending = [];
    need.forEach(t => {
      if (t.pet_id && groupPetIds.includes(t.pet_id)) pending.push(t);
      else if (t.pet_id) autoUpdates.push({ id: t.id, assignment_type: "pet" });
      else autoUpdates.push({ id: t.id, assignment_type: "general" });
    });
    if (autoUpdates.length) {
      wsBulkUpdate("CareTask", autoUpdates, activeWorkspaceId).then(() => qc.invalidateQueries({ queryKey: ["careTasks"] }));
    }
    if (localStorage.getItem("careAssignmentMigrated") !== "1" && pending.length) {
      setMigration({ open: true, pending });
    }
  }, [tasks, pets]);

  const handleMigrationApply = async (results) => {
    await wsBulkUpdate("CareTask", results, activeWorkspaceId);
    localStorage.setItem("careAssignmentMigrated", "1");
    setMigration({ open: false, pending: [] });
    qc.invalidateQueries({ queryKey: ["careTasks"] });
  };

  const completionQueryKey = ["completionLogs", TODAY, activeWorkspaceId];

  const createLog = useMutation({
    mutationFn: (data) => wsCreate("CompletionLog", data, activeWorkspaceId),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: completionQueryKey });
      const previous = qc.getQueryData(completionQueryKey) || [];
      const optimisticId = `optimistic-${data.task_id}-${Date.now()}`;
      qc.setQueryData(completionQueryKey, [...previous, { ...data, id: optimisticId }]);
      return { previous, optimisticId };
    },
    onError: (_error, _data, context) => qc.setQueryData(completionQueryKey, context?.previous || []),
    onSuccess: (created, data, context) => {
      qc.setQueryData(completionQueryKey, (current = []) => current.map((log) =>
        log.id === context?.optimisticId ? { ...data, ...created, id: created?.id || log.id } : log
      ));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: completionQueryKey }),
  });

  const updateLog = useMutation({
    mutationFn: ({ id, data }) => wsUpdate("CompletionLog", id, data, activeWorkspaceId),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: completionQueryKey });
      const previous = qc.getQueryData(completionQueryKey) || [];
      qc.setQueryData(completionQueryKey, previous.map((log) => log.id === id ? { ...log, ...data } : log));
      return { previous };
    },
    onError: (_error, _variables, context) => qc.setQueryData(completionQueryKey, context?.previous || []),
    onSettled: () => qc.invalidateQueries({ queryKey: completionQueryKey }),
  });

  const createTask = useMutation({
    mutationFn: (data) => wsCreate("CareTask", data, activeWorkspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careTasks"] }),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => wsUpdate("CareTask", id, data, activeWorkspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["careTasks"] }),
  });

  const createNotification = useMutation({
    mutationFn: (data) => wsCreate("DailyNotification", data, activeWorkspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dailyNotifications", TODAY] }),
  });

  const logByTaskId = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      const current = map[log.task_id];
      const shouldReplace = !current
        || (current.status === "not_applicable" && log.status !== "not_applicable")
        || new Date(log.completed_at || 0) > new Date(current.completed_at || 0);
      if (shouldReplace) map[log.task_id] = log;
    });
    return map;
  }, [logs]);

  const activeCareTaskRecords = useMemo(() => {
    const now = new Date();
    const todayWeekday = now.getDay();
    const todayMonthDay = now.getDate();
    return tasks.filter(t => {
      if (t.active === false) return false;
      if (t.start_date && TODAY < t.start_date) return false;
      if (t.end_date && TODAY > t.end_date) return false;
      if (t.schedule_frequency === "weekly" && t.weekday != null && t.weekday !== todayWeekday) return false;
      if (t.schedule_frequency === "monthly" && t.month_day != null && t.month_day !== todayMonthDay) return false;
      return true;
    });
  }, [tasks]);

  const { activeMedTasks, offMedWarnings } = useMemo(() => {
    const activeMedTasks = [];
    const offMedWarnings = [];
    meds.forEach(med => {
      const status = getMedicationStatus(med);
      const manuallyRecorded = med.schedule_type === "custom" || med.frequency === "custom" || med.frequency === "as_needed";
      if (status.active && !manuallyRecorded) {
        activeMedTasks.push(...medToTasks(med));
      } else if (status.reason === "off_week") {
        offMedWarnings.push(med);
      }
    });
    return { activeMedTasks, offMedWarnings };
  }, [meds]);

  const allActiveTasks = useMemo(() => {
    return [...activeCareTaskRecords, ...activeMedTasks];
  }, [activeCareTaskRecords, activeMedTasks]);

  const totalTasks = allActiveTasks.length;
  const doneLogs = logs.filter(l => l.status === "done");
  const doneCount = doneLogs.length;

  const criticalTasks = allActiveTasks.filter(t => t.care_type === "critical_medical" || t.priority === "critical");
  const routineTasks = allActiveTasks.filter(t => t.care_type !== "critical_medical" && t.priority !== "critical");

  const criticalDone = criticalTasks.filter(t => isTaskFullyDone(t, logByTaskId[t.id])).length;
  const routineDone = routineTasks.filter(t => isTaskFullyDone(t, logByTaskId[t.id])).length;
  const photoCount = doneLogs.filter(l => l.photo_url).length;
  const problemCount = logs.filter(l => l.status === "skipped").length;

  const attentionItems = useMemo(() => {
    const items = [];
    const petName = (petId) => pets.find((pet) => pet.id === petId)?.name || "Pet";
    const pendingCriticalCare = criticalTasks.filter((task) => !task._isMedTask && !isTaskFullyDone(task, logByTaskId[task.id]));
    const pendingMedicationDoses = activeMedTasks.filter((task) => !isTaskFullyDone(task, logByTaskId[task.id]));

    if (problemCount > 0) items.push({ key: "problems", urgency: 0, title: `${problemCount} care task${problemCount === 1 ? "" : "s"} couldn’t be completed`, detail: "Review the recorded reasons and caregiver notes", href: "/" });
    if (pendingCriticalCare.length > 0) items.push({ key: "critical-care", urgency: 0, title: `${pendingCriticalCare.length} critical care task${pendingCriticalCare.length === 1 ? "" : "s"} remaining`, detail: "Complete these before routine care", href: "/" });
    if (pendingMedicationDoses.length > 0) items.push({ key: "medications", urgency: 1, title: `${pendingMedicationDoses.length} medication dose${pendingMedicationDoses.length === 1 ? "" : "s"} requiring attention`, detail: "Scheduled doses not yet recorded today", href: "/medications" });

    preventatives.forEach((preventative) => {
      const status = preventativeStatus(preventative);
      if (status.daysRemaining == null || status.daysRemaining > 7) return;
      items.push({
        key: `preventative-${preventative.id}`,
        urgency: status.daysRemaining < 0 ? 0 : 1,
        title: `${preventative.name} · ${petName(preventative.pet_id)}`,
        detail: dueText(status.daysRemaining),
        href: `/pets/${preventative.pet_id}`,
      });
    });

    vaccinations.forEach((vaccination) => {
      const status = vaccinationStatus(vaccination);
      if (status.daysRemaining == null || status.daysRemaining > 30) return;
      const name = vaccination.name === "custom" ? vaccination.custom_name || "Vaccine" : vaccination.name?.toUpperCase() || "Vaccine";
      items.push({
        key: `vaccination-${vaccination.id}`,
        urgency: status.daysRemaining < 0 ? 0 : 2,
        title: `${name} · ${petName(vaccination.pet_id)}`,
        detail: dueText(status.daysRemaining),
        href: `/pets/${vaccination.pet_id}`,
      });
    });

    vetVisits.forEach((visit) => {
      const visitDays = daysFromToday(visit.date);
      if (visitDays != null && visitDays >= 0 && visitDays <= 7) {
        items.push({ key: `visit-${visit.id}`, urgency: visitDays <= 1 ? 1 : 2, title: `Veterinary visit · ${petName(visit.pet_id)}`, detail: dueText(visitDays), href: `/pets/${visit.pet_id}` });
      }
      const followUpDays = daysFromToday(visit.follow_up_date);
      if (!visit.follow_up_completed && followUpDays != null && followUpDays <= 7) {
        items.push({ key: `follow-up-${visit.id}`, urgency: followUpDays < 0 ? 0 : followUpDays <= 1 ? 1 : 2, title: `Veterinary follow-up · ${petName(visit.pet_id)}`, detail: dueText(followUpDays), href: `/pets/${visit.pet_id}` });
      }
    });

    if (neonatalKittens.some((kitten) => kitten.active !== false)) {
      const neonatal = neonatalDashboardStats(neonatalKittens, neonatalFeedings, neonatalWeights, neonatalEliminations);
      if (neonatal.overdue > 0) items.push({ key: "neonatal-overdue", urgency: 0, title: `${neonatal.overdue} neonatal feeding${neonatal.overdue === 1 ? "" : "s"} overdue`, detail: "Open the neonatal dashboard now", href: "/neonatal" });
      if (neonatal.weightLosses > 0) items.push({ key: "neonatal-weight", urgency: 0, title: `${neonatal.weightLosses} kitten${neonatal.weightLosses === 1 ? "" : "s"} with weight loss`, detail: "Review growth records and care status", href: "/neonatal" });
      if (neonatal.feedingsDueNow > 0 || neonatal.feedingsDueSoon > 0) {
        const count = neonatal.feedingsDueNow + neonatal.feedingsDueSoon;
        items.push({ key: "neonatal-due", urgency: 1, title: `${count} neonatal feeding${count === 1 ? "" : "s"} due now or soon`, detail: "Review each kitten’s configured schedule", href: "/neonatal" });
      }
    }

    return items.sort((a, b) => a.urgency - b.urgency || a.title.localeCompare(b.title));
  }, [pets, criticalTasks, activeMedTasks, logByTaskId, problemCount, preventatives, vaccinations, vetVisits, neonatalKittens, neonatalFeedings, neonatalWeights, neonatalEliminations]);

  const attentionNow = attentionItems.filter((item) => item.urgency <= 1);
  const attentionUpcoming = attentionItems.filter((item) => item.urgency > 1);
  const visibleAttentionNow = showAllAttention ? attentionNow : attentionNow.slice(0, 3);
  const visibleAttentionUpcoming = showAllAttention ? attentionUpcoming : attentionUpcoming.slice(0, attentionNow.length > 0 ? 2 : 3);
  const hiddenAttentionCount = attentionItems.length - visibleAttentionNow.length - visibleAttentionUpcoming.length;

  const requiredTasks = allActiveTasks.filter(t => t.care_type !== "optional");
  const isFullyComplete = requiredTasks.length > 0 &&
    requiredTasks.every(t => isTaskFullyDone(t, logByTaskId[t.id]));

  useEffect(() => {
    if (!isFullyComplete || totalTasks === 0) return;
    if (completionFiredRef.current) return;

    const alreadySent = notifications.some(n => n.type === "daily_complete" && n.notification_date === TODAY);
    if (alreadySent) return;

    completionFiredRef.current = true;

    createNotification.mutate({
      notification_date: TODAY,
      type: "daily_complete",
      sent: true,
      sent_at: new Date().toISOString(),
      summary: `${criticalDone} critical, ${routineDone} routine, ${photoCount} photos, ${problemCount} problems`,
    });

    const ownerEmail = payConfig?.owner_email;
    if (ownerEmail) {
      const caregiverName = user?.full_name || "";
      const dateStr = format(new Date(), "MMMM d, yyyy");
      const body = [
        `Daily care is complete. All required tasks have been completed and proof photos have been submitted where required.`,
        ``,
        `Date: ${dateStr}`,
        caregiverName ? `Caregiver: ${caregiverName}` : null,
        ``,
        `CARE SUMMARY`,
        `Critical tasks completed: ${criticalDone}`,
        `Routine tasks completed: ${routineDone}`,
        `Proof photos submitted: ${photoCount}`,
        problemCount > 0 ? `Tasks not completed: ${problemCount}` : null,
      ].filter(Boolean).join("\n");

      base44.integrations.Core.SendEmail({
        to: ownerEmail,
        subject: "PurrTaskDaily: Daily care complete",
        body,
        from_name: "PurrTaskDaily",
      }).catch(() => {});
    }

    setTimeout(() => setShowSummary(true), 700);
  }, [isFullyComplete, totalTasks, notifications]);

  const problemNotifiedRef = useRef(new Set());
  useEffect(() => {
    const ownerEmail = payConfig?.owner_email;
    if (!ownerEmail) return;

    const newProblems = logs.filter(l => l.status === "skipped" && !problemNotifiedRef.current.has(l.id));
    newProblems.forEach(async (log) => {
      problemNotifiedRef.current.add(log.id);
      const task = allActiveTasks.find(t => t.id === log.task_id);
      const pet = pets.find(p => p.id === log.pet_id);
      const taskName = task?.title || "Unknown task";
      const petName = pet?.name || "Unknown pet";
      const ts = log.completed_at ? new Date(log.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

      await base44.integrations.Core.SendEmail({
        to: ownerEmail,
        subject: `PurrTaskDaily: Task couldn’t be completed — ${taskName}`,
        from_name: "PurrTaskDaily",
        body: [
          `A scheduled care task could not be completed.`,
          ``,
          `Task: ${taskName}`,
          `Pet: ${petName}`,
          `Time: ${ts}`,
          `Note: ${log.notes || "(no note provided)"}`,
        ].join("\n"),
      }).catch(() => {});
    });
  }, [logs, payConfig, allActiveTasks, pets]);

  const handleComplete = async (task, extra) => {
    const existing = logByTaskId[task.id];
    const payload = {
      task_id: task.id,
      pet_id: task.pet_id || "",
      completion_date: TODAY,
      completed_at: new Date().toISOString(),
      status: extra.status || "done",
      photo_url: extra.photo_url || "",
      notes: extra.notes || "",
      exception_reason: extra.exception_reason || "",
      completed_by: user?.full_name || "",
    };
    if (existing) {
      await updateLog.mutateAsync({ id: existing.id, data: payload });
    } else {
      await createLog.mutateAsync(payload);
    }
  };

  const handleReport = async (task, extra) => {
    await handleComplete(task, { ...extra, status: "skipped" });
  };

  const handleSaveTask = async (formData, taskId) => {
    if (taskId) await updateTask.mutateAsync({ id: taskId, data: formData });
    else await createTask.mutateAsync(formData);
    setTaskDialog(false);
    setEditingTask(null);
  };

  const togglePet = (petId) => setCollapsedPets(p => ({ ...p, [petId]: !p[petId] }));

  const groups = useMemo(() => {
    const petTasks = allActiveTasks.filter(t => taskAssignmentType(t) === "pet");
    const areaTasks = allActiveTasks.filter(t => taskAssignmentType(t) === "area");
    const generalTasks = allActiveTasks.filter(t => taskAssignmentType(t) === "general");

    const petGroups = pets.map(pet => ({ kind: "pet", key: `pet_${pet.id}`, pet, tasks: petTasks.filter(t => t.pet_id === pet.id) }))
      .filter(g => g.tasks.length > 0);

    const areaMap = {};
    areaTasks.forEach(t => { const a = t.area || "Other"; (areaMap[a] ||= []).push(t); });
    const areaGroups = Object.keys(areaMap).sort().map(a => ({ kind: "area", key: `area_${a}`, label: a, tasks: areaMap[a] }));

    const generalGroups = generalTasks.length > 0 ? [{ kind: "general", key: "general", label: "General", tasks: generalTasks }] : [];

    return [...petGroups, ...areaGroups, ...generalGroups];
  }, [allActiveTasks, pets]);

  const visibleGroups = useMemo(() => {
    const filtered = filter === "all" ? groups : groups.filter(g => g.kind === filter);
    if (sortMode === "default") return filtered;

    const countFor = (group) => group.tasks.filter((task) => {
      const completed = logByTaskId[task.id]?.status === "done";
      return sortMode === "completed" ? completed : !completed;
    }).length;

    return filtered
      .map((group, index) => ({ group, index, count: countFor(group) }))
      .sort((a, b) => b.count - a.count || a.index - b.index)
      .map(({ group }) => group);
  }, [groups, filter, sortMode, logByTaskId]);

  const FILTERS = [["all", "All"], ["pet", "🐾 Pets"], ["area", "🏠 Areas"], ["general", "✦ General"]];

  return (
    <div className="min-h-full bg-background">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, rgba(114,9,183,0.15), transparent)" }} />
        <div className="absolute bottom-1/3 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, rgba(181,131,141,0.15), transparent)" }} />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-4">
        {/* App header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
            <span className="font-black text-foreground text-lg tracking-tight font-heading">PurrTaskDaily</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </span>
        </div>

        {/* Cross-feature attention queue */}
        <section className="mb-5" aria-labelledby="attention-heading">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <BellRing className={`h-4 w-4 ${attentionNow.length > 0 ? "text-destructive" : "text-primary"}`} />
              <h2 id="attention-heading" className="text-sm font-black text-foreground">Care Overview</h2>
            </div>
            {attentionItems.length > 0 && <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground">{attentionItems.length}</span>}
          </div>

          {attentionItems.length === 0 ? (
            <div className="rounded-3xl p-4 bg-gradient-to-br from-green-500/15 to-primary/5 border border-green-500/25">
              <p className="text-base font-black text-green-600">All clear</p>
              <p className="text-xs text-muted-foreground mt-1">No urgent or upcoming care needs. Today’s tasks remain below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAttentionNow.length > 0 && (
                <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-destructive/15 via-destructive/8 to-amber-500/10 border border-destructive/30 shadow-sm">
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-destructive">Needs Attention Now</p>
                    <span className="text-[10px] font-bold text-destructive">{attentionNow.length}</span>
                  </div>
                  <div className="divide-y divide-destructive/15">
                    {visibleAttentionNow.map((item, index) => (
                      <Link key={item.key} to={item.href} className={`flex items-center gap-3 px-4 ${index === 0 ? "py-4" : "py-3"} hover:bg-background/20 transition-colors`}>
                        <span className={`${index === 0 ? "h-3 w-3" : "h-2.5 w-2.5"} rounded-full flex-shrink-0 ${item.urgency === 0 ? "bg-destructive" : "bg-amber-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`${index === 0 ? "text-base" : "text-sm"} font-black text-foreground`}>{item.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.detail}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-destructive/70 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {visibleAttentionUpcoming.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground mb-2 px-1">Coming Up</p>
                  <div className="rounded-2xl overflow-hidden bg-card border border-border divide-y divide-border">
                    {visibleAttentionUpcoming.map((item) => (
                      <Link key={item.key} to={item.href} className="flex items-center gap-3 px-3.5 py-3 hover:bg-muted/50 transition-colors">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {(hiddenAttentionCount > 0 || showAllAttention) && (
                <button type="button" onClick={() => setShowAllAttention((shown) => !shown)} className="w-full py-2 text-xs font-bold text-primary">
                  {showAllAttention ? "Show fewer care items" : `Show ${hiddenAttentionCount} more care item${hiddenAttentionCount === 1 ? "" : "s"}`}
                </button>
              )}
            </div>
          )}
        </section>

        {/* Sticky progress header */}
        <DailyProgressHeader
          total={totalTasks}
          done={doneCount}
          criticalTotal={criticalTasks.length}
          criticalDone={criticalDone}
        />

        {/* Off-week medication warnings */}
        {offMedWarnings.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-2 px-1">⛔ Medication Alert</p>
            {offMedWarnings.map(m => <MedOffWarningCard key={m.id} med={m} />)}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse bg-muted" />
            ))}
          </div>
        ) : allActiveTasks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🐾</div>
            <p className="text-muted-foreground font-medium mb-1">No tasks for today</p>
            <p className="text-muted-foreground/60 text-sm">Tap + to add care tasks</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Assignment filters */}
            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map(([v, l]) => (
                  <button key={v} onClick={() => setFilter(v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filter === v ? "text-primary-foreground bg-primary" : "text-muted-foreground bg-muted border border-border"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-end gap-2 text-xs font-bold text-muted-foreground">
                Sort by
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value)}
                  className="h-8 rounded-xl bg-muted border border-border px-2.5 text-xs font-bold text-foreground"
                >
                  <option value="default">Default</option>
                  <option value="not_completed">Not Completed</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            {visibleGroups.map(group => {
              const collapsed = collapsedPets[group.key];
              const gTasks = group.tasks;
              const gDone = gTasks.filter(t => logByTaskId[t.id]?.status === "done").length;

              const sorted = [...gTasks].sort((a, b) => {
                const diff = taskSortScore(a) - taskSortScore(b);
                if (diff !== 0) return diff;
                return (a.sort_order || 0) - (b.sort_order || 0);
              });

              const pending = sorted.filter(t => {
                const s = logByTaskId[t.id]?.status;
                return s !== "done" && s !== "skipped";
              });
              const completed = sorted.filter(t => {
                const s = logByTaskId[t.id]?.status;
                return s === "done" || s === "skipped";
              });

              const header = group.kind === "pet" ? (
                <PetSectionHeader pet={group.pet} taskCount={gTasks.length} doneCount={gDone} />
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: group.kind === "area" ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)" }}>
                    {ASSIGNMENT_ICON[group.kind]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-base font-heading">{group.label}</h3>
                    <p className="text-xs text-muted-foreground">{gDone}/{gTasks.length} tasks</p>
                  </div>
                </div>
              );

              return (
                <div key={group.key}>
                  <div className="mb-3 px-1">
                    <div className="h-px w-full mb-3 bg-border" />
                    <button className="w-full flex items-center" onClick={() => togglePet(group.key)}>
                      {header}
                      <div className="ml-2 flex-shrink-0 text-muted-foreground">
                        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </div>
                    </button>
                  </div>

                  <AnimatePresence>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        {pending.map(task => (
                          <CareTaskCard
                            key={task.id}
                            task={task}
                            log={logByTaskId[task.id]}
                            onComplete={handleComplete}
                            onReport={handleReport}
                          />
                        ))}

                        {completed.length > 0 && (
                          <div className="mt-2">
                            {pending.length > 0 && (
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">
                                ✓ Completed
                              </p>
                            )}
                            {completed.map(task => (
                              <CareTaskCard
                                key={task.id}
                                task={task}
                                log={logByTaskId[task.id]}
                                onComplete={handleComplete}
                                onReport={handleReport}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      {canWrite && (
      <div className="fixed bottom-24 right-5 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingTask(null); setTaskDialog(true); }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-primary-foreground font-bold shadow-2xl bg-primary glow-purple"
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      </div>
      )}

      <TaskFormDialog
        open={taskDialog}
        onOpenChange={setTaskDialog}
        task={editingTask}
        pets={pets}
        onSave={handleSaveTask}
      />

      <AssignmentMigrationDialog
        open={migration.open}
        pending={migration.pending}
        pets={pets}
        onApply={handleMigrationApply}
        onClose={() => { localStorage.setItem("careAssignmentMigrated", "1"); setMigration({ open: false, pending: [] }); }}
      />

      <AnimatePresence>
        {showSummary && (
          <DailySummaryScreen
            totalTasks={totalTasks}
            doneTasks={doneCount}
            criticalDone={criticalDone}
            routineDone={routineDone}
            problemCount={problemCount}
            photoCount={photoCount}
            payConfig={payConfig}
            caregiverName={user?.full_name || ""}
            onDismiss={() => setShowSummary(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}