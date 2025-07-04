import React, { useState, useEffect } from "react";
import { questions } from "./questions";
import "./LikertTable.css";

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

  // Overlay mobile poziomy
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (responses.some((v) => v === 0)) {
      setError(true);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div style={{
      maxWidth: 1100,
      margin: "0 auto",
      padding: "28px 12px 0 12px",
      fontFamily: "'Roboto', Arial, sans-serif"
    }}>
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
            fontSize: "1.25rem",
            color: "#253347",
            lineHeight: 1.24
          }}>
            Postaraj się wcielić w osobę <b>Krzysztofa Hetmana</b> i odpowiedz na następujące pytania:
          </div>
          <div style={{
            margin: "6px 0",
            fontSize: "1.12rem",
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
              {/* Lewy górny nagłówek */}
              <th className="th-blank"></th>
              {scaleLabels.map((col, colIdx) => (
                <th
                  key={colIdx}
                  className={
                    "th-scale" + (hovered.col === colIdx ? " hovered" : "")
                  }
                  style={{ color: col.color }}
                  onMouseEnter={() => setHovered({ ...hovered, col: colIdx })}
                  onMouseLeave={() => setHovered({ ...hovered, col: null })}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((item, rowIdx) => (
              <tr
                key={item.id}
                className={
                  (rowIdx % 2 === 0 ? "even-row" : "") +
                  (hovered.row === rowIdx ? " hovered-row" : "")
                }
                onMouseEnter={() => setHovered({ ...hovered, row: rowIdx })}
                onMouseLeave={() => setHovered({ ...hovered, row: null })}
              >
                <td className="question-cell" style={{ textAlign: "left" }}>
                  {item.text}
                </td>
                {scaleLabels.map((_, colIdx) => (
                  <td
                    className={
                      "option-cell" +
                      (hovered.col === colIdx ? " hovered-col" : "")
                    }
                    key={colIdx}
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
            ))}
          </tbody>
        </table>
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
              maxWidth: 500
            }}
          >
            Proszę udzielić odpowiedzi w każdym wierszu.
          </div>
        )}
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