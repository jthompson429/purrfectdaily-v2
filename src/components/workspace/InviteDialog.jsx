import { useState } from "react";
import { useWorkspace } from "@/lib/workspaceContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, X, Crown, UserCog, Trash2, ArrowRightLeft } from "lucide-react";

const ROLE_LABELS = { owner: "Owner", admin: "Admin", caregiver: "Caregiver", viewer: "Viewer" };

export default function InviteDialog({ open, onOpenChange }) {
  const { activeWorkspaceId, writeAuditLog, user } = useWorkspace();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("caregiver");
  const qc = useQueryClient();

  const invite = useMutation({
    mutationFn: async () => {
      await base44.entities.WorkspaceInvitation.create({
        workspace_id: activeWorkspaceId,
        email: email.trim().toLowerCase(),
        role,
        status: "pending",
        invited_by_user_id: user.id,
        invited_by_email: user.email,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      try { await base44.users.inviteUser(email.trim().toLowerCase(), "user"); } catch (e) {}
      await writeAuditLog(activeWorkspaceId, "invitation_sent", "WorkspaceInvitation", null, `Invited ${email} as ${role}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-invitations", activeWorkspaceId] });
      setEmail("");
      setRole("caregiver");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Invite Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Email Address</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="caregiver@example.com" />
          </div>
          <div>
            <Label className="mb-1.5 block">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — Manage members and care data</SelectItem>
                <SelectItem value="caregiver">Caregiver — Add and update care records</SelectItem>
                <SelectItem value="viewer">Viewer — Read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => invite.mutate()} disabled={!email.trim() || invite.isPending}>
            {invite.isPending ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}