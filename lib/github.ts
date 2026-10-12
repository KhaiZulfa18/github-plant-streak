import { cached } from "./cache";
import { computeState, formatOffDays, type ContributionDay, type PlantState } from "./plant";

const TTL = 60 * 60 * 1000; // 1 jam

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function headers(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new GitHubError("GITHUB_TOKEN belum diisi", 500);
  return {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "github-plant",
  };
}

const QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`;

async function fetchCalendar(login: string): Promise<ContributionDay[]> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query: QUERY, variables: { login } }),
    cache: "no-store",
  });
  if (!res.ok) throw new GitHubError(`GitHub API error ${res.status}`, 502);
  const json = await res.json();
  const user = json?.data?.user;
  if (!user) throw new GitHubError("User tidak ditemukan", 404);
  const weeks: { contributionDays: ContributionDay[] }[] =
    user.contributionsCollection.contributionCalendar.weeks;
  return weeks.flatMap((w) => w.contributionDays);
}

type GitHubEvent = { type: string; created_at: string };

/** Cek apakah ada push antara jam 01:00–04:59 (zona waktu tz) dalam 7 hari terakhir. */
async function fetchLateNight(login: string, tz: string): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(login)}/events/public?per_page=100`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) return false; // fitur bonus, jangan bikin gagal total
  const events: GitHubEvent[] = await res.json();
  const weekAgo = Date.now() - 7 * 86_400_000;
  const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" });
  return events.some((e) => {
    if (e.type !== "PushEvent") return false;
    const t = new Date(e.created_at);
    if (t.getTime() < weekAgo) return false;
    const hour = Number(hourFmt.format(t));
    return hour >= 1 && hour <= 4;
  });
}

export async function getPlantState(login: string, tz: string, off: number[] = []): Promise<PlantState> {
  return cached(`${login.toLowerCase()}:${tz}:${formatOffDays(off)}`, TTL, async () => {
    const [days, lateNight] = await Promise.all([fetchCalendar(login), fetchLateNight(login, tz)]);
    return { ...computeState(days, tz, off), lateNight };
  });
}
