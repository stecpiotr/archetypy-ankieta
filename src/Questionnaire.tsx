import React, { useRef, useState, useEffect } from "react";
import "./LikertTable.css";
import Thanks from "./Thanks";
import { questions } from "./questions";

import { supabase } from "./supabaseClient";
import { getSlugFromUrl, loadStudyBySlug } from "./lib/studies";
import { buildCases } from "./lib/cases";

// Skala odpowiedzi
const scaleLabels = [
  { label: "zdecydowanie nie", color: "#d32f2f" },
  { label: "raczej nie",        color: "#f9a825" },
  { label: "ani tak, ani nie",  color: "#388e3c" },
  { label: "raczej tak",        color: "#4fc3f7" },
  { label: "zdecydowanie tak",  color: "#1976d2" },
];

const Questionnaire: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(questions.length).fill(0));
  const [hovered, setHovered] = useState<{ row: number | null; col: number | null }>({ row: null, col: null });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [apiError, setApiError] = useState("");
  const [missingRows, setMissingRows] = useState<number[]>([]);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [orientation, setOrientation] = useState(
    window.innerWidth > window.innerHeight ? "landscape" : "portrait"
  );

  // nowość: badanie + odmiany (bez zmiany wyglądu/tekstu)
  const [slug, setSlug] = useState<string | null>(null);
  const [nameGen, setNameGen] = useState<string>("Marcina Gołka");       // dopełniacz
  const [nameInst, setNameInst] = useState<string>("Marcinem Gołkiem");  // narzędnik (fallback)

  // responsywność
  useEffect(() => {
    const onResize = () => setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // wczytanie /slug -> studies + odmiany imienia/nazwiska
  useEffect(() => {
    (async () => {
      const s = getSlugFromUrl();
      setSlug(s);
      if (!s) return;

      const study = await loadStudyBySlug(s);
      if (!study) {
        setApiError("Brak identyfikatora badania w linku lub badanie nie istnieje. Skontaktuj się z administratorem.");
        return;
      }
      const cs = buildCases(study);
      // dopełniacz z bazy, albo zostaje stały tekst
      setNameGen(cs.fullGen || "Marcina Gołka");

      // Jeśli w przyszłości dodamy w bazie formę narzędnika (np. cs.fullInst), to ją wykorzystamy.
      // Póki co bezpieczny fallback, by NIE zmieniać treści:
      // @ts-ignore – ignorujemy brak pola, bo może pojawić się później
      setNameInst((cs as any).fullInst || "Marcinem Gołkiem");
    })();
  }, []);

  const isMobile = window.innerWidth < 800;
  if (isMobile && orientation === "portrait") {
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

  const handleResponse = (row: number, value: number) => {
    const next = [...responses];
    next[row] = value;
    setResponses(next);
    setError(false);
    setMissingRows([]);
    setApiError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // walidacja kompletności
    const missing = responses.map((v, i) => (v === 0 ? i : -1)).filter(i => i !== -1);
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
      setApiError("Brak identyfikatora badania (slug). Skontaktuj się z administratorem.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setError(false);
    setMissingRows([]);
    setApiError("");

    try {
      const scores = null;
      const rawTotal = null;
      const respondentCode = null;

      // ZAPIS przez RPC (bez zmian w backendzie)
      const { error } = await supabase.rpc("add_response_by_slug", {
        p_slug: slug,
        p_answers: responses,
        p_scores: scores,
        p_raw_total: rawTotal,
        p_respondent_code: respondentCode,
      });

      if (error) {
        console.error("RPC error:", error);
        setApiError("Błąd zapisu do bazy ankiet (RPC). Spróbuj ponownie.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setApiError("Nieoczekiwany błąd sieci podczas zapisu.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (submitted) return <Thanks />;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 12px 0 12px", fontFamily: "'Roboto', Arial, sans-serif" }}>
      {/* alerty */}
      {(error || apiError || !slug) && (
        <div className="sticky-error-msg">
          {!slug && <div>Brak identyfikatora badania w linku (użyj adresu /slug, np. /lublin).</div>}
          {error && <div>Proszę udzielić odpowiedzi w każdym wierszu.</div>}
          {apiError && <div>{apiError}</div>}
        </div>
      )}

      {/* ——— TU ZOSTAWIAMY DOKŁADNIE TWOJE TEKSTY, PODMIENIAMY TYLKO IMIĘ/NAZWISKO ——— */}

      {/* Nagłówek i logo */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 28
      }}>
        <div>
          <div style={{
            fontWeight: 600,
            fontSize: "1.30rem",
            color: "#253347",
            lineHeight: 1.24
          }}>
            Postaraj się wcielić w osobę <b>{nameGen}</b> i odpowiedz na następujące pytania:
          </div>
          <div style={{
            margin: "15px 0",
            fontSize: "1.25rem",
            color: "#b00020",
            fontWeight: 700
          }}>
            <span>Pamiętaj! </span>
            <span style={{ color: "#253347", fontWeight: 400 }}>
              Odpowiadaszzzzzz jakbyś był/a {nameInst} politykiem (osobą publiczną) 🙂
            </span>
          </div>
        </div>
        <img
          src="/BadaniaPRO(r).png"
          alt="Badania.pro logo"
          style={{
            height: 45,
            width: "auto",
            marginLeft: 24,
            borderRadius: 7,
            background: "#fff"
          }}
        />
      </div>

      {/* Tabela — bez zmian wizualnych */}
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
              const missing = missingRows.includes(rowIdx);
              return (
                <tr
                  key={item.id}
                  ref={el => rowRefs.current[rowIdx] = el}
                  className={missing ? "missing-row" : hovered.row === rowIdx ? "hovered-row" : ""}
                >
                  <td
                    className={
                      "question-cell sticky-col" +
                      (missing ? " missing-cell" : "") +
                      (hovered.col !== null ? " col-hover-bg" : "")
                    }
                    style={{ textAlign: "left", left: 0 }}
                  >
                    {item.text}
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
                          value={colIdx + 1}
                          checked={responses[rowIdx] === colIdx + 1}
                          onChange={() => handleResponse(rowIdx, colIdx + 1)}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

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
      </form>
    </div>
  );
};

export default Questionnaire;
