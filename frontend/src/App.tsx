import { useState } from "react";
import { setAuthToken, type CheckInOutcome } from "./api/client.js";
import { AgeGate } from "./pages/AgeGate.js";
import { CheckIn } from "./pages/CheckIn.js";
import { CrisisResources } from "./pages/CrisisResources.js";
import { NoTemplateAvailable } from "./pages/NoTemplateAvailable.js";
import { Personalize } from "./pages/Personalize.js";
import { SessionResult } from "./pages/SessionResult.js";
import { FounderProfile } from "./pages/FounderProfile.js";
import { Account } from "./pages/Account.js";
import { PrivacyPolicy } from "./pages/PrivacyPolicy.js";

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
  | { name: "personalize"; outcome: Extract<CheckInOutcome, { kind: "matched" }> }
  | {
      name: "session-result";
      rendered: {
        opening: string;
        induction: string;
        coreSuggestions: string[];
        emphasizedAnchorPhrases: string[];
        closing: string;
        pace: string;
      };
    };

type Overlay = "none" | "founder-profile" | "account" | "privacy-policy";

export function App() {
  const [step, setStep] = useState<Step>({ name: "age-gate" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>("none");

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

  return (
    <main className="app">
      <nav className="top-nav">
        {isAuthenticated && (
          <button type="button" className="link-button" onClick={() => setOverlay("account")}>
            A minha conta
          </button>
        )}
        <button type="button" className="link-button" onClick={() => setOverlay("founder-profile")}>
          Sobre a fundadora · Como isto funciona
        </button>
        <button type="button" className="link-button" onClick={() => setOverlay("privacy-policy")}>
          Política de Privacidade
        </button>
      </nav>

      {step.name === "age-gate" && (
        <AgeGate
          onRegistered={(token) => {
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

      {step.name === "personalize" && (
        <Personalize
          templateVersionId={step.outcome.templateVersionId}
          templateTitle={step.outcome.templateTitle}
          paceOptions={step.outcome.paceOptions}
          onCreated={(result) => setStep({ name: "session-result", rendered: result.rendered })}
        />
      )}

      {step.name === "session-result" && (
        <SessionResult rendered={step.rendered} onRestart={restart} />
      )}
    </main>
  );
}
