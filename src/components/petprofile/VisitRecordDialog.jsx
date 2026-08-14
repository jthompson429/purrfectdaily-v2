import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Loader2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

const empty = {
  date: "", clinic: "", veterinarian: "", visit_type: "wellness", reason: "", diagnosis: "",
  treatment: "", follow_up_date: "", follow_up_instructions: "", notes: "",
  vaccinations_given: [], medications_prescribed: [], preventives_administered: [], attachments: [], meds_added: false
};

const VISIT_TYPES = [["wellness", "Wellness"], ["sick_visit", "Sick Visit"], ["vaccination", "Vaccination"], ["surgery", "Surgery"], ["dental", "Dental"], ["emergency", "Emergency"], ["follow_up", "Follow-up"], ["other", "Other"]];
const VACC_OPTIONS = [["rabies", "Rabies"], ["fvrcp", "FVRCP"], ["felv", "FeLV"], ["custom", "Custom"]];
const MED_FREQ = [["once_daily", "Once Daily"], ["twice_daily", "Twice Daily"], ["thrice_daily", "Three Times Daily"], ["as_needed", "As Needed"]];
const PREV_FREQ = [["monthly", "Monthly"], ["every_3_months", "Every 3 Months"], ["annual", "Annual"], ["custom", "Custom"]];
const PREV_PRESETS = ["Revolution Plus", "Credelio", "Heartworm", "Bravecto", "Frontline", "Profender"];

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

const fileType = (name) => {
  const ext = (name || "").toLowerCase().split(".").pop();
  if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return null;
};

function SubHeading({ children, onAdd, addLabel }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <p className="text-[11px] uppercase tracking-wider text-foreground/50 font-bold">{children}</p>
      {onAdd && (
        <button type="button" onClick={onAdd} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80">
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      )}
    </div>
  );
}

const rowWrap = "flex gap-2 items-center";
const rowInput = "bg-muted border-border text-foreground rounded-xl placeholder:text-foreground/20 text-sm h-9";

export default function VisitRecordDialog({ open, onOpenChange, item, onSave }) {
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => { setForm(item ? { ...empty, ...item } : empty); setError(""); }, [item, open]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };
  const inputClass = "bg-muted border-border text-foreground rounded-xl placeholder:text-foreground/20";

  const vaccs = form.vaccinations_given || [];
  const meds = form.medications_prescribed || [];
  const prevs = form.preventives_administered || [];
  const atts = form.attachments || [];

  const addVacc = () => set("vaccinations_given", [...vaccs, { name: "rabies", custom_name: "", due_date: "" }]);
  const updVacc = (i, k, v) => { const a = [...vaccs]; a[i] = { ...a[i], [k]: v }; set("vaccinations_given", a); };
  const rmVacc = (i) => set("vaccinations_given", vaccs.filter((_, x) => x !== i));

  const addMed = () => set("medications_prescribed", [...meds, { name: "", frequency: "twice_daily", start_date: form.date || "", end_date: "" }]);
  const updMed = (i, k, v) => { const a = [...meds]; a[i] = { ...a[i], [k]: v }; set("medications_prescribed", a); };
  const rmMed = (i) => set("medications_prescribed", meds.filter((_, x) => x !== i));

  const addPrev = () => set("preventives_administered", [...prevs, { name: "", date_given: form.date || "", frequency: "monthly", custom_interval_days: 30 }]);
  const updPrev = (i, k, v) => { const a = [...prevs]; a[i] = { ...a[i], [k]: v }; set("preventives_administered", a); };
  const rmPrev = (i) => set("preventives_administered", prevs.filter((_, x) => x !== i));

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = fileType(file.name);
    if (!type) {
      setError("Please upload a PDF, JPG, PNG, or WebP file.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("Attachments must be 10 MB or smaller.");
      e.target.value = "";
      return;
    }

    setError("");
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error("The upload did not return a file URL.");
      set("attachments", [...atts, {
        name: file.name,
        file_url,
        type,
        size_bytes: file.size,
        uploaded_at: new Date().toISOString()
      }]);
    } catch (err) {
      setError(err?.message || "Could not upload the attachment. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  const rmAtt = (i) => set("attachments", atts.filter((_, x) => x !== i));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.date) { setError("Please enter the visit date."); return; }
    setError("");
    setSaving(true);
    try {
      await onSave(form, item?.id);
    } catch (err) {
      setError(err?.message || "Could not save the veterinary visit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[calc(100vw-2rem)] sm:max-w-lg rounded-3xl border-border bg-background max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader><DialogTitle className="text-foreground font-bold text-xl">{item?.id ? "Edit Vet Visit" : "Add Vet Visit"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs uppercase tracking-wider">Visit Date</Label>
              <Input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs uppercase tracking-wider">Visit Type</Label>
              <Select value={form.visit_type} onValueChange={(v) => set("visit_type", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {VISIT_TYPES.map(([v, l]) => <SelectItem key={v} value={v} className="text-foreground hover:bg-muted">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs uppercase tracking-wider">Clinic</Label>
              <Input placeholder="e.g. CityVet" value={form.clinic || ""} onChange={(e) => set("clinic", e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground/60 text-xs uppercase tracking-wider">Veterinarian</Label>
              <Input placeholder="Dr.…" value={form.veterinarian || ""} onChange={(e) => set("veterinarian", e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/60 text-xs uppercase tracking-wider">Reason for Visit</Label>
            <Input placeholder="e.g. Flea allergy dermatitis" value={form.reason || ""} onChange={(e) => set("reason", e.target.value)} className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/60 text-xs uppercase tracking-wider">Diagnosis</Label>
            <Input placeholder="Optional" value={form.diagnosis || ""} onChange={(e) => set("diagnosis", e.target.value)} className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/60 text-xs uppercase tracking-wider">Treatments Performed</Label>
            <Textarea placeholder="e.g. Steroid injection, ear clean…" value={form.treatment || ""} onChange={(e) => set("treatment", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>

          {/* Vaccinations given */}
          <div className="space-y-2 rounded-xl p-3" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.18)" }}>
            <SubHeading onAdd={addVacc} addLabel="Vaccine">Vaccinations Given</SubHeading>
            {vaccs.map((gv, i) => (
              <div key={i} className={rowWrap}>
                <Select value={gv.name} onValueChange={(v) => updVacc(i, "name", v)}>
                  <SelectTrigger className="bg-muted border-border text-foreground rounded-xl h-9 w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {VACC_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v} className="text-foreground hover:bg-muted">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                {gv.name === "custom" && <Input placeholder="Name" value={gv.custom_name || ""} onChange={(e) => updVacc(i, "custom_name", e.target.value)} className={`${rowInput} flex-1`} />}
                <Input type="date" value={gv.due_date || ""} onChange={(e) => updVacc(i, "due_date", e.target.value)} className={`${rowInput} [color-scheme:light] flex-1`} title="Due date" />
                <button type="button" onClick={() => rmVacc(i)} className="text-foreground/30 hover:text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ))}
            {vaccs.length === 0 && <p className="text-[11px] text-foreground/30">Auto-added to the Vaccinations section when saved.</p>}
          </div>

          {/* Preventives administered */}
          <div className="space-y-2 rounded-xl p-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }}>
            <SubHeading onAdd={addPrev} addLabel="Preventive">Preventives Administered</SubHeading>
            {prevs.map((gp, i) => (
              <div key={i} className="space-y-2">
                <div className={rowWrap}>
                  <Input list="visit-prev-presets" placeholder="e.g. Revolution Plus" value={gp.name || ""} onChange={(e) => updPrev(i, "name", e.target.value)} className={`${rowInput} flex-1`} />
                  <Select value={gp.frequency} onValueChange={(v) => updPrev(i, "frequency", v)}>
                    <SelectTrigger className="bg-muted border-border text-foreground rounded-xl h-9 w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {PREV_FREQ.map(([v, l]) => <SelectItem key={v} value={v} className="text-foreground hover:bg-muted">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button type="button" onClick={() => rmPrev(i)} className="text-foreground/30 hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
                <div className={rowWrap}>
                  <Input type="date" value={gp.date_given || ""} onChange={(e) => updPrev(i, "date_given", e.target.value)} className={`${rowInput} [color-scheme:light] flex-1`} title="Date given" />
                  {gp.frequency === "custom" && <Input type="number" min="1" placeholder="days" value={gp.custom_interval_days ?? 30} onChange={(e) => updPrev(i, "custom_interval_days", Number(e.target.value))} className={`${rowInput} w-20`} />}
                </div>
              </div>
            ))}
            {prevs.length === 0 && <p className="text-[11px] text-foreground/30">Auto-added to Preventive Care when saved.</p>}
            <datalist id="visit-prev-presets">{PREV_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
          </div>

          {/* Medications prescribed */}
          <div className="space-y-2 rounded-xl p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
            <SubHeading onAdd={addMed} addLabel="Medication">Medications Prescribed</SubHeading>
            {meds.map((m, i) => (
              <div key={i} className="space-y-2">
                <div className={rowWrap}>
                  <Input placeholder="e.g. Animax Cream" value={m.name || ""} onChange={(e) => updMed(i, "name", e.target.value)} className={`${rowInput} flex-1`} />
                  <Select value={m.frequency} onValueChange={(v) => updMed(i, "frequency", v)}>
                    <SelectTrigger className="bg-muted border-border text-foreground rounded-xl h-9 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      {MED_FREQ.map(([v, l]) => <SelectItem key={v} value={v} className="text-foreground hover:bg-muted">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button type="button" onClick={() => rmMed(i)} className="text-foreground/30 hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
                <div className={rowWrap}>
                  <Input type="date" value={m.start_date || ""} onChange={(e) => updMed(i, "start_date", e.target.value)} className={`${rowInput} [color-scheme:light] flex-1`} title="Start" />
                  <Input type="date" value={m.end_date || ""} onChange={(e) => updMed(i, "end_date", e.target.value)} className={`${rowInput} [color-scheme:light] flex-1`} title="End" />
                </div>
              </div>
            ))}
            {meds.length === 0 && <p className="text-[11px] text-foreground/30">You can add these to active medications from the visit card.</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/60 text-xs uppercase tracking-wider">Follow-up Date</Label>
            <Input type="date" value={form.follow_up_date || ""} onChange={(e) => set("follow_up_date", e.target.value)} className={`${inputClass} [color-scheme:light]`} />
            <p className="text-[10px] text-muted-foreground">Optional — use for a recommended or scheduled recheck.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/60 text-xs uppercase tracking-wider">Follow-up Instructions</Label>
            <Textarea placeholder="Optional" value={form.follow_up_instructions || ""} onChange={(e) => set("follow_up_instructions", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/60 text-xs uppercase tracking-wider">Notes</Label>
            <Textarea placeholder="Optional" value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} className={`${inputClass} h-16 resize-none`} />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <SubHeading>Attachments</SubHeading>
            <div className="flex flex-wrap gap-2">
              {atts.map((a, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-base">{a.type === "image" ? "🖼️" : "📄"}</span>
                  <span className="text-xs text-foreground/70 max-w-[120px] truncate">{a.name}</span>
                  <button type="button" onClick={() => rmAtt(i)} className="text-foreground/30 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(124,58,237,0.1)", border: "1px dashed rgba(124,58,237,0.4)" }}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {uploading ? "Uploading…" : "Upload"}
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
            </div>
            <p className="text-[10px] text-foreground/25">PDF, JPG, PNG, or WebP up to 10 MB — clinical summaries, certificates, lab results, invoices, etc.</p>
          </div>

          {error && <p className="text-xs text-destructive font-medium -mt-1">{error}</p>}
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-foreground/50 hover:text-foreground rounded-xl flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="text-foreground rounded-xl flex-1 font-bold border-0" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>{saving ? "Saving…" : item?.id ? "Save Visit" : "Add Visit"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}