// src/lib/cases.ts
import type { StudyRow, Gender } from "./studies";

export interface Cases {
  gender: Gender;

  nameNom: string;   // Marcin / Anna
  nameGen: string;   // Marcina / Anny
  nameAcc: string;   // Marcina / Annę (wyliczane)
  nameInstr: string; // Marcinem / Anną (wyliczane)
  nameLoc: string;   // Marcinie / Annie (wyliczane)

  surNom: string;    // Gołek / Kowalska
  surGen: string;    // Gołka / Kowalskiej
  surAcc: string;    // Gołka / Kowalską (wyliczane)
  surInstr: string;  // Gołkiem / Kowalską (wyliczane)
  surLoc: string;    // Gołku / Kowalskiej (wyliczane)

  cityNom: string;   // Lublin
  cityLoc: string;   // w Lublinie

  displayFullNom: string;    // Marcin Gołek / Anna Kowalska
  displayFullGen: string;    // Marcina Gołka / Anny Kowalskiej
  displayFullAcc: string;    // Marcina Gołka / Annę Kowalską
  displayFullInstr: string;  // Marcinem Gołkiem / Anną Kowalską
  displayFullLoc: string;    // Marcinie Gołku / Annie Kowalskiej
}

/* ───────────── Heurystyki dla biernika (Acc) ─────────────
   Mężczyźni (osoby żywotne): biernik ≈ dopełniacz (Marcin→Marcina, Gołek→Gołka).
   Kobiety:
     - imię z -a ⇒ -ę (Anna→Annę, Katarzyna→Katarzynę),
     - nazwisko żeńskie:
         • -ska → -ską (Kowalska→Kowalską)
         • -cka → -cką (Nowacka→Nowacką)
         • -dzka → -dzką
         • -zka → -zką
         • pozostałe zakończone na -a → -ą
*/
function femaleAccNameFromNom(nom: string): string {
  if (nom.endsWith("a")) return nom.slice(0, -1) + "ę";
  return nom;
}

function femaleAccSurnameFromNom(nom: string): string {
  if (nom.endsWith("ska")) return nom.slice(0, -3) + "ską";
  if (nom.endsWith("cka")) return nom.slice(0, -3) + "cką";
  if (nom.endsWith("dzka")) return nom.slice(0, -4) + "dzką";
  if (nom.endsWith("zka")) return nom.slice(0, -3) + "zką";
  if (nom.endsWith("a"))   return nom.slice(0, -1) + "ą";
  return nom;
}

/* ───────────── Heurystyki dla narzędnika (Instr) ─────────────
   Mężczyźni:
     - imię:
         • -a → -ą (Kuba→Kubą)
         • -ek → -kiem (Arek→Arkiem)
         • -k → +iem (Mirek→Mirkiem)
         • domyślnie +em (Marcin→Marcinem)
     - nazwisko:
         • -ski → -skim, -cki → -ckim, -dzki → -dzkim
         • -ek → -kiem (Gołek→Gołkiem)
         • -k → +iem, -g → +iem, -ch → +em
         • domyślnie: jeśli spółgłoska → +em
   Kobiety:
     - imię: -a → -ą (Anna→Anną), „ia” → „ią” (Maria→Merią/Marią)
     - nazwisko żeńskie: -ska/ -cka/ -dzka/ -zka → -ską/ -cką/ -dzką/ -zką; inne z -a → -ą
*/
function maleInstrFromNom(word: string): string {
  if (word.endsWith("ski")) return word.slice(0, -3) + "skim";
  if (word.endsWith("cki")) return word.slice(0, -3) + "ckim";
  if (word.endsWith("dzki")) return word.slice(0, -4) + "dzkim";
  if (word.endsWith("a")) return word.slice(0, -1) + "ą";
  if (word.endsWith("ek")) return word.slice(0, -2) + "kiem";
  if (word.endsWith("k"))  return word + "iem";
  if (word.endsWith("g"))  return word + "iem";
  if (word.endsWith("ch")) return word + "em";
  const last = word.slice(-1);
  const vowels = "aąeęioóuy";
  if (!vowels.includes(last.toLowerCase())) return word + "em";
  return word + "em";
}

function femaleInstrNameFromNom(nom: string): string {
  if (nom.endsWith("ia")) return nom.slice(0, -2) + "ią"; // Maria→Marią
  if (nom.endsWith("a"))  return nom.slice(0, -1) + "ą";  // Anna→Anną
  return nom;
}

function femaleInstrSurnameFromNom(nom: string): string {
  if (nom.endsWith("ska")) return nom.slice(0, -3) + "ską";
  if (nom.endsWith("cka")) return nom.slice(0, -3) + "cką";
  if (nom.endsWith("dzka")) return nom.slice(0, -4) + "dzką";
  if (nom.endsWith("zka")) return nom.slice(0, -3) + "zką";
  if (nom.endsWith("a"))   return nom.slice(0, -1) + "ą";
  return nom;
}

/* ───────────── Heurystyki dla miejscownika (Loc, po „o …”) ─────────────
   Mężczyźni:
     - imię:
         • „Piotr” → „Piotrze” (specjalny wyjątek)
         • kończy się na „ej” albo „j” → + „u” (Andrzej→Andrzeju, Maciej→Macieju)
         • kończy się na „ł” → zamień „ł” → „le” (Michał→Michale)
         • kończy się spółgłoską → + „ie” (Marcin→Marcinie)
         • -a → -e (Kuba→Kubie)
     - nazwisko:
         • -ski → -skim, -cki → -ckim, -dzki → -dzkim
         • -ek → -ku (Gołek→Gołku)
         • -k → -ku (Nowak→Nowaku)
         • w pozostałych przypadkach — zostawiamy bez zmian (zachowawcza heurystyka)
   Kobiety:
     - imię:
         • kończy się na „ia” → „ii” (Maria→Marii)
         • -a → -ie (Anna→Annie)
     - nazwisko:
         • -ska → -skiej, -cka → -ckiej, -dzka → -dzkiej, -zka → -zkiej
         • inne zakończone na -a → -e (np. hipotetyczne)
         • jeśli nie kończy się na -a (np. „Nowak”) — zostawiamy bez zmian
*/
function maleLocNameFromNom(nom: string): string {
  const lower = nom.toLowerCase();
  if (lower === "piotr") return nom.slice(0, -1) + "rze"; // Piotr→Piotrze

  if (lower.endsWith("ej") || lower.endsWith("j")) return nom + "u";     // Andrzej→Andrzeju, Maciej→Macieju
  if (lower.endsWith("ł")) return nom.slice(0, -1) + "le";               // Michał→Michale

  const last = lower.slice(-1);
  const vowels = "aąeęioóuy";
  if (!vowels.includes(last)) return nom + "ie";                          // Marcin→Marcinie

  if (lower.endsWith("a")) return nom.slice(0, -1) + "e";                 // Kuba→Kubie
  return nom; // bezpiecznie
}

function maleLocSurnameFromNom(nom: string): string {
  const lower = nom.toLowerCase();
  if (lower.endsWith("ski")) return nom.slice(0, -3) + "skim";
  if (lower.endsWith("cki")) return nom.slice(0, -3) + "ckim";
  if (lower.endsWith("dzki")) return nom.slice(0, -4) + "dzkim";
  if (lower.endsWith("ek")) return nom.slice(0, -2) + "ku";               // Gołek→Gołku
  if (lower.endsWith("k"))  return nom + "u";                             // Nowak→Nowaku
  return nom; // zachowawczo (inne przypadki są trudne bez pełnego słownika)
}

function femaleLocNameFromNom(nom: string): string {
  const lower = nom.toLowerCase();
  if (lower.endsWith("ia")) return nom.slice(0, -2) + "ii";               // Maria→Marii
  if (lower.endsWith("a"))  return nom.slice(0, -1) + "ie";               // Anna→Annie
  return nom;
}

function femaleLocSurnameFromNom(nom: string): string {
  const lower = nom.toLowerCase();
  if (lower.endsWith("ska")) return nom.slice(0, -3) + "skiej";
  if (lower.endsWith("cka")) return nom.slice(0, -3) + "ckiej";
  if (lower.endsWith("dzka")) return nom.slice(0, -4) + "dzkiej";
  if (lower.endsWith("zka")) return nom.slice(0, -3) + "zkiej";
  if (lower.endsWith("a"))   return nom.slice(0, -1) + "e";               // ostrożnie dla innych żeńskich na -a
  return nom; // np. pani Nowak → „o pani Nowak”
}

export function buildCases(study: StudyRow): Cases {
  const gender = (study.gender || "M") as Gender;

  const nameNom = study.first_name_nom;
  const nameGen = study.first_name_gen;

  const surNom = study.last_name_nom;
  const surGen = study.last_name_gen;

  // Biernik:
  let nameAcc: string;
  let surAcc: string;
  if (gender === "M") {
    nameAcc = nameGen;
    surAcc  = surGen;
  } else {
    nameAcc = femaleAccNameFromNom(nameNom);
    surAcc  = femaleAccSurnameFromNom(surNom);
  }

  // Narzędnik:
  let nameInstr: string;
  let surInstr: string;
  if (gender === "M") {
    nameInstr = maleInstrFromNom(nameNom);
    surInstr  = maleInstrFromNom(surNom);
  } else {
    nameInstr = femaleInstrNameFromNom(nameNom);
    surInstr  = femaleInstrSurnameFromNom(surNom);
  }

  // Miejscownik:
  let nameLoc: string;
  let surLoc: string;
  if (gender === "M") {
    nameLoc = maleLocNameFromNom(nameNom);
    surLoc  = maleLocSurnameFromNom(surNom);
  } else {
    nameLoc = femaleLocNameFromNom(nameNom);
    surLoc  = femaleLocSurnameFromNom(surNom);
  }

  const cityNom = study.city_nom;
  const cityLoc = study.city_loc;

  return {
    gender,
    nameNom,
    nameGen,
    nameAcc,
    nameInstr,
    nameLoc,
    surNom,
    surGen,
    surAcc,
    surInstr,
    surLoc,
    cityNom,
    cityLoc,
    displayFullNom:    `${nameNom} ${surNom}`,
    displayFullGen:    `${nameGen} ${surGen}`,
    displayFullAcc:    `${nameAcc} ${surAcc}`,
    displayFullInstr:  `${nameInstr} ${surInstr}`,
    displayFullLoc:    `${nameLoc} ${surLoc}`,
  };
}
