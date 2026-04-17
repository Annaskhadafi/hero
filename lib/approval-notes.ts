export type ApprovalNoteKind =
  | "comment"
  | "approved"
  | "rejected"
  | "needs_correction"
  | "system";

export type ApprovalNoteEntry = {
  at: string | null;
  kind: ApprovalNoteKind;
  actor: string;
  message: string;
};

function isApprovalNoteEntry(value: unknown): value is ApprovalNoteEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.kind === "string" &&
    typeof candidate.actor === "string" &&
    typeof candidate.message === "string" &&
    (typeof candidate.at === "string" || candidate.at === null)
  );
}

export function appendApprovalNoteEntry(
  existingValue: string,
  entry: Omit<ApprovalNoteEntry, "at"> & { at?: string | null },
) {
  const nextEntry: ApprovalNoteEntry = {
    at: entry.at ?? new Date().toISOString(),
    kind: entry.kind,
    actor: entry.actor.trim() || "System",
    message: entry.message.trim(),
  };

  if (!nextEntry.message) {
    return existingValue.trim();
  }

  const encodedEntry = JSON.stringify(nextEntry);
  return existingValue.trim() ? `${existingValue.trim()}\n${encodedEntry}` : encodedEntry;
}

export function parseApprovalNoteEntries(rawValue: string, fallbackActor = "System") {
  return rawValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap<ApprovalNoteEntry>((line) => {
      try {
        const parsed = JSON.parse(line) as unknown;
        if (isApprovalNoteEntry(parsed)) {
          return [
            {
              at: parsed.at,
              kind: parsed.kind,
              actor: parsed.actor,
              message: parsed.message,
            },
          ];
        }
      } catch {
        // Legacy plain-text note support.
      }

      return [
        {
          at: null,
          kind: "comment",
          actor: fallbackActor,
          message: line,
        },
      ];
    });
}
