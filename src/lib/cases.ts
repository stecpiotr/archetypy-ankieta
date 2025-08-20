// Proste fallbacki na wypadek braków w bazie – bez JSX.

export type Gender = "M" | "F";

/** Biernik imienia: gdy M → biernik=dopełniacz (jeśli brak GEN, zostawiamy NOM), gdy F: a→ę */
export function toAccName(nameNom: string, gender: Gender, nameGen?: string | null): string {
  if (!nameNom) return "";
  if (gender === "M") {
    if (nameGen && nameGen.trim()) return nameGen.trim(); // M: Acc = Gen
    return nameNom; // fallback
  }
  // F
  if (nameGen && nameGen.trim()) return nameGen.trim(); // u kobiet też często = Gen; jeśli brak, heurystyka:
  if (nameNom.endsWith("a")) return nameNom.slice(0, -1) + "ę";
  return nameNom;
}

/** Biernik nazwiska */
export function toAccSurname(surNom: string, gender: Gender, surGen?: string | null): string {
  if (!surNom) return "";
  if (gender === "M") {
    if (surGen && surGen.trim()) return surGen.trim(); // M: Acc = Gen
    if (surNom.endsWith("ek")) return surNom.slice(0, -2) + "ka"; // Gołek→Gołka
    return surNom;
  }
  // F
  if (surGen && surGen.trim()) return surGen.trim();
  if (surNom.endsWith("ska")) return surNom.slice(0, -3) + "ską";
  if (surNom.endsWith("cka")) return surNom.slice(0, -3) + "cką";
  if (surNom.endsWith("dzka")) return surNom.slice(0, -4) + "dzką";
  if (surNom.endsWith("zka"))  return surNom.slice(0, -3) + "zką";
  if (surNom.endsWith("ka"))   return surNom.slice(0, -1) + "ą";
  if (surNom.endsWith("a"))    return surNom.slice(0, -1) + "ą";
  return surNom;
}

/** Narzędnik imienia */
export function toInstrName(nameNom: string, gender: Gender): string {
  if (!nameNom) return "";
  if (gender === "M") {
    if (nameNom.endsWith("ek")) return nameNom.slice(0, -2) + "kiem"; // Marek/Gołek→Markiem/Gołkiem
    if (nameNom.endsWith("a"))  return nameNom.slice(0, -1) + "ą";
    return nameNom + "em"; // Marcin→Marcinem
  } else {
    if (nameNom.endsWith("a")) return nameNom.slice(0, -1) + "ą";   // Anna→Anną
    return nameNom;
  }
}

/** Narzędnik nazwiska */
export function toInstrSurname(surNom: string, gender: Gender): string {
  if (!surNom) return "";
  if (gender === "M") {
    if (surNom.endsWith("ek")) return surNom.slice(0, -2) + "kiem"; // Gołek→Gołkiem
    if (surNom.endsWith("a"))  return surNom.slice(0, -1) + "ą";
    return surNom + "em"; // Kowalski→Kowalskim
  } else {
    if (surNom.endsWith("ska")) return surNom.slice(0, -3) + "ską";
    if (surNom.endsWith("cka")) return surNom.slice(0, -3) + "cką";
    if (surNom.endsWith("dzka")) return surNom.slice(0, -4) + "dzką";
    if (surNom.endsWith("zka"))  return surNom.slice(0, -3) + "zką";
    if (surNom.endsWith("ka"))   return surNom.slice(0, -1) + "ą";
    if (surNom.endsWith("a"))    return surNom.slice(0, -1) + "ą";
    return surNom;
  }
}
