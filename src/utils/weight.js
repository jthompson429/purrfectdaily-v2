const LB_PER_KG = 2.2046226218;

export const weightUnitForEntry = (entry, profileType) =>
  entry?.unit || (profileType === "neonatal" ? "g" : "kg");

export const convertWeight = (value, fromUnit, toUnit) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (fromUnit === toUnit) return numeric;

  const kilograms = fromUnit === "g"
    ? numeric / 1000
    : fromUnit === "lb"
      ? numeric / LB_PER_KG
      : numeric;

  if (toUnit === "g") return kilograms * 1000;
  if (toUnit === "lb") return kilograms * LB_PER_KG;
  return kilograms;
};

export const weightDisplayUnit = (profileType, preferredUnit) =>
  profileType === "neonatal" ? "g" : preferredUnit === "lb" ? "lb" : "kg";

export const displayWeightValue = (entry, profileType, preferredUnit) => {
  if (!entry) return null;
  const displayUnit = weightDisplayUnit(profileType, preferredUnit);
  const value = convertWeight(entry.weight, weightUnitForEntry(entry, profileType), displayUnit);
  if (value == null) return null;
  return displayUnit === "g"
    ? Number(value.toFixed(1))
    : Number(value.toFixed(2));
};
