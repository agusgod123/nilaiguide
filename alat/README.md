# alat/ — pemeriksa struktur

Dipakai saat penataan ulang, disimpan supaya bisa dijalankan lagi kalau
struktur berkas diubah lagi di kemudian hari.

| Berkas | Guna |
| --- | --- |
| `segmen.mjs` | Pisahkan sumber JS jadi segmen KODE vs TEKS. Menangani komentar, string, literal regex, dan interpolasi `${...}` di template literal. Baca komentar di dalamnya — tiga jebakannya sudah memakan waktu. |
| `periksa-rujukan.mjs` | `node alat/periksa-rujukan.mjs` — cari rujukan menggantung & definisi ganda di `public/js/app/`. |
| `buktikan-pemindahan.mjs` | Bandingkan `server-gas/*.gs` dengan `Code.gs` lama untuk membuktikan pemindahan murni. Butuh salinan `Code.gs` versi sebelumnya. |
| `app-dek.json` | Daftar 67 nama top-level `app.js` sebelum dipecah, dipakai `periksa-rujukan.mjs`. |

Ketiganya alat bantu, **bukan** bagian aplikasi. Tidak ikut ter-deploy.
