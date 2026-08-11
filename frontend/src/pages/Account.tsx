import { useState } from "react";
import { api, ApiError } from "../api/client.js";

interface Props {
  onBack: () => void;
  onAccountDeleted: () => void;
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Autoatendimento de dados (secção 8): "utilizador pode exportar ou apagar
 * o histórico a qualquer momento" — sem fricção, sem pedir a ninguém, tal
 * como o cancelamento de subscrição descrito na secção 7 não deve ter
 * fluxo de retenção manipulador. As mesmas regras aplicam-se aqui: nenhum
 * texto de culpa, nenhuma etapa extra escondida.
 */
export function Account({ onBack, onAccountDeleted }: Props) {
  const [exporting, setExporting] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const data = await api.exportAccountData();
      downloadJson(data, "cuidamente-dados.json");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível exportar os dados.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteHistory() {
    setDeletingHistory(true);
    setError(null);
    setMessage(null);
    try {
      await api.deleteAccountHistory();
      setMessage("Histórico apagado. A sua conta continua ativa.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível apagar o histórico.");
    } finally {
      setDeletingHistory(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setError(null);
    try {
      await api.deleteAccount();
      onAccountDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível apagar a conta.");
      setDeletingAccount(false);
    }
  }

  return (
    <div className="screen">
      <button type="button" className="secondary" onClick={onBack}>
        ← Voltar
      </button>

      <h1>A minha conta</h1>
      <p className="explainer">
        Os seus dados são seus. Pode descarregar tudo o que guardamos, ou apagar, a qualquer
        momento, sem ter de pedir a ninguém.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="explainer">{message}</p>}

      <h2>Descarregar os meus dados</h2>
      <p className="explainer">
        Um ficheiro com os seus check-ins e sessões, tal como estão guardados.
      </p>
      <button type="button" onClick={handleExport} disabled={exporting}>
        {exporting ? "A preparar…" : "Descarregar os meus dados"}
      </button>

      <h2>Apagar histórico</h2>
      <p className="explainer">
        Remove os seus check-ins e sessões. A sua conta continua ativa — pode voltar a fazer
        check-in normalmente a seguir.
      </p>
      <button type="button" className="secondary" onClick={handleDeleteHistory} disabled={deletingHistory}>
        {deletingHistory ? "A apagar…" : "Apagar histórico"}
      </button>

      <h2>Apagar a minha conta</h2>
      <p className="explainer">
        Remove a conta e todo o histórico associado, de forma permanente.
      </p>
      {!confirmDeleteAccount ? (
        <button type="button" className="secondary" onClick={() => setConfirmDeleteAccount(true)}>
          Apagar a minha conta
        </button>
      ) : (
        <>
          <p className="explainer">
            Tem a certeza? Isto não pode ser desfeito.
          </p>
          <button type="button" onClick={handleDeleteAccount} disabled={deletingAccount}>
            {deletingAccount ? "A apagar…" : "Sim, apagar definitivamente"}
          </button>
          <button type="button" className="secondary" onClick={() => setConfirmDeleteAccount(false)}>
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
