import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toLocalInput, fromLocalInput, nowLocalInput } from "@/utils/neonatal";

const empty = () => ({
  date_time: fromLocalInput(nowLocalInput()),
  weight_g: "",
  notes: "",
});

export default function WeightDialog({ open, onOpenChange, onSave, previousWeight }) {
  const [form, setForm] = useState(empty);
  useEffect(() => { if (open) setForm(empty()); }, [open]);

  const change = previousWeight != null && form.weight_g !== "" ? parseFloat(form.weight_g) - previousWeight : null;

  const submit = () => onSave({ ...form, weight_g: parseFloat(form.weight_g) || 0 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Log Weight</DialogTitle>
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
          <div className="space-y-1.5">
            <Label>Weight (grams)</Label>
            <Input type="number" inputMode="decimal" value={form.weight_g} onChange={(e) => setForm((f) => ({ ...f, weight_g: e.target.value }))} placeholder="0" />
            {previousWeight != null && (
              <p className="text-xs text-muted-foreground">Previous: {previousWeight} g</p>
            )}
            {change !== null && (
              <p className={`text-sm font-bold ${change >= 0 ? "text-green-500" : "text-destructive"}`}>
                Change: {change >= 0 ? "+" : ""}{change.toFixed(1)} g
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={submit} className="w-full">Save Weight</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}