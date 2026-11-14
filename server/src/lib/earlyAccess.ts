/** Early-access interest for features that are still locked. Keep the copy in sync with app/tools/[tool].tsx. */

export const IDEA_MAX = 500;

export type EarlyFeature = {
  key: string;
  aliases: string[];
  tab: string;
  title: string;
  options: string[];
};

export const EARLY_FEATURES: EarlyFeature[] = [
  {
    key: "ai-trainer",
    aliases: ["ai-trainer"],
    tab: "AI Trainer",
    title: "AI Trainer",
    options: ["Custom workout plans", "Progress insights", "Daily nudges"],
  },
  {
    key: "workout-buddy",
    aliases: ["workout-buddy", "buddy-program"],
    tab: "Workout Buddy",
    title: "Be a Workout Buddy",
    options: ["Find partners nearby", "Same gym and time", "Streaks together"],
  },
  {
    key: "meal-scan",
    aliases: ["meal-scan"],
    tab: "Meal Scan",
    title: "Meal Scan",
    options: ["Calories and macros", "Meal history", "Goal-based advice"],
  },
  {
    key: "trainer-program",
    aliases: ["trainer-program", "find-trainer"],
    tab: "Become a Trainer",
    title: "Become a Trainer",
    options: ["Set my own price", "Get booked by members", "Weekly payouts"],
  },
];

export type StoredVote = { choices: string[]; idea: string };

export type FeedbackRow = {
  userId: string;
  featureName: string;
  comment: string;
  createdAt: Date | string;
};

export type MemberEntry = {
  featureKey: string;
  spot: number;
  choices: string[];
  idea: string;
  ideasShared: number;
  submittedAt: string | null;
};

export function canonicalFeature(name: string): string | null {
  const raw = name.trim().toLowerCase();
  if (!raw) return null;
  for (const feature of EARLY_FEATURES) {
    if (feature.key === raw || feature.aliases.includes(raw)) return feature.key;
  }
  return null;
}

export function featureByKey(key: string): EarlyFeature | undefined {
  return EARLY_FEATURES.find((feature) => feature.key === key);
}

export function featureLabel(name: string): string {
  const key = canonicalFeature(name);
  return featureByKey(key ?? "")?.tab ?? name.trim();
}

export function parseVote(comment: string | null | undefined): StoredVote {
  if (!comment) return { choices: [], idea: "" };
  try {
    const data = JSON.parse(comment) as { choices?: unknown; idea?: unknown };
    if (data && typeof data === "object") {
      const choices = Array.isArray(data.choices)
        ? data.choices.filter((choice): choice is string => typeof choice === "string")
        : [];
      const idea = typeof data.idea === "string" ? data.idea : "";
      if (choices.length > 0 || idea || Array.isArray(data.choices)) {
        return { choices, idea };
      }
    }
  } catch {
    // Older rows stored a plain sentence.
  }
  return { choices: [], idea: comment };
}

export function ideasShared(choices: string[], idea: string): number {
  return choices.length + (idea.trim() ? 1 : 0);
}

function timeOf(value: Date | string): number {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** 1-based place of this user's first vote among distinct people. */
export function spotForUser(rows: { userId: string; createdAt: Date | string }[], userId: string): number | null {
  const first = new Map<string, number>();
  for (const row of rows) {
    const time = timeOf(row.createdAt);
    const previous = first.get(row.userId);
    if (previous == null || time < previous) first.set(row.userId, time);
  }
  const mine = first.get(userId);
  if (mine == null) return null;
  let ahead = 0;
  for (const time of first.values()) {
    if (time < mine) ahead += 1;
  }
  return ahead + 1;
}

export function memberEntries(rows: FeedbackRow[], userId: string): MemberEntry[] {
  const entries: MemberEntry[] = [];
  for (const feature of EARLY_FEATURES) {
    const group = rows.filter((row) => canonicalFeature(row.featureName) === feature.key);
    const spot = spotForUser(group, userId);
    if (spot == null) continue;
    const mine = group
      .filter((row) => row.userId === userId)
      .sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt));
    const latest = mine[mine.length - 1];
    const vote = parseVote(latest?.comment);
    entries.push({
      featureKey: feature.key,
      spot,
      choices: vote.choices,
      idea: vote.idea,
      ideasShared: ideasShared(vote.choices, vote.idea),
      submittedAt: latest ? new Date(timeOf(latest.createdAt)).toISOString() : null,
    });
  }
  return entries;
}

export type NormalizedVote = {
  featureKey: string;
  storedName: string;
  choices: string[];
  idea: string;
  comment: string;
};

export function normalizeVote(body: unknown): { ok: true; vote: NormalizedVote } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Pick what you'd love, or add your own idea." };
  }
  const raw = body as Record<string, unknown>;
  const featureName = typeof raw.featureName === "string" ? raw.featureName.trim() : "";
  if (!featureName || featureName.length > 80) {
    return { ok: false, message: "Choose a feature." };
  }

  const sentChoices = Array.isArray(raw.choices);
  const sentIdea = typeof raw.idea === "string";
  const legacy = typeof raw.comment === "string" ? raw.comment.trim() : "";
  const canonical = canonicalFeature(featureName);

  if (sentChoices || sentIdea) {
    if (!canonical) return { ok: false, message: "Choose a feature." };
    const feature = featureByKey(canonical);
    if (!feature) return { ok: false, message: "Choose a feature." };
    const choices: string[] = [];
    const incoming = sentChoices ? (raw.choices as unknown[]) : [];
    for (const choice of incoming) {
      if (typeof choice !== "string") return { ok: false, message: "Pick from the listed options." };
      const label = choice.trim();
      if (!feature.options.includes(label)) return { ok: false, message: "Pick from the listed options." };
      if (!choices.includes(label)) choices.push(label);
    }
    const idea = sentIdea ? (raw.idea as string).trim() : "";
    if (idea.length > IDEA_MAX) return { ok: false, message: "Keep your idea under 500 characters." };
    if (choices.length === 0 && !idea) {
      return { ok: false, message: "Pick what you'd love, or add your own idea." };
    }
    return {
      ok: true,
      vote: {
        featureKey: canonical,
        storedName: canonical,
        choices,
        idea,
        comment: JSON.stringify({ v: 1, choices, idea }),
      },
    };
  }

  if (!legacy) return { ok: false, message: "Pick what you'd love, or add your own idea." };
  const idea = legacy.slice(0, IDEA_MAX);
  const storedName = canonical ?? featureName.slice(0, 80);
  return {
    ok: true,
    vote: {
      featureKey: storedName,
      storedName,
      choices: [],
      idea,
      comment: JSON.stringify({ v: 1, choices: [], idea }),
    },
  };
}
