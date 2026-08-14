import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Pencil, AlertCircle, RotateCw } from "lucide-react";
import { motion } from "framer-motion";
import ErrorBoundary from "@/components/petprofile/ErrorBoundary";
import PetFormDialog from "@/components/care/PetFormDialog";
import OverviewSection from "@/components/petprofile/OverviewSection";
import CareStatusCard from "@/components/petprofile/CareStatusCard";
import RemindersList from "@/components/petprofile/RemindersList";
import PreventativeSection from "@/components/petprofile/PreventativeSection";
import VaccinationSection from "@/components/petprofile/VaccinationSection";
import MedicationSection from "@/components/petprofile/MedicationSection";
import VetVisitSection from "@/components/petprofile/VetVisitSection";
import WeightSection from "@/components/petprofile/WeightSection";
import MedicalHistoryTimeline from "@/components/petprofile/MedicalHistoryTimeline";
import StatusBadge from "@/components/petprofile/StatusBadge";
import { computePetBadges } from "@/utils/petStatus";
import { formatAge } from "@/utils/pet";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsUpdate } from "@/lib/workspaceApi";

const SPECIES_EMOJI = { cat: "🐱", dog: "🐶", rabbit: "🐰", bird: "🐦", other: "🐾" };

export default function PetProfile() {
  const { id } = useParams();
  const { activeWorkspaceId } = useWorkspace();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: pet, isLoading, isError, refetch } = useQuery({ queryKey: ["pet", id], queryFn: () => base44.entities.PetProfile.get(id), enabled: !!id });
  const { data: preventatives = [] } = useQuery({ queryKey: ["preventatives", id], queryFn: () => base44.entities.Preventative.filter({ pet_id: id }, "-date_given") });
  const { data: vaccinations = [] } = useQuery({ queryKey: ["vaccinations", id], queryFn: () => base44.entities.Vaccination.filter({ pet_id: id }, "-date_given") });
  const { data: medications = [] } = useQuery({ queryKey: ["medications", activeWorkspaceId, id], queryFn: () => base44.entities.MedicationSchedule.filter({ workspace_id: activeWorkspaceId, pet_id: id }, "-start_date") });
  const { data: vetVisits = [] } = useQuery({ queryKey: ["vetVisits", id], queryFn: () => base44.entities.VetVisit.filter({ workspace_id: activeWorkspaceId, pet_id: id }, "-date") });
  const { data: weightLogs = [] } = useQuery({ queryKey: ["weightLogs", id], queryFn: () => base44.entities.WeightLog.filter({ workspace_id: activeWorkspaceId, pet_id: id }, "-date") });

  const updatePet = useMutation({ mutationFn: (data) => wsUpdate("PetProfile", id, data, activeWorkspaceId), onSuccess: () => { qc.invalidateQueries({ queryKey: ["pet", id] }); qc.invalidateQueries({ queryKey: ["pets"] }); } });
  const handleSavePet = async (formData) => { await updatePet.mutateAsync(formData); setEditOpen(false); };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (isError) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
      <AlertCircle className="h-10 w-10 text-amber-500" />
      <div>
        <p className="text-foreground font-bold text-lg font-heading">Couldn't load this profile</p>
        <p className="text-muted-foreground text-sm mt-1">Check your connection and try again.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground bg-muted border border-border">Back</button>
        <button onClick={() => refetch()} className="px-4 py-2 rounded-xl text-sm font-bold text-primary-foreground flex items-center gap-1.5 bg-primary"><RotateCw className="h-3.5 w-3.5" /> Try again</button>
      </div>
    </div>
  );
  if (!pet) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <p className="text-muted-foreground">Pet not found</p>
      <Link to="/manage" className="text-primary text-sm font-semibold">Back to Pet Profiles</Link>
    </div>
  );

  let badges = [];
  try { badges = computePetBadges(pet, preventatives, vaccinations, medications); } catch { badges = []; }

  return (
    <ErrorBoundary fallback={(retry) => (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <div>
          <p className="text-foreground font-bold text-lg font-heading">Something went wrong</p>
          <p className="text-muted-foreground text-sm mt-1">This profile couldn't be displayed.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/manage" className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground bg-muted border border-border">Back to Pet Profiles</Link>
          <button onClick={retry} className="px-4 py-2 rounded-xl text-sm font-bold text-primary-foreground flex items-center gap-1.5 bg-primary"><RotateCw className="h-3.5 w-3.5" /> Try again</button>
        </div>
      </div>
    )}>
      <div className="min-h-full bg-background">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground bg-muted border border-border">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-black text-foreground font-heading">Pet Profile</h1>
          </div>

          <ErrorBoundary label="Pet header">
            <motion.div layout className="rounded-2xl p-4 flex items-center gap-3 bg-card border border-border">
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-primary/15">{SPECIES_EMOJI[pet.species] || "🐾"}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-foreground text-lg font-heading">{pet.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{pet.species}{pet.sex && pet.sex !== "unknown" ? ` · ${pet.sex}` : ""}{pet.birth_date ? ` · ${formatAge(pet.birth_date)}` : ""}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {badges.map((b) => <StatusBadge key={b.key} badge={b} />)}
                </div>
              </div>
              <button onClick={() => setEditOpen(true)} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground bg-muted border border-border"><Pencil className="h-4 w-4" /></button>
            </motion.div>
          </ErrorBoundary>

          <ErrorBoundary label="Care Status"><CareStatusCard pet={pet} preventatives={preventatives} vaccinations={vaccinations} medications={medications} vetVisits={vetVisits} /></ErrorBoundary>
          <ErrorBoundary label="Reminders"><RemindersList pet={pet} preventatives={preventatives} vaccinations={vaccinations} medications={medications} weightLogs={weightLogs} vetVisits={vetVisits} /></ErrorBoundary>
          <ErrorBoundary label="Overview"><OverviewSection pet={pet} weightLogs={weightLogs} onEdit={() => setEditOpen(true)} /></ErrorBoundary>
          <ErrorBoundary label="Preventive Care"><PreventativeSection petId={id} /></ErrorBoundary>
          <ErrorBoundary label="Vaccinations"><VaccinationSection petId={id} /></ErrorBoundary>
          <ErrorBoundary label="Medications"><MedicationSection petId={id} /></ErrorBoundary>
          <ErrorBoundary label="Veterinary Visits"><VetVisitSection petId={id} /></ErrorBoundary>
          <ErrorBoundary label="Weight History"><WeightSection petId={id} profileType={pet.profile_type} /></ErrorBoundary>
          <ErrorBoundary label="Medical History"><MedicalHistoryTimeline preventatives={preventatives} vaccinations={vaccinations} vetVisits={vetVisits} medications={medications} /></ErrorBoundary>
        </div>

        <PetFormDialog open={editOpen} onOpenChange={setEditOpen} pet={pet} onSave={handleSavePet} />
      </div>
    </ErrorBoundary>
  );
}