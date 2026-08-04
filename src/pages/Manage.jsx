import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Settings, Plus, Pencil, Trash2, Search, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PetFormDialog from "@/components/care/PetFormDialog";
import TaskFormDialog from "@/components/care/TaskFormDialog";
import { Input } from "@/components/ui/input";
import { formatBirthDate, formatAge } from "@/utils/pet";
import { computePetBadges } from "@/utils/petStatus";
import { assignmentLabel } from "@/utils/assignment";
import StatusBadge from "@/components/petprofile/StatusBadge";
import { useWorkspace } from "@/lib/workspaceContext";

const SPECIES_EMOJI = { cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🐦", other: "🐾" };
const CATEGORY_EMOJI = { feeding: "🍖", medication: "💊", water: "💧", litter: "🗑️", hygiene: "🧼", quarantine: "⚠️", house_check: "🏠", other: "⭐" };

export default function Manage() {
  const { activeWorkspaceId, canWrite, canDelete } = useWorkspace();
  const [petDialog, setPetDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTab, setActiveTab] = useState("pets");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: pets = [] } = useQuery({ queryKey: ["pets", activeWorkspaceId], queryFn: () => base44.entities.PetProfile.filter({ workspace_id: activeWorkspaceId }, "sort_order") });
  const { data: tasks = [] } = useQuery({ queryKey: ["careTasks", activeWorkspaceId], queryFn: () => base44.entities.CareTask.filter({ workspace_id: activeWorkspaceId }, "sort_order") });
  const { data: preventatives = [] } = useQuery({ queryKey: ["allPreventatives", activeWorkspaceId], queryFn: () => base44.entities.Preventative.filter({ workspace_id: activeWorkspaceId }) });
  const { data: vaccinations = [] } = useQuery({ queryKey: ["allVaccinations", activeWorkspaceId], queryFn: () => base44.entities.Vaccination.filter({ workspace_id: activeWorkspaceId }) });
  const { data: petMedications = [] } = useQuery({ queryKey: ["allPetMedications", activeWorkspaceId], queryFn: () => base44.entities.PetMedication.filter({ workspace_id: activeWorkspaceId }) });

  const createPet = useMutation({ mutationFn: d => base44.entities.PetProfile.create({ ...d, workspace_id: activeWorkspaceId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["pets"] }) });
  const updatePet = useMutation({ mutationFn: ({ id, data }) => base44.entities.PetProfile.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["pets"] }) });
  const deletePet = useMutation({ mutationFn: id => base44.entities.PetProfile.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["pets"] }) });

  const createTask = useMutation({ mutationFn: d => base44.entities.CareTask.create({ ...d, workspace_id: activeWorkspaceId }), onSuccess: () => qc.invalidateQueries({ queryKey: ["careTasks"] }) });
  const updateTask = useMutation({ mutationFn: ({ id, data }) => base44.entities.CareTask.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["careTasks"] }) });
  const deleteTask = useMutation({ mutationFn: id => base44.entities.CareTask.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["careTasks"] }) });

  const handleSavePet = async (formData, id) => {
    if (id) await updatePet.mutateAsync({ id, data: formData });
    else await createPet.mutateAsync(formData);
    setPetDialog(false); setEditingPet(null);
  };

  const handleSaveTask = async (formData, id) => {
    if (id) await updateTask.mutateAsync({ id, data: formData });
    else await createTask.mutateAsync(formData);
    setTaskDialog(false); setEditingTask(null);
  };

  const getPetName = (id) => pets.find(p => p.id === id)?.name || "";
  const q = search.trim().toLowerCase();
  const filteredPets = q
    ? pets.filter((p) => {
        const badges = computePetBadges(p, preventatives.filter((x) => x.pet_id === p.id), vaccinations.filter((x) => x.pet_id === p.id), petMedications.filter((x) => x.pet_id === p.id));
        const hay = [p.name, p.species, p.breed, p.current_medications, ...badges.map((b) => b.label)].join(" ").toLowerCase();
        return hay.includes(q);
      })
    : pets;

  return (
    <div className="min-h-full bg-background">
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-muted border border-border">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground font-heading">Pet Profiles</h1>
            <p className="text-muted-foreground text-xs">Care profiles for your pets</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 p-1 rounded-2xl bg-muted">
          {[["pets","Profiles"],["tasks","Care Tasks"],["pay","Notifications"]].map(([v,l]) => (
            <button key={v} onClick={() => setActiveTab(v)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === v ? "text-primary-foreground bg-primary" : "text-muted-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Pet Profiles home */}
        {activeTab === "pets" && (
          <div>
            {pets.length > 0 && (
              <div className="relative mb-3">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, status, medication…"
                  className="pl-9 bg-muted border-border text-foreground rounded-xl placeholder:text-muted-foreground/60"
                />
              </div>
            )}
            <div className="space-y-3 mb-4">
              <AnimatePresence>
                {filteredPets.map((pet) => {
                  const badges = computePetBadges(
                    pet,
                    preventatives.filter((p) => p.pet_id === pet.id),
                    vaccinations.filter((v) => v.pet_id === pet.id),
                    petMedications.filter((m) => m.pet_id === pet.id)
                  );
                  return (
                    <motion.div key={pet.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      onClick={() => navigate(`/pets/${pet.id}`)}
                      className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors bg-card border border-border">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        {pet.photo_url ? (
                          <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl bg-primary/15">
                            {SPECIES_EMOJI[pet.species] || "🐾"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm">{pet.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {pet.species}{pet.sex && pet.sex !== "unknown" ? ` · ${pet.sex}` : ""}{pet.birth_date ? ` · ${formatAge(pet.birth_date)}` : ""}
                        </p>
                        {pet.latest_weight != null && pet.latest_weight !== "" && (
                          <p className="text-xs text-muted-foreground">{pet.latest_weight} {pet.profile_type === "neonatal" ? "g" : "kg"}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {badges.map((b) => <StatusBadge key={b.key} badge={b} />)}
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditingPet(pet); setPetDialog(true); }} className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deletePet.mutate(pet.id)} className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive transition-all bg-muted border border-border">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {pets.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="text-5xl mb-3">🐾</div>
                  <p className="text-muted-foreground text-sm">No pets added yet</p>
                </div>
              )}
              {pets.length > 0 && filteredPets.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">No pets match "{search}"</p>
              )}
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setEditingPet(null); setPetDialog(true); }}
              className="w-full py-4 rounded-2xl font-bold text-foreground flex items-center justify-center gap-2 bg-muted border border-dashed border-border">
              <Plus className="h-4 w-4" /> Add Pet
            </motion.button>
          </div>
        )}

        {/* Tasks tab */}
        {activeTab === "tasks" && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-2 px-1">Tap the eye icon to pause a task (hidden from the daily list) without deleting it.</p>
            <div className="space-y-2 mb-4">
              <AnimatePresence>
                {tasks.map(task => {
                  const isOff = task.active === false;
                  return (
                  <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-2xl p-3.5 flex items-center gap-3 bg-card border border-border"
                    style={{ opacity: isOff ? 0.5 : 1 }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: task.care_type === "critical_medical" ? "rgba(239,68,68,0.15)" : "hsl(var(--muted))" }}>
                      {CATEGORY_EMOJI[task.category] || "⭐"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignmentLabel(task, pets)} · {task.care_type?.replace("_", " ")} {task.requires_photo ? "· 📸" : ""}
                        {isOff ? " · Off" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateTask.mutate({ id: task.id, data: { active: isOff } })}
                        title={isOff ? "Turn on" : "Turn off"}
                        className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
                        {isOff ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => { setEditingTask(task); setTaskDialog(true); }} className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteTask.mutate(task.id)} className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive transition-all bg-muted border border-border">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
              {tasks.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="text-5xl mb-3">📋</div>
                  <p className="text-muted-foreground text-sm">No care tasks yet</p>
                </div>
              )}
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setEditingTask(null); setTaskDialog(true); }}
              className="w-full py-4 rounded-2xl font-bold text-foreground flex items-center justify-center gap-2 bg-muted border border-dashed border-border">
              <Plus className="h-4 w-4" /> Add Care Task
            </motion.button>
          </div>
        )}

        {/* Notifications tab */}
        {activeTab === "pay" && (
          <div>
            <div className="rounded-2xl p-4 bg-card border border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">How this works</p>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <li>• When all required tasks + proof photos are complete, an automatic email is sent to the owner.</li>
                <li>• If a problem is reported on any task, the owner is notified by email immediately.</li>
                <li>• The caregiver can also tap <strong className="text-foreground/70">"Send Completion Message"</strong> on the summary screen to send a manual email from their own mail app.</li>
                <li>• Daily pay is locked until all required tasks and required proof photos are complete for the day.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <PetFormDialog open={petDialog} onOpenChange={setPetDialog} pet={editingPet} onSave={handleSavePet} />
      <TaskFormDialog open={taskDialog} onOpenChange={setTaskDialog} task={editingTask} pets={pets} onSave={handleSaveTask} />
    </div>
  );
}