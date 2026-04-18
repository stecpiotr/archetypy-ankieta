import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { markJstTokenCompleted, markJstTokenRejected, markJstTokenStarted } from "./lib/tokens";
import { buildJstTextContext, renderJstTemplate } from "./lib/jstStudies";
import type { JstStudyRow } from "./lib/jstStudies";
import {
  buildMetryPayload,
  findMetryQuestionByColumn,
  findSelectedOptionLabel,
  initMetryAnswers,
  isOpenOptionSelected,
  normalizeMetryczkaConfig,
  type MetryczkaQuestion,
  type MetryczkaOption,
} from "./lib/metryczka";
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

const METRY_OPEN_MIN_CHARS = 1;
const FAST_CLICK_MIN_SECONDS = 2;
const FAST_CLICK_TRIGGER_STREAK = 4;
const FAST_CLICK_SUSPICIOUS_WARNINGS = 3;
const FAST_CLICK_WARNING_MESSAGE =
  "Udzielasz odpowiedzi zbyt szybko. Prosimy o uważniejsze czytanie pytań, aby odpowiedzi były rzetelne.";
const FAST_CLICK_WARNING_ACK_LABEL = "Rozumiem. Postaram się czytać uważniej.";

function normTextSimple(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ż/g, "z")
    .replace(/ź/g, "z")
    .trim();
}

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
  { id: "A17", left: "troska o potrzeby ludzi", right: "wyrazistość i bezkompromisowość" },
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

// Tymczasowo wyłączamy wymuszanie obrotu dla JST (prośba UAT).
const ENFORCE_JST_LANDSCAPE_ON_MOBILE = false;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function shuffleMetryOptionsWithLocks(options: MetryczkaOption[]): MetryczkaOption[] {
  const base = Array.isArray(options) ? [...options] : [];
  if (base.length < 2) return base;
  const movable = base.filter((opt) => opt.lock_randomization !== true);
  const shuffled = shuffle(movable);
  let cursor = 0;
  return base.map((opt) => {
    if (opt.lock_randomization === true) return opt;
    const next = shuffled[cursor];
    cursor += 1;
    return next ?? opt;
  });
}

type Props = {
  study: JstStudyRow;
  token: string | null;
  navigation?: {
    showProgress?: boolean;
    allowBack?: boolean;
    fastClickCheckEnabled?: boolean;
  };
};

const JstSurvey: React.FC<Props> = ({ study, token, navigation }) => {
  const ctx = useMemo(() => buildJstTextContext(study), [study]);
  const showProgress = navigation?.showProgress !== false;
  const allowBack = navigation?.allowBack !== false;
  const fastClickCheckEnabled =
    (navigation?.fastClickCheckEnabled ?? study?.survey_fast_click_check_enabled) === true;

  const [step, setStep] = useState<Step>("intro");
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
  const [errorMsg, setErrorMsg] = useState("");
  const [startedMarked, setStartedMarked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFastClickModalOpen, setIsFastClickModalOpen] = useState(false);
  const [fastClickAcknowledgeChecked, setFastClickAcknowledgeChecked] = useState(false);
  const qualityStartedAtRef = useRef<number | null>(null);
  const fastClickLastActionAtRef = useRef<number | null>(null);
  const fastClickShortStreakRef = useRef<number>(0);
  const fastClickWarningCountRef = useRef<number>(0);
  const metryAnsweredRef = useRef<Set<string>>(new Set());

  const [isResident, setIsResident] = useState<boolean | null>(null);
  const [missingAIds, setMissingAIds] = useState<string[]>([]);

  const metryConfig = useMemo(() => normalizeMetryczkaConfig(study?.metryczka_config), [study?.metryczka_config]);
  const metryQuestions = metryConfig.questions;
  const [metryAnswers, setMetryAnswers] = useState<Record<string, string>>({});
  useEffect(() => {
    setMetryAnswers((prev) => initMetryAnswers(metryQuestions, prev));
  }, [metryQuestions]);
  const [metryOpenTexts, setMetryOpenTexts] = useState<Record<string, string>>({});
  useEffect(() => {
    setMetryOpenTexts((prev) => {
      const next: Record<string, string> = {};
      metryQuestions.forEach((q) => {
        next[q.id] = prev[q.id] || "";
      });
      return next;
    });
    metryAnsweredRef.current = new Set();
  }, [metryQuestions]);
  const [showOnlyMissingMetry, setShowOnlyMissingMetry] = useState(false);

  const plecQuestion = useMemo(
    () => findMetryQuestionByColumn(metryQuestions, "M_PLEC"),
    [metryQuestions],
  );
  const selectedPlecCode = plecQuestion ? metryAnswers[plecQuestion.id] || "" : "";
  const selectedPlecLabel = findSelectedOptionLabel(plecQuestion, selectedPlecCode);
  const panDat = normTextSimple(selectedPlecLabel) === "kobieta"
    ? "Pani"
    : normTextSimple(selectedPlecLabel) === "mezczyzna"
      ? "Panu"
      : "Panu/Pani";

  const metryOptionsByQuestion = useMemo(() => {
    const out: Record<string, MetryczkaOption[]> = {};
    metryQuestions.forEach((q) => {
      const base = Array.isArray(q.options) ? [...q.options] : [];
      if (base.length < 2 || q.randomize_options !== true) {
        out[q.id] = base;
        return;
      }
      out[q.id] = shuffleMetryOptionsWithLocks(base);
    });
    return out;
  }, [metryQuestions]);

  const [aOrder] = useState(() => shuffle(A_ITEMS.map((x) => x.id)));
  const [aAnswers, setAAnswers] = useState<Record<string, number | undefined>>({});
  const [activeASliderId, setActiveASliderId] = useState<string | null>(null);

  const [bOrder] = useState(() => shuffle(B_ITEMS.map((x) => x.archetype)));
  const [selectedB1, setSelectedB1] = useState<string[]>([]);
  const [selectedB2, setSelectedB2] = useState<string>("");

  const [dOrder] = useState(() => shuffle(D_ITEMS.map((x) => x.id)));
  const [dIndex, setDIndex] = useState(0);
  const [dAnswers, setDAnswers] = useState<Record<string, AB | undefined>>({});
  const [selectedD13Id, setSelectedD13Id] = useState<string>("");

  const isMobile = window.innerWidth <= 900;
  const shouldRotate =
    ENFORCE_JST_LANDSCAPE_ON_MOBILE &&
    isMobile &&
    orientation === "portrait" &&
    step !== "intro" &&
    step !== "thanks" &&
    step !== "rejected";

  const scrollToTopAll = () => {
    const targets: (Window | HTMLElement)[] = [window];
    const de = document.documentElement;
    const db = document.body;
    const ds = document.scrollingElement as HTMLElement | null;
    if (de) targets.push(de);
    if (db) targets.push(db);
    if (ds) targets.push(ds);
    document.querySelectorAll<HTMLElement>(".jst-root, .jst-wrap, main, section").forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 1) targets.push(el);
    });
    targets.forEach((t) => {
      try {
        if (t === window) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        else t.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {
        // ignore
      }
      try {
        if (t !== window) (t as HTMLElement).scrollTop = 0;
      } catch {
        // ignore
      }
    });
  };

  const forceScrollTop = () => {
    scrollToTopAll();
    requestAnimationFrame(() => scrollToTopAll());
    setTimeout(() => scrollToTopAll(), 40);
    setTimeout(() => scrollToTopAll(), 140);
  };

  const goToStep = (next: Step) => {
    const active = document.activeElement as HTMLElement | null;
    try {
      active?.blur();
    } catch {
      // ignore
    }
    setStep(next);
    setTimeout(() => forceScrollTop(), 0);
  };

  useEffect(() => {
    const onResize = () => setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    window.addEventListener("resize", onResize);
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      // ignore
    }
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    forceScrollTop();
  }, [step, dIndex]);

  useEffect(() => {
    if (!token) return;
    const markClicked = async () => {
      try {
        await supabase.rpc("mark_jst_sms_clicked", { p_token: token });
      } catch {
        // brak blokady ankiety
      }
      try {
        await supabase.rpc("mark_jst_email_clicked", { p_token: token });
      } catch {
        // brak blokady ankiety
      }
    };
    void markClicked();
  }, [token]);

  const ensureStarted = async () => {
    if (!token || startedMarked) return;
    setStartedMarked(true);
    try {
      await markJstTokenStarted(token);
      await supabase.rpc("mark_jst_sms_started", { p_token: token });
      await supabase.rpc("mark_jst_email_started", { p_token: token });
    } catch {
      // brak blokady badania
    }
  };

  const trackQualityAnswerAction = () => {
    if (!fastClickCheckEnabled) return;
    const now = Date.now();
    if (qualityStartedAtRef.current === null) {
      qualityStartedAtRef.current = now;
    }
    const prevTs = fastClickLastActionAtRef.current;
    if (prevTs !== null) {
      const deltaSec = (now - prevTs) / 1000;
      if (deltaSec < FAST_CLICK_MIN_SECONDS) {
        fastClickShortStreakRef.current += 1;
        if (fastClickShortStreakRef.current >= FAST_CLICK_TRIGGER_STREAK) {
          fastClickWarningCountRef.current += 1;
          fastClickShortStreakRef.current = 0;
          setFastClickAcknowledgeChecked(false);
          setIsFastClickModalOpen(true);
        }
      } else {
        fastClickShortStreakRef.current = 0;
      }
    }
    fastClickLastActionAtRef.current = now;
  };

  const buildSurveyQualityPayload = (): Record<string, unknown> => {
    const warningCount = fastClickCheckEnabled ? Math.max(0, fastClickWarningCountRef.current) : 0;
    const suspicious = fastClickCheckEnabled && warningCount >= FAST_CLICK_SUSPICIOUS_WARNINGS;
    const startedAt = qualityStartedAtRef.current;
    const completionSeconds =
      startedAt !== null ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : null;
    return {
      enabled: fastClickCheckEnabled,
      min_interval_seconds: FAST_CLICK_MIN_SECONDS,
      trigger_streak: FAST_CLICK_TRIGGER_STREAK,
      suspicious_warning_threshold: FAST_CLICK_SUSPICIOUS_WARNINGS,
      warning_count: warningCount,
      suspicious,
      completion_seconds: completionSeconds,
      include_in_report: true,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    };
  };

  const clearErrors = () => {
    setErrorMsg("");
    setMissingAIds([]);
    setShowOnlyMissingMetry(false);
  };

  const goNextFromScreening = async () => {
    if (isResident === null) {
      setErrorMsg("Proszę zaznaczyć odpowiedź.");
      return;
    }
    clearErrors();
    if (!isResident) {
      if (token) {
        try {
          await markJstTokenRejected(token);
          await supabase.rpc("mark_jst_sms_rejected", { p_token: token });
          await supabase.rpc("mark_jst_email_rejected", { p_token: token });
        } catch {
          // brak blokady ankiety
        }
      }
      goToStep("rejected");
      return;
    }
    goToStep("metryka");
  };

  const validateMetry = () => {
    const missing = metryQuestions
      .filter((q) => q.required !== false)
      .filter((q) => !String(metryAnswers[q.id] || "").trim())
      .map((q) => q.id);
    const missingOpen = metryQuestions
      .filter((q) => isOpenOptionSelected(q, metryAnswers[q.id] || ""))
      .filter((q) => String(metryOpenTexts[q.id] || "").trim().length < METRY_OPEN_MIN_CHARS)
      .map((q) => q.id);
    if (missing.length || missingOpen.length) {
      if (!missing.length && missingOpen.length) setErrorMsg("Proszę uzupełnić pole tekstowe dla wybranej odpowiedzi otwartej.");
      else setErrorMsg("Proszę udzielić odpowiedzi na wszystkie pytania");
      setShowOnlyMissingMetry(true);
      return false;
    }
    clearErrors();
    return true;
  };

  const validateA = () => {
    const missing = A_ITEMS.map((x) => x.id).filter((id) => !aAnswers[id]);
    if (missing.length) {
      setErrorMsg("Proszę udzielić odpowiedzi na wszystkie pytania");
      setMissingAIds(missing);
      const firstId = missing[0];
      setTimeout(() => {
        document.querySelector(`[data-a-id="${firstId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 20);
      return false;
    }
    clearErrors();
    return true;
  };

  const validateB1 = () => {
    if (selectedB1.length !== 3) {
      setErrorMsg("Proszę zaznaczyć 3 odpowiedzi");
      return false;
    }
    clearErrors();
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

  const totalProgressSteps = 6 + D_ITEMS.length;
  const currentProgressStep = (() => {
    if (step === "screening") return 1;
    if (step === "metryka") return 2;
    if (step === "A") return 3;
    if (step === "B1") return 4;
    if (step === "B2") return 5;
    if (step === "D") return 6 + dIndex;
    if (step === "D13") return 6 + D_ITEMS.length;
    return 0;
  })();
  const progressPct = Math.max(0, Math.min(100, (currentProgressStep / Math.max(1, totalProgressSteps)) * 100));

  const goBack = () => {
    if (isFastClickModalOpen) return;
    clearErrors();
    if (step === "screening") {
      goToStep("intro");
      return;
    }
    if (step === "metryka") {
      goToStep("screening");
      return;
    }
    if (step === "A") {
      goToStep("metryka");
      return;
    }
    if (step === "B1") {
      goToStep("A");
      return;
    }
    if (step === "B2") {
      goToStep("B1");
      return;
    }
    if (step === "D") {
      if (dIndex > 0) {
        setDIndex((x) => Math.max(0, x - 1));
        setTimeout(() => forceScrollTop(), 0);
      } else {
        goToStep("B2");
      }
      return;
    }
    if (step === "D13") {
      setDIndex(Math.max(0, dOrder.length - 1));
      goToStep("D");
    }
  };

  const submitAll = async () => {
    if (!selectedD13Id) {
      setErrorMsg("Proszę wskazać jedną odpowiedź.");
      return;
    }
    clearErrors();
    setSubmitting(true);

    try {
      await ensureStarted();

      const payload: Record<string, unknown> = buildMetryPayload(metryQuestions, metryAnswers);
      metryQuestions.forEach((q) => {
        const openKey = `${String(q.db_column || q.id).trim().toUpperCase()}_OTHER`;
        const openValue = isOpenOptionSelected(q, metryAnswers[q.id] || "")
          ? String(metryOpenTexts[q.id] || "").trim()
          : "";
        payload[openKey] = openValue;
        if (String(q.db_column || q.id).trim().toUpperCase() === "M_ZAWOD") {
          payload.M_ZAWOD_OTHER = openValue;
        }
      });

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
      payload.survey_quality = buildSurveyQualityPayload();

      const { data, error } = await supabase.rpc("add_jst_response_by_slug", {
        p_slug: study.slug,
        p_payload: payload,
        p_respondent_id: null,
      });

      if (error || !data || (typeof data === "object" && (data as any).ok === false)) {
        const dataErr = typeof data === "object" ? String((data as any)?.error || "") : "";
        const dataStatus = typeof data === "object" ? String((data as any)?.study_status || "").toLowerCase() : "";
        if (dataErr === "study_inactive") {
          if (dataStatus === "closed") {
            setErrorMsg("Badanie zakończone. Nie można już oddawać głosów.");
          } else {
            setErrorMsg("Badanie jest nieaktywne. Wypełnianie ankiety jest tymczasowo wyłączone.");
          }
        } else {
          setErrorMsg("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
        }
        setSubmitting(false);
        return;
      }

      if (token) {
        try {
          await markJstTokenCompleted(token);
          await supabase.rpc("mark_jst_sms_completed", { p_token: token });
          await supabase.rpc("mark_jst_email_completed", { p_token: token });
        } catch {
          // bez blokady
        }
      }
      goToStep("thanks");
    } catch {
      setErrorMsg("Nie udało się zapisać odpowiedzi. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForwardKeyboard = async () => {
    if (isFastClickModalOpen) return;
    if (submitting) return;

    if (step === "intro") {
      goToStep("screening");
      return;
    }

    if (step === "screening") {
      await goNextFromScreening();
      return;
    }

    if (step === "metryka") {
      const ok = validateMetry();
      if (!ok) return;
      await ensureStarted();
      goToStep("A");
      return;
    }

    if (step === "A") {
      if (!validateA()) return;
      goToStep("B1");
      return;
    }

    if (step === "B1") {
      if (!validateB1()) return;
      goToStep("B2");
      return;
    }

    if (step === "B2") {
      if (!selectedB2) {
        setErrorMsg("Proszę wskazać jedną odpowiedź.");
        return;
      }
      clearErrors();
      goToStep("D");
      return;
    }

    if (step === "D") {
      if (!dAnswers[currentD.id]) {
        setErrorMsg("Proszę wskazać jedną odpowiedź.");
        return;
      }
      clearErrors();
      try {
        (document.activeElement as HTMLElement | null)?.blur();
      } catch {
        // ignore
      }
      if (dIndex < dOrder.length - 1) {
        setDIndex((x) => x + 1);
        setTimeout(() => forceScrollTop(), 0);
      } else {
        goToStep("D13");
      }
      return;
    }

    if (step === "D13") {
      await submitAll();
    }
  };

  useEffect(() => {
    if (step === "thanks" || step === "rejected" || isFastClickModalOpen) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (isFastClickModalOpen) return;
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.repeat) return;
      const target = ev.target as HTMLElement | null;
      const tag = (target?.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (ev.key === "ArrowLeft") {
        if (!allowBack || step === "intro") return;
        ev.preventDefault();
        goBack();
        return;
      }

      if (ev.key === "Enter" || ev.key === "ArrowRight") {
        ev.preventDefault();
        void handleForwardKeyboard();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    allowBack,
    step,
    isFastClickModalOpen,
    submitting,
    selectedB2,
    dIndex,
    dOrder.length,
    currentD.id,
    dAnswers,
    goBack,
    goNextFromScreening,
    validateMetry,
    ensureStarted,
    validateA,
    validateB1,
    clearErrors,
    submitAll,
  ]);
  const fastClickModal = isFastClickModalOpen ? (
    <div className="jst-fastclick-modal-overlay" role="presentation">
      <div
        className="jst-fastclick-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jst-fastclick-title"
        aria-describedby="jst-fastclick-text"
      >
        <p className="jst-fastclick-kicker">Kontrola jakości odpowiedzi</p>
        <h3 id="jst-fastclick-title" className="jst-fastclick-title">Zatrzymajmy się na chwilę</h3>
        <p id="jst-fastclick-text" className="jst-fastclick-text">{FAST_CLICK_WARNING_MESSAGE}</p>
        <label className="jst-fastclick-check-row" htmlFor="jst-fastclick-check">
          <input
            id="jst-fastclick-check"
            className="jst-fastclick-check-input"
            type="checkbox"
            checked={fastClickAcknowledgeChecked}
            onChange={(event) => setFastClickAcknowledgeChecked(event.target.checked)}
          />
          <span>{FAST_CLICK_WARNING_ACK_LABEL}</span>
        </label>
        <div className="jst-fastclick-actions">
          <button
            type="button"
            className="jst-fastclick-btn"
            onClick={() => {
              setIsFastClickModalOpen(false);
              setFastClickAcknowledgeChecked(false);
            }}
            disabled={!fastClickAcknowledgeChecked}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (shouldRotate) {
    return (
      <div className="jst-root">
        <div className="jst-rotate">Proszę obrócić telefon poziomo, aby wygodnie wypełnić ankietę.</div>
      </div>
    );
  }

  if (step === "thanks") {
    return (
      <main className="jst-root">
        <div className="jst-wrap">
          <section className="jst-card jst-center-card">
            <h2 className="jst-title jst-thanks-title">Dziękujemy za udział w badaniu!</h2>
            <p className="jst-thanks-sub">Twoje odpowiedzi zostały zapisane.</p>
            <p className="jst-muted jst-thanks-contact">
              Jeśli pojawiły się jakiekolwiek wątpliwości lub masz pytania, proszę o kontakt:
              <br />
              Piotr Stec, Badania.pro
              <br />
              e-mail: <a href="mailto:piotr.stec@badania.pro">piotr.stec@badania.pro</a>
              <br />
              tel.: <a href="tel:500121141">500-121-141</a>
            </p>
          </section>
          <footer className="jst-footer">
            opracowanie: Piotr Stec, Badania.pro® | © 2026
            <div className="jst-footer-sub">
              Jeśli pojawiły się jakieś wątpliwości lub masz pytania proszę o kontakt: Piotr Stec, Badania.pro, piotr.stec@badania.pro, tel.: 500-121-141
            </div>
          </footer>
        </div>
      </main>
    );
  }

  if (step === "rejected") {
    return (
      <main className="jst-root">
        <div className="jst-wrap">
          <section className="jst-card jst-center-card">
            <h2 className="jst-title">Niestety, nie spełnia Pan/Pani warunków udziału w badaniu.</h2>
            <p className="jst-muted">Dziękujemy za zainteresowanie.</p>
          </section>
          <footer className="jst-footer">
            opracowanie: Piotr Stec, Badania.pro® | © 2026
            <div className="jst-footer-sub">
              Jeśli pojawiły się jakieś wątpliwości lub masz pytania proszę o kontakt: Piotr Stec, Badania.pro, piotr.stec@badania.pro, tel.: 500-121-141
            </div>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main className="jst-root">
      <div className="jst-wrap">
        {errorMsg && <div className="jst-alert jst-alert-sticky">{errorMsg}</div>}
        {step !== "intro" && (showProgress || allowBack) && (
          <div className="jst-nav-top">
            {showProgress && (
              <div className="jst-nav-progress-track">
                <div className="jst-nav-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            )}
            <div className="jst-nav-row">
              {allowBack ? (
                <button type="button" className="jst-nav-back" onClick={goBack}>
                  ← Wstecz
                </button>
              ) : (
                <span />
              )}
              {showProgress ? (
                <span className="jst-nav-counter">{currentProgressStep}/{totalProgressSteps}</span>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}

        {step === "intro" && (
          <section className="jst-card jst-intro-card">
            <h1 className="jst-title jst-intro-title">Badanie mieszkańców {ctx.fullGen}</h1>
            <hr className="jst-intro-sep" />
            <p className="jst-intro-text">
              {renderJstTemplate(
                `Dzień dobry!

Przeprowadzamy badanie wśród mieszkańców {nazwa JST w dopełniaczu}, którzy ukończyli co najmniej 15 lat. Badanie dotyczy jakości życia, spraw społecznych i gospodarczych związanych z {narzędnik JST}. W tym badaniu chcemy przekonać się, jakie jest Pana/Pani podejście do spraw {miasta/gminy} i oczekiwania dotyczące tego, jak ${ctx.verbShould} {nazwa JST w mianowniku}.

Zapewniamy, że niniejsze badanie ma charakter całkowicie anonimowy. Potrwa ok. 5-7 minut.`,
                ctx
              )}
            </p>
            <p className="jst-intro-sign">
              Dziękujemy,
              <br />
              Zespół badawczy Badania.pro®
            </p>
            <div className="jst-intro-action">
              <button className="jst-btn" onClick={() => goToStep("screening")}>
                Zaczynamy
              </button>
            </div>
          </section>
        )}

        {step === "screening" && (
          <section className="jst-card">
            <h2 className="jst-title jst-step-title jst-screening-title">Czy jest Pan/Pani mieszkańcem/mieszkanką {ctx.fullGen}?</h2>
            <div className="jst-opt-list jst-screening-options">
              <button
                className={`jst-opt ${isResident === true ? "selected" : ""}`}
                onClick={() => {
                  if (isResident === null) trackQualityAnswerAction();
                  setIsResident(true);
                  clearErrors();
                }}
              >
                Tak
              </button>
              <button
                className={`jst-opt ${isResident === false ? "selected" : ""}`}
                onClick={() => {
                  if (isResident === null) trackQualityAnswerAction();
                  setIsResident(false);
                  clearErrors();
                }}
              >
                Nie
              </button>
            </div>
            <div className="jst-action-row">
              <button
                className="jst-btn"
                onClick={() => {
                  void goNextFromScreening();
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "metryka" && (
          <section className="jst-card">
            <h2 className="jst-title jst-step-title jst-metry-step-title">Na wstępie prosimy o podanie kilku danych demograficznych</h2>
            {metryQuestions.map((question: MetryczkaQuestion) => {
              const selectedCode = metryAnswers[question.id] || "";
              const displayOptions = metryOptionsByQuestion[question.id] || question.options;
              const needsOpen = isOpenOptionSelected(question, selectedCode);
              const missingBase = question.required !== false && !selectedCode;
              const missingOther = needsOpen && String(metryOpenTexts[question.id] || "").trim().length < METRY_OPEN_MIN_CHARS;
              const missing = missingBase || missingOther;
              return (
                <div key={question.id} className={`jst-metry ${missing && showOnlyMissingMetry ? "missing" : ""}`}>
                  <p className="jst-metry-title">{question.prompt}</p>
                  <div className="jst-radio-grid">
                    {displayOptions.map((opt) => (
                      <button
                        key={`${question.id}_${opt.code}`}
                        type="button"
                        className={`jst-radio-opt ${selectedCode === opt.code ? "selected" : ""}`}
                        onClick={() => {
                          const firstAnswerForQuestion =
                            !metryAnsweredRef.current.has(question.id) && !String(selectedCode || "").trim();
                          if (firstAnswerForQuestion) {
                            trackQualityAnswerAction();
                            metryAnsweredRef.current.add(question.id);
                          }
                          if (!isOpenOptionSelected(question, opt.code)) {
                            setMetryOpenTexts((prev) => ({ ...prev, [question.id]: "" }));
                          }
                          setMetryAnswers((prev) => ({ ...prev, [question.id]: opt.code }));
                          clearErrors();
                        }}
                      >
                        <span className={`jst-radio-mark ${selectedCode === opt.code ? "selected" : ""}`} aria-hidden>
                          <span className="jst-radio-dot" />
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  {needsOpen && (
                    <div className={`jst-other-wrap ${showOnlyMissingMetry && String(metryOpenTexts[question.id] || "").trim().length < METRY_OPEN_MIN_CHARS ? "missing" : ""}`}>
                      <label className="jst-other-label" htmlFor={`jst-metry-open-${question.id}`}>
                        Proszę doprecyzować odpowiedź:
                      </label>
                      <input
                        id={`jst-metry-open-${question.id}`}
                        type="text"
                        className="jst-other-input"
                        value={metryOpenTexts[question.id] || ""}
                        onChange={(e) => {
                          setMetryOpenTexts((prev) => ({ ...prev, [question.id]: e.target.value }));
                          clearErrors();
                        }}
                        placeholder="Wpisz odpowiedź"
                        maxLength={120}
                        autoComplete="off"
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="jst-action-row">
              <button
                className="jst-btn"
                onClick={async () => {
                  const ok = validateMetry();
                  if (!ok) return;
                  await ensureStarted();
                  goToStep("A");
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "A" && (
          <section className="jst-card">
            <h2 className="jst-title jst-step-title">
              Poniżej znajdują się pary sformułowań opisujące dwa różne podejścia do spraw {ctx.fullGen}. Proszę przesunąć suwak bliżej tego podejścia, które jest {panDat} bliższe.
            </h2>
            <p className="jst-muted">Ustawienie suwaka na środku oznacza, że oba podejścia są tak samo ważne.</p>

            {aOrder.map((id) => {
              const item = A_ITEMS.find((x) => x.id === id)!;
              const selected = aAnswers[id];
              const isActive = activeASliderId === id;
              const sliderValue = selected ?? 4;
              const sliderPos = ((sliderValue - 1) / 6) * 100;
              const bubblePos = Math.max(8, Math.min(92, sliderPos));
              const sliderStyle = {
                "--jst-pos": `${sliderPos}%`,
                "--jst-bubble-pos": `${bubblePos}%`,
              } as React.CSSProperties;
              const activateSlider = () => {
                setActiveASliderId(id);
                if (!selected) {
                  trackQualityAnswerAction();
                  setAAnswers((prev) => ({ ...prev, [id]: 4 }));
                  setMissingAIds((prev) => prev.filter((x) => x !== id));
                  setErrorMsg("");
                }
              };
              return (
                <div className={`jst-slider-row ${missingAIds.includes(id) ? "missing" : ""}`} data-a-id={id} key={id}>
                  <div className="jst-slider-top">
                    <span className="jst-end-chip">A</span>
                    <div className="jst-range-wrap" style={sliderStyle}>
                      {selected && isActive && <div className="jst-slider-choice-bubble">{SLIDER_LABELS[selected]}</div>}
                      <input
                        className={`jst-range ${selected ? "active" : ""}`}
                        type="range"
                        min={1}
                        max={7}
                        step={1}
                        value={sliderValue}
                        onPointerDown={activateSlider}
                        onFocus={activateSlider}
                        onClick={activateSlider}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!selected) {
                            trackQualityAnswerAction();
                          }
                          setActiveASliderId(id);
                          setAAnswers((prev) => ({ ...prev, [id]: val }));
                          setMissingAIds((prev) => prev.filter((x) => x !== id));
                          setErrorMsg("");
                        }}
                      />
                    </div>
                    <span className="jst-end-chip">B</span>
                  </div>
                  <div className="jst-slider-ticks-wrap">
                    <span />
                    <div className="jst-slider-ticks">
                      {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                        <span key={`${id}-tick-${v}`} className="jst-tick" />
                      ))}
                    </div>
                    <span />
                  </div>
                  <div className="jst-slider-head">
                    <span>{renderJstTemplate(item.left, ctx)}</span>
                    <span>{renderJstTemplate(item.right, ctx)}</span>
                  </div>
                  {selected && <div className="jst-slider-bubble">{SLIDER_LABELS[selected]}</div>}
                </div>
              );
            })}
            <div className="jst-action-row">
              <button
                className="jst-btn"
                onClick={() => {
                  if (!validateA()) return;
                  goToStep("B1");
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "B1" && (
          <section className="jst-card">
            <h2 className="jst-title jst-step-title">
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
                      const shouldTrack = !selected && selectedB1.length < 3;
                      if (shouldTrack) {
                        trackQualityAnswerAction();
                      }
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
            <div className="jst-action-row">
              <button
                className="jst-btn"
                onClick={() => {
                  if (!validateB1()) return;
                  goToStep("B2");
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "B2" && (
          <section className="jst-card">
            <h2 className="jst-title jst-step-title">Spośród wybranych przed chwilą opisów proszę wskazać jeden najważniejszy.</h2>
            <div className="jst-opt-list">
              {selectedB1.map((archetype) => {
                const item = B_ITEMS.find((x) => x.archetype === archetype)!;
                return (
                  <button
                    key={archetype}
                    type="button"
                    className={`jst-opt ${selectedB2 === archetype ? "selected" : ""}`}
                    onClick={() => {
                      if (!selectedB2) {
                        trackQualityAnswerAction();
                      }
                      setSelectedB2(archetype);
                      setErrorMsg("");
                    }}
                  >
                    {renderJstTemplate(item.text, ctx)}
                  </button>
                );
              })}
            </div>
            <div className="jst-action-row">
              <button
                className="jst-btn"
                onClick={() => {
                  if (!selectedB2) {
                    setErrorMsg("Proszę wskazać jedną odpowiedź.");
                    return;
                  }
                  clearErrors();
                  goToStep("D");
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "D" && (
          <section className="jst-card">
            <h2 className="jst-title jst-step-title">
              Poniżej znajdują się pary stwierdzeń o różnych sferach funkcjonowania {ctx.fullGen}. W każdej parze wybierz wariant, który lepiej odpowiada doświadczeniom i obserwacjom.
            </h2>
            <p className="jst-muted">
              Para {dIndex + 1} z {D_ITEMS.length}
            </p>
            <div className="jst-pair">
              <button
                className={`jst-opt ${dAnswers[currentD.id] === "A" ? "selected" : ""}`}
                onClick={() => {
                  if (!dAnswers[currentD.id]) {
                    trackQualityAnswerAction();
                  }
                  setDAnswers((prev) => ({ ...prev, [currentD.id]: "A" }));
                  setErrorMsg("");
                }}
              >
                {renderJstTemplate(currentD.a, ctx)}
              </button>
              <button
                className={`jst-opt ${dAnswers[currentD.id] === "B" ? "selected" : ""}`}
                onClick={() => {
                  if (!dAnswers[currentD.id]) {
                    trackQualityAnswerAction();
                  }
                  setDAnswers((prev) => ({ ...prev, [currentD.id]: "B" }));
                  setErrorMsg("");
                }}
              >
                {renderJstTemplate(currentD.b, ctx)}
              </button>
            </div>
            <div className="jst-action-row">
              <button
                className="jst-btn"
                onClick={() => {
                  if (!dAnswers[currentD.id]) {
                    setErrorMsg("Proszę wskazać jedną odpowiedź.");
                    return;
                  }
                  clearErrors();
                  try {
                    (document.activeElement as HTMLElement | null)?.blur();
                  } catch {
                    // ignore
                  }
                  if (dIndex < dOrder.length - 1) {
                    setDIndex((x) => x + 1);
                    setTimeout(() => forceScrollTop(), 0);
                  } else {
                    goToStep("D13");
                  }
                }}
              >
                Przejdź dalej
              </button>
            </div>
          </section>
        )}

        {step === "D13" && (
          <section className="jst-card">
            <h2 className="jst-title jst-step-title">Spośród wskazanych przed chwilą doświadczeń proszę wybrać jedną najważniejszą odpowiedź.</h2>
            <div className="jst-opt-list">
              {dChosenRows.map((row) => (
                <button
                  key={row.id}
                  className={`jst-opt ${selectedD13Id === row.id ? "selected" : ""}`}
                  onClick={() => {
                    if (!selectedD13Id) {
                      trackQualityAnswerAction();
                    }
                    setSelectedD13Id(row.id);
                    setErrorMsg("");
                  }}
                >
                  {renderJstTemplate(row.text, ctx)}
                </button>
              ))}
            </div>
            <div className="jst-action-row">
              <button className="jst-btn" onClick={submitAll} disabled={submitting}>
                {submitting ? "Wysyłanie..." : "Wyślij"}
              </button>
            </div>
          </section>
        )}

        <footer className="jst-footer">
          opracowanie: Piotr Stec, Badania.pro® | © 2026
          <div className="jst-footer-sub">
            Jeśli pojawiły się jakieś wątpliwości lub masz pytania proszę o kontakt: Piotr Stec, Badania.pro, piotr.stec@badania.pro, tel.: 500-121-141
          </div>
        </footer>
      </div>
      {fastClickModal}
    </main>
  );
};

export default JstSurvey;
