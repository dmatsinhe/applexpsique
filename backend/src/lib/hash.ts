import { createHash } from "node:crypto";

// One-way hash for crisis audit records — see docs/database-schema.md
// (crisis_events): we deliberately never store the raw text, only enough
// to deduplicate/audit classifier firings.
export function hashForAudit(text: string): string {
  return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}
