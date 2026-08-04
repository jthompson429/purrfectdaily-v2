import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap } from "lucide-react";

const empty = {
  title: "", status: "todo", time_to_complete: "", notes: "",
  priority: "normal", xp_reward: 50, requires_photo: false,
  category: "other", streak_count: 0,
};

const CATEGORIES = [
  { value: "feeding", label: "🍖 Feeding" },
  { value: "grooming", label: "✂️ Grooming" },
  { value: "health", label: "💊 Health" },
  { value: "play", label: "🎾 Play" },
  { value: "hygiene", label: "🚿 Hygiene" },
  { value: "other", label: "⭐ Other" },
];

export default function MissionFormDialog({ open, onOpenChange, task, onSave }) {
  const [form, setForm] = useState(empty);
  const isEditing = !!task?.id;

  useEffect(() => {
    setForm(task ? {
      title: task.title || "",
      status: task.status || "todo",
      time_to_complete: task.time_to_complete || "",
      notes: task.notes || "",
      priority: task.priority || "normal",
      xp_reward: task.xp_reward || 50,
      requires_photo: task.requires_photo || false,
      category: task.category || "other",
      streak_count: task.streak_count || 0,
    } : empty);
  }, [task, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form, task?.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-[#0d0d18] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-xl">
            {isEditing ? "Edit Mission" : "New Mission"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Mission Title</Label>
            <Input
              placeholder="e.g. Feed the Commander"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl focus:border-purple-500/50 placeholder:text-white/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d18] border-white/10">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-white hover:bg-white/5">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d18] border-white/10">
                  <SelectItem value="normal" className="text-white hover:bg-white/5">Normal</SelectItem>
                  <SelectItem value="high" className="text-white hover:bg-white/5">High</SelectItem>
                  <SelectItem value="critical" className="text-white hover:bg-white/5">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d18] border-white/10">
                  <SelectItem value="todo" className="text-white hover:bg-white/5">Active</SelectItem>
                  <SelectItem value="done" className="text-white hover:bg-white/5">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Est. Time</Label>
              <Input
                placeholder="e.g. 5 min"
                value={form.time_to_complete}
                onChange={e => set("time_to_complete", e.target.value)}
                className="bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-purple-400" /> XP Reward
            </Label>
            <Input
              type="number"
              min={10} max={500} step={10}
              value={form.xp_reward}
              onChange={e => set("xp_reward", Number(e.target.value))}
              className="bg-white/5 border-white/10 text-white rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Mission Notes</Label>
            <Textarea
              placeholder="Additional details..."
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-20 resize-none placeholder:text-white/20"
            />
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5">
            <div>
              <p className="text-white text-sm font-medium">Require Proof Photo</p>
              <p className="text-white/40 text-xs">Must upload a photo to complete</p>
            </div>
            <Switch
              checked={form.requires_photo}
              onCheckedChange={v => set("requires_photo", v)}
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}
              className="text-white/50 hover:text-white rounded-xl flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!form.title.trim()}
              className="gradient-purple text-white rounded-xl flex-1 font-bold glow-purple border-0">
              {isEditing ? "Save Mission" : "Deploy Mission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}