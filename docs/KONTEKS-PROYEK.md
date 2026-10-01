# Konteks Proyek — Aplikasi Penilaian Guide Kawasan Besakih

Berkas ini untuk **dimuat sebagai konteks di sesi baru**. Isinya keadaan
proyek, aturan bisnis, alur kerja, dan jebakan-jebakan yang sudah pernah
memakan waktu. Diperbarui **28 September 2026**, setelah dua putaran besar yang
keduanya sudah **ter-deploy dan berjalan di produksi**:

1. **Nama guide kembar** — 15 record yang menggabungkan dua orang berbeda ke
   satu `guideId` dipecah. Daftar guide 296 → 314.
2. **Penilaian per pengantaran** — satuan penilaian berubah dari "satu pos satu
   hari" menjadi per pengantaran, Uniform jadi tiga tingkat, dan aturan
   anti-duplikat diganti pengaman jeda dua lapis.

> Keduanya mengubah **aturan bisnis inti**, bukan sekadar menambah fitur. Kalau
> Anda pernah membaca berkas ini sebelum 28 September, bagian §3 sudah tidak
> berlaku seluruhnya — baca ulang.

**Putaran 1 Oktober 2026** menambah **tab Rekap Mingguan** (Senin–Minggu) dan
menutup dua bug yang sudah sampai ke produksi: laporan cetak bagian C membaca
kolom Dasbor yang salah, dan REVIEW manual bocor ke guide bernama kembar di
regu lain. Ringkasnya di §2; aturannya di §3.7c–§3.7e. Putaran ini hanya
menyentuh jalur rekap — cukup tempel `Code.gs` lalu **Save**, tanpa *New
version* (lihat §6).

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
| Repo lokal | `D:\Pribadi\Nilaiguide` (Windows, Git Bash) |
| GitHub | `agusgod123/nilaiguide`, cabang `main` |
| Hosting PWA | **Vercel** (`vercel.json`), otomatis dari `main` — https://nilaiguide.vercel.app |
| Spreadsheet | *Penilaian Guide Besakih — Basis Data 2026* |
| Alamat backend | Ada di `public/config.js` (URL `/exec` Apps Script) |
| Dependensi produksi | **Nol.** `marked` + `mermaid` hanya devDependency untuk membangun PDF |
| Bahasa | Seluruh antarmuka, komentar kode, dan dokumen berbahasa Indonesia |

⚠️ **fileId spreadsheet yang dulu tercatat di sini sudah tidak berlaku** —
menunjuk berkas lama, bukan *Basis Data 2026* yang dipakai sekarang. Ambil id
yang benar dari URL spreadsheet saat dibutuhkan; jangan menyalin dari dokumen
lama mana pun.

---

## 2. Keadaan saat ini

| Bagian | Keadaan |
| --- | --- |
| Repo | `main` memuat seluruh putaran sampai penilaian per pengantaran |
| Aplikasi live | https://nilaiguide.vercel.app — ter-deploy otomatis dari `main` |
| Apps Script terpasang | versi 28 September (mengenal `JEDA_TOLAK_MENIT`) |
| Jumlah penilaian di spreadsheet | ±2.300 baris, ±2.200 di bulan berjalan (44 diganti koreksi) |
| Data guide | **314** · A1 113, A2 116, D1 52, D2 33 — tiap guide hanya satu regu |
| `APP_VERSION` | `1.3.0` · service worker `besakih-guide-v1.9.0` |
| Pengujian | **227/227** Apps Script · **167/167** aplikasi |

### Yang berubah pada putaran 1 Oktober — rekap mingguan

| Hal | Ringkasnya |
| --- | --- |
| Tab baru | `Rekap Mingguan 28 Sep-4 Okt 2026` — satu tab per minggu **Senin–Minggu WITA**, boleh lintas bulan (§3.7d) |
| Berkas baru | `server-gas/12_RekapMingguan.gs` — **13** berkas bernomor sekarang |
| Rangkuman | Inti `rangkumBulan_` dipindah ke `rangkumSaring_`; `rangkumRentang_(awal, akhir)` memakai inti yang sama. Aturan agregasi tetap di satu tempat |
| Menu | *Perbarui Rekap Minggu Ini*, *Perbarui Rekap Minggu Lalu*, *Rekap Minggu Lain…* (ketik tanggal) |
| Otomatis | `rekapOtomatis` menyusun minggu berjalan bila bulannya berubah; `rekapHarian` 23.00 menyusun minggu berjalan **dan** minggu lalu |
| Bug: Laporan bagian C | Nomor kolom Dasbor tetap (18 kolom) meleset sejak Dasbor 24 kolom — kini dicari lewat kepala tab (§3.7c) |
| Bug: REVIEW nama kembar | Review dicocokkan lewat **nama**; 14 nama dipakai dua orang beda regu → review satu orang ikut terhitung ke kembarannya. Kini dikunci `guideId` (§3.7e) |

### Yang berubah pada putaran 28 September — penilaian per pengantaran

Mengubah **satuan penilaian**, jadi menyentuh hampir seluruh rantai: aturan
terima di server, agregasi, bentuk tab rekap, dasbor, laporan cetak, dan
aplikasi. Rinciannya di §3; ringkasnya:

| Hal | Ringkasnya |
| --- | --- |
| Satuan | Satu penilaian = satu **pengantaran**. Guide boleh dinilai berkali-kali sehari, termasuk di pos yang sama |
| Uniform | Ya/Tidak → **tiga tingkat**: `−1` tidak sesuai, `+1` sesuai, `+2` penampilan bagus. Ikut dijumlahkan ke nilai total |
| Anti-duplikat | "Satu pos sekali sehari" **dicabut**, diganti jeda dua lapis: server menolak < 15 menit, aplikasi bertanya 15–60 menit |
| Pos | Hanya Pos 1 dan Pos 3 di pemilih; server tetap menerima pos 1–3 |
| Agregasi | Tidak ada lagi "ambil yang paling buruk" — seluruh pengantaran dijumlahkan dan dicacah |
| Peringkat | Rata-rata **per pengantaran**, `MIN_PENGANTARAN_PERINGKAT = 5` |
| Tab rekap | Blok tanggal 4 → **6 kolom** (+ `ANTAR`, `PATUH`), blok TOTAL → 7 kolom (+ `RATA`) |
| Dasbor | 7 → **10 kolom** per kategori |
| Laporan cetak | Ikut satuan baru; **tesnya baru dibuat pada putaran ini** dan langsung menemukan bug NaN |

### Yang berubah pada putaran 28 September — nama guide kembar

15 record menggabungkan dua orang berbeda ke satu `guideId` dan menandainya
beregu ganda (`"A1, A2"`). Karena kunci anti-duplikat server adalah `guideId`,
dua orang bernama sama yang dinilai di pos dan hari yang sama saling
bertabrakan — penilaian orang kedua ditolak lalu hilang tanpa jejak.

Record itu dipecah jadi 31 (`G-297`…`G-312`); regu pertama mempertahankan
`guideId` lama sehingga riwayatnya tetap menempel dan tab `Evaluations` **tidak
perlu dimigrasikan**. Ditambah 2 guide baru → 314.

Sekalian ditutup bug yang membuntukan: kartu dan chip kandidat dulu hanya
mengirim **nama**, lalu dicocokkan ulang saat simpan. Guide bernama kembar jadi
mustahil dinilai — pesan galat menyuruh "pilih lewat Daftar Guide", padahal
kartunya pun hanya mengirim nama. Sekarang semuanya membawa `data-guide-id`.

### Yang berubah pada putaran penataan ulang (setelah 26 Agustus)

Penataan ulang **struktur berkas saja** — nol perubahan perilaku. Dikerjakan
sebagai putaran terpisah, di atas putaran 26 Agustus, justru supaya kalau ada
yang janggal setelah deploy, penyebabnya bisa dipisahkan.

| Sebelum | Sesudah |
| --- | --- |
| `server-gas/Code.gs` — 2095 baris | 12 berkas bernomor (kini termasuk `11_Laporan.gs`) |
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

1. Kirim 13 berkas `server-gas/*.gs` (clasp), atau `npm run build:gas` lalu tempel
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
| **Uniform** | **Tiga tingkat**: `−1` / `+1` / `+2` | −1 pakaian tidak sesuai, +1 pakaian sesuai, +2 penampilan bagus. Wajib dipilih |
| **ID-Card** | Ya/Tidak → `1`/`0` | Wajib dipilih |
| **Etika** | Angka **−5 sampai +5** | `0` jawaban sah; −5 pelanggaran berat, +5 sangat baik |

Nilai Uniform **ikut dijumlahkan** ke nilai total seperti Etika, jadi jumlahnya
bisa negatif. Itu disengaja: "penampilan bagus" harus benar-benar bernilai
lebih, bukan sekadar label.

**`0` BUKAN nilai Uniform yang sah** pada skala baru — dan justru itu gunanya.
Data lama menyimpan Ya/Tidak sebagai `1`/`0`, jadi angka `0` bisa dipakai
sebagai penanda baris lama dan dipetakan ke `−1`. Aturannya dipegang satu
fungsi, `normalUniform_()` di `03_Ingest.gs`, dan **rekap memakai fungsi yang
sama** supaya baris lama dan baru terbaca dengan skala identik.

**Boolean tetap diterima** dari perangkat yang belum memperbarui aplikasinya
(`true` = +1, `false` = −1). Kalau ditolak, entrinya tertahan permanen dan
datanya hilang — pertimbangan yang sama dengan Etika yang boleh tidak dikirim.

Petugas lapangan sudah diarahkan agar Etika **tidak diisi 0**: `+1` adalah nilai
terendah yang wajar untuk guide tanpa catatan masalah.

**`review` sudah tidak diisi aplikasi.** Kolomnya tetap ada di tab
`Evaluations` dan di rekap demi data lama, dan server masih menerimanya bila
dikirim.

### 3.2 Agregasi — satuannya PENGANTARAN

**Satu penilaian = satu pengantaran.** Tidak ada lagi penggabungan "ambil yang
paling buruk"; seluruh pengantaran **dijumlahkan dan dicacah**.

> Dulu penilaian digabung ke tingkat `(guide, hari)` dan diambil yang paling
> buruk. Itu masuk akal selama satu pos hanya boleh menilai sekali sehari,
> karena baris kedua pasti koreksi. Sejak penilaian dihitung per pengantaran,
> baris kedua adalah pengantaran yang benar-benar berbeda — jadi tidak boleh
> lagi saling menimpa.

`rangkumBulan_` mengembalikan tiga peta, semuanya berisi
`{ antar, uniform, idCard, review, etika, uniformPatuh }`:

| Peta | Dikelompokkan per |
| --- | --- |
| `harian[guideId][tgl]` | guide × tanggal — dipakai tab rekap regu & kehadiran |
| `perPos[guideId][pos]` | guide × pos sebulan — dipakai tab Rekap per Pos |
| `total[guideId]` | guide sebulan — dasar rata-rata per pengantaran |

**Pos 1 dan Pos 3 TIDAK disambungkan** menjadi satu perjalanan. Rata-rata tidak
peduli bagaimana penyebutnya didefinisikan asalkan konsisten, jadi
menyambungkan keduanya tidak membuat angkanya lebih adil — hanya menambah isian
di lapangan atau logika tersembunyi yang tidak bisa dijelaskan dari spreadsheet.
Tiap baris tetap menyimpan pos dan jam, jadi keputusan ini bisa dihitung ulang
dari riwayat kalau kelak berubah.

**`uniformPatuh` dicacah terpisah** dari jumlah nilai Uniform. Pada skala
−1/+1/+2 cacah patuh **tidak bisa diturunkan** dari jumlahnya: beberapa
kombinasi berjumlah sama dengan cacah patuh berbeda. Seluruh kolom persen
bergantung pada cacah ini.

### 3.3 Kehadiran

- Kehadiran harian = **berapa pengantaran** guide itu dinilai hari tersebut.
  **Tidak ada batas atas** — dulu 1–3, mentok di jumlah pos.
- Tab `Rekap Kehadiran YYYY-MM`: baris = seluruh guide aktif, kolom = tanggal.
  **Di sinilah cacah harian dibaca** — tab rekap regu hanya memuat jumlah
  nilainya, jadi tanpa tab ini angka "4" di kolom UNIFORM tidak bisa dibedakan
  antara dua pengantaran bagus atau empat pengantaran biasa.
- Ditutup dua baris rumus: `JUMLAH GUIDE HADIR` (`COUNTIF>0`) dan
  `TOTAL PENGANTARAN` (`SUM`)

### 3.4 Pengaman salah pencet — jeda dua lapis

Aturan "satu pos menilai satu guide sekali per hari" **sudah dicabut**. Guide
yang sama boleh dinilai berkali-kali sehari, termasuk di pos yang sama — itu
memang pengantaran berbeda. Yang tersisa hanya penjagaan jarak:

| Jarak dari penilaian aktif atas guide & pos yang sama | Perilaku |
| --- | --- |
| `< JEDA_TOLAK_MENIT` (15) | **Server menolak.** Aplikasi menahannya lebih dulu supaya formulir tidak terlanjur diisi; tombol "lanjutkan" sengaja **tidak** muncul, karena kirimannya pasti gagal |
| 15–60 menit (`JEDA_PERINGATAN_MENIT`) | **Aplikasi bertanya.** Petugas menekan "Ya, ini pengantaran berikutnya" dan kirimannya diteruskan. Server menerima |
| `> 60` menit | Lewat tanpa suara |

- Jedanya **per guide DAN per pos** (`kunciGuidePos_`). Pos berbeda tidak pernah
  saling menghalangi, berapa pun jaraknya.
- Selisih diambil **mutlak**: entri offline bisa tiba belakangan dengan cap
  waktu lebih awal, dan itu pencetan ganda yang sama.
- Ambang tolak ditegakkan **di server** karena hanya server yang tahu apa yang
  baru dicatat perangkat lain di pos yang sama. Ambang peringatan hanya hidup di
  aplikasi dan hanya melihat data perangkat itu sendiri — lubang ini disengaja;
  yang menjaga lintas perangkat tetap lapisan server.
- Konstanta kembar di `public/js/db.js` **wajib sama** dengan server. Kalau
  aplikasi lebih longgar, staff baru tahu kirimannya ditolak setelah formulir
  terlanjur diisi; kalau lebih ketat, ia menahan penilaian yang sah.
- Persetujuan petugas terikat pada **satu `evaluationId`**, dan hangus begitu
  guide atau pos berganti.

> ⚠️ Kedua angka ini masih **tebakan**. Lama satu siklus antar naik-turun belum
> pernah terukur, karena aturan lama melarang penilaian kedua di pos yang sama
> sehingga datanya tidak ada. **Setel ulang setelah Oktober 2026.**

`kunciPos_` (guide + pos + tanggal) **bukan lagi kunci keunikan** — satu guide
boleh punya beberapa baris untuk pos dan hari yang sama. Fungsinya tinggal satu:
memastikan koreksi masih menunjuk guide, pos, dan tanggal yang sama.

**Pos:** pengantaran dinilai di **Pos 1 dan Pos 3 saja**. Pos 2 dilepas dari
pemilih aplikasi, tapi server **tetap menerima pos 1–3** supaya entri lama di
antrean perangkat tidak tertahan selamanya dan data historis Pos 2 tetap
terbaca rekap.

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
koreksi dibuat. Koreksi hanya sah untuk tanggal yang sama, jadi koreksi yang
dibuat tepat lewat tengah malam akan ditolak kalau diberi cap waktu baru. Kapan
koreksinya benar-benar masuk tetap tercatat di kolom `receivedAt`.

Baris yang sudah ditandai `diganti` **dilepas dari daftar jam aktif**, sehingga
tidak lagi memicu pengaman jeda — koreksi menggantikan penilaian itu, bukan
menambah pengantaran baru.

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
rekap disusun ulang. Kolomnya: Tanggal, Hari, lalu **sepuluh** kolom untuk ASING
(A1+A2) dan sepuluh untuk DOMESTIK (D1+D2) — Hadir, **Antar**, Uniform, ID,
**Patuh**, % Uniform, % ID, **Mutu Uni**, Etika, Review — ditutup dua kolom
GABUNGAN (% Uniform, % ID) yang dipakai grafik.

- **Penyebut seluruh rata-rata adalah `Antar`**, bukan jumlah guide: satu guide
  bisa mengantar berkali-kali sehari dan tiap pengantaran dinilai sendiri.
- `% Uniform` dihitung dari kolom `Patuh`, bukan jumlah nilai Uniform.
- `Mutu Uni` berformat `0.00` (skala −1..+2), **bukan persen** — kolom persen
  tidak bisa membedakan "sesuai" dari "penampilan bagus".

> Sejak record beregu ganda dipecah, **tidak ada lagi guide yang terhitung di
> dua kategori**. Sub ASING + Sub DOMESTIK kini tepat sama dengan seluruh guide.

**Grafik**: satu grafik garis, dua seri — % Uniform sesuai dan % ID-Card sesuai
per hari, diambil dari kolom GABUNGAN.

**Tujuh tabel peringkat** (angka mati, disusun Apps Script):

| Tabel | Diurut memakai |
| --- | --- |
| Nilai total tertinggi / terendah | rata-rata (Uniform + ID + Etika + Review) **per pengantaran** |
| Paling taat / paling tidak taat berpakaian & ID | (**cacah patuh** + ID) ÷ (2 × pengantaran) |
| Etika tertinggi / terendah | rata-rata etika per pengantaran (bertanda, boleh minus) |
| Menerima review paling banyak | jumlah review |

Tiap tabel menampilkan **jumlah, rata-rata, dan cacah pengantaran** sekaligus:
jumlah untuk menelusuri angkanya ke tab rekap, rata-rata untuk membandingkan
antar guide.

**Pembaginya PENGANTARAN, bukan hari.** Banyaknya pengantaran ditentukan urutan
giliran, bukan kualitas guide-nya — jadi reward yang disandarkan pada jumlah
akan memihak guide yang kebagian giliran lebih banyak.

**Ketaatan memakai CACAH patuh**, bukan jumlah nilai Uniform. Pada skala
−1/+1/+2 penjumlahan bisa melampaui atau turun di bawah rentang 0–100%.

**Syarat minimal `MIN_PENGANTARAN_PERINGKAT = 5` pengantaran** (dulu 3 hari).
Dengan beberapa pengantaran per hari, ambang 3 terlalu mudah ditembus hanya
dalam sehari bertugas. Yang di bawah batas tetap didaftar di bagian "belum
cukup pengantaran" supaya tidak hilang.

Peringkat **review** tidak memakai syarat itu: review diketik manual dan tidak
terikat kehadiran, jadi seluruh guide dengan review > 0 ikut diperingkat.

### 3.7b Bentuk tab rekap regu

**Blok tanggal selebar 6 kolom**: `UNI FORM · ID · REVIEW · ETIKA · ANTAR · PATUH`
(dulu 4). Angka hariannya **JUMLAH seluruh pengantaran hari itu**, bukan satu
nilai.

**Blok TOTAL selebar 7 kolom**: enam SUM + `RATA`. `RATA` tetap **rumus** supaya
ikut berubah begitu tim membetulkan angka REVIEW yang diketik manual.

Tab **Rekap per Pos** punya kolom `P{n} Rata Uni` per pos. Itu **pengaman**:
sejak tiap penilaian dihitung sendiri, guide yang lebih sering ketemu satu pos
akan condong ke standar pos itu. Kalau Pos 1 dan Pos 3 menilai dengan ukuran
berbeda — misalnya seragam sudah lusuh saat sampai Pos 3 — selisihnya harus
kelihatan, bukan ditebak.

### 3.7c Laporan bulanan cetak

`11_Laporan.gs` disusun **dari menu**, bukan oleh trigger, dan membaca hasil
`08_Peringkat.gs` lewat lapisan pemetaan nama medan (`LAP_PETA`). Kalau
pemetaannya meleset, laporannya tetap tersusun rapi dan **hanya angkanya yang
diam-diam salah** — kegagalan yang paling sulit terlihat.

Modul ini sebelumnya **tidak diuji sama sekali**. Tesnya dibuat pada putaran 28
September dan langsung menemukan dua bug yang sudah sampai ke laporan produksi
(lihat §7).

Bagian C (ringkasan harian + grafik) **menyalin** angka dari tab Dasbor. Kolom
Dasbor kini **dicari lewat kepalanya** (`lapKolomDasbor_`: kepala kelompok
ASING/DOMESTIK/GABUNGAN di atas baris "Tanggal", lalu label kolom di dalam
kelompoknya). Sampai 1 Oktober kolomnya ditunjuk dengan nomor tetap untuk
susunan 18 kolom, dan sejak Dasbor melebar jadi 24 kolom nomor itu menunjuk
kolom lain tanpa error — "% Uniform" terbaca dari Patuh Domestik, dan
seterusnya. Kalau susunan Dasbor berubah lagi, bagian C kini **dilewati dengan
keterangan**, bukan diisi angka yang salah. Baris TOTAL bagian C menghitung
persen dari cacah (patuh ÷ antar), sama dengan baris TOTAL Dasbor.

### 3.7d Rekap mingguan

`12_RekapMingguan.gs` menyusun satu tab per minggu, mis.
`Rekap Mingguan 28 Sep-4 Okt 2026` (sebulan: `Rekap Mingguan 5-11 Okt 2026`).

- **Satu minggu = Senin s.d. Minggu** menurut zona spreadsheet, **boleh lintas
  bulan**. Batasnya dihitung dari kode tanggal WITA lalu aritmetika UTC murni —
  penilaian Minggu 23.30 UTC yang sudah Senin di WITA masuk minggu baru.
- Bahan angkanya **sama dengan Dasbor**: `rangkumRentang_` → `peringkatGuide_`,
  REVIEW dari `kumpulkanReviewManual_`. Tidak ada aturan baru.
- **REVIEW dipotong ke tanggal minggu itu.** `kumpulkanReviewManual_` memberi
  review sebulan penuh, dan `peringkatGuide_` ikut menghitung "hari yang hanya
  punya review" — tanpa pemotongan, review di luar minggu ikut terjumlah.
- Tata letak: baris 1–3 judul/keterangan/kepala, **baris 4 SELURUH GUIDE**
  (dibekukan bersama kepala), baris 5–10 A1, A2, SUB ASING, D1, D2,
  SUB DOMESTIK, lalu seluruh guide aktif urut regu → nama.
- Kolom mengikuti blok TOTAL tab regu: `UNI FORM · ID · REVIEW · ETIKA · ANTAR ·
  PATUH`, lalu `NILAI TOTAL · RATA · % UNIFORM · % ID · MUTU UNI · HARI HADIR`.
  Turunan (RATA, %, MUTU) **kosong** bila tidak ada pengantaran — bukan 0%.
- Nilai mati, bukan rumus. REVIEW **tidak boleh diketik di tab ini** — tab
  ditulis ulang otomatis; tempatnya di tab Rekap regu bulanan.
- Kisi tab dipangkas ke area terpakai (±325 × 14), karena batas 10 juta sel
  Google menghitung sel kosong juga (lihat §9).
- **Untuk memantau, bukan reward.** Karena lintas bulan, jumlah beberapa minggu
  tidak tepat sama dengan angka bulanan.

| Pemicu | Yang disusun |
| --- | --- |
| `rekapOtomatis` (5 menit) | minggu berjalan, **bila** salah satu bulan yang berubah bersinggungan dengannya. Gagalnya hanya dicatat — tidak menandai ulang bulan, tidak menahan rekap bulanan |
| `rekapHarian` (23.00) | minggu berjalan **dan** minggu lalu (penilaian dari HP yang baru dapat sinyal bisa tiba setelah minggunya berganti) |
| Menu | minggu ini, minggu lalu, atau minggu yang memuat tanggal ketikan (`15-9-2026`, `15/09/2026`, `2026-09-15`; tanggal mustahil ditolak) |

`bangunRekapMingguan` memakai **kunci skrip yang sama** dengan `bangunRekap`:
REVIEW dibaca dari tab regu, dan tab itu kosong sesaat ketika sedang disusun
ulang proses lain.

### 3.7e REVIEW manual dikunci `guideId`

Tab regu hanya memuat **nama**. `kumpulkanReviewManual_(bulan, guides)`
memetakan baris di tab regu X ke **anggota regu X** yang bernama sama (di dalam
satu regu nama selalu unik — kembar seregu diberi pembeda dalam kurung). Nama
yang tidak ada di regunya hanya dicocokkan bila milik **tepat satu** guide;
selebihnya dilewati dan dicatat di Logger. Hasilnya peta
`'guideId|yyyy-mm-dd' → angka`, dan `peringkatGuide_` mencarinya lewat
`guideId`.

Sampai 1 Oktober kuncinya nama. Ada **14 nama** yang dipakai dua orang di regu
berbeda (mis. I Wayan Ardana G-232 A1 / G-305 D1), jadi setiap review yang
diketik untuk salah satunya ikut terhitung ke kembarannya — sampai ke NILAI
TOTAL dan RATA di Dasbor dan Laporan. Tanpa argumen `guides` fungsinya
**melempar**, supaya review tidak diam-diam menjadi nol.

### 3.8 Data guide

**314 guide** — A1 113, A2 116, D1 52, D2 33. Kategori `Asing`/`Domestik`, regu
`A1`, `A2`, `D1`, `D2`. Dinonaktifkan lewat kolom `aktif = FALSE`, tidak dihapus.

**Tiap guide kini hanya masuk SATU regu.** Kolom `regu` masih bisa memuat daftar
berkoma dan kodenya masih mendukungnya (dijaga tes), tapi datanya tidak lagi
memakai itu — 15 record yang dulu beregu ganda ternyata orang berbeda bernama
sama, dan sudah dipecah.

**`guideId` adalah kunci, bukan nama.** Kunci anti-duplikat memakai `guideId`,
dan nama ditimpa dari tab `Guides` saat disimpan — jadi **memperbaiki ejaan nama
sama sekali tidak menyentuh riwayat**.

Nama kembar **seregu** diberi pembeda dalam kurung, karena regu tidak bisa
memisahkan mereka: `I Nyoman Darta (Angsoka)`/`(Kidul)`,
`I Nyoman Sandi Yasa (A)`/`(B)`, `I Wayan Wirya (A)`/`(B)`. Nama kembar **beda
regu** dibiarkan bersih — UI membawa `guideId`.

---

## 4. Arsitektur

```
HP staff (PWA)  ──POST──►  Apps Script /exec  ──►  Spreadsheet
   IndexedDB               (doPost menegakkan         tab Evaluations
   terenkripsi              jeda tolak)                    │
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
| `server-gas/01_DataGuide.gs` | Data awal daftar guide (314 baris) | Logika apa pun |
| `server-gas/02_Util.gs` | Akses spreadsheet, JSON, penamaan tab, tanggal WITA | Tahu aturan penilaian |
| `server-gas/03_Ingest.gs` | doGet/doPost, validasi, idempotensi, jeda, koreksi, `normalUniform_` | Menyusun rekap |
| `server-gas/04_Setup.gs` | `setup()`, migrasi Evaluations, isi ulang Guides | Dipanggil trigger |
| `server-gas/05_Ringkasan.gs` | Baca Guides & Evaluations, rangkum, baca REVIEW manual | Menulis ke tab |
| `server-gas/06_RekapRegu.gs` | Tab Rekap A1/A2/D1/D2, mengembalikan `tanggalList` | Menebak nomor kolom |
| `server-gas/07_RekapLain.gs` | Rekap Kehadiran & Rekap per Pos | — |
| `server-gas/08_Peringkat.gs` | Hitung nilai per guide, urutkan, tulis tabel peringkat | Membuang yang belum cukup pengantaran |
| `server-gas/09_Dasbor.gs` | Ringkasan harian (rumus) + grafik ketaatan | Jalan sebelum tab regu final |
| `server-gas/10_Trigger.gs` | Orkestrasi urutan rekap, trigger, menu | Menyusun rekap dari doPost |
| `server-gas/11_Laporan.gs` | Laporan bulanan cetak A4, dipanggil dari menu | Menghitung ulang logika bisnis sendiri; menunjuk kolom Dasbor dengan nomor tetap |
| `server-gas/12_RekapMingguan.gs` | Tab Rekap Mingguan Senin–Minggu, menu & tanggal ketikan | Menghitung ulang logika bisnis; menerima REVIEW ketikan |
| `server/` | Backend REST alternatif tanpa dependensi | Menyimpang dari aturan backend Apps Script |

Kolom `status` di tab `Evaluations`: `aktif` (angka yang berlaku) atau
`diganti` (sudah dibetulkan lewat koreksi — barisnya tetap ada, tapi dilewati
saat rekap disusun).

Tab spreadsheet: `Guides`, `Evaluations` (append-only), `Petunjuk`,
`Rekap A1/A2/D1/D2 YYYY-MM`, `Rekap Kehadiran YYYY-MM`, `Rekap per Pos YYYY-MM`,
`Dasbor YYYY-MM`, `Laporan YYYY-MM` (dari menu), `Rekap Mingguan <rentang>`.

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
| Tidak ada nama top-level kembar antar berkas | Satu lingkup global: yang kembar saling menimpa **tanpa peringatan**. Dalam satu berkas hal itu terlihat mata; dalam 13 berkas tidak. | `test-gas.mjs`, `app.test.mjs` |
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
node server-gas/test-gas.mjs      # uji logika Apps Script tanpa Google (227 pemeriksaan)
node test/app.test.mjs            # uji aplikasi via jsdom (167 pemeriksaan)
node server/server.js             # backend lokal (tidak lagi wajib untuk tes)
npm run build:gas                 # gabung 13 berkas .gs -> Code.gs
npm run docs:pdf                  # bangun ulang PDF dari Markdown
```

Di Git Bash (Windows), menyalin `Code.gs` ke clipboard tanpa membukanya:

```bash
cat server-gas/Code.gs | clip
```

Rangkaian uji aplikasi **menyalakan servernya sendiri** di port acak dengan
folder data sementara, lalu mematikannya lagi. Itu jadi keharusan begitu server
REST ikut menegakkan aturan anti-duplikat: run kedua pada hari yang sama akan
bertabrakan dengan data run pertama dan gagal karena sisa data, bukan karena
kodenya salah.

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

**Putaran yang hanya menyentuh jalur rekap** (seperti 1 Oktober — rekap
mingguan, laporan, REVIEW): tempel `Code.gs`, **Save**, lalu muat ulang
spreadsheet supaya menunya ikut berubah. Tidak perlu `setup()`, tidak perlu
*New version*, dan trigger yang sudah ada tetap dipakai — trigger dan menu
selalu menjalankan kode yang tersimpan. `doPost` di `/exec` tidak berubah.

### Tiga hal yang mudah menjebak

1. **`setup()` TIDAK menulis ulang tab Guides** kalau tab itu sudah terisi dan
   headernya sesuai skema. Untuk memperbarui daftar guide, jalankan
   **`resetGuides()`** — dan itu **tidak menyentuh tab Evaluations** sama
   sekali. Menjalankan `setup()` lalu heran kenapa daftarnya tidak berubah
   sudah pernah terjadi.
2. **Menu menjalankan kode yang TERSIMPAN di editor**, bukan versi yang
   di-deploy. Perubahan yang hanya menyentuh rekap atau laporan cukup Save;
   "New version" hanya perlu kalau aturan terima di `/exec` berubah.
3. **Bangun `Code.gs` dari cabang yang benar.** `npm run build:gas` membangun
   dari berkas di folder saat itu. Kalau perbaikan ada di cabang sementara Anda
   sedang di `main`, `git pull` **tidak** membawanya — `Code.gs` yang terbangun
   adalah kode lama, dan gejalanya menyesatkan: bug yang "sudah diperbaiki"
   tetap muncul. **Merge dulu, baru build.** Sudah memakan waktu sekali.

### Urutan saat aturan terima berubah

Kalau kontrak kriteria atau aturan anti-duplikat berubah, **Apps Script dulu,
baru merge ke `main`.** Kalau dibalik, aplikasi di HP memakai aturan baru
sementara server masih yang lama, dan kirimannya ditolak. Penilaiannya tidak
hilang — entri tertahan di antrean dan terkirim sendiri setelah backend
diperbarui — tapi staff mengira aplikasinya rusak.

> Arsip: putaran 26 Agustus dulu mengubah bentuk tab `Evaluations` (menambah
> kolom `koreksiDari` dan `status`) dan karena itu butuh salinan spreadsheet
> lebih dulu. Putaran-putaran sesudahnya **tidak** memigrasikan `Evaluations`
> lagi — pemecahan guide kembar sengaja mempertahankan `guideId` lama justru
> supaya migrasi tidak diperlukan.

### Memeriksa versi backend yang terpasang

`curl -L` **membuang body POST** dan menghasilkan `411 Length Required`.
Redirect Apps Script harus diikuti manual:

```bash
URL="<alamat /exec>"
LOC=$(curl -s -o /dev/null -D - -X POST "$URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  --data-binary '{"evaluationId":"probe","guideId":"G-001","guideName":"x","pos":9,"timestamp":"2026-08-13T02:00:00.000Z","criteria":{"uniform":0,"idCard":true,"etika":99}}' \
  | grep -i "^location:" | tr -d '\r' | sed 's/^[Ll]ocation: //')
curl -s "$LOC"
```

`pos: 9` membuatnya ditolak di semua versi, jadi **tidak ada baris yang
tertulis**. Yang dibaca adalah daftar `errors`-nya:

- menyebut `criteria.review harus angka >= 0` → versi **13 Agustus atau lebih lama**
- menyebut `criteria.etika harus angka antara -5 dan 5` → versi **13 Agustus**
- balasannya memuat **`serverTime`** → versi **26 Agustus** (yang mengenal koreksi)
- menyebut **`salah satu dari -1, 1, 2`** → versi **28 September** (Uniform tiga
  tingkat). Versi sebelumnya berbunyi `criteria.uniform harus boolean`.

Cara paling cepat dari sisi spreadsheet: buka tab `Rekap A1 <bulan>`, lihat
baris 3. Kalau setelah `ETIKA` ada kolom `ANTAR` dan `PATUH`, kode barunya sudah
jalan. Cara lain: cari `JEDA_TOLAK_MENIT` di editor Apps Script.

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
6a. **NaN masuk ke Sheets sebagai `#NUM!`.** Satu guide terdaftar yang belum
   pernah dinilai, dengan satu medan kurang di objek kerangkanya, sudah cukup
   membuat SELURUH angka ringkasan laporan rusak — dan dari 314 guide biasanya
   lebih separuh belum dinilai. Tiap medan yang dijumlahkan `lapJumlahkan_`
   **wajib** ada di kerangka `lapAmbilGuide_`. Pernah terjadi nyata, dan sempat
   sampai ke laporan produksi.
6b. **Cacah patuh TIDAK bisa diturunkan dari jumlah nilai Uniform.** Pada skala
   −1/+1/+2 beberapa kombinasi berjumlah sama dengan cacah patuh berbeda.
   Karena itu blok tanggal punya kolom `PATUH` sendiri. Kolom yang keliru
   memakai jumlah nilai sebagai cacah pernah menghasilkan "Seragam sesuai
   −1201" di laporan produksi.
6c. **Lebar blok tanggal pernah berubah** (4 → 6 kolom). `bacaReviewManual_`
   karena itu **memindai seluruh kolom** mencari penanda `TGL:`, bukan melompat
   selebar blok tetap — tab bulan lama masih memakai lebar lama, dan REVIEW
   hanya ada di tab itu, diketik tangan oleh tim. Salah baca berarti angkanya
   **HILANG** saat tab disusun ulang.

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
    **6 kolom** (UNI FORM, ID, REVIEW, ETIKA, ANTAR, PATUH) dan blok TOTAL 7.
16a. **Tes yang datanya kebetulan menyamarkan bug tidak menangkap apa pun.**
    Pernah terjadi: cacah patuh dan jumlah nilai Uniform kebetulan sama besar
    di data uji, jadi kolom yang keliru memakai jumlah nilai tetap lolos — dan
    bugnya baru ketahuan di laporan sungguhan. Pilih data uji yang membuat
    kedua besaran **berbeda**, lalu buktikan tesnya gagal kalau bug itu
    dikembalikan.
16b. **Tes yang dibungkus `if` bisa diam-diam berhenti jalan** begitu contohnya
    hilang dari data, tanpa satu pun kegagalan. Setelah perubahan besar,
    bandingkan **daftar label tes** sebelum dan sesudah; yang hilang harus
    semuanya disengaja. Sudah menangkap dua kasus nyata.
16c. **`11_Laporan.gs` dulu tidak diuji sama sekali.** Tiruan `FakeSheet` perlu
    dilengkapi (`deleteColumns`, `insertRowsAfter`, `setBorder`,
    `SpreadsheetApp.BorderStyle`, dan kawan-kawan) agar modul itu bisa
    dijalankan utuh. Pemformatan murni tampilan cukup dikenali, tidak diperiksa
    — yang diuji isinya.
17. **Tiruan `Utilities.formatDate` untuk pola `MMM` memakai bulan berbahasa
    Inggris**, meniru locale proyek Apps Script. Jangan "diperbaiki" jadi
    bahasa Indonesia — justru itu yang membuat kode yang menumpang locale
    ketahuan salah.
18. **Rangkaian uji aplikasi tidak boleh menumpang server yang datanya
    menetap.** Sejak server REST ikut menegakkan aturan anti-duplikat, run
    kedua pada hari yang sama akan bertabrakan dengan data run pertama. Tesnya
    kini menyalakan servernya sendiri dengan `DATA_DIR` sementara.

### Dua backend yang harus sepakat

18a. **`server/` gampang tertinggal.** Sudah **dua kali** aturannya berbeda dari
    Apps Script: sekali soal validasi Uniform, sekali soal aturan anti-duplikat
    yang masih harian. Kalau mengubah aturan terima, ubah **keduanya** —
    `server-gas/03_Ingest.gs` dan `server/server.js` (plus `server/storage.js`
    kalau bentuk datanya ikut berubah). Rangkaian uji aplikasi memakai backend
    REST itu, jadi selisihnya biasanya ketahuan di sana.

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
22a. **`git pull` di `main` tidak membawa commit yang ada di cabang.** Terdengar
    sepele, tapi gejalanya menyesatkan: `npm run build:gas` menghasilkan
    `Code.gs` lama, lalu bug yang "sudah diperbaiki" tetap muncul di produksi.
    Merge dulu, baru build. Lihat §6.
22b. **Clone dangkal (`--depth 1`) memasang refspec sempit** yang hanya melacak
    `main`. Cabang yang di-push dari klon itu berhasil di GitHub tapi ref
    lokalnya tidak terbentuk, sehingga alat yang memeriksa "sudah di-push atau
    belum" salah lapor. Penawarnya:
    `git config remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'`
    lalu `git fetch`.
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

### Rekap & laporan

29. **Jangan menunjuk kolom tab lain dengan nomor tetap.** Laporan bagian C
    menunjuk kolom Dasbor dengan nomor untuk susunan 18 kolom; begitu Dasbor
    melebar jadi 24 kolom, "% Uniform" terbaca dari Patuh Domestik dan
    seterusnya — tanpa error, laporan tetap rapi. Cari lewat kepala tab, dan
    kalau tidak ketemu, **lewati dengan keterangan**.
30. **Tiruan tab menyimpan rumus dan tanggal sebagai TEKS.** Kode yang membaca
    nilai terhitung (`instanceof Date`, angka hasil rumus) karena itu tidak
    pernah benar-benar teruji — bagian C laporan selalu kosong di tes, dan bug
    #29 lolos. Uji bagian seperti itu dengan menghitung rumusnya lebih dulu
    (`hitungRumus`) dan memakai Date dari realm sandbox
    (`vm.runInContext('Date', sandbox)`); Date dari realm Node gagal
    `instanceof`.
31. **Peta yang dikunci NAMA bocor antar guide bernama kembar.** Di dalam satu
    regu nama unik, di seluruh daftar tidak (14 nama dipakai dua orang).
    Apa pun yang menggabungkan lintas regu harus dikunci `guideId`.
32. **Review sebulan harus dipotong ke rentangnya** sebelum diberikan ke
    `peringkatGuide_` untuk rentang yang lebih pendek: fungsi itu menghitung
    "hari yang hanya punya review" dari seluruh isi peta.

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
| Etika −5..+5 | Skala bertanda; nilai buruk harus bisa mengimbangi nilai baik |
| **Satu penilaian = satu pengantaran; Pos 1 dan Pos 3 tidak disambungkan** | Rata-rata tidak peduli definisi penyebut asalkan konsisten, jadi menyambungkannya tidak membuat angkanya lebih adil — hanya menambah isian di lapangan atau logika tersembunyi. Tiap baris tetap menyimpan pos dan jam, jadi bisa dihitung ulang kalau kelak berubah |
| **Reward memakai rata-rata per pengantaran, bukan jumlah** | Banyaknya pengantaran ditentukan urutan giliran, bukan kualitas guide-nya |
| **Jeda dua lapis, bukan satu ambang keras** | Lama siklus antar naik-turun belum pernah terukur (aturan lama melarang datanya ada). Ambang keras yang terlalu longgar meloloskan salah pencet; yang terlalu ketat membuang pengantaran sah, dan penolakan server berarti datanya hilang. Keputusannya diserahkan ke petugas yang tahu keadaan lapangan |
| **`0` dipakai sebagai penanda data lama Uniform** | Skala baru tidak pernah memakai `0`, jadi angka itu bisa membedakan baris lama tanpa menambah kolom penanda |
| **Boolean Uniform tetap diterima server** | Perangkat yang belum memperbarui aplikasinya tidak boleh ditolak permanen — datanya akan hilang |
| **Data lama dibaca pada skala baru (`0` → `−1`), tidak diperlakukan netral** | Satu skala untuk semua bulan supaya angkanya bisa dibandingkan lurus. Konsekuensinya September terlihat lebih buruk daripada saat dinilai, jadi **September tidak dipakai untuk reward** |
| **Nama guide kembar dibedakan, `guideId` tidak pernah dipakai ulang** | `guideId` adalah kunci; regu pertama mempertahankan id lama supaya riwayat tetap menempel dan `Evaluations` tidak perlu dimigrasikan |
| Koreksi lewat baris pengganti, bukan sunting baris | Append-only tetap utuh, jejak apa yang sempat tercatat tidak hilang, dan tidak perlu endpoint tulis-ulang |
| Cap waktu koreksi mengikuti penilaian asli | Koreksi hanya sah untuk tanggal yang sama; cap waktu baru bisa melempar koreksi ke hari berikutnya |
| Hanya penolakan server yang menuju "ditahan" | Perangkat bisa berminggu-minggu di luar jangkauan; gagal jaringan bukan alasan menyerah |
| Entri "ditahan" tidak dihitung sebagai penilaian kembar | Menurut definisinya ia tidak ada di server; kalau ikut dihitung, tombol "Betulkan penilaian itu" menunjuk kiriman yang gagal, bukan baris yang benar-benar tercatat |

Yang sempat dicoba lalu **dibatalkan**, jangan diulang tanpa pembahasan:

- **Kehadiran 1 per hari untuk seluruh pos** (`3a57915`, di-revert `0e4b8ed`) —
  salah tafsir; yang benar satu per **pos**.
- **Endpoint `?action=ringkasan`** untuk menampilkan jumlah guide hadir di
  aplikasi — dicabut karena menambah endpoint pembacaan publik dan angka
  hanya-perangkat-sendiri menyesatkan.
- **Mengganti nama guide kembar** — divisi pengelolaan kunjungan mengirim daftar
  kelompok nama kembar beserta regunya, bukan nama pengganti. Jadi nama tidak
  diganti; yang dipecah `guideId`-nya.
- **Menolak keras di 60 menit** — sempat jadi ambang tunggal 30 menit, lalu
  ditinjau ulang karena tidak ada data untuk mengkalibrasinya. Lihat §3.4.

---

## 9. Yang masih menggantung

| # | Hal | Kenapa dibiarkan / apa yang ditunggu |
| --- | --- | --- |
| 1 | **Nama banjar untuk dua pasang guide kembar seregu** — `I Nyoman Sandi Yasa (A)/(B)` di A1 dan `I Wayan Wirya (A)/(B)` di D2 | Label "(A)" dan "(B)" tidak berarti apa-apa bagi petugas di pos; pola `(Angsoka)`/`(Kidul)` pada Nyoman Darta yang benar karena bisa dicocokkan ke kartu guide. Menunggu divisi pengelolaan kunjungan |
| 2 | **`I Nyoman Regog` vs `I wayan regog` di D1** | Beda nama depan, bukan sekadar ejaan. Perlu dicek ke kartu guide. Sebelas selisih ejaan lain sudah diputuskan memakai ejaan aplikasi |
| 3 | **Setel ulang `JEDA_TOLAK_MENIT` (15) dan `JEDA_PERINGATAN_MENIT` (60)** | Keduanya tebakan. Data Oktober 2026 akan menunjukkan sebaran jarak antar pengantaran yang sebenarnya |
| 4 | **Ketaatan berpakaian September hanya 22,1%** sementara ID-Card 97,3% | Pola itu janggal. Patut dicek apakah tombol "Tidak" pada Uniform lama dipahami petugas sebagai "tidak sempurna", bukan "tidak berseragam". Jangan dipakai untuk apa pun sebelum dikonfirmasi ke petugas pos |
| 5 | **Data September tidak dipakai untuk reward** | Bulan itu dinilai separuh dengan aturan lama, separuh baru, dan patahannya di tengah bulan. Evaluasi bulanan yang sesungguhnya **mulai Oktober 2026** |
| 6 | **fileId spreadsheet di dokumen lama salah** | Menunjuk berkas lama, bukan *Basis Data 2026*. Ambil dari URL saat dibutuhkan |
| 7 | Alamat `/exec` tertanam di repo publik dengan akses "Anyone" | Konsekuensi dari "aplikasi siap pakai tanpa setting manual". Mitigasinya: append-only, `guideId` wajib terdaftar, tidak ada endpoint pembacaan, koreksi hanya sah untuk baris yang sudah ada |
| 8 | Koreksi dari aplikasi hanya untuk penilaian **hari ini** | Disengaja; hari yang lewat lewat admin di spreadsheet |
| 9 | `doPost` membaca seluruh kolom A–D + status tiap kiriman | Wajar sampai puluhan ribu baris. Kalau nanti lambat, saring per bulan |
| 10 | Locale proyek Apps Script tetap berbahasa Inggris | Tidak berpengaruh — nama bulan disusun sendiri lewat `BULAN_ID` |
| 11 | **Dokumen lain di `docs/` belum mengikuti dua putaran 28 September** | `PRD-APLIKASI.md`, `ALUR-APLIKASI.md`, `PANDUAN-PEMAKAIAN.md`, dan bagian rekap di `README.md` masih menjelaskan Uniform Ya/Tidak, "ambil yang paling buruk", dan aturan satu-pos-sekali-sehari. Putaran 1 Oktober hanya menambahkan bagian rekap mingguan ke dalamnya |
| 12 | **Batas 10 juta sel Google** — dihitung dari ukuran kisi, sel kosong ikut. Tiap tab regu bulanan berkisi ±194 kolom × 1.000 baris walau terisi ±120 baris; tujuh tab sebulan ±0,87 juta sel | Perkiraan kasar: tersentuh sekitar pertengahan 2027, lalu rekap gagal menambah kolom tanggal. Penawar murah: pangkas kisi tab regu & kehadiran ke area terpakai seperti tab mingguan (±8× lebih kecil). **Jangan menghapus tab bulan lama** — REVIEW manual hanya tersimpan di sana |
| 13 | Tab Rekap Mingguan bertambah satu tiap minggu | Dipangkas ke ±325 × 14 sel, jadi ±240 ribu sel setahun. Boleh dihapus kapan pun — seluruhnya dapat disusun ulang dari Evaluations + tab regu |

### Sudah ditutup 1 Oktober

| Dulu | Sekarang |
| --- | --- |
| Tidak ada cara melihat data per minggu | Tab **Rekap Mingguan** Senin–Minggu, dari menu dan otomatis (§3.7d) |
| Laporan bagian C menunjuk kolom Dasbor dengan nomor tetap 18 kolom — angkanya salah sejak Dasbor 24 kolom | Dicari lewat kepala tab; tak dikenali → dilewati dengan keterangan. Baris TOTAL dihitung dari cacah |
| REVIEW manual dikunci nama — bocor ke kembaran beda regu, sampai ke NILAI TOTAL & RATA | Dikunci `guideId`, dicocokkan per regu (§3.7e) |

### Sudah ditutup 28 September

| Dulu | Sekarang |
| --- | --- |
| 15 record menggabungkan dua orang berbeda ke satu `guideId` | Dipecah jadi 31; daftar guide 296 → 314, tiap guide satu regu |
| Guide bernama kembar mustahil dinilai lewat aplikasi | Kartu dan chip kandidat membawa `data-guide-id` |
| Uniform hanya Ya/Tidak | Tiga tingkat −1/+1/+2, ikut dijumlahkan ke nilai total |
| Satu pos sekali sehari; pengantaran kedua hilang diam-diam | Per pengantaran, dengan jeda dua lapis |
| Peringkat memakai rata-rata per **hari**, ambang 3 hari | Rata-rata per **pengantaran**, ambang 5 |
| `11_Laporan.gs` tidak diuji sama sekali | 7 pemeriksaan; langsung menemukan dua bug yang sudah sampai ke produksi |
| `server/` masih memakai aturan harian lama | Disamakan dengan Apps Script |

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

⚠️ Ketiga dokumen terakhir **belum mengikuti putaran 28 September** — isinya
masih menjelaskan Uniform Ya/Tidak dan aturan satu-pos-sekali-sehari. Kalau
berselisih dengan berkas ini, berkas ini yang lebih baru; kalau berselisih
dengan kode, **kode yang benar**.

Ketiga dokumen pertama bisa dicetak menjadi PDF lewat `npm run docs:pdf`.
PDF-nya **tidak disimpan di repo** — ia hasil olahan yang cepat basi dan berat
di riwayat git.
