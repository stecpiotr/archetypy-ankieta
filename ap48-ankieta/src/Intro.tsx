export default function Intro({onStart}:{onStart:()=>void}) {
  return (
    <main style={{maxWidth:600,margin:"80px auto",fontFamily:"sans-serif"}}>
      <h1>Kwestionariusz AP-48</h1>
      <p>Na kolejnych stronach znajdziesz 48 twierdzeń. Przeczytaj każde
         i zaznacz, na ile opis pasuje do Ciebie.</p>
      <button onClick={onStart}>Zaczynam</button>
    </main>
  );
}