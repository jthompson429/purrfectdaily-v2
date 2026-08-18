import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, ArrowLeft, Cat, FolderArchive, GraduationCap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsTransitionNeonatalGroup, wsTransitionNeonatalKitten } from "@/lib/workspaceApi";
import { GROUP_TYPE_LABELS } from "@/utils/neonatal";
import { useToast } from "@/components/ui/use-toast";

const KITTEN_REASON = {
  adopted: "Adopted",
  transferred: "Transferred",
  no_longer_in_care: "No longer in neonatal care",
  other: "Archived",
};

export default function NeonatalHistory() {
  const { activeWorkspaceId, canWrite } = useWorkspace();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: kittens = [] } = useQuery({
    queryKey: ["neonatalKittens", activeWorkspaceId],
    queryFn: () => base44.entities.NeonatalKitten.filter({ workspace_id: activeWorkspaceId }),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["neonatalGroups", activeWorkspaceId],
    queryFn: () => base44.entities.NeonatalGroup.filter({ workspace_id: activeWorkspaceId }),
  });

  const inactiveKittens = useMemo(
    () => kittens
      .filter((kitten) => kitten.active === false)
      .sort((a, b) => new Date(b.archived_at || b.updated_date || 0) - new Date(a.archived_at || a.updated_date || 0)),
    [kittens],
  );
  const inactiveGroups = useMemo(
    () => groups
      .filter((group) => group.status !== "active")
      .sort((a, b) => new Date(b.archived_at || b.updated_date || 0) - new Date(a.archived_at || a.updated_date || 0)),
    [groups],
  );

  const kittenCounts = useMemo(() => {
    const counts = {};
    kittens.forEach((kitten) => {
      if (!kitten.group_id) return;
      if (!counts[kitten.group_id]) counts[kitten.group_id] = { total: 0, active: 0 };
      counts[kitten.group_id].total += 1;
      if (kitten.active !== false) counts[kitten.group_id].active += 1;
    });
    return counts;
  }, [kittens]);

  const restoreKitten = useMutation({
    mutationFn: (kitten) => wsTransitionNeonatalKitten(kitten.id, "restore", undefined, activeWorkspaceId),
    onSuccess: (_, kitten) => {
      qc.invalidateQueries({ queryKey: ["neonatalKittens"] });
      toast({ title: "Kitten restored", description: `${kitten.name} is active in neonatal care again.` });
    },
  });
  const restoreGroup = useMutation({
    mutationFn: (group) => wsTransitionNeonatalGroup(group.id, "restore", activeWorkspaceId),
    onSuccess: (_, group) => {
      qc.invalidateQueries({ queryKey: ["neonatalGroups"] });
      toast({ title: "Group restored", description: `${group.group_name} is visible on the active Neonatal Dashboard again.` });
    },
  });

  const empty = inactiveKittens.length === 0 && inactiveGroups.length === 0;

  return (
    <div className="min-h-full bg-background">
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/neonatal" className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground bg-muted border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground font-heading">Neonatal History</h1>
            <p className="text-xs text-muted-foreground">Graduated kittens and archived care groups</p>
          </div>
          <Archive className="h-6 w-6 text-primary" />
        </div>

        {empty && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Archive className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">No archived neonatal records</p>
            <p className="text-xs text-muted-foreground mt-1">Completed kittens and groups will appear here.</p>
          </div>
        )}

        {inactiveGroups.length > 0 && (
          <section className="space-y-2 mb-6">
            <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Archived Groups ({inactiveGroups.length})</p>
            {inactiveGroups.map((group) => {
              const counts = kittenCounts[group.id] || { total: 0, active: 0 };
              return (
                <div key={group.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <FolderArchive className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{group.group_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {GROUP_TYPE_LABELS[group.group_type] || group.group_type} · {counts.total} historical {counts.total === 1 ? "kitten" : "kittens"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Link to={`/neonatal/group/${group.id}`} className="rounded-xl border border-border px-3 py-2 text-center text-xs font-bold text-foreground">
                      View Group
                    </Link>
                    <button
                      type="button"
                      onClick={() => restoreGroup.mutate(group)}
                      disabled={!canWrite || restoreGroup.isPending}
                      className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      Restore Group
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {inactiveKittens.length > 0 && (
          <section className="space-y-2">
            <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Inactive Kittens ({inactiveKittens.length})</p>
            {inactiveKittens.map((kitten) => {
              const graduated = kitten.lifecycle_status === "graduated" || !!kitten.pet_profile_id;
              return (
                <div key={kitten.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {kitten.photo_url
                        ? <img src={kitten.photo_url} alt="" className="h-full w-full object-cover" />
                        : graduated
                          ? <GraduationCap className="h-5 w-5 text-primary" />
                          : <ArchiveRestore className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{kitten.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {graduated ? "Moved to Pet Profiles" : KITTEN_REASON[kitten.archive_reason] || "Archived"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Link to={`/neonatal/kitten/${kitten.id}`} className="rounded-xl border border-border px-3 py-2 text-center text-xs font-bold text-foreground">
                      View History
                    </Link>
                    {graduated && kitten.pet_profile_id ? (
                      <Link to={`/pets/${kitten.pet_profile_id}`} className="rounded-xl bg-primary px-3 py-2 text-center text-xs font-bold text-primary-foreground">
                        Open Pet Profile
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => restoreKitten.mutate(kitten)}
                        disabled={!canWrite || restoreKitten.isPending}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                      >
                        Restore Kitten
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
