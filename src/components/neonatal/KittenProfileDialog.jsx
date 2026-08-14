import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toLocalInput, fromLocalInput, nowLocalInput } from "@/utils/neonatal";

const empty = () => ({
  name: "",
  birth_date: fromLocalInput(nowLocalInput()),
  initial_weight_g: "",
  mother_present: true,
  supplementing_kmr: false,
  notes: "",
  group_id: "",
  photo_url: "",
  active: true,
  sex: "unknown",
});

export default function KittenProfileDialog({ open, onOpenChange, onSave, kitten, groups = [] }) {
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (kitten) {
      setForm({
        name: kitten.name || "",
        birth_date: kitten.birth_date || fromLocalInput(nowLocalInput()),
        initial_weight_g: "",
        mother_present: kitten.mother_present ?? true,
        supplementing_kmr: kitten.supplementing_kmr ?? false,
        notes: kitten.notes || "",
        group_id: kitten.group_id || "",
        photo_url: kitten.photo_url || "",
        active: kitten.active ?? true,
        sex: kitten.sex || "unknown",
      });
    } else {
      setForm(empty());
    }
    setError("");
  }, [open, kitten]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, photo_url: file_url }));
    } catch (err) {
      console.error("Photo upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.name.trim()) { setError("Please enter a name or temporary ID."); return; }
    if (!form.birth_date || new Date(form.birth_date) > new Date()) { setError("Estimated birth cannot be in the future."); return; }
    const initialWeight = form.initial_weight_g === "" ? null : Number(form.initial_weight_g);
    if (initialWeight != null && (!Number.isFinite(initialWeight) || initialWeight <= 0)) { setError("Initial weight must be greater than zero."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, name: form.name.trim(), initial_weight_g: initialWeight });
    } catch (err) {
      setError(err?.message || "Could not save the kitten profile. Please try again.");
    } finally {
      setSaving(false);
    }
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
          <div className={`grid gap-3 ${kitten ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label>Estimated birth</Label>
              <Input
                type="datetime-local"
                value={form.birth_date ? toLocalInput(form.birth_date) : ""}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: fromLocalInput(e.target.value) }))}
              />
            </div>
            {!kitten && (
              <div className="space-y-1.5">
                <Label>Initial weight (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={form.initial_weight_g}
                  onChange={(e) => { setForm((f) => ({ ...f, initial_weight_g: e.target.value })); setError(""); }}
                  placeholder="Optional"
                />
                <p className="text-[10px] text-muted-foreground">Creates the first growth record</p>
              </div>
            )}
          </div>
          <div className="rounded-xl divide-y divide-border bg-muted">
            <div className="flex items-center justify-between px-3 py-2.5">
              <Label>Mother present</Label>
              <Switch checked={form.mother_present} onCheckedChange={(v) => setForm((f) => ({ ...f, mother_present: v }))} />
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <Label>Supplementing with KMR</Label>
              <Switch checked={form.supplementing_kmr} onCheckedChange={(v) => setForm((f) => ({ ...f, supplementing_kmr: v }))} />
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <Label>Active neonatal care</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={(v) => setForm((f) => ({ ...f, sex: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Group (optional)</Label>
              <Select value={form.group_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, group_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No group</SelectItem>
                  {groups.filter((g) => g.status === "active").map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.group_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Photo</Label>
            <div className="flex items-center gap-3">
              {form.photo_url && <img src={form.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />}
              <label className="flex-1 cursor-pointer">
                <span className="block w-full py-2.5 rounded-xl text-center text-sm font-bold text-muted-foreground bg-muted border border-dashed border-border hover:text-foreground transition-all">
                  {uploading ? "Uploading…" : form.photo_url ? "Change Photo" : "Upload Photo"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
              {form.photo_url && (
                <button onClick={() => setForm((f) => ({ ...f, photo_url: "" }))} className="text-xs font-bold text-destructive">Remove</button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
        </div>
        {error && <p className="text-xs text-destructive font-medium" role="alert">{error}</p>}
        <div className="pt-2">
          <Button onClick={submit} className="w-full" disabled={!form.name.trim() || saving || uploading}>
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}