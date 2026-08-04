import { Plus } from "lucide-react";

export default function SectionCard({ title, icon: Icon, onAdd, addLabel = "Add", children, action }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-purple-400" />}
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {onAdd && (
            <button onClick={onAdd} className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 px-2 py-1 rounded-lg" style={{ background: "rgba(124,58,237,0.12)" }}>
              <Plus className="h-3.5 w-3.5" /> {addLabel}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}