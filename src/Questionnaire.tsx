import React, { useState, useEffect } from "react";
import { questions } from "./questions";
import "./LikertTable.css";

const scaleLabels = [
  { label: "Zdecydowanie nie", color: "#d32f2f" },
  { label: "Raczej nie",        color: "#f9a825" },
  { label: "Ani tak, ani nie",  color: "#388e3c" },
  { label: "Raczej tak",        color: "#4fc3f7" },
  { label: "Zdecydowanie tak",  color: "#1976d2" }
];

const Questionnaire: React.FC = () => {
  const [responses, setResponses] = useState<number[]>(Array(questions.length).fill(0));
  const [submitted, setSubmitted] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const handleResponse = (row: number, value: number) => {
    const newResponses = [...responses];
    newResponses[row] = value;
    setResponses(newResponses);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return <div style={{ textAlign: "center", fontSize: "1.4rem", padding: 60 }}>Dziękuję!</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="likert-form">
      <table className="likert-table">
        <thead>
          <tr>
            <th className="likert-th-question"></th>
            {scaleLabels.map((col, colIdx) => (
              <th
                key={colIdx}
                className="likert-th-scale"
                style={{ color: col.color }}
              >
                <span className="scale-label">{col.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questions.map((item, rowIdx) => (
            <tr key={item.id}
                className={hoveredRow === rowIdx ? "row-hovered" : ""}
                onMouseEnter={() => setHoveredRow(rowIdx)}
                onMouseLeave={() => setHoveredRow(null)}
            >
              <td className={`question-cell${hoveredRow === rowIdx ? " cell-hovered" : ""}`}>
                {item.text}
              </td>
              {scaleLabels.map((_, colIdx) => (
                <td
                  key={colIdx}
                  className={`option-cell${hoveredCol === colIdx ? " col-hovered" : ""}`}
                  onMouseEnter={() => setHoveredCol(colIdx)}
                  onMouseLeave={() => setHoveredCol(null)}
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
      <div style={{ maxWidth: 420, margin: "42px auto 60px auto" }}>
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