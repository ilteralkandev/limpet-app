// Pure daily-streak logic: consecutive local days on which the app was opened.

export type Streak = {
  current: number;
  best: number;
  /** Local calendar day (YYYY-MM-DD) of the last visit. */
  lastDay: string | null;
};

export const INITIAL_STREAK: Streak = { current: 0, best: 0, lastDay: null };

export function dayKey(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(from: string, to: string): number {
  const utc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function recordVisit(streak: Streak, now: number): Streak {
  const today = dayKey(now);
  if (streak.lastDay === today) return streak;
  const gap = streak.lastDay ? daysBetween(streak.lastDay, today) : Infinity;
  const current = gap === 1 ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastDay: today };
}
