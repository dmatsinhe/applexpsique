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

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const AUTH_TOKEN_STORAGE_KEY = "cuidamente-auth-token";

/**
 * Persistido em localStorage para a sessão sobreviver a recarregar a
 * página — sem isto, qualquer refresh perdia o login e a única forma de
 * voltar a entrar era o ecrã de registo (que rejeita um email já usado).
 */
let authToken: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof localStorage === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

export function hasStoredAuthToken(): boolean {
  return authToken !== null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? `Erro ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function requestText(path: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new ApiError(`Erro ${res.status}`, res.status);
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

  createCheckoutSession: (params: { market: "PT" | "BR"; cadence: "monthly" | "annual" }) =>
    request<{ url: string }>("/billing/checkout-session", { method: "POST", body: JSON.stringify(params) }),

  createBillingPortalSession: () =>
    request<{ url: string }>("/billing/portal-session", { method: "POST" }),

  getPaymentContacts: () =>
    request<{
      paypalEmail: string;
      mpesaNumber: string;
      emolaNumber: string;
      prices: { monthly: string; annual: string };
    }>("/billing/payment-contacts"),

  submitManualPaymentRequest: (params: {
    method: "PAYPAL" | "MPESA" | "EMOLA";
    cadence: "monthly" | "annual";
    reference: string;
  }) =>
    request<{ id: string; status: string }>("/billing/manual-payment-requests", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getPlanStatus: () =>
    request<{
      plan: "FREE" | "PREMIUM";
      subscriptionStatus: string | null;
      planRenewsAt: string | null;
      daysRemaining: number | null;
      expiringWithinDays: boolean;
    }>("/billing/plan-status"),

  exportAccountData: () => request<Record<string, unknown>>("/account/export"),

  deleteAccountHistory: () => request<void>("/account/history", { method: "DELETE" }),

  deleteAccount: () => request<void>("/account", { method: "DELETE" }),
};

export { ApiError };
