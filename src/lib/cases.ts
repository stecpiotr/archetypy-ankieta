// src/lib/cases.ts
import type { Study } from "./studies";

/**
 * Struktura z „odmienionymi” polami do wyświetlania.
 * Uwaga: to proste heurystyki, nie pełna fleksja PL.
 * Jeśli chcesz 100% poprawności, rozważ dodanie kolumn
 * z formami dopełniacza w bazie i korzystanie z nich.
 */
export type Cases = {
  // Pełne imię i nazwisko w mianowniku i w dopełniaczu (heurystyka)
  displayFullNom: string;
  displayFullGen: string;

  // Nazwisko w mianowniku i dopełniaczu (heurystyka)
  lastNameNom: string;
  lastNameGen: string;

  // Miasto – na razie bez odmiany (często toponimy wymagają słownika)
  cityNom: string;
  cityGen: string;

  // Proste formy zaimków wg płci
  pronounHeShe: string;   // on / ona
  pronounHisHer: string;  // jego / jej
};

/** Najprostsza normalizacja: trim + pojedyncze spacje. */
function clean(s: string | null | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

/** Heurystyka: nazwisko → dopełniacz (baaardzo uproszczone) */
function lastNameToGen(lastName: string): string {
  const ln = lastName;
  if (!ln) return ln;

  // kilka prostych reguł:
  // - zakończenie „ek” → „ka” (Gołek → Gołka)
  if (/ek$/i.test(ln)) return ln.replace(/ek$/i, "ka");
  // - zakończenie spółgłoską → dodajemy „a” (np. Kowalski → Kowalskiego już wymaga słownika,
  //   ale jako bezpieczna ogólna heurystyka da „Kowalskia”; NIE jest idealne!)
  if (/[bcćdfghjklłmnprsśtwzźż]$/i.test(ln)) return ln + "a";
  // - zostawiamy bez zmian dla pozostałych (np. kończących się na -a)
  return ln;
}

/** Heurystyka: imię → dopełniacz (baaardzo uproszczone) */
function firstNameToGen(firstName: string, gender: "M" | "K" | null): string {
  const fn = firstName;
  if (!fn) return fn;

  if (gender === "M") {
    // bardzo prosta reguła:
    // - jeśli kończy się spółgłoską → + 'a' (Marcin → Marcina, Piotr → Piotra (OK), Marek → Mareka (nieidealne))
    if (/[bcćdfghjklłmnprsśtwzźż]$/i.test(fn)) return fn + "a";
    // - jeśli kończy się na -a, -e, -o, zostawiamy (np. Kuba → Kuby wymaga słownika)
    return fn;
  } else {
    // Dla 'K' najczęściej mianownik = dopełniacz dla wielu imion, ale bywa różnie
    return fn;
  }
}

/** Składanie pełnej formy dopełniacza na podstawie heurystyk. */
function fullNameGen(firstName: string, lastName: string, gender: "M" | "K" | null): string {
  const fnG = firstNameToGen(firstName, gender);
  const lnG = lastNameToGen(lastName);
  return clean(`${fnG} ${lnG}`);
}

/** Buduje zestaw „odmian” do wykorzystania w UI. */
export function buildCases(study: Study): Cases {
  const first = clean(study.person_first_name) || "Marcin";
  const last  = clean(study.person_last_name)  || "Gołek";
  const city  = clean(study.city_name)         || "";

  const gender = (study.gender === "M" || study.gender === "K") ? study.gender : null;

  const displayFullNom = clean(`${first} ${last}`);
  const displayFullGen = fullNameGen(first, last, gender);

  // Miasto — bez odmiany (jeśli potrzebna, wprowadź kolumnę city_gen w DB)
  const cityNom = city;
  const cityGen = city; // placeholder

  const pronounHeShe = gender === "K" ? "ona" : "on";
  const pronounHisHer = gender === "K" ? "jej" : "jego";

  return {
    displayFullNom,
    displayFullGen,
    lastNameNom: last,
    lastNameGen: lastNameToGen(last),
    cityNom,
    cityGen,
    pronounHeShe,
    pronounHisHer,
  };
}
