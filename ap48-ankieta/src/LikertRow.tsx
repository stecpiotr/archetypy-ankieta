import React from "react";
import type { Ap48Item } from "./questions";

type LikertRowProps = {
  item: Ap48Item;
  value: number;
  onChange: (value: number) => void;
  rowIdx: number;
  hovered: { row: number; col: number } | null;
  setHovered: (val: { row: number; col: number } | null) => void;
};

const OPTIONS = [1, 2, 3, 4, 5];

const LikertRow: React.FC<LikertRowProps> = ({
  item,
  value,
  onChange,
  rowIdx,
  hovered,
  setHovered,
}) => (
  <tr className={hovered && hovered.row === rowIdx ? "likert-row hovered" : "likert-row"}>
    <td className="question-cell">{item.text}</td>
    {OPTIONS.map((num, colIdx) => (
      <td key={num} className="option-cell">
        <label
          className={hovered && hovered.col === colIdx ? "option-label hovered" : "option-label"}
          style={{
            width: 44,
            height: 44,
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onMouseEnter={() => setHovered({ row: rowIdx, col: colIdx })}
          onMouseLeave={() => setHovered(null)}
        >
          <input
            type="radio"
            name={`item-${item.id}`}
            value={num}
            checked={value === num}
            onChange={() => onChange(num)}
            style={{ width: 20, height: 20, accentColor: "#06b09c", cursor: "pointer" }}
          />
        </label>
      </td>
    ))}
  </tr>
);

export default LikertRow;