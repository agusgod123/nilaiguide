# Dokumentasi Aplikasi Penilaian Guide Kawasan Besakih

**Mulai dari sini.** Halaman ini menerangkan berkas mana yang harus dibuka
untuk keperluan apa.

---

## Saya ingin…

| Keperluan | Buka berkas ini |
| --- | --- |
| **Memakai aplikasinya** — memasang di HP, menilai guide, melihat hasil | [`PANDUAN-PEMAKAIAN.md`](PANDUAN-PEMAKAIAN.md) |
| **Membaca hasil di spreadsheet** — arti tiap tab dan tiap angka | [`PANDUAN-PEMAKAIAN.md`](PANDUAN-PEMAKAIAN.md) bagian 7 |
| **Menangani gangguan** — hasil tidak muncul, data rusak, server tak terhubung | [`PANDUAN-PEMAKAIAN.md`](PANDUAN-PEMAKAIAN.md) bagian 9 |
| **Memahami cara kerja aplikasi** — 13 diagram alur | [`ALUR-APLIKASI.md`](ALUR-APLIKASI.md) |
| **Membangun ulang dari nol** — spesifikasi lengkap | [`PRD-APLIKASI.md`](PRD-APLIKASI.md) |
| **Menjalankan & men-deploy** | [`../README.md`](../README.md) |
| **Melanjutkan pengembangan** — keadaan proyek, aturan bisnis, jebakan yang sudah ditemukan | [`KONTEKS-PROYEK.md`](KONTEKS-PROYEK.md) |

---

## Isi folder ini

| Berkas | Untuk siapa |
| --- | --- |
| [`PANDUAN-PEMAKAIAN.md`](PANDUAN-PEMAKAIAN.md) | **Staff & admin** |
| [`ALUR-APLIKASI.md`](ALUR-APLIKASI.md) | Pengembang |
| [`PRD-APLIKASI.md`](PRD-APLIKASI.md) | Pengembang |
| [`KONTEKS-PROYEK.md`](KONTEKS-PROYEK.md) | Pengembang / sesi baru |

Ketiga berkas pertama bisa dicetak menjadi PDF — berguna untuk dikirim ke staf
lewat WhatsApp. PDF-nya **tidak disimpan di repo** karena ia hasil olahan yang
cepat basi; bangun saat butuh:

```bash
npm install
npm run docs:pdf
```

Perinciannya ada di [`buat-pdf.mjs`](buat-pdf.mjs). `KONTEKS-PROYEK.md` sengaja
tidak ikut dicetak: isinya berubah tiap kali ada deploy, jadi PDF-nya hanya akan
jadi salinan basi yang beredar.
