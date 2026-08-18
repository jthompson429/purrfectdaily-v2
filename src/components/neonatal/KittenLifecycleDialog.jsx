import { useEffect, useState } from "react";
import { Archive, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REASONS = [
  { value: "adopted", label: "Adopted" },
  { value: "transferred", label: "Transferred to another foster or rescue" },
  { value: "no_longer_in_care", label: "No longer in neonatal care" },
  { value: "other", label: "Other" },
];

export default function KittenLifecycleDialog({ open, onOpenChange, kitten, onGraduate, onArchive }) {
  const [reason, setReason] = useState("adopted");
  const [working, setWorking] = useState("");
  const [confirming, setConfirming] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("adopted");
    setWorking("");
    setConfirming("");
    setError("");
  }, [open, kitten?.id]);

  const run = async (kind) => {
    setWorking(kind);
    setError("");
    try {
      if (kind === "graduate") await onGraduate();
      else await onArchive(reason);
    } catch (err) {
      setError(err?.message || "Could not update this kitten. Please try again.");
      setWorking("");
      setConfirming("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !working && onOpenChange(next)}>
      <DialogContent className="max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>Complete Neonatal Care</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose what should happen to <span className="font-bold text-foreground">{kitten?.name}</span>. Neonatal care history will be preserved.
        </p>

        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Move to Pet Profiles</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Create a standard foster Pet Profile and carry over the kitten’s identity, photo, notes, and latest weight.
              </p>
            </div>
          </div>
          {confirming === "graduate" ? (
            <div className="rounded-xl bg-card border border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Create the Pet Profile now? This kitten will leave active neonatal care.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setConfirming("")} disabled={!!working}>Cancel</Button>
                <Button onClick={() => run("graduate")} disabled={!!working}>
                  {working === "graduate" ? "Moving…" : "Move to Pets"}
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" onClick={() => setConfirming("graduate")} disabled={!!working}>
              Move to Pet Profiles
            </Button>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Archive className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-foreground">Archive Kitten</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Remove this kitten from active schedules and alerts without creating a Pet Profile.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason} disabled={!!working}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {confirming === "archive" ? (
            <div className="rounded-xl bg-card border border-border p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Archive this kitten? It can be restored from the inactive-kittens section.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setConfirming("")} disabled={!!working}>Cancel</Button>
                <Button variant="secondary" onClick={() => run("archive")} disabled={!!working}>
                  {working === "archive" ? "Archiving…" : "Archive Kitten"}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setConfirming("archive")} disabled={!!working}>
              Archive Kitten
            </Button>
          )}
        </section>

        {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
