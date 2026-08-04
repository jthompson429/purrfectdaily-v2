import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2 } from "lucide-react";

const empty = { name: "", species: "cat", breed: "", photo_url: "", total_xp: 0, streak_days: 0, approval_rating: 100, level: 1 };

export default function PetProfileDialog({ open, onOpenChange, pet, onSave }) {
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const isEditing = !!pet?.id;

  useEffect(() => {
    setForm(pet ? { ...empty, ...pet } : empty);
  }, [pet, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("photo_url", file_url);
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form, pet?.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-[#0d0d18]">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-xl">
            {isEditing ? "Edit Pet Profile" : "Add Pet Profile"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-purple-500/30">
              {form.photo_url ? (
                <img src={form.photo_url} alt="pet" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-4xl">
                  {form.species === "cat" ? "🐱" : form.species === "dog" ? "🐶" : "🐾"}
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <span className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-medium">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "Uploading..." : "Upload Photo"}
              </span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Pet Name</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Whiskers" className="bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Species</Label>
              <Select value={form.species} onValueChange={v => set("species", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d18] border-white/10">
                  {["cat","dog","rabbit","bird","other"].map(s => (
                    <SelectItem key={s} value={s} className="text-white hover:bg-white/5 capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Breed</Label>
              <Input value={form.breed} onChange={e => set("breed", e.target.value)}
                placeholder="Optional" className="bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20" />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}
              className="text-white/50 hover:text-white rounded-xl flex-1">Cancel</Button>
            <Button type="submit" disabled={!form.name.trim()}
              className="gradient-purple text-white rounded-xl flex-1 font-bold border-0">
              {isEditing ? "Save Profile" : "Create Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}