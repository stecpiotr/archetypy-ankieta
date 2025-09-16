import React, { useRef, useState, useEffect } from "react";
import "./LikertTable.css";
import Thanks from "./Thanks";
import { questions } from "./questions";

// ⬇ zachowujemy import (nie przeszkadza), ale RPC robimy przez fetch
// import { supabase } from "./supabaseClient";
import {
  getSlugFromUrl,
  loadStudyBySlug,
  buildDisplayFromStudy,
  getTokenFromUrl,
} from "./lib/studies";

// pod importami
const SCALE_VALUES = [0, 1, 2, 3, 5] as const;
type Answer = (typeof SCALE_VALUES)[number]; // 0 | 1 | 2 | 3 | 5

// ──────────────────────────────────────────────
// Pomocnicze: wywołanie RPC przez REST (pewniak)
// ──────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callRpc<T = any>(fn: string, body: Record<string, any>): Promise<{ data: T | null; error: any }> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
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
  { label: "zdecydowanie nie", color: "#d32f2f" },
  { label: "raczej nie",        color: "#f9a825" },
  { label: "ani tak, ani nie",  color: "#388e3c" },
  { label: "raczej tak",        color: "#4fc3f7" },
  { label: "zdecydowanie tak",  color: "#1976d2" },
];

const Questionnaire: React.FC = () => {
  const [responses, setResponses] = React.useState<(Answer | null)[]>(
    () => Array(questions.length).fill(null)
  );

  const [hovered, setHovered] = useState<{ row: number | null; col: number | null }>({ row: null, col: null });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [apiError, setApiError] = useState("");
  const [missingRows, setMissingRows] = useState<number[]>([]);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [orientation, setOrientation] = useState(
    window.innerWidth > window.innerHeight ? "landscape" : "portrait"
  );

  // Token z URL + flaga żeby "started" wysłać tylko raz
  const tokenRef = useRef<string | null>(null);
  const startedMarkedRef = useRef<boolean>(false);

  // Z bazy
  const [slug, setSlug] = useState<string | null>(null);
  const [fullGen, setFullGen] = useState<string | null>(null);
  const [fullAcc, setFullAcc] = useState<string | null>(null);
  const [fullIns, setFullIns] = useState<string | null>(null);
  const [fullLoc, setFullLoc] = useState<string | null>(null);
  const [gender, setGender] = useState<"M" | "F">("M");

  useEffect(() => {
    const onResize = () =>
      setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Wczytaj slug + study + odnotuj kliknięcie jeśli jest ?t=...
  useEffect(() => {
    (async () => {
      const t = getTokenFromUrl();
      tokenRef.current = t || null;

      if (t) {
        // było: supabase.rpc(...).catch(...)
        callRpc("mark_sms_clicked", { p_token: t });
      }

      const s = getSlugFromUrl();
      setSlug(s);
      if (!s) return;

      const study = await loadStudyBySlug(s);
      if (!study) {
        setApiError(
          "Brak identyfikatora badania w linku lub badanie nie istnieje. Skontaktuj się z administratorem."
        );
        return;
      }

      const c = buildDisplayFromStudy(study);
      setGender(c.gender);
      setFullGen(c.fullGen);
      setFullAcc(c.fullAcc);
      setFullIns(c.fullIns);
      setFullLoc(c.fullLoc);
    })();
  }, []);

  const isMobile = window.innerWidth < 800;
  if (!submitted && isMobile && orientation === "portrait") {
    return (
      <div className="orientation-warning">
        <p>
          <b>Prosimy, obróć telefon poziomo</b> <br />
          <span style={{ fontSize: "1.08em" }}>
            Ta tabela działa wygodnie tylko w układzie poziomym.<br />
            <span role="img" aria-label="rotate">🔄</span>
          </span>
        </p>
      </div>
    );
  }

  // Pierwsza odpowiedź = „rozpoczęto” (wysyłamy tylko raz)
  const markStartedOnce = () => {
    if (startedMarkedRef.current) return;
    startedMarkedRef.current = true;
    const t = tokenRef.current;
    if (t) {
      callRpc("mark_sms_started", { p_token: t });
    }
  };

   const handleResponse = (row: number, value: Answer) => {
     markStartedOnce();
     const next = [...responses];
     next[row] = value;
     setResponses(next);
     setError(false);
     setMissingRows([]);
     setApiError("");
   };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const missing = responses.map((v, i) => (v === null ? i : -1)).filter(i => i !== -1);
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

  if (!slug) {
    setApiError("Brak identyfikatora badania w linku (użyj adresu /slug, np. /lublin).");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  setError(false);
  setMissingRows([]);
  setApiError("");

  try {
    // 0/1/2/3/5 – żadnych nulli
    const payloadAnswers = responses.map(v => v as number);
    console.log("OUT answers:", payloadAnswers); // podgląd w konsoli

    const { error } = await callRpc("add_response_by_slug", {
      p_slug: slug,
      p_answers: payloadAnswers,            // ⬅⬅⬅ TU JEST ZMIANA
      p_scores: null,
      p_raw_total: null,
      p_respondent_code: null,
    });

    if (error) {
      console.error("RPC error:", error);
      setApiError("Błąd zapisu do bazy ankiet (RPC). Spróbuj ponownie.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const t = tokenRef.current;
    if (t) {
      callRpc("mark_sms_completed", { p_token: t });
    }

    setSubmitted(true);
  } catch (err) {
    console.error(err);
    setApiError("Nieoczekiwany błąd sieci podczas zapisu.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

  if (submitted) return <Thanks />;

  const title = fullGen
    ? `Badanie wizerunku i postrzegania ${fullGen}`
    : "Badanie wizerunku i postrzegania";

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
        {/* biernik */}
        Postaraj się wcielić w <b>{fullAcc ?? ""}</b> i odpowiedz na następujące pytania:
      </div>

      <div style={{ margin: "20px 0 15px 0", fontSize: "1.20rem" }}>
        <span style={{ color: "#c62828", fontWeight: 700 }}>Pamiętaj! </span>
        <span style={{ color: "#253347", fontWeight: 400 }}>
          Odpowiadasz jakbyś był(a) <u>{fullIns ?? ""} politykiem (osobą publiczną)</u>{" "}
          <span role="img" aria-label="smile">😊</span>
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
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
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
      </div>

      <form onSubmit={handleSubmit}>
        <table className="likert-table">
          <thead>
            <tr>
              <th className="th-blank" style={{ left: 0 }} aria-label="Pytania" scope="col"></th>
              {scaleLabels.map((col, colIdx) => (
                <th
                  key={colIdx}
                  className={"th-scale" + (hovered.col === colIdx ? " hovered" : "")}
                  style={{ color: col.color }}
                  scope="col"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((item, rowIdx) => {
              const questionText = gender === "F" ? item.textF : item.textM;
              const missing = missingRows.includes(rowIdx);
              return (
                <tr
                  key={item.id}
                  ref={(el) => (rowRefs.current[rowIdx] = el)}
                  className={
                    missing
                      ? "missing-row"
                      : hovered.row === rowIdx
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
                        (hovered.row === rowIdx ? " hovered-row" : "")
                      }
                      onMouseEnter={() => setHovered({ row: rowIdx, col: colIdx })}
                      onMouseLeave={() => setHovered({ row: null, col: null })}
                    >
                      <label className="option-label">
                        <input
                          type="radio"
                          name={`row-${rowIdx}`}
                          value={SCALE_VALUES[colIdx]}
                          checked={responses[rowIdx] === SCALE_VALUES[colIdx]}
                          onChange={() => handleResponse(rowIdx, SCALE_VALUES[colIdx])}
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


