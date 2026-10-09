import { getHealth, getMessage, getStage, type PlantState } from "./plant";

export type Theme = "light" | "dark";

const THEMES = {
  light: { bg: "#F4F8EF", border: "#D5E2CB", text: "#22331C", muted: "#5E6E57", pill: "#E2EED8" },
  dark: { bg: "#16201A", border: "#2C3B30", text: "#E4EEDD", muted: "#9AAE95", pill: "#24332A" },
} as const;

const W = 400;
const H = 440;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function leaf(x: number, y: number, angle: number, scale: number, color: string): string {
  return `<ellipse cx="${11 * scale}" cy="0" rx="${11 * scale}" ry="${4.5 * scale}" fill="${color}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle})"/>`;
}

function flower(x: number, y: number, color: string, r = 6): string {
  let petals = "";
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 * Math.PI) / 180;
    petals += `<circle cx="${(x + Math.cos(a) * r * 1.15).toFixed(1)}" cy="${(y + Math.sin(a) * r * 1.15).toFixed(1)}" r="${r}" fill="${color}"/>`;
  }
  return petals + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r * 0.75}" fill="#F2C94C"/>`;
}

/** Gambar tanaman + pot di kanvas 380x300 (pot di bawah, pangkal batang di 190,232). */
function drawPlant(s: PlantState): string {
  const stage = getStage(s.streak);
  const health = getHealth(s.idle);
  const leafColor = health === "layu" ? "#A68A4E" : health === "kuning" ? "#C9B13E" : "#4E9A3A";
  const stemColor = health === "layu" ? "#8A7240" : "#3E7A2E";
  const lean = health === "layu" ? 34 : health === "kuning" ? 10 : 0;
  const droop = health === "layu" ? 55 : health === "kuning" ? 20 : 0;
  const flowerColor = s.weekend ? "#8E6BD8" : "#E86A92";

  const cfg = {
    Biji: { leaves: 0, height: 0, scale: 1 },
    Tunas: { leaves: 2, height: 30, scale: 0.8 },
    "Tanaman kecil": { leaves: 4, height: 70, scale: 1 },
    Berbunga: { leaves: 6, height: 105, scale: 1 },
    Pohon: { leaves: 0, height: 130, scale: 1 },
  }[stage];

  const bx = 190;
  const by = 232;
  const point = (t: number): [number, number] => [bx + lean * t * t, by - cfg.height * t];
  const [tx, ty] = point(1);
  const stemPath = `M${bx} ${by} Q${bx} ${by - cfg.height * 0.5} ${tx} ${ty}`;

  let plant = "";
  if (stage === "Biji") {
    plant += `<ellipse cx="190" cy="228" rx="7" ry="5" fill="#7A5230"/>`;
  } else if (stage === "Pohon") {
    plant += `<path d="${stemPath}" fill="none" stroke="#6B4A2B" stroke-width="12" stroke-linecap="round"/>`;
    const canopy: [number, number, number][] =
      health === "layu"
        ? [[0, 0, 26]]
        : [[0, -10, 36], [-34, 8, 28], [34, 8, 28], [-16, -34, 24], [18, -32, 24], [0, 18, 26]];
    for (const [dx, dy, r] of canopy) plant += `<circle cx="${tx + dx}" cy="${ty + dy}" r="${r}" fill="${leafColor}"/>`;
    if (health === "segar") {
      for (const [dx, dy] of [[-30, 0], [24, -24], [8, 16], [-12, -36], [36, 14]]) {
        plant += flower(tx + dx, ty + dy, flowerColor, 4);
      }
    }
  } else {
    plant += `<path d="${stemPath}" fill="none" stroke="${stemColor}" stroke-width="4" stroke-linecap="round"/>`;
    for (let i = 0; i < cfg.leaves; i++) {
      const t = (i + 1) / (cfg.leaves + 1);
      const [x, y] = point(t);
      const right = i % 2 === 0;
      plant += leaf(x, y, right ? -25 + droop : 205 - droop, cfg.scale * (1.2 - t * 0.3), leafColor);
    }
    if (stage === "Berbunga") {
      plant += health === "layu" ? `<circle cx="${tx}" cy="${ty + 4}" r="5" fill="#8A6A4A"/>` : flower(tx, ty, flowerColor);
    } else {
      plant += leaf(tx, ty, -80 + droop, cfg.scale * 0.8, leafColor);
    }
  }

  const mouth = health === "segar" ? "M180 276 Q190 284 200 276" : "M180 281 Q190 273 200 281";
  let face =
    `<circle cx="177" cy="264" r="3.5" fill="#3A2416"/><circle cx="203" cy="264" r="3.5" fill="#3A2416"/>` +
    `<path d="${mouth}" fill="none" stroke="#3A2416" stroke-width="2.5" stroke-linecap="round"/>`;
  if (s.lateNight) {
    face += `<path d="M171 270 Q177 274 183 270 M197 270 Q203 274 209 270" fill="none" stroke="#6E4A8A" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (health === "layu") face += `<path d="M211 262 q3 6 0 9 q-3 -3 0 -9" fill="#5DA9E9"/>`;

  const pot =
    `<polygon points="142,244 238,244 228,292 152,292" fill="#C66B3D"/>` +
    `<rect x="134" y="232" width="112" height="14" rx="4" fill="#B25A2F"/>`;

  const sway = health === "segar" && stage !== "Biji" ? ` class="sway"` : "";
  return `<g${sway}>${plant}</g>${pot}${face}`;
}

function lastCommitLabel(idle: number, total: number): string {
  if (total === 0) return "Belum pernah commit";
  if (idle === 0) return "Commit terakhir hari ini";
  if (idle === 1) return "Commit terakhir kemarin";
  if (idle >= 365) return "Commit terakhir lama banget";
  return `Commit terakhir ${idle} hari lalu`;
}

export function renderPlantSvg(username: string, s: PlantState, theme: Theme = "light"): string {
  const c = THEMES[theme];
  const stage = getStage(s.streak);
  const health = getHealth(s.idle);
  const stageLabel = health === "layu" ? `${stage} (layu)` : stage;
  const pillWidth = Math.round(stageLabel.length * 7.4 + 24);
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tanaman GitHub milik ${esc(username)}: ${esc(stageLabel)}">
<title>Tanaman GitHub @${esc(username)}</title>
<style>
.sway{transform-origin:190px 232px;transform-box:view-box;animation:sway 4s ease-in-out infinite}
@keyframes sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@media (prefers-reduced-motion:reduce){.sway{animation:none}}
text{font-family:${font}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${c.bg}" stroke="${c.border}"/>
<text x="24" y="40" font-size="17" font-weight="600" fill="${c.text}">@${esc(username)}</text>
<rect x="${W - 24 - pillWidth}" y="22" width="${pillWidth}" height="26" rx="13" fill="${c.pill}"/>
<text x="${W - 24 - pillWidth / 2}" y="40" font-size="13" font-weight="600" fill="${c.text}" text-anchor="middle">${esc(stageLabel)}</text>
<g transform="translate(10 62)">${drawPlant(s)}</g>
<text x="${W / 2}" y="388" font-size="14" fill="${c.text}" text-anchor="middle">${esc(getMessage(s))}</text>
<text x="${W / 2}" y="414" font-size="12" fill="${c.muted}" text-anchor="middle">Streak ${s.streak} hari  |  ${lastCommitLabel(s.idle, s.total)}</text>
</svg>`;
}

export function renderErrorSvg(message: string, theme: Theme = "light"): string {
  const c = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="120" viewBox="0 0 ${W} 120">
<rect x="0.5" y="0.5" width="${W - 1}" height="119" rx="16" fill="${c.bg}" stroke="${c.border}"/>
<text x="${W / 2}" y="56" font-family="sans-serif" font-size="15" font-weight="600" fill="${c.text}" text-anchor="middle">Tanamannya belum bisa tumbuh</text>
<text x="${W / 2}" y="80" font-family="sans-serif" font-size="13" fill="${c.muted}" text-anchor="middle">${esc(message)}</text>
</svg>`;
}
