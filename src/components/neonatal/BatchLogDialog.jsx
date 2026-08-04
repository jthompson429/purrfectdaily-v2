import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, Users } from "lucide-react";
import { toLocalInput, fromLocalInput, nowLocalInput } from "@/utils/neonatal";

const CARE_TYPES = [
  { key: "feeding", label: "Feeding" },
  { key: "weight", label: "Weight" },
  { key: "elimination", label: "Pee/Poop" },
  { key: "observation", label: "Observation" },
];

const METHODS = [
  { value: "syringe", label: "Syringe" },
  { value: "bottle", label: "Bottle" },
  { value: "nursing", label: "Nursing" },
  { value: "mixed", label: "Mixed" },
];
const YESNOMAYBE = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "maybe", label: "Maybe" }];
const SUCK = [{ value: "strong", label: "Strong" }, { value: "weak", label: "Weak" }, { value: "none", label: "None" }];

const defaultShared = (careType) => {
  const dt = fromLocalInput(nowLocalInput());
  switch (careType) {
    case "feeding":
      return { date_time: dt, method: "syringe", nursing_observed: "maybe", suck_strength: "strong" };
    case "weight":
      return { date_time: dt };
    case "elimination":
      return { date_time: dt, stimulated_by_human: true, mom_assisted: false };
    case "observation":
      return { date_time: dt };
    default:
      return { date_time: dt };
  }
};

const defaultOverride = (careType) => {
  switch (careType) {
    case "feeding":
      return { amount_ml: "", skip: false, notes: "" };
    case "weight":
      return { weight_g: "", notes: "" };
    case "elimination":
      return { urinated: true, defecated: false, notes: "" };
    case "observation":
      return { notes: "" };
    default:
      return {};
  }
};

export default function BatchLogDialog({ open, onOpenChange, kittens, onSave, preselectedIds }) {
  const [careType, setCareType] = useState("feeding");
  const [selectedIds, setSelectedIds] = useState([]);
  const [shared, setShared] = useState(defaultShared("feeding"));
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    if (open) {
      setCareType("feeding");
      setSelectedIds(preselectedIds || []);
      setShared(defaultShared("feeding"));
      setOverrides({});
    }
  }, [open, preselectedIds]);

  const activeKittens = (kittens || []).filter((k) => k.active !== false);

  const toggleKitten = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    if (!selectedIds.includes(id)) {
      setOverrides((prev) => ({ ...prev, [id]: defaultOverride(careType) }));
    }
  };

  const selectAll = () => {
    setSelectedIds(activeKittens.map((k) => k.id));
    const newOv = {};
    activeKittens.forEach((k) => { newOv[k.id] = defaultOverride(careType); });
    setOverrides(newOv);
  };
  const deselectAll = () => { setSelectedIds([]); setOverrides({}); };

  const changeCareType = (ct) => {
    setCareType(ct);
    setShared(defaultShared(ct));
    const newOv = {};
    selectedIds.forEach((id) => { newOv[id] = defaultOverride(ct); });
    setOverrides(newOv);
  };

  const setOv = (kittenId, field, value) => {
    setOverrides((prev) => ({ ...prev, [kittenId]: { ...prev[kittenId], [field]: value } }));
  };

  const submit = async () => {
    if (selectedIds.length === 0) return;
    const records = selectedIds.map((kittenId) => {
      const ov = overrides[kittenId] || defaultOverride(careType);
      if (careType === "feeding") {
        return {
          kitten_id: kittenId,
          date_time: shared.date_time,
          amount_ml: ov.skip ? 0 : (parseFloat(ov.amount_ml) || 0),
          method: shared.method,
          nursing_observed: shared.nursing_observed,
          suck_strength: shared.suck_strength,
          notes: ov.skip ? `Did not eat. ${ov.notes || ""}`.trim() : (ov.notes || ""),
        };
      }
      if (careType === "weight") {
        return {
          kitten_id: kittenId,
          date_time: shared.date_time,
          weight_g: parseFloat(ov.weight_g) || 0,
          notes: ov.notes || "",
        };
      }
      if (careType === "elimination") {
        return {
          kitten_id: kittenId,
          date_time: shared.date_time,
          urinated: ov.urinated,
          defecated: ov.defecated,
          stimulated_by_human: shared.stimulated_by_human,
          mom_assisted: shared.mom_assisted,
          notes: ov.notes || "",
        };
      }
      if (careType === "observation") {
        return {
          kitten_id: kittenId,
          date_time: shared.date_time,
          notes: ov.notes || "",
        };
      }
      return { kitten_id: kittenId };
    });
    await onSave(careType, records);
  };

  const selectedCount = selectedIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Quick Batch Logging</DialogTitle>
          <DialogDescription>Create separate records for each selected kitten — never merged.</DialogDescription>
        </DialogHeader>

        {/* Care type tabs */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-muted">
          {CARE_TYPES.map((ct) => (
            <button
              key={ct.key}
              onClick={() => changeCareType(ct.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${careType === ct.key ? "text-primary-foreground bg-primary" : "text-muted-foreground"}`}
            >
              {ct.label}
            </button>
          ))}
        </div>

        {/* Shared fields */}
        <div className="rounded-2xl p-3 bg-muted/50 border border-border space-y-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Shared Values (applies to all)</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Date / Time</Label>
            <Input
              type="datetime-local"
              value={shared.date_time ? toLocalInput(shared.date_time) : ""}
              onChange={(e) => setShared((s) => ({ ...s, date_time: fromLocalInput(e.target.value) }))}
            />
          </div>
          {careType === "feeding" && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={shared.method} onValueChange={(v) => setShared((s) => ({ ...s, method: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nursing</Label>
                <Select value={shared.nursing_observed} onValueChange={(v) => setShared((s) => ({ ...s, nursing_observed: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{YESNOMAYBE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Suck</Label>
                <Select value={shared.suck_strength} onValueChange={(v) => setShared((s) => ({ ...s, suck_strength: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SUCK.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          {careType === "elimination" && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-medium">
                <Switch checked={shared.stimulated_by_human} onCheckedChange={(v) => setShared((s) => ({ ...s, stimulated_by_human: v }))} /> Human stimulated
              </label>
              <label className="flex items-center gap-2 text-xs font-medium">
                <Switch checked={shared.mom_assisted} onCheckedChange={(v) => setShared((s) => ({ ...s, mom_assisted: v }))} /> Mom assisted
              </label>
            </div>
          )}
        </div>

        {/* Kitten selection */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Per-Kitten Values ({selectedCount} selected)
          </p>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[11px] font-bold text-primary">Select all</button>
            <button onClick={deselectAll} className="text-[11px] font-bold text-muted-foreground">Clear</button>
          </div>
        </div>

        {/* Per-kitten list */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px] pr-1">
          {activeKittens.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No active kittens available</p>
          )}
          {activeKittens.map((kitten) => {
            const isSelected = selectedIds.includes(kitten.id);
            const ov = overrides[kitten.id] || defaultOverride(careType);
            return (
              <div
                key={kitten.id}
                className={`rounded-xl p-2.5 border transition-all ${isSelected ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleKitten(kitten.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-transparent"}`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <span className="text-sm font-bold text-foreground flex-1">{kitten.name}</span>
                  {kitten.photo_url && <img src={kitten.photo_url} alt="" className="w-6 h-6 rounded-md object-cover" />}
                </div>
                {isSelected && (
                  <div className="pl-7 space-y-2">
                    {careType === "feeding" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="mL"
                          value={ov.amount_ml}
                          onChange={(e) => setOv(kitten.id, "amount_ml", e.target.value)}
                          className="h-8 w-20 text-xs"
                          disabled={ov.skip}
                        />
                        <span className="text-xs text-muted-foreground">mL</span>
                        <label className="flex items-center gap-1.5 text-xs font-medium ml-auto">
                          <Switch checked={ov.skip} onCheckedChange={(v) => setOv(kitten.id, "skip", v)} /> Skip
                        </label>
                      </div>
                    )}
                    {careType === "weight" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="grams"
                          value={ov.weight_g}
                          onChange={(e) => setOv(kitten.id, "weight_g", e.target.value)}
                          className="h-8 w-24 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">g</span>
                      </div>
                    )}
                    {careType === "elimination" && (
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs font-medium">
                          <Switch checked={ov.urinated} onCheckedChange={(v) => setOv(kitten.id, "urinated", v)} /> Pee
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-medium">
                          <Switch checked={ov.defecated} onCheckedChange={(v) => setOv(kitten.id, "defecated", v)} /> Poop
                        </label>
                      </div>
                    )}
                    {(careType === "feeding" || careType === "weight" || careType === "elimination" || careType === "observation") && (
                      <Input
                        placeholder="Notes (optional)"
                        value={ov.notes}
                        onChange={(e) => setOv(kitten.id, "notes", e.target.value)}
                        className="h-8 text-xs"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex gap-2">
          <Button onClick={submit} className="flex-1" disabled={selectedCount === 0}>
            Save {selectedCount} {selectedCount === 1 ? "Record" : "Records"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}