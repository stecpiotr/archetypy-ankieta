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

/* ───────────────────────── Heurystyki awaryjne (tylko gdy w DB brak) ───────────────────────── */

function trimOrEmpty(v?: string | null): string {
  return (v ?? "").trim();
}

function nomFirst(study: StudyRow): string {
  return trimOrEmpty(study.first_name_nom) || trimOrEmpty(study.first_name);
}

function nomLast(study: StudyRow): string {
  return trimOrEmpty(study.last_name_nom) || trimOrEmpty(study.last_name);
}

/** Biernik imienia – fallback gdy w DB brak */
function guessAccFirst(nom: string, gender: Gender, genFromDb?: string | null): string {
  const gen = trimOrEmpty(genFromDb);
  // U mężczyzn biernik = dopełniacz (osoba żywotna): Marcin→Marcina, Piotr→Piotra, Paweł→Pawła
  if (gender === "M") return gen || nom;
  // Kobiety: zwykle -a → -ę (Anna→Annę), inaczej bez zmiany
  if (nom.endsWith("a")) return nom.slice(0, -1) + "ę";
  return nom;
}

/** Biernik nazwiska – fallback gdy w DB brak */
function guessAccLast(nom: string, gender: Gender, genFromDb?: string | null): string {
  const gen = trimOrEmpty(genFromDb);

  if (gender === "M") {
    // typowe wzorce męskie:
    if (nom.endsWith("ek")) return nom.slice(0, -2) + "ka";   // Gołek→Gołka
    if (nom.endsWith("eł")) return nom.slice(0, -1) + "ła";   // (rzadziej spotykane)
    if (nom.endsWith("a"))  return nom.slice(0, -1) + "ę";    // Batyra→Batyrę (kluczowa poprawka)
    // wiele nazwisk męskich ma biernik = dopełniacz (Kowalski→Kowalskiego, Nowak→Nowaka, itd.)
    return gen || nom;
  } else {
    // wzorce żeńskie: -ska/-cka/-dzka/-zka/-ka/-a → końcówka z „ą”
    if (nom.endsWith("ska")) return nom.slice(0, -3) + "ską";
    if (nom.endsWith("cka")) return nom.slice(0, -3) + "cką";
    if (nom.endsWith("dzka")) return nom.slice(0, -4) + "dzką";
    if (nom.endsWith("zka")) return nom.slice(0, -3) + "zką";
    if (nom.endsWith("ka"))  return nom.slice(0, -1) + "ą";
    if (nom.endsWith("a"))   return nom.slice(0, -1) + "ą";
    return nom;
  }
}

/** Narzędnik imienia – fallback */
function guessInsFirst(nom: string, gender: Gender): string {
  if (gender === "M") {
    if (nom.endsWith("ek")) return nom.slice(0, -2) + "kiem";
    if (nom.endsWith("a"))  return nom.slice(0, -1) + "ą";
    return nom + "em"; // Marcinem, Piotrem (tu idea fix – Piotr→Piotrem zrobi baza; heurystyka zostaje neutralna)
  } else {
    if (nom.endsWith("a")) return nom.slice(0, -1) + "ą";
    return nom;
  }
}

/** Narzędnik nazwiska – fallback */
function guessInsLast(nom: string, gender: Gender): string {
  if (gender === "M") {
    if (nom.endsWith("ek")) return nom.slice(0, -2) + "kiem"; // Gołkiem
    if (nom.endsWith("a"))  return nom.slice(0, -1) + "ą";    // Batyrą
    return nom + "em";                                        // Kowalskim
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
function guessLocFull(firstNom: string, lastNom: string): string {
  // Bez zabawy – jeśli nie mamy z DB, wpisujemy „o {Nom} {Nom}”
  return `o ${firstNom} ${lastNom}`.trim();
}

/* ───────────────────────── Builder używany przez App/Questionnaire/Thanks ───────────────────────── */

export interface BuiltDisplay {
  gender: Gender;
  surNom: string;      // nazwisko w mianowniku (do „Kowalska Team”)
  fullNom: string;     // Marcin Gołek
  fullGen: string;     // Marcina Gołka
  fullAcc: string;     // Marcina Gołka / Annę Kowalską / Pawła Batyrę
  fullIns: string;     // Marcinem Gołkiem / Anną Kowalską
  fullLoc: string;     // Marcinie Gołku / Annie Kowalskiej / Emilu Stecu...
}

/** Składanie fraz z przewagą danych z bazy. Heurystyki tylko gdy w DB brak. */
export function buildDisplayFromStudy(study: StudyRow): BuiltDisplay {
  const gender = study.gender;

  // mianownik
  const fnNom = nomFirst(study);
  const lnNom = nomLast(study);

  // dopełniacz
  const fnGen = trimOrEmpty(study.first_name_gen) || fnNom;
  const lnGen = trimOrEmpty(study.last_name_gen) || lnNom;

  // biernik (KLUCZOWE)
  const fnAcc = trimOrEmpty(study.first_name_acc) || guessAccFirst(fnNom, gender, study.first_name_gen);
  const lnAcc = trimOrEmpty(study.last_name_acc) || guessAccLast(lnNom, gender, study.last_name_gen);

  // narzędnik
  const fnIns = trimOrEmpty(study.first_name_ins) || guessInsFirst(fnNom, gender);
  const lnIns = trimOrEmpty(study.last_name_ins) || guessInsLast(lnNom, gender);

  // miejscownik
  let fullLoc = "";
  const fnLoc = trimOrEmpty(study.first_name_loc);
  const lnLoc = trimOrEmpty(study.last_name_loc);
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
