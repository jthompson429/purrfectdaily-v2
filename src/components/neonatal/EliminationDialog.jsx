import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toLocalInput, fromLocalInput, nowLocalInput } from "@/utils/neonatal";

const empty = () => ({
  date_time: fromLocalInput(nowLocalInput()),
  urinated: true,
  defecated: false,
  stimulated_by_human: true,
  mom_assisted: false,
  notes: "",
});

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function EliminationDialog({ open, onOpenChange, onSave }) {
  const [form, setForm] = useState(empty);
  useEffect(() => { if (open) setForm(empty()); }, [open]);

  const submit = () => onSave(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Log Elimination</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Date / Time</Label>
            <Input
              type="datetime-local"
              value={form.date_time ? toLocalInput(form.date_time) : ""}
              onChange={(e) => setForm((f) => ({ ...f, date_time: fromLocalInput(e.target.value) }))}
            />
          </div>
          <div className="rounded-xl divide-y divide-border bg-muted">
            <ToggleRow label="Urinated" checked={form.urinated} onChange={(v) => setForm((f) => ({ ...f, urinated: v }))} />
            <ToggleRow label="Defecated" checked={form.defecated} onChange={(v) => setForm((f) => ({ ...f, defecated: v }))} />
            <ToggleRow label="Stimulated by human" checked={form.stimulated_by_human} onChange={(v) => setForm((f) => ({ ...f, stimulated_by_human: v }))} />
            <ToggleRow label="Mom assisted" checked={form.mom_assisted} onChange={(v) => setForm((f) => ({ ...f, mom_assisted: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={submit} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}