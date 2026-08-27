# Panduan Deploy dari Nol — Spreadsheet Baru + Vercel

Panduan ini mengantar dari nol sampai aplikasi terpasang di HP staff. Dikerjakan
berurutan dari atas ke bawah — **jangan melompat**, karena beberapa langkah
harus lebih dulu dari yang lain (paling penting: **A2 sebelum A3**).

Perkiraan waktu: **45–60 menit**, ditambah waktu memindahkan HP staff satu per satu.

## Yang perlu disiapkan

| Perlu | Keterangan |
| --- | --- |
| Akun Google | Yang akan memiliki spreadsheet baru. Sebaiknya akun kantor, bukan pribadi |
| Akun GitHub | Untuk repo baru |
| Akun Vercel | Daftar di [vercel.com](https://vercel.com) — bisa login pakai akun GitHub |
| Node.js ≥ 18 di komputer | Cek: `node --version` |
| Git di komputer | Cek: `git --version` |
| Akses ke spreadsheet LAMA | Hanya untuk menyalin daftar guide (langkah A2) |

> **Yang TIDAK dipindahkan:** 970+ penilaian di spreadsheet lama. Sesuai
> keputusan, yang dibawa hanya **daftar nama guide**. Spreadsheet lama tetap
> ada — jangan dihapus, itu satu-satunya tempat laporan bulan-bulan sebelumnya.

---

# BAGIAN A — Spreadsheet & backend baru

## A1. Buat spreadsheet baru

1. Buka [drive.google.com](https://drive.google.com)
2. **+ Baru → Google Spreadsheet → Spreadsheet kosong**
3. Klik judulnya di kiri atas, ganti menjadi:
   **`Penilaian Guide Besakih — Basis Data 2026`**

Biarkan tab `Sheet1` yang kosong itu — nanti dibuang sendiri oleh `setup()`.

## A2. Salin daftar guide dari spreadsheet lama — SEBELUM langkah A3

> ⚠️ **Urutannya penting.** `setup()` di langkah A3 hanya menulis ulang daftar
> guide kalau tab `Guides` masih kosong. Kalau Anda menyalin tab `Guides`
> **setelah** `setup()`, tidak masalah — tapi kalau `setup()` dijalankan lebih
> dulu, ia mengisi tab itu dengan daftar 296 guide bawaan dari kode (keadaan
> 13 Agustus 2026). Perubahan yang tim buat setelah tanggal itu — guide baru,
> atau yang di-set `aktif = FALSE` — tidak akan terbawa.

1. Buka spreadsheet **lama**
2. Klik kanan pada tab **`Guides`** di bagian bawah
3. Pilih **Salin ke → Spreadsheet yang ada** (*Copy to → Existing spreadsheet*)
4. Pilih spreadsheet baru yang Anda buat di A1, tekan **Sisipkan**
5. Buka spreadsheet **baru**. Akan ada tab bernama **`Salinan Guides`**
6. Klik kanan tab itu → **Ganti nama** → tulis persis: **`Guides`**

Periksa: baris 1 tab `Guides` harus berbunyi
`guideId | guideName | kategori | regu | aktif`, dan di bawahnya ada daftar
namanya. Kalau ya, lanjut.

> Kalau tab `Guides` di spreadsheet lama **belum pernah disunting** sejak
> dibuat, langkah A2 boleh dilewati — `setup()` akan mengisi 296 guide bawaan
> yang isinya sama.

## A3. Tempel backend & jalankan `setup()`

1. Di spreadsheet **baru**: menu **Ekstensi → Apps Script**
2. Hapus seluruh isi editor (`Ctrl+A`, lalu `Delete`)
3. Jalankan **`npm run build:gas`** dulu — perintah itu menggabungkan 11 berkas
   `server-gas/*.gs` menjadi satu **`server-gas/Code.gs`** yang siap ditempel.
   (Kalau memakai `clasp`, lewati langkah ini: `clasp push` mengirim ke-11 berkas
   apa adanya. Untuk versi baru pakai `clasp deploy -i <deploymentId>` — `clasp
   deploy` polos membuat deployment BARU berikut URL baru.)
   Lalu buka berkas **`server-gas/Code.gs`** hasilnya,
   pilih semua isinya, tempel ke editor Apps Script
4. Simpan (`Ctrl+S`)
5. Di dropdown fungsi di atas (biasanya berbunyi `ss_`), pilih **`setup`**
6. Tekan **Run** (▷)
7. Google akan meminta izin: **Review permissions → pilih akun → Advanced →
   Go to (nama proyek) (unsafe) → Allow**.
   Peringatan "unsafe" itu wajar: skrip ini memang belum diverifikasi Google,
   dan yang memberinya izin adalah Anda sendiri sebagai pemiliknya.
8. Tunggu sampai selesai (10–30 detik). Lihat kotak **Execution log** di bawah —
   di situ tertulis hasilnya.

### Periksa hasilnya — ini pemeriksaan terpenting di seluruh panduan

Kembali ke spreadsheet. Harus ada tab-tab ini:

- `Guides` — daftar guide (yang Anda salin di A2, atau 296 bawaan)
- `Evaluations` — masih kosong, hanya baris judul
- `Petunjuk` — keterangan singkat

Sekarang buka tab **`Evaluations`** dan periksa **baris 1**. Harus ada
**13 kolom**, berakhir dengan dua kolom ini:

```
… | catatan | receivedAt | koreksiDari | status
```

**Kalau dua kolom terakhir itu tidak ada**, berarti yang Anda tempel bukan
`Code.gs` versi terbaru — pastikan `npm run build:gas` sudah dijalankan setelah
  perubahan terakhir. Ulangi dari A3 langkah 2 dengan berkas yang benar.
Jangan lanjut sebelum ini benar — seluruh fitur koreksi dan tab Dasbor
bergantung padanya.

## A4. Deploy jadi Web App & salin alamatnya

1. Di editor Apps Script, tekan **Deploy → New deployment**
2. Klik ikon gerigi di sebelah *Select type* → pilih **Web app**
3. Isi:

   | Kolom | Isi |
   | --- | --- |
   | Description | `v1` |
   | Execute as | **Me** (akun Anda) |
   | Who has access | **Anyone** |

4. Tekan **Deploy**, setujui izin bila diminta
5. Salin **Web app URL** — bentuknya:
   `https://script.google.com/macros/s/AKfycb....../exec`
6. **Simpan alamat itu di tempat aman** (Notepad). Anda butuh di langkah B2.

> *Who has access: **Anyone*** memang wajib — HP staff mengirim tanpa login.
> Konsekuensinya: siapa pun yang menemukan alamat itu bisa **menambah** baris
> penilaian. Yang tidak bisa dilakukan dari luar: membaca daftar penilaian,
> mengubahnya, atau menghapusnya. Alamatnya juga hanya menerima `guideId` yang
> terdaftar di tab `Guides`.

## A5. Pastikan rekap otomatis menyala

`setup()` sudah memasangnya, tapi pastikan:

1. Kembali ke spreadsheet, **tutup lalu buka lagi** (perlu, supaya menunya muncul)
2. Tunggu ±10 detik → muncul menu baru **Penilaian Guide** di bar menu atas
3. Menu **Penilaian Guide → Periksa Kesehatan Data**
4. Pada kotak yang muncul, cari baris:
   - `Trigger otomatis aktif : 1 buah` → bagus
   - `✅ Zona waktu spreadsheet : Asia/Makassar (WITA)` → bagus
   - Kalau trigger terhitung **0**: menu **Penilaian Guide → Nyalakan Pembaruan
     Otomatis**

---

# BAGIAN B — Repo baru

## B1. Ekstrak salinan aplikasi

Ekstrak `penilaian-guide-besakih.zip` ke folder baru, mis.
`D:\Besakih\penilaian-guide` (**bukan** ke folder proyek yang lama).

## B2. Isikan alamat backend

1. Buka berkas **`public/config.js`** dengan editor teks (VS Code, Notepad++)
2. Cari baris paling bawah yang berbunyi `serverUrl: '...'`
3. Ganti isi tanda kutipnya dengan alamat `/exec` dari langkah A4:

   ```js
   window.APP_CONFIG = {
     serverUrl: 'https://script.google.com/macros/s/AKfycb....../exec',
   };
   ```

4. Simpan

> Pastikan alamatnya berakhiran **`/exec`**, bukan `/dev`. Yang `/dev` hanya
> bisa dibuka oleh Anda sendiri dan akan selalu gagal dari HP staff.

## B3. Jalankan pengujian di komputer

Buka terminal di folder itu (di VS Code: **Terminal → New Terminal**):

```bash
npm install
node server-gas/test-gas.mjs
node test/app.test.mjs
```

Yang harus muncul:

```
148/148 pemeriksaan lulus
144/144 pemeriksaan lulus
```

Kalau ada yang gagal, **berhenti di sini** dan laporkan angkanya — jangan
di-deploy. Uji ini juga memastikan `config.js` sudah berisi alamat yang sah.

Sekalian coba jalankan lokal:

```bash
node server/server.js
```

Buka `http://localhost:3000` di browser komputer. Aplikasinya harus muncul.
Tekan `Ctrl+C` di terminal untuk mematikannya lagi.

> Yang berjalan di `localhost:3000` itu backend REST bawaan, **bukan**
> spreadsheet Anda. Untuk menguji ke spreadsheet, pakai aplikasi yang sudah
> ter-deploy di Bagian C.

## B4. Buat repo GitHub baru & push

1. Di [github.com/new](https://github.com/new): buat repo baru, mis.
   `penilaian-guide-besakih` — **kosong**, jangan centang "Add a README file"
2. Di terminal, dari folder aplikasi:

```bash
git init
git add -A
git commit -m "Aplikasi Penilaian Guide Kawasan Besakih"
git branch -M main
git remote add origin https://github.com/<akun-anda>/<repo-baru>.git
git push -u origin main
```

3. Refresh halaman repo di GitHub — berkasnya harus sudah muncul

> Repo ini **publik**, dan `public/config.js` memuat alamat `/exec` Anda. Itu
> memang konsekuensi yang sudah diterima (lihat catatan di A4). Kalau tidak
> nyaman, buat repo-nya **Private** — Vercel tetap bisa men-deploy repo privat.

---

# BAGIAN C — Deploy ke Vercel

## C1. Import repo

1. Buka [vercel.com](https://vercel.com), login (paling mudah: **Continue with
   GitHub**)
2. **Add New → Project**
3. Cari repo baru Anda di daftar, tekan **Import**
   - Kalau repo-nya tidak muncul: **Adjust GitHub App Permissions** →
     beri Vercel akses ke repo itu

## C2. Atur — hanya dua hal

Pada halaman *Configure Project*:

| Pengaturan | Yang harus dilakukan |
| --- | --- |
| **Framework Preset** | pilih **Other** |
| **Build Command** | buka *Build and Output Settings* → nyalakan **Override** pada Build Command → **biarkan kosong** |
| Output Directory | **jangan diisi** — sudah diatur `vercel.json` ke `public` |
| Install Command | **jangan diisi** — sudah diatur `vercel.json` |
| Environment Variables | **tidak ada.** Aplikasi ini tidak memakai satu pun |

Build Command yang dikosongkan itu yang membuat Vercel **melewati proses build**
dan langsung menyajikan berkasnya apa adanya — memang begitu yang dibutuhkan
aplikasi tanpa framework.

## C3. Deploy

Tekan **Deploy**. Tunggu 20–60 detik sampai muncul layar ucapan selamat.

Alamat aplikasinya berbentuk `https://<nama-proyek>.vercel.app`.
**Catat alamat itu** — inilah yang akan dipasang di HP staff.

## C4. Periksa hasilnya dari komputer dulu

Buka alamat `.vercel.app` itu di **Chrome di komputer**:

1. Aplikasinya muncul, dengan tutorial 4 langkah → tekan **Lewati**
2. Menu ☰ → **⚙️ Pengaturan**
3. Pada kotak **"Sedang terhubung ke:"** harus tertulis alamat
   `script.google.com/...` Anda, dengan keterangan
   *"Alamat bawaan aplikasi — tidak perlu diubah."*
4. Tekan **📡 Tes Koneksi Server**. Harus muncul:
   **✅ Terhubung · 0 data di server**
5. Menu ☰ → **👥 Daftar Guide** → harus tampil daftar namanya

**Kalau "Tes Koneksi Server" gagal**, jangan lanjut ke HP staff — lihat
Bagian F.

## C5. Uji satu penilaian sungguhan

Masih di Chrome komputer:

1. Menu ☰ → **📝 Penilaian Baru**
2. Pilih Pos 1, pilih satu nama guide sampai muncul tanda **✓** hijau
3. Isi ID-Card **Ya**, Uniform **Ya**, Etika biarkan **0**
4. Tekan **SIMPAN PENILAIAN**
5. Harus muncul `💾 Penilaian tersimpan`, lalu
   `✅ 1 data terkirim · rekap spreadsheet menyusul ±5 menit`
6. Buka spreadsheet → tab **`Evaluations`** → **harus ada 1 baris baru**

Kalau baris itu ada, seluruh rantai sudah tersambung: aplikasi → Vercel →
Apps Script → spreadsheet.

7. Tunggu ±5 menit, atau paksa sekarang: menu **Penilaian Guide → Perbarui
   Rekap Bulan Ini**. Akan muncul tab baru: `Rekap A1 …` dst,
   `Rekap Kehadiran …`, `Rekap per Pos …`, dan **`Dasbor …`**

Setelah yakin, hapus baris uji itu dari tab `Evaluations` (klik kanan barisnya →
Hapus baris), lalu perbarui rekap sekali lagi.

---

# BAGIAN D — Pindahkan HP staff

Bagian ini yang paling mudah membuat data tercecer, jadi kerjakan **satu HP
selesai baru pindah ke HP berikutnya**.

## D1. Kosongkan antrean di aplikasi LAMA — wajib

Pada setiap HP, buka aplikasi **yang lama** dulu:

1. Lihat angka **Menunggu Sync** di layar Beranda
2. Kalau lebih dari **0**: cari sinyal, tekan **🔄 Kirim Sekarang**, tunggu
   sampai angkanya **0**
3. Buka ☰ → **🗂️ Riwayat** → pastikan tidak ada entri bertanda **🚫 Ditahan**.
   Kalau ada, tekan **🔄 Coba kirim lagi semua**

> Penilaian yang masih menunggu di aplikasi lama akan terkirim ke **spreadsheet
> lama**. Kalau aplikasinya dihapus sebelum antreannya kosong, penilaian itu
> hilang — tidak ada di mana pun.

## D2. Hapus aplikasi lama dari HP

- **Android:** tekan lama ikon 🛕 → **Uninstall** / **Hapus**
- **iPhone:** tekan lama ikon → **Hapus dari Home Screen**

Lalu bersihkan datanya juga supaya tidak ada sisa yang membingungkan:

- **Android/Chrome:** ⋮ → Setelan → Setelan situs → Semua situs → cari
  `agusgod123.github.io` → **Hapus & setel ulang**
- **iPhone/Safari:** Pengaturan → Safari → Lanjutan → Data Situs Web →
  cari situsnya → geser untuk hapus

## D3. Pasang aplikasi baru

1. Buka **Chrome** (Android) atau **Safari** (iPhone)
2. Buka alamat `.vercel.app` dari langkah C3
3. Tunggu aplikasinya muncul penuh
4. Pasang:
   - **Android/Chrome:** ⋮ → **Tambahkan ke layar utama** / **Instal aplikasi**
   - **iPhone/Safari:** tombol **Bagikan** → **Tambah ke Layar Utama**
5. Tutup browser, buka aplikasi dari ikon 🛕 di layar utama

## D4. Periksa HP itu sebelum ditinggal

Di aplikasi yang baru, pada HP itu:

1. ☰ → **⚙️ Pengaturan** → kotak **"Sedang terhubung ke:"** harus menampilkan
   alamat `script.google.com/...` yang **baru**
2. Kolom **Alamat Server** di bawahnya harus **KOSONG**.
   Kalau ada isinya, **kosongkan** — isian manual itu menimpa alamat bawaan, dan
   pada HP yang pernah diatur manual ia akan tetap mengirim ke backend lama
3. Tekan **📡 Tes Koneksi Server** → harus **✅ Terhubung**
4. ☰ → **ℹ️ Tentang** → periksa:
   - **Versi 1.3.0**
   - **Berkas terpasang: besakih-guide-v1.9.0**
5. Pilih **Pos** yang benar untuk HP itu di layar Beranda
6. Buat **satu penilaian percobaan**, pastikan berubah jadi **✅** di Riwayat,
   lalu minta admin menghapus baris itu dari tab `Evaluations`

Langkah D4 nomor 2 adalah yang paling sering terlewat. Kalau HP itu dulu pernah
diatur manual oleh siapa pun, alamat lama akan menempel dan penilaiannya masuk
ke spreadsheet yang salah — tanpa pesan error apa pun.

---

# BAGIAN E — Tutup pekerjaannya

1. **Beri tahu semua staff** bahwa ikon lama sudah tidak dipakai. Kalau ada HP
   yang belum dipindahkan, penilaiannya masuk ke spreadsheet lama
2. **Cabut deployment lama** supaya tidak ada yang diam-diam masih mengirim ke
   sana: buka Apps Script spreadsheet **lama** → **Deploy → Manage deployments**
   → ikon ⋮ pada deployment aktif → **Archive**
3. **Ganti nama spreadsheet lama** menjadi
   `ARSIP — Penilaian Guide s/d Agustus 2026 (jangan dipakai)`
4. Simpan di tempat yang mudah dicari: alamat `.vercel.app`, alamat `/exec`,
   dan alamat spreadsheet baru
5. Kirim `docs/PANDUAN-PEMAKAIAN.md` ke staff & admin. Untuk versi PDF-nya:
   `npm run docs:pdf` (butuh Chrome di komputer)

## Setelah ini, cara memperbarui aplikasi

| Yang diubah | Caranya |
| --- | --- |
| Aplikasi (`public/`) | `git push` → Vercel men-deploy sendiri, HP staff memuat versi baru sendiri |
| Backend (`server-gas/*.gs`) | `clasp push`, ATAU `npm run build:gas` lalu tempel ulang di Apps Script → Deploy → **Manage deployments → Edit (pensil) → New version**. **Jangan** *New deployment*, itu membuat URL baru |
| Daftar guide | Sunting langsung tab `Guides` di spreadsheet. Set `aktif = FALSE` untuk menonaktifkan, jangan dihapus |

> Kalau **kontrak datanya** yang berubah (kolom baru, kriteria baru): **backend
> dulu, baru `git push`.** Aplikasi memperbarui dirinya sendiri di HP staff
> begitu Vercel selesai men-deploy, sedangkan Apps Script hanya berubah kalau
> ditempel manual. Terbalik = HP mengirim bentuk yang belum dikenal backend.

---

# BAGIAN F — Kalau ada masalah

### "Tes Koneksi Server" gagal

| Yang tertulis | Sebabnya | Perbaikannya |
| --- | --- | --- |
| `❌ Gagal: HTTP 401` atau `403` | *Who has access* bukan **Anyone** | Apps Script → Deploy → Manage deployments → Edit → ubah ke **Anyone** → New version |
| `❌ Gagal: HTTP 404` | Alamatnya salah, atau `/dev` bukan `/exec` | Salin ulang **Web app URL** dari Manage deployments |
| `❌ Gagal: Failed to fetch` | Alamat di `config.js` salah tulis | Periksa ada `https://` di depan dan `/exec` di belakang, tanpa spasi |
| Terhubung, tapi `Tab "Guides" belum ada` | `setup()` belum dijalankan | Ulangi langkah A3 |

### Aplikasi di Vercel tampil sebagai daftar berkas, bukan aplikasinya

Output Directory-nya tidak terbaca. Periksa `vercel.json` ada di **akar** repo
(sejajar dengan `README.md`), lalu di Vercel: **Settings → Build and Deployment →
Output Directory** → pastikan `public`. Tekan **Deployments → ⋮ → Redeploy**.

### Deploy di Vercel gagal saat build

Framework Preset-nya bukan "Other", atau Build Command tidak dikosongkan.
**Settings → Build and Deployment → Framework Preset: Other**, dan Build Command
di-Override dengan isian kosong. Lalu **Redeploy**.

### Aplikasi tidak bisa di-install sebagai PWA di HP

Harus lewat **HTTPS**, dan alamat `.vercel.app` sudah HTTPS. Kalau tombol
*Tambahkan ke layar utama* tidak muncul: pastikan Anda membukanya di **Chrome**
(Android) atau **Safari** (iPhone) — bukan di dalam browser aplikasi lain
seperti WhatsApp atau Instagram.

### Penilaian masuk, tapi tab Rekap dan Dasbor kosong

Tab `Rekap …` disusun belakangan oleh trigger, bukan saat penilaian masuk.

1. Buka tab `Evaluations` — kalau barisnya ada di sana, **data sudah aman**
2. Menu **Penilaian Guide → Perbarui Rekap Bulan Ini** untuk memaksa sekarang
3. Menu **Penilaian Guide → Periksa Kesehatan Data** → kalau
   `Trigger otomatis aktif : 0 buah`, tekan **Nyalakan Pembaruan Otomatis**

### Penilaian ditolak: `guideId "G-xxx" tidak ada di tab Guides`

Daftar guide di HP lebih baru daripada di tab `Guides`. Tambahkan guide itu di
tab `Guides`, lalu di HP: ☰ → Riwayat → **🔄 Coba kirim lagi semua**.

### Aplikasi di HP masih menampilkan versi lama setelah di-push

1. Tutup aplikasi sepenuhnya, buka lagi — ia memeriksa pembaruan saat dibuka
2. Masih lama? ☰ → **ℹ️ Tentang** → lihat **Berkas terpasang**. Kalau nomornya
   belum berubah, tunggu beberapa menit (Vercel + service worker), lalu buka
   ulang
3. Kalau tetap: hapus aplikasi dari layar utama dan pasang lagi dari alamat
   `.vercel.app` (**pastikan Menunggu Sync = 0 dulu**)

---

# Daftar centang

Cetak atau centang di layar.

**A — Spreadsheet & backend**
- [ ] A1 Spreadsheet baru dibuat & diberi nama
- [ ] A2 Tab `Guides` disalin dari spreadsheet lama, **sebelum** `setup()`
- [ ] A3 `npm run build:gas` dijalankan, `Code.gs` ditempel (atau `clasp push`), `setup()` dijalankan
- [ ] A3 **Tab `Evaluations` punya 13 kolom, berakhir `koreksiDari | status`**
- [ ] A4 Deploy → Web app → *Execute as: Me*, *Who has access: Anyone*
- [ ] A4 Alamat `/exec` disalin & disimpan
- [ ] A5 `Periksa Kesehatan Data`: trigger aktif 1, zona waktu Asia/Makassar

**B — Repo**
- [ ] B1 Zip diekstrak ke folder baru
- [ ] B2 `public/config.js` diisi alamat `/exec`, berakhiran `/exec`
- [ ] B3 `148/148` dan `144/144` lulus
- [ ] B4 Repo GitHub baru dibuat & di-push

**C — Vercel**
- [ ] C1 Repo di-import
- [ ] C2 Framework Preset **Other**, Build Command **kosong**
- [ ] C3 Deploy berhasil, alamat `.vercel.app` dicatat
- [ ] C4 Tes Koneksi Server ✅, daftar guide tampil
- [ ] C5 Satu penilaian uji masuk ke tab `Evaluations`, lalu dihapus lagi
- [ ] C5 Tab `Rekap …` dan `Dasbor …` terbentuk

**D — Tiap HP staff** (ulangi per HP)
- [ ] D1 Menunggu Sync = 0 di aplikasi lama, tidak ada entri 🚫
- [ ] D2 Aplikasi lama dihapus, data situsnya dibersihkan
- [ ] D3 Aplikasi baru dipasang dari alamat `.vercel.app`
- [ ] D4 **Kolom Alamat Server KOSONG**
- [ ] D4 Tes Koneksi Server ✅, Versi 1.3.0, Berkas terpasang v1.9.0
- [ ] D4 Pos yang benar dipilih
- [ ] D4 Penilaian percobaan berubah jadi ✅, lalu dihapus admin

**E — Penutup**
- [ ] E2 Deployment Apps Script lama diarsipkan
- [ ] E3 Spreadsheet lama diganti nama menjadi ARSIP
- [ ] E4 Alamat-alamat penting disimpan
- [ ] E5 Panduan pemakaian dikirim ke staff & admin
