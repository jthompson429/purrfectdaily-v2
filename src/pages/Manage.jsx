import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Settings, Plus, Pencil, Trash2, Search, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PetFormDialog from "@/components/care/PetFormDialog";
import TaskFormDialog from "@/components/care/TaskFormDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAge } from "@/utils/pet";
import { computePetBadges } from "@/utils/petStatus";
import { assignmentLabel } from "@/utils/assignment";
import StatusBadge from "@/components/petprofile/StatusBadge";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsDelete } from "@/lib/workspaceApi";
import { displayWeightValue, weightDisplayUnit } from "@/utils/weight";
import AdoptionTab from "@/components/adoption/AdoptionTab";

const SPECIES_EMOJI = { cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🐦", other: "🐾" };
const PROFILE_TYPE_LABELS = {
  house_pet: "House Pet",
  foster: "Foster",
  stray: "Stray",
  neonatal: "Neonatal",
  nursing_mother: "Nursing Mother",
  senior: "Senior",
};
const CARE_LEVEL_ORDER = { critical: 0, special: 1, routine: 2 };
const CATEGORY_EMOJI = { feeding: "🍖", medication: "💊", water: "💧", litter: "🗑️", hygiene: "🧼", quarantine: "⚠️", house_check: "🏠", other: "⭐" };

export default function Manage() {
  const { activeWorkspaceId, canWrite, canDelete } = useWorkspace();
  const [petDialog, setPetDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTab, setActiveTab] = useState("pets");
  const [search, setSearch] = useState("");
  const [petSort, setPetSort] = useState("alphabetical");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: pets = [] } = useQuery({ queryKey: ["pets", activeWorkspaceId], queryFn: () => base44.entities.PetProfile.filter({ workspace_id: activeWorkspaceId }, "sort_order") });
  const { data: neonatalKittens = [] } = useQuery({ queryKey: ["neonatalKittens", activeWorkspaceId], queryFn: () => base44.entities.NeonatalKitten.filter({ workspace_id: activeWorkspaceId }) });
  const { data: tasks = [] } = useQuery({ queryKey: ["careTasks", activeWorkspaceId], queryFn: () => base44.entities.CareTask.filter({ workspace_id: activeWorkspaceId }, "sort_order") });
  const { data: preventatives = [] } = useQuery({ queryKey: ["allPreventatives", activeWorkspaceId], queryFn: () => base44.entities.Preventative.filter({ workspace_id: activeWorkspaceId }) });
  const { data: vaccinations = [] } = useQuery({ queryKey: ["allVaccinations", activeWorkspaceId], queryFn: () => base44.entities.Vaccination.filter({ workspace_id: activeWorkspaceId }) });
  const { data: medications = [] } = useQuery({ queryKey: ["medications", activeWorkspaceId], queryFn: () => base44.entities.MedicationSchedule.filter({ workspace_id: activeWorkspaceId }) });
  const { data: weightLogs = [] } = useQuery({ queryKey: ["allWeightLogs", activeWorkspaceId], queryFn: () => base44.entities.WeightLog.filter({ workspace_id: activeWorkspaceId }, "-date") });

  const createPet = useMutation({ mutationFn: d => wsCreate("PetProfile", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["pets"] }) });
  const updatePet = useMutation({ mutationFn: ({ id, data }) => wsUpdate("PetProfile", id, data, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["pets"] }) });
  const deletePet = useMutation({ mutationFn: id => wsDelete("PetProfile", id, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["pets"] }) });

  const createTask = useMutation({ mutationFn: d => wsCreate("CareTask", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["careTasks"] }) });
  const updateTask = useMutation({ mutationFn: ({ id, data }) => wsUpdate("CareTask", id, data, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["careTasks"] }) });
  const deleteTask = useMutation({ mutationFn: id => wsDelete("CareTask", id, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["careTasks"] }) });

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
  const filteredPets = (q
    ? pets.filter((p) => {
        const badges = computePetBadges(p, preventatives.filter((x) => x.pet_id === p.id), vaccinations.filter((x) => x.pet_id === p.id), medications.filter((x) => x.pet_id === p.id));
        const petMedications = medications.filter((medication) => medication.pet_id === p.id);
        const hay = [p.name, p.species, p.breed, ...petMedications.map((medication) => medication.medication_name), ...badges.map((b) => b.label)].join(" ").toLowerCase();
        return hay.includes(q);
      })
    : pets
  ).slice().sort((a, b) => {
    const byName = (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base", numeric: true });
    if (petSort === "profile_type") {
      const aType = PROFILE_TYPE_LABELS[a.profile_type] || "Other";
      const bType = PROFILE_TYPE_LABELS[b.profile_type] || "Other";
      return aType.localeCompare(bType, undefined, { sensitivity: "base" }) || byName;
    }
    if (petSort === "care_level") {
      const aLevel = CARE_LEVEL_ORDER[a.care_level || "routine"] ?? 99;
      const bLevel = CARE_LEVEL_ORDER[b.care_level || "routine"] ?? 99;
      return aLevel - bLevel || byName;
    }
    return byName;
  });

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
        <div className="grid grid-cols-4 gap-1 mb-6 p-1 rounded-2xl bg-muted">
          {[["pets","Profiles"],["adoption","Adoption"],["tasks","Care Tasks"],["pay","Notifications"]].map(([v,l]) => (
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
              <div className="space-y-2 mb-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, status, medication…"
                    className="pl-9 bg-muted border-border text-foreground rounded-xl placeholder:text-muted-foreground/60"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Sort by</span>
                  <Select value={petSort} onValueChange={setPetSort}>
                    <SelectTrigger className="h-10 flex-1 rounded-xl bg-muted border-border" aria-label="Sort Pet Profiles">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alphabetical">Alphabetical (A–Z)</SelectItem>
                      <SelectItem value="profile_type">Profile Type</SelectItem>
                      <SelectItem value="care_level">Care Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-3 mb-4">
              <AnimatePresence>
                {filteredPets.map((pet) => {
                  const latestWeight = weightLogs
                    .filter((entry) => entry.pet_id === pet.id)
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  const displayedWeight = displayWeightValue(latestWeight, pet.profile_type, pet.preferred_weight_unit);
                  const displayedWeightUnit = weightDisplayUnit(pet.profile_type, pet.preferred_weight_unit);
                  const badges = computePetBadges(
                    pet,
                    preventatives.filter((p) => p.pet_id === pet.id),
                    vaccinations.filter((v) => v.pet_id === pet.id),
                    medications.filter((m) => m.pet_id === pet.id)
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
                        {displayedWeight != null && (
                          <p className="text-xs text-muted-foreground">{displayedWeight} {displayedWeightUnit}</p>
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

        {/* Adoption queue */}
        {activeTab === "adoption" && (
          <AdoptionTab
            pets={pets}
            kittens={neonatalKittens}
            onOpenPet={(petId) => navigate(`/pets/${petId}`)}
            onOpenKitten={(kittenId) => navigate(`/neonatal/kitten/${kittenId}`)}
          />
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