import { useEffect, useState } from "react";
import {
  api,
  setAuthToken,
  hasStoredAuthToken,
  type CheckInOutcome,
  type TemplateSection,
} from "./api/client.js";
import { AgeGate } from "./pages/AgeGate.js";
import { CheckIn } from "./pages/CheckIn.js";
import { CrisisResources } from "./pages/CrisisResources.js";
import { NoTemplateAvailable } from "./pages/NoTemplateAvailable.js";
import { Personalize } from "./pages/Personalize.js";
import { SessionResult } from "./pages/SessionResult.js";
import { FounderProfile } from "./pages/FounderProfile.js";
import { Account } from "./pages/Account.js";
import { PrivacyPolicy } from "./pages/PrivacyPolicy.js";
import { Pricing } from "./pages/Pricing.js";
import { ProgressReport } from "./pages/ProgressReport.js";

type Step =
  | { name: "age-gate" }
  | { name: "checkin" }
  | { name: "crisis-clear"; outcome: Extract<CheckInOutcome, { kind: "crisis_clear" }> }
  | { name: "crisis-ambiguous"; outcome: Extract<CheckInOutcome, { kind: "crisis_ambiguous" }> }
  | {
      name: "crisis-needs-clarification";
      outcome: Extract<CheckInOutcome, { kind: "crisis_needs_clarification" }>;
    }
  | { name: "no-template"; outcome: Extract<CheckInOutcome, { kind: "no_template_available" }> }
  | {
      name: "contraindication-flagged";
      outcome: Extract<CheckInOutcome, { kind: "contraindication_flagged" }>;
    }
  | { name: "personalize"; outcome: Extract<CheckInOutcome, { kind: "matched" }> }
  | {
      name: "session-result";
      rendered: {
        opening: string;
        sections: TemplateSection[];
        emphasizedAnchorPhrases: string[];
        closing: string;
        pace: string;
      };
    };

type Overlay = "none" | "founder-profile" | "account" | "privacy-policy" | "pricing" | "progress-report";

function readCheckoutStatusFromUrl(): "success" | "cancelado" | null {
  const value = new URLSearchParams(window.location.search).get("checkout");
  return value === "success" || value === "cancelado" ? value : null;
}

export function App() {
  const alreadyAuthenticated = hasStoredAuthToken();
  const [step, setStep] = useState<Step>(
    alreadyAuthenticated ? { name: "checkin" } : { name: "age-gate" },
  );
  const [isAuthenticated, setIsAuthenticated] = useState(alreadyAuthenticated);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancelado" | null>(
    readCheckoutStatusFromUrl,
  );
  const [renewalWarningDays, setRenewalWarningDays] = useState<number | null>(null);
  const [dismissedRenewalWarning, setDismissedRenewalWarning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .getPlanStatus()
      .then((status) => {
        setRenewalWarningDays(status.expiringWithinDays ? status.daysRemaining : null);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  function dismissCheckoutStatus() {
    setCheckoutStatus(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.toString());
  }

  function handleOutcome(outcome: CheckInOutcome) {
    switch (outcome.kind) {
      case "crisis_clear":
        setStep({ name: "crisis-clear", outcome });
        break;
      case "crisis_ambiguous":
        setStep({ name: "crisis-ambiguous", outcome });
        break;
      case "crisis_needs_clarification":
        setStep({ name: "crisis-needs-clarification", outcome });
        break;
      case "no_template_available":
        setStep({ name: "no-template", outcome });
        break;
      case "contraindication_flagged":
        setStep({ name: "contraindication-flagged", outcome });
        break;
      case "matched":
        setStep({ name: "personalize", outcome });
        break;
    }
  }

  function restart() {
    setStep({ name: "checkin" });
  }

  function handleAccountDeleted() {
    setAuthToken(null);
    setIsAuthenticated(false);
    setRenewalWarningDays(null);
    setOverlay("none");
    setStep({ name: "age-gate" });
  }

  if (overlay === "founder-profile") {
    return (
      <main className="app">
        <FounderProfile onBack={() => setOverlay("none")} />
      </main>
    );
  }

  if (overlay === "account") {
    return (
      <main className="app">
        <Account onBack={() => setOverlay("none")} onAccountDeleted={handleAccountDeleted} />
      </main>
    );
  }

  if (overlay === "privacy-policy") {
    return (
      <main className="app">
        <PrivacyPolicy onBack={() => setOverlay("none")} />
      </main>
    );
  }

  if (overlay === "pricing") {
    return (
      <main className="app">
        <Pricing onBack={() => setOverlay("none")} isAuthenticated={isAuthenticated} />
      </main>
    );
  }

  if (overlay === "progress-report") {
    return (
      <main className="app">
        <ProgressReport onBack={() => setOverlay("none")} onGoToPricing={() => setOverlay("pricing")} />
      </main>
    );
  }

  return (
    <main className="app">
      {checkoutStatus === "success" && (
        <p className="checkout-banner success">
          Pagamento confirmado — bem-vinda ao CuidaMente Premium.{" "}
          <button type="button" className="link-button" onClick={dismissCheckoutStatus}>
            Fechar
          </button>
        </p>
      )}
      {checkoutStatus === "cancelado" && (
        <p className="checkout-banner cancelled">
          Pagamento cancelado — não foi cobrado nada.{" "}
          <button type="button" className="link-button" onClick={dismissCheckoutStatus}>
            Fechar
          </button>
        </p>
      )}
      {renewalWarningDays !== null && !dismissedRenewalWarning && (
        <p className="checkout-banner cancelled">
          {renewalWarningDays <= 0
            ? "A sua subscrição Premium expira hoje."
            : renewalWarningDays === 1
              ? "A sua subscrição Premium expira amanhã."
              : `A sua subscrição Premium expira em ${renewalWarningDays} dias.`}{" "}
          Renove para não perder o acesso.{" "}
          <button type="button" className="link-button" onClick={() => setOverlay("pricing")}>
            Ver planos
          </button>{" "}
          <button type="button" className="link-button" onClick={() => setDismissedRenewalWarning(true)}>
            Fechar
          </button>
        </p>
      )}
      <nav className="top-nav">
        {isAuthenticated && (
          <button type="button" className="link-button" onClick={() => setOverlay("account")}>
            A minha conta
          </button>
        )}
        {isAuthenticated && (
          <button type="button" className="link-button" onClick={() => setOverlay("progress-report")}>
            A minha evolução
          </button>
        )}
        <button type="button" className="link-button" onClick={() => setOverlay("founder-profile")}>
          Sobre a fundadora · Como isto funciona
        </button>
        <button type="button" className="link-button" onClick={() => setOverlay("pricing")}>
          Preços
        </button>
        <button type="button" className="link-button" onClick={() => setOverlay("privacy-policy")}>
          Política de Privacidade
        </button>
      </nav>

      {step.name === "age-gate" && (
        <AgeGate
          onAuthenticated={(token) => {
            setAuthToken(token);
            setIsAuthenticated(true);
            setStep({ name: "checkin" });
          }}
        />
      )}

      {step.name === "checkin" && <CheckIn onOutcome={handleOutcome} />}

      {step.name === "crisis-clear" && (
        <CrisisResources
          response={step.outcome.response}
          noRealTimeSupervisionNotice={step.outcome.noRealTimeSupervisionNotice}
          onRestart={restart}
        />
      )}

      {step.name === "crisis-ambiguous" && (
        <CrisisResources
          response={step.outcome.response}
          noRealTimeSupervisionNotice={step.outcome.noRealTimeSupervisionNotice}
          acknowledgement={step.outcome.acknowledgement}
          checkInId={step.outcome.checkInId}
          onContinue={(outcome) => handleOutcome(outcome as CheckInOutcome)}
          onRestart={restart}
        />
      )}

      {step.name === "crisis-needs-clarification" && (
        <CrisisResources
          response={step.outcome.response}
          noRealTimeSupervisionNotice={step.outcome.noRealTimeSupervisionNotice}
          clarification={step.outcome.clarification}
          checkInId={step.outcome.checkInId}
          onClarified={(outcome) => handleOutcome(outcome as CheckInOutcome)}
          onRestart={restart}
        />
      )}

      {step.name === "no-template" && (
        <NoTemplateAvailable availableGoals={step.outcome.availableGoals} onRestart={restart} />
      )}

      {step.name === "contraindication-flagged" && (
        <CrisisResources
          response={step.outcome.response}
          noRealTimeSupervisionNotice={step.outcome.message}
          onRestart={restart}
        />
      )}

      {step.name === "personalize" && (
        <Personalize
          templateVersionId={step.outcome.templateVersionId}
          templateTitle={step.outcome.templateTitle}
          paceOptions={step.outcome.paceOptions}
          onCreated={(result) => setStep({ name: "session-result", rendered: result.rendered })}
          onGoToPricing={() => setOverlay("pricing")}
        />
      )}

      {step.name === "session-result" && (
        <SessionResult rendered={step.rendered} onRestart={restart} />
      )}
    </main>
  );
}
