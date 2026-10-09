# GitHub Plant

Tanaman virtual yang tumbuh dari commit GitHub kamu, dirender sebagai SVG dinamis
yang bisa ditempel di README profil.

## Aturan main

| Kondisi | Efek |
| --- | --- |
| Streak 0–2 / 3–6 / 7–13 / 14–29 / 30+ hari | Biji / Tunas / Tanaman kecil / Berbunga / Pohon |
| Bolos 3–6 hari | Daun menguning, wajah pot cemberut |
| Bolos 7+ hari | Layu, batang miring, pot menangis |
| Commit di weekend (7 hari terakhir) | Bunga ungu langka |
| Push jam 01:00–04:59 (7 hari terakhir) | Pot punya kantung mata |

Tahap dihitung dari streak terakhir, jadi pohon yang ditinggal tetap pohon, cuma layu.

## Struktur

```
app/page.tsx                    Landing page: input username, preview, salin snippet
app/api/plant/[username]/route.ts  Endpoint SVG (cache 1 jam)
lib/github.ts                   GraphQL contributionCalendar + REST events (jam 3 pagi)
lib/plant.ts                    Logika streak, tahap, kesehatan, pesan
lib/svg.ts                      Renderer SVG kartu (tema terang/gelap)
lib/cache.ts                    Cache in-memory sederhana
```

## Jalankan lokal

```bash
npm install
cp .env.example .env.local   # isi GITHUB_TOKEN
npm run dev
```

Token cukup classic PAT tanpa scope (hanya membaca data publik).

## Endpoint

- `/api/plant/<username>` kartu tanaman
- `?theme=dark` tema gelap
- `?tz=Asia/Jakarta` zona waktu untuk "hari ini" dan deteksi jam 3 pagi
- `/api/plant/demo?streak=20&idle=0&weekend=1&late=1` mode demo tanpa token

## Tempel di README profil

```md
![Tanaman GitHub saya](https://domain-kamu.vercel.app/api/plant/username-kamu)
```

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import di Vercel, tambahkan env `GITHUB_TOKEN` (opsional `DEFAULT_TZ`).
3. Deploy. Header `s-maxage=3600` membuat kartu di-cache di edge selama 1 jam.

## Ide lanjutan

- Kebun bersama: satu halaman berisi tanaman beberapa teman sekaligus.
- Musim: daun gugur di bulan tertentu, bersalju di Desember.
- Hama: muncul ulat kalau ada PR yang terbuka lebih dari 30 hari.
- GitHub Action yang menyimpan snapshot SVG harian, jadi tidak perlu hosting.
