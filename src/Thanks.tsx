// src/Thanks.tsx
import React, { useEffect, useState } from "react";
import { getSlugFromUrl, loadStudyBySlug, buildDisplayFromStudy } from "./lib/studies";

const Thanks: React.FC = () => {
  const [personGen, setPersonGen] = useState<string>("");

  useEffect(() => {
    // Spróbuj zdjąć ewentualną blokadę orientacji (jeśli wcześniej została ustawiona)
    try {
      // Standard Screen Orientation API
      // @ts-ignore - typy mogą nie znać .unlock()
      if (typeof screen !== "undefined" && screen.orientation && screen.orientation.unlock) {
        // @ts-ignore
        screen.orientation.unlock();
      }
      // WebKit (iOS) nie wspiera lock/unlock – bezpiecznie ignorujemy
    } catch {
      /* no-op */
    }
  }, []);

  useEffect(() => {
    (async () => {
      const slug = getSlugFromUrl();
      if (!slug) return;
      const study = await loadStudyBySlug(slug);
      if (!study) return;
      const c = buildDisplayFromStudy(study);
      setPersonGen(c.fullGen); // np. "Marcina Gołka" / "Anny Kowalskiej"
    })();
  }, []);

  return (
    <main
      style={{
        fontFamily: "'Roboto', Arial, sans-serif",
        textAlign: "center",
        background: "#fff",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          color: "#06b09c",
          fontSize: "2.1rem",
          fontWeight: 800,
          letterSpacing: ".01em",
          margin: "0 0 18px 0",
          fontFamily: "'Roboto', Arial, sans-serif",
          lineHeight: 1.15,
        }}
      >
        W imieniu {personGen || "…"} dziękujemy za udział w badaniu!
      </h2>

      <p style={{ fontSize: "1.24rem", color: "#222", margin: "0 0 16px 0" }}>
        Twoje odpowiedzi zostały zapisane.
      </p>

      <p
        style={{
          fontSize: "1.11rem",
          color: "#555",
          maxWidth: 560,
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        Jeśli pojawiły się jakiekolwiek wątpliwości lub masz pytania, proszę o kontakt:
        <br />
        <b>Piotr Stec, Badania.pro</b>
        <br />
        e-mail: <a href="mailto:piotr.stec@badania.pro">piotr.stec@badania.pro</a>
        <br />
        tel.: <a href="tel:500121141">500-121-141</a>
      </p>
    </main>
  );
};

export default Thanks;
