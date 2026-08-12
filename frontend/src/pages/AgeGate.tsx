import { useState } from "react";
import { api, ApiError } from "../api/client.js";

interface Props {
  onAuthenticated: (token: string) => void;
}

/**
 * Verificação de idade explícita (secção 5.1): pede data de nascimento
 * completa, nunca uma checkbox genérica de termos. O backend recusa o
 * registo por completo se a idade calculada for inferior a 18 — não há
 * caminho de código aqui para "continuar mesmo assim".
 *
 * Também serve como ecrã de login para quem já tem conta — sem isto, a
 * única forma de voltar a entrar depois de perder a sessão seria tentar
 * registar de novo, que falha porque o email já existe.
 */
export function AgeGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"register" | "login">("register");
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
      const { token } =
        mode === "register"
          ? await api.register({ email, password, birthDate })
          : await api.login({ email, password });
      onAuthenticated(token);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : mode === "register"
            ? "Não foi possível concluir o registo."
            : "Não foi possível iniciar sessão.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode(mode === "register" ? "login" : "register");
    setError(null);
  }

  return (
    <div className="screen">
      <h1>{mode === "register" ? "Criar conta — CuidaMente" : "Iniciar sessão — CuidaMente"}</h1>
      {mode === "register" && (
        <p className="explainer">
          Esta aplicação é exclusiva para adultos (18+). Precisamos da sua data
          de nascimento para confirmar isso — não guardamos a data em si, só a
          confirmação de que tem idade suficiente.
        </p>
      )}
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
        {mode === "register" && (
          <label>
            Data de nascimento
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting
            ? mode === "register"
              ? "A criar conta..."
              : "A entrar..."
            : mode === "register"
              ? "Criar conta"
              : "Entrar"}
        </button>
      </form>
      <button type="button" className="link-button" onClick={toggleMode}>
        {mode === "register" ? "Já tem conta? Iniciar sessão" : "Ainda não tem conta? Criar conta"}
      </button>
    </div>
  );
}
