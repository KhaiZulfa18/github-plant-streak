import { GitHubError, getPlantState } from "@/lib/github";
import { parseOffDays, type PlantState } from "@/lib/plant";
import { renderErrorSvg, renderPlantSvg, type Theme } from "@/lib/svg";

const USERNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

function validTz(tz: string | null): string {
  const fallback = process.env.DEFAULT_TZ || "Asia/Jakarta";
  if (!tz) return fallback;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return fallback;
  }
}

function svgResponse(body: string, maxAge: number, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    },
  });
}

/** Mode demo: /api/plant/demo?streak=12&idle=0&weekend=1&late=1 */
function demoState(params: URLSearchParams): PlantState {
  const num = (k: string, d: number) => Math.max(0, Math.min(999, Number(params.get(k) ?? d) || 0));
  return {
    streak: num("streak", 12),
    idle: num("idle", 0),
    weekend: params.get("weekend") === "1",
    lateNight: params.get("late") === "1",
    total: 1,
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = await params;
  const username = raw.replace(/\.svg$/i, "");
  const search = new URL(req.url).searchParams;
  const theme: Theme = search.get("theme") === "dark" ? "dark" : "light";

  if (username.toLowerCase() === "demo") {
    return svgResponse(renderPlantSvg("demo", demoState(search), theme), 0);
  }

  if (!USERNAME.test(username)) {
    return svgResponse(renderErrorSvg("Username GitHub tidak valid", theme), 300, 400);
  }

  try {
    const state = await getPlantState(username, validTz(search.get("tz")), parseOffDays(search.get("off")));
    return svgResponse(renderPlantSvg(username, state, theme), 3600);
  } catch (err) {
    const status = err instanceof GitHubError ? err.status : 500;
    const message = status === 404 ? "User tidak ditemukan" : "Gagal mengambil data GitHub";
    console.error(err);
    return svgResponse(renderErrorSvg(message, theme), 300, status);
  }
}
