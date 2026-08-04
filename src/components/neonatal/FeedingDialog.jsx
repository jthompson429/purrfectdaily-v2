import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toLocalInput, fromLocalInput, nowLocalInput } from "@/utils/neonatal";

const METHODS = [
  { value: "syringe", label: "Syringe" },
  { value: "bottle", label: "Bottle" },
  { value: "nursing", label: "Nursing" },
  { value: "mixed", label: "Mixed / Unknown" },
];
const YESNOMAYBE = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "maybe", label: "Maybe" }];
const SUCK = [{ value: "strong", label: "Strong" }, { value: "weak", label: "Weak" }, { value: "none", label: "None" }];

const empty = () => ({
  date_time: fromLocalInput(nowLocalInput()),
  amount_ml: "",
  method: "syringe",
  nursing_observed: "maybe",
  suck_strength: "strong",
  notes: "",
});

export default function FeedingDialog({ open, onOpenChange, onSave }) {
  const [form, setForm] = useState(empty);
  useEffect(() => { if (open) setForm(empty()); }, [open]);

  const submit = () =>
    onSave({ ...form, amount_ml: form.amount_ml ? parseFloat(form.amount_ml) : 0 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Log Feeding</DialogTitle>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (mL)</Label>
              <Input type="number" inputMode="decimal" value={form.amount_ml} onChange={(e) => setForm((f) => ({ ...f, amount_ml: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nursing observed</Label>
              <Select value={form.nursing_observed} onValueChange={(v) => setForm((f) => ({ ...f, nursing_observed: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YESNOMAYBE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Suck strength</Label>
              <Select value={form.suck_strength} onValueChange={(v) => setForm((f) => ({ ...f, suck_strength: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUCK.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={submit} className="w-full">Save Feeding</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}