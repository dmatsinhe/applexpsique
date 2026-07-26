const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type ClinicalGoal =
  | "SLEEP"
  | "GENERALIZED_ANXIETY"
  | "FOCUS"
  | "SELF_ESTEEM"
  | "HABIT"
  | "PAIN"
  | "GRIEF";

export interface CrisisResource {
  name: string;
  description: string;
  phone?: string;
  availability: string;
}

export type CheckInOutcome =
  | { kind: "crisis_clear"; resources: CrisisResource[] }
  | { kind: "crisis_ambiguous"; checkInId: string; resources: CrisisResource[]; acknowledgement: string }
  | { kind: "no_template_available"; checkInId: string; availableGoals: ClinicalGoal[] }
  | {
      kind: "matched";
      checkInId: string;
      templateVersionId: string;
      templateTitle: string;
      clinicalGoal: ClinicalGoal;
      paceOptions: string[];
    };

class ApiError extends Error {}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  register: (params: { email: string; password: string; birthDate: string }) =>
    request<{ userId: string; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  login: (params: { email: string; password: string }) =>
    request<{ userId: string; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getCrisisConsentExplanation: () =>
    request<{
      version: string;
      title: string;
      body: string;
      options: { value: boolean; label: string }[];
    }>("/auth/crisis-consent-explanation"),

  setCrisisConsent: (notifyOnClearSignal: boolean) =>
    request<void>("/auth/consent/crisis-notify", {
      method: "POST",
      body: JSON.stringify({ notifyOnClearSignal }),
    }),

  submitCheckIn: (params: {
    requestedGoal: ClinicalGoal;
    recentFeelingText: string;
    situationNote?: string;
    energyLevel: 1 | 2 | 3 | 4 | 5;
    additionalNote?: string;
  }) => request<CheckInOutcome>("/checkin", { method: "POST", body: JSON.stringify(params) }),

  continueAfterAmbiguousCrisis: (checkInId: string) =>
    request<CheckInOutcome>(`/checkin/${checkInId}/continue`, { method: "POST" }),

  createSession: (params: {
    templateVersionId: string;
    personalization: {
      name: string;
      situationNote?: string;
      pace: string;
      emphasizedAnchorPhrases?: string[];
    };
  }) =>
    request<{
      sessionId: string;
      rendered: {
        opening: string;
        induction: string;
        coreSuggestions: string[];
        emphasizedAnchorPhrases: string[];
        closing: string;
        pace: string;
      };
    }>("/sessions", { method: "POST", body: JSON.stringify(params) }),

  getFounderProfile: () =>
    request<{
      name: string;
      credentials: string;
      methodology: string[];
      howItWorks: string;
    }>("/founder"),
};

export { ApiError };
