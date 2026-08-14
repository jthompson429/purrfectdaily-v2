import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Cat, Plus, Users, FolderPlus, ArrowRight, AlertTriangle, Pencil } from "lucide-react";
import { format } from "date-fns";
import NeonatalStatsBar from "@/components/neonatal/NeonatalStatsBar";
import KittenSummaryCard from "@/components/neonatal/KittenSummaryCard";
import KittenProfileDialog from "@/components/neonatal/KittenProfileDialog";
import GroupDialog from "@/components/neonatal/GroupDialog";
import BatchLogDialog from "@/components/neonatal/BatchLogDialog";
import { neonatalDashboardStats, kittensByGroup, GROUP_TYPE_LABELS, timeAgo } from "@/utils/neonatal";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsDelete, wsBulkCreate } from "@/lib/workspaceApi";

export default function NeonatalOverview() {
  const { activeWorkspaceId, canWrite } = useWorkspace();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const [editingKitten, setEditingKitten] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [batchPreselect, setBatchPreselect] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const { data: kittens = [] } = useQuery({ queryKey: ["neonatalKittens", activeWorkspaceId], queryFn: () => base44.entities.NeonatalKitten.filter({ workspace_id: activeWorkspaceId }) });
  const { data: groups = [] } = useQuery({ queryKey: ["neonatalGroups", activeWorkspaceId], queryFn: () => base44.entities.NeonatalGroup.filter({ workspace_id: activeWorkspaceId }) });
  const { data: feedings = [] } = useQuery({ queryKey: ["neonatalFeedings", activeWorkspaceId], queryFn: () => base44.entities.NeonatalFeeding.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });
  const { data: weights = [] } = useQuery({ queryKey: ["neonatalWeights", activeWorkspaceId], queryFn: () => base44.entities.NeonatalWeight.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });
  const { data: eliminations = [] } = useQuery({ queryKey: ["neonatalEliminations", activeWorkspaceId], queryFn: () => base44.entities.NeonatalElimination.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });
  const { data: motherLogs = [] } = useQuery({ queryKey: ["neonatalMotherLogs", activeWorkspaceId], queryFn: () => base44.entities.NeonatalMotherLog.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });

  const createKitten = useMutation({ mutationFn: (d) => wsCreate("NeonatalKitten", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalKittens"] }) });
  const updateKitten = useMutation({ mutationFn: ({ id, data }) => wsUpdate("NeonatalKitten", id, data, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalKittens"] }) });
  const createGroup = useMutation({ mutationFn: (d) => wsCreate("NeonatalGroup", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalGroups"] }) });
  const updateGroup = useMutation({ mutationFn: ({ id, data }) => wsUpdate("NeonatalGroup", id, data, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalGroups"] }) });

  const stats = useMemo(() => neonatalDashboardStats(kittens, feedings, weights, eliminations, now), [kittens, feedings, weights, eliminations, now]);
  const activeGroups = groups.filter((g) => g.status === "active");
  const { groups: groupedKittens } = kittensByGroup(kittens.filter((k) => k.active !== false));

  // Build recent activity with kitten names
  const kittenNameMap = useMemo(() => {
    const m = {};
    kittens.forEach((k) => { m[k.id] = k.name; });
    return m;
  }, [kittens]);

  const recentActivity = useMemo(() => {
    const items = [
      ...feedings.slice(0, 30).map((f) => ({ time: f.date_time, kind: "feeding", kittenId: f.kitten_id, label: `Feeding · ${(kittenNameMap[f.kitten_id] || "?")} · ${f.amount_ml || 0} mL` })),
      ...weights.slice(0, 30).map((w) => ({ time: w.date_time, kind: "weight", kittenId: w.kitten_id, label: `Weight · ${kittenNameMap[w.kitten_id] || "?"} · ${w.weight_g} g` })),
      ...eliminations.slice(0, 20).map((e) => ({ time: e.date_time, kind: "elimination", kittenId: e.kitten_id, label: `Pee/Poop · ${kittenNameMap[e.kitten_id] || "?"}` })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);
    return items;
  }, [feedings, weights, eliminations, kittenNameMap]);

  const handleSaveKitten = async (data) => {
    const { initial_weight_g: initialWeight, ...profileData } = data;
    if (editingKitten?.id) {
      await updateKitten.mutateAsync({ id: editingKitten.id, data: profileData });
    } else {
      const created = await createKitten.mutateAsync(profileData);
      if (initialWeight != null) {
        try {
          await wsCreate("NeonatalWeight", { kitten_id: created.id, date_time: new Date().toISOString(), weight_g: initialWeight, notes: "Initial profile weight" }, activeWorkspaceId);
          qc.invalidateQueries({ queryKey: ["neonatalWeights", activeWorkspaceId] });
        } catch (error) {
          await wsDelete("NeonatalKitten", created.id, activeWorkspaceId).catch(() => {});
          qc.invalidateQueries({ queryKey: ["neonatalKittens", activeWorkspaceId] });
          throw error;
        }
      }
    }
    setDialog(null); setEditingKitten(null);
  };

  const handleSaveGroup = async (data) => {
    if (editingGroup?.id) await updateGroup.mutateAsync({ id: editingGroup.id, data });
    else await createGroup.mutateAsync(data);
    setDialog(null); setEditingGroup(null);
  };

  const handleBatchSave = async (careType, records) => {
    if (careType === "feeding") {
      await wsBulkCreate("NeonatalFeeding", records, activeWorkspaceId);
      qc.invalidateQueries({ queryKey: ["neonatalFeedings"] });
    } else if (careType === "weight") {
      await wsBulkCreate("NeonatalWeight", records, activeWorkspaceId);
      qc.invalidateQueries({ queryKey: ["neonatalWeights"] });
    } else if (careType === "elimination") {
      await wsBulkCreate("NeonatalElimination", records, activeWorkspaceId);
      qc.invalidateQueries({ queryKey: ["neonatalEliminations"] });
    } else if (careType === "observation") {
      await Promise.all(records.map((r) => {
        const kitten = kittens.find((k) => k.id === r.kitten_id);
        if (!kitten) return null;
        const ts = format(new Date(r.date_time || new Date()), "MMM d, h:mm a");
        const newNotes = `${kitten.notes ? kitten.notes + "\n" : ""}[${ts}] ${r.notes}`;
        return wsUpdate("NeonatalKitten", r.kitten_id, { notes: newNotes }, activeWorkspaceId);
      }));
      qc.invalidateQueries({ queryKey: ["neonatalKittens"] });
    }
    setDialog(null); setBatchPreselect(null);
  };

  const openEditKitten = (k) => { setEditingKitten(k); setDialog("kitten"); };
  const openBatchForGroup = (groupKittens) => {
    setBatchPreselect(groupKittens.map((k) => k.id));
    setDialog("batch");
  };

  return (
    <div className="min-h-full bg-background">
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15 border border-border">
            <Cat className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground font-heading">Neonatal Dashboard</h1>
            <p className="text-muted-foreground text-xs">{stats.totalActive} active {stats.totalActive === 1 ? "kitten" : "kittens"}</p>
          </div>
        </div>

        {/* Action buttons */}
        {canWrite && <div className="grid grid-cols-3 gap-2 mb-4">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditingKitten(null); setDialog("kitten"); }} className="rounded-2xl py-3 flex flex-col items-center gap-1 bg-card border border-border">
            <Plus className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground">New Kitten</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setBatchPreselect(null); setDialog("batch"); }} disabled={stats.totalActive === 0} className="rounded-2xl py-3 flex flex-col items-center gap-1 bg-card border border-border disabled:opacity-40">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground">Batch Log</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setEditingGroup(null); setDialog("group"); }} className="rounded-2xl py-3 flex flex-col items-center gap-1 bg-card border border-border">
            <FolderPlus className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground">New Group</span>
          </motion.button>
        </div>}

        {/* Stats bar */}
        <NeonatalStatsBar stats={stats} />

        {/* Urgent alerts */}
        {(stats.overdue > 0 || stats.weightLosses > 0) && (
          <div className="rounded-2xl p-3 mt-3 bg-destructive/8 border border-destructive/25">
            <p className="text-sm font-bold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Needs Attention
            </p>
            <div className="text-xs text-destructive/80 mt-1 space-y-0.5">
              {stats.overdue > 0 && <p>{stats.overdue} overdue feeding{stats.overdue > 1 ? "s" : ""}</p>}
              {stats.weightLosses > 0 && <p>{stats.weightLosses} kitten{stats.weightLosses > 1 ? "s" : ""} with weight loss</p>}
              {stats.noWeightToday > 0 && <p>{stats.noWeightToday} kitten{stats.noWeightToday > 1 ? "s" : ""} with no weight today</p>}
            </div>
          </div>
        )}

        {/* All kittens */}
        <div className="mt-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">All Kittens</p>
          {stats.summaries.length === 0 ? (
            <button onClick={() => { if (canWrite) { setEditingKitten(null); setDialog("kitten"); } }} disabled={!canWrite} className="w-full py-8 rounded-2xl bg-card border border-dashed border-border disabled:cursor-default">
              <p className="text-foreground/80 font-bold text-sm">+ Create your first neonatal kitten</p>
              <p className="text-muted-foreground text-xs mt-1">Start tracking care, feedings, and growth</p>
            </button>
          ) : (
            <div className="space-y-2">
              {stats.summaries.map((s) => (
                <div key={s.kitten.id} className="relative">
                  <KittenSummaryCard summary={s} now={now} />
                  {canWrite && <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditKitten(s.kitten); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center bg-card/80 border border-border text-muted-foreground hover:text-foreground z-10"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Groups */}
        {activeGroups.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Groups</p>
            <div className="space-y-2">
              {activeGroups.map((g) => {
                const gk = groupedKittens[g.id] || [];
                return (
                  <div key={g.id} className="rounded-2xl p-3 bg-card border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <Link to={`/neonatal/group/${g.id}`} className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{g.group_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {GROUP_TYPE_LABELS[g.group_type] || g.group_type} · {gk.length} {gk.length === 1 ? "kitten" : "kittens"}
                          {g.mother_cat_name ? ` · Mother: ${g.mother_cat_name}` : ""}
                        </p>
                      </Link>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {gk.length > 0 && (
                      <button onClick={() => openBatchForGroup(gk)} disabled={!canWrite} className="w-full mt-1 py-2 rounded-xl text-xs font-bold text-primary bg-primary/8 border border-primary/20 disabled:opacity-50 disabled:cursor-default">
                        <Users className="inline h-3.5 w-3.5 mr-1" /> Batch log this group
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentActivity.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Recent Activity</p>
            <div className="space-y-1.5">
              {recentActivity.map((it, i) => (
                <div key={i} className="rounded-xl p-2.5 flex items-center gap-2.5 bg-card border border-border">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: it.kind === "feeding" ? "#3b82f6" : it.kind === "weight" ? "#7209B7" : "#10b981"
                  }} />
                  <p className="text-xs font-semibold text-foreground flex-1 truncate">{it.label}</p>
                  <p className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(it.time)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <KittenProfileDialog open={dialog === "kitten"} onOpenChange={(o) => !o && setDialog(null)} onSave={handleSaveKitten} kitten={editingKitten} groups={groups} />
      <GroupDialog open={dialog === "group"} onOpenChange={(o) => !o && setDialog(null)} onSave={handleSaveGroup} group={editingGroup} />
      <BatchLogDialog open={dialog === "batch"} onOpenChange={(o) => !o && setDialog(null)} kittens={kittens} onSave={handleBatchSave} preselectedIds={batchPreselect} />
    </div>
  );
}