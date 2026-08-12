import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Check, ClipboardList, Clock3, Filter, MapPin,
  MessageSquarePlus, Pencil, Pin, PinOff, Plus, UserRound,
} from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsCreate, wsUpdate } from "@/lib/workspaceApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES = {
  observation: "Observation",
  handoff: "Handoff",
  supply: "Supply",
  behavior: "Behavior",
  medical: "Medical",
  other: "Other",
};

const PRIORITY_STYLES = {
  normal: "border-border bg-card",
  important: "border-amber-500/35 bg-amber-500/5",
  urgent: "border-destructive/40 bg-destructive/5",
};

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function formatWhen(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function toLocalDateTimeValue(value) {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function emptyForm() {
  return {
    title: "", details: "", pet_id: "", category: "observation",
    priority: "normal", pinned: false, occurred_at: localDateTimeValue(),
  };
}

export default function Clipboard() {
  const { activeWorkspaceId, activeWorkspaceName, canWrite } = useWorkspace();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [view, setView] = useState("open");
  const [petFilter, setPetFilter] = useState("all");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: pets = [] } = useQuery({
    queryKey: ["pets", activeWorkspaceId],
    queryFn: () => base44.entities.PetProfile.filter(
      { workspace_id: activeWorkspaceId, active: true },
      "sort_order"
    ),
    enabled: Boolean(activeWorkspaceId),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["clipboardEntries", activeWorkspaceId],
    queryFn: () => base44.entities.ClipboardEntry.filter(
      { workspace_id: activeWorkspaceId },
      "-occurred_at",
      250
    ),
    enabled: Boolean(activeWorkspaceId),
  });

  const refresh = () => qc.invalidateQueries({
    queryKey: ["clipboardEntries", activeWorkspaceId],
  });

  const createEntry = useMutation({
    mutationFn: (data) => wsCreate("ClipboardEntry", data, activeWorkspaceId),
    onSuccess: () => {
      refresh();
      setDialogOpen(false);
      setError("");
      setEditingEntry(null);
      setForm(emptyForm());
    },
    onError: (e) => setError(e.message),
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, data }) => wsUpdate("ClipboardEntry", id, data, activeWorkspaceId),
    onSuccess: refresh,
  });

  const saveEdit = useMutation({
    mutationFn: ({ id, data }) => wsUpdate("ClipboardEntry", id, data, activeWorkspaceId),
    onSuccess: () => {
      refresh();
      setDialogOpen(false);
      setEditingEntry(null);
      setError("");
      setForm(emptyForm());
    },
    onError: (e) => setError(e.message),
  });

  const petById = useMemo(
    () => Object.fromEntries(pets.map((pet) => [pet.id, pet])),
    [pets]
  );

  const visibleEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.status === view)
      .filter((entry) => petFilter === "all" || entry.pet_id === petFilter)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const priority = { urgent: 0, important: 1, normal: 2 };
        const priorityDiff = priority[a.priority] - priority[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.occurred_at || b.created_date) - new Date(a.occurred_at || a.created_date);
      });
  }, [entries, petFilter, view]);

  const openCount = entries.filter((entry) => entry.status === "open").length;
  const urgentCount = entries.filter(
    (entry) => entry.status === "open" && entry.priority === "urgent"
  ).length;

  const submit = (event) => {
    event.preventDefault();
    setError("");
    if (!form.title.trim() || !form.details.trim()) {
      setError("Add a short title and the information others need to know.");
      return;
    }
    const entryData = {
      ...form,
      title: form.title.trim(),
      details: form.details.trim(),
      pet_id: form.pet_id || "",
      occurred_at: new Date(form.occurred_at).toISOString(),
    };

    if (editingEntry) {
      saveEdit.mutate({ id: editingEntry.id, data: entryData });
      return;
    }

    createEntry.mutate({
      ...entryData,
      status: "open",
      created_by_id: user?.id || "",
      created_by_name: user?.full_name || user?.email || "Workspace member",
    });
  };

  const openNewEntry = () => {
    setEditingEntry(null);
    setForm(emptyForm());
    setError("");
    setDialogOpen(true);
  };

  const openEditEntry = (entry) => {
    setEditingEntry(entry);
    setForm({
      title: entry.title || "",
      details: entry.details || "",
      pet_id: entry.pet_id || "",
      category: entry.category || "observation",
      priority: entry.priority || "normal",
      pinned: Boolean(entry.pinned),
      occurred_at: toLocalDateTimeValue(entry.occurred_at || entry.created_date),
    });
    setError("");
    setDialogOpen(true);
  };

  const resolve = (entry) => updateEntry.mutate({
    id: entry.id,
    data: {
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by_id: user?.id || "",
      resolved_by_name: user?.full_name || user?.email || "Workspace member",
    },
  });

  const reopen = (entry) => updateEntry.mutate({
    id: entry.id,
    data: {
      status: "open",
      resolved_at: null,
      resolved_by_id: "",
      resolved_by_name: "",
    },
  });

  const togglePin = (entry) => updateEntry.mutate({
    id: entry.id,
    data: { pinned: !entry.pinned },
  });

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-3xl mx-auto px-4 py-5 pb-24">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-black font-heading">Digital Clipboard</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Shared observations and handoffs for {activeWorkspaceName || "this workspace"}.
            </p>
          </div>
          {canWrite && (
            <Button onClick={openNewEntry} className="rounded-xl shrink-0">
              <Plus className="h-4 w-4" /> Add entry
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Open entries</p>
            <p className="text-2xl font-black mt-1">{openCount}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${urgentCount ? "border-destructive/35 bg-destructive/5" : "bg-card"}`}>
            <p className="text-xs text-muted-foreground">Urgent</p>
            <p className={`text-2xl font-black mt-1 ${urgentCount ? "text-destructive" : ""}`}>
              {urgentCount}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="flex rounded-xl bg-muted p-1">
            {[
              ["open", `Open (${openCount})`],
              ["resolved", "Resolved"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative flex-1 sm:max-w-xs">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              value={petFilter}
              onChange={(event) => setPetFilter(event.target.value)}
              className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-sm"
            >
              <option value="all">All pets and general notes</option>
              {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
            </select>
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-40 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-12 text-center">
            <MessageSquarePlus className="h-9 w-9 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-bold">{view === "open" ? "The clipboard is clear" : "No resolved entries yet"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {view === "open" ? "Add an observation or handoff when the team needs it." : "Resolved items remain available for reference."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleEntries.map((entry) => {
              const pet = petById[entry.pet_id];
              return (
                <article key={entry.id} className={`rounded-2xl border p-4 shadow-sm ${PRIORITY_STYLES[entry.priority] || PRIORITY_STYLES.normal}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {entry.pinned && <Pin className="h-3.5 w-3.5 text-primary fill-primary" />}
                        {entry.priority !== "normal" && (
                          <span className={`text-[10px] uppercase tracking-wider font-black ${entry.priority === "urgent" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}`}>
                            {entry.priority === "urgent" && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                            {entry.priority}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          {CATEGORIES[entry.category] || "Other"}
                        </span>
                      </div>
                      <h2 className="font-black text-base leading-tight">{entry.title}</h2>
                    </div>
                    {canWrite && (
                      <div className="flex items-center">
                        <button
                          onClick={() => openEditEntry(entry)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
                          aria-label="Edit entry"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => togglePin(entry)}
                          disabled={updateEntry.isPending}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
                          aria-label={entry.pinned ? "Unpin entry" : "Pin entry"}
                          title={entry.pinned ? "Unpin" : "Pin"}
                        >
                          {entry.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed whitespace-pre-wrap mt-3">{entry.details}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
                    {pet && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{pet.name}</span>}
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatWhen(entry.occurred_at || entry.created_date)}</span>
                    <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{entry.created_by_name || "Workspace member"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t">
                    {entry.status === "resolved" ? (
                      <p className="text-xs text-muted-foreground">
                        Resolved{entry.resolved_by_name ? ` by ${entry.resolved_by_name}` : ""}
                      </p>
                    ) : <span />}
                    {canWrite && (
                      entry.status === "open" ? (
                        <Button variant="outline" size="sm" onClick={() => resolve(entry)} disabled={updateEntry.isPending}>
                          <Check className="h-4 w-4" /> Resolve
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => reopen(entry)} disabled={updateEntry.isPending}>
                          Reopen
                        </Button>
                      )
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingEntry(null);
          setError("");
          setForm(emptyForm());
        }
      }}>
        <DialogContent className="sm:rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit clipboard entry" : "Add clipboard entry"}</DialogTitle>
            <DialogDescription>
              {editingEntry
                ? "Update this shared entry. The workspace audit log will record the change."
                : "Record something the next caregiver or workspace member needs to see."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-bold">Title</label>
              <Input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Short, scannable summary"
                maxLength={120}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-bold">Details</label>
              <Textarea
                value={form.details}
                onChange={(event) => setForm({ ...form, details: event.target.value })}
                placeholder="What happened, what was observed, or what should the next person know?"
                className="mt-1 min-h-28"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold">Related pet</label>
                <select
                  value={form.pet_id}
                  onChange={(event) => setForm({ ...form, pet_id: event.target.value })}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">General / no pet</option>
                  {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold">Category</label>
                <select
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold">Priority</label>
                <select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold">Occurred</label>
                <Input
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={(event) => setForm({ ...form, occurred_at: event.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-xl border p-3 text-sm">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
                className="h-4 w-4"
              />
              Pin this entry to the top
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createEntry.isPending || saveEdit.isPending}>
                {createEntry.isPending || saveEdit.isPending
                  ? "Saving…"
                  : editingEntry ? "Save changes" : "Add to clipboard"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
