import React from "react";

type Props = {
  channel?: "sms" | "email" | null;
  contact?: string | null;
  variant?: "completed" | "inactive";
};

const AlreadyCompleted: React.FC<Props> = ({ channel = null, contact = "", variant = "completed" }) => {
  const trimmed = String(contact || "").trim();
  const channelLabel =
    channel === "sms" ? "numeru telefonu" : channel === "email" ? "adresu e-mail" : "";
  const title = variant === "inactive"
    ? "Link do tej ankiety jest nieaktywny"
    : (trimmed && channelLabel
      ? `Ankieta dla tego ${channelLabel} ${trimmed} została już wypełniona.`
      : "Ta ankieta została już wypełniona.");

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
        {title}
      </h2>

      <style>{`
        .desktop-contact-break { display: none; }
        .mobile-inline-space { display: inline; }
        @media (min-width: 901px) {
          .desktop-contact-break { display: inline; }
          .mobile-inline-space { display: none; }
        }
      `}</style>

      <p
        style={{
          fontSize: "1.11rem",
          color: "#555",
          maxWidth: 560,
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        Jeśli pojawiły się jakiekolwiek wątpliwości lub masz pytania,
        <span className="desktop-contact-break"><br /></span>
        <span className="mobile-inline-space"> </span>
        proszę o kontakt:
        <br />
        <b>Piotr Stec, Badania.pro®</b>
        <br />
        e-mail: <a href="mailto:piotr.stec@badania.pro">piotr.stec@badania.pro</a>
        <br />
        tel.: <a href="tel:500121141">500-121-141</a>
      </p>
    </main>
  );
};

export default AlreadyCompleted;
