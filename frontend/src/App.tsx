import { useState } from "react";
import { setAuthToken, type CheckInOutcome } from "./api/client.js";
import { AgeGate } from "./pages/AgeGate.js";
import { CrisisConsent } from "./pages/CrisisConsent.js";
import { CheckIn } from "./pages/CheckIn.js";
import { CrisisResources } from "./pages/CrisisResources.js";
import { NoTemplateAvailable } from "./pages/NoTemplateAvailable.js";
import { Personalize } from "./pages/Personalize.js";
import { SessionResult } from "./pages/SessionResult.js";

type Step =
  | { name: "age-gate" }
  | { name: "crisis-consent" }
  | { name: "checkin" }
  | { name: "crisis-clear"; outcome: Extract<CheckInOutcome, { kind: "crisis_clear" }> }
  | { name: "crisis-ambiguous"; outcome: Extract<CheckInOutcome, { kind: "crisis_ambiguous" }> }
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

export function App() {
  const [step, setStep] = useState<Step>({ name: "age-gate" });

  function handleOutcome(outcome: CheckInOutcome) {
    switch (outcome.kind) {
      case "crisis_clear":
        setStep({ name: "crisis-clear", outcome });
        break;
      case "crisis_ambiguous":
        setStep({ name: "crisis-ambiguous", outcome });
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

  return (
    <main className="app">
      {step.name === "age-gate" && (
        <AgeGate
          onRegistered={(token) => {
            setAuthToken(token);
            setStep({ name: "crisis-consent" });
          }}
        />
      )}

      {step.name === "crisis-consent" && (
        <CrisisConsent onDecided={() => setStep({ name: "checkin" })} />
      )}

      {step.name === "checkin" && <CheckIn onOutcome={handleOutcome} />}

      {step.name === "crisis-clear" && (
        <CrisisResources resources={step.outcome.resources} onRestart={restart} />
      )}

      {step.name === "crisis-ambiguous" && (
        <CrisisResources
          resources={step.outcome.resources}
          acknowledgement={step.outcome.acknowledgement}
          checkInId={step.outcome.checkInId}
          onContinue={(outcome) => handleOutcome(outcome as CheckInOutcome)}
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
