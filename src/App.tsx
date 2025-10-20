import React, { useState, useEffect } from "react";
import Questionnaire from "./Questionnaire";
import "./index.css";
import "./App.css";
import "./LikertTable.css";

import { getSlugFromUrl, loadStudyBySlug, buildDisplayFromStudy } from "./lib/studies";
import AlreadyCompleted from "./AlreadyCompleted";
import { isTokenCompleted, markTokenStarted } from "./lib/tokens";

const isMobile = window.innerWidth <= 600;

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

  const [hasStudy, setHasStudy] = useState<boolean | null>(null);
  const [gender, setGender] = useState<"M" | "F">("M");
  const [personNom, setPersonNom] = useState<string>("");   // Marcin Gołek
  const [personGen, setPersonGen] = useState<string>("");   // Marcina Gołka
  const [personAcc, setPersonAcc] = useState<string>("");   // Marcina Gołka / Annę Kowalską / Pawła Batyrę
  const [personInstr, setPersonInstr] = useState<string>(""); // Marcinem Gołkiem / Anną Kowalską
  const [personLoc, setPersonLoc] = useState<string>("");   // Marcinie Gołku / Annie Kowalskiej
  const [surnameNom, setSurnameNom] = useState<string>(""); // Gołek / Kowalska

  const [token, setToken] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [checking, setChecking] = useState(true); // ⬅️ czekamy aż sprawdzimy token

  useEffect(() => {
    (async () => {
      const s = getSlugFromUrl();
      if (!s) {
        setHasStudy(false);
        setChecking(false);
        return;
      }
      const study = await loadStudyBySlug(s);
      if (!study) {
        setHasStudy(false);
        setChecking(false);
        return;
      }

      const c = buildDisplayFromStudy(study);
      setGender(c.gender);
      setPersonNom(c.fullNom);
      setPersonGen(c.fullGen);
      setPersonAcc(c.fullAcc);
      setPersonInstr(c.fullIns);
      setPersonLoc(c.fullLoc);
      setSurnameNom(c.surNom);

      const urlToken = new URLSearchParams(window.location.search).get("t")?.trim() || null;
      setToken(urlToken);
      if (urlToken) {
        try {
          const done = await isTokenCompleted(urlToken);
          if (done) setAlreadyDone(true);
        } catch (e) {
          console.warn("isTokenCompleted error:", e);
        }
      }

      setHasStudy(true);
      setChecking(false); // ⬅️ koniec sprawdzania
    })();
  }, []);


  const perceivedWord = gender === "F" ? "postrzegana" : "postrzegany";
  const himHer = gender === "F" ? "niej" : "niego";
  const showBlocker = hasStudy === false;

return (
  <div style={wrapperStyle}>
    {checking ? null : alreadyDone ? (
      <AlreadyCompleted />
    ) : !started ? (
      <>
        <header
          style={{
            width: "100%",
            maxWidth: 1000,
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
            {/* tytuł – dopełniacz */}
            Badanie wizerunku i postrzegania {personGen || ""}
          </h1>
          <hr style={{ border: 0, borderTop: "1.5px solid #ececec", margin: 0 }} />
        </header>

        <div style={contentStyle}>
          <div
            style={{
              maxWidth: isMobile ? 350 : 800,
              width: "100%",
              margin: "40px 0 30px 0",
              fontSize: "1.10rem",
              textAlign: "left",
              fontStyle: "italic",
              lineHeight: 1.7,
            }}
          >
            Witaj!
            <br />
            <br />
            To badanie jest realizowane na prośbę {personGen || ""}.
            <br />
            <br />
            {/* wcielić się w … → biernik */}
            Chcielibyśmy, abyś spróbował(a) wcielić się w {personAcc || ""} i
            odpowiedział(a) z {gender === "F" ? "jej" : "jego"} perspektywy na kilka
            pytań dotyczących postrzegania, przekonań i stylu działania.
            <br />
            <br />
            Zdajemy sobie sprawę, że takie zadanie może być wyzwaniem, dlatego tym bardziej
            doceniamy Twoje zaangażowanie. Twoje odpowiedzi pomogą nam lepiej zrozumieć, jak{" "}
            {/* Mianownik */}
            {personNom || ""} może być {perceivedWord} przez innych. Dla nas i dla {himHer} to strategicznie ważne –
            dlatego jesteśmy bardzo wdzięczni za Twój czas i szczerość.
            <br />
            <br />
            Prosimy, postaraj się udzielać odpowiedzi jak najbardziej szczerze, na podstawie
            swoich obserwacji i wyobrażeń o {personLoc || ""}.
            <br />
            <br />
            <span style={{ display: "block", textAlign: "right", fontStyle: "normal", marginTop: 30 }}>
              Dziękujemy za Twoją pomoc!
              <br />
              {surnameNom ? `${surnameNom} Team` : "—"} &nbsp;💪
            </span>
          </div>

          <div style={{ width: 300, marginTop: 36, marginBottom: 70 }}>
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
                cursor: (showBlocker || checking) ? "not-allowed" : "pointer",
                letterSpacing: "0.5px",
                transition: "background 0.2s",
                opacity: showBlocker ? 0.65 : 1,
              }}
              onClick={async () => {
                if (showBlocker) return;
                setStarted(true);
                if (token) {
                  try { await markTokenStarted(token); } catch (e) { console.warn("markTokenStarted:", e); }
                }
              }}
              disabled={showBlocker || checking}
              title={
                showBlocker
                  ? "Brak identyfikatora badania lub badanie nie istnieje."
                  : "Rozpocznij badanie"
              }
            >
              Zaczynamy
            </button>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: "1.5px solid #ececec", width: "100%", margin: 0 }} />

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
            Jeśli pojawiły się jakieś wątpliwości lub masz pytania proszę o kontakt: Piotr Stec,
            Badania.pro,&nbsp;
            <a
              href="mailto:piotr.stec@badania.pro"
              style={{ color: "#09a", textDecoration: "underline" }}
            >
              piotr.stec@badania.pro
            </a>
            , tel.:500-121-141
          </div>
        </footer>

        {showBlocker && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              background: "#fbe9e7",
              color: "#b71c1c",
              fontWeight: 600,
              padding: "10px 16px",
              borderBottom: "1px solid #ffccbc",
              textAlign: "center",
              zIndex: 9999,
            }}
          >
            Brak identyfikatora badania w linku lub badanie nie istnieje. Skontaktuj się z administratorem.
          </div>
        )}
      </>
    ) : (
      <Questionnaire />
    )}
  </div>
);
};

export default App;