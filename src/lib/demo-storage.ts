import type { AppData } from "./types";
import { seedData } from "./seed";

export const DATA_KEY = "silverarrows-data-v2";
export const USER_KEY = "silverarrows-user";

/** Missing collections are migrated, while unreadable snapshots fall back to demo data. */
export function restoreDemoData(raw: string | null): AppData {
  const defaults = seedData();
  if (!raw) return defaults;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaults;
    const stored = parsed as Record<string, unknown>;
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof AppData)[]) {
      const value = stored[key];
      if (value === undefined) continue;
      if (key === "readNotificationIds") {
        if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
        if (!Object.values(value).every((ids) => Array.isArray(ids) && ids.every((id) => typeof id === "string"))) return defaults;
      } else if (!Array.isArray(value) || !value.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
        return defaults;
      }
      Object.assign(result, { [key]: value });
    }
    if (!result.users.every((u) => typeof u.id === "string" && typeof u.name === "string" && typeof u.email === "string" && ["admin", "instructor", "ground", "student"].includes(u.role))) return defaults;
    result.learningRecords = result.learningRecords.filter((r) =>
      typeof r.userId === "string" && typeof r.chapterId === "string" &&
      typeof r.completed === "boolean" && typeof r.bookmarked === "boolean" && typeof r.notes === "string" &&
      r.answers && typeof r.answers === "object" && !Array.isArray(r.answers) && Object.values(r.answers).every((answer) => typeof answer === "string"),
    );
    return result;
  } catch {
    return defaults;
  }
}

/** Storage can be denied or full. Keep the current session usable in memory. */
export function safelyPersist(key: string, value: string | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}