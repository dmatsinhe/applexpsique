import { useEffect, useState } from "react";
import { marked } from "marked";
import { api } from "../api/client.js";

interface Props {
  onBack: () => void;
}

/**
 * Política de privacidade (secção 8) — a fonte única é
 * backend/src/legal/politica-privacidade.md, servida em texto simples por
 * `GET /legal/privacy-policy` e convertida para HTML aqui. Nunca uma cópia
 * duplicada no frontend — evita que o texto aprovado e o que é mostrado
 * divirjam.
 */
export function PrivacyPolicy({ onBack }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPrivacyPolicyMarkdown()
      .then((markdown) => setHtml(marked.parse(markdown, { async: false })))
      .catch(() => setError("Não foi possível carregar a política de privacidade."));
  }, []);

  return (
    <div className="screen">
      <button type="button" className="secondary" onClick={onBack}>
        ← Voltar
      </button>

      {error && <p className="error" role="alert">{error}</p>}

      {html && <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
