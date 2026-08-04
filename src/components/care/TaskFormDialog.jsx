import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BUILTIN_AREAS, taskAssignmentType } from "@/utils/assignment";

const empty = {
  title: "", pet_id: "", assignment_type: "pet", area: "", category: "other", care_type: "routine",
  instructions: "", scheduled_time: "anytime", frequency: "every_day",
  schedule_frequency: "daily", weekday: 0, month_day: 1,
  start_date: "", end_date: "", schedule_rule: "",
  requires_photo: false, proof_instructions: "", warning_text: "",
  priority: "normal", sort_order: 0, active: true,
};

export default function TaskFormDialog({ open, onOpenChange, task, pets, onSave }) {
  const [form, setForm] = useState(empty);
  const isEditing = !!task?.id;

  useEffect(() => {
    setForm(task ? { ...empty, ...task, assignment_type: taskAssignmentType(task) } : empty);
  }, [task, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAssignment = (v) => setForm(f => ({ ...f, assignment_type: v, pet_id: v === "pet" ? f.pet_id : "", area: v === "area" ? f.area : "" }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form, task?.id);
  };

  const inputClass = "bg-muted border-border text-foreground rounded-xl placeholder:text-muted-foreground/50 focus:border-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-border bg-background max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground font-bold text-xl font-heading">
            {isEditing ? "Edit Care Task" : "New Care Task"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Task Title</Label>
            <Input placeholder="e.g. Give eye drops — left eye" value={form.title} onChange={e => set("title", e.target.value)} className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Assignment</Label>
            <div className="grid grid-cols-3 gap-2">
              {[["pet", "🐾 Pet"], ["area", "🏠 Area"], ["general", "✦ General"]].map(([v, l]) => (
                <button type="button" key={v} onClick={() => setAssignment(v)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.assignment_type === v ? "text-primary-foreground bg-primary border-transparent" : "text-muted-foreground bg-muted border-border"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {form.assignment_type === "pet" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Pet</Label>
              <Select value={form.pet_id} onValueChange={v => set("pet_id", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl">
                  <SelectValue placeholder="Select pet" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {pets.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-foreground hover:bg-muted">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.assignment_type === "area" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Area</Label>
              <Input list="task-areas" placeholder="Select or type an area" value={form.area || ""} onChange={e => set("area", e.target.value)} className={inputClass} />
              <datalist id="task-areas">{BUILTIN_AREAS.map(a => <option key={a} value={a} />)}</datalist>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {[["feeding","🍖 Feeding"],["medication","💊 Medication"],["water","💧 Water"],["litter","🗑️ Litter"],["hygiene","🧼 Hygiene"],["quarantine","⚠️ Quarantine"],["house_check","🏠 House Check"],["other","⭐ Other"]].map(([v,l]) => (
                    <SelectItem key={v} value={v} className="text-foreground hover:bg-muted">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Care Type</Label>
              <Select value={form.care_type} onValueChange={v => set("care_type", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="critical_medical" className="text-foreground hover:bg-muted">🚨 Critical Medical</SelectItem>
                  <SelectItem value="routine" className="text-foreground hover:bg-muted">📋 Routine</SelectItem>
                  <SelectItem value="optional" className="text-foreground hover:bg-muted">✨ Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Time of Day</Label>
              <Select value={form.scheduled_time} onValueChange={v => set("scheduled_time", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {[["morning","Morning"],["afternoon","Afternoon"],["evening","Evening"],["bedtime","Bedtime"],["anytime","Anytime"]].map(([v,l]) => (
                    <SelectItem key={v} value={v} className="text-foreground hover:bg-muted">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="critical" className="text-foreground hover:bg-muted">🔴 Critical</SelectItem>
                  <SelectItem value="high" className="text-foreground hover:bg-muted">🟠 High</SelectItem>
                  <SelectItem value="normal" className="text-foreground hover:bg-muted">🔵 Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Schedule</Label>
            <Select value={form.schedule_frequency} onValueChange={v => set("schedule_frequency", v)}>
              <SelectTrigger className="bg-muted border-border text-foreground rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="daily" className="text-foreground hover:bg-muted">Daily</SelectItem>
                <SelectItem value="weekly" className="text-foreground hover:bg-muted">Weekly</SelectItem>
                <SelectItem value="monthly" className="text-foreground hover:bg-muted">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.schedule_frequency === "weekly" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Day of Week</Label>
              <Select value={String(form.weekday ?? 0)} onValueChange={v => set("weekday", Number(v))}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                    <SelectItem key={i} value={String(i)} className="text-foreground hover:bg-muted">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.schedule_frequency === "monthly" && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Day of Month</Label>
              <Select value={String(form.month_day ?? 1)} onValueChange={v => set("month_day", Number(v))}>
                <SelectTrigger className="bg-muted border-border text-foreground rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <SelectItem key={d} value={String(d)} className="text-foreground hover:bg-muted">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Instructions</Label>
            <Textarea placeholder="Step-by-step instructions for the caregiver..." value={form.instructions} onChange={e => set("instructions", e.target.value)} className={`${inputClass} h-20 resize-none`} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Warning Text (optional)</Label>
            <Input placeholder="e.g. Do not give if cat vomited in last 2 hours" value={form.warning_text} onChange={e => set("warning_text", e.target.value)} className={inputClass} />
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted">
            <div>
              <p className="text-foreground text-sm font-medium">Require Proof Photo</p>
              <p className="text-muted-foreground text-xs">Caregiver must upload photo to complete</p>
            </div>
            <Switch checked={form.requires_photo} onCheckedChange={v => set("requires_photo", v)} />
          </div>

          {form.requires_photo && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Photo Instructions</Label>
              <Input placeholder="e.g. Take photo of empty medicine cup" value={form.proof_instructions} onChange={e => set("proof_instructions", e.target.value)} className={inputClass} />
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground rounded-xl flex-1">Cancel</Button>
            <Button type="submit" disabled={!form.title.trim()} className="text-primary-foreground rounded-xl flex-1 font-bold border-0 bg-primary">
              {isEditing ? "Save Task" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}