const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type ClinicalGoal =
  | "SLEEP"
  | "GENERALIZED_ANXIETY"
  | "FOCUS"
  | "SELF_ESTEEM"
  | "HABIT_PHONE_OVERUSE"
  | "HABIT_PROCRASTINATION"
  | "HABIT_NAIL_BITING"
  | "HABIT_MINDLESS_SNACKING"
  | "HABIT_NOTIFICATION_CHECKING"
  | "HABIT_SEDENTARY_AVOIDANCE"
  | "HABIT_BEDTIME_PROCRASTINATION"
  | "PAIN"
  | "GRIEF";

export interface CrisisResource {
  name: string;
  description: string;
  phone?: string;
  availability: string;
}

export interface RegionalProfessionalSupportOption {
  name: string;
  description: string;
  contact?: string;
}

export interface FounderPrivateContact {
  disclaimerLabel: string;
  name: string;
  credentials: string;
  bookingContact: string;
}

export interface CrisisResponseBundle {
  immediateResources: CrisisResource[];
  regionalProfessionalSupport: RegionalProfessionalSupportOption[];
  founderPrivateContact: FounderPrivateContact;
}

export interface TemplateSection {
  id: string;
  title: string;
  body: string;
}

export interface CrisisClarificationPrompt {
  level: "DIRECT_MENTION" | "SELF_HARM";
  question: string;
  options: { label: string; resolution: "ESCALATE" | "DOWNGRADE" }[];
}

export type CheckInOutcome =
  | { kind: "crisis_clear"; response: CrisisResponseBundle; noRealTimeSupervisionNotice: string }
  | {
      kind: "crisis_ambiguous";
      checkInId: string;
      response: CrisisResponseBundle;
      noRealTimeSupervisionNotice: string;
      acknowledgement: string;
    }
  | {
      kind: "crisis_needs_clarification";
      checkInId: string;
      response: CrisisResponseBundle;
      noRealTimeSupervisionNotice: string;
      clarification: CrisisClarificationPrompt;
    }
  | { kind: "no_template_available"; checkInId: string; availableGoals: ClinicalGoal[] }
  | {
      kind: "contraindication_flagged";
      checkInId: string;
      response: CrisisResponseBundle;
      message: string;
    }
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

async function requestText(path: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new ApiError(`Erro ${res.status}`);
  return res.text();
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

  submitCheckIn: (params: {
    requestedGoal: ClinicalGoal;
    recentFeelingText: string;
    situationNote?: string;
    energyLevel: 1 | 2 | 3 | 4 | 5;
    additionalNote?: string;
    contraindicationSelfReport?: boolean;
  }) => request<CheckInOutcome>("/checkin", { method: "POST", body: JSON.stringify(params) }),

  continueAfterAmbiguousCrisis: (checkInId: string) =>
    request<CheckInOutcome>(`/checkin/${checkInId}/continue`, { method: "POST" }),

  resolveCrisisClarification: (checkInId: string, resolution: "ESCALATE" | "DOWNGRADE") =>
    request<CheckInOutcome>(`/checkin/${checkInId}/clarify-crisis`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    }),

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
        sections: TemplateSection[];
        emphasizedAnchorPhrases: string[];
        closing: string;
        pace: string;
      };
    }>("/sessions", { method: "POST", body: JSON.stringify(params) }),

  getFounderProfile: () =>
    request<{
      name: string;
      credentials: string;
      licenseNumber: string;
      methodology: string[];
      academicCredentials: string[];
      clinicalCertifications: string[];
      experienceSummary: string;
      howItWorks: string;
    }>("/founder"),

  getPrivacyPolicyMarkdown: () => requestText("/legal/privacy-policy"),

  exportAccountData: () => request<Record<string, unknown>>("/account/export"),

  deleteAccountHistory: () => request<void>("/account/history", { method: "DELETE" }),

  deleteAccount: () => request<void>("/account", { method: "DELETE" }),
};

export { ApiError };
