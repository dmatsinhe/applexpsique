import { useState } from "react";
import { api, ApiError } from "../api/client.js";

interface Props {
  onRegistered: (token: string) => void;
}

/**
 * Verificação de idade explícita (secção 5.1): pede data de nascimento
 * completa, nunca uma checkbox genérica de termos. O backend recusa o
 * registo por completo se a idade calculada for inferior a 18 — não há
 * caminho de código aqui para "continuar mesmo assim".
 */
export function AgeGate({ onRegistered }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token } = await api.register({ email, password, birthDate });
      onRegistered(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o registo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen">
      <h1>Criar conta — CuidaMente</h1>
      <p className="explainer">
        Esta aplicação é exclusiva para adultos (18+). Precisamos da sua data
        de nascimento para confirmar isso — não guardamos a data em si, só a
        confirmação de que tem idade suficiente.
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Data de nascimento
          <input
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "A criar conta..." : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
