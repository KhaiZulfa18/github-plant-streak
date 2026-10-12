"use client";

import { useEffect, useMemo, useState } from "react";
import { formatOffDays } from "@/lib/plant";

const STAGES = [
  { days: "0–2 hari", name: "Biji", streak: 1 },
  { days: "3–6 hari", name: "Tunas", streak: 4 },
  { days: "7–13 hari", name: "Tanaman kecil", streak: 9 },
  { days: "14–29 hari", name: "Berbunga", streak: 20 },
  { days: "30+ hari", name: "Pohon", streak: 40 },
];

// Urutan tampil Senin–Minggu; nilai sesuai getUTCDay() (0 = Minggu).
const DAYS = [
  { label: "Sen", value: 1 },
  { label: "Sel", value: 2 },
  { label: "Rab", value: 3 },
  { label: "Kam", value: 4 },
  { label: "Jum", value: 5 },
  { label: "Sab", value: 6 },
  { label: "Min", value: 0 },
];

export default function Home() {
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [off, setOff] = useState<number[]>([]);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    const t = setTimeout(() => setUsername(input.trim().replace(/^@/, "")), 600);
    return () => clearTimeout(t);
  }, [input]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (theme === "dark") params.set("theme", "dark");
    if (off.length) params.set("off", formatOffDays(off));
    const qs = params.toString().replace(/%2C/g, ",");
    return qs ? `?${qs}` : "";
  }, [theme, off]);

  function toggleOff(day: number) {
    setOff((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      return next.length >= 7 ? prev : next.sort();
    });
  }
  const imgPath = username ? `/api/plant/${encodeURIComponent(username)}${query}` : `/api/plant/demo?streak=20&weekend=1${theme === "dark" ? "&theme=dark" : ""}`;
  const snippet = useMemo(
    () => `![Tanaman GitHub saya](${origin}/api/plant/${username || "username-kamu"}${query})`,
    [origin, username, query]
  );

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
            Tanaman yang tumbuh dari commit-mu.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-moss-soft">
            Rajin commit, tanamannya berbunga. Bolos seminggu, dia layu dan ngambek di profil GitHub-mu,
            dilihat semua orang.
          </p>

          <label htmlFor="username" className="mt-10 block text-sm font-semibold">
            Username GitHub
          </label>
          <div className="mt-2 flex max-w-md items-center overflow-hidden rounded-2xl border-2 border-moss bg-white">
            <span className="pl-4 text-moss-soft">github.com/</span>
            <input
              id="username"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="torvalds"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent py-3 pr-4 text-lg outline-none"
            />
          </div>

          <div className="mt-4 flex gap-2" role="group" aria-label="Tema kartu">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                aria-pressed={theme === t}
                className={`rounded-full border-2 border-moss px-4 py-1.5 text-sm font-semibold ${
                  theme === t ? "bg-moss text-sage" : "bg-transparent"
                }`}
              >
                {t === "light" ? "Terang" : "Gelap"}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm font-semibold">Hari libur</p>
          <p className="text-sm text-moss-soft">Hari yang dipilih tidak memutus streak kalau kamu tidak commit.</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Hari libur">
            {DAYS.map((d) => (
              <button
                key={d.value}
                onClick={() => toggleOff(d.value)}
                aria-pressed={off.includes(d.value)}
                className={`rounded-full border-2 border-moss px-3 py-1 text-sm font-semibold ${
                  off.includes(d.value) ? "bg-moss text-sage" : "bg-transparent"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="mt-8 max-w-md">
            <p className="text-sm font-semibold">Tempel di README profilmu</p>
            <div className="mt-2 flex items-start gap-3 rounded-2xl bg-moss p-4 text-sage">
              <code className="min-w-0 flex-1 break-all text-sm leading-relaxed">{snippet}</code>
              <button
                onClick={copy}
                className="shrink-0 rounded-lg bg-sun px-3 py-1.5 text-sm font-semibold text-moss"
              >
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={imgPath}
            src={imgPath}
            alt={username ? `Tanaman GitHub milik ${username}` : "Contoh tanaman GitHub"}
            width={400}
            height={440}
            className="w-full max-w-[400px]"
          />
        </div>
      </section>

      <section className="mt-24">
        <h2 className="text-3xl font-extrabold tracking-tight">Siklus hidupnya</h2>
        <p className="mt-2 text-moss-soft">
          Tahap ditentukan dari streak terakhirmu. Bolos 3 hari daunnya menguning, 7 hari langsung layu.
        </p>
        <ol className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {STAGES.map((s) => (
            <li key={s.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/plant/demo?streak=${s.streak}`} alt={`Tahap ${s.name}`} className="w-full" loading="lazy" />
              <p className="mt-3 font-semibold">{s.name}</p>
              <p className="text-sm text-moss-soft">{s.days}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
