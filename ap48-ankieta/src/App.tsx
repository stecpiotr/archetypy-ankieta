import React, { useState } from "react";
import Questionnaire from "./Questionnaire";

const wrapperStyle: React.CSSProperties = {
  minHeight: "100vh",
  width: "100vw",
  display: "flex",
  flexDirection: "column",
  background: "#fff",
  fontFamily: "'Roboto', Arial, sans-serif",
};

const contentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: 1100,
  margin: "0 auto",
  minHeight: "70vh",
  flex: 1,
};

const App: React.FC = () => {
  const [started, setStarted] = useState(false);

  return (
    <div style={wrapperStyle}>
      {!started ? (
        <>
          <header
            style={{
              width: "100%",
              maxWidth: 1100,
              margin: "35px auto 0 auto",
              padding: "0 24px",
              boxSizing: "border-box",
            }}
          >
            <h1
              style={{
                fontFamily: "'Roboto', Arial, sans-serif",
                fontWeight: 700,
                fontSize: "2.1rem",
                color: "#2c3e50",
                textAlign: "left",
                margin: "0 0 30px 0",
                letterSpacing: 1,
                lineHeight: 1.13,
              }}
            >
              Badanie wizerunku i postrzegania Krzysztofa Hetmana
            </h1>
            <hr style={{ border: 0, borderTop: "1.5px solid #ececec", margin: 0 }} />
          </header>
          <div style={contentStyle}>
            <div
              style={{
                maxWidth: 1100,
                width: "100%",
                margin: "64px 0 28px 0",
                fontSize: "1.10rem",
                textAlign: "left",
                fontStyle: "italic", // KURSYWA!
                lineHeight: 1.7,
              }}
            >
              Witaj!<br /><br />
              To badanie jest realizowane na prośbę Krzysztofa Hetmana.<br /><br />
              Chcielibyśmy, abyś spróbował(a) wcielić się w samego Krzysztofa Hetmana i odpowiedział(a) z jego perspektywy na kilka pytań dotyczących postrzegania, przekonań i stylu działania.<br /><br />
              Zdajemy sobie sprawę, że takie zadanie może być wyzwaniem, dlatego tym bardziej doceniamy Twoje zaangażowanie. Twoje odpowiedzi pomogą nam lepiej zrozumieć, jak Krzysztof Hetman może być postrzegany przez innych. To dla nas i dla niego strategicznie ważne – dlatego jesteśmy bardzo wdzięczni za Twój czas i szczerość.<br /><br />
              Prosimy, postaraj się udzielać odpowiedzi jak najbardziej szczerze, na podstawie swoich obserwacji i wyobrażenia o tej postaci.<br /><br />
              Gdy będziesz gotowy(a), kliknij przycisk poniżej, aby rozpocząć badanie.<br /><br />
              <span style={{ display: "block", textAlign: "right", fontStyle: "normal", marginTop: 30 }}>
                Dziękujemy za Twoją pomoc!<br />
                Hetman Team&nbsp;💪
              </span>
            </div>
            <div style={{ width: 300, marginTop: 36, marginBottom: 70 }}> {/* większy odstęp */}
              <button
                style={{
                  width: "100%",
                  background: "#06b09c",
                  color: "#fff",
                  fontWeight: 700,
                  fontFamily: "'Roboto', Arial, sans-serif",
                  fontSize: "1.12rem",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.75em 0",
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
          {/* SZARA LINIA PRZED STOPKĄ */}
          <hr style={{ border: 0, borderTop: "1.5px solid #ececec", width: "100%", margin: "0 0 0 0" }} />
          <footer
            style={{
              marginTop: 0,
              padding: "32px 0 54px 0",
              color: "#7c8c9a",
              textAlign: "center",
              fontSize: "1.02rem",
              letterSpacing: ".015em",
              width: "100%",
            }}
          >
            opracowanie: Piotr Stec, Badania.pro® | © {new Date().getFullYear()}
            <div style={{ fontSize: "0.76rem", color: "#8a9bab", marginTop: 11, lineHeight: 1.35 }}>
              Jeśli pojawiły się jakieś wątpliwości lub masz pytania proszę o kontakt: Piotr Stec, Badania.pro,&nbsp;
              e-mail:{" "}
              <a
                href="mailto:piotr.stec@badania.pro"
                style={{ color: "#09a", textDecoration: "underline" }}
              >
                piotr.stec@badania.pro
              </a>
              , tel.:500-121-141
            </div>
          </footer>
        </>
      ) : (
        <Questionnaire />
      )}
    </div>
  );
};

export default App;