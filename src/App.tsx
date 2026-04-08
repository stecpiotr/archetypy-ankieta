import React, { useState, useEffect } from "react";
import Questionnaire from "./Questionnaire";
import "./index.css";
import "./App.css";
import "./LikertTable.css";

import { getSlugFromUrl, loadStudyBySlug, buildDisplayFromStudy } from "./lib/studies";
import { loadJstStudyBySlug } from "./lib/jstStudies";
import type { JstStudyRow } from "./lib/jstStudies";
import AlreadyCompleted from "./AlreadyCompleted";
import { isJstTokenCompleted, isTokenCompleted, markTokenStarted } from "./lib/tokens";
import JstSurvey from "./JstSurvey";

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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const App: React.FC = () => {
  const [started, setStarted] = useState(false);

  const [hasStudy, setHasStudy] = useState<boolean | null>(null);
  const [surveyKind, setSurveyKind] = useState<"personal" | "jst" | null>(null);
  const [jstStudy, setJstStudy] = useState<JstStudyRow | null>(null);
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
    let cancelled = false;
    (async () => {
      try {
        const s = getSlugFromUrl();
        if (!s) {
          if (!cancelled) {
            setHasStudy(false);
            setSurveyKind(null);
          }
          return;
        }

        const host = window.location.hostname.toLowerCase();
        const preferJst = host.startsWith("jst.");

        let personalStudy = null;
        let jstCandidate: JstStudyRow | null = null;

        if (preferJst) {
          jstCandidate = await withTimeout(loadJstStudyBySlug(s), 6000, null);
          if (!jstCandidate) {
            personalStudy = await withTimeout(loadStudyBySlug(s), 6000, null);
          }
        } else {
          personalStudy = await withTimeout(loadStudyBySlug(s), 6000, null);
          if (!personalStudy) {
            jstCandidate = await withTimeout(loadJstStudyBySlug(s), 6000, null);
          }
        }

        if (!personalStudy && !jstCandidate) {
          if (!cancelled) {
            setHasStudy(false);
            setSurveyKind(null);
          }
          return;
        }

        let resolvedKind: "personal" | "jst" | null = null;
        if (personalStudy) {
          const c = buildDisplayFromStudy(personalStudy);
          resolvedKind = "personal";
          if (!cancelled) {
            setSurveyKind("personal");
            setGender(c.gender);
            setPersonNom(c.fullNom);
            setPersonGen(c.fullGen);
            setPersonAcc(c.fullAcc);
            setPersonInstr(c.fullIns);
            setPersonLoc(c.fullLoc);
            setSurnameNom(c.surNom);
          }
        } else if (jstCandidate) {
          resolvedKind = "jst";
          if (!cancelled) {
            setSurveyKind("jst");
            setJstStudy(jstCandidate);
          }
        }

        const urlToken = new URLSearchParams(window.location.search).get("t")?.trim() || null;
        if (!cancelled) setToken(urlToken);
        if (urlToken) {
          try {
            const done = resolvedKind === "jst"
              ? await withTimeout(isJstTokenCompleted(urlToken), 2500, false)
              : await withTimeout(isTokenCompleted(urlToken), 2500, false);
            if (!cancelled && done) setAlreadyDone(true);
          } catch (e) {
            console.warn("isTokenCompleted error:", e);
          }
        }

        if (!cancelled) setHasStudy(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const perceivedWord = gender === "F" ? "postrzegana" : "postrzegany";
  const himHer = gender === "F" ? "niej" : "niego";
  const showBlocker = hasStudy === false;

  if (!checking && !alreadyDone && surveyKind === "jst" && jstStudy) {
    return <JstSurvey study={jstStudy} token={token} />;
  }

return (
  <div style={wrapperStyle}>
    {checking ? (
      <div style={{ maxWidth: 900, margin: "80px auto 0 auto", padding: "0 24px", color: "#334155" }}>
        Ładowanie ankiety...
      </div>
    ) : alreadyDone ? (
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
