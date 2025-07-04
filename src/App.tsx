import React, { useState } from "react";
import Questionnaire from "./Questionnaire";

const App: React.FC = () => {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="welcome-layout">
        <h1 className="welcome-title">
          Badanie wizerunku i postrzegania Krzysztofa Hetmana
        </h1>
        <hr className="welcome-line" />
        <div className="welcome-text">
          Witaj!<br /><br />
          To badanie jest realizowane na prośbę Krzysztofa Hetmana.<br /><br />
          Chcielibyśmy, abyś spróbował(a) wcielić się w samego Krzysztofa Hetmana i odpowiedział(a) z jego perspektywy na kilka pytań dotyczących postrzegania, przekonań i stylu działania.<br /><br />
          Zdajemy sobie sprawę, że takie zadanie może być wyzwaniem, dlatego tym bardziej doceniamy Twoje zaangażowanie. Twoje odpowiedzi pomogą nam lepiej zrozumieć, jak Krzysztof Hetman może być postrzegany przez innych. To dla nas i dla niego strategicznie ważne – dlatego jesteśmy bardzo wdzięczni za Twój czas i szczerość.<br /><br />
          Prosimy, postaraj się udzielać odpowiedzi jak najbardziej szczerze, na podstawie swoich obserwacji i wyobrażenia o tej postaci.<br /><br />
          Gdy będziesz gotowy(a), kliknij przycisk poniżej, aby rozpocząć badanie.<br /><br />
          <span
            style={{
              display: "block",
              textAlign: "right",
              fontStyle: "normal",
              marginTop: 30
            }}
          >
            Dziękujemy za Twoją pomoc!<br />
            Hetman Team&nbsp;💪
          </span>
        </div>
        <div className="welcome-btn-wrap">
          <button className="welcome-btn" onClick={() => setStarted(true)}>
            Zaczynamy
          </button>
        </div>
        <footer className="footer">
          opracowanie: Piotr Stec, Badania.pro® | © {new Date().getFullYear()}
          <div className="footer-sub">
            Jeśli pojawiły się jakieś wątpliwości lub masz pytania proszę o kontakt: Piotr Stec, Badania.pro,&nbsp;
            e-mail: <a href="mailto:piotr.stec@badania.pro">piotr.stec@badania.pro</a>, tel.:500-121-141
          </div>
        </footer>
      </div>
    );
  }

  return <Questionnaire />;
};

export default App;