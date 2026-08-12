import { useState } from "react";
import { useWorkspace } from "@/lib/workspaceContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import InviteDialog from "@/components/workspace/InviteDialog";
import { wsManage } from "@/lib/workspaceApi";
import { Crown, UserCog, Mail, Trash2, ArrowRightLeft, BellRing, Clock, CheckCircle, XCircle } from "lucide-react";

const ROLE_LABELS = { owner: "Owner", admin: "Admin", caregiver: "Caregiver", viewer: "Viewer" };

export default function WorkspaceSettings() {
  const { activeWorkspaceId, activeWorkspace, canManageMembers, isOwner, pendingInvitations, acceptInvitation } = useWorkspace();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editName, setEditName] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", activeWorkspaceId],
    queryFn: () => base44.entities.WorkspaceMember.filter({ workspace_id: activeWorkspaceId }),
    enabled: !!activeWorkspaceId,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["workspace-invitations", activeWorkspaceId],
    queryFn: () => base44.entities.WorkspaceInvitation.filter({ workspace_id: activeWorkspaceId, status: "pending" }),
    enabled: !!activeWorkspaceId,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["workspace-audit", activeWorkspaceId],
    queryFn: () => base44.entities.WorkspaceAuditLog.filter({ workspace_id: activeWorkspaceId }, "-event_time", 20),
    enabled: !!activeWorkspaceId,
  });

  const updateWs = useMutation({
    mutationFn: ({ data }) => wsManage("updateWorkspace", { data, workspace_id: activeWorkspaceId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-members", activeWorkspaceId] }),
  });

  const updateMember = useMutation({
    mutationFn: ({ id, data }) => wsManage("changeRole", { memberId: id, newRole: data.role, workspace_id: activeWorkspaceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members", activeWorkspaceId] });
      toast({ title: "Role updated" });
    },
  });

  const removeMember = useMutation({
    mutationFn: (member) => wsManage("removeMember", { memberId: member.id, workspace_id: activeWorkspaceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members", activeWorkspaceId] });
      toast({ title: "Member removed" });
    },
  });

  const updateClipboardAlerts = useMutation({
    mutationFn: ({ memberId, enabled }) =>
      wsManage("updateClipboardNotifications", {
        memberId,
        inApp: enabled,
        workspace_id: activeWorkspaceId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members", activeWorkspaceId] });
      toast({ title: "Clipboard alert recipients updated" });
    },
    onError: (error) => {
      toast({
        title: "Could not update alerts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: (inv) => wsManage("revokeInvitation", { invitationId: inv.id, workspace_id: activeWorkspaceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-invitations", activeWorkspaceId] });
      toast({ title: "Invitation revoked" });
    },
  });

  const changeRole = (member, newRole) => {
    if (member.role === "owner") return;
    updateMember.mutate({ id: member.id, data: { role: newRole } });
  };

  const handleTransferOwnership = async (newOwnerId) => {
    await wsManage("transferOwnership", { newOwnerId, workspace_id: activeWorkspaceId });
    setTransferOpen(false);
    toast({ title: "Ownership transferred" });
    window.location.reload();
  };

  const handleSaveName = () => {
    if (!editName.trim()) return;
    updateWs.mutate({ data: { name: editName.trim() } });
    setEditName("");
    toast({ title: "Workspace updated" });
  };

  const handleAcceptInvitation = async (inv) => {
    await acceptInvitation(inv);
    toast({ title: "Invitation accepted" });
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-foreground font-heading">Workspace Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace, members, and permissions</p>
        </div>

        {/* Workspace Info */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Workspace Details</h2>
          <div className="flex items-center gap-2">
            <Input value={editName || activeWorkspace?.name || ""} onChange={(e) => setEditName(e.target.value)} disabled={!canManageMembers} />
            {canManageMembers && <Button size="sm" onClick={handleSaveName} disabled={!editName.trim()}>Save</Button>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <p className="text-sm font-medium capitalize mt-0.5">{activeWorkspace?.workspace_type}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Owner</Label>
            <p className="text-sm font-medium mt-0.5">{activeWorkspace?.owner_email}</p>
          </div>
        </section>

        {/* Pending Invitations for current user */}
        {pendingInvitations.length > 0 && !activeWorkspace && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Pending Invitations</h2>
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl bg-card p-3">
                <div>
                  <p className="text-sm font-medium">{inv.role ? `Invited as ${ROLE_LABELS[inv.role] || inv.role}` : "Invitation"}</p>
                  <p className="text-xs text-muted-foreground">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                <Button size="sm" onClick={() => handleAcceptInvitation(inv)}>Accept</Button>
              </div>
            ))}
          </section>
        )}

        {/* Urgent Clipboard alerts */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-destructive/10 p-2">
              <BellRing className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Urgent Clipboard Alerts</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose who receives persistent in-app alerts when an entry is marked Urgent.
              </p>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {members.filter((member) => member.status === "active").map((member) => {
              const enabled = member.clipboard_in_app_alerts !== false;
              return (
                <div key={member.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{member.display_name || member.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[member.role] || member.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`clipboard-alert-${member.id}`} className="text-xs text-muted-foreground">
                      {enabled ? "Receives alerts" : "Alerts off"}
                    </Label>
                    <Switch
                      id={`clipboard-alert-${member.id}`}
                      checked={enabled}
                      disabled={!canManageMembers || updateClipboardAlerts.isPending}
                      onCheckedChange={(checked) =>
                        updateClipboardAlerts.mutate({ memberId: member.id, enabled: checked })
                      }
                      aria-label={`${enabled ? "Disable" : "Enable"} urgent Clipboard alerts for ${member.display_name || member.email}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {!canManageMembers && (
            <p className="text-xs text-muted-foreground">Only workspace Owners and Admins can change alert recipients.</p>
          )}
          <div className="rounded-xl bg-muted/60 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Email delivery is off. Clipboard entries can contain private medical or care details, so email requires a separate privacy choice.
            </p>
          </div>
        </section>

        {/* Members */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Members ({members.length})</h2>
            {canManageMembers && <Button size="sm" onClick={() => setInviteOpen(true)}><Mail className="h-3.5 w-3.5 mr-1" /> Invite</Button>}
          </div>
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {m.role === "owner" ? <Crown className="h-4 w-4 text-primary" /> : <UserCog className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.display_name || m.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canManageMembers && m.role !== "owner" ? (
                  <Select value={m.role} onValueChange={(v) => changeRole(m, v)}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground px-2">{ROLE_LABELS[m.role]}</span>
                )}
                {canManageMembers && m.role !== "owner" && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMember.mutate(m)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Pending Invitations (workspace-level) */}
        {canManageMembers && invitations.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pending Invitations ({invitations.length})</h2>
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[inv.role]} · Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revokeInvitation.mutate(inv)}>
                  <XCircle className="h-4 w-4 text-destructive mr-1" /> Revoke
                </Button>
              </div>
            ))}
          </section>
        )}

        {/* Transfer Ownership */}
        {isOwner && members.filter((m) => m.role !== "owner").length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Transfer Ownership</h2>
            <p className="text-xs text-muted-foreground">Transfer workspace ownership to another member. You will become an admin.</p>
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>Select new owner</Button>
              <DialogContent>
                <DialogHeader><DialogTitle>Select New Owner</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  {members.filter((m) => m.role !== "owner").map((m) => (
                    <button key={m.id} onClick={() => handleTransferOwnership(m.id)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-left">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><UserCog className="h-4 w-4" /></div>
                      <div><p className="text-sm font-medium">{m.display_name || m.email}</p><p className="text-xs text-muted-foreground">{m.email}</p></div>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </section>
        )}

        {/* Audit Log */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No activity recorded</p>
          ) : auditLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 py-1.5 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground font-medium">{log.action?.replace(/_/g, " ")}</p>
                {log.details && <p className="text-muted-foreground truncate">{log.details}</p>}
                <p className="text-muted-foreground/60">{new Date(log.event_time).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}