// src/lib/cases.ts
import type { StudyRow, Gender } from "./studies";

/* ── fallbacki gdy w bazie czegoś brakuje ─────────────────────────────────── */

function toAccName(nameNom: string, gender: Gender): string {
  if (gender === "M") return nameNom;           // Marcin → Marcina (biernik=dopełniacz, ale bez GEN robimy no-op)
  if (nameNom.endsWith("a")) return nameNom.slice(0, -1) + "ę"; // Anna→Annę
  return nameNom;
}

function toAccSurname(surNom: string, gender: Gender): string {
  if (gender === "M") {
    if (surNom.endsWith("ek")) return surNom.slice(0, -2) + "ka"; // Gołek→Gołka
    return surNom;
  } else {
    if (surNom.endsWith("ska")) return surNom.slice(0, -3) + "ską";
    if (surNom.endsWith("cka")) return surNom.slice(0, -3) + "cką";
    if (surNom.endsWith("dzka")) return surNom.slice(0, -4) + "dzką";
    if (surNom.endsWith("zka")) return surNom.slice(0, -3) + "zką";
    if (surNom.endsWith("ka"))  return surNom.slice(0, -1) + "ą";
    if (surNom.endsWith("a"))   return surNom.slice(0, -1) + "ą";
    return surNom;
  }
}

function toInstrName(nameNom: string, gender: Gender): string {
  if (gender === "M") {
    if (nameNom.endsWith("ek")) return nameNom.slice(0, -2) + "kiem"; // Marek/Gołek→Markiem/Gołkiem
    if (nameNom.endsWith("a"))  return nameNom.slice(0, -1) + "ą";
    return nameNom + "em";                                          // Marcin→Marcinem
  } else {
    if (nameNom.endsWith("a")) return nameNom.slice(0, -1) + "ą";   // Anna→Anną
    return nameNom;
  }
}

function toInstrSurname(surNom: string, gender: Gender): string {
  if (gender === "M") {
    if (surNom.endsWith("ek")) return surNom.slice(0, -2) + "kiem"; // Gołek→Gołkiem
    if (surNom.endsWith("a"))  return surNom.slice(0, -1) + "ą";
    return surNom + "em";                                           // Kowalski→Kowalskim
  } else {
    if (surNom.endsWith("ska")) return surNom.slice(0, -3) + "ską";
    if (surNom.endsWith("cka")) return surNom.slice(0, -3) + "cką";
    if (surNom.endsWith("dzka")) return surNom.slice(0, -4) + "dzką";
    if (surNom.endsWith("zka")) return surNom.slice(0, -3) + "zką";
    if (surNom.endsWith("ka"))  return surNom.slice(0, -1) + "ą";
    if (surNom.endsWith("a"))   return surNom.slice(0, -1) + "ą";
    return surNom;
  }
}

/* ── wynik ────────────────────────────────────────────────────────────────── */

export interface BuiltCases {
  gender: Gender;
  nameNom: string;
  surNom: string;
  displayFullNom: string;    // „Anna Kowalska”
  displayFullGen: string;    // „Anny Kowalskiej”
  displayFullAcc: string;    // „Annę Kowalską”
  displayFullInstr: string;  // „Anną Kowalską” / „Marcinem Gołkiem”
  displayFullLoc: string;    // „o Annie Kowalskiej”
}

/** Składa frazy na podstawie rekordu z tabeli `studies` (bez JSX). */
export function buildCases(study: StudyRow): BuiltCases {
  const gender = study.gender;

  const nameNom = (study.first_name_nom || "").trim();
  const surNom  = (study.last_name_nom  || "").trim();

  const displayFullNom  = `${nameNom} ${surNom}`.trim();
  const displayFullGen  = `${(study.first_name_gen || nameNom).trim()} ${(study.last_name_gen || surNom).trim()}`.trim();

  const accName = toAccName(nameNom, gender);
  const accSur  = toAccSurname(surNom, gender);
  const displayFullAcc = `${accName} ${accSur}`.trim();

  const insName = (study.first_name_ins && study.first_name_ins.trim()) || toInstrName(nameNom, gender);
  const insSur  = (study.last_name_ins  && study.last_name_ins.trim())  || toInstrSurname(surNom, gender);
  const displayFullInstr = `${insName} ${insSur}`.trim();

  const locName = study.first_name_loc?.trim();
  const locSur  = study.last_name_loc?.trim();
  const displayFullLoc = (locName && locSur) ? `${locName} ${locSur}` : `o ${displayFullNom}`;

  return { gender, nameNom, surNom, displayFullNom, displayFullGen, displayFullAcc, displayFullInstr, displayFullLoc };
}
