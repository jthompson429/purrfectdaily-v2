import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { weightTrend } from "@/utils/neonatal";

const RANGES = [
  { key: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "all", label: "All", ms: Infinity },
];

function Stat({ label, value, valueColor }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">{label}</p>
      <p className={`text-base font-black mt-0.5 ${valueColor || "text-white"}`}>{value}</p>
    </div>
  );
}

export default function NeonatalGrowth() {
  const [range, setRange] = useState("7d");
  const { data: weights = [] } = useQuery({ queryKey: ["neonatalWeights"], queryFn: () => base44.entities.NeonatalWeight.list("-date_time", 500) });
  const { data: kittens = [] } = useQuery({ queryKey: ["neonatalKittens"], queryFn: () => base44.entities.NeonatalKitten.list() });
  const kitten = kittens[0] || null;

  const sorted = useMemo(() => [...weights].sort((a, b) => new Date(a.date_time) - new Date(b.date_time)), [weights]);
  const trend = weightTrend(weights);

  const rangeMs = RANGES.find((r) => r.key === range).ms;
  const cutoff = rangeMs === Infinity ? 0 : Date.now() - rangeMs;
  const filtered = sorted.filter((w) => new Date(w.date_time).getTime() >= cutoff);

  const startWeight = sorted[0]?.weight_g ?? kitten?.current_weight_g ?? 0;
  const startTs = sorted[0] ? new Date(sorted[0].date_time).getTime() : Date.now();

  const chartData = useMemo(
    () =>
      filtered.map((w) => {
        const ts = new Date(w.date_time).getTime();
        const days = (ts - startTs) / (24 * 60 * 60 * 1000);
        return {
          label: format(new Date(ts), "MMM d HH:mm"),
          weight: w.weight_g,
          expectedMin: Math.round((startWeight + 10 * days) * 10) / 10,
          expectedMax: Math.round((startWeight + 15 * days) * 10) / 10,
        };
      }),
    [filtered, startWeight, startTs]
  );

  return (
    <div className="min-h-full" style={{ background: "#0f1117" }}>
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/neonatal" className="h-10 w-10 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">Growth</h1>
            <p className="text-white/40 text-xs">{kitten ? kitten.name : "—"} · Weight over time</p>
          </div>
          <TrendingUp className="h-6 w-6 text-purple-400" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Current" value={trend.hasData ? `${trend.latest} g` : "—"} />
          <Stat label="Starting" value={sorted.length ? `${sorted[0].weight_g} g` : "—"} />
          <Stat label="Avg/day" value={trend.avgDaily != null ? `${trend.avgDaily >= 0 ? "+" : ""}${trend.avgDaily.toFixed(1)} g` : "—"} valueColor={trend.avgDaily != null ? (trend.avgDaily >= 0 ? "text-green-400" : "text-red-400") : "text-white"} />
        </div>

        <div className="flex gap-1.5 mb-3 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${range === r.key ? "text-white" : "text-white/30"}`} style={range === r.key ? { background: "linear-gradient(135deg, #7c3aed, #3b82f6)" } : {}}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 9 }} angle={-25} textAnchor="end" height={56} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 9 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#1a1d28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="expectedMin" stroke="rgba(16,185,129,0.45)" strokeDasharray="5 4" dot={false} name="Expected min (10g/day)" />
                <Line type="monotone" dataKey="expectedMax" stroke="rgba(16,185,129,0.45)" strokeDasharray="5 4" dot={false} name="Expected max (15g/day)" />
                <Line type="monotone" dataKey="weight" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: "#a78bfa" }} name="Weight (g)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-white/30 text-sm py-16">No weight records in this range</p>
          )}
        </div>

        <div className="rounded-2xl p-3 mt-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <p className="text-xs text-green-300/80">
            <b>Target guidance:</b> Expected gain 10–15 g/day. Dashed green lines show the expected weight range based on the first recorded weight. (Visual only — no alerts.)
          </p>
        </div>
      </div>
    </div>
  );
}