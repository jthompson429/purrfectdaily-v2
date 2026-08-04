import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Pencil, Download, Droplet, Scale, Droplets, Cat, FileText, TrendingUp, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import NeonatalDashboard from "@/components/neonatal/NeonatalDashboard";
import ActivityList from "@/components/neonatal/ActivityList";
import KittenProfileDialog from "@/components/neonatal/KittenProfileDialog";
import FeedingDialog from "@/components/neonatal/FeedingDialog";
import WeightDialog from "@/components/neonatal/WeightDialog";
import EliminationDialog from "@/components/neonatal/EliminationDialog";
import MotherLogDialog from "@/components/neonatal/MotherLogDialog";
import { buildReport, generateFosterReportPDF } from "@/utils/neonatal";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate } from "@/lib/workspaceApi";

const QUICK = [
  { key: "feeding", label: "Feeding", icon: Droplet, color: "#3b82f6" },
  { key: "weight", label: "Weight", icon: Scale, color: "#7209B7" },
  { key: "elimination", label: "Pee/Poop", icon: Droplets, color: "#10b981" },
  { key: "mother", label: "Mother", icon: Cat, color: "#f59e0b" },
];

export default function NeonatalFoster() {
  const { activeWorkspaceId, canWrite } = useWorkspace();
  const { kittenId } = useParams();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null);

  const { data: kittens = [] } = useQuery({ queryKey: ["neonatalKittens", activeWorkspaceId], queryFn: () => base44.entities.NeonatalKitten.filter({ workspace_id: activeWorkspaceId }) });
  const { data: groups = [] } = useQuery({ queryKey: ["neonatalGroups", activeWorkspaceId], queryFn: () => base44.entities.NeonatalGroup.filter({ workspace_id: activeWorkspaceId }) });
  const { data: allFeedings = [] } = useQuery({ queryKey: ["neonatalFeedings", activeWorkspaceId], queryFn: () => base44.entities.NeonatalFeeding.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });
  const { data: allWeights = [] } = useQuery({ queryKey: ["neonatalWeights", activeWorkspaceId], queryFn: () => base44.entities.NeonatalWeight.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });
  const { data: allEliminations = [] } = useQuery({ queryKey: ["neonatalEliminations", activeWorkspaceId], queryFn: () => base44.entities.NeonatalElimination.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });
  const { data: allMotherLogs = [] } = useQuery({ queryKey: ["neonatalMotherLogs", activeWorkspaceId], queryFn: () => base44.entities.NeonatalMotherLog.filter({ workspace_id: activeWorkspaceId }, "-date_time", 300) });

  const kitten = kittens.find((k) => k.id === kittenId) || null;
  const feedings = allFeedings.filter((f) => f.kitten_id === kittenId);
  const weights = allWeights.filter((w) => w.kitten_id === kittenId);
  const eliminations = allEliminations.filter((e) => e.kitten_id === kittenId);
  const motherLogs = allMotherLogs.filter((m) => m.kitten_id === kittenId);

  const createKitten = useMutation({ mutationFn: (d) => wsCreate("NeonatalKitten", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalKittens"] }) });
  const updateKitten = useMutation({ mutationFn: ({ id, data }) => wsUpdate("NeonatalKitten", id, data, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalKittens"] }) });
  const createFeeding = useMutation({ mutationFn: (d) => wsCreate("NeonatalFeeding", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalFeedings"] }) });
  const createWeight = useMutation({ mutationFn: (d) => wsCreate("NeonatalWeight", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalWeights"] }) });
  const createElimination = useMutation({ mutationFn: (d) => wsCreate("NeonatalElimination", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalEliminations"] }) });
  const createMotherLog = useMutation({ mutationFn: (d) => wsCreate("NeonatalMotherLog", d, activeWorkspaceId), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalMotherLogs"] }) });

  const sortedWeights = [...weights].sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
  const previousWeight = sortedWeights[0]?.weight_g ?? kitten?.current_weight_g ?? null;

  const handleSaveKitten = async (data) => {
    if (kitten?.id) await updateKitten.mutateAsync({ id: kitten.id, data });
    else await createKitten.mutateAsync(data);
    setDialog(null);
  };

  const handleExport = () => {
    const text = buildReport(kitten, feedings, weights, eliminations, motherLogs);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neonatal-report-${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = () => generateFosterReportPDF(kitten, feedings, weights, eliminations, motherLogs);

  if (!kitten) {
    return (
      <div className="min-h-full bg-background">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-6">
          <Link to="/neonatal" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="rounded-2xl p-8 bg-card border border-border text-center">
            <Cat className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">Kitten not found</p>
            <p className="text-xs text-muted-foreground mt-1">This kitten may have been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/neonatal" className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-foreground font-heading truncate">{kitten.name}</h1>
            <p className="text-muted-foreground text-xs">Neonatal Foster Care</p>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setDialog("profile")} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={handleExport} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        <NeonatalDashboard kitten={kitten} feedings={feedings} weights={weights} eliminations={eliminations} motherLogs={motherLogs} onLogCare={() => setDialog("feeding")} onGenerateReport={handleGenerateReport} />

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Link to={`/neonatal/kitten/${kitten.id}/growth`} className="py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-foreground/80 bg-card border border-border">
            <TrendingUp className="h-4 w-4 text-primary" /> Growth Chart
          </Link>
          <button onClick={handleGenerateReport} className="py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-primary-foreground bg-primary">
            <FileText className="h-4 w-4" /> Foster Report
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 my-4">
          {QUICK.map(({ key, label, icon: Icon, color }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDialog(key)}
              className="rounded-2xl py-3 flex flex-col items-center gap-1.5 bg-card border border-border"
            >
              <Icon className="h-5 w-5" style={{ color }} />
              <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
            </motion.button>
          ))}
        </div>

        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Recent Activity</p>
        <ActivityList feedings={feedings} weights={weights} eliminations={eliminations} motherLogs={motherLogs} />
      </div>

      <KittenProfileDialog open={dialog === "profile"} onOpenChange={(o) => !o && setDialog(null)} onSave={handleSaveKitten} kitten={kitten} groups={groups} />
      <FeedingDialog open={dialog === "feeding"} onOpenChange={(o) => !o && setDialog(null)} onSave={async (d) => { await createFeeding.mutateAsync({ ...d, kitten_id: kitten?.id }); setDialog(null); }} />
      <WeightDialog open={dialog === "weight"} onOpenChange={(o) => !o && setDialog(null)} onSave={async (d) => { await createWeight.mutateAsync({ ...d, kitten_id: kitten?.id }); setDialog(null); }} previousWeight={previousWeight} />
      <EliminationDialog open={dialog === "elimination"} onOpenChange={(o) => !o && setDialog(null)} onSave={async (d) => { await createElimination.mutateAsync({ ...d, kitten_id: kitten?.id }); setDialog(null); }} />
      <MotherLogDialog open={dialog === "mother"} onOpenChange={(o) => !o && setDialog(null)} onSave={async (d) => { await createMotherLog.mutateAsync({ ...d, kitten_id: kitten?.id }); setDialog(null); }} />
    </div>
  );
}