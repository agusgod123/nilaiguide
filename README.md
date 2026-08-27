# Aplikasi Penilaian Guide Kawasan Besakih

PWA **offline-first** untuk staff lapangan menilai guide pada tiga pos pemeriksaan
(**Uniform**, **ID-Card**, **Etika**). Tanpa login, data tersimpan di perangkat, dan
terkirim otomatis ke server begitu ada koneksi.

Penilaian mengikuti cara tim selama ini: **Uniform** dan **ID-Card** bernilai
**1 (sesuai)** atau **0 (tidak sesuai)**, sedangkan **Etika** diisi angka
**−5 sampai +5** (0 = biasa saja). Hasilnya otomatis dirangkum ke tab rekap
bulanan berformat sama seperti berkas *NILAI REWARD* yang biasa dipakai.

> **Kolom REVIEW tetap ada di spreadsheet, tapi tidak lagi diisi lewat
> aplikasi.** Tim mengetiknya langsung di tab rekap; angka itu dibaca dan
> ditulis kembali setiap kali rekap disusun ulang, jadi tidak pernah hilang.

Dibangun sesuai [`docs/PRD-APLIKASI.md`](docs/PRD-APLIKASI.md) (menggantikan
`PRD_Guide_Evaluation_App.md`; penomoran §4.1/§4.4/§5/§7/§8/§9/§10 dan
AC-1…AC-8 dipertahankan agar rujukan di dalam kode tetap sahih).

## Dokumentasi

Penunjuk arahnya ada di **[`docs/README.md`](docs/README.md)** — buka itu dulu
kalau bingung harus baca yang mana.

| Berkas | Untuk siapa | Isinya |
| --- | --- | --- |
| [`docs/PANDUAN-PEMAKAIAN.md`](docs/PANDUAN-PEMAKAIAN.md) | **Staff & admin** | Panduan langkah demi langkah dengan bahasa sederhana — memasang aplikasi, menilai guide, melihat data di aplikasi maupun di spreadsheet, dan penanganan masalah |
| [`docs/PRD-APLIKASI.md`](docs/PRD-APLIKASI.md) | Pengembang | Spesifikasi lengkap untuk membangun ulang dari nol: kebutuhan fungsional, model data, kontrak API, 23 kriteria penerimaan, risiko, dan alasan tiap keputusan desain |
| [`docs/ALUR-APLIKASI.md`](docs/ALUR-APLIKASI.md) | Pengembang | 13 diagram alur: arsitektur, sinkronisasi, sisi server, penyusunan rekap, penyimpanan, service worker |

### Versi PDF (untuk dicetak atau dibagikan)

PDF **tidak disimpan di repo** — ia hasil olahan yang cepat basi dan berat di
riwayat git. Bangun sendiri saat butuh, mis. ketika panduan mau dikirim ke staf
lewat WhatsApp:

```bash
npm install
npm run docs:pdf
```

Perintah itu mengubah Markdown menjadi HTML (diagram Mermaid ikut dirender),
lalu mencetaknya lewat **Chrome headless** yang sudah terpasang di komputer, dan
menaruh hasilnya di `docs/`. Kalau Chrome ada di lokasi tidak lazim, setel
`CHROME_PATH`. Untuk satu dokumen saja:
`node docs/buat-pdf.mjs PANDUAN-PEMAKAIAN.md`.

> `marked` dan `mermaid` ada di `devDependencies` **hanya** untuk keperluan
> pembuatan PDF ini. Aplikasi yang dipasang di perangkat staff tetap tanpa
> dependensi apa pun.

---

## Menjalankan

```bash
node server/server.js
```

Buka `http://localhost:3000`. Server juga mencetak alamat jaringan lokal
(mis. `http://192.168.1.10:3000`) — pakai alamat itu di tablet/HP staff yang
terhubung Wi-Fi yang sama.

Tidak ada dependensi produksi. Cukup Node.js ≥ 18.

### Install sebagai aplikasi (PWA)

- **Android / Chrome** — menu ⋮ → *Add to Home screen* / *Install app*
- **iOS / Safari** — tombol Share → *Add to Home Screen*

Setelah ter-install, aplikasi berjalan penuh tanpa jaringan.

> **Catatan produksi:** service worker dan Web Crypto hanya aktif pada `localhost`
> atau **HTTPS**. Untuk penggunaan di lapangan lewat alamat IP, pasang sertifikat
> (mis. reverse proxy Caddy/nginx) agar PWA dapat di-install.

---

## Deploy

### 1. PWA → Vercel (gratis, HTTPS)

Repo berisi `vercel.json`. Di [vercel.com](https://vercel.com): **Add New →
Project → Import** repo ini, lalu:

| Pengaturan | Nilai |
| --- | --- |
| Framework Preset | **Other** |
| Build Command | **kosong** (nyalakan *Override*, biarkan kosong) |
| Output Directory | `public` — sudah diatur `vercel.json` |
| Install Command | kosong — sudah diatur `vercel.json` |

Framework Preset "Other" memang otomatis menyajikan folder `public/` bila ada,
tapi `vercel.json` menuliskannya eksplisit supaya tidak bergantung pada
pengaturan dashboard yang bisa berubah.

Tiap push ke `main` men-deploy ulang sendiri. HTTPS otomatis, jadi service
worker dan Web Crypto aktif — aplikasinya bisa di-install sebagai PWA.

**Kenapa ada aturan `Cache-Control` di `vercel.json`:** `sw.js`, `index.html`,
`config.js`, dan `manifest.webmanifest` diberi `max-age=0, must-revalidate`.
Tanpa itu, CDN bisa menyajikan service worker versi lama dan pembaruan aplikasi
tidak akan pernah sampai ke HP staff — bug yang paling sulit dilacak, karena
kodenya sudah benar dan yang salah hanya cache.

**Panduan lengkap langkah demi langkah** (termasuk membuat spreadsheet baru dan
memindahkan HP staff): [`PANDUAN-DEPLOY.md`](PANDUAN-DEPLOY.md).

### 2a. Backend → Google Spreadsheet (gratis, **disarankan**)

Spreadsheet jadi database, Apps Script jadi endpoint REST-nya. Data persisten,
dan rekapnya langsung bisa di-PivotTable untuk laporan.

1. Buat spreadsheet baru → **Extensions → Apps Script**
2. Jalankan `npm run build:gas`, tempel isi `server-gas/Code.gs` hasilnya, simpan
   (atau `clasp push` untuk mengirim ke-11 berkas apa adanya)
3. Jalankan fungsi `setup` → tab `Guides`, `Evaluations`, `Petunjuk` dibuat otomatis
   beserta data guide awal
4. **Deploy → New deployment → Web app** — *Execute as*: **Me**, *Who has access*: **Anyone**
5. Salin URL `/exec`, isikan ke `serverUrl` pada `public/config.js`, lalu commit

Aplikasi mendeteksi jenis backend dari URL secara otomatis: `script.google.com`
→ mode Apps Script (query parameter + `Content-Type: text/plain` agar lolos CORS),
selain itu → mode REST biasa.

> **Alamat server tertanam di `public/config.js`** supaya aplikasi siap pakai di
> perangkat mana pun tanpa pengaturan manual. Konsekuensinya: karena repo ini publik,
> alamat tersebut dapat dibaca siapa saja dan pihak luar bisa mengirim baris palsu ke
> spreadsheet. Data tidak bisa dibaca atau dihapus dari luar (append-only).
> Untuk mencabut: arsipkan deployment lama di Apps Script, buat yang baru, lalu
> perbarui `config.js`.

Batasan dan alasan memilih spreadsheet sebagai backend: lihat `docs/PRD-APLIKASI.md` §13 dan §16.

### 2b. Backend sendiri (opsional)

`server/server.js` adalah backend REST tanpa dependensi — dipakai rangkaian uji
aplikasi, dan bisa dijalankan sungguhan bila suatu saat spreadsheet tidak lagi
memadai. Jalankan di mana saja yang bisa menjalankan Node ≥ 18, lalu isi
alamatnya di `public/config.js`:

```js
window.APP_CONFIG = { serverUrl: 'https://alamat-backend-anda' };
```

Commit ulang → Vercel otomatis men-deploy dengan alamat server tersebut. Staff
juga bisa menimpanya kapan saja lewat menu **Pengaturan** tanpa mengubah kode.

> Endpoint pembacaan penilaian **mati** kecuali server dijalankan dengan
> `ADMIN_TOKEN=...`. Itu disengaja — lihat bagian API di bawah.

### Selama backend belum ada

Aplikasi tetap berfungsi 100%: penilaian tersimpan dan terenkripsi di perangkat,
menunggu di antrean, dan layar **Pengaturan** menampilkan peringatan bahwa alamat
server belum diisi. Begitu alamat diisi, seluruh antrean terkirim otomatis.

---

## Struktur

```
app/
├─ server/
│  ├─ server.js        REST API + static server (zero dependency)
│  ├─ storage.js       SQLite (node:sqlite) dengan fallback file JSON
│  └─ data/            Database (dibuat otomatis, tidak di-commit)
├─ public/             Yang di-install ke perangkat
│  ├─ index.html       Semua layar (SPA)
│  ├─ guides.json      Master data guide (dibaca aplikasi DAN server)
│  ├─ config.js        Alamat backend (untuk deploy statis)
│  ├─ css/styles.css   Desain large-tap, kontras tinggi
│  ├─ js/db.js         IndexedDB + enkripsi AES-256-GCM + backup
│  ├─ js/sync.js       Antrean sync, deteksi jaringan, exponential backoff
│  ├─ js/app.js        Kontroler UI
│  ├─ sw.js            Service worker (cache-first app shell)
│  ├─ manifest.webmanifest
│  └─ icons/
├─ server-gas/
│  ├─ 00_Konstanta.gs … 10_Trigger.gs
│  │                   Backend Google Apps Script, 11 modul (Code.gs = turunan)
│  ├─ gabung.mjs       Sambung modul → Code.gs untuk tempel manual
│  └─ test-gas.mjs     148 pemeriksaan logika backend di luar Google
├─ test/
│  └─ app.test.mjs     144 pemeriksaan otomatis (jsdom + fake-indexeddb)
├─ vercel.json         Konfigurasi deploy statis + header cache
└─ PANDUAN-DEPLOY.md   Langkah demi langkah deploy dari nol
```

---

## API

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `GET`  | `/api/health` | Cek server hidup + jumlah data |
| `GET`  | `/api/guides` | Daftar guide aktif (di-cache aplikasi) |
| `POST` | `/api/evaluations` | Kirim 1 penilaian, atau batch `{ "evaluations": [...] }` |
| `GET`  | `/api/evaluations` | Rekap data di server |
| `GET`  | `/api/evaluations.csv` | Unduh rekap CSV |

**Body `POST /api/evaluations`** (sesuai PRD §7):

```json
{
  "evaluationId": "uuid",
  "guideId": "G-001",
  "guideName": "I Wayan Suparta",
  "pos": 1,
  "timestamp": "2026-08-02T08:00:00.000Z",
  "criteria": { "idCard": true, "uniform": false, "etika": -2 },
  "catatan": "opsional",
  "koreksiDari": "uuid penilaian yang dibetulkan (opsional)"
}
```

Bersifat **append-only dan idempoten** — mengirim ulang `evaluationId` yang sama
tidak menggandakan data, sehingga retry selalu aman. Balasannya membawa
`serverTime`, dipakai aplikasi untuk mengukur seberapa meleset jam perangkat.

Endpoint `GET /api/evaluations` dan `.csv` **mati kecuali** server dijalankan
dengan `ADMIN_TOKEN`, dan tetap meminta `Authorization: Bearer <token>`.
Backend produksi (Apps Script) sengaja tidak punya endpoint pembacaan sama
sekali — rekap dilihat dari spreadsheet.

```bash
ADMIN_TOKEN=rahasia node server/server.js
curl -H "Authorization: Bearer rahasia" http://localhost:3000/api/evaluations
```

---

## Cara kerja offline → online

1. Penilaian disimpan ke IndexedDB dengan `syncState = 0` (⏳).
2. Sync dipicu oleh: event `online`, aplikasi kembali dibuka, timer 1 menit,
   atau tombol **Kirim Sekarang** / **Force Sync**.
3. Entri dikirim satu per satu; sukses → `syncState = 1` (✅).
4. Gagal jaringan (timeout / 5xx) → retry dengan **exponential backoff**
   2s → 4s → 8s … maksimal 5 menit. Berapa kali pun gagal, entri tetap di
   antrean: perangkat bisa berminggu-minggu di luar jangkauan.
5. Ditolak server (400 / masuk daftar `rejected`) → alasannya dicatat dan
   ditampilkan di Riwayat. Setelah **6 penolakan** entri "ditahan": keluar dari
   antrean otomatis, tapi tidak dibuang. Tombol **Coba lagi** di Riwayat
   mengembalikannya — mis. setelah admin menambahkan guide-nya di tab `Guides`.
6. Backup ke `localStorage` tiap 5 menit. Yang belum terkirim selalu
   diutamakan; kalau tidak muat, isinya dipangkas dan keadaannya dilaporkan di
   layar Pengaturan. Bila IndexedDB kosong saat dibuka (indikasi korupsi), data
   dipulihkan otomatis.

---

## Keamanan

Data lokal dienkripsi **AES-256-GCM** lewat Web Crypto API. Kunci dibuat per
perangkat dan disimpan di `localStorage`. Ini "enkripsi ringan" sesuai PRD §5 —
mencegah pengubahan/pembacaan iseng melalui DevTools, **bukan** perlindungan
terhadap penyerang yang menguasai perangkat sepenuhnya.

---

## Pengujian

```bash
npm install          # jsdom + fake-indexeddb (devDependencies)
npm test
```

Menjalankan **144 pemeriksaan** yang memuat `index.html` sungguhan beserta
seluruh skripnya, dan menguji setiap Acceptance Criteria PRD §9 termasuk
simulasi putus jaringan, antrean sync, retry, enkripsi, idempotensi server,
koreksi salah pencet, jam perangkat yang meleset, serta adapter Google Apps
Script.

Rangkaian uji ini **menyalakan servernya sendiri** di port acak dengan folder
data sementara — tidak perlu lagi menjalankan `node server/server.js` di
terminal lain. Untuk menguji server yang sedang berjalan:
`BASE=http://localhost:3199 npm test`.

Logika backend Apps Script diuji terpisah tanpa perlu Google (**148
pemeriksaan**, memakai tiruan `SpreadsheetApp`, `LockService`,
`ContentService`, `Charts`):

```bash
npm run test:gas
```

Uji browser sungguhan (opsional, memerlukan Chrome via Puppeteer):

```bash
npm i puppeteer && npm run test:browser
```

---

## Status Acceptance Criteria

| Kode | Kriteria | Status |
|------|----------|--------|
| AC-1 | Buka tanpa login | ✅ |
| AC-2 | Dropdown ≥ 10 guide, dapat dipilih | ✅ 296 guide |
| AC-3 | Tiga toggle Ya/Tidak, tersimpan lokal | ✅ |
| AC-4 | Tetap responsif & ikon offline saat jaringan hilang | ✅ |
| AC-5 | Terkirim otomatis saat online, status → ✅ | ✅ |
| AC-6 | Burger menu menampilkan semua layar | ✅ 6 menu |
| AC-7 | Target sentuh ≥ 48 px, teks ≥ 16 px | ✅ tombol 56–84 px, teks 17 px |
| AC-8 | Installable sebagai PWA (manifest + service worker) | ✅ |

Ditambahkan pada putaran 26 Agustus 2026:

| Kode | Kriteria | Status |
|------|----------|--------|
| AC-9 | Penilaian yang ditolak server berkali-kali berhenti dicoba, tetap tersimpan, dan bisa dikirim ulang dari Riwayat | ✅ |
| AC-10 | Salah pencet pada penilaian hari ini bisa dibetulkan dari aplikasi tanpa menghapus data | ✅ |
| AC-11 | Jam perangkat yang meleset tidak membuat penilaian jatuh pada tanggal yang salah | ✅ |
| AC-12 | Cadangan lokal yang gagal disimpan dilaporkan, tidak didiamkan | ✅ |
| AC-13 | Ringkasan harian dasbor berupa rumus hidup, terpisah Asing & Domestik | ✅ |
| AC-14 | Grafik ketaatan harian terpasang & tidak menumpuk saat disusun ulang | ✅ |
| AC-15 | Guide yang hadir < 3 hari tidak menyusup peringkat, tetap didaftar | ✅ |

Non-fungsional: ukuran `public/` **175 KB** (batas 5 MB) — 127 KB app shell +
48 KB daftar 296 guide & ikon; responsif untuk hand-held & tablet; seluruh teks
bahasa Indonesia.

---

## Kustomisasi

- **Daftar guide** — sunting langsung tab `Guides` di spreadsheet (set kolom `aktif` = FALSE untuk menonaktifkan tanpa menghapus). Sumber awalnya `public/guides.json`; untuk memuat ulang massal, jalankan fungsi `resetGuides()` di Apps Script.
- **Nama pos** — sunting `<option>` pada `#homePos` dan `#posSelect` di `index.html`.
- **Alamat server** — dapat diubah staff lewat menu **Pengaturan** tanpa mengubah kode.

Lisensi: MIT

---

## Kriteria penilaian

Mengikuti cara penilaian yang sudah dipakai di lapangan (berkas *NILAI REWARD*):

| Kriteria | Cara isi di aplikasi | Disimpan sebagai |
|---|---|---|
| Uniform | Ya / Tidak | `1` / `0` |
| ID-Card | Ya / Tidak | `1` / `0` |
| Etika | tombol − dan + | angka `-5` … `+5` |
| Review | **tidak diisi di aplikasi** | diketik manual di tab rekap |

### Membetulkan salah pencet

Satu pos hanya boleh menilai satu guide sekali per hari, dan data bersifat
append-only — jadi penilaian tidak bisa dihapus. Yang bisa dilakukan adalah
menggantinya: pada penilaian **hari ini** di layar Riwayat ada tombol
**✏️ Perbaiki**.

- Belum terkirim → cukup ditimpa di perangkat.
- Sudah terkirim → dikirim penilaian pengganti dengan `koreksiDari`. Baris lama
  di tab `Evaluations` ditandai `status = diganti` (tidak dihapus) dan rekap
  memakai yang baru.

Koreksi hanya sah untuk guide, pos, dan tanggal yang sama. Untuk hari yang sudah
lewat, perbaikan lewat admin di spreadsheet.

Angka 1/0 dipilih supaya kolomnya bisa langsung dijumlah untuk peringkat reward,
persis seperti rekap manual sebelumnya. Etika boleh minus supaya pelanggaran
berat bisa mengurangi nilai, bukan sekadar tidak menambah.

---

## Rekap bulanan otomatis

Apps Script menyusun tab rekap berformat sama dengan berkas *NILAI REWARD*:

- `Rekap A1 YYYY-MM`, `Rekap A2 …`, `Rekap D1 …`, `Rekap D2 …` — baris = guide,
  kolom = tanggal × (UNI FORM, ID, REVIEW, ETIKA), lalu blok **TOTAL** berumus `=SUM(...)`
- `Rekap Kehadiran YYYY-MM` — baris = seluruh guide aktif, kolom = tanggal,
  isinya **berapa pos** yang memeriksa guide itu hari itu (1–3). Ditutup dua
  baris rumus: `JUMLAH GUIDE HADIR` dan `TOTAL KEHADIRAN POS`
- `Rekap per Pos YYYY-MM` — capaian tiap guide dipisah per pos pemeriksaan

Bila satu guide dinilai di beberapa pos pada hari yang sama, **Uniform, ID, dan
Etika diambil yang paling buruk** — sekali tidak sesuai tetap tercatat 0, dan
nilai etika terendah yang menentukan.

**Kolom REVIEW diisi manual.** Angka yang sudah diketik tim dibaca lebih dulu
lalu ditulis kembali setiap kali rekap disusun ulang, dengan kunci nama guide +
tanggal — jadi tetap aman walau urutan baris bergeser atau tab dibangun ulang
tiap malam.

### Kapan rekap diperbarui

Aplikasi menulis ke tab **`Evaluations`**; tab **`Rekap …`** disusun belakangan
oleh trigger. Jadwalnya:

| Pemicu | Kapan |
| --- | --- |
| Trigger `rekapOtomatis` | tiap 5 menit, **hanya** bila ada penilaian baru masuk |
| Trigger `rekapHarian` | tiap malam 23.00, sebagai jaring pengaman |
| Menu **Perbarui Rekap Bulan Ini** | saat itu juga |

Rekap sengaja tidak disusun di dalam `doPost`: menyusun empat tab regu memakan
belasan detik, dan aplikasi di lapangan akan menganggap penilaian gagal bila
balasannya terlalu lama.

Kedua trigger dipasang otomatis saat `setup()` dijalankan. Kalau perlu dipasang
ulang: menu **Penilaian Guide → Nyalakan Pembaruan Otomatis**.

### Kalau hasil tidak terlihat di spreadsheet

Tiap tab rekap membawa cap **“Diperbarui: …”** di pojok kanan atas — cap yang
lama berarti rekapnya belum disusun ulang, **bukan** datanya hilang.

1. Buka tab `Evaluations`. Kalau baris barunya ada di sana, data sudah aman.
2. Menu **Penilaian Guide → Periksa Kesehatan Data** — menyusun ulang rekap
   sekarang juga sekaligus melaporkan jumlah penilaian, trigger yang aktif, dan
   `guideId` yang tidak terdaftar di tab `Guides` (baris seperti itu tidak akan
   pernah muncul di rekap).
3. Kalau trigger aktif terhitung 0: **Nyalakan Pembaruan Otomatis**.

---

## Data guide

296 guide, hasil penggabungan dua daftar regu:

| Kategori | Regu | Jumlah |
|---|---|---|
| Asing | A1 | 112 |
| Asing | A2 | 116 |
| Domestik | D1 | 52 |
| Domestik | D2 | 32 |

Angka per regu dijumlahkan lebih besar dari 296 karena **15 guide merangkap
lebih dari satu regu** (mis. `I Wayan Mudana` di A1, D1, dan D2). Guide seperti ini
disimpan sebagai **satu entri** dengan kolom `regu` berisi beberapa kode, dan tetap
muncul di setiap regu saat difilter.

Kolom `lisensi` dihapus karena tidak ada di data sumber, digantikan `kategori` dan `regu`.

Di layar **Penilaian**, staff memilih Kategori dan Regu lebih dulu sehingga dropdown
menyusut dari 296 menjadi 29–116 nama. Pilihan filter diingat antar penilaian.
