const FILTERS = [
  { value: "all", label: "All" },
  { value: "todo", label: "Active" },
  { value: "done", label: "Complete" },
];

export default function MissionFilter({ filter, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            filter === f.value
              ? "gradient-purple text-white shadow-lg"
              : "glass text-white/40 hover:text-white/70"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}