import { useMemo, useState } from "react";
import { CalendarDays, PawPrint } from "lucide-react";
import { formatAge } from "@/utils/pet";

const localToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "Date needed";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const availabilityText = (date, today) =>
  !date || date <= today ? "Available Now" : `Available ${formatDate(date)}`;

export default function AdoptionTab({ pets = [], kittens = [], onOpenPet, onOpenKitten }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const today = localToday();

  const animals = useMemo(() => {
    const petRows = pets
      .filter((pet) => pet.available_for_adoption)
      .map((pet) => ({
        id: pet.id,
        kind: "pet",
        name: pet.name,
        photo_url: pet.photo_url,
        species: pet.species || "pet",
        sex: pet.sex,
        birth_date: pet.birth_date,
        available_date: pet.adoption_available_date || "",
      }));

    const kittenRows = kittens
      .filter((kitten) => kitten.active !== false && kitten.available_for_adoption)
      .map((kitten) => ({
        id: kitten.id,
        kind: "neonatal",
        name: kitten.name,
        photo_url: kitten.photo_url,
        species: "cat",
        sex: kitten.sex,
        birth_date: kitten.birth_date?.slice(0, 10) || "",
        available_date: kitten.adoption_available_date || "",
      }));

    return [...petRows, ...kittenRows].sort((a, b) => {
      const aDate = a.available_date || today;
      const bDate = b.available_date || today;
      const aNow = aDate <= today;
      const bNow = bDate <= today;
      if (aNow !== bNow) return aNow ? -1 : 1;
      return aDate.localeCompare(bDate) || a.name.localeCompare(b.name);
    });
  }, [pets, kittens, today]);

  const visible = typeFilter === "all"
    ? animals
    : animals.filter((animal) => animal.kind === typeFilter);

  const hasNeonatal = kittens.some((kitten) => kitten.active !== false && kitten.available_for_adoption);

  return (
    <div>
      <div className="rounded-2xl p-4 mb-4 bg-green-500/10 border border-green-500/25">
        <div className="flex items-center gap-2">
          <PawPrint className="h-4 w-4 text-green-600" />
          <p className="text-sm font-black text-foreground">Available for Adoption</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Available animals appear first, followed by upcoming availability from nearest to farthest.
        </p>
      </div>

      {hasNeonatal && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[
            ["all", "All"],
            ["pet", "Pet Profiles"],
            ["neonatal", "Neonatal"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                typeFilter === value
                  ? "text-primary-foreground bg-primary"
                  : "text-muted-foreground bg-muted border border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((animal) => {
          const availableNow = !animal.available_date || animal.available_date <= today;
          return (
            <button
              key={`${animal.kind}-${animal.id}`}
              type="button"
              onClick={() => animal.kind === "pet" ? onOpenPet(animal.id) : onOpenKitten(animal.id)}
              className="w-full rounded-2xl p-4 flex items-center gap-3 text-left bg-card border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10">
                {animal.photo_url ? (
                  <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {animal.kind === "neonatal" ? "🐱" : "🐾"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-foreground text-sm">{animal.name}</p>
                  {animal.kind === "neonatal" && (
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold text-primary bg-primary/10">
                      Neonatal
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {animal.species}
                  {animal.sex && animal.sex !== "unknown" ? ` · ${animal.sex}` : ""}
                  {animal.birth_date ? ` · ${formatAge(animal.birth_date)}` : ""}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-xs font-bold ${availableNow ? "text-green-600" : "text-blue-500"}`}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  {availabilityText(animal.available_date, today)}
                </p>
              </div>
            </button>
          );
        })}

        {visible.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center rounded-2xl bg-card border border-border">
            <div className="text-4xl mb-3">🏡</div>
            <p className="text-sm font-bold text-foreground">No animals available yet</p>
            <p className="text-xs text-muted-foreground mt-1 px-6">
              Mark a Pet Profile or neonatal kitten as available to add it here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
