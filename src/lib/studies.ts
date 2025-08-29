// src/lib/studies.ts
import { supabase } from "../supabaseClient";

/** Rodzaj */
export type Gender = "M" | "F";

/** Minimalny rekord badania – z odmianami, jeśli są w bazie */
export interface StudyRow {
  slug: string;
  is_active: boolean;

  first_name: string;   // historyczne
  last_name: string;    // historyczne
  city: string | null;
  gender: Gender;

  // Mianownik (jeżeli przechowujesz)
  first_name_nom?: string | null;
  last_name_nom?: string | null;

  // Dopełniacz
  first_name_gen?: string | null;
  last_name_gen?: string | null;

  // Celownik
  first_name_dat?: string | null;
  last_name_dat?: string | null;

  // Biernik
  first_name_acc?: string | null;
  last_name_acc?: string | null;

  // Narzędnik
  first_name_ins?: string | null;
  last_name_ins?: string | null;

  // Miejscownik
  first_name_loc?: string | null;
  last_name_loc?: string | null;

  // Wołacz
  first_name_voc?: string | null;
  last_name_voc?: string | null;
}

/** Z path: preferujemy /slug, a w rezerwie ?s=... */
export function getSlugFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (seg) return decodeURIComponent(seg);
    const qs = url.searchParams.get("s");
    return qs ? qs.trim() : null;
  } catch {
    return null;
  }
}

/** Ładowanie rekordu badania po slugu */
export async function loadStudyBySlug(slug: string): Promise<StudyRow | null> {
  const { data, error } = await supabase
    .from("studies")
    .select(
      [
        "slug",
        "is_active",
        "first_name",
        "last_name",
        "city",
        "gender",

        "first_name_nom", "last_name_nom",
        "first_name_gen", "last_name_gen",
        "first_name_dat", "last_name_dat",
        "first_name_acc", "last_name_acc",
        "first_name_ins", "last_name_ins",
        "first_name_loc", "last_name_loc",
        "first_name_voc", "last_name_voc",
      ].join(",")
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("loadStudyBySlug error:", error);
    return null;
  }
  return (data as StudyRow) || null;
}

/* ───────────── Heurystyki awaryjne (używane TYLKO gdy w DB brakuje) ───────────── */

function t(v?: string | null): string { return (v ?? "").trim(); }
function nomFirst(s: StudyRow): string { return t(s.first_name_nom) || t(s.first_name); }
function nomLast(s: StudyRow): string { return t(s.last_name_nom)  || t(s.last_name); }

/** Biernik imienia – fallback */
function guessAccFirst(nom: string, gender: Gender, genFromDb?: string | null): string {
  const gen = t(genFromDb);
  // U mężczyzn biernik = dopełniacz (osoba żywotna): Marcin→Marcina, Piotr→Piotra, Paweł→Pawła
  if (gender === "M") return gen || nom;
  // Kobiety: zwykle -a → -ę (Anna→Annę), inaczej bez zmiany
  if (nom.endsWith("a")) return nom.slice(0, -1) + "ę";
  return nom;
}

/** Biernik nazwiska – fallback */
function guessAccLast(nom: string, gender: Gender, genFromDb?: string | null): string {
  const gen = t(genFromDb);
  if (gender === "M") {
    if (nom.endsWith("ek")) return nom.slice(0, -2) + "ka"; // Gołek→Gołka
    if (nom.endsWith("a"))  return nom.slice(0, -1) + "ę";  // Batyra→Batyrę
    return gen || nom;                                     // Nowak→Nowaka itd.
  }
  // żeńskie
  if (nom.endsWith("ska")) return nom.slice(0, -3) + "ską";
  if (nom.endsWith("cka")) return nom.slice(0, -3) + "cką";
  if (nom.endsWith("dzka")) return nom.slice(0, -4) + "dzką";
  if (nom.endsWith("zka")) return nom.slice(0, -3) + "zką";
  if (nom.endsWith("ka"))  return nom.slice(0, -1) + "ą";
  if (nom.endsWith("a"))   return nom.slice(0, -1) + "ą";
  return nom;
}

/** Narzędnik imienia – fallback */
function guessInsFirst(nom: string, gender: Gender): string {
  if (gender === "M") {
    if (nom.endsWith("ek")) return nom.slice(0, -2) + "kiem";
    if (nom.endsWith("a"))  return nom.slice(0, -1) + "ą";
    return nom + "em"; // Marcinem; Piotr→Piotrem zrobi DB, to tylko awaryjne
  } else {
    if (nom.endsWith("a")) return nom.slice(0, -1) + "ą";
    return nom;
  }
}

/** Narzędnik nazwiska – fallback */
function guessInsLast(nom: string, gender: Gender): string {
  if (gender === "M") {
    if (nom.endsWith("ek")) return nom.slice(0, -2) + "kiem";
    if (nom.endsWith("a"))  return nom.slice(0, -1) + "ą";  // Batyrą
    return nom + "em";                                      // Kowalskim
  } else {
    if (nom.endsWith("ska")) return nom.slice(0, -3) + "ską";
    if (nom.endsWith("cka")) return nom.slice(0, -3) + "cką";
    if (nom.endsWith("dzka")) return nom.slice(0, -4) + "dzką";
    if (nom.endsWith("zka")) return nom.slice(0, -3) + "zką";
    if (nom.endsWith("ka"))  return nom.slice(0, -1) + "ą";
    if (nom.endsWith("a"))   return nom.slice(0, -1) + "ą";
    return nom;
  }
}

/** Miejscownik pełny – fallback */
function guessLocFull(fnNom: string, lnNom: string): string {
  return `o ${fnNom} ${lnNom}`.trim();
}

/* ───────────── Builder używany przez App/Questionnaire/Thanks ───────────── */

export interface BuiltDisplay {
  gender: Gender;
  surNom: string;      // nazwisko w mianowniku (np. do „Kowalska Team”)
  fullNom: string;     // Marcin Gołek
  fullGen: string;     // Marcina Gołka
  fullAcc: string;     // Marcina Gołka / Annę Kowalską / Pawła Batyrę
  fullIns: string;     // Marcinem Gołkiem / Anną Kowalską
  fullLoc: string;     // Marcinie Gołku / Annie Kowalskiej / Emilu Stecu...
}

export function buildDisplayFromStudy(study: StudyRow): BuiltDisplay {
  const gender = study.gender;

  // mianownik
  const fnNom = nomFirst(study);
  const lnNom = nomLast(study);

  // dopełniacz
  const fnGen = t(study.first_name_gen) || fnNom;
  const lnGen = t(study.last_name_gen) || lnNom;

  // biernik
  const fnAcc = t(study.first_name_acc) || guessAccFirst(fnNom, gender, study.first_name_gen);
  const lnAcc = t(study.last_name_acc)  || guessAccLast(lnNom, gender, study.last_name_gen);

  // narzędnik
  const fnIns = t(study.first_name_ins) || guessInsFirst(fnNom, gender);
  const lnIns = t(study.last_name_ins)  || guessInsLast(lnNom, gender);

  // miejscownik (pełna fraza)
  let fullLoc = "";
  const fnLoc = t(study.first_name_loc);
  const lnLoc = t(study.last_name_loc);
  if (fnLoc && lnLoc) fullLoc = `${fnLoc} ${lnLoc}`;
  else fullLoc = guessLocFull(fnNom, lnNom);

  return {
    gender,
    surNom: lnNom,
    fullNom: `${fnNom} ${lnNom}`.trim(),
    fullGen: `${fnGen} ${lnGen}`.trim(),
    fullAcc: `${fnAcc} ${lnAcc}`.trim(),
    fullIns: `${fnIns} ${lnIns}`.trim(),
    fullLoc,
  };
}
// ───────────────────────────────────────────────
// Pobieranie tokenu ?t=... z adresu URL (dla SMS)
// ───────────────────────────────────────────────
export function getTokenFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("t");
    return t && t.trim() ? t.trim() : null;
  } catch {
    return null;
  }
}
