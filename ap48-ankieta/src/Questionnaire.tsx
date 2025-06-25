import React, { useState } from "react";
import { createClient } from '@supabase/supabase-js';
import { questions } from "./questions";
import LikertRow from "./LikertRow";
import Thanks from "./Thanks";
import "./LikertTable.css";

const scaleLabels = [
  { label: "Zdecydowanie nie", color: "#d32f2f" },
  { label: "Raczej nie",        color: "#f9a825" },
  { label: "Ani tak, ani nie",  color: "#388e3c" },
  { label: "Raczej tak",        color: "#4fc3f7" },
  { label: "Zdecydowanie tak",  color: "#1976d2" }
];

const ALERT_HEIGHT = 90;

// Supabase klient ‒ zmienne środowiskowe muszą być poprawnie ustawione!
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Questionnaire: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(questions.length).fill(0));
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);
  const [error, setError] = useState(false);

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
    // --- WYSYŁKA DO SUPABASE ---
    const { data, error } = await supabase
      .from('ap48_responses')        // <-- nazwa tabeli w Twojej bazie!
      .insert([{ answers: responses }]); // <-- answers = kolumna jsonb
    if (error) {
      alert("Błąd zapisu do bazy: " + JSON.stringify(error, null, 2));
      return;
    }
    setSubmitted(true);
  };

  if (responses.length === 0) return <div>Brak pytań.</div>;
  if (submitted) return <Thanks />;

  return (
    <>
      {error && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: `${ALERT_HEIGHT}px`,
            pointerEvents: "none"
          }}
        >
          <div
            style={{
              background: "rgba(220, 38, 38, 0.93)",
              color: "#fff",
              padding: "27px 48px",
              borderRadius: 20,
              fontWeight: 700,
              fontSize: "1.53rem",
              textAlign: "center",
              boxShadow: "0 6px 34px #0003",
              marginTop: 16,
              letterSpacing: ".01em",
              minWidth: 430,
              maxWidth: "96vw",
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            Proszę udzielić odpowiedzi w każdym wierszu
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          margin: "40px auto 0 auto",
          maxWidth: 1100,
          paddingTop: error ? ALERT_HEIGHT + 36 : 0
        }}
      >
        {/* Pasek instrukcji z logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: error ? 54 : 30,
            gap: 16,
          }}
        >
          <div
            style={{
              fontWeight: 500,
              fontSize: "1.3rem",
              color: "#253347",
              lineHeight: 1.3,
              fontFamily: "'Roboto', Arial, sans-serif",
              maxWidth: "80%",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span>
              Postaraj się wcielić w osobę <b>Krzysztofa Hetmana</b> i odpowiedz na następujące pytania:
            </span>
            <span
              style={{
                fontSize: "1.2rem",
                fontWeight: 400,
                color: "#555",
                marginTop: "4px",
                marginBottom: "2px",
              }}
            >
              (
              <b style={{ color: "#b00020", fontWeight: 700 }}>Pamiętaj! </b>
              Odpowiadasz jakbyś był/a Krzysztofem Hetmanem :) )
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
              display: "block",
            }}
          />
        </div>
        <table className="likert-table">
          <thead>
            <tr>
              <th></th>
              {scaleLabels.map((col, colIdx) => (
                <th
                  key={colIdx}
                  className={
                    hovered && hovered.col === colIdx ? "scale-header hovered" : "scale-header"
                  }
                  style={{
                    color: col.color,
                    fontWeight: 700,
                    transition: "color 0.25s"
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((item, rowIdx) => (
              <LikertRow
                key={item.id}
                item={item}
                value={responses[rowIdx]}
                onChange={(val) => handleResponse(rowIdx, val)}
                rowIdx={rowIdx}
                hovered={hovered}
                setHovered={setHovered}
                missing={error && responses[rowIdx] === 0}
                hoveredCol={hovered?.col}
              />
            ))}
          </tbody>
        </table>
        <div style={{ maxWidth: 380, margin: "32px auto 0 auto" }}>
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
              marginTop: 8,
              boxShadow: "0 2px 8px #ececec",
              cursor: "pointer",
              letterSpacing: "0.5px",
              transition: "background 0.2s"
            }}
          >
            Wyślij
          </button>
        </div>
        <div
          style={{
            margin: "52px auto 0 auto",
            maxWidth: 900,
            borderTop: "1px solid #d7d7d7",
            paddingTop: 18,
            paddingBottom: 40,
            color: "#7a7a7a",
            fontSize: "0.98rem",
            textAlign: "center",
            fontFamily: "'Roboto', Arial, sans-serif",
            letterSpacing: ".01em"
          }}
        >
          opracowanie: Piotr Stec, Badania.pro®      |      &copy; {new Date().getFullYear()}
        </div>
      </form>
    </>
  );
};

export default Questionnaire;