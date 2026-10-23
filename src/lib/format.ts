// Pure Turkish date helpers for the UI.
import { dayKey } from './streak.ts';

/** "az önce", "12 dk önce", "3 sa önce", "dün", "4 gün önce", then "12 Eki". */
export function relativeTime(ms: number, now: number): string {
  const minutes = Math.floor((now - ms) / 60_000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  if (dayKey(ms) === dayKey(now)) return `${Math.floor(minutes / 60)} sa önce`;
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / 86_400_000);
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  return new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 5) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}
