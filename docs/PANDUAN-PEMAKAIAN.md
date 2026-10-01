# Panduan Pemakaian Aplikasi Penilaian Guide Kawasan Besakih

**Untuk semua orang — tidak perlu paham komputer.**

Panduan ini ditulis selangkah demi selangkah. Kerjakan berurutan dari atas.
Kalau ada satu langkah yang membingungkan, langsung lompat ke
[Bagian 9 — Kalau Ada Masalah](#9-kalau-ada-masalah).

---

## Daftar isi

**Untuk staff di pos pemeriksaan**
1. [Apa itu aplikasi ini](#1-apa-itu-aplikasi-ini)
2. [Memasang aplikasi di HP](#2-memasang-aplikasi-di-hp)
3. [Mengenal layar aplikasi](#3-mengenal-layar-aplikasi)
4. [Cara menilai guide — langkah demi langkah](#4-cara-menilai-guide--langkah-demi-langkah)
5. [Kalau salah pencet](#5-kalau-salah-pencet)
6. [Kalau tidak ada sinyal](#6-kalau-tidak-ada-sinyal)
7. [Cara melihat data di HP sendiri](#7-cara-melihat-data-di-hp-sendiri)

**Untuk admin / kantor**

8. [Cara melihat data di spreadsheet](#8-cara-melihat-data-di-spreadsheet)
9. [Cara mencocokkan HP dengan spreadsheet](#9-cara-mencocokkan-hp-dengan-spreadsheet)
10. [Kalau ada masalah](#10-kalau-ada-masalah)
11. [Pengaturan lanjutan](#11-pengaturan-lanjutan)
12. [Pertanyaan yang sering muncul](#12-pertanyaan-yang-sering-muncul)

---

# BAGIAN UNTUK STAFF DI POS

---

## 1. Apa itu aplikasi ini

Aplikasi untuk mencatat penilaian guide di **tiga pos pemeriksaan** Kawasan
Besakih. Yang dinilai ada **empat hal**:

| Kriteria | Cara mengisi | Artinya |
| --- | --- | --- |
| 👔 **Uniform** | Tekan **Ya** atau **Tidak** | Seragamnya lengkap dan sesuai? |
| 🪪 **ID-Card** | Tekan **Ya** atau **Tidak** | Kartu identitas guide dipakai? |
| 🤝 **Etika** | Tekan **−** atau **+** | Nilai etika, angka **−5 sampai +5** |

Tiga hal penting:

- **Tidak perlu login.** Buka, langsung pakai.
- **Tidak perlu sinyal.** Data tetap tersimpan aman, terkirim sendiri nanti.
- **Data tidak bisa hilang** karena aplikasi ditutup atau HP mati.

---

## 2. Memasang aplikasi di HP

Aplikasi ini dibuka lewat internet, tapi bisa dipasang seperti aplikasi biasa
supaya ada ikonnya di layar HP.

**Alamatnya:**

```
https://<alamat-aplikasi>.vercel.app
```

### Kalau HP-nya Android (Chrome)

1. Buka **Chrome**
2. Ketik alamat di atas pada kolom alamat paling atas, lalu tekan **Enter**
3. Tunggu sampai aplikasi tampil
4. Tekan tombol **titik tiga ⋮** di pojok kanan atas
5. Pilih **Add to Home screen** atau **Install app** atau **Pasang aplikasi**
6. Tekan **Install** / **Pasang**
7. Ikon 🛕 muncul di layar HP — **mulai sekarang buka dari ikon itu saja**

### Kalau HP-nya iPhone (Safari)

1. Buka **Safari** — harus Safari, bukan Chrome
2. Ketik alamat di atas, tekan **Go**
3. Tekan tombol **Bagikan** (kotak dengan panah ke atas, di bawah layar)
4. Geser ke bawah, pilih **Add to Home Screen**
5. Tekan **Add** di pojok kanan atas
6. Ikon 🛕 muncul di layar HP

> **Sekali pasang saja.** Setelah itu tidak perlu buka Chrome/Safari lagi —
> cukup tekan ikonnya.

### Pertama kali membuka

Akan muncul **tutorial 4 halaman**. Baca sekilas, tekan **Lanjut** sampai
habis, lalu tekan **Mulai**. Tutorial ini tidak akan muncul lagi.

Kalau ingin melihatnya lagi: **Menu ☰ → Tentang → Lihat Panduan Lagi**.

---

## 3. Mengenal layar aplikasi

### Bagian atas layar

| Yang terlihat | Artinya |
| --- | --- |
| **☰** kiri atas | Tombol menu — untuk pindah layar |
| **‹** kiri atas | Tombol kembali |
| 🟢 **Online** | Ada sinyal, data langsung terkirim |
| ⚪ **Offline** | Tidak ada sinyal — **tidak apa-apa**, data tetap aman |
| 🔵 **Mengirim…** | Sedang mengirim data ke server |

### Layar Beranda

```
┌────────────────────────────────────┐
│  Pos Pemeriksaan Saat Ini          │
│  [ Pos 1 — Pintu Masuk        ▼ ]  │  ← pilih pos Anda
├────────────────────────────────────┤
│  📝  PENILAIAN BARU                │  ← tombol hijau besar
│      Nilai guide di pos ini        │
├────────────────────────────────────┤
│    3          0          12        │
│ Total Hari  Menunggu  Terkirim     │  ← angka hari ini
│    Ini       Sync                  │
├────────────────────────────────────┤
│  🔄  Kirim Sekarang                │
│  🗂️  Lihat Riwayat                 │
└────────────────────────────────────┘
```

Arti tiga angka di tengah:

- **Total Hari Ini** — berapa penilaian yang Anda buat hari ini
- **Menunggu Sync** — belum terkirim ke server. **Kalau angkanya 0, semua aman.**
- **Terkirim** — sudah masuk ke server

### Isi Menu ☰

| Menu | Untuk apa |
| --- | --- |
| 🏠 Beranda | Layar utama |
| 📝 Penilaian Baru | Mulai menilai |
| 👥 Daftar Guide | Melihat 296 nama guide |
| 🗂️ Riwayat | **Melihat data yang sudah Anda buat** |
| ⚙️ Pengaturan | Alamat server, cadangan, dll |
| ℹ️ Tentang | Versi aplikasi dan panduan |

---

## 4. Cara menilai guide — langkah demi langkah

### Langkah 1 — Pilih pos

Di Beranda, tekan kotak **Pos Pemeriksaan Saat Ini**, pilih pos tempat Anda
bertugas.

> Cukup sekali di awal shift. Aplikasi mengingatnya.

### Langkah 2 — Tekan tombol hijau

Tekan **📝 PENILAIAN BARU**.

### Langkah 3 — Persempit daftar guide (sangat membantu)

Ada dua kotak pilihan:

- **Kategori** → pilih **Asing** atau **Domestik**
- **Regu** → pilih **Regu 1** atau **Regu 2**

Setelah dipilih, yang muncul hanya guide dari regu itu saja — jauh lebih cepat
mencarinya. Aplikasi mengingat pilihan ini untuk penilaian berikutnya.

### Langkah 4 — Pilih nama guide

Ketik **sebagian nama** di kolom *"Ketik nama atau pilih…"*, lalu pilih dari
daftar yang muncul.

✅ **Kalau benar**, muncul tulisan hijau seperti ini:

```
✓ I Gede Darta · G-005 · Domestik · Regu 2
```

⚠️ **Kalau nama masih kurang lengkap**, aplikasi akan menolak dan memberi tahu:

```
"Darta" cocok untuk 14 guide — ketik nama lengkapnya
Maksud Anda:  [I Gede Darta] [I Nyoman Darta] [I Wayan Darta] ...
```

**Ini bukan error — ini pengaman.** Banyak nama guide yang mirip. Kalau
aplikasi menebak sendiri, penilaian bisa tercatat atas nama orang yang salah.
Tekan saja salah satu nama yang ditawarkan, atau ketik nama lebih lengkap.

> **Cara lain yang lebih mudah:** Menu ☰ → **Daftar Guide** → cari namanya →
> tekan kartunya. Aplikasi langsung membawa Anda ke formulir dengan nama
> tersebut sudah terisi.

### Langkah 5 — Isi penilaian

| Kriteria | Yang harus dilakukan |
| --- | --- |
| 🪪 **ID-Card** | **Wajib.** Tekan **Ya** atau **Tidak** |
| 👔 **Uniform** | **Wajib.** Tekan **Ya** atau **Tidak** |
| 🤝 **Etika** | Tekan **+** bila etikanya baik, **−** bila ada pelanggaran. Kalau biasa saja, **biarkan 0** |

> **0 pada Etika itu sah** dan bukan berarti belum diisi — artinya biasa saja.
> Yang wajib ditekan hanya ID-Card dan Uniform.
>
> Etika berkisar **−5 sampai +5**. Nilai minus dipakai untuk pelanggaran,
> supaya benar-benar mengurangi nilai akhir dan bukan sekadar tidak menambah.

### Langkah 6 — Catatan (boleh dilewati)

Kalau ada yang perlu dijelaskan, tulis singkat. Contoh: *"seragam tidak
lengkap"*. Kalau tidak ada, biarkan kosong.

### Langkah 7 — Simpan

Tekan tombol hijau besar **💾 SIMPAN PENILAIAN** di bawah.

HP akan bergetar sebentar dan muncul tulisan:

> 💾 **Penilaian tersimpan**

Lalu, kalau ada sinyal, menyusul:

> ✅ **1 data terkirim · rekap spreadsheet menyusul ±5 menit**

**Selesai.** Aplikasi kembali ke Beranda, siap untuk penilaian berikutnya.

---

## 5. Kalau salah pencet

Pernah menekan **Ya** padahal maksudnya **Tidak**? Bisa dibetulkan sendiri,
**asal penilaiannya dibuat hari ini**.

### Caranya

1. Buka menu ☰ → **🗂️ Riwayat**
2. Cari penilaian yang salah — penilaian hari ini punya tombol
   **✏️ Perbaiki** di bawahnya
3. Tekan tombol itu. Formulir terbuka lagi dengan nilai yang lama sudah terisi
4. Ubah yang salah, lalu tekan **💾 SIMPAN PENILAIAN**

Muncul tulisan:

> ✏️ **Penilaian dibetulkan**

### Yang perlu diketahui

- **Nama guide dan pos tidak bisa diganti** — keduanya terkunci selama
  membetulkan. Kalau yang salah justru nama guide-nya, hubungi admin.
- Kalau penilaiannya **belum terkirim**, nilainya cukup ditimpa di HP. Tidak ada
  jejak apa pun di spreadsheet.
- Kalau penilaiannya **sudah terkirim** (✅), aplikasi mengirim penilaian
  pengganti. Baris yang lama **tidak dihapus** dari spreadsheet — ia ditandai
  `diganti` dan tidak ikut dihitung di rekap. Di layar Riwayat, penilaian lama
  itu muncul dengan tanda ✏️ dan nama yang dicoret.
- Ingin membatalkan di tengah jalan? Tekan **✖ Batalkan koreksi** di kotak
  kuning atas, atau tekan **Penilaian Baru** dari Beranda.

### Kalau penilaiannya bukan hari ini

Tombol **Perbaiki** hanya muncul untuk penilaian hari ini. Untuk hari-hari
sebelumnya, laporkan ke admin — perbaikannya dilakukan langsung di spreadsheet.

### Kalau muncul "sudah dinilai di Pos ini hari ini"

Itu bukan aplikasi rusak. Satu pos memang hanya boleh menilai satu guide sekali
sehari. Pesannya menampilkan nilai yang sudah tercatat beserta tombol
**✏️ Betulkan penilaian itu** — tekan itu kalau memang mau mengubahnya. Guide
yang sama tetap boleh dinilai di **pos lain**.

---

## 6. Kalau tidak ada sinyal

**Tenang. Tidak ada yang hilang.**

Di Kawasan Besakih sinyal sering putus-putus. Aplikasi ini memang dirancang
untuk itu.

| Yang terjadi | Penjelasan |
| --- | --- |
| Tanda ⚪ **Offline** di kanan atas | Normal, bukan kerusakan |
| Tetap bisa menilai seperti biasa | Semua tersimpan di HP |
| Angka **Menunggu Sync** naik | Ini antrean yang belum terkirim |
| Tanda ⏳ di Riwayat | Belum terkirim |

**Begitu sinyal kembali menyala, data terkirim sendiri.** Tidak perlu menekan
apa pun. Tanda ⏳ berubah menjadi ✅.

Kalau Anda ingin memaksa mengirim sekarang juga: Beranda →
**🔄 Kirim Sekarang**.

> **Yang penting:** sebelum pulang, pastikan angka **Menunggu Sync = 0**.
> Kalau belum 0, cari tempat bersinyal dan tekan **Kirim Sekarang**.

---

## 7. Cara melihat data di HP sendiri

### 6a. Melihat daftar penilaian

**Menu ☰ → 🗂️ Riwayat**

Muncul daftar penilaian yang dibuat **dari HP ini saja**. Contoh satu baris:

```
✅  I Gede Astawa      Pos 1 · 02 Agu, 18.35 · Terkirim
    [ID ✓]  [Uniform ✓]  [Etika +2]
    📝 mantap jiwa
```

Arti tandanya:

| Tanda | Artinya |
| --- | --- |
| ✅ | Sudah terkirim ke server — **aman** |
| ⏳ | Masih menunggu dikirim |
| 🚫 | **Ditahan** — server menolaknya berkali-kali, pengiriman otomatis dihentikan. Datanya tidak hilang. Alasannya tertulis di bawah entri, dan ada tombol **🔄 Coba lagi** |
| ✏️ | Sudah dibetulkan lewat koreksi — angka ini tidak dipakai lagi (namanya dicoret) |
| ⚠️ | Nilainya tidak terbaca di HP ini — **datanya tetap ada di spreadsheet** |
| ID ✓ / ID ✕ | ID-Card sesuai / tidak sesuai |
| Uniform ✓ / ✕ | Seragam sesuai / tidak sesuai |
| Etika +2 / Etika -3 | Nilai etika hari itu |

Di atas daftar ada empat tombol saring: **Semua**, **⏳ Tertunda**,
**✅ Terkirim**, **🚫 Ditahan**.

Penilaian **hari ini** yang masih berlaku punya tombol **✏️ Perbaiki** — lihat
[bagian 5](#5-kalau-salah-pencet).

> **Riwayat hanya memuat data dari HP ini.** Kalau tiga pos memakai tiga HP,
> masing-masing punya riwayatnya sendiri. Gabungan semuanya ada di spreadsheet.

### 6b. Mengunduh rekap ke Excel

**Menu ☰ → 🗂️ Riwayat → 📄 Export Rekap CSV** (tombol paling bawah)

Sebuah berkas terunduh dengan nama seperti `rekap-penilaian-2026-08-02.csv`.
Buka dengan **Excel** atau **Google Sheets**.

Isinya lima bagian:

| Bagian | Isinya |
| --- | --- |
| **Keterangan atas** | Tanggal export, alamat server, jumlah total, terkirim, menunggu |
| **REKAP HARIAN PER GUIDE** | Satu baris per guide per tanggal — **inilah yang dicocokkan dengan spreadsheet** |
| **REKAP PER POS** | Jumlah penilaian di Pos 1, 2, 3 |
| **REKAP PER TANGGAL** | Berapa penilaian dan berapa guide berbeda tiap hari |
| **RINCIAN SEMUA PENILAIAN** | Semua baris lengkap dengan kode untuk dicocokkan |

Contoh bagian rekap harian:

```
Tanggal     Nama Guide          guideId  Regu     UNI FORM  ID  ETIKA  Pos
2026-08-02  Gusti Alit Astawa   G-001    A1       1         1   2      1
2026-08-02  I Gede Dauh         G-006    A2       1         1   -3     1 & 2
```

Angka **1** artinya sesuai, **0** artinya tidak sesuai.

---

# BAGIAN UNTUK ADMIN / KANTOR

---

## 8. Cara melihat data di spreadsheet

Semua penilaian dari **semua HP** berkumpul di satu spreadsheet Google bernama
**"Penilaian Guide Besakih — Basis Data"**.

### 7a. Membuka spreadsheet

1. Buka **Google Drive** dengan akun yang memiliki berkasnya
2. Cari **Penilaian Guide Besakih — Basis Data**
3. Klik dua kali untuk membuka

Di bagian bawah ada beberapa **tab** (semacam halaman):

| Nama tab | Isinya | Boleh diubah? |
| --- | --- | --- |
| `Petunjuk` | Keterangan singkat | Boleh |
| `Guides` | Daftar 296 nama guide | **Boleh** — lihat 7e |
| `Evaluations` | **Data mentah dari lapangan** | ❌ **Jangan diubah** |
| `Rekap A1 2026-08` | Rekap Asing Regu 1 | Ditimpa otomatis |
| `Rekap A2 2026-08` | Rekap Asing Regu 2 | Ditimpa otomatis |
| `Rekap D1 2026-08` | Rekap Domestik Regu 1 | Ditimpa otomatis |
| `Rekap D2 2026-08` | Rekap Domestik Regu 2 | Ditimpa otomatis |
| `Rekap Kehadiran 2026-08` | **Kehadiran harian tiap guide** | Ditimpa otomatis |
| `Rekap per Pos 2026-08` | Rincian per pos pemeriksaan | Ditimpa otomatis |
| `Dasbor 2026-08` | **Peringkat guide + grafik ketaatan** | Ditimpa otomatis |

Angka `2026-08` berarti **bulan Agustus 2026**. Tiap bulan dibuat tab baru.

### 7b. Membaca tab Rekap (yang paling sering dipakai)

Bentuknya sama persis dengan berkas **NILAI REWARD** yang selama ini dipakai:

```
REKAP PENILAIAN GUIDE — ASING REGU 1 — 2026-08        Diperbarui: 2 Agu 2026 20.15
REGU: 1 (Asing)   │  TGL: 2-8-2026     │  TGL: 3-8-2026     │      TOTAL
NAME              │ UNI FORM ID REVIEW ETIKA│ UNI FORM ID REVIEW ETIKA│ UNI FORM ID REVIEW ETIKA

Gusti Alit Astawa │    1     1    5     3   │    1     1    2     0   │    2     2    7     3
I Gede Astawa     │    1     0    0     0   │                         │    1     0    0     0
I Gede Budiarsana │                         │    0     1    1     2   │    0     1    1     2
```

Cara membacanya:

- **Satu baris = satu guide.** Semua anggota regu tercantum, termasuk yang
  belum pernah dinilai — jadi terlihat siapa yang belum diperiksa.
- **Tiap tanggal punya 4 kolom**: UNI FORM, ID, REVIEW, ETIKA
- **`1`** = sesuai · **`0`** = tidak sesuai · **kosong** = tidak bertugas atau
  belum diperiksa hari itu
- **Blok TOTAL** di paling kanan menjumlahkan seluruh tanggal secara otomatis

**Kalau satu guide dinilai di beberapa pos pada hari yang sama:**

| Kriteria | Yang dipakai |
| --- | --- |
| UNI FORM & ID | **Yang paling buruk.** Kalau di Pos 1 lengkap (1) tapi di Pos 3 tidak (0), yang tercatat **0** |
| ETIKA | **Yang paling rendah.** Pelanggaran di satu pos tidak tertutup nilai baik di pos lain |
| REVIEW | Tidak diisi aplikasi — **diketik manual** oleh tim, lihat catatan di bawah |

Rincian tiap pos tetap bisa dilihat di tab **`Rekap per Pos`**.

> **Kolom REVIEW diisi manual.** Ketik angkanya langsung di sel REVIEW pada tab
> rekap. Walau tab ini disusun ulang setiap malam, angka yang sudah diketik
> dibaca lebih dulu lalu ditulis kembali — jadi **tidak akan hilang**. Kuncinya
> nama guide + tanggal, jadi tetap aman meski urutan barisnya berubah.

### 7b-2. Membaca tab Kehadiran

Tab **`Rekap Kehadiran`** menjawab pertanyaan *"hari ini guide itu lewat berapa
pos?"*

```
KEHADIRAN GUIDE — 2026-08                          Diperbarui: 3 Agu 2026 08.15
Angka = berapa pos yang memeriksa guide itu pada hari tersebut (maksimal 3).
Diperiksa dua kali di pos yang sama pada hari yang sama tetap dihitung satu.

NAME                REGU    │ 2-8 │ 3-8 │ 4-8 │ TOTAL POS │ HARI HADIR
Gusti Alit Astawa   A1      │  2  │  3  │     │     5     │     2
I Gede Astawa       A1      │     │  1  │  1  │     2     │     2
I Gede Budiarsana   A1      │     │     │     │     0     │     0
            … dan seterusnya sampai 296 guide …

JUMLAH GUIDE HADIR          │  2  │  3  │  1  │    47     │
TOTAL KEHADIRAN POS         │  3  │  5  │  1  │    96     │
```

Cara membacanya:

| Yang terlihat | Artinya |
| --- | --- |
| Angka **1**, **2**, atau **3** | Jumlah pos yang memeriksa guide itu hari tersebut |
| **Kosong** | Tidak hadir atau tidak diperiksa sama sekali hari itu |
| **TOTAL POS** | Jumlah seluruh kehadiran pos sebulan |
| **HARI HADIR** | Berapa **hari** guide itu tercatat hadir, berapa pun jumlah posnya |

**Satu pos bernilai satu.** Kalau seorang guide diperiksa dua kali di Pos 1 pada
hari yang sama, angkanya tetap **1** — bukan 2. Ini berlaku otomatis, admin
tidak perlu membersihkan apa pun.

#### Berapa guide yang hadir hari itu?

Tabel di atas dibaca **menyamping**: satu guide, banyak tanggal. Untuk menjawab
*"tanggal 3 Agustus ada berapa guide yang hadir?"*, lihat **dua baris paling
bawah** — itu dibaca **menurun**:

| Baris | Artinya |
| --- | --- |
| **JUMLAH GUIDE HADIR** | Berapa **orang** guide yang hadir pada tanggal itu |
| **TOTAL KEHADIRAN POS** | Jumlah seluruh kunjungan pos hari itu |

Contoh pada tanggal 3-8 di atas: **3 guide** hadir, menghasilkan **5** kunjungan
pos — berarti sebagian dari mereka lewat lebih dari satu pos.

Di kolom **TOTAL POS**, baris `JUMLAH GUIDE HADIR` berarti hal yang sedikit
berbeda: berapa guide **berbeda** yang pernah hadir sepanjang bulan itu (contoh:
47 dari 296). Angka itu bukan penjumlahan angka harian, karena satu guide bisa
hadir berkali-kali.

Seluruh angka pada kedua baris ini berupa rumus, jadi kalau ada sel yang
dikoreksi manual totalnya ikut menyesuaikan sendiri.

### 7c. Membaca tab Dasbor — peringkat & grafik

Tab ini menjawab pertanyaan "siapa yang paling taat, siapa yang perlu
diingatkan, dan hari mana yang paling bermasalah". Isinya tiga bagian, dari atas
ke bawah.

**Bagian 1 — ringkasan harian, dipisah Asing & Domestik**

Satu baris per tanggal:

```
Tanggal    Hari    │ ASING (A1+A2) ......................│ DOMESTIK (D1+D2) ...
                   │ Hadir Uniform ID %Uni %ID Etika Rev │ Hadir Uniform ID ...
2026-08-01 Sabtu   │  42    40     39  95%  93%   12   3 │  18    18     17 ...
2026-08-02 Minggu  │  51    47     50  92%  98%   -4   0 │  22    21     22 ...
```

- **Hadir** — berapa guide kategori itu yang diperiksa hari itu
- **Uniform / ID** — berapa di antaranya yang sesuai
- **% Uniform / % ID** — persentasenya, inilah angka yang paling cepat dibaca
- **Etika / Review** — jumlah nilai etika dan review hari itu

Baris paling bawah adalah **TOTAL sebulan**.

> Dua kolom terakhir, **GABUNGAN**, adalah persentase Asing dan Domestik
> disatukan — itulah yang digambar grafiknya.

> ⚠️ Ada **15 guide** yang bertugas di Asing **dan** Domestik. Mereka terhitung
> di kedua kategori, jadi *Hadir Asing + Hadir Domestik* bisa lebih besar dari
> jumlah guide yang sesungguhnya diperiksa hari itu. Persentasenya tidak
> terpengaruh.

**Angka-angka ini rumus, bukan angka mati.** Begitu Anda memperbaiki kolom
REVIEW di tab Rekap regu, ringkasan harian di sini **langsung** ikut berubah —
tidak perlu menunggu rekap disusun ulang.

**Bagian 2 — grafik ketaatan harian**

Grafik garis dengan dua warna:

- **hijau** — % guide yang seragamnya sesuai
- **kuning** — % guide yang ID-Card-nya sesuai

Gunanya: melihat kriteria mana yang lebih sering dilanggar, dan apakah ada hari
tertentu (mis. akhir pekan atau hari raya) yang selalu turun.

**Bagian 3 — tujuh tabel peringkat**

| Tabel | Menjawab |
| --- | --- |
| 🏆 Nilai total tertinggi | Siapa yang paling layak reward |
| ⚠️ Nilai total terendah | Siapa yang paling perlu dibina |
| 👔 Paling taat berpakaian & ID | Siapa yang seragam & kartunya paling rapi |
| 👔 Paling tidak taat berpakaian & ID | Siapa yang paling sering tidak lengkap |
| 🤝 Etika tertinggi / terendah | Siapa yang paling baik & paling bermasalah sikapnya |
| ⭐ Menerima review paling banyak | Siapa yang paling banyak dipuji |

Tiap tabel memuat empat angka per guide:

| Kolom | Artinya |
| --- | --- |
| **Hari** | Berapa hari guide itu diperiksa bulan ini |
| **Jumlah Nilai** | Total Uniform + ID + Etika + Review — sama dengan blok TOTAL di tab Rekap |
| **Rata-rata** (atau **% Taat**) | Nilai per hari — **inilah yang dipakai mengurutkan** |
| **Rincian** | Pecahannya, mis. `Uniform 18/20 · ID 20/20` |

> **Kenapa diurut pakai rata-rata, bukan jumlah?** Kalau pakai jumlah, guide
> yang bertugas 20 hari otomatis mengalahkan yang bertugas 3 hari — peringkatnya
> jadi mengukur siapa yang paling rajin masuk, bukan siapa yang paling taat.
> Kehadiran sudah punya tabnya sendiri. Jumlahnya tetap ditampilkan karena
> itulah yang dipakai untuk reward berbasis akumulasi.

> **Minimal 3 hari** untuk masuk peringkat. Tanpa batas ini, guide yang
> kebetulan diperiksa sekali saja dengan nilai sempurna akan duduk di peringkat
> 1. Yang belum cukup hari **tidak dihilangkan** — ada tabel
> *"Belum cukup hari"* sendiri di bawah.

> Peringkat **review** tidak memakai batas 3 hari, karena review diketik manual
> oleh tim dan tidak tergantung kehadiran.

### 7c-2. Membaca tab Rekap Mingguan

Satu tab per minggu, namanya misalnya **`Rekap Mingguan 28 Sep-4 Okt 2026`**.

- **Satu minggu = Senin s.d. Minggu.** Minggu yang melintasi bulan tetap satu
  minggu utuh — 28 Sep–4 Okt adalah satu tab, bukan dua.
- Tab **minggu berjalan** diperbarui sendiri, **paling lambat sejam** setelah
  penilaian masuk — sengaja tidak tiap 5 menit, supaya penilaian yang sedang
  masuk dari HP tidak ikut antre. Perlu angka terbaru sekarang juga? Pakai menu
  **Perbarui Rekap Minggu Ini**. Tiap malam pukul 23.00 minggu berjalan **dan
  minggu lalu** disusun ulang, supaya penilaian dari HP yang baru mendapat
  sinyal ikut masuk.
- Muncul pesan **"spreadsheet sedang dipakai proses lain"**? Rekap otomatis
  atau penilaian dari HP sedang memakai spreadsheet lebih dari 2 menit. Tidak
  ada data yang hilang — coba lagi beberapa menit kemudian.
- Minggu lain: menu **Penilaian Guide → Rekap Minggu Lain…**, lalu ketik tanggal
  mana saja di minggu itu, misalnya `15-9-2026`.

Susunannya:

```
Baris 4       SELURUH GUIDE · 187/314 dinilai    ← tetap terlihat saat digulir
Baris 5–10    REGU A1, REGU A2, SUB ASING, REGU D1, REGU D2, SUB DOMESTIK
Baris 12 dst  seluruh guide, urut regu lalu nama
```

| Kolom | Artinya |
| --- | --- |
| UNI FORM · ID · REVIEW · ETIKA | Jumlah nilai seluruh pengantaran minggu itu — sama seperti blok TOTAL di tab Rekap regu |
| ANTAR | Berapa pengantaran yang dinilai |
| PATUH | Berapa di antaranya berpakaian sesuai (+1 atau +2) |
| NILAI TOTAL | Uni Form + ID + Review + Etika |
| **RATA** | Nilai total ÷ Antar — **pembanding yang adil antar guide** |
| % UNIFORM · % ID | Patuh ÷ Antar, dan ID ÷ Antar |
| MUTU UNI | Rata-rata nilai Uniform, skala −1 s.d. +2 |
| HARI HADIR | Berapa hari guide itu dinilai minggu ini |

Sel kosong = guide itu tidak dinilai minggu ini, **bukan** nol.

> ⚠️ **Jangan mengetik REVIEW di tab mingguan.** Angkanya dibaca dari tab
> **Rekap regu bulanan** — ketik atau perbaiki di sana. Tab mingguan ditulis
> ulang otomatis, jadi ketikan di tab ini akan hilang.

> Rekap mingguan untuk **memantau**, bukan dasar reward — reward tetap memakai
> rekap bulanan. Karena satu minggu bisa melintasi bulan, angka beberapa minggu
> dijumlahkan tidak selalu sama persis dengan angka satu bulan.

### 7d. ⏰ Cap "Diperbarui"

Di **pojok kanan atas** tiap tab rekap ada tulisan seperti:

```
Diperbarui: 2 Agu 2026 20.15
```

**Ini penting.** Tab rekap tidak diperbarui setiap detik — disusun ulang oleh
sistem **tiap 5 menit** kalau ada penilaian baru masuk.

Jadi kalau rekap terlihat kosong padahal staff baru saja mengirim:

1. **Lihat capnya dulu.** Kalau waktunya lama, rekapnya memang belum disusun —
   **bukan datanya hilang**.
2. Buka tab **`Evaluations`**. Kalau baris barunya ada di sana, **data sudah
   aman**.
3. Tunggu 5 menit, atau paksa sekarang lewat menu (lihat 7e).

### 7e. Menambah atau menonaktifkan guide

Buka tab **`Guides`**:

| guideId | guideName | kategori | regu | aktif |
| --- | --- | --- | --- | --- |
| G-001 | Gusti Alit Astawa | Asing | A1 | TRUE |

- **Menambah guide baru** — tambahkan baris baru di paling bawah. Kode
  `guideId` harus unik, misalnya `G-297`.
- **Menonaktifkan guide** — ubah kolom `aktif` dari `TRUE` menjadi `FALSE`.
  Namanya hilang dari aplikasi tapi data lamanya tetap utuh. **Jangan menghapus
  barisnya.**
- Kolom `regu` boleh berisi lebih dari satu, dipisah koma: `A1, D1`

Perubahan sampai ke HP staff dalam hitungan menit — atau langsung, dengan
menekan **Pengaturan → Tes Koneksi Server** di HP.

### 7f. Menu khusus di spreadsheet

Di deretan menu atas (sebelah **Help**) ada menu **Penilaian Guide**:

| Pilihan menu | Kegunaan |
| --- | --- |
| **Perbarui Rekap Bulan Ini** | Susun ulang rekap sekarang juga, tidak perlu menunggu 5 menit |
| **Perbarui Rekap Bulan Lalu** | Untuk menutup laporan bulan sebelumnya |
| **Perbarui Rekap Minggu Ini** | Susun ulang tab rekap minggu berjalan sekarang juga (lihat 7c-2) |
| **Perbarui Rekap Minggu Lalu** | Senin–Minggu sebelumnya — biasanya dibuka tiap Senin |
| **Rekap Minggu Lain…** | Ketik tanggal mana saja, mis. `15-9-2026`; minggu yang memuat tanggal itu yang disusun |
| **Nyalakan Pembaruan Otomatis** | Memasang jadwal otomatis. Cukup sekali |
| **Periksa Kesehatan Data** | **Paling berguna saat ada masalah** — lihat di bawah |

**Periksa Kesehatan Data** menampilkan laporan seperti ini:

```
Total penilaian tersimpan     : 128
Penilaian bulan ini (2026-08) : 47
Penilaian terakhir masuk      : 2026-08-02T07:55:29.825Z
Trigger otomatis aktif        : 1 buah
Guide terdaftar di tab Guides : 296
✅ Semua guideId dikenal — tidak ada baris yang tercecer
```

Sekaligus menyusun ulang rekap. **Kalau bingung, tekan ini dulu.**

> Menu tidak terlihat? Tutup spreadsheet, buka lagi, tunggu 10 detik.

---

## 9. Cara mencocokkan HP dengan spreadsheet

Berguna untuk memastikan tidak ada penilaian yang tercecer.

### Langkahnya

1. **Di HP staff:** Menu ☰ → Riwayat → **📄 Export Rekap CSV**
2. Kirim berkas itu ke komputer (WhatsApp, email, kabel — bebas)
3. **Di komputer:** buka berkas dengan Excel
4. Lihat bagian **REKAP HARIAN PER GUIDE**
5. **Di spreadsheet:** buka tab rekap regu yang sesuai, misalnya `Rekap A1 2026-08`
6. Bandingkan baris per baris untuk tanggal yang sama

### Cara membacanya

Angka di kedua tempat dihitung dengan **aturan yang persis sama**, jadi:

| Hasil perbandingan | Artinya |
| --- | --- |
| **Angkanya sama** | ✅ Semua sudah sampai server, aman |
| **Ada di HP, tidak ada di spreadsheet** | ⚠️ Ada yang belum terkirim — cek angka *Menunggu Sync* di HP, tekan **Kirim Sekarang** |
| **Ada di spreadsheet, tidak ada di HP** | ✅ Normal — itu penilaian dari HP lain |
| **Angka berbeda untuk guide dan tanggal yang sama** | Cek tab `Rekap per Pos`; kemungkinan ada penilaian dari pos lain yang menggabung |

### Kalau perlu memeriksa satu baris tertentu

Di bagian **RINCIAN SEMUA PENILAIAN** pada berkas CSV ada dua kolom terakhir:

- **Waktu (UTC, sama dgn spreadsheet)** — contoh `2026-08-02T07:55:29.825Z`
- **evaluationId** — kode panjang seperti `e796ff8a-7acb-4c47-b468-6aa256658def`

Salin salah satunya, lalu di spreadsheet buka tab **`Evaluations`** dan tekan
**Ctrl+F**, tempel kodenya. Kalau ketemu, penilaian itu **sudah pasti sampai**.

---

## 10. Kalau ada masalah

### ❓ "Hasil penilaian tidak muncul di spreadsheet"

Kerjakan berurutan:

1. **Buka tab `Evaluations` dulu, bukan tab Rekap.** Kalau baris barunya ada di
   sana, **data sudah aman** — tinggal menunggu rekap disusun.
2. **Lihat cap "Diperbarui"** di pojok kanan atas tab rekap. Kalau waktunya
   lama, rekapnya memang belum disusun ulang.
3. Menu **Penilaian Guide → Periksa Kesehatan Data**. Perhatikan barisnya:
   - `Trigger otomatis aktif : 0 buah` → tekan **Nyalakan Pembaruan Otomatis**
   - `⚠️ guideId tidak dikenal` → ada penilaian atas guide yang tidak ada di
     tab `Guides`; tambahkan guide tersebut lalu ulangi
4. **Di HP staff:** lihat angka **Menunggu Sync** di Beranda. Kalau lebih dari
   0, datanya memang belum dikirim. Cari sinyal, tekan **Kirim Sekarang**.

### ❓ "Ada penilaian bertanda 🚫 Ditahan"

Server menolak penilaian itu **6 kali berturut-turut**, jadi aplikasi berhenti
mencobanya — daripada memutar percobaan yang gagal tiap menit selamanya.

**Datanya tidak hilang.** Alasan penolakannya tertulis persis di bawah entri
tersebut di layar Riwayat. Yang paling sering:

| Alasan yang tertulis | Yang perlu dilakukan |
| --- | --- |
| `guideId "G-xxx" tidak ada di tab Guides` | Tambahkan guide itu di tab `Guides`, lalu tekan **🔄 Coba lagi** di HP |
| `sudah dinilai di Pos … satu pos hanya menilai satu kali per hari` | Memang tidak boleh ganda. Kalau maksudnya membetulkan nilai, pakai tombol **✏️ Perbaiki** (bagian 5) |
| `penilaian yang diperbaiki … tidak ada di server` | Penilaian aslinya belum sampai. Tekan **Kirim Sekarang** dulu, baru **🔄 Coba lagi** |

Setelah penyebabnya dibereskan, tekan **🔄 Coba kirim lagi semua** di kotak
kuning atas layar Riwayat.

### ❓ "Muncul peringatan jam perangkat meleset"

Jam HP-nya berbeda jauh dari jam server. Ini penting karena penilaian
dikelompokkan **per tanggal** — jam yang meleset bisa melempar penilaian ke
tanggal yang salah di rekap.

**Penilaian tetap dicatat pada waktu yang benar** — aplikasi mengoreksinya
sendiri begitu pernah terhubung ke server. Tapi sebaiknya jamnya dibetulkan:

**Pengaturan HP → Tanggal & waktu → aktifkan "Otomatis"** (gunakan waktu yang
diberikan jaringan).

### ❓ "Muncul peringatan cadangan lokal gagal disimpan"

Penyimpanan HP untuk aplikasi ini sudah penuh.

1. Pastikan angka **Menunggu Sync** di Beranda sudah 0 (kalau belum, tekan
   **Kirim Sekarang** dan cari sinyal)
2. Menu ☰ → **⚙️ Pengaturan** → **🧹 Hapus Data Terkirim**

Data yang sudah terkirim tetap aman di spreadsheet.

### ❓ "Muncul tanda ⚠️ dan tulisan (data rusak) di Riwayat"

Artinya nilai penilaian itu **tidak bisa dibuka di HP ini** — biasanya karena
browser membersihkan penyimpanannya.

**Datanya tidak hilang.** Kalau statusnya "Terkirim", baris itu tetap ada di
spreadsheet. Cari kodenya di tab `Evaluations` dengan Ctrl+F.

Yang perlu dilakukan: **tidak ada.** Penilaian berikutnya tetap normal.
Jangan menekan "Hapus Data Terkirim" kalau belum dicek di spreadsheet.

### ❓ "Server tidak dapat dihubungi"

1. Cek dulu HP-nya benar-benar ada internet — coba buka situs lain
2. Menu ☰ → **Pengaturan** → **📡 Tes Koneksi Server**
3. Kalau berhasil, muncul: `✅ Terhubung · 128 data di server`
4. Kalau gagal:
   - Pastikan kotak **Mode Offline Paksa** dalam keadaan **mati**
   - Lihat kotak *"Sedang terhubung ke:"* — seharusnya berisi alamat yang
     diawali `https://script.google.com/`
   - Kalau kosong atau salah, hubungi admin

**Sementara itu tetap boleh menilai** — data tersimpan dan terkirim nanti.

### ❓ "Nama guide tidak ada di daftar"

1. Coba ketik hanya sebagian nama, misalnya `Wayan Sud` bukan nama lengkap
2. Cek kotak **Kategori** dan **Regu** di atas — mungkin sedang menyaring regu
   yang salah. Pilih **Semua** pada keduanya.
3. Kalau memang belum terdaftar, admin harus menambahkannya di tab `Guides`
   (lihat 7e)

### ❓ "Aplikasi terasa versi lama"

Aplikasi memperbarui diri sendiri tiap jam. Untuk memaksa:

1. Tutup aplikasi sepenuhnya (usap dari daftar aplikasi berjalan)
2. Buka lagi
3. Cek nomor versinya di Menu ☰ → **Tentang**

### ❓ "HP staff hilang atau rusak"

Semua penilaian yang berstatus ✅ **sudah ada di spreadsheet** dan tidak
terpengaruh. Yang hilang hanya penilaian yang masih ⏳ di HP itu.

Pencegahan: biasakan memastikan **Menunggu Sync = 0** sebelum pulang.

---

## 11. Pengaturan lanjutan

**Menu ☰ → ⚙️ Pengaturan**

| Pengaturan | Penjelasan | Sebaiknya |
| --- | --- | --- |
| **Alamat Server** | Alamat server pusat | **Biarkan kosong.** Aplikasi sudah membawa alamat bawaan |
| **Mode Offline Paksa** | Sengaja tidak pernah mengirim | **Mati** |
| **Enkripsi Data Lokal** | Mengunci data di HP | **Nyala** |
| **Getar saat Simpan** | Getaran sebagai tanda tersimpan | Sesuai selera |

Tombol-tombolnya:

| Tombol | Kegunaan | Hati-hati |
| --- | --- | --- |
| 📡 **Tes Koneksi Server** | Memastikan server bisa dihubungi | Aman |
| 🔄 **Force Sync** | Mengirim ulang semua yang tertunda | Aman |
| 📦 **Export Cadangan JSON** | Menyimpan seluruh data mentah ke berkas | Aman |
| 🧹 **Hapus Data Terkirim** | Mengosongkan penyimpanan HP | ⚠️ **Pastikan sudah dicek di spreadsheet dulu** |

Di layar ini juga bisa muncul dua kotak pemberitahuan:

| Kotak | Artinya |
| --- | --- |
| **⚠️ Cadangan lokal gagal disimpan** / **ℹ️ Cadangan dipangkas** | Penyimpanan HP hampir habis. Kirim semua data lalu tekan **Hapus Data Terkirim** |
| **🕐 Jam perangkat meleset …** | Jam HP berbeda dari jam server. Cap waktu penilaian sudah dikoreksi otomatis, tapi sebaiknya jam HP dibetulkan lewat Pengaturan HP → Tanggal & waktu → Otomatis |

Di paling bawah ada batang **Penyimpanan lokal**. Kalau berubah merah dan
tertulis *"hampir penuh"*, kirim semua data lalu tekan **Hapus Data Terkirim**.

---

## 12. Pertanyaan yang sering muncul

**Apakah perlu internet untuk menilai?**
Tidak. Internet hanya dibutuhkan agar data terkirim ke pusat, dan itu terjadi
otomatis begitu ada sinyal.

**Berapa lama sampai muncul di spreadsheet?**
Tab `Evaluations`: beberapa detik. Tab `Rekap`: paling lambat sekitar 6 menit.

**Apakah perlu menekan tombol kirim tiap selesai menilai?**
Tidak. Terkirim sendiri. Tombol **Kirim Sekarang** hanya untuk mempercepat.

**Bagaimana kalau salah menilai?**
Untuk penilaian **hari ini**: buka Riwayat, tekan **✏️ Perbaiki** pada
penilaian itu, ubah nilainya, simpan. Data tidak pernah dihapus — yang lama
ditandai `diganti` di spreadsheet dan rekap memakai yang baru. Selengkapnya di
[bagian 5](#5-kalau-salah-pencet). Untuk hari-hari sebelumnya, beri tahu admin.

**Bisakah dua HP menilai guide yang sama di hari yang sama?**
Bisa, dan itu wajar karena satu guide melewati beberapa pos. Rekap
menggabungkannya: UNI FORM, ID, dan ETIKA diambil yang paling buruk.
Rinciannya tetap ada di tab `Rekap per Pos`.

**Kalau guide yang sama dinilai dua kali di pos yang sama?**
**Tidak bisa.** Satu pos hanya menilai satu kali per hari untuk tiap guide.
Kalau maksudnya membetulkan nilai yang sudah tercatat, pakai tombol
**✏️ Perbaiki**.
Begitu namanya dipilih, aplikasi langsung memberi tahu:

> 🚫 I Kadek Korya sudah dinilai di Pos 1 pukul 09.15 — Uniform Ya, ID Ya,
> Etika +2. Satu pos menilai satu kali sehari. Guide ini masih bisa dinilai di
> pos lain.

**Pos lain tetap boleh menilai guide itu.** Guide yang lewat Pos 1, Pos 2, dan
Pos 3 akan tercatat hadir **3**.

Aturan ini ditegakkan di **server**, bukan cuma di HP. Jadi walaupun Pos 1 dan
Pos 2 memakai HP berbeda, penilaian kedua untuk pos yang sama tetap ditolak.
Kalau penolakan terjadi setelah data terkirim, alasannya muncul di layar
**Riwayat** pada entri yang bersangkutan.

**Bagaimana kalau salah pencet?**
Penilaian yang sudah masuk tidak bisa diperbaiki dari aplikasi — sifatnya
tambah-saja. Hubungi admin untuk memperbaiki barisnya langsung di tab
`Evaluations`.

**Apakah data saya bisa dibaca orang lain kalau HP hilang?**
Data di HP terenkripsi (AES-256). Namun tetap biasakan HP dinas dikunci dengan
PIN atau sidik jari.

**Kenapa Etika pakai angka, bukan Ya/Tidak?**
Karena etika bukan soal sesuai / tidak sesuai, melainkan soal derajat. Rentang
−5 sampai +5 memungkinkan pelanggaran berat mengurangi nilai dan sikap yang
sangat baik menambah nilai.

**Kenapa kolom REVIEW masih ada padahal tidak diisi di aplikasi?**
Karena angka review datang dari sumber lain, bukan dari pemeriksaan di pos.
Kolomnya sengaja dipertahankan di tab rekap supaya formatnya tetap sama dengan
berkas NILAI REWARD, dan tim mengisinya manual.

**Apakah bisa dipakai di komputer?**
Bisa. Buka alamat yang sama di Chrome atau Edge pada komputer.

---

## Ringkasan satu halaman

**Untuk staff:**

1. Buka ikon 🛕 di HP
2. Pilih pos → tekan **PENILAIAN BARU**
3. Saring Kategori & Regu → pilih nama guide sampai muncul tanda ✓ hijau
4. Isi **Uniform**, **ID-Card**, **Etika**
5. Tekan **SIMPAN**
6. Salah pencet? Riwayat → **✏️ Perbaiki** (hanya penilaian hari ini)
7. Sebelum pulang: pastikan **Menunggu Sync = 0** dan tidak ada tanda 🚫

**Untuk admin:**

1. Buka spreadsheet → tab **`Dasbor`** untuk peringkat & grafik, tab
   **`Rekap A1/A2/D1/D2`** untuk laporan bulanan
2. Cek cap **"Diperbarui"** di pojok kanan atas
3. Kalau ada yang janggal → menu **Penilaian Guide → Periksa Kesehatan Data**
4. Untuk memastikan tidak ada yang tercecer → bandingkan dengan
   **Export Rekap CSV** dari tiap HP

---

*Alur teknis lengkap beserta diagramnya: [`ALUR-APLIKASI.md`](ALUR-APLIKASI.md)*
