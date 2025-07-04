import React, { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { questions } from "./questions";
import "./LikertTable.css";

const scaleLabels = [
  { label: "Zdecydowanie nie", color: "#d32f2f" },
  { label: "Raczej nie",        color: "#f9a825" },
  { label: "Ani tak, ani nie",  color: "#388e3c" },
  { label: "Raczej tak",        color: "#4fc3f7" },
  { label: "Zdecydowanie tak",  color: "#1976d2" }
];

// --- KONFIG SUPABASE ---
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Questionnaire: React.FC = () => {
  const [orientation, setOrientation] = useState(
    window.innerWidth > window.innerHeight ? "landscape" : "portrait"
  );
  const [responses, setResponses] = useState<number[]>(Array(questions.length).fill(0));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerWidth > window.innerHeight ? "landscape" : "portrait");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleResponse = (idx: number, value: number) => {
    const newResponses = [...responses];
    newResponses[idx] = value;
    setResponses(newResponses);
    setError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (responses.some((v) => v === 0)) {
      setError(true);
      return;
    }

    const { error } = await supabase
      .from('ap48_responses')
      .insert([{ answers: responses }]);
    if (error) {
      alert("Błąd zapisu do bazy: " + JSON.stringify(error, null, 2));
      return;
    }
    setSubmitted(true);
  };

  const isMobile = window.innerWidth < 800;
  if (isMobile && orientation === "portrait") {
    return (
      <div className="orientation-warning">
        <p>
          <b>Prosimy, obróć telefon poziomo</b> <br />
          <span style={{ fontSize: "1.05em" }}>
            Aby móc wygodnie uzupełnić matrycę pytań, skorzystaj z poziomego ułożenia.
            <br />
            <span role="img" aria-label="rotate">
              🔄
            </span>
          </span>
        </p>
      </div>
    );
  }

  if (responses.length === 0) return <div>Brak pytań.</div>;
  if (submitted) return (
    <div style={{
      maxWidth: 500, margin: "60px auto", fontSize: "1.25rem", textAlign: "center",
      color: "#18796d", fontWeight: 600
    }}>
      <div>Dziękujemy za wypełnienie ankiety! 🙏</div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ margin: "40px auto 0 auto", maxWidth: 1100 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: error ? 54 : 30,
        gap: 16
      }}>
        <div style={{
          fontWeight: 500,
          fontSize: "1.25rem",
          color: "#253347",
          lineHeight: 1.3,
          fontFamily: "'Roboto', Arial, sans-serif",
          maxWidth: "80%",
          display: "flex",
          flexDirection: "column",
          gap: 10
        }}>
          <span>
            Postaraj się wcielić w osobę <b>Krzysztofa Hetmana</b> i odpowiedz na następujące pytania:
          </span>
          <span style={{
            fontSize: "1rem",
            fontWeight: 400,
            color: "#b00020"
          }}>
            <b>Pamiętaj! </b>
            <span style={{ color: "#253347" }}>
              Odpowiadasz jakbyś był/a Krzysztofem Hetmanem :)
            </span>
          </span>
        </div>
        <img
          src="/BadaniaPRO(r).png"
          alt="Badania.pro logo"
          style={{
            height: 45,
            width: "auto",
            marginLeft: 20,
            borderRadius: 7,
            background: "#fff",
            display: "block"
          }}
        />
      </div>
      {/* --- TABELA --- */}
      <table className="likert-table">
        <thead>
          <tr>
            <th></th>
            {scaleLabels.map((col, colIdx) => (
              <th
                key={colIdx}
                style={{
                  color: col.color,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questions.map((item, rowIdx) => (
            <tr key={item.id}>
              <td>{item.question}</td>
              {scaleLabels.map((_, colIdx) => (
                <td key={colIdx} className="option-cell">
                  <label className="option-label">
                    <input
                      type="radio"
                      name={`row-${rowIdx}`}
                      value={colIdx + 1}
                      checked={responses[rowIdx] === (colIdx + 1)}
                      onChange={() => handleResponse(rowIdx, colIdx + 1)}
                    />
                  </label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* ERROR */}
      {error && (
        <div
          style={{
            margin: "30px auto 0 auto",
            background: "rgba(220, 38, 38, 0.13)",
            color: "#b00020",
            fontWeight: 600,
            borderRadius: 10,
            padding: "21px 24px",
            textAlign: "center",
            fontSize: "1.18rem",
            maxWidth: 500,
          }}
        >
          Proszę udzielić odpowiedzi w każdym wierszu.
        </div>
      )}
      {/* BUTTON tylko na dole! */}
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
  );
};

export default Questionnaire;