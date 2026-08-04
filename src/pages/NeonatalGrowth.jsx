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
    <div className="rounded-2xl p-3 bg-card border border-border">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className={`text-base font-black mt-0.5 ${valueColor || "text-foreground"}`}>{value}</p>
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
    <div className="min-h-full bg-background">
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/neonatal" className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all bg-muted border border-border">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground font-heading">Growth</h1>
            <p className="text-muted-foreground text-xs">{kitten ? kitten.name : "—"} · Weight over time</p>
          </div>
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Current" value={trend.hasData ? `${trend.latest} g` : "—"} />
          <Stat label="Starting" value={sorted.length ? `${sorted[0].weight_g} g` : "—"} />
          <Stat label="Avg/day" value={trend.avgDaily != null ? `${trend.avgDaily >= 0 ? "+" : ""}${trend.avgDaily.toFixed(1)} g` : "—"} valueColor={trend.avgDaily != null ? (trend.avgDaily >= 0 ? "text-green-500" : "text-red-500") : "text-foreground"} />
        </div>

        <div className="flex gap-1.5 mb-3 p-1 rounded-2xl bg-muted">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${range === r.key ? "text-primary-foreground bg-primary" : "text-muted-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl p-3 bg-card border border-border">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} angle={-25} textAnchor="end" height={56} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="expectedMin" stroke="rgba(16,185,129,0.45)" strokeDasharray="5 4" dot={false} name="Expected min (10g/day)" />
                <Line type="monotone" dataKey="expectedMax" stroke="rgba(16,185,129,0.45)" strokeDasharray="5 4" dot={false} name="Expected max (15g/day)" />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} name="Weight (g)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-16">No weight records in this range</p>
          )}
        </div>

        <div className="rounded-2xl p-3 mt-3 bg-green-500/8 border border-green-500/20">
          <p className="text-xs text-green-600">
            <b>Target guidance:</b> Expected gain 10–15 g/day. Dashed green lines show the expected weight range based on the first recorded weight. (Visual only — no alerts.)
          </p>
        </div>
      </div>
    </div>
  );
}