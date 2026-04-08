import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { markTokenCompleted, markTokenStarted } from "./lib/tokens";
import { buildJstTextContext, renderJstTemplate } from "./lib/jstStudies";
import type { JstStudyRow } from "./lib/jstStudies";
import "./JstSurvey.css";

type Step = "intro" | "screening" | "metryka" | "A" | "B1" | "B2" | "D" | "D13" | "thanks" | "rejected";
type AB = "A" | "B";

const ARCHETYPES = [
  "Władca",
  "Bohater",
  "Mędrzec",
  "Opiekun",
  "Kochanek",
  "Błazen",
  "Twórca",
  "Odkrywca",
  "Czarodziej",
  "Towarzysz",
  "Niewinny",
  "Buntownik",
] as const;

const METRY = {
  M_PLEC: ["kobieta", "mężczyzna"],
  M_WIEK: ["15-39", "40-59", "60 i więcej"],
  M_WYKSZT: ["podstawowe, gimnazjalne, zasadnicze zawodowe", "średnie", "wyższe"],
  M_ZAWOD: [
    "pracownik umysłowy",
    "pracownik fizyczny",
    "prowadzę własną firmę",
    "student/uczeń",
    "bezrobotny",
    "rencista/emeryt",
    "inna (jaka?)",
  ],
  M_MATERIAL: [
    "powodzi mi się bardzo źle, jestem w ciężkiej sytuacji materialnej",
    "powodzi mi się raczej źle",
    "powodzi mi się przeciętnie, średnio",
    "powodzi mi się raczej dobrze",
    "powodzi mi się bardzo dobrze",
    "odmawiam udzielenia odpowiedzi",
  ],
} as const;

const A_ITEMS = [
  { id: "A1", left: "stabilność i przewidywalność", right: "otwartość na zmiany i nowości" },
  { id: "A2", left: "bliskość mieszkańcom", right: "silny autorytet" },
  { id: "A3", left: "troska o słabszych", right: "ambitne inwestycje i rozwój" },
  { id: "A4", left: "władza oparta na wiedzy eksperckiej", right: "władza oparta na odwadze i sile charakteru" },
  { id: "A5", left: "porządek i bezpieczeństwo", right: "wolność i swoboda mieszkańców" },
  { id: "A6", left: "proste, jasne zasady", right: "niezależność i własne wybory" },
  { id: "A7", left: "walka z „układami”", right: "dogadywanie się i szukanie porozumień" },
  { id: "A8", left: "empatia i współczucie", right: "wymagania i stanowczość" },
  { id: "A9", left: "blisko codziennych spraw mieszkańców", right: "rozmach i wyjątkowy charakter {miasta/gminy}" },
  { id: "A10", left: "harmonia i łagodzenie konfliktów", right: "koncentracja na celach, nawet kosztem konfliktów" },
  { id: "A11", left: "powaga i opanowanie", right: "optymizm i energia" },
  { id: "A12", left: "tradycja i sprawdzone metody", right: "innowacyjność i nowe podejście" },
  { id: "A13", left: "inspirowanie mieszkańców", right: "rozwiązywanie konkretnych problemów" },
  { id: "A14", left: "koncentracja na codziennych sprawach", right: "wizja przyszłości" },
  { id: "A15", left: "otwartość i swoboda", right: "reguły i porządek" },
  { id: "A16", left: "eksperymentowanie i poszukiwanie nowych rozwiązań", right: "praktyczne rozwiązywanie problemów" },
  { id: "A17", left: "troska o potrzeby ludzi", right: "wyrazistość i brak kompromisów" },
  { id: "A18", left: "zacieśnianie więzi między ludźmi poprzez integrację i wspólnotę", right: "napędzanie rozwoju {miasta/gminy} odważnymi inwestycjami" },
] as const;

const B_ITEMS = [
  { archetype: "Władca", text: "{Miasto/Gmina} powinno sprawnie podejmować decyzje i konsekwentnie je wdrażać – według jasnych zasad." },
  { archetype: "Bohater", text: "Gdy jest problem, trzeba działać szybko i zdecydowanie." },
  { archetype: "Mędrzec", text: "Decyzje powinny wynikać z analiz i strategicznego myślenia." },
  { archetype: "Opiekun", text: "Ważne, żeby mieszkańcy w trudnej sytuacji nie zostawali bez wsparcia." },
  { archetype: "Kochanek", text: "Ważne jest budowanie relacji, życzliwości i dobrej atmosfery." },
  { archetype: "Błazen", text: "Potrzebujemy więcej energii, optymizmu i inicjatyw integrujących ludzi." },
  { archetype: "Twórca", text: "Potrzebujemy nowych pomysłów i rozwiązań „szytych na miarę”." },
  { archetype: "Odkrywca", text: "Mieszkańcy powinni mieć większą swobodę działania i więcej inicjatyw oddolnych." },
  { archetype: "Czarodziej", text: "Potrzebujemy impulsu, który zmieni myślenie i doda energii {miastu/gminie}." },
  { archetype: "Towarzysz", text: "Ważne sprawy powinny być załatwiane w dialogu i współpracy z mieszkańcami." },
  { archetype: "Niewinny", text: "Uczciwość, prostota i przejrzystość są kluczowe." },
  { archetype: "Buntownik", text: "Trzeba odważnie przełamywać nieskuteczne schematy i sprawy uznawane za „nietykalne”." },
] as const;

const D_ITEMS = [
  {
    id: "D1",
    archetype: "Władca",
    a: "W {naszym mieście}/{naszej gminie} zasady są raczej jasne, a ustalenia zwykle są wprowadzane w życie.",
    b: "W {naszym mieście}/{naszej gminie} zasady nie zawsze są jasne, a ustalenia nie zawsze przekładają się na praktykę.",
  },
  {
    id: "D2",
    archetype: "Bohater",
    a: "Gdy pojawia się poważny problem, {miasto/gmina} zwykle reaguje sprawnie i w odpowiednim czasie.",
    b: "Gdy pojawia się poważny problem, reakcja {miasta/gminy} nie zawsze jest wystarczająco szybka i zdecydowana.",
  },
  {
    id: "D3",
    archetype: "Mędrzec",
    a: "W decyzjach dotyczących rozwoju {miasta/gminy} widać spójny kierunek i myślenie w dłuższej perspektywie.",
    b: "W decyzjach dotyczących rozwoju {miasta/gminy} nie zawsze widać spójny kierunek i dłuższą perspektywę.",
  },
  {
    id: "D4",
    archetype: "Opiekun",
    a: "Osoby w trudnej sytuacji mogą u nas zwykle liczyć na realne wsparcie w codziennych sprawach.",
    b: "Osobom w trudnej sytuacji nie zawsze łatwo jest uzyskać pomoc odpowiednią do codziennych potrzeb.",
  },
  {
    id: "D5",
    archetype: "Kochanek",
    a: "W {mieście/gminie} widać życzliwość i poczucie bliskości między ludźmi.",
    b: "W {mieście/gminie} nie zawsze widać życzliwość i poczucie bliskości między ludźmi.",
  },
  {
    id: "D6",
    archetype: "Błazen",
    a: "Są tu wydarzenia i miejsca, które dają ludziom radość i poczucie wspólnoty.",
    b: "W życiu lokalnym bywa za mało wydarzeń i miejsc, które naprawdę dają ludziom radość i poczucie wspólnoty.",
  },
  {
    id: "D7",
    archetype: "Twórca",
    a: "Nowe pomysły dość często przechodzą od planu do realizacji w praktyce.",
    b: "Nowe pomysły nie zawsze przechodzą sprawnie od planu do realizacji.",
  },
  {
    id: "D8",
    archetype: "Odkrywca",
    a: "Jest tu przestrzeń na nietypowe inicjatywy i na robienie rzeczy po swojemu.",
    b: "Dla nietypowych inicjatyw nie zawsze łatwo znaleźć przestrzeń i akceptację.",
  },
  {
    id: "D9",
    archetype: "Czarodziej",
    a: "W {mieście/gminie} czuć energię i poczucie, że zmiany mogą inspirować.",
    b: "Nie zawsze czuć w {mieście/gminie} nową energię i wyraźny kierunek zmian.",
  },
  {
    id: "D10",
    archetype: "Towarzysz",
    a: "W ważnych sprawach jest realna rozmowa z mieszkańcami i widać, że ich głos ma znaczenie.",
    b: "W ważnych sprawach nie zawsze widać, że głos mieszkańców realnie wpływa na decyzje.",
  },
  {
    id: "D11",
    archetype: "Niewinny",
    a: "Sprawy są raczej przejrzyste i zwykle wiadomo, jak je załatwić.",
    b: "Załatwianie spraw nie zawsze jest wystarczająco przejrzyste i zrozumiałe.",
  },
  {
    id: "D12",
    archetype: "Buntownik",
    a: "Da się otwarcie mówić o problemach i szukać nowych rozwiązań, gdy coś nie działa.",
    b: "Nie zawsze jest poczucie, że o problemach można mówić otwarcie i że takie działania prowadzą do zmiany.",
  },
] as const;

const SLIDER_LABELS: Record<number, string> = {
  1: "A zdecydowanie ważniejsze",
  2: "A wyraźnie ważniejsze",
  3: "A nieco ważniejsze",
  4: "A i B tak samo ważne",
  5: "B nieco ważniejsze",
  6: "B wyraźnie ważniejsze",
  7: "B zdecydowanie ważniejsze",
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Props = {
  study: JstStudyRow;
  token: string | null;
};

const JstSurvey: React.FC<Props> = ({ study, token }) => {
  const ctx = useMemo(() => buildJstTextContext(study), [study]);

  const [step, setStep] = useState<Step>("intro");
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
  const [errorMsg, setErrorMsg] = useState("");
  const [startedMarked, setStartedMarked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isResident, setIsResident] = useState<boolean | null>(null);

  const [metry, setMetry] = useState<Record<keyof typeof METRY, string>>({
    M_PLEC: "",
    M_WIEK: "",
    M_WYKSZT: "",
    M_ZAWOD: "",
    M_MATERIAL: "",
  });
  const [showOnlyMissingMetry, setShowOnlyMissingMetry] = useState(false);

  const [aOrder] = useState(() => shuffle(A_ITEMS.map((x) => x.id)));
  const [aAnswers, setAAnswers] = useState<Record<string, number | undefined>>({});

  const [bOrder] = useState(() => shuffle(B_ITEMS.map((x) => x.archetype)));
  const [selectedB1, setSelectedB1] = useState<string[]>([]);
  const [selectedB2, setSelectedB2] = useState<string>("");

  const [dOrder] = useState(() => shuffle(D_ITEMS.map((x) => x.id)));
  const [dIndex, setDIndex] = useState(0);
  const [dAnswers, setDAnswers] = useState<Record<string, AB | undefined>>({});
  const [selectedD13Id, setSelectedD13Id] = useState<string>("");

  const isMobile = window.innerWidth <= 900;
  const shouldRotate =
    isMobile &&
    orientation === "portrait" &&
    step !== "intro" &&
    step !== "thanks" &&
    step !== "rejected";

  useEffect(() => {
    const onResize = () => setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!token) return;
    supabase.rpc("mark_sms_clicked", { p_token: token }).catch(() => undefined);
    supabase.rpc("mark_email_clicked", { p_token: token }).catch(() => undefined);
  }, [token]);

  const ensureStarted = async () => {
    if (!token || startedMarked) return;
    setStartedMarked(true);
    try {
      await markTokenStarted(token);
      await supabase.rpc("mark_sms_started", { p_token: token });
      await supabase.rpc("mark_email_started", { p_token: token });
    } catch {
      // bez blokowania badania
    }
  };

  const goNextFromScreening = () => {
    if (isResident === null) {
      setErrorMsg("Proszę zaznaczyć odpowiedź.");
      return;
    }
    setErrorMsg("");
    if (!isResident) {
      setStep("rejected");
      return;
    }
    setStep("metryka");
  };

  const validateMetry = () => {
    const missing = (Object.keys(METRY) as (keyof typeof METRY)[]).filter((k) => !metry[k]);
    if (missing.length) {
      setErrorMsg("Proszę udzielić odpowiedzi na wszystkie pytania");
      setShowOnlyMissingMetry(true);
      return false;
    }
    setErrorMsg("");
    setShowOnlyMissingMetry(false);
    return true;
  };

  const validateA = () => {
    const missing = A_ITEMS.map((x) => x.id).filter((id) => !aAnswers[id]);
    if (missing.length) {
      setErrorMsg("Proszę udzielić odpowiedzi na wszystkie pytania");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const validateB1 = () => {
    if (selectedB1.length !== 3) {
      setErrorMsg("Proszę zaznaczyć 3 odpowiedzi");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const currentD = D_ITEMS.find((x) => x.id === dOrder[dIndex])!;

  const dChosenRows = dOrder
    .map((id) => {
      const item = D_ITEMS.find((x) => x.id === id)!;
      const choice = dAnswers[id];
      if (!choice) return null;
      const text = choice === "A" ? item.a : item.b;
      return { id, archetype: item.archetype, text };
    })
    .filter(Boolean) as { id: string; archetype: string; text: string }[];

  const submitAll = async () => {
    if (!selectedD13Id) {
      setErrorMsg("Proszę wskazać jedną odpowiedź.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      await ensureStarted();

      const payload: Record<string, unknown> = {
        M_PLEC: metry.M_PLEC,
        M_WIEK: metry.M_WIEK,
        M_WYKSZT: metry.M_WYKSZT,
        M_ZAWOD: metry.M_ZAWOD,
        M_MATERIAL: metry.M_MATERIAL,
      };

      A_ITEMS.forEach((item) => {
        payload[item.id] = Number(aAnswers[item.id] || 0);
      });

      ARCHETYPES.forEach((a) => {
        payload[`B1_${a}`] = selectedB1.includes(a) ? 1 : 0;
      });

      payload.B2 = selectedB2;

      D_ITEMS.forEach((item) => {
        payload[item.id] = dAnswers[item.id] || "";
      });

      const selectedD13 = D_ITEMS.find((x) => x.id === selectedD13Id);
      payload.D13 = selectedD13?.archetype || "";

      const { data, error } = await supabase.rpc("add_jst_response_by_slug", {
        p_slug: study.slug,
        p_payload: payload,
        p_respondent_id: null,
      });

      if (error || !data || (typeof data === "object" && (data as any).ok === false)) {
        console.error("add_jst_response_by_slug error:", error, data);
        setErrorMsg("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
        setSubmitting(false);
        return;
      }

      if (token) {
        try {
          await markTokenCompleted(token);
          await supabase.rpc("mark_sms_completed", { p_token: token });
          await supabase.rpc("mark_email_completed", { p_token: token });
        } catch {
          // bez blokowania przejścia do podziękowania
        }
      }

      setStep("thanks");
    } catch (e) {
      console.error(e);
      setErrorMsg("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  };

  if (shouldRotate) {
    return (
      <div className="jst-root">
        <div className="jst-rotate">
          Proszę obrócić telefon poziomo, aby wygodnie wypełnić ankietę.
        </div>
      </div>
    );
  }

  if (step === "thanks") {
    return (
      <main className="jst-root">
        <div className="jst-wrap">
          <div className="jst-card" style={{ textAlign: "center", padding: "64px 20px" }}>
            <h2 className="jst-title" style={{ color: "#0ca495" }}>
              Dziękujemy za udział w badaniu!
            </h2>
            <p style={{ fontSize: "1.2rem", marginTop: 10 }}>Twoje odpowiedzi zostały zapisane.</p>
            <p className="jst-muted" style={{ marginTop: 16, lineHeight: 1.6 }}>
              Jeśli pojawiły się jakiekolwiek wątpliwości lub masz pytania, proszę o kontakt:
              <br />
              Piotr Stec, Badania.pro
              <br />
              e-mail:{" "}
              <a href="mailto:piotr.stec@badania.pro" style={{ color: "inherit" }}>
                piotr.stec@badania.pro
              </a>
              <br />
              tel.:{" "}
              <a href="tel:500121141" style={{ color: "inherit" }}>
                500-121-141
              </a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (step === "rejected") {
    return (
      <main className="jst-root">
        <div className="jst-wrap">
          <div className="jst-card" style={{ textAlign: "center", padding: "64px 20px" }}>
            <h2 className="jst-title">Niestety, nie spełnia Pan/Pani warunków udziału w badaniu.</h2>
            <p className="jst-muted" style={{ fontSize: "1.1rem" }}>
              Dziękujemy za zainteresowanie.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="jst-root">
      <div className="jst-wrap">
        {errorMsg && <div className="jst-alert">{errorMsg}</div>}

        {step === "intro" && (
          <section className="jst-card">
            <h1 className="jst-title">Badanie mieszkańców {ctx.fullGen}</h1>
            <p style={{ lineHeight: 1.65, whiteSpace: "pre-line", fontSize: "1.08rem" }}>
              {renderJstTemplate(
                `Dzień dobry!

Przeprowadzamy badanie wśród mieszkańców {nazwa JST w dopełniaczu}, którzy ukończyli co najmniej 15 lat. Badanie dotyczy jakości życia, spraw społecznych i gospodarczych związanych z {narzędnik JST}. W tym badaniu chcemy przekonać się jakie jest Pana/Pani podejście do spraw {miasto/gmina} i oczekiwania dotyczące tego, jak ${ctx.verbShould} {nazwa JST w mianowniku}.

Zapewniamy, że niniejsze badanie ma charakter całkowicie anonimowy. Potrwa ok. 5-7 minut.

Dziękujemy,
Zespół badawczy Badania.pro®`,
                ctx
              )}
            </p>
            <div style={{ marginTop: 24 }}>
              <button className="jst-btn" onClick={() => setStep("screening")}>
                Zaczynamy
              </button>
            </div>
          </section>
        )}

        {step === "screening" && (
          <section className="jst-card">
            <h2 className="jst-title" style={{ fontSize: "1.5rem" }}>
              Czy jest Pan/Pani mieszkańcem/mieszkanką {ctx.fullGen}?
            </h2>
            <div className="jst-opt-list" style={{ maxWidth: 400 }}>
              <button className={`jst-opt ${isResident === true ? "selected" : ""}`} onClick={() => setIsResident(true)}>
                Tak
              </button>
              <button className={`jst-opt ${isResident === false ? "selected" : ""}`} onClick={() => setIsResident(false)}>
                Nie
              </button>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="jst-btn" onClick={goNextFromScreening}>
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "metryka" && (
          <section className="jst-card">
            <h2 className="jst-title" style={{ fontSize: "1.5rem" }}>
              Metryczka
            </h2>

            {(Object.keys(METRY) as (keyof typeof METRY)[]).map((field) => {
              const missing = !metry[field];
              if (showOnlyMissingMetry && !missing) return null;
              return (
                <div key={field} className={`jst-metry ${missing && showOnlyMissingMetry ? "missing" : ""}`}>
                  <p className="jst-metry-title">
                    {field === "M_PLEC" && "Proszę o podanie płci."}
                    {field === "M_WIEK" && "Jaki jest Pana/Pani wiek?"}
                    {field === "M_WYKSZT" && "Jakie ma Pan/Pani wykształcenie?"}
                    {field === "M_ZAWOD" && "Jaka jest Pana/Pani sytuacja zawodowa?"}
                    {field === "M_MATERIAL" && "Jak ocenia Pan/Pani własną sytuację materialną?"}
                  </p>
                  <div className="jst-radio-list">
                    {METRY[field].map((opt) => (
                      <label key={opt}>
                        <input
                          type="radio"
                          name={field}
                          checked={metry[field] === opt}
                          onChange={() => {
                            setMetry((prev) => ({ ...prev, [field]: opt }));
                            setErrorMsg("");
                          }}
                        />{" "}
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            <button
              className="jst-btn"
              onClick={async () => {
                const ok = validateMetry();
                if (!ok) return;
                await ensureStarted();
                setStep("A");
              }}
            >
              Przejdź dalej
            </button>
          </section>
        )}

        {step === "A" && (
          <section className="jst-card">
            <h2 className="jst-title" style={{ fontSize: "1.45rem" }}>
              Poniżej znajdują się pary sformułowań opisujące dwa różne podejścia do spraw {ctx.fullGen}. Proszę wskazać, które podejście jest Panu/Pani bliższe.
            </h2>
            <p className="jst-muted" style={{ marginTop: -4 }}>
              Ustawienie na środku oznacza: „A i B tak samo ważne”.
            </p>
            {aOrder.map((id) => {
              const item = A_ITEMS.find((x) => x.id === id)!;
              const selected = aAnswers[id];
              return (
                <div className={`jst-slider-row ${!selected && errorMsg ? "missing" : ""}`} key={id}>
                  <div className="jst-slider-head">
                    <span>{renderJstTemplate(item.left, ctx)}</span>
                    <span>{renderJstTemplate(item.right, ctx)}</span>
                  </div>
                  {selected ? <span className="jst-slider-bubble">{SLIDER_LABELS[selected]}</span> : <span className="jst-muted">Wybierz ocenę 1-7</span>}
                  <div className="jst-scale">
                    {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                      <button
                        key={`${id}-${v}`}
                        className={`jst-dot ${selected === v ? "active" : ""}`}
                        onClick={() => {
                          setAAnswers((prev) => ({ ...prev, [id]: v }));
                          setErrorMsg("");
                        }}
                        type="button"
                      >
                        {v === 1 ? "A" : v === 7 ? "B" : "•"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <button
              className="jst-btn"
              onClick={() => {
                if (!validateA()) return;
                setStep("B1");
              }}
            >
              Przejdź dalej
            </button>
          </section>
        )}

        {step === "B1" && (
          <section className="jst-card">
            <h2 className="jst-title" style={{ fontSize: "1.45rem" }}>
              Poniżej znajduje się 12 opisów. Proszę wybrać maksymalnie 3, które najlepiej pasują do tego, jak powinno działać {ctx.fullNom} w najbliższych latach.
            </h2>
            <p className="jst-muted">Zaznaczone: {selectedB1.length} / 3</p>
            <div className="jst-opt-list">
              {bOrder.map((archetype) => {
                const item = B_ITEMS.find((x) => x.archetype === archetype)!;
                const selected = selectedB1.includes(archetype);
                return (
                  <button
                    key={archetype}
                    type="button"
                    className={`jst-opt ${selected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedB1((prev) => {
                        if (prev.includes(archetype)) return prev.filter((x) => x !== archetype);
                        if (prev.length >= 3) return prev;
                        return [...prev, archetype];
                      });
                      setErrorMsg("");
                    }}
                  >
                    {renderJstTemplate(item.text, ctx)}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                className="jst-btn"
                onClick={() => {
                  if (!validateB1()) return;
                  setStep("B2");
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "B2" && (
          <section className="jst-card">
            <h2 className="jst-title" style={{ fontSize: "1.45rem" }}>
              Spośród wybranych przed chwilą opisów proszę wskazać jeden najważniejszy.
            </h2>
            <div className="jst-opt-list">
              {selectedB1.map((archetype) => {
                const item = B_ITEMS.find((x) => x.archetype === archetype)!;
                return (
                  <button
                    key={archetype}
                    type="button"
                    className={`jst-opt ${selectedB2 === archetype ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedB2(archetype);
                      setErrorMsg("");
                    }}
                  >
                    {renderJstTemplate(item.text, ctx)}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                className="jst-btn"
                onClick={() => {
                  if (!selectedB2) {
                    setErrorMsg("Proszę wskazać jedną odpowiedź.");
                    return;
                  }
                  setErrorMsg("");
                  setStep("D");
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "D" && (
          <section className="jst-card">
            <h2 className="jst-title" style={{ fontSize: "1.45rem" }}>
              Poniżej znajdują się pary stwierdzeń o różnych sferach funkcjonowania {ctx.fullGen}. W każdej parze wybierz wariant (A lub B), który lepiej odpowiada doświadczeniom i obserwacjom.
            </h2>
            <p className="jst-muted">
              Para {dIndex + 1} z {D_ITEMS.length}
            </p>
            <div className="jst-pair">
              <button
                className={`jst-opt ${dAnswers[currentD.id] === "A" ? "selected" : ""}`}
                onClick={() => {
                  setDAnswers((prev) => ({ ...prev, [currentD.id]: "A" }));
                  setErrorMsg("");
                }}
              >
                {renderJstTemplate(currentD.a, ctx)}
              </button>
              <button
                className={`jst-opt ${dAnswers[currentD.id] === "B" ? "selected" : ""}`}
                onClick={() => {
                  setDAnswers((prev) => ({ ...prev, [currentD.id]: "B" }));
                  setErrorMsg("");
                }}
              >
                {renderJstTemplate(currentD.b, ctx)}
              </button>
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                className="jst-btn"
                onClick={() => {
                  if (!dAnswers[currentD.id]) {
                    setErrorMsg("Proszę wskazać jedną odpowiedź.");
                    return;
                  }
                  setErrorMsg("");
                  if (dIndex < dOrder.length - 1) setDIndex((x) => x + 1);
                  else setStep("D13");
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "D13" && (
          <section className="jst-card">
            <h2 className="jst-title" style={{ fontSize: "1.45rem" }}>
              Spośród wskazanych przed chwilą doświadczeń proszę wybrać jedną najważniejszą odpowiedź.
            </h2>
            <div className="jst-opt-list">
              {dChosenRows.map((row) => (
                <button
                  key={row.id}
                  className={`jst-opt ${selectedD13Id === row.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedD13Id(row.id);
                    setErrorMsg("");
                  }}
                >
                  {renderJstTemplate(row.text, ctx)}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="jst-btn" onClick={submitAll} disabled={submitting}>
                {submitting ? "Wysyłanie..." : "Wyślij"}
              </button>
            </div>
          </section>
        )}

        <footer className="jst-footer">
          opracowanie: Piotr Stec, Badania.pro® | © 2026
          <div style={{ marginTop: 8 }}>
            Jeśli pojawiły się jakieś wątpliwości lub masz pytania proszę o kontakt: Piotr Stec, Badania.pro, piotr.stec@badania.pro, tel.: 500-121-141
          </div>
        </footer>
      </div>
    </main>
  );
};

export default JstSurvey;
