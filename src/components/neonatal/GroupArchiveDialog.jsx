import { useEffect, useState } from "react";
import { Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function GroupArchiveDialog({ open, onOpenChange, group, onArchive }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setWorking(false);
    setError("");
  }, [open, group?.id]);

  const archive = async () => {
    setWorking(true);
    setError("");
    try {
      await onArchive();
    } catch (err) {
      setError(err?.message || "Could not archive this group. Please try again.");
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !working && onOpenChange(next)}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Archive Neonatal Group</DialogTitle>
        </DialogHeader>
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <div className="flex items-start gap-3">
            <Archive className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">{group?.group_name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                The group will leave the active Neonatal Dashboard. Its kittens and all historical care records will remain available in Neonatal History.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Only groups with no active kittens can be archived.
        </p>
        {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>Cancel</Button>
          <Button onClick={archive} disabled={working}>
            {working ? "Archiving…" : "Archive Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
