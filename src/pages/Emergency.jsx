import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, Plus, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_CONFIG = {
  owner: { label: "Owner", color: "text-purple-400", bg: "bg-purple-400/15", emoji: "👤" },
  backup_owner: { label: "Backup Owner", color: "text-blue-400", bg: "bg-blue-400/15", emoji: "👥" },
  primary_vet: { label: "Primary Vet", color: "text-green-400", bg: "bg-green-400/15", emoji: "🏥" },
  emergency_vet: { label: "Emergency Vet", color: "text-red-400", bg: "bg-red-400/15", emoji: "🚨" },
  other: { label: "Other", color: "text-white/50", bg: "bg-white/5", emoji: "📞" },
};

const empty = { contact_name: "", contact_type: "other", phone: "", address: "", notes: "", sort_order: 0 };

function ContactDialog({ open, onOpenChange, contact, onSave }) {
  const [form, setForm] = useState(empty);
  const inputClass = "bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20";

  useState(() => { setForm(contact ? { ...empty, ...contact } : empty); }, [contact, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-[#0f1117]">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-xl">{contact?.id ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Name</Label>
            <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="e.g. Dr. Sarah Chen" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Contact Type</Label>
            <Select value={form.contact_type} onValueChange={v => setForm(f => ({ ...f, contact_type: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0f1117] border-white/10">
                {Object.entries(TYPE_CONFIG).map(([v, c]) => (
                  <SelectItem key={v} value={v} className="text-white hover:bg-white/5">{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className={inputClass} type="tel" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Address (optional)</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Clinic or home address" className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Hours, special instructions..." className={`${inputClass} h-20 resize-none`} />
          </div>
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white/50 rounded-xl flex-1">Cancel</Button>
            <Button onClick={() => onSave(form, contact?.id)} disabled={!form.contact_name.trim()} className="text-white rounded-xl flex-1 font-bold border-0" style={{ background: "linear-gradient(135deg, #dc2626, #7c3aed)" }}>
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Emergency() {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ["emergency"],
    queryFn: () => base44.entities.EmergencyInfo.list("sort_order"),
  });

  const create = useMutation({ mutationFn: d => base44.entities.EmergencyInfo.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["emergency"] }) });
  const update = useMutation({ mutationFn: ({ id, data }) => base44.entities.EmergencyInfo.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["emergency"] }) });
  const remove = useMutation({ mutationFn: id => base44.entities.EmergencyInfo.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["emergency"] }) });

  const handleSave = async (formData, id) => {
    if (id) await update.mutateAsync({ id, data: formData });
    else await create.mutateAsync(formData);
    setDialog(false);
    setEditing(null);
  };

  return (
    <div className="min-h-full" style={{ background: "#0f1117" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8"
          style={{ background: "radial-gradient(circle, rgba(239,68,68,0.25), transparent)" }} />
      </div>

      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Emergency Info</h1>
            <p className="text-white/40 text-xs">Contacts for urgent situations</p>
          </div>
        </div>

        {/* SOS Banner */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(124,58,237,0.1))", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p className="text-red-300 text-sm font-semibold mb-1">🚨 In a life-threatening emergency</p>
          <p className="text-white/50 text-xs leading-relaxed">Contact the emergency vet immediately. Do not wait. Take the animal directly to emergency care if unreachable.</p>
        </div>

        {/* Contacts */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {contacts.map(c => {
              const cfg = TYPE_CONFIG[c.contact_type] || TYPE_CONFIG.other;
              return (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${cfg.bg}`}>
                        {cfg.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-white text-sm">{c.contact_name}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
                        </div>
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-sm font-semibold mt-1" style={{ color: "#60a5fa" }}>
                            <Phone className="h-3.5 w-3.5" />{c.phone}
                          </a>
                        )}
                        {c.address && <p className="text-xs text-white/40 mt-1">{c.address}</p>}
                        {c.notes && <p className="text-xs text-white/30 mt-1 italic">{c.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(c); setDialog(true); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 transition-all">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => remove.mutate(c.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-all">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">📞</div>
              <p className="text-white/40 text-sm">No emergency contacts yet</p>
              <p className="text-white/25 text-xs mt-1">Add owner and vet contacts</p>
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => { setEditing(null); setDialog(true); }}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.15)" }}
        >
          <Plus className="h-4 w-4" /> Add Contact
        </motion.button>
      </div>

      <ContactDialog open={dialog} onOpenChange={setDialog} contact={editing} onSave={handleSave} />
    </div>
  );
}