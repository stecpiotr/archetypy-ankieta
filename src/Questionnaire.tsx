import React, { useEffect, useRef, useState } from "react";
import "./LikertTable.css";
import "./SingleQuestionnaire.css";
import Thanks from "./Thanks";
import { questions } from "./questions";
import {
  getSlugFromUrl,
  loadStudyBySlug,
  buildDisplayFromStudy,
  getTokenFromUrl,
} from "./lib/studies";
import {
  buildMetryPayload,
  findMetryQuestionByColumn,
  initMetryAnswers,
  isMZawodOtherSelected,
  normalizeMetryczkaConfig,
  type MetryczkaQuestion,
} from "./lib/metryczka";

const SCALE_VALUES = [0, 1, 2, 3, 5] as const;
type Answer = (typeof SCALE_VALUES)[number];
const M_ZAWOD_OTHER_MIN_CHARS = 3;

type QuestionnaireSettings = {
  displayMode?: "matrix" | "single";
  showProgress?: boolean;
  allowBack?: boolean;
  randomizeQuestions?: boolean;
};

type QuestionnaireProps = {
  settings?: QuestionnaireSettings;
  initialGender?: "M" | "F";
  initialFullGen?: string | null;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callRpc<T = any>(fn: string, body: Record<string, any>): Promise<{ data: T | null; error: any }> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { data: null, error: { status: res.status, message: txt || res.statusText } };
    }
    const data = await res.json().catch(() => null);
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

const scaleLabels = [
  { label: "zdecydowanie nie", color: "#d62828", bg: "#fdeaea", border: "#f2b8b8" },
  { label: "raczej nie", color: "#d48806", bg: "#fff5e6", border: "#f0c98b" },
  { label: "ani tak, ani nie", color: "#1f7a34", bg: "#eef8ef", border: "#a9d7b1" },
  { label: "raczej tak", color: "#24aee4", bg: "#e9f7fd", border: "#9dd9f1" },
  { label: "zdecydowanie tak", color: "#1468d4", bg: "#eaf1fd", border: "#99b5ee" },
];

const ONE_LETTER_GLUE_RE = /\b([AaIiOoUuWwZz])\s+(?=\S)/g;
const SHORT_WORD_GLUE_RE = /(^|\s)(na|do|po|od|za|by|we|ze|no|to|ta|tu|co|mu|dla)\s+(?=\S)/gi;
const PHRASE_GLUE_PATTERNS = [
  /\bgdzie\s+inni\b/gi,
  /\brozwiązać\s+pokojowo\b/gi,
  /\bnawet\s+jeśli\s+jest\b/gi,
  /\bnawet\s+jeśli\s+koszt\b/gi,
  /\bnawet\s+jeśli\b/gi,
  /\bktórych\s+reprezentuje\b/gi,
  /\bjest\s+podstawą\b/gi,
  /\bktórych\s+głos\b/gi,
];

function withHardSpaces(text: string): string {
  let out = text;
  for (const pattern of PHRASE_GLUE_PATTERNS) {
    out = out.replace(pattern, (frag) => frag.replace(/\s+/g, "\u00A0"));
  }
  return out
    .replace(SHORT_WORD_GLUE_RE, (_m, prefix: string, shortWord: string) => `${prefix}${shortWord}\u00A0`)
    .replace(ONE_LETTER_GLUE_RE, "$1\u00A0");
}

function readViewport() {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return { width: Math.round(vv.width), height: Math.round(vv.height) };
  }
  const docEl = document.documentElement;
  if (docEl.clientWidth > 0 && docEl.clientHeight > 0) {
    return { width: docEl.clientWidth, height: docEl.clientHeight };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

function shuffleIndices(arr: number[]): number[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const Questionnaire: React.FC<QuestionnaireProps> = ({
  settings,
  initialGender = "M",
  initialFullGen = null,
}) => {
  const displayMode = settings?.displayMode === "single" ? "single" : "matrix";
  const showProgress = settings?.showProgress !== false;
  const allowBack = settings?.allowBack !== false;
  const randomizeQuestions = settings?.randomizeQuestions === true;

  const [responses, setResponses] = useState<(Answer | null)[]>(() => Array(questions.length).fill(null));
  const [hovered, setHovered] = useState<{ row: number | null; col: number | null }>({ row: null, col: null });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [apiError, setApiError] = useState("");
  const [missingRows, setMissingRows] = useState<number[]>([]);
  const [singleIndex, setSingleIndex] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [viewport, setViewport] = useState(() => readViewport());

  const tokenRef = useRef<string | null>(null);
  const startedMarkedRef = useRef<boolean>(false);

  const [slug, setSlug] = useState<string | null>(null);
  const [fullGen, setFullGen] = useState<string | null>(initialFullGen);
  const [gender, setGender] = useState<"M" | "F">(initialGender);
  const [metryConfig, setMetryConfig] = useState(() => normalizeMetryczkaConfig(null));
  const metryQuestions = metryConfig.questions;
  const [metryAnswers, setMetryAnswers] = useState<Record<string, string>>({});
  const [metryZawodOther, setMetryZawodOther] = useState("");
  const [showMissingMetry, setShowMissingMetry] = useState(false);
  const [metryCompleted, setMetryCompleted] = useState(false);

  useEffect(() => {
    setMetryAnswers((prev) => initMetryAnswers(metryQuestions, prev));
  }, [metryQuestions]);

  const zawodQuestion = findMetryQuestionByColumn(metryQuestions, "M_ZAWOD");
  const needsZawodOther = isMZawodOtherSelected(zawodQuestion, zawodQuestion ? metryAnswers[zawodQuestion.id] || "" : "");

  const questionOrderRef = useRef<number[] | null>(null);
  if (!questionOrderRef.current) {
    const baseOrder = questions.map((_, idx) => idx);
    questionOrderRef.current = randomizeQuestions ? shuffleIndices(baseOrder) : baseOrder;
  }
  const questionOrder = questionOrderRef.current;

  useEffect(() => {
    const updateViewport = () => {
      setViewport(readViewport());
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    window.screen?.orientation?.addEventListener?.("change", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.screen?.orientation?.removeEventListener?.("change", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (displayMode !== "matrix") return;
    const timer = window.setInterval(() => {
      setViewport(readViewport());
    }, 180);
    return () => window.clearInterval(timer);
  }, [displayMode]);

  useEffect(() => {
    (async () => {
      const t = getTokenFromUrl();
      tokenRef.current = t || null;

      if (t) {
        callRpc("mark_sms_clicked", { p_token: t });
        callRpc("mark_email_clicked", { p_token: t });
      }

      const s = getSlugFromUrl();
      setSlug(s);
      if (!s) return;

      const study = await loadStudyBySlug(s);
      if (!study) {
        setApiError(
          "Brak identyfikatora badania w linku lub badanie nie istnieje. Skontaktuj się z administratorem.",
        );
        return;
      }

      const c = buildDisplayFromStudy(study);
      setGender(c.gender);
      setFullGen(c.fullGen);
      setMetryConfig(normalizeMetryczkaConfig((study as any).metryczka_config));
      setMetryCompleted(false);
    })();
  }, []);

  const screenOrientationType = window.screen?.orientation?.type?.toLowerCase?.() || "";
  const isLandscapeByDims = viewport.width > viewport.height + 6;
  const isPortraitByDims = viewport.height > viewport.width + 6;
  const orientation = isLandscapeByDims
    ? "landscape"
    : isPortraitByDims
      ? "portrait"
      : screenOrientationType.includes("landscape")
        ? "landscape"
        : screenOrientationType.includes("portrait")
          ? "portrait"
          : window.matchMedia("(orientation: portrait)").matches
            ? "portrait"
            : "landscape";
  const isMobileViewport = Math.min(viewport.width, viewport.height) <= 500;
  const showOrientationWarning =
    !submitted && metryCompleted && displayMode === "matrix" && isMobileViewport && orientation === "portrait";

  const markStartedOnce = () => {
    if (startedMarkedRef.current) return;
    startedMarkedRef.current = true;
    const t = tokenRef.current;
    if (t) {
      callRpc("mark_sms_started", { p_token: t });
      callRpc("mark_email_started", { p_token: t });
    }
  };

  const handleResponse = (questionIdx: number, value: Answer) => {
    markStartedOnce();
    const next = [...responses];
    next[questionIdx] = value;
    setResponses(next);
    setError(false);
    setMissingRows([]);
    setApiError("");
  };

  const collectMissing = (): number[] =>
    responses.map((v, i) => (v === null ? i : -1)).filter((idx) => idx !== -1);

  const validateMetry = (): boolean => {
    const missing = metryQuestions
      .filter((q) => q.required !== false)
      .filter((q) => !String(metryAnswers[q.id] || "").trim())
      .map((q) => q.id);
    const missingOther = needsZawodOther && metryZawodOther.trim().length < M_ZAWOD_OTHER_MIN_CHARS;
    if (missing.length || missingOther) {
      if (!missing.length && missingOther) {
        setApiError(`Proszę doprecyzować odpowiedź "inna (jaka?)" (min. ${M_ZAWOD_OTHER_MIN_CHARS} znaki).`);
      } else {
        setApiError("Proszę uzupełnić wszystkie wymagane pola metryczki.");
      }
      setShowMissingMetry(true);
      return false;
    }
    setShowMissingMetry(false);
    setApiError("");
    return true;
  };

  const buildMetryScoresPayload = (): Record<string, unknown> => {
    const metryPayload = buildMetryPayload(metryQuestions, metryAnswers);
    metryPayload.M_ZAWOD_OTHER = needsZawodOther ? metryZawodOther.trim() : "";
    return { metryczka: metryPayload };
  };

  const handleMetryNext = (): void => {
    if (!validateMetry()) return;
    markStartedOnce();
    setMetryCompleted(true);
    setError(false);
    setMissingRows([]);
    setApiError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitResponses = async () => {
    if (!slug) {
      setApiError("Brak identyfikatora badania w linku (użyj adresu /slug, np. /lublin).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setError(false);
    setMissingRows([]);
    setApiError("");

    try {
      const payloadAnswers = responses.map((v) => v as number);
      const { error: rpcError } = await callRpc("add_response_by_slug", {
        p_slug: slug,
        p_answers: payloadAnswers,
        p_scores: buildMetryScoresPayload(),
        p_raw_total: null,
        p_respondent_code: null,
      });

      if (rpcError) {
        console.error("RPC error:", rpcError);
        setApiError("Błąd zapisu do bazy ankiet (RPC). Spróbuj ponownie.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const t = tokenRef.current;
      if (t) {
        callRpc("mark_sms_completed", { p_token: t });
        callRpc("mark_email_completed", { p_token: t });
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setApiError("Nieoczekiwany błąd sieci podczas zapisu.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleMatrixSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = collectMissing();
    if (missing.length) {
      setError(true);
      setMissingRows(missing);
      setApiError("");
      setTimeout(() => {
        const firstIdx = missing[0];
        const stickyMsg = document.querySelector(".sticky-error-msg") as HTMLElement | null;
        const offset = stickyMsg ? stickyMsg.offsetHeight + 10 : 80;
        const el = rowRefs.current[firstIdx];
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: top - offset, behavior: "smooth" });
        }
      }, 60);
      return;
    }
    await submitResponses();
  };

  const totalQuestions = questions.length;
  const currentOriginalIdx = questionOrder[Math.min(singleIndex, totalQuestions - 1)] ?? 0;
  const currentItem = questions[currentOriginalIdx];
  const currentQuestionTextRaw = gender === "F" ? currentItem.textF : currentItem.textM;
  const currentQuestionText = withHardSpaces(currentQuestionTextRaw);
  const selectedCurrent = responses[currentOriginalIdx];

  const singleProgress = Math.max(0, Math.min(100, ((singleIndex + 1) / Math.max(1, totalQuestions)) * 100));

  const handleSingleNext = async () => {
    if (selectedCurrent === null) {
      setError(true);
      setMissingRows([currentOriginalIdx]);
      setApiError("Aby przejść dalej, wybierz jedną odpowiedź.");
      return;
    }
    setError(false);
    setMissingRows([]);
    setApiError("");
    if (singleIndex < totalQuestions - 1) {
      setSingleIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    await submitResponses();
  };

  const handleSingleBack = () => {
    if (singleIndex <= 0) return;
    setError(false);
    setMissingRows([]);
    setApiError("");
    setSingleIndex((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (displayMode !== "single" || submitted || !metryCompleted) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.repeat) return;
      const target = ev.target as HTMLElement | null;
      const tag = (target?.tagName || "").toUpperCase();
      if (tag === "TEXTAREA" || tag === "SELECT") return;

      if (ev.key === "Enter") {
        ev.preventDefault();
        if (selectedCurrent === null) return;
        void handleSingleNext();
        return;
      }

      if (ev.key === "ArrowLeft") {
        if (!allowBack || singleIndex <= 0) return;
        ev.preventDefault();
        handleSingleBack();
        return;
      }

      if (ev.key === "ArrowRight") {
        if (selectedCurrent === null) return;
        ev.preventDefault();
        void handleSingleNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    displayMode,
    submitted,
    metryCompleted,
    selectedCurrent,
    allowBack,
    singleIndex,
    handleSingleNext,
    handleSingleBack,
  ]);

  if (!submitted && !metryCompleted) {
    const title = fullGen
      ? `Badanie wizerunku i postrzegania ${fullGen}`
      : "Badanie wizerunku i postrzegania";
    return (
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 12px 40px 12px",
          fontFamily: "'Roboto', Arial, sans-serif",
        }}
      >
        {!!apiError && (
          <div
            style={{
              position: "sticky",
              top: 6,
              zIndex: 60,
              marginBottom: 14,
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 600,
            }}
          >
            {apiError}
          </div>
        )}

        <div
          style={{
            fontWeight: 700,
            fontSize: "2.1rem",
            color: "#2c3e50",
            textAlign: "left",
            margin: "0 0 18px 0",
            letterSpacing: 1,
            lineHeight: 1.13,
          }}
        >
          {title}
        </div>

        <hr
          style={{
            border: 0,
            borderTop: "1.5px solid #ececec",
            margin: "0 0 18px 0",
          }}
        />

        <section
          style={{
            border: "1px solid #dbe3eb",
            borderRadius: 12,
            background: "#fff",
            padding: "16px 16px 18px 16px",
          }}
        >
          <h2 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "1.28rem" }}>
            Na wstępie prosimy o podanie kilku danych demograficznych
          </h2>

          {metryQuestions.map((question: MetryczkaQuestion) => {
            const selectedCode = metryAnswers[question.id] || "";
            const missingBase = question.required !== false && !selectedCode;
            const missingOther = question.id === zawodQuestion?.id
              && needsZawodOther
              && metryZawodOther.trim().length < M_ZAWOD_OTHER_MIN_CHARS;
            const missing = showMissingMetry && (missingBase || missingOther);
            return (
              <div
                key={question.id}
                style={{
                  margin: "12px 0 14px 0",
                  padding: "10px 10px 8px 10px",
                  borderRadius: 10,
                  border: missing ? "1px solid #fecaca" : "1px solid #edf2f7",
                  background: missing ? "#fff7f7" : "#fbfdff",
                }}
              >
                <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#243447" }}>{question.prompt}</p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "8px",
                  }}
                >
                  {question.options.map((opt) => {
                    const selected = selectedCode === opt.code;
                    return (
                      <button
                        key={`${question.id}_${opt.code}`}
                        type="button"
                        onClick={() => {
                          if (question.id === zawodQuestion?.id && !isMZawodOtherSelected(question, opt.code)) {
                            setMetryZawodOther("");
                          }
                          setMetryAnswers((prev) => ({ ...prev, [question.id]: opt.code }));
                          setShowMissingMetry(false);
                          setApiError("");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          width: "100%",
                          borderRadius: 8,
                          border: selected ? "1px solid #60a5fa" : "1px solid #dbe3eb",
                          background: selected ? "#eff6ff" : "#fff",
                          color: "#1f2937",
                          textAlign: "left",
                          padding: "8px 10px",
                          cursor: "pointer",
                        }}
                      >
                        <span>{opt.label}</span>
                        <span
                          aria-hidden
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: selected ? "4px solid #3b82f6" : "1.5px solid #9ca3af",
                            boxSizing: "border-box",
                            flex: "0 0 auto",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>

                {question.id === zawodQuestion?.id && needsZawodOther && (
                  <div style={{ marginTop: 10 }}>
                    <label
                      htmlFor="personal-metry-zawod-other"
                      style={{ display: "block", marginBottom: 6, fontSize: "0.96rem", color: "#334155" }}
                    >
                      Proszę doprecyzować odpowiedź (min. {M_ZAWOD_OTHER_MIN_CHARS} znaki):
                    </label>
                    <input
                      id="personal-metry-zawod-other"
                      type="text"
                      value={metryZawodOther}
                      onChange={(e) => {
                        setMetryZawodOther(e.target.value);
                        setShowMissingMetry(false);
                        setApiError("");
                      }}
                      maxLength={120}
                      autoComplete="off"
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        border: showMissingMetry && metryZawodOther.trim().length < M_ZAWOD_OTHER_MIN_CHARS
                          ? "1px solid #ef4444"
                          : "1px solid #d1d5db",
                        padding: "9px 10px",
                        boxSizing: "border-box",
                        fontSize: "1rem",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleMetryNext}
              style={{
                minWidth: 180,
                background: "#06b09c",
                color: "#fff",
                fontWeight: 700,
                fontFamily: "'Roboto', Arial, sans-serif",
                fontSize: "1.04rem",
                border: "none",
                borderRadius: 8,
                padding: "0.62em 1.2em",
                boxShadow: "0 2px 8px #ececec",
                cursor: "pointer",
                letterSpacing: "0.5px",
              }}
            >
              Przejdź dalej
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (showOrientationWarning) {
    return (
      <div className="orientation-warning">
        <p>
          <b>Prosimy, obróć telefon poziomo</b> <br />
          <span style={{ fontSize: "1.08em" }}>
            Ta tabela działa wygodnie tylko w układzie poziomym.
            <br />
            <span role="img" aria-label="rotate">🔄</span>
          </span>
        </p>
      </div>
    );
  }

  if (submitted) return <Thanks />;

  const title = fullGen
    ? `Badanie wizerunku i postrzegania ${fullGen}`
    : "Badanie wizerunku i postrzegania";
  const politykWord = gender === "F" ? "polityczki" : "polityka";
  const singleSubleadText = withHardSpaces(
    `Pamiętaj: Twoje odpowiedzi dotyczą ${fullGen ?? ""} jako osoby publicznej (${politykWord}).`,
  );
  const singleLeadText = withHardSpaces(
    `Czy zgadzasz się z poniższymi stwierdzeniami na temat ${fullGen ?? ""}?`,
  );
  const matrixLeadText = withHardSpaces(
    `Czy zgadzasz się z poniższymi stwierdzeniami na temat ${fullGen ?? ""}?`,
  );
  const matrixRememberText = withHardSpaces(
    `Twoje odpowiedzi dotyczą ${fullGen ?? ""} jako osoby publicznej (${politykWord})`,
  );

  if (displayMode === "single") {
    return (
      <div className="single-survey-root">
        {(error || apiError) && (
          <div className="single-error-banner">
            {error && <div>Wybierz odpowiedź, aby przejść dalej.</div>}
            {apiError && <div>{apiError}</div>}
          </div>
        )}

        <div className="single-shell">
          <div className="single-nav-wrap">
            {showProgress && (
              <div className="single-progress-track">
                <div className="single-progress-fill" style={{ width: `${singleProgress}%` }} />
              </div>
            )}
            <div className="single-nav-row">
              {allowBack ? (
                <button
                  type="button"
                  className="single-back-btn"
                  onClick={handleSingleBack}
                  disabled={singleIndex === 0}
                >
                  ← Wstecz
                </button>
              ) : (
                <span />
              )}
              {showProgress ? (
                <span className="single-counter">{singleIndex + 1}/{totalQuestions}</span>
              ) : (
                <span />
              )}
            </div>
          </div>

          <main className="single-main">
            <section className="single-question-zone">
              <p className="single-sublead">{singleSubleadText}</p>
              <p className="single-lead">{singleLeadText}</p>
              <h2 className="single-question-text">{currentQuestionText}</h2>
            </section>

            <section className="single-scale-zone">
              <div className="single-scale-grid" role="radiogroup" aria-label="Skala odpowiedzi">
                {scaleLabels.map((opt, idx) => {
                  const value = SCALE_VALUES[idx];
                  const selected = selectedCurrent === value;
                  const isNeutral = opt.label === "ani tak, ani nie";
                  const isStrongNo = opt.label === "zdecydowanie nie";
                  const isStrongYes = opt.label === "zdecydowanie tak";
                  return (
                    <button
                      key={`${currentItem.id}-${value}`}
                      type="button"
                      className={`single-scale-btn ${selected ? "selected" : ""}`}
                      style={
                        {
                          "--opt-color": opt.color,
                          "--opt-bg": opt.bg,
                          "--opt-border": opt.border,
                        } as React.CSSProperties
                      }
                      onClick={() => handleResponse(currentOriginalIdx, value)}
                    >
                      {isNeutral ? (
                        <>
                          ani tak,
                          <br />
                          ani nie
                        </>
                      ) : isStrongNo ? (
                        <>
                          zdecydowanie
                          <br />
                          nie
                        </>
                      ) : isStrongYes ? (
                        <>
                          zdecydowanie
                          <br />
                          tak
                        </>
                      ) : (
                        opt.label
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="single-footer-actions">
              <button
                type="button"
                className="single-next-btn"
                onClick={() => void handleSingleNext()}
                disabled={selectedCurrent === null}
              >
                {singleIndex >= totalQuestions - 1 ? "Wyślij" : "Dalej"}
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const leadBlock = (
    <>
      <div
        style={{
          fontWeight: 600,
          fontSize: "1.30rem",
          color: "#253347",
          lineHeight: 1.24,
          marginTop: "40px",
        }}
      >
        {matrixLeadText}
      </div>

      <div style={{ margin: "20px 0 15px 0", fontSize: "1.20rem" }}>
        <span style={{ color: "#c62828", fontWeight: 700 }}>Pamiętaj! </span>
        <span style={{ color: "#253347", fontWeight: 400 }}>
          <u>{matrixRememberText}</u>{" "}
        </span>
      </div>
    </>
  );

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "28px 12px 0 12px",
        fontFamily: "'Roboto', Arial, sans-serif",
      }}
    >
      {(error || apiError) && (
        <div className="sticky-error-msg">
          {error && <div>Proszę udzielić odpowiedzi w każdym wierszu.</div>}
          {apiError && <div>{apiError}</div>}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: isMobileViewport ? "flex-start" : "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
          gap: isMobileViewport ? 0 : 24,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "2.1rem",
              color: "#2c3e50",
              textAlign: "left",
              margin: "0 0 18px 0",
              letterSpacing: 1,
              lineHeight: 1.13,
            }}
          >
            {title}
          </div>

          <hr
            style={{
              border: 0,
              borderTop: "1.5px solid #ececec",
              margin: "0 0 18px 0",
            }}
          />

          {leadBlock}
        </div>

        {!isMobileViewport && (
          <img
            src="/BadaniaPRO(r).png"
            alt="Badania.pro logo"
            style={{
              height: 45,
              width: "auto",
              marginLeft: 24,
              borderRadius: 7,
              background: "#fff",
            }}
          />
        )}
      </div>

      <form onSubmit={(e) => void handleMatrixSubmit(e)}>
        <table className="likert-table">
          <thead>
            <tr>
              <th className="th-blank" style={{ left: 0 }} aria-label="Pytania" scope="col"></th>
              {scaleLabels.map((col, colIdx) => (
                <th
                  key={colIdx}
                  className={`th-scale${hovered.col === colIdx ? " hovered" : ""}`}
                  style={{ color: col.color }}
                  scope="col"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questionOrder.map((questionIdx) => {
              const item = questions[questionIdx];
              const questionTextRaw = gender === "F" ? item.textF : item.textM;
              const questionText = withHardSpaces(questionTextRaw);
              const missing = missingRows.includes(questionIdx);
              return (
                <tr
                  key={item.id}
                  ref={(el) => {
                    rowRefs.current[questionIdx] = el;
                  }}
                  className={
                    missing
                      ? "missing-row"
                      : hovered.row === questionIdx
                        ? "hovered-row"
                        : ""
                  }
                >
                  <td
                    className={
                      "question-cell sticky-col" +
                      (missing ? " missing-cell" : "") +
                      (hovered.col !== null ? " col-hover-bg" : "")
                    }
                    style={{ textAlign: "left", left: 0 }}
                  >
                    {questionText}
                  </td>
                  {scaleLabels.map((_, colIdx) => (
                    <td
                      key={colIdx}
                      className={
                        "option-cell" +
                        (missing ? " missing-cell" : "") +
                        (hovered.col === colIdx ? " hovered-col" : "") +
                        (hovered.row === questionIdx ? " hovered-row" : "")
                      }
                      onMouseEnter={() => setHovered({ row: questionIdx, col: colIdx })}
                      onMouseLeave={() => setHovered({ row: null, col: null })}
                    >
                      <label className="option-label">
                        <input
                          type="radio"
                          name={`row-${questionIdx}`}
                          value={SCALE_VALUES[colIdx]}
                          checked={responses[questionIdx] === SCALE_VALUES[colIdx]}
                          onChange={() => handleResponse(questionIdx, SCALE_VALUES[colIdx])}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {!submitted && (
          <div style={{ maxWidth: 380, margin: "42px auto 60px auto" }}>
            <button
              type="submit"
              style={{
                width: "100%",
                background: "#06b09c",
                color: "#fff",
                fontWeight: 700,
                fontFamily: "'Roboto', Arial, sans-serif",
                fontSize: "1.1rem",
                border: "none",
                borderRadius: 8,
                padding: "0.75em 0",
                boxShadow: "0 2px 8px #ececec",
                cursor: "pointer",
                letterSpacing: "0.5px",
                transition: "background 0.2s",
              }}
            >
              Wyślij
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Questionnaire;
