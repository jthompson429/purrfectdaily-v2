import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Scale, Pencil, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import SectionCard from "./SectionCard";
import WeightDialog from "./WeightDialog";
import { fmtShort } from "@/utils/petCare";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate, wsDelete } from "@/lib/workspaceApi";
import { displayWeightValue, weightDisplayUnit } from "@/utils/weight";

export default function WeightSection({ petId, profileType, preferredWeightUnit = "kg" }) {
  const { activeWorkspaceId } = useWorkspace();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data: items = [] } = useQuery({ queryKey: ["weightLogs", petId], queryFn: () => base44.entities.WeightLog.filter({ workspace_id: activeWorkspaceId, pet_id: petId }, "-date") });
  const upsert = useMutation({
    mutationFn: ({ id, data }) => id ? wsUpdate("WeightLog", id, data, activeWorkspaceId) : wsCreate("WeightLog", { ...data, pet_id: petId }, activeWorkspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weightLogs", petId] });
      qc.invalidateQueries({ queryKey: ["allWeightLogs", activeWorkspaceId] });
    }
  });
  const remove = useMutation({
    mutationFn: (id) => wsDelete("WeightLog", id, activeWorkspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weightLogs", petId] });
      qc.invalidateQueries({ queryKey: ["allWeightLogs", activeWorkspaceId] });
    }
  });

  const handleSave = async (data, id) => {
    await upsert.mutateAsync({ id, data });
    setDialog(false); setEditing(null);
  };

  const handleUnitChange = async (unit) => {
    await wsUpdate("PetProfile", petId, { preferred_weight_unit: unit }, activeWorkspaceId);
    qc.invalidateQueries({ queryKey: ["pet", petId] });
    qc.invalidateQueries({ queryKey: ["pets", activeWorkspaceId] });
  };

  const unit = weightDisplayUnit(profileType, preferredWeightUnit);
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const latestValue = displayWeightValue(latest, profileType, preferredWeightUnit);
  const previousValue = displayWeightValue(prev, profileType, preferredWeightUnit);
  const trend = latestValue != null && previousValue != null ? latestValue - previousValue : null;
  const chartData = sorted.map((entry) => ({
    date: fmtShort(entry.date),
    weight: displayWeightValue(entry, profileType, preferredWeightUnit)
  }));

  return (
    <SectionCard title="Weight History" icon={Scale} onAdd={() => { setEditing(null); setDialog(true); }} addLabel="Log">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">No weight logged yet</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-end gap-2">
              <p className="text-2xl font-black text-foreground">{latestValue} <span className="text-sm text-muted-foreground font-medium">{unit}</span></p>
              {trend != null && (
                <p className={`text-xs font-bold mb-1 ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(unit === "g" ? 1 : 2)} {unit}
                </p>
              )}
            </div>
            {profileType !== "neonatal" && (
              <div className="flex rounded-lg p-0.5 bg-muted border border-border">
                {["kg", "lb"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleUnitChange(option)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${unit === option ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
          {chartData.length >= 2 && (
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} labelStyle={{ color: "hsl(var(--muted-foreground))" }} />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-1">
            {[...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-muted">
                <span className="text-xs text-foreground/70">{displayWeightValue(w, profileType, preferredWeightUnit)} {unit}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{fmtShort(w.date)}</span>
                  <button onClick={() => { setEditing(w); setDialog(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => { if (window.confirm("Delete this weight entry?")) remove.mutate(w.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <WeightDialog open={dialog} onOpenChange={setDialog} item={editing} onSave={handleSave} profileType={profileType} preferredUnit={unit} />
    </SectionCard>
  );
}