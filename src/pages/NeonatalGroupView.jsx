import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Users, Cat, Calendar, Heart, Archive, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";
import KittenSummaryCard from "@/components/neonatal/KittenSummaryCard";
import GroupDialog from "@/components/neonatal/GroupDialog";
import BatchLogDialog from "@/components/neonatal/BatchLogDialog";
import GroupArchiveDialog from "@/components/neonatal/GroupArchiveDialog";
import { neonatalDashboardStats, GROUP_TYPE_LABELS, formatDateTime } from "@/utils/neonatal";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsUpdate, wsBulkCreate, wsTransitionNeonatalGroup } from "@/lib/workspaceApi";
import { useToast } from "@/components/ui/use-toast";

export default function NeonatalGroupView() {
  const { activeWorkspaceId, canWrite } = useWorkspace();
  const { groupId } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(null);
  const [now] = useState(Date.now());

  const { data: kittens = [] } = useQuery({ queryKey: ["neonatalKittens", activeWorkspaceId], queryFn: () => base44.entities.NeonatalKitten.filter({ workspace_id: activeWorkspaceId }) });
  const { data: groups = [] } = useQuery({ queryKey: ["neonatalGroups", activeWorkspaceId], queryFn: () => base44.entities.NeonatalGroup.filter({ workspace_id: activeWorkspaceId }) });
  const { data: feedings = [] } = useQuery({ queryKey: ["neonatalFeedings", activeWorkspaceId], queryFn: () => base44.entities.NeonatalFeeding.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });
  const { data: weights = [] } = useQuery({ queryKey: ["neonatalWeights", activeWorkspaceId], queryFn: () => base44.entities.NeonatalWeight.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });
  const { data: eliminations = [] } = useQuery({ queryKey: ["neonatalEliminations", activeWorkspaceId], queryFn: () => base44.entities.NeonatalElimination.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });

  const updateGroup = useMutation({ mutationFn: ({ id, data }) => wsUpdate("NeonatalGroup", id, data, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalGroups"] }) });
  const transitionGroup = useMutation({
    mutationFn: (action) => wsTransitionNeonatalGroup(groupId, action, activeWorkspaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalGroups"] }),
  });

  const group = groups.find((g) => g.id === groupId) || null;
  const groupAllKittens = kittens.filter((k) => k.group_id === groupId);
  const groupKittens = groupAllKittens.filter((k) => k.active !== false);
  const inactiveGroupKittens = groupAllKittens.filter((k) => k.active === false);

  const stats = useMemo(() => neonatalDashboardStats(groupKittens, feedings, weights, eliminations, now), [groupKittens, feedings, weights, eliminations, now]);

  const handleSaveGroup = async (data) => {
    if (group?.id) await updateGroup.mutateAsync({ id: group.id, data });
    setDialog(null);
  };

  const handleArchiveGroup = async () => {
    await transitionGroup.mutateAsync("archive");
    setDialog(null);
    toast({ title: "Group archived", description: "The group and its history remain available in Neonatal History." });
    navigate("/neonatal/history");
  };

  const handleRestoreGroup = async () => {
    await transitionGroup.mutateAsync("restore");
    toast({ title: "Group restored", description: `${group.group_name} is active again.` });
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
        const kitten = groupKittens.find((k) => k.id === r.kitten_id);
        if (!kitten) return null;
        const ts = format(new Date(r.date_time || new Date()), "MMM d, h:mm a");
        const newNotes = `${kitten.notes ? kitten.notes + "\n" : ""}[${ts}] ${r.notes}`;
        return wsUpdate("NeonatalKitten", r.kitten_id, { notes: newNotes }, activeWorkspaceId);
      }));
      qc.invalidateQueries({ queryKey: ["neonatalKittens"] });
    }
    setDialog(null);
  };

  if (!group) {
    return (
      <div className="min-h-full bg-background">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-6">
          <Link to="/neonatal" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="rounded-2xl p-8 bg-card border border-border text-center">
            <Cat className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">Group not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/neonatal" className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-foreground font-heading truncate">{group.group_name}</h1>
            <p className="text-muted-foreground text-xs">
              {GROUP_TYPE_LABELS[group.group_type] || group.group_type}
              {group.status !== "active" ? " · Archived history" : ""}
            </p>
          </div>
          {canWrite && <button onClick={() => setDialog("group")} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
            <Pencil className="h-4 w-4" />
          </button>}
        </div>

        {/* Group details */}
        <div className="rounded-2xl p-4 bg-card border border-border mb-4 space-y-2.5">
          {group.estimated_birth_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Est. birth:</span>
              <span className="font-bold text-foreground">{formatDateTime(group.estimated_birth_date)}</span>
            </div>
          )}
          {group.mother_cat_name && (
            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Mother:</span>
              <span className="font-bold text-foreground">{group.mother_cat_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Cat className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Kittens:</span>
            <span className="font-bold text-foreground">{groupKittens.length} active · {groupAllKittens.length} total</span>
          </div>
          {group.notes && <p className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">{group.notes}</p>}
        </div>

        {/* Group lifecycle */}
        {canWrite && group.status === "active" && groupKittens.length === 0 && (
          <button
            type="button"
            onClick={() => setDialog("archive")}
            className="w-full mb-4 rounded-2xl border border-border bg-card px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold text-foreground"
          >
            <Archive className="h-4 w-4 text-muted-foreground" />
            Archive This Group
          </button>
        )}
        {group.status === "active" && groupKittens.length > 0 && (
          <div className="rounded-2xl border border-border bg-muted/40 p-3 mb-4">
            <p className="text-xs text-muted-foreground">
              Complete or archive all {groupKittens.length} active {groupKittens.length === 1 ? "kitten" : "kittens"} before archiving this group.
            </p>
          </div>
        )}
        {canWrite && group.status !== "active" && (
          <button
            type="button"
            onClick={handleRestoreGroup}
            disabled={transitionGroup.isPending}
            className="w-full mb-4 rounded-2xl bg-primary px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <ArchiveRestore className="h-4 w-4" />
            {transitionGroup.isPending ? "Restoring…" : "Restore Group"}
          </button>
        )}

        {/* Batch log button */}
        {group.status === "active" && groupKittens.length > 0 && (
          <button
            onClick={() => setDialog("batch")}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-primary-foreground bg-primary mb-4"
          >
            <Users className="h-4 w-4" /> Quick Batch Log This Group
          </button>
        )}

        {/* Kitten cards */}
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Kittens in Group ({groupKittens.length})
        </p>
        {groupKittens.length === 0 ? (
          <div className="rounded-2xl p-6 bg-card border border-dashed border-border text-center">
            <p className="text-sm text-muted-foreground">No active kittens in this group.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {inactiveGroupKittens.length > 0 ? "Historical kittens are listed below." : "Assign kittens to this group from their profile."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.summaries.map((s) => (
              <KittenSummaryCard key={s.kitten.id} summary={s} now={now} />
            ))}
          </div>
        )}

        {inactiveGroupKittens.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Historical Kittens ({inactiveGroupKittens.length})
            </p>
            <div className="space-y-2">
              {inactiveGroupKittens.map((kitten) => (
                <Link
                  key={kitten.id}
                  to={`/neonatal/kitten/${kitten.id}`}
                  className="rounded-2xl border border-border bg-card p-3 flex items-center gap-3"
                >
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {kitten.photo_url
                      ? <img src={kitten.photo_url} alt="" className="h-full w-full object-cover" />
                      : <Cat className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{kitten.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {kitten.pet_profile_id ? "Moved to Pet Profiles" : "Archived"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <GroupDialog open={dialog === "group"} onOpenChange={(o) => !o && setDialog(null)} onSave={handleSaveGroup} group={group} />
      <GroupArchiveDialog
        open={dialog === "archive"}
        onOpenChange={(o) => !o && setDialog(null)}
        group={group}
        onArchive={handleArchiveGroup}
      />
      <BatchLogDialog open={dialog === "batch"} onOpenChange={(o) => !o && setDialog(null)} kittens={kittens} onSave={handleBatchSave} preselectedIds={groupKittens.map((k) => k.id)} />
    </div>
  );
}