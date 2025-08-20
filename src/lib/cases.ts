import type { StudyRow, Gender } from "./studies";

/** Prosty helper – bezpieczne trim + null → "" */
function s(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/** Biernik dla imienia – mężczyźni: biernik = dopełniacz; kobiety: Anna→Annę itd. */
function toAccFirst(nameNom: string, nameGen: string, gender: Gender): string {
  const nom = s(nameNom);
  const gen = s(nameGen);
  if (!nom && !gen) return "";

  if (gender === "M") {
    // dla mężczyzn biernik = dopełniacz (jeśli gen jest w bazie – bierzemy go)
    return gen || nom;
  } else {
    // kobiety – najczęściej „a→ę”
    if (nom.endsWith("a")) return nom.slice(0, -1) + "ę";
    return nom; // np. „Oliwia” (czasem też „ę”), ale nie psujemy jeśli brak reguły
  }
}

/** Biernik dla nazwiska – M: biernik = dopełniacz (z bazy), F: odmiany żeńskie */
function toAccLast(lastNom: string, lastGen: string, gender: Gender): string {
  const nom = s(lastNom);
  const gen = s(lastGen);
  if (!nom && !gen) return "";

  if (gender === "M") {
    return gen || nom;
  } else {
    // żeńskie: -ska/-cka/-dzka/-zka → -ską/-cką/-dzką/-zką, końcowe -a → -ą
    if (nom.endsWith("ska")) return nom.slice(0, -3) + "ską";
    if (nom.endsWith("cka")) return nom.slice(0, -3) + "cką";
    if (nom.endsWith("dzka")) return nom.slice(0, -4) + "dzką";
    if (nom.endsWith("zka")) return nom.slice(0, -3) + "zką";
    if (nom.endsWith("ka")) return nom.slice(0, -1) + "ą";
    if (nom.endsWith("a")) return nom.slice(0, -1) + "ą";
    return nom;
  }
}

/** Narzędnik (fallback gdy panel nie poda) – np. „Marcinem Gołkiem”, „Anną Kowalską” */
function toInstrFirst(nom: string, gender: Gender): string {
  const n = s(nom);
  if (!n) return "";
  if (gender === "M") {
    if (n.endsWith("ek")) return n.slice(0, -2) + "kiem"; // „Gołek→Gołkiem”
    if (n.endsWith("a")) return n.slice(0, -1) + "ą";
    return n + "em"; // „Marcin→Marcinem”
  } else {
    if (n.endsWith("a")) return n.slice(0, -1) + "ą"; // „Anna→Anną”
    return n;
  }
}
function toInstrLast(nom: string, gender: Gender): string {
  const n = s(nom);
  if (!n) return "";
  if (gender === "M") {
    if (n.endsWith("ek")) return n.slice(0, -2) + "kiem"; // „Gołek→Gołkiem”
    if (n.endsWith("a")) return n.slice(0, -1) + "ą";
    return n + "em"; // „Kowalski→Kowalskim”
  } else {
    if (n.endsWith("ska")) return n.slice(0, -3) + "ską";
    if (n.endsWith("cka")) return n.slice(0, -3) + "cką";
    if (n.endsWith("dzka")) return n.slice(0, -4) + "dzką";
    if (n.endsWith("zka")) return n.slice(0, -3) + "zką";
    if (n.endsWith("ka")) return n.slice(0, -1) + "ą";
    if (n.endsWith("a")) return n.slice(0, -1) + "ą";
    return n;
  }
}

/** Lokatyw – bierzemy z bazy; jeśli brak, generujemy fallback + wyjątek „Janusza→Januszy” (F) */
function buildLoc(firstNom: string, lastNom: string, gender: Gender, firstLoc?: string | null, lastLoc?: string | null): string {
  const locFirst = s(firstLoc);
  const locLast = s(lastLoc);
  if (locFirst && locLast) return `${locFirst} ${locLast}`.trim();

  // Fallback: „o {imieniu nazwisku}” + prościutki wyjątek Janusza→Januszy dla kobiet
  const nomFirst = s(firstNom);
  const nomLast = s(lastNom);

  let first = nomFirst;
  if (!locFirst && gender === "F" && nomFirst.toLowerCase() === "janusza") {
    first = "Januszy";
  }
  return `o ${[first, nomLast].filter(Boolean).join(" ")}`.trim();
}

export interface BuiltCases {
  gender: Gender;
  nameNom: string;
  surNom: string;
  displayFullNom: string;   // „Anna Kowalska”
  displayFullGen: string;   // „Anny Kowalskiej”
  displayFullAcc: string;   // „Annę Kowalską” / „Marcina Gołka”
  displayFullInstr: string; // „Anną Kowalską” / „Marcinem Gołkiem”
  displayFullLoc: string;   // „o Annie Kowalskiej” / „o Januszy Kowalskiej”
}

export function buildCases(study: StudyRow): BuiltCases {
  const gender = study.gender;

  const fnNom = s(study.first_name_nom);
  const fnGen = s(study.first_name_gen);
  const lnNom = s(study.last_name_nom);
  const lnGen = s(study.last_name_gen);

  const displayFullNom = [fnNom, lnNom].filter(Boolean).join(" ").trim();
  const displayFullGen = [fnGen || fnNom, lnGen || lnNom].filter(Boolean).join(" ").trim();

  const accFirst = toAccFirst(fnNom, fnGen, gender);
  const accLast  = toAccLast(lnNom, lnGen, gender);
  const displayFullAcc = [accFirst, accLast].filter(Boolean).join(" ").trim();

  const insFirst = toInstrFirst(fnNom, gender);
  const insLast  = toInstrLast(lnNom, gender);
  const displayFullInstr = [insFirst, insLast].filter(Boolean).join(" ").trim();

  const displayFullLoc = buildLoc(fnNom, lnNom, gender, study.first_name_loc, study.last_name_loc);

  return {
    gender,
    nameNom: fnNom,
    surNom: lnNom,
    displayFullNom,
    displayFullGen,
    displayFullAcc,
    displayFullInstr,
    displayFullLoc,
  };
}
