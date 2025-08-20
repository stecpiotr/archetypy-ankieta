// src/Thanks.tsx
import React, { useEffect, useState } from "react";
import { getSlugFromUrl, loadStudyBySlug, buildDisplayFromStudy } from "./lib/studies";

const Thanks: React.FC = () => {
  const [personGen, setPersonGen] = useState<string>("");

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
        marginTop: 90,
        background: "#fff",
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start"
      }}
    >
      <h2 style={{
        color: "#06b09c",
        fontSize: "2.1rem",
        fontWeight: 800,
        letterSpacing: ".01em",
        marginTop: 32,
        marginBottom: 22,
        fontFamily: "'Roboto', Arial, sans-serif"
      }}>
        W imieniu {personGen || "…"} dziękujemy za udział w badaniu!
      </h2>
      <p style={{ fontSize: "1.24rem", color: "#222", marginBottom: 18 }}>
        Twoje odpowiedzi zostały zapisane.
      </p>
      <p style={{ fontSize: "1.11rem", color: "#555", maxWidth: 500, margin: "0 auto" }}>
        Jeśli pojawiły się jakiekolwiek wątpliwości lub masz pytania, proszę o kontakt:<br />
        <b>Piotr Stec, Badania.pro</b><br />
        e-mail: <a href="mailto:piotr.stec@badania.pro">piotr.stec@badania.pro</a><br />
        tel.: <a href="tel:500121141">500-121-141</a>
      </p>
    </main>
  );
};

export default Thanks;
