export type PlantState = {
  streak: number; // panjang streak terakhir (hari berturut-turut)
  idle: number; // berapa hari sejak commit terakhir
  weekend: boolean; // ada commit di weekend dalam 7 hari terakhir
  lateNight: boolean; // ada push jam 01:00–04:59 dalam 7 hari terakhir
  total: number; // total kontribusi setahun terakhir
};

export type Stage = "Biji" | "Tunas" | "Tanaman kecil" | "Berbunga" | "Pohon";

export type Health = "segar" | "kuning" | "layu";

export function getStage(streak: number): Stage {
  if (streak < 3) return "Biji";
  if (streak < 7) return "Tunas";
  if (streak < 14) return "Tanaman kecil";
  if (streak < 30) return "Berbunga";
  return "Pohon";
}

export function getHealth(idle: number): Health {
  if (idle >= 7) return "layu";
  if (idle >= 3) return "kuning";
  return "segar";
}

export function getMessage(s: PlantState): string {
  if (s.total === 0) return "Halo, aku masih biji. Siram aku pakai commit pertamamu.";
  if (s.idle >= 30) return "Aku sudah jadi fosil. Masih ingat password GitHub-mu?";
  if (s.idle >= 7) return "Aku haus... kamu sibuk sama siapa sih?";
  if (s.idle >= 3) return "Daunku mulai kuning nih, commit dong.";
  if (s.streak < 3) return "Siram aku tiap hari ya, nanti aku tumbuh.";
  if (s.lateNight) return "Kita berdua kurang tidur ya.";
  if (s.weekend) return "Wah, bunga langka edisi weekend!";
  if (s.streak >= 30) return "Aku sudah jadi pohon. Bangga sama kamu.";
  return "Seger banget, makasih commit-nya!";
}

const DAY = 86_400_000;

/** Kode hari sesuai getUTCDay(): 0 = Minggu ... 6 = Sabtu. */
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Parse "sat,sun" jadi [0, 6]. Kode tak dikenal diabaikan; minimal satu hari harus tetap aktif. */
export function parseOffDays(raw: string | null | undefined): number[] {
  if (!raw) return [];
  const days = new Set<number>();
  for (const part of raw.toLowerCase().split(",")) {
    const i = DAY_KEYS.indexOf(part.trim().slice(0, 3) as (typeof DAY_KEYS)[number]);
    if (i >= 0) days.add(i);
  }
  return days.size >= 7 ? [] : [...days].sort();
}

export function formatOffDays(off: number[]): string {
  return off.map((d) => DAY_KEYS[d]).join(",");
}

/** Tanggal "hari ini" (YYYY-MM-DD) di zona waktu tertentu. */
export function todayIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / DAY);
}

function dayOfWeek(date: string): number {
  return new Date(date + "T00:00:00Z").getUTCDay();
}

export type ContributionDay = { date: string; contributionCount: number };

/**
 * Ubah kalender kontribusi GitHub jadi state tanaman (tanpa lateNight).
 * `off` = hari libur (0–6): kalau kosong tidak memutus streak dan tidak dihitung bolos,
 * kalau ada kontribusi tetap menambah streak.
 */
export function computeState(
  days: ContributionDay[],
  tz: string,
  off: number[] = [],
  now = new Date()
): Omit<PlantState, "lateNight"> {
  const today = todayIn(tz, now);
  const isOff = (date: string) => off.includes(dayOfWeek(date));
  const list = days
    .filter((d) => d.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const total = list.reduce((sum, d) => sum + d.contributionCount, 0);

  let last = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].contributionCount > 0) {
      last = i;
      break;
    }
  }
  if (last < 0) return { streak: 0, idle: 365, weekend: false, total };

  // Hari aktif (bukan hari libur) sejak kontribusi terakhir sampai hari ini.
  const lastTime = Date.parse(list[last].date + "T00:00:00Z");
  let idle = 0;
  for (let k = 1; k <= diffDays(today, list[last].date); k++) {
    const date = new Date(lastTime + k * DAY).toISOString().slice(0, 10);
    if (!isOff(date)) idle++;
  }

  let streak = 1;
  for (let i = last - 1; i >= 0; i--) {
    if (diffDays(list[i + 1].date, list[i].date) !== 1) break;
    if (list[i].contributionCount > 0) streak++;
    else if (!isOff(list[i].date)) break;
  }

  const weekend = list.some((d) => {
    if (d.contributionCount === 0 || diffDays(today, d.date) > 6) return false;
    const dow = dayOfWeek(d.date);
    return dow === 0 || dow === 6;
  });

  return { streak, idle, weekend, total };
}
