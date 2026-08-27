# Konteks Proyek — Aplikasi Penilaian Guide Kawasan Besakih

Berkas ini untuk **dimuat sebagai konteks di sesi baru**. Isinya keadaan
proyek, aturan bisnis, alur kerja, dan jebakan-jebakan yang sudah pernah
memakan waktu. Diperbarui 26 Agustus 2026, setelah putaran perbaikan yang
menutup hampir seluruh daftar "yang masih menggantung" dan menambah dua fitur:
koreksi salah pencet, dan koreksi jam perangkat yang meleset.

> ⚠️ **Putaran perbaikan itu BELUM ter-deploy.** Kode sudah di `main`, tapi
> Apps Script masih versi 13 Agustus. Baca §6 sebelum men-deploy — kali ini
> tab `Evaluations` ikut dimigrasikan, jadi urutannya lebih penting daripada
> biasanya.

> Kalau ada yang bertentangan antara berkas ini dan kode, **kode yang benar**.
> Periksa ulang sebelum mempercayai bagian mana pun di sini.

---

## 1. Apa ini

PWA **offline-first** untuk mencatat kepatuhan guide di tiga pos pemeriksaan
Kawasan Besakih. Staff menilai lewat HP tanpa login dan tanpa bergantung
sinyal; data terkirim sendiri ke Google Spreadsheet, lalu dirangkum otomatis ke
tab rekap bulanan berformat *NILAI REWARD* yang dipakai tim selama ini.

| Aspek | Nilai |
| --- | --- |
| Repo lokal | `D:\Claude_ReviewGuide\app` |
| GitHub | `agusgod123/penilaian-guide-besakih`, cabang `main` |
| Hosting PWA | **Vercel** (`vercel.json`) — alamat `.vercel.app` diisi setelah deploy |
| Spreadsheet | *Penilaian Guide Besakih — Basis Data*, fileId `1VgxMrb-NgPlaKmQf7ppd_jrKwc_6F2d9VQKwpgZ9Kec` |
| Alamat backend | Ada di `public/config.js` (URL `/exec` Apps Script) |
| Dependensi produksi | **Nol.** `marked` + `mermaid` hanya devDependency untuk membangun PDF |
| Bahasa | Seluruh antarmuka, komentar kode, dan dokumen berbahasa Indonesia |

---

## 2. Keadaan saat ini

| Bagian | Keadaan |
| --- | --- |
| Repo | `main` memuat putaran perbaikan 26 Agustus |
| Aplikasi live | belum ter-deploy di hosting baru — ikuti `PANDUAN-DEPLOY.md` |
| Apps Script terpasang | **masih versi 13 Agustus** — belum tahu kolom `koreksiDari`/`status` |
| Jumlah penilaian di spreadsheet | 970 per 13 Agustus 2026 (dipakai sungguhan di lapangan) |
| `APP_VERSION` | `1.3.0` · service worker `besakih-guide-v1.9.0` |
| Pengujian | 148/148 Apps Script · 144/144 aplikasi |

### Yang berubah pada putaran penataan ulang (setelah 26 Agustus)

Penataan ulang **struktur berkas saja** — nol perubahan perilaku. Dikerjakan
sebagai putaran terpisah, di atas putaran 26 Agustus, justru supaya kalau ada
yang janggal setelah deploy, penyebabnya bisa dipisahkan.

| Sebelum | Sesudah |
| --- | --- |
| `server-gas/Code.gs` — 2095 baris | 11 berkas bernomor, terbesar 279 baris |
| `public/js/app.js` — 1261 baris | 8 modul di `public/js/app/`, terbesar 271 baris |
| Batas antar bagian = konvensi | Ditulis sebagai TUGAS + LARANGAN di kepala tiap berkas |
| — | 4 uji struktur baru yang menjaga aturan modul (lihat §4.1) |

Bukti bahwa pemecahan `Code.gs` murni pemindahan: 69/69 badan deklarasi
identik byte-per-byte, himpunan baris setara — nol baris hilang, nol baris
baru. Pemecahan `app.js` tidak bisa dibuktikan sekuat itu karena rujukan
memang harus berubah (`form` → `App.state.form`, `toast()` → `App.toast()`);
yang menjaganya 142 tes plus pemeriksa rujukan menggantung.

**Urutan deploy: putaran 26 Agustus dulu, verifikasi, baru putaran ini.**

### Yang berubah pada putaran 26 Agustus

| Hal | Ringkasnya |
| --- | --- |
| Koreksi salah pencet | Tombol "✏️ Perbaiki" pada penilaian hari ini di layar Riwayat. Dua kolom baru di tab `Evaluations`: `koreksiDari`, `status`. |
| Koreksi jam perangkat | Balasan server membawa `serverTime`; aplikasi memakai jam terkoreksi untuk cap waktu, termasuk saat offline. |
| Entri ditolak berhenti dicoba | Setelah 6 penolakan server (bukan gagal jaringan) entri "ditahan", muncul di Riwayat dengan tombol kirim ulang. |
| Cadangan lokal | Tidak lagi gagal diam-diam; yang belum terkirim diutamakan, kegagalannya dilaporkan. |
| Draft formulir | Ikut dienkripsi. |
| `counts()`/`pending()` | Tidak lagi mendekripsi seluruh basis data tiap 60 detik. |
| Server REST | Endpoint pembacaan butuh `ADMIN_TOKEN`; aturan guideId & satu-pos-sekali-sehari disamakan dengan backend Apps Script. |
| `guides.json` | Satu berkas saja (`public/`); salinan di `server/` dihapus. |
| Cap waktu rekap | "26 Agu 2026", bukan "26 Aug 2026". |
| Rangkaian uji aplikasi | Menyalakan servernya sendiri di port acak + folder data sementara. |
| **Tab Dasbor** | Peringkat guide, grafik ketaatan harian, dan ringkasan harian Asing & Domestik berupa rumus hidup — lihat §3.7 |

### Aturan tetap: kalau kontrak kriteria berubah, backend dulu baru push

Aplikasi dan backend harus sepakat soal kriteria mana yang wajib dikirim.
Aplikasi memperbarui dirinya sendiri di HP staff begitu Pages selesai
men-deploy, sedangkan Apps Script hanya berubah bila ditempel manual — jadi
push lebih dulu berarti membuka jendela waktu ketika perangkat mengirim bentuk
yang tidak diterima backend.

Yang terjadi selama jendela itu: kiriman dibalas 400, staff melihat pesan merah
di layar Riwayat, dan sync berputar sia-sia tiap menit. **Penilaiannya tidak
hilang** — `markFailed()` hanya mencatat alasan, `syncState` tetap `0`, jadi
seluruh antrean terkirim sendiri begitu backend diperbarui. Tetap dihindari,
karena membuat staff mengira aplikasinya rusak.

Urutan yang dipakai 13 Agustus 2026 dan terbukti mulus tanpa satu pun kiriman
gagal:

1. Kirim 11 berkas `server-gas/*.gs` (clasp), atau `npm run build:gas` lalu tempel
   `Code.gs` hasilnya. Jalankan `setup`, Deploy → Manage deployments →
   Edit → **New version**. `setup()` juga **mengunci zona waktu spreadsheet ke
   `Asia/Makassar`** dan melaporkannya di nilai kembalian. Kalau pesannya
   berbunyi "Zona waktu diubah dari …", berarti selama ini batas harinya
   meleset: rekap yang disusun ulang akan memindahkan sebagian baris ke tanggal
   yang benar, jadi angka lama bisa bergeser. Itu perbaikan, bukan kerusakan —
   tapi beri tahu tim lebih dulu.
2. Pastikan dengan uji tulis (§6) bahwa backend sudah versi baru — balasannya
   menyebut Etika, bukan `review`
3. Baru `git push origin main`

---

## 3. Aturan bisnis

### 3.1 Kriteria penilaian

Aplikasi mengirim **tiga** kriteria:

| Kriteria | Bentuk | Catatan |
| --- | --- | --- |
| **Uniform** | Ya/Tidak → `1`/`0` | Wajib dipilih |
| **ID-Card** | Ya/Tidak → `1`/`0` | Wajib dipilih |
| **Etika** | Angka **−5 sampai +5** | `0` jawaban sah; −5 pelanggaran berat, +5 sangat baik |

**`review` sudah tidak diisi aplikasi.** Kolomnya tetap ada di tab
`Evaluations` dan di rekap demi data lama, dan server masih menerimanya bila
dikirim.

### 3.2 Penggabungan bila satu guide dinilai di beberapa pos pada hari yang sama

| Kriteria | Yang dipakai | Alasan |
| --- | --- | --- |
| Uniform, ID-Card | **Paling buruk** (`min`) | Ketidaksesuaian di pos mana pun tetap ketidaksesuaian |
| Etika | **Paling rendah** (`min`) | Skalanya bertanda; −5 tidak boleh tertutup oleh +5 di pos lain |
| Review (data lama) | Tertinggi (`max`) | Peninggalan aturan lama |

Penggabungan dilakukan **dua tingkat**: per `(guide, pos, tanggal)` dulu, baru
lintas pos. Tingkat pertama itulah yang membuat kolom `Pn Hadir` menghitung
**hari**, bukan jumlah penilaian.

### 3.3 Kehadiran

- Kehadiran harian = **jumlah pos berbeda** yang memeriksa guide itu, bernilai **0–3**
- Tab `Rekap Kehadiran YYYY-MM`: baris = seluruh guide aktif, kolom = tanggal
- Ditutup dua baris rumus: `JUMLAH GUIDE HADIR` (`COUNTIF>0`) dan `TOTAL KEHADIRAN POS` (`SUM`)

### 3.4 Satu pos menilai satu guide sekali per hari

Ditegakkan **di server** saat menulis, bukan di aplikasi — hanya server yang
memegang data seluruh pos. Kiriman kedua dengan `(guideId, pos, tanggal)` yang
sama **ditolak**. Pos lain tetap boleh menilai guide itu pada hari yang sama.

Kiriman ulang dengan `evaluationId` yang **sama** tetap dijawab
`accepted duplicate` — kalau ditolak, antrean aplikasi macet selamanya.

Penolakannya menyertakan `aktifSaatIni` (evaluationId baris yang berlaku) dan
menyebut cara membetulkannya, supaya aplikasi bisa langsung menawarkan tombol
perbaiki alih-alih membuat staff buntu.

### 3.5 Koreksi salah pencet

Data tetap append-only. Yang salah **tidak dihapus** — hanya ditandai.

| Keadaan penilaian yang salah | Yang dilakukan aplikasi |
| --- | --- |
| Belum pernah terkirim | Ditimpa di perangkat (`DB.gantiIsi`), `evaluationId` dipertahankan. Tidak ada jejak koreksi di spreadsheet — angka yang salah memang belum pernah sampai ke sana. |
| Sudah terkirim | Dikirim penilaian **pengganti** dengan `koreksiDari: <evaluationId lama>`. Server menandai baris lama `status = diganti` dan memakai yang baru saat menyusun rekap. |

Yang ditegakkan server:

- Koreksi hanya sah untuk **guide, pos, dan tanggal yang SAMA**. Tanpa aturan
  ini, "koreksi" bisa dipakai menyelundupkan penilaian kedua di pos yang sama.
- Baris yang sudah `diganti` tidak bisa dikoreksi lagi (koreksi berantai harus
  menunjuk baris yang masih aktif).
- `koreksiDari` tidak boleh menunjuk dirinya sendiri, dan harus ada di server.
- Baris lama ditandai `diganti` **sebelum** baris baru ditulis. Kalau urutannya
  dibalik lalu penandaan gagal, rekap akan memuat dua baris aktif untuk pos dan
  hari yang sama — nilai ganda, lebih buruk daripada koreksi yang gagal.

Cap waktu penilaian koreksi **mengikuti penilaian aslinya**, bukan waktu
koreksi dibuat. Kunci "satu pos sekali sehari" memakai tanggal, jadi koreksi
yang dibuat tepat lewat tengah malam akan ditolak kalau diberi cap waktu baru.
Kapan koreksinya benar-benar masuk tetap tercatat di kolom `receivedAt`.

Dari aplikasi, **hanya penilaian hari ini** yang bisa dibetulkan. Hari yang
sudah lewat lewat admin di spreadsheet — rekapnya biasanya sudah dilaporkan.

Dua hal yang mudah terlewat kalau bagian ini disunting nanti:

- Perangkat menandai penilaian lama `diganti` **begitu staff menekan SIMPAN**,
  sebelum penggantinya terkirim. Kalau pengganti itu akhirnya ditolak permanen
  (jadi `buntu`), tandanya **dibatalkan lagi** (`DB.batalkanDiganti`) — kalau
  tidak, perangkat menganggap yang lama tidak berlaku sementara di spreadsheet
  ia masih aktif, dan rekap CSV perangkat berbeda dengan tab Rekap.
- Keadaan `synced` penilaian lama dibaca **ulang saat SIMPAN**, bukan dipakai
  apa adanya dari saat tombol Perbaiki ditekan. Sync bisa selesai sementara
  formulir sedang diisi, dan jalur "timpa di perangkat" hanya sah untuk entri
  yang benar-benar belum terkirim.

### 3.6 Jam perangkat

Balasan `POST` dan `?action=health` membawa `serverTime`. Aplikasi menghitung
selisihnya terhadap **titik tengah** permintaan (tanpa itu seluruh waktu
perjalanan jaringan ikut terhitung sebagai "jam perangkat ketinggalan"),
menyimpannya di `localStorage`, lalu memakai jam terkoreksi itu untuk cap waktu
penilaian, pemeriksaan penilaian ganda, dan hitungan "hari ini" — termasuk saat
offline.

- Selisih < 1 menit diabaikan (derau jaringan).
- Selisih > 5 menit: staff diberi tahu agar membetulkan jam HP-nya.

### 3.7 Tab Dasbor — peringkat & grafik

Satu tab per bulan, `Dasbor YYYY-MM`, disusun ulang oleh trigger yang sama
dengan tab rekap lainnya.

**Ringkasan harian** (baris 5 dst) berupa **rumus**, bukan angka mati:

```
=COUNT('Rekap A1 2026-08'!B5:B116)+COUNT('Rekap A2 2026-08'!B5:B120)
```

Sengaja begitu, karena kolom REVIEW **diketik manual** di tab rekap regu —
ringkasan harian harus ikut berubah begitu tim memperbaikinya, tanpa menunggu
rekap disusun ulang. Kolomnya: Tanggal, Hari, lalu tujuh kolom untuk ASING
(A1+A2) dan tujuh untuk DOMESTIK (D1+D2) — Hadir, Uniform, ID, % Uniform, % ID,
Etika, Review — ditutup dua kolom GABUNGAN (% Uniform, % ID) yang dipakai grafik.

> Guide yang merangkap Asing **dan** Domestik terhitung di **kedua** kategori,
> jadi Asing + Domestik bisa lebih besar dari jumlah guide sesungguhnya. Ada 15
> guide seperti itu. Persentase GABUNGAN nyaris tidak terpengaruh karena mereka
> terhitung dua kali di pembilang maupun penyebut.

**Grafik**: satu grafik garis, dua seri — % Uniform sesuai dan % ID-Card sesuai
per hari, diambil dari kolom GABUNGAN.

**Tujuh tabel peringkat** (angka mati, disusun Apps Script):

| Tabel | Diurut memakai |
| --- | --- |
| Nilai total tertinggi / terendah | rata-rata (Uniform + ID + Etika + Review) per hari |
| Paling taat / paling tidak taat berpakaian & ID | (Uniform + ID) ÷ (2 × hari hadir) |
| Etika tertinggi / terendah | rata-rata etika per hari (bertanda, boleh minus) |
| Menerima review paling banyak | jumlah review |

Tiap tabel menampilkan **jumlah, rata-rata, dan hari hadir** sekaligus: jumlah
untuk reward berbasis akumulasi, rata-rata untuk membandingkan antar guide.
Pengurutannya memakai rata-rata — pakai jumlah mentah, dan yang hadir 20 hari
otomatis mengalahkan yang hadir 3 hari, sehingga peringkatnya sebenarnya
mengukur kerajinan hadir, bukan ketaatan.

**Syarat minimal hadir `MIN_HARI_PERINGKAT = 3` hari.** Tanpa itu, guide yang
kebetulan dinilai sekali dengan nilai sempurna menempati peringkat 1. Yang di
bawah batas tetap didaftar di bagian "belum cukup hari" supaya tidak hilang.

Peringkat **review** tidak memakai syarat itu: review diketik manual dan tidak
terikat kehadiran, jadi seluruh guide dengan review > 0 ikut diperingkat.

### 3.8 Data guide

296 guide. Kategori `Asing`/`Domestik`, regu `A1`, `A2`, `D1`, `D2`. Satu guide
boleh merangkap beberapa regu (`A1, D1`). Dinonaktifkan lewat kolom
`aktif = FALSE`, tidak dihapus.

---

## 4. Arsitektur

```
HP staff (PWA)  ──POST──►  Apps Script /exec  ──►  Spreadsheet
   IndexedDB               (doPost menolak            tab Evaluations
   terenkripsi              duplikat pos)                  │
   AES-256-GCM                                    trigger tiap 5 menit
                                                          ▼
                                                   tab Rekap A1/A2/D1/D2,
                                                   Rekap Kehadiran,
                                                   Rekap per Pos
```

**Urutan penyusunan rekap tidak boleh diubah.** `bangunDasbor_` dijalankan
**paling akhir** di dalam `bangunRekap`: ringkasan hariannya berupa rumus yang
menunjuk sel-sel tab regu, jadi tab-tab itu harus sudah ada dengan jumlah kolom
tanggal yang final, dan angka REVIEW manual baru bisa dibaca setelah tab regu
selesai ditulis ulang.

| Berkas | Tanggung jawab | Tidak boleh |
| --- | --- | --- |
| `public/js/db.js` | IndexedDB, enkripsi, cadangan | Menyentuh jaringan atau DOM |
| `public/js/sync.js` | Antrean, percobaan ulang, pemilihan backend | Menyentuh DOM |
| `public/js/app/00-inti.js` | Namespace `App`, `App.state`, pembantu murni | Memanggil DB/Sync |
| `public/js/app/01-navigasi.js` | Pindah layar, laci menu | Tahu isi layar |
| `public/js/app/02-guide.js` | Muat & saring guide, cocokkan nama ambigu | Menebak nama ambigu |
| `public/js/app/03-form.js` | Formulir penilaian, draf, kirim | Menulis IndexedDB langsung |
| `public/js/app/04-riwayat.js` | Riwayat, koreksi salah pencet, kirim ulang | Menghapus penilaian |
| `public/js/app/05-export.js` | Export CSV rekap perangkat | Dianggap pengganti rekap spreadsheet |
| `public/js/app/06-status.js` | Statistik, status jaringan, penyimpanan, tutorial | — |
| `public/js/app/07-mulai.js` | Binding event, langganan Sync, `init()` | Memuat logika bisnis |
| `public/sw.js` | Cache app shell | Mencegat permintaan lintas host |
| `server-gas/00_Konstanta.gs` | Nama tab, indeks kolom, batas nilai, nama hari/bulan | Logika apa pun |
| `server-gas/01_DataGuide.gs` | Data awal daftar guide (296 baris) | Logika apa pun |
| `server-gas/02_Util.gs` | Akses spreadsheet, JSON, penamaan tab, tanggal WITA | Tahu aturan penilaian |
| `server-gas/03_Ingest.gs` | doGet/doPost, validasi, idempotensi, koreksi | Menyusun rekap |
| `server-gas/04_Setup.gs` | `setup()`, migrasi Evaluations, isi ulang Guides | Dipanggil trigger |
| `server-gas/05_Ringkasan.gs` | Baca Guides & Evaluations, rangkum, baca REVIEW manual | Menulis ke tab |
| `server-gas/06_RekapRegu.gs` | Tab Rekap A1/A2/D1/D2, mengembalikan `tanggalList` | Menebak nomor kolom |
| `server-gas/07_RekapLain.gs` | Rekap Kehadiran & Rekap per Pos | — |
| `server-gas/08_Peringkat.gs` | Hitung nilai per guide, urutkan, tulis tabel peringkat | Membuang yang belum cukup hari |
| `server-gas/09_Dasbor.gs` | Ringkasan harian (rumus) + grafik ketaatan | Jalan sebelum tab regu final |
| `server-gas/10_Trigger.gs` | Orkestrasi urutan rekap, trigger, menu | Menyusun rekap dari doPost |
| `server/` | Backend REST alternatif tanpa dependensi | Menyimpang dari aturan backend Apps Script |

Kolom `status` di tab `Evaluations`: `aktif` (angka yang berlaku) atau
`diganti` (sudah dibetulkan lewat koreksi — barisnya tetap ada, tapi dilewati
saat rekap disusun).

Tab spreadsheet: `Guides`, `Evaluations` (append-only), `Petunjuk`,
`Rekap A1/A2/D1/D2 YYYY-MM`, `Rekap Kehadiran YYYY-MM`, `Rekap per Pos YYYY-MM`,
`Dasbor YYYY-MM`.

Rekap disusun ulang oleh trigger **tiap 5 menit** (hanya bila ada penilaian
baru) + **tiap malam 23.00** sebagai jaring pengaman. `doPost` hanya menitipkan
bulan yang berubah; menyusun rekap di dalam POST membuat aplikasi menganggap
penilaian gagal karena balasannya terlalu lama.

---

### 4.1 Aturan modul — apa yang menjaga pemecahan ini tetap rapi

Backend Apps Script dan lapisan UI sama-sama dipecah jadi berkas bernomor.
Keduanya **tidak punya sistem modul**: seluruh `.gs` berbagi satu lingkup global
Apps Script, dan seluruh `js/app/*.js` dimuat lewat tag `<script>` biasa tanpa
build step. Jadi kerapiannya bukan dijamin bahasa, melainkan empat aturan
berikut — dan masing-masing punya tes yang menjaganya.

| Aturan | Kenapa | Dijaga oleh |
| --- | --- | --- |
| Tidak ada nama top-level kembar antar berkas | Satu lingkup global: yang kembar saling menimpa **tanpa peringatan**. Dalam satu berkas hal itu terlihat mata; dalam 11 berkas tidak. | `test-gas.mjs`, `app.test.mjs` |
| Tidak ada kode top-level yang dijalankan saat berkas dimuat (selain literal) | Kalau ada, urutan evaluasi berkas jadi menentukan — dan urutan itu mudah berubah tanpa sengaja. | `test-gas.mjs` |
| State yang berubah hanya hidup di `App.state` | Dua modul yang masing-masing memegang salinannya sendiri akan berselisih diam-diam. | `app.test.mjs` |
| `index.html` dan `sw.js` memuat daftar modul yang sama | Kalau `sw.js` tertinggal satu modul, HP offline menerima aplikasi yang separuh modulnya hilang — dan hanya ketahuan di lapangan. | `app.test.mjs` |

Awalan angka pada nama berkas menandakan urutan baca yang diinginkan. Karena
aturan kedua ditegakkan, urutan itu tidak kritis untuk `.gs`. Untuk `js/app/`
urutan **memang** mengikat: `00-inti.js` harus lebih dulu karena membuat
`window.App`, dan `07-mulai.js` harus terakhir karena menjalankan `init()`.

`server-gas/Code.gs` adalah **berkas turunan**, bukan sumber. Ia dihasilkan
`npm run build:gas` hanya untuk ditempel ke editor Apps Script bila tidak
memakai clasp, dan sudah masuk `.gitignore`. Tes membaca berkas bernomor,
bukan hasil gabungannya, supaya kesalahan tertangkap di sumber.

## 5. Perintah kerja

```bash
node server-gas/test-gas.mjs      # uji logika Apps Script tanpa Google (148 pemeriksaan)
node test/app.test.mjs            # uji aplikasi via jsdom (144 pemeriksaan)
node server/server.js             # backend lokal (tidak lagi wajib untuk tes)
npm run docs:pdf                  # bangun ulang PDF dari Markdown
```

Rangkaian uji aplikasi **menyalakan servernya sendiri** di port acak dengan
folder data sementara, lalu mematikannya lagi. Itu jadi keharusan begitu server
REST ikut menegakkan "satu pos sekali sehari": run kedua pada hari yang sama
akan bertabrakan dengan data run pertama dan gagal karena sisa data, bukan
karena kodenya salah.

Untuk menguji server yang sedang berjalan, `BASE` tetap dihormati:
`BASE=http://localhost:3199 node test/app.test.mjs`. Server sendiri menerima
`PORT` dan `DATA_DIR`.

Endpoint pembacaan di server REST hanya hidup bila diberi kunci:

```bash
ADMIN_TOKEN=rahasia node server/server.js
curl -H "Authorization: Bearer rahasia" http://localhost:3000/api/evaluations
```

---

## 6. Alur deploy

| Bagian | Cara |
| --- | --- |
| Aplikasi PWA | `git push origin main` → Vercel men-deploy `public/` sendiri (lihat `vercel.json`) |
| Apps Script | `clasp push`, ATAU `npm run build:gas` lalu tempel `Code.gs`. Jalankan `setup`, Deploy → Manage deployments → Edit → **New version** |

⚠️ **Jangan pilih *New deployment*** — itu membuat URL baru dan `config.js`
harus ikut diganti.

`setup()` memasang trigger sendiri dan menjalankan migrasi kolom, jadi jangan
dilewat.

### Deploy putaran 26 Agustus — urutannya wajib

Putaran ini **mengubah bentuk tab `Evaluations`** (menambah kolom `koreksiDari`
dan `status`), jadi lebih berhati-hati daripada biasanya.

1. **Salin dulu spreadsheetnya** — File → Make a copy. `migrasiEvaluations_`
   membaca seluruh baris, mengosongkan tab, lalu menulisnya kembali. Dengan 970+
   baris data lapangan sungguhan, salinan cadangan itu murah dan satu-satunya
   jaring pengaman kalau migrasi berhenti di tengah.
2. Kirim berkas `.gs` (clasp push) atau tempel hasil `npm run build:gas`, simpan,
   jalankan `setup()`.
   Nilai kembaliannya menyebut hasil migrasi. Periksa tab `Evaluations`: jumlah
   barisnya harus sama seperti sebelumnya, dengan dua kolom baru di kanan dan
   kolom `status` berisi `aktif` untuk semua baris lama.
3. Deploy → Manage deployments → Edit → **New version**.
4. Pastikan backend sudah versi baru dengan uji tulis (§6 di bawah) — balasannya
   harus memuat `serverTime`.
5. Baru `git push origin main`.

Kalau nomor 5 dijalankan lebih dulu: aplikasi di HP akan mengirim `koreksiDari`
ke backend lama yang tidak mengenalnya. Backend lama mengabaikan kolom itu dan
memperlakukan koreksinya sebagai penilaian biasa, lalu menolaknya karena aturan
satu-pos-sekali-sehari. **Penilaian aslinya tidak hilang** dan penilaian biasa
tetap jalan seperti sebelumnya — yang rusak hanya fitur koreksinya, dan setelah
6 penolakan entri koreksi itu akan "ditahan" (bisa dikirim ulang dari layar
Riwayat setelah backend diperbarui).

### Memeriksa versi backend yang terpasang

`curl -L` **membuang body POST** dan menghasilkan `411 Length Required`.
Redirect Apps Script harus diikuti manual:

```bash
URL="<alamat /exec>"
LOC=$(curl -s -o /dev/null -D - -X POST "$URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  --data-binary '{"evaluationId":"probe","guideId":"G-001","guideName":"x","pos":9,"timestamp":"2026-08-13T02:00:00.000Z","criteria":{"uniform":true,"idCard":true,"etika":99}}' \
  | grep -i "^location:" | tr -d '\r' | sed 's/^[Ll]ocation: //')
curl -s "$LOC"
```

`pos: 9` membuatnya ditolak di semua versi, jadi **tidak ada baris yang
tertulis**. Yang dibaca adalah daftar `errors`-nya:

- menyebut `criteria.review harus angka >= 0` → versi **13 Agustus atau lebih lama**
- menyebut `criteria.etika harus angka antara -5 dan 5` → versi **13 Agustus**
- balasannya memuat **`serverTime`** → versi **26 Agustus** (yang mengenal koreksi)

Isi spreadsheet juga bisa dibaca lewat MCP Google Drive (`read_file_content`
dengan fileId di §1) — berguna untuk memastikan rekap benar-benar terisi.

---

## 7. Jebakan yang sudah pernah memakan waktu

### Apps Script

1. **`setFormulas()` memperlakukan SETIAP sel sebagai rumus.** Label teks akan
   diberi `=` di depannya lalu menjadi `#ERROR!`. Tulis label dengan
   `setValues`, hanya rumus yang lewat `setFormulas`. Pernah terjadi nyata.
2. **Apps Script tetap membalas HTTP 200 walau penulisan gagal.** Aplikasi
   hanya menandai ✅ bila server menyebutkan `evaluationId` itu di `accepted`.
3. **`sh.clear()` tidak melepas sel gabungan.** Jumlah kolom tanggal berubah
   tiap hari, jadi `siapkanTab_` memanggil `breakApart()` lebih dulu.
4. **Judul yang di-merge melintasi kolom beku membuat `setFrozenColumns` gagal.**
5. **Tanggal & bulan wajib memakai zona waktu spreadsheet**, bukan UTC. Sejak
   `setup()` mengunci zonanya ke `Asia/Makassar`, spreadsheet baru tidak lagi
   mewarisi zona locale pembuatnya; `periksaKesehatan()` ikut melaporkan zona
   yang sedang aktif.
6. **Locale proyek Apps Script berbahasa Inggris** — cap waktu berbunyi
   "3 Aug 2026", bukan "3 Agu". Kosmetik, belum diperbaiki.

### Aplikasi

7. **Nama guide ambigu tidak boleh ditebak.** Ketikan `Darta` cocok untuk 14
   orang; menebak = mencatat penilaian atas nama orang yang salah.
8. **Kunci enkripsi disimpan di DUA tempat** (`localStorage` + object store
   `meta` di IndexedDB). Dulu hanya di `localStorage`, dan ketika dibersihkan
   browser seluruh penilaian lama menjadi `(data rusak)`. Pernah terjadi nyata.
9. **POST ke Apps Script memakai `Content-Type: text/plain`** — Apps Script
   tidak menjawab `OPTIONS`, jadi `application/json` diblokir CORS.
10. **Service worker tidak boleh mencegat permintaan lintas host**, dan tidak
    boleh membalas `index.html` untuk berkas data — nanti dibaca sebagai JSON.
11. **Export CSV memakai pemisah `;` + baris `sep=;`** — Excel berbahasa
    Indonesia menumpuk berkas berkoma jadi satu kolom.
12. **Entri rusak tidak boleh digambar sebagai nilai `0`** — nilainya tidak
    diketahui, bukan nol.

### Pengujian

**Node 24+ menolak AbortSignal lintas realm.** `app.test.mjs` menyambungkan
`fetch` milik Node ke jendela jsdom. Kalau `AbortController`/`AbortSignal`
jendela dibiarkan milik jsdom, sejak Node 24 undici menolaknya:
«Expected signal ("AbortSignal {}") to be an instance of AbortSignal».
Karena `sync.js` membungkus SEMUA panggilan jaringan dengan `fetchWithTimeout`,
akibatnya berantai: daftar guide kosong → AC-2 gagal → puluhan pemeriksaan
sesudahnya roboh dengan sebab yang menyesatkan (`saved` undefined). Node 22
masih menerimanya, jadi gejalanya hanya muncul di komputer tertentu.
Penawarnya dua baris di `app.test.mjs`, dijaga dua pemeriksaan sendiri.
Aplikasinya tidak terpengaruh — di browser keduanya memang serealm.



13. **Tiruan `FakeSheet` harus meniru Sheets, bukan menyederhanakannya.** Dulu
    `setFormulas` diperlakukan sama dengan `setValues`, sehingga bug `#ERROR!`
    lolos. Sekarang teks yang tidak diawali `=` menjadi `#ERROR!`, plus ada
    pemeriksaan menyeluruh yang menolak sel `#ERROR!` di tab rekap mana pun.
14. **Tiruan `Utilities.formatDate` wajib menghormati zona waktu.** Versi lama
    selalu memakai UTC sehingga salah-hitung tanggal tak mungkin tertangkap.
15. **Urutan tes saling bergantung.** Banyak pemeriksaan mengandalkan jumlah
    data tertentu. Blok baru yang menambah data taruh di **akhir** berkas, dan
    pakai guide/pos/tanggal yang belum dipakai blok lain.
16. **Menambah kolom menggeser seluruh indeks** di tes rekap. Tiap tanggal kini
    4 kolom (UNI FORM, ID, REVIEW, ETIKA).
17. **Tiruan `Utilities.formatDate` untuk pola `MMM` memakai bulan berbahasa
    Inggris**, meniru locale proyek Apps Script. Jangan "diperbaiki" jadi
    bahasa Indonesia — justru itu yang membuat kode yang menumpang locale
    ketahuan salah.
18. **Rangkaian uji aplikasi tidak boleh menumpang server yang datanya
    menetap.** Sejak server REST menegakkan satu-pos-sekali-sehari, run kedua
    pada hari yang sama akan bertabrakan dengan data run pertama. Tesnya kini
    menyalakan servernya sendiri dengan `DATA_DIR` sementara.

### Lingkungan kerja

19. **Berkas repo berakhiran CRLF.** Penyuntingan lewat skrip Python harus
    membaca dengan `newline=''` dan menyesuaikan pemisah barisnya, kalau tidak
    pola multi-baris tidak akan cocok.
20. **`new URL('..', import.meta.url).pathname` rusak di Windows** — hasilnya
    `/D:/...`. Pakai `url.fileURLToPath`.
21. **`git push` bisa menggantung** bila kredensial belum ter-cache: credential
    helper Windows memunculkan dialog yang tidak bisa tampil di sesi
    non-interaktif. Jalankan dengan `timeout`, dan kalau menggantung minta
    pengguna menjalankannya sendiri.
22. **`gh` CLI tidak terpasang** di komputer ini.
23. **PDF dibangun lewat Chrome headless**, bukan reportlab (reportlab tidak
    terpasang). Tinggi diagram dibatasi `205mm` supaya tidak terdorong ke
    halaman berikutnya dan meninggalkan halaman kosong.

### Dasbor

24. **`sh.clear()` TIDAK membuang chart.** Kalau `bangunDasbor_` tidak memanggil
    `removeChart` lebih dulu, tiap penyusunan ulang menumpuk grafik baru di atas
    yang lama — dengan trigger tiap 5 menit, dalam sehari bisa ratusan objek di
    satu tab. Tiruan `FakeSheet` sengaja meniru perilaku ini.
25. **Rumus dasbor menunjuk nomor kolom di tab regu**, dan tiap tab regu punya
    daftar tanggalnya sendiri (hanya hari yang ada datanya bagi anggotanya).
    Nomor kolom untuk satu tanggal **berbeda antar tab** — jangan ditebak;
    `bangunRekapRegu_` mengembalikan `tanggalList` justru untuk itu.
26. **Nama tab dengan spasi wajib dikutip satu** dalam rumus lintas tab:
    `'Rekap A1 2026-08'!B5:B116`. Tanpa kutip, rumusnya menjadi `#REF!`.
27. **Nama hari jangan memakai pola `EEE`** — sama seperti `MMM`, itu mengikuti
    locale proyek yang berbahasa Inggris. Pakai `HARI_ID`.
28. **Pembuatan chart dibungkus try/catch dengan sengaja.** Grafik itu hiasan;
    angka-angkanya yang penting. Kalau chart gagal dibuat, rekap tidak boleh
    ikut gagal — cukup dicatat di Logger dan ditulis sebagai keterangan di tab.

---

## 8. Riwayat keputusan penting

| Keputusan | Alasan |
| --- | --- |
| Tanpa login | Staff berganti-ganti, perangkat dipakai bersama |
| Spreadsheet sebagai basis data | Gratis, dikenal admin, rekap di tempat yang sama |
| Tanpa framework, nol dependensi produksi | Proyek jarang disentuh; dependensi membusuk lebih dulu |
| Append-only, `evaluationId` dibuat di perangkat | Idempotensi tanpa koordinasi server |
| **Tidak ada endpoint pembacaan penilaian** | Web app berakses publik; §5 PRD melarangnya. Sempat dibuat lalu dicabut |
| Rekap di luar jalur POST | Balasan harus cepat; menyusun rekap butuh belasan detik |
| Nama guide ditimpa server dari tab `Guides` | `guideId` adalah kebenaran; nama dari perangkat bisa usang |
| Etika −5..+5, digabung `min` | Skala bertanda; nilai buruk tidak boleh tertutup nilai baik di pos lain |
| Koreksi lewat baris pengganti, bukan sunting baris | Append-only tetap utuh, jejak apa yang sempat tercatat tidak hilang, dan tidak perlu endpoint tulis-ulang |
| Cap waktu koreksi mengikuti penilaian asli | Kunci "satu pos sekali sehari" memakai tanggal; cap waktu baru bisa melempar koreksi ke hari berikutnya |
| Hanya penolakan server yang menuju "ditahan" | Perangkat bisa berminggu-minggu di luar jangkauan; gagal jaringan bukan alasan menyerah |
| Entri "ditahan" tidak dihitung sebagai penilaian kembar | Menurut definisinya ia tidak ada di server; kalau ikut dihitung, tombol "Betulkan penilaian itu" menunjuk kiriman yang gagal, bukan baris yang benar-benar tercatat |

Yang sempat dicoba lalu **dibatalkan**, jangan diulang tanpa pembahasan:

- **Kehadiran 1 per hari untuk seluruh pos** (`3a57915`, di-revert `0e4b8ed`) —
  salah tafsir; yang benar satu per **pos**.
- **Endpoint `?action=ringkasan`** untuk menampilkan jumlah guide hadir di
  aplikasi — dicabut karena menambah endpoint pembacaan publik dan angka
  hanya-perangkat-sendiri menyesatkan.

---

## 9. Yang masih menggantung

Daftar 13 Agustus sudah ditutup pada putaran 26 Agustus, kecuali dua hal yang
memang diterima apa adanya. Yang tersisa:

| # | Hal | Kenapa dibiarkan |
| --- | --- | --- |
| 1 | Alamat `/exec` tertanam di repo publik dengan akses "Anyone" | Konsekuensi dari "aplikasi siap pakai tanpa setting manual". Mitigasinya: append-only, `guideId` wajib terdaftar, tidak ada endpoint pembacaan, dan koreksi hanya sah untuk baris yang sudah ada. Pihak luar bisa menambah baris palsu, tidak bisa membaca atau menghapus |
| 2 | Cabang `cadangan-lokal-sebelum-deploy` sudah tidak diperlukan | Tinggal dihapus, tidak mengganggu |
| 3 | Koreksi dari aplikasi hanya untuk penilaian **hari ini** | Disengaja: kunci "satu pos sekali sehari" memakai tanggal, dan rekap hari-hari sebelumnya biasanya sudah dilaporkan. Hari yang lewat lewat admin di spreadsheet |
| 4 | `doPost` membaca seluruh kolom A–D + status tiap kiriman | Wajar sampai puluhan ribu baris. Kalau nanti lambat, saring per bulan |
| 5 | Locale proyek Apps Script tetap berbahasa Inggris | Tidak lagi berpengaruh — nama bulan disusun sendiri lewat `BULAN_ID`. Hanya relevan kalau ada kode baru yang memakai pola `MMM` (tiruan di test-gas akan menangkapnya) |

### Sudah ditutup 26 Agustus

| Dulu | Sekarang |
| --- | --- |
| `markFailed()` mengulang selamanya | Berhenti setelah 6 **penolakan server**; gagal jaringan tidak dihitung. Entri "ditahan", muncul di Riwayat dengan tombol kirim ulang |
| Cap waktu rekap "3 Aug 2026" | "3 Agu 2026", tidak menumpang locale proyek |
| Tidak ada cara melihat peringkat & tren | Tab `Dasbor YYYY-MM`: 7 tabel peringkat, grafik ketaatan harian, ringkasan harian Asing & Domestik berupa rumus hidup |
| Jam perangkat meleset tanpa koreksi | Selisih dipelajari dari `serverTime`, dipakai mengoreksi cap waktu, dan diberitahukan ke staff bila > 5 menit |
| Salah pencet harus lewat admin | Tombol "✏️ Perbaiki" di Riwayat (lihat §3.5) |
| `server.js` membuka seluruh data tanpa auth | Butuh `ADMIN_TOKEN`, tanpa CORS bintang; aturan `guideId` & satu-pos-sekali-sehari disamakan dengan backend Apps Script |
| `counts()`/`pending()` mendekripsi semua | `counts()` hanya membaca field cleartext; `pending()` mengambil lewat index `syncState` |
| `backupNow()` gagal diam-diam | Yang belum terkirim diutamakan, isinya dipangkas bila perlu, kegagalannya dilaporkan di layar Pengaturan |
| `APP_VERSION` mandek | `1.3.0` sejalan dengan SW `v1.9.0`; layar Tentang menampilkan versi cache yang benar-benar aktif |
| `guides.json` kembar | Satu berkas di `public/` |
| Draft formulir polos | Ikut dienkripsi |

---

## 10. Dokumen lain

| Berkas | Isinya |
| --- | --- |
| [`PANDUAN-DEPLOY.md`](../PANDUAN-DEPLOY.md) | **Deploy dari nol** — spreadsheet baru, Vercel, memindahkan HP staff |
| [`README.md`](../README.md) | Menjalankan, deploy, struktur |
| [`docs/PANDUAN-PEMAKAIAN.md`](PANDUAN-PEMAKAIAN.md) | Panduan staff & admin, bahasa sederhana |
| [`docs/PRD-APLIKASI.md`](PRD-APLIKASI.md) | Spesifikasi lengkap, kriteria penerimaan, risiko |
| [`docs/ALUR-APLIKASI.md`](ALUR-APLIKASI.md) | 13 diagram alur (Mermaid) |

Ketiga dokumen pertama bisa dicetak menjadi PDF lewat `npm run docs:pdf`.
PDF-nya **tidak disimpan di repo** — ia hasil olahan yang cepat basi dan berat
di riwayat git.
