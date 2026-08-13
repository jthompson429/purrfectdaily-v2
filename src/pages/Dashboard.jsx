import { useState, useMemo, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, PawPrint, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";

import DailyProgressHeader from "@/components/care/DailyProgressHeader";
import PetSectionHeader from "@/components/care/PetSectionHeader";
import CareTaskCard from "@/components/care/CareTaskCard";
import MedOffWarningCard from "@/components/care/MedOffWarningCard";
import DailySummaryScreen from "@/components/care/DailySummaryScreen";
import TaskFormDialog from "@/components/care/TaskFormDialog";
import AssignmentMigrationDialog from "@/components/care/AssignmentMigrationDialog";
import { getMedicationStatus } from "@/lib/dateUtils";
import { taskAssignmentType, isGroupName, ASSIGNMENT_ICON } from "@/utils/assignment";
import { doseSlots, medicationTaskId } from "@/utils/petCare";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsBulkUpdate } from "@/lib/workspaceApi";

const TODAY = format(new Date(), "yyyy-MM-dd");

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

  const createLog = useMutation({
    mutationFn: (data) => wsCreate("CompletionLog", data, activeWorkspaceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["completionLogs", TODAY] }); },
  });

  const updateLog = useMutation({
    mutationFn: ({ id, data }) => wsUpdate("CompletionLog", id, data, activeWorkspaceId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["completionLogs", TODAY] }); },
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
        problemCount > 0 ? `Reported problems: ${problemCount}` : null,
      ].filter(Boolean).join("\n");

      base44.integrations.Core.SendEmail({
        to: ownerEmail,
        subject: "PurrfectDaily: Daily care complete",
        body,
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
        subject: `PurrfectDaily: Problem reported — ${taskName}`,
        body: [
          `A problem was reported during today's care.`,
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
    if (filter === "all") return groups;
    return groups.filter(g => g.kind === filter);
  }, [groups, filter]);

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
            <span className="font-black text-foreground text-lg tracking-tight font-heading">PurrfectDaily</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </span>
        </div>

        {/* Sticky progress header */}
        <DailyProgressHeader
          total={totalTasks}
          done={doneCount}
          criticalTotal={criticalTasks.length}
          criticalDone={criticalDone}
        />

        {/* Problem alerts */}
        {problemCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-3 mb-4 flex items-start gap-2.5 bg-destructive/10 border border-destructive/25"
          >
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-destructive">
                Reported Problems — {problemCount} task{problemCount !== 1 ? "s" : ""} had issues today
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Review the task cards below for details. Owner will be notified.
              </p>
            </div>
          </motion.div>
        )}

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
            <div className="flex gap-2">
              {FILTERS.map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filter === v ? "text-primary-foreground bg-primary" : "text-muted-foreground bg-muted border border-border"}`}>
                  {l}
                </button>
              ))}
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