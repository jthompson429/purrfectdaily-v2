import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toLocalInput, fromLocalInput, nowLocalInput } from "@/utils/neonatal";

const YESNOMAYBE = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "maybe", label: "Maybe" }];

const empty = () => ({
  date_time: fromLocalInput(nowLocalInput()),
  ate: true,
  drank_water: true,
  food_notes: "",
  nursing_observed: "yes",
  behavior_notes: "",
});

export default function MotherLogDialog({ open, onOpenChange, onSave }) {
  const [form, setForm] = useState(empty);
  useEffect(() => { if (open) setForm(empty()); }, [open]);

  const submit = () => onSave(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Log Mother Cat Care</DialogTitle>
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
          <div className="rounded-xl divide-y divide-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between px-3 py-2.5">
              <Label>Ate</Label>
              <Switch checked={form.ate} onCheckedChange={(v) => setForm((f) => ({ ...f, ate: v }))} />
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <Label>Drank water</Label>
              <Switch checked={form.drank_water} onCheckedChange={(v) => setForm((f) => ({ ...f, drank_water: v }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Food type / amount</Label>
            <Textarea value={form.food_notes} onChange={(e) => setForm((f) => ({ ...f, food_notes: e.target.value }))} rows={2} placeholder="e.g. wet food, 1 can" />
          </div>
          <div className="space-y-1.5">
            <Label>Nursing allowed / observed</Label>
            <Select value={form.nursing_observed} onValueChange={(v) => setForm((f) => ({ ...f, nursing_observed: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{YESNOMAYBE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Behavior notes</Label>
            <Textarea value={form.behavior_notes} onChange={(e) => setForm((f) => ({ ...f, behavior_notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={submit} className="w-full">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}