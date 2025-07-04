import React, { useState, useEffect } from "react";
import { questions } from "./questions";
import "./LikertTable.css";

// Skala ocen i kolorów nagłówków
const scaleLabels = [
  { label: "Zdecydowanie nie", color: "#d32f2f" },
  { label: "Raczej nie", color: "#f9a825" },
  { label: "Ani tak, ani nie", color: "#388e3c" },
  { label: "Raczej tak", color: "#4fc3f7" },
  { label: "Zdecydowanie tak", color: "#1976d2" },
];

const Questionnaire: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(questions.length).fill(0));
  const [hovered, setHovered] = useState<{ row: number | null, col: number | null }>({ row: null, col: null });
  const [error, setError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Przechwyt odpowiedzi
  const handleResponse = (row: number, value: number) => {
    const newResponses = [...responses];
    newResponses[row] = value;
    setResponses(newResponses);
    setError(false);
  };

  // Obsługa wysłania
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (responses.some((v) => v === 0)) {
      setError(true);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", fontSize: "1.4rem", padding: 60 }}>
        Dziękujemy za wypełnienie ankiety!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="likert-form">
      <table className="likert-table">
        <thead>
          <tr>
            <th></th>
            {scaleLabels.map((col, colIdx) => (
              <th
                key={colIdx}
                className={
                  "scale-header" +
                  (hovered.col === colIdx ? " hovered" : "")
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
                "likert-row" + (hovered.row === rowIdx ? " hovered-row" : "")
              }
              onMouseEnter={() => setHovered({ ...hovered, row: rowIdx })}
              onMouseLeave={() => setHovered({ ...hovered, row: null })}
            >
              <td className="question-cell">{item.text}</td>
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
            maxWidth: 500,
          }}
        >
          Proszę udzielić odpowiedzi w każdym wierszu.
        </div>
      )}
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