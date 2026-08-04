import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toLocalInput, fromLocalInput, nowLocalInput } from "@/utils/neonatal";

const empty = () => ({
  name: "",
  birth_date: fromLocalInput(nowLocalInput()),
  current_weight_g: "",
  mother_present: true,
  supplementing_kmr: false,
  notes: "",
});

export default function KittenProfileDialog({ open, onOpenChange, onSave, kitten }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    if (kitten) {
      setForm({
        name: kitten.name || "",
        birth_date: kitten.birth_date || fromLocalInput(nowLocalInput()),
        current_weight_g: kitten.current_weight_g ?? "",
        mother_present: kitten.mother_present ?? true,
        supplementing_kmr: kitten.supplementing_kmr ?? false,
        notes: kitten.notes || "",
      });
    } else {
      setForm(empty());
    }
  }, [open, kitten]);

  const submit = () => {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      current_weight_g: form.current_weight_g === "" ? null : parseFloat(form.current_weight_g),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>{kitten ? "Edit Kitten Profile" : "Neonatal Kitten Profile"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name / Temporary ID</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Neonate #1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Estimated birth</Label>
              <Input
                type="datetime-local"
                value={form.birth_date ? toLocalInput(form.birth_date) : ""}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: fromLocalInput(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Current weight (g)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.current_weight_g}
                onChange={(e) => setForm((f) => ({ ...f, current_weight_g: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="rounded-xl divide-y divide-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center justify-between px-3 py-2.5">
              <Label>Mother present</Label>
              <Switch checked={form.mother_present} onCheckedChange={(v) => setForm((f) => ({ ...f, mother_present: v }))} />
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <Label>Supplementing with KMR</Label>
              <Switch checked={form.supplementing_kmr} onCheckedChange={(v) => setForm((f) => ({ ...f, supplementing_kmr: v }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={submit} className="w-full" disabled={!form.name.trim()}>
            Save Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}