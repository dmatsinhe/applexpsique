interface Props {
  rendered: {
    opening: string;
    induction: string;
    coreSuggestions: string[];
    emphasizedAnchorPhrases: string[];
    closing: string;
    pace: string;
  };
  onRestart: () => void;
}

/**
 * Exibe o texto da sessão personalizada. No MVP passo 1 mostramos o texto;
 * a camada de text-to-speech (secção 2/stack sugerido) fica para uma fase
 * seguinte.
 */
export function SessionResult({ rendered, onRestart }: Props) {
  return (
    <div className="screen">
      <h1>A sua sessão</h1>
      <p className="pace-tag">Ritmo: {rendered.pace}</p>
      <section>
        <p>{rendered.opening}</p>
        <p>{rendered.induction}</p>
        {rendered.coreSuggestions.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
        {rendered.emphasizedAnchorPhrases.map((phrase, i) => (
          <p key={i} className="anchor-phrase">
            {phrase}
          </p>
        ))}
        <p>{rendered.closing}</p>
      </section>
      <button type="button" onClick={onRestart}>
        Concluir
      </button>
    </div>
  );
}
