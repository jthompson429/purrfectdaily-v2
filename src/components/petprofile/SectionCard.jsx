import { Plus } from "lucide-react";

export default function SectionCard({ title, icon: Icon, onAdd, addLabel = "Add", children, action }) {
  return (
    <div className="rounded-2xl p-4 bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {onAdd && (
            <button onClick={onAdd} className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 px-2 py-1 rounded-lg bg-primary/10">
              <Plus className="h-3.5 w-3.5" /> {addLabel}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}