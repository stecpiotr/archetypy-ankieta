import React, { useState, useEffect } from "react";
import Questionnaire from "./Questionnaire";
import "./index.css";
import "./App.css";
import "./LikertTable.css";

import { getSlugFromUrl, loadStudyBySlug, buildDisplayFromStudy } from "./lib/studies";
import { loadJstStudyBySlug } from "./lib/jstStudies";
import type { JstStudyRow } from "./lib/jstStudies";
import AlreadyCompleted from "./AlreadyCompleted";
import { getJstTokenMeta, getTokenMeta, isJstTokenCompleted, isTokenCompleted, markTokenStarted } from "./lib/tokens";
import JstSurvey from "./JstSurvey";

const isMobile = window.innerWidth <= 600;
const STARTED_HASH = "#q";

const wrapperStyle: React.CSSProperties = {
  minHeight: "100vh",
  width: "100vw",
  display: "flex",
  flexDirection: "column",
  background: "#fff",
  color: "#1f2937",
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

async function tryEnterFullscreenMobile(): Promise<void> {
  if (window.innerWidth > 1024) return;
  try {
    const docAny = document as Document & {
      webkitFullscreenElement?: Element;
      msFullscreenElement?: Element;
    };
    if (document.fullscreenElement || docAny.webkitFullscreenElement || docAny.msFullscreenElement) {
      return;
    }

    const rootAny = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    const requestFs =
      rootAny.requestFullscreen?.bind(rootAny)
      || rootAny.webkitRequestFullscreen?.bind(rootAny)
      || rootAny.msRequestFullscreen?.bind(rootAny);

    if (requestFs) {
      await Promise.resolve(requestFs());
    }
  } catch (e) {
    console.warn("requestFullscreen rejected:", e);
  }
}

function getTokenFromUrl(): string | null {
  const qs = window.location.search || "";
  const m = qs.match(/[?&]t=([^&]+)/i);
  if (!m || !m[1]) return null;
  try {
    return decodeURIComponent(m[1]).trim() || null;
  } catch {
    return m[1].trim() || null;
  }
}

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

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { hasError: true, message: String(error ?? "Nieznany błąd") };
  }

  componentDidCatch(error: unknown) {
    console.error("JST render error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    return (
      <main
        style={{
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
          background: "#ffffff",
          color: "#1f2937",
          fontFamily: "'Roboto', Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 780, width: "100%", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ margin: "0 0 10px 0", color: "#0f172a" }}>Nie udało się wyświetlić ankiety</h2>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            Wystąpił błąd renderowania strony. Odśwież stronę, a jeśli problem się powtórzy, otwórz ankietę bez parametru tokena:
            {" "}
            <a href={cleanUrl}>{cleanUrl}</a>
          </p>
          <p style={{ margin: "12px 0 0 0", fontSize: "0.9rem", color: "#64748b" }}>
            Szczegóły techniczne: {this.state.message}
          </p>
        </div>
      </main>
    );
  }
}

type StudyLifecycleStatus = "active" | "suspended" | "closed" | "deleted";

function normalizeStudyLifecycleStatus(raw: unknown, isActive: unknown): StudyLifecycleStatus {
  const txt = String(raw ?? "").trim().toLowerCase();
  if (txt === "suspended" || txt === "closed" || txt === "deleted" || txt === "active") {
    return txt;
  }
  if (isActive === false) return "deleted";
  return "active";
}

function statusBlockMessage(status: StudyLifecycleStatus): { title: string; text: string } | null {
  if (status === "suspended") {
    return {
      title: "Badanie jest nieaktywne",
      text: "To badanie zostało zawieszone. Wypełnianie ankiety jest tymczasowo wyłączone.",
    };
  }
  if (status === "closed") {
    return {
      title: "Badanie zakończone",
      text: "To badanie zostało zamknięte. Nie można już oddawać głosów.",
    };
  }
  if (status === "deleted") {
    return {
      title: "Badanie zakończone",
      text: "To badanie nie jest już dostępne.",
    };
  }
  return null;
}

type PersonalSurveySettings = {
  displayMode: "matrix" | "single";
  showProgress: boolean;
  allowBack: boolean;
  randomizeQuestions: boolean;
  fastClickCheckEnabled: boolean;
  autoStartEnabled: boolean;
  autoStartAt: string | null;
  autoEndEnabled: boolean;
  autoEndAt: string | null;
};

type JstSurveySettings = {
  showProgress: boolean;
  allowBack: boolean;
  fastClickCheckEnabled: boolean;
  autoStartEnabled: boolean;
  autoStartAt: string | null;
  autoEndEnabled: boolean;
  autoEndAt: string | null;
};

const DEFAULT_PERSONAL_SETTINGS: PersonalSurveySettings = {
  displayMode: "matrix",
  showProgress: true,
  allowBack: true,
  randomizeQuestions: false,
  fastClickCheckEnabled: false,
  autoStartEnabled: false,
  autoStartAt: null,
  autoEndEnabled: false,
  autoEndAt: null,
};

const DEFAULT_JST_SETTINGS: JstSurveySettings = {
  showProgress: true,
  allowBack: true,
  fastClickCheckEnabled: false,
  autoStartEnabled: false,
  autoStartAt: null,
  autoEndEnabled: false,
  autoEndAt: null,
};

function asBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  const txt = String(raw ?? "").trim().toLowerCase();
  if (["1", "true", "t", "yes", "y", "on"].includes(txt)) return true;
  if (["0", "false", "f", "no", "n", "off", ""].includes(txt)) return false;
  return fallback;
}

function asIsoOrNull(raw: unknown): string | null {
  const txt = String(raw ?? "").trim();
  return txt ? txt : null;
}

function asDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function applyScheduleStatus(
  baseStatus: StudyLifecycleStatus,
  schedule: { autoStartEnabled: boolean; autoStartAt: string | null; autoEndEnabled: boolean; autoEndAt: string | null },
): StudyLifecycleStatus {
  if (baseStatus === "closed" || baseStatus === "deleted") return baseStatus;
  const now = new Date();
  const endAt = asDate(schedule.autoEndAt);
  if (schedule.autoEndEnabled && endAt && now >= endAt) {
    return "suspended";
  }
  const startAt = asDate(schedule.autoStartAt);
  if (schedule.autoStartEnabled && startAt && now < startAt) {
    return "suspended";
  }
  return baseStatus;
}

function buildPersonalSurveySettings(study: any): PersonalSurveySettings {
  const modeRaw = String(study?.survey_display_mode ?? "").trim().toLowerCase();
  return {
    displayMode: modeRaw === "single" ? "single" : "matrix",
    showProgress: asBool(study?.survey_show_progress, true),
    allowBack: asBool(study?.survey_allow_back, true),
    randomizeQuestions: asBool(study?.survey_randomize_questions, false),
    fastClickCheckEnabled: asBool(study?.survey_fast_click_check_enabled, false),
    autoStartEnabled: asBool(study?.survey_auto_start_enabled, false),
    autoStartAt: asIsoOrNull(study?.survey_auto_start_at),
    autoEndEnabled: asBool(study?.survey_auto_end_enabled, false),
    autoEndAt: asIsoOrNull(study?.survey_auto_end_at),
  };
}

function buildJstSurveySettings(study: any): JstSurveySettings {
  return {
    showProgress: asBool(study?.survey_show_progress, true),
    allowBack: asBool(study?.survey_allow_back, true),
    fastClickCheckEnabled: asBool(study?.survey_fast_click_check_enabled, false),
    autoStartEnabled: asBool(study?.survey_auto_start_enabled, false),
    autoStartAt: asIsoOrNull(study?.survey_auto_start_at),
    autoEndEnabled: asBool(study?.survey_auto_end_enabled, false),
    autoEndAt: asIsoOrNull(study?.survey_auto_end_at),
  };
}

const App: React.FC = () => {
  const [started, setStarted] = useState(() => window.location.hash.toLowerCase() === STARTED_HASH);

  const [hasStudy, setHasStudy] = useState<boolean | null>(null);
  const [surveyKind, setSurveyKind] = useState<"personal" | "jst" | null>(null);
  const [jstStudy, setJstStudy] = useState<JstStudyRow | null>(null);
  const [gender, setGender] = useState<"M" | "F">("M");
  const [personNom, setPersonNom] = useState<string>("");   // Marcin Gołek
  const [personGen, setPersonGen] = useState<string>("");   // Marcina Gołka
  const [personAcc, setPersonAcc] = useState<string>("");   // Marcina Gołka / Annę Kowalską / Pawła Batyrę
  const [personLoc, setPersonLoc] = useState<string>("");   // Marcinie Gołku / Annie Kowalskiej
  const [surnameNom, setSurnameNom] = useState<string>(""); // Gołek / Kowalska

  const [token, setToken] = useState<string | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [alreadyDoneChannel, setAlreadyDoneChannel] = useState<"sms" | "email" | null>(null);
  const [alreadyDoneContact, setAlreadyDoneContact] = useState<string>("");
  const [inactiveLink, setInactiveLink] = useState(false);
  const [inactiveChannel, setInactiveChannel] = useState<"sms" | "email" | null>(null);
  const [inactiveContact, setInactiveContact] = useState<string>("");
  const [studyStatus, setStudyStatus] = useState<StudyLifecycleStatus>("active");
  const [statusBlock, setStatusBlock] = useState<{ title: string; text: string } | null>(null);
  const [personalSettings, setPersonalSettings] = useState<PersonalSurveySettings>(DEFAULT_PERSONAL_SETTINGS);
  const [jstSettings, setJstSettings] = useState<JstSurveySettings>(DEFAULT_JST_SETTINGS);
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
          const personalCfg = buildPersonalSurveySettings(personalStudy as any);
          const baseStatus = normalizeStudyLifecycleStatus(
            (personalStudy as any).study_status,
            (personalStudy as any).is_active,
          );
          const resolvedStatus = applyScheduleStatus(baseStatus, personalCfg);
          resolvedKind = "personal";
          if (!cancelled) {
            setSurveyKind("personal");
            setGender(c.gender);
            setPersonNom(c.fullNom);
            setPersonGen(c.fullGen);
            setPersonAcc(c.fullAcc);
            setPersonLoc(c.fullLoc);
            setSurnameNom(c.surNom);
            setPersonalSettings(personalCfg);
            setStudyStatus(resolvedStatus);
            setStatusBlock(statusBlockMessage(resolvedStatus));
          }
        } else if (jstCandidate) {
          const jstCfg = buildJstSurveySettings(jstCandidate as any);
          const baseStatus = normalizeStudyLifecycleStatus(
            (jstCandidate as any).study_status,
            (jstCandidate as any).is_active,
          );
          const resolvedStatus = applyScheduleStatus(baseStatus, jstCfg);
          resolvedKind = "jst";
          if (!cancelled) {
            setSurveyKind("jst");
            setJstStudy(jstCandidate);
            setJstSettings(jstCfg);
            setStudyStatus(resolvedStatus);
            setStatusBlock(statusBlockMessage(resolvedStatus));
          }
        }

        const urlToken = getTokenFromUrl();
        if (!cancelled) setToken(urlToken);
        if (urlToken) {
          try {
            if (resolvedKind === "jst") {
              const tokenMeta = await withTimeout(getJstTokenMeta(urlToken), 3500, null);
              if (tokenMeta?.found) {
                const currentSlug = (s || "").trim().toLowerCase();
                const tokenSlug = (tokenMeta.study_slug || "").trim().toLowerCase();
                if (!cancelled && currentSlug && tokenSlug && currentSlug !== tokenSlug) {
                  const next = `${window.location.origin}/${tokenSlug}?t=${encodeURIComponent(urlToken)}`;
                  window.location.replace(next);
                  return;
                }
                const blockedByToken = tokenMeta.completed || tokenMeta.rejected;
                if (!cancelled && tokenMeta.revoked) {
                  setInactiveLink(true);
                  setInactiveChannel(tokenMeta.channel);
                  setInactiveContact(tokenMeta.contact || "");
                  setAlreadyDone(false);
                } else if (!cancelled && blockedByToken) {
                  setAlreadyDone(true);
                  setAlreadyDoneChannel(tokenMeta.channel);
                  setAlreadyDoneContact(tokenMeta.contact || "");
                  setInactiveLink(false);
                }
              } else {
                const done = await withTimeout(isJstTokenCompleted(urlToken), 2500, false);
                if (!cancelled && done) setAlreadyDone(true);
              }
            } else {
              const tokenMeta = await withTimeout(getTokenMeta(urlToken), 3500, null);
              if (tokenMeta?.found) {
                if (!cancelled && tokenMeta.revoked) {
                  setInactiveLink(true);
                  setInactiveChannel(tokenMeta.channel);
                  setInactiveContact(tokenMeta.contact || "");
                  setAlreadyDone(false);
                } else if (!cancelled && tokenMeta.completed) {
                  setAlreadyDone(true);
                  setAlreadyDoneChannel(tokenMeta.channel);
                  setAlreadyDoneContact(tokenMeta.contact || "");
                  setInactiveLink(false);
                }
              } else {
                const done = await withTimeout(isTokenCompleted(urlToken), 2500, false);
                if (!cancelled && done) setAlreadyDone(true);
              }
            }
          } catch (e) {
            console.warn("isTokenCompleted error:", e);
            try {
              const doneFallback = resolvedKind === "jst"
                ? await withTimeout(isJstTokenCompleted(urlToken), 4000, false)
                : await withTimeout(isTokenCompleted(urlToken), 4000, false);
              if (!cancelled && doneFallback) setAlreadyDone(true);
            } catch (fallbackErr) {
              console.warn("isTokenCompleted fallback error:", fallbackErr);
            }
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

  useEffect(() => {
    const base = `${window.location.pathname}${window.location.search}`;
    if (started) {
      if (window.location.hash.toLowerCase() !== STARTED_HASH) {
        window.history.replaceState(null, "", `${base}${STARTED_HASH}`);
      }
      void tryEnterFullscreenMobile();
      return;
    }
    if (window.location.hash.toLowerCase() === STARTED_HASH) {
      window.history.replaceState(null, "", base);
    }
  }, [started]);

  const perceivedWord = gender === "F" ? "postrzegana" : "postrzegany";
  const himHer = gender === "F" ? "niej" : "niego";
  const showBlocker = hasStudy === false;

  if (!checking && !alreadyDone && !inactiveLink && surveyKind === "jst" && jstStudy && studyStatus === "active" && !statusBlock) {
    return (
      <AppErrorBoundary>
        <JstSurvey study={jstStudy} token={token} navigation={jstSettings} />
      </AppErrorBoundary>
    );
  }

  if (!checking && statusBlock) {
    return (
      <main
        style={{
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
          background: "#ffffff",
          color: "#1f2937",
          fontFamily: "'Roboto', Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 780, width: "100%", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ margin: "0 0 10px 0", color: "#0f172a" }}>{statusBlock.title}</h2>
          <p style={{ margin: 0, lineHeight: 1.55 }}>{statusBlock.text}</p>
          <p style={{ margin: "12px 0 0 0", fontSize: "0.9rem", color: "#64748b" }}>
            W razie pytań skontaktuj się z administratorem badania.
          </p>
        </div>
      </main>
    );
  }

return (
  <div style={wrapperStyle}>
    {checking ? (
      <div style={{ maxWidth: 900, margin: "80px auto 0 auto", padding: "0 24px", color: "#334155" }}>
        Ładowanie ankiety...
      </div>
    ) : inactiveLink ? (
      <AlreadyCompleted variant="inactive" channel={inactiveChannel} contact={inactiveContact} />
    ) : alreadyDone ? (
      <AlreadyCompleted channel={alreadyDoneChannel} contact={alreadyDoneContact} />
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
              color: "#213547",
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
                void tryEnterFullscreenMobile();
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
      <AppErrorBoundary>
        <Questionnaire
          settings={personalSettings}
          initialGender={gender}
          initialFullGen={personGen}
        />
      </AppErrorBoundary>
    )}
  </div>
);
};

export default App;
