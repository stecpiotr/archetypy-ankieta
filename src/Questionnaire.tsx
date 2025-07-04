import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { questions } from "./questions";
import "./LikertTable.css";

// --- SUPABASE CONFIG ---
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const scaleLabels = [
  { label: "Zdecydowanie nie", color: "#d32f2f" },
  { label: "Raczej nie", color: "#f9a825" },
  { label: "Ani tak, ani nie", color: "#388e3c" },
  { label: "Raczej tak", color: "#4fc3f7" },
  { label: "Zdecydowanie tak", color: "#1976d2" }
];

const Questionnaire: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(questions.length).fill(0));
  const [hovered, setHovered] = useState<{ row: number | null, col: number | null }>({ row: null, col: null });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const [apiError, setApiError] = useState("");
  const [missingRows, setMissingRows] = useState<number[]>([]);
  const [orientation, setOrientation] = useState(
    window.innerWidth > window.innerHeight ? "landscape" : "portrait"
  );

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    const newResponses = [...responses];
    newResponses[row] = value;
    setResponses(newResponses);
    setError(false);
    setMissingRows([]);
    setApiError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = responses
      .map((v, idx) => (v === 0 ? idx : -1))
      .filter(idx => idx !== -1);
    if (missing.length > 0) {
      setError(true);
      setMissingRows(missing);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError(false);
    setMissingRows([]);
    setApiError("");
    // Save to Supabase
    try {
      const { error } = await supabase
        .from("ap48_responses")
        .insert([{ answers: responses }]);
      if (error) {
        setApiError("Błąd zapisu do bazy ankiet! Spróbuj ponownie.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setApiError("Nieoczekiwany błąd sieci podczas zapisu wyników.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (submitted) {
    return (
      <div style={{
        maxWidth: 520, margin: "100px auto",
        textAlign: "center", color: "#18796d", fontWeight: 600, fontSize: "1.4rem"
      }}>
        Dziękujemy za udział w ankiecie!<br />
        Twoje odpowiedzi zostały zapisane.<br /><br />
        <span style={{ fontSize: "2.1rem" }}>🙏</span>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 1100,
      margin: "0 auto",
      padding: "28px 12px 0 12px",
      fontFamily: "'Roboto', Arial, sans-serif"
    }}>
      {/* Sticky komunikaty o błędzie */}
      {(error || apiError) && (
        <div className="sticky-error-msg">
          {error && (
            <div>
              Proszę udzielić odpowiedzi w każdym wierszu.
            </div>
          )}
          {apiError && (
            <div>{apiError}</div>
          )}
        </div>
      )}
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
            fontSize: "1.33rem",
            color: "#253347",
            lineHeight: 1.24
          }}>
            Postaraj się wcielić w osobę <b>Krzysztofa Hetmana</b> i odpowiedz na następujące pytania:
          </div>
          <div style={{
            margin: "6px 0",
            fontSize: "1.07rem",
            color: "#b00020",
            fontWeight: 700
          }}>
            <span>Pamiętaj! </span>
            <span style={{ color: "#253347", fontWeight: 400 }}>
              Odpowiadasz jakbyś był/a Krzysztofem Hetmanem :)
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

      {/* TABELA */}
      <form onSubmit={handleSubmit}>
        <table className="likert-table">
          <thead>
            <tr>
              <th className="th-blank" style={{ left: 0 }} aria-label="Pytania" scope="col"></th>
              {scaleLabels.map((col, colIdx) => (
                <th
                  key={colIdx}
                  className={
                    "th-scale" +
                    (hovered.col === colIdx ? " hovered" : "")
                  }
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
                  className={
                    (rowIdx % 2 === 1 ? "even-row " : "") +
                    (missing ? "missing-row " : "") +
                    (hovered.row === rowIdx ? "hovered-row " : "")
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
                    {item.text}
                  </td>
                  {scaleLabels.map((_, colIdx) => (
                    <td
                      className={
                        "option-cell" +
                        (missing ? " missing-cell" : "") +
                        (hovered.col === colIdx ? " hovered-col" : "") +
                        (hovered.row === rowIdx ? " hovered-row" : "")
                      }
                      key={colIdx}
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
              )
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
                transition: "background 0.2s"
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