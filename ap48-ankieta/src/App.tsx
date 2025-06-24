import React, { useState } from "react";
import Questionnaire from "./Questionnaire";

// styl wyśrodkowanego ekranu początkowego — dla spójności wizualnej
const wrapperStyle: React.CSSProperties = {
  minHeight: "100vh",
  width: "100vw",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Roboto', Arial, sans-serif",
  background: "#fff"
};
const contentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  maxWidth: 580
};

const App: React.FC = () => {
  const [started, setStarted] = useState(false);

  return (
    <div style={wrapperStyle}>
      {!started ? (
        <div style={contentStyle}>
          <h1
            style={{
              fontFamily: "'Roboto', Arial, sans-serif",
              fontWeight: 700,
              fontSize: "2.5rem",
              marginBottom: "1.2rem",
              color: "#2c3e50",
              lineHeight: 1.15,
              letterSpacing: 1
            }}
          >
            Badanie wizerunku <br />
            i postrzegania <br />
            Krzysztofa Hetmana
          </h1>
          <p style={{ maxWidth: 520, marginBottom: 24, fontSize: "1.125rem" }}>
            Witamy w kwestionariuszu badania.<br />
            Prosimy o szczere odpowiedzi na poniższe pytania.<br />
            Gdy będziesz gotowy, kliknij przycisk, aby rozpocząć.
          </p>
          <div style={{ width: 300, margin: "32px auto 0 auto" }}>
            <button
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
                marginTop: 16,
                boxShadow: "0 2px 8px #ececec",
                cursor: "pointer",
                letterSpacing: "0.5px",
                transition: "background 0.2s"
              }}
              onClick={() => setStarted(true)}
            >
              Zaczynamy
            </button>
          </div>
        </div>
      ) : (
        <Questionnaire />
      )}
    </div>
  );
};
export default App;