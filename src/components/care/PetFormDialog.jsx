import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { Loader2, Camera } from "lucide-react";
import { formatBirthDate, formatAge } from "@/utils/pet";

const empty = {
  name: "", species: "cat", breed: "", sex: "unknown", birth_date: "", color_markings: "",
  microchip_number: "", spayed_neutered: "unknown", living_situation: "indoor", profile_type: "house_pet",
  description: "", photo_url: "", care_level: "routine", quarantine_status: false, latest_weight: "",
  body_condition_notes: "", owner_foster_notes: "", health_status: "healthy", health_issues: "",
  current_medications: "", rabies_vaccine_due: "", notes: "", sort_order: 0
};

export default function PetFormDialog({ open, onOpenChange, pet, onSave }) {
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => { setForm(pet ? { ...empty, ...pet } : empty); setError(""); }, [pet, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("photo_url", file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError("");
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...payload } = form;
      if (payload.latest_weight === "" || payload.latest_weight == null) delete payload.latest_weight;
      await onSave(payload, pet?.id);
    } catch (err) {
      setError(err?.message || "Could not save the profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-[#0f1117] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-xl">{pet?.id ? "Edit Pet Profile" : "Add Pet Profile"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Photo */}
          <div className="flex justify-center">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-purple-500/30">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Pet" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ background: "rgba(124,58,237,0.1)" }}>
                    {uploading ? <Loader2 className="h-6 w-6 text-purple-400 animate-spin" /> : <Camera className="h-6 w-6 text-purple-400" />}
                    {!uploading && <span className="text-[9px] text-white/40">Add photo</span>}
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </button>
          </div>

          {/* Identity */}
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Name</Label>
            <Input placeholder="e.g. Maya" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Species</Label>
              <Select value={form.species} onValueChange={(v) => set("species", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  {[["cat", "🐱 Cat"], ["dog", "🐶 Dog"], ["rabbit", "🐰 Rabbit"], ["bird", "🐦 Bird"], ["other", "🐾 Other"]].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-white hover:bg-white/5">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Sex</Label>
              <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  <SelectItem value="male" className="text-white hover:bg-white/5">Male</SelectItem>
                  <SelectItem value="female" className="text-white hover:bg-white/5">Female</SelectItem>
                  <SelectItem value="unknown" className="text-white hover:bg-white/5">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Breed</Label>
              <Input placeholder="Optional" value={form.breed || ""} onChange={(e) => set("breed", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Profile Type</Label>
              <Select value={form.profile_type} onValueChange={(v) => set("profile_type", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  <SelectItem value="house_pet" className="text-white hover:bg-white/5">House Pet</SelectItem>
                  <SelectItem value="foster" className="text-white hover:bg-white/5">Foster</SelectItem>
                  <SelectItem value="neonatal" className="text-white hover:bg-white/5">Neonatal Kitten</SelectItem>
                  <SelectItem value="nursing_mother" className="text-white hover:bg-white/5">Nursing Mother</SelectItem>
                  <SelectItem value="senior" className="text-white hover:bg-white/5">Senior Pet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Birth Date</Label>
            <Input type="date" value={form.birth_date || ""} onChange={(e) => set("birth_date", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
            {form.birth_date && (
              <p className="text-[11px] text-white/40">{formatBirthDate(form.birth_date)} · {formatAge(form.birth_date)} old</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Color / Markings</Label>
              <Input placeholder="Optional" value={form.color_markings || ""} onChange={(e) => set("color_markings", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Microchip #</Label>
              <Input placeholder="Optional" value={form.microchip_number || ""} onChange={(e) => set("microchip_number", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Spayed / Neutered</Label>
              <Select value={form.spayed_neutered} onValueChange={(v) => set("spayed_neutered", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  <SelectItem value="yes" className="text-white hover:bg-white/5">Yes</SelectItem>
                  <SelectItem value="no" className="text-white hover:bg-white/5">No</SelectItem>
                  <SelectItem value="unknown" className="text-white hover:bg-white/5">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Living Situation</Label>
              <Select value={form.living_situation} onValueChange={(v) => set("living_situation", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  <SelectItem value="indoor" className="text-white hover:bg-white/5">Indoor</SelectItem>
                  <SelectItem value="outdoor" className="text-white hover:bg-white/5">Outdoor</SelectItem>
                  <SelectItem value="foster" className="text-white hover:bg-white/5">Foster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Current Weight</Label>
              <Input type="number" step="any" min="0" placeholder="Optional" value={form.latest_weight ?? ""} onChange={(e) => set("latest_weight", e.target.value === "" ? "" : Number(e.target.value))} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Care Level</Label>
              <Select value={form.care_level} onValueChange={(v) => set("care_level", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  <SelectItem value="critical" className="text-white hover:bg-white/5">🔴 Critical</SelectItem>
                  <SelectItem value="special" className="text-white hover:bg-white/5">🟠 Special</SelectItem>
                  <SelectItem value="routine" className="text-white hover:bg-white/5">🔵 Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Description</Label>
            <Input placeholder="Short description" value={form.description || ""} onChange={(e) => set("description", e.target.value)} className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Health Status</Label>
            <Select value={form.health_status || "healthy"} onValueChange={(v) => set("health_status", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0f1117] border-white/10">
                <SelectItem value="healthy" className="text-white hover:bg-white/5">Healthy</SelectItem>
                <SelectItem value="has_issues" className="text-white hover:bg-white/5">Has Issues</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.health_status === "has_issues" && (
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Health Issues</Label>
              <Input placeholder="List any known issues" value={form.health_issues || ""} onChange={(e) => set("health_issues", e.target.value)} className={inputClass} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Body Condition Notes</Label>
            <Textarea placeholder="Optional…" value={form.body_condition_notes || ""} onChange={(e) => set("body_condition_notes", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Owner / Foster Notes</Label>
            <Textarea placeholder="Optional…" value={form.owner_foster_notes || ""} onChange={(e) => set("owner_foster_notes", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Current Medications</Label>
            <Textarea placeholder="List current medications…" value={form.current_medications || ""} onChange={(e) => set("current_medications", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Rabies Vaccine Due</Label>
            <Input type="date" value={form.rabies_vaccine_due || ""} onChange={(e) => set("rabies_vaccine_due", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5">
            <div>
              <p className="text-white text-sm font-medium">Quarantine Status</p>
              <p className="text-white/40 text-xs">Keep separated from other pets</p>
            </div>
            <Switch checked={form.quarantine_status} onCheckedChange={(v) => set("quarantine_status", v)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Notes</Label>
            <Textarea placeholder="Medical history, special needs…" value={form.notes} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} h-20 resize-none`} />
          </div>

          {error && <p className="text-xs text-red-400 font-medium -mt-1">{error}</p>}
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white/50 hover:text-white rounded-xl flex-1">Cancel</Button>
            <Button type="submit" disabled={!form.name.trim() || saving} className="text-white rounded-xl flex-1 font-bold border-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
              {saving ? "Saving…" : pet?.id ? "Save Changes" : "Add Pet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}