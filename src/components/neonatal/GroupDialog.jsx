import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toLocalInput, fromLocalInput, nowLocalInput, GROUP_TYPE_LABELS } from "@/utils/neonatal";

const TYPES = Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const empty = () => ({
  group_name: "",
  group_type: "litter",
  estimated_birth_date: fromLocalInput(nowLocalInput()),
  mother_cat_name: "",
  notes: "",
  status: "active",
});

export default function GroupDialog({ open, onOpenChange, onSave, group }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    if (group) {
      setForm({
        group_name: group.group_name || "",
        group_type: group.group_type || "litter",
        estimated_birth_date: group.estimated_birth_date || fromLocalInput(nowLocalInput()),
        mother_cat_name: group.mother_cat_name || "",
        notes: group.notes || "",
        status: group.status || "active",
      });
    } else {
      setForm(empty());
    }
  }, [open, group]);

  const submit = () => {
    if (!form.group_name.trim()) return;
    onSave({ ...form });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>{group ? "Edit Group" : "New Neonatal Group"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Group Name</Label>
            <Input value={form.group_name} onChange={(e) => setForm((f) => ({ ...f, group_name: e.target.value }))} placeholder="e.g. Daisy's Litter" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Group Type</Label>
              <Select value={form.group_type} onValueChange={(v) => setForm((f) => ({ ...f, group_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated Birth</Label>
              <Input
                type="datetime-local"
                value={form.estimated_birth_date ? toLocalInput(form.estimated_birth_date) : ""}
                onChange={(e) => setForm((f) => ({ ...f, estimated_birth_date: fromLocalInput(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mother Cat (if applicable)</Label>
            <Input value={form.mother_cat_name} onChange={(e) => setForm((f) => ({ ...f, mother_cat_name: e.target.value }))} placeholder="Mother cat name" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={submit} className="w-full" disabled={!form.group_name.trim()}>
            {group ? "Save Changes" : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}