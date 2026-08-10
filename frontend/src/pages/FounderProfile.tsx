import { useEffect, useState } from "react";
import { api } from "../api/client.js";

interface Props {
  onBack: () => void;
}

/**
 * Perfil da fundadora + "Como isto funciona" (secção 4): credencial
 * clínica visível, e explicação honesta do que a app pode e não pode
 * fazer — incluindo que a personalização por IA ocorre só dentro de
 * templates aprovados, nunca livremente.
 */
export function FounderProfile({ onBack }: Props) {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof api.getFounderProfile>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getFounderProfile()
      .then(setProfile)
      .catch(() => setError("Não foi possível carregar o perfil da fundadora."));
  }, []);

  return (
    <div className="screen">
      <button type="button" className="secondary" onClick={onBack}>
        ← Voltar
      </button>

      {error && <p className="error" role="alert">{error}</p>}

      {profile && (
        <>
          <h1>{profile.name}</h1>
          <p className="explainer">{profile.credentials}</p>

          <p className="explainer">Registo profissional: {profile.licenseNumber}</p>

          <h2>Metodologia</h2>
          <p>{profile.methodology.join(" · ")}</p>

          <h2>Formação académica</h2>
          <ul>
            {profile.academicCredentials.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2>Certificações clínicas</h2>
          <ul>
            {profile.clinicalCertifications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2>Experiência</h2>
          <p>{profile.experienceSummary}</p>

          <h2>Como isto funciona</h2>
          <p className="explainer">{profile.howItWorks}</p>
        </>
      )}
    </div>
  );
}
