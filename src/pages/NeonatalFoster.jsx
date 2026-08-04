import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Pencil, Download, Droplet, Scale, Droplets, Cat, FileText, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import NeonatalDashboard from "@/components/neonatal/NeonatalDashboard";
import ActivityList from "@/components/neonatal/ActivityList";
import KittenProfileDialog from "@/components/neonatal/KittenProfileDialog";
import FeedingDialog from "@/components/neonatal/FeedingDialog";
import WeightDialog from "@/components/neonatal/WeightDialog";
import EliminationDialog from "@/components/neonatal/EliminationDialog";
import MotherLogDialog from "@/components/neonatal/MotherLogDialog";
import { buildReport, generateFosterReportPDF } from "@/utils/neonatal";

const QUICK = [
  { key: "feeding", label: "Feeding", icon: Droplet, color: "#3b82f6" },
  { key: "weight", label: "Weight", icon: Scale, color: "#a78bfa" },
  { key: "elimination", label: "Pee/Poop", icon: Droplets, color: "#10b981" },
  { key: "mother", label: "Mother", icon: Cat, color: "#f59e0b" },
];

export default function NeonatalFoster() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null);

  const { data: kittens = [] } = useQuery({ queryKey: ["neonatalKittens"], queryFn: () => base44.entities.NeonatalKitten.list() });
  const { data: feedings = [] } = useQuery({ queryKey: ["neonatalFeedings"], queryFn: () => base44.entities.NeonatalFeeding.list("-date_time", 100) });
  const { data: weights = [] } = useQuery({ queryKey: ["neonatalWeights"], queryFn: () => base44.entities.NeonatalWeight.list("-date_time", 100) });
  const { data: eliminations = [] } = useQuery({ queryKey: ["neonatalEliminations"], queryFn: () => base44.entities.NeonatalElimination.list("-date_time", 100) });
  const { data: motherLogs = [] } = useQuery({ queryKey: ["neonatalMotherLogs"], queryFn: () => base44.entities.NeonatalMotherLog.list("-date_time", 100) });

  const kitten = kittens[0] || null;

  const createKitten = useMutation({ mutationFn: (d) => base44.entities.NeonatalKitten.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalKittens"] }) });
  const updateKitten = useMutation({ mutationFn: ({ id, data }) => base44.entities.NeonatalKitten.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalKittens"] }) });
  const createFeeding = useMutation({ mutationFn: (d) => base44.entities.NeonatalFeeding.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalFeedings"] }) });
  const createWeight = useMutation({ mutationFn: (d) => base44.entities.NeonatalWeight.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalWeights"] }) });
  const createElimination = useMutation({ mutationFn: (d) => base44.entities.NeonatalElimination.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalEliminations"] }) });
  const createMotherLog = useMutation({ mutationFn: (d) => base44.entities.NeonatalMotherLog.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["neonatalMotherLogs"] }) });

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

  return (
    <div className="min-h-full" style={{ background: "#0f1117" }}>
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Cat className="h-6 w-6 text-purple-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">Neonatal Foster</h1>
            <p className="text-white/40 text-xs">{kitten ? kitten.name : "No kitten profile yet"}</p>
          </div>
          {kitten && (
            <div className="flex gap-1">
              <button onClick={() => setDialog("profile")} className="h-9 w-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 transition-all" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={handleExport} className="h-9 w-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/70 transition-all" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Download className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {kitten ? (
          <>
            <NeonatalDashboard kitten={kitten} feedings={feedings} weights={weights} eliminations={eliminations} motherLogs={motherLogs} onLogCare={() => setDialog("feeding")} onGenerateReport={handleGenerateReport} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link to="/neonatal/growth" className="py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white/80" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <TrendingUp className="h-4 w-4 text-purple-400" /> Growth Chart
              </Link>
              <button onClick={handleGenerateReport} className="py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
                <FileText className="h-4 w-4" /> Foster Report
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setDialog("profile")} className="w-full py-8 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)" }}>
            <p className="text-white/60 font-bold text-sm">+ Create Neonatal Kitten Profile</p>
            <p className="text-white/30 text-xs mt-1">Required to start logging care</p>
          </button>
        )}

        <div className="grid grid-cols-4 gap-2 my-4">
          {QUICK.map(({ key, label, icon: Icon, color }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDialog(key)}
              disabled={!kitten}
              className="rounded-2xl py-3 flex flex-col items-center gap-1.5 disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
              <span className="text-[10px] font-bold text-white/70">{label}</span>
            </motion.button>
          ))}
        </div>

        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 px-1">Recent Activity</p>
        <ActivityList feedings={feedings} weights={weights} eliminations={eliminations} motherLogs={motherLogs} />
      </div>

      <KittenProfileDialog open={dialog === "profile"} onOpenChange={(o) => !o && setDialog(null)} onSave={handleSaveKitten} kitten={kitten} />
      <FeedingDialog open={dialog === "feeding"} onOpenChange={(o) => !o && setDialog(null)} onSave={async (d) => { await createFeeding.mutateAsync({ ...d, kitten_id: kitten?.id }); setDialog(null); }} />
      <WeightDialog open={dialog === "weight"} onOpenChange={(o) => !o && setDialog(null)} onSave={async (d) => { await createWeight.mutateAsync({ ...d, kitten_id: kitten?.id }); setDialog(null); }} previousWeight={previousWeight} />
      <EliminationDialog open={dialog === "elimination"} onOpenChange={(o) => !o && setDialog(null)} onSave={async (d) => { await createElimination.mutateAsync({ ...d, kitten_id: kitten?.id }); setDialog(null); }} />
      <MotherLogDialog open={dialog === "mother"} onOpenChange={(o) => !o && setDialog(null)} onSave={async (d) => { await createMotherLog.mutateAsync({ ...d, kitten_id: kitten?.id }); setDialog(null); }} />
    </div>
  );
}