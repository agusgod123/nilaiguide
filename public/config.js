/* =========================================================
   config.js — Konfigurasi aplikasi
   ---------------------------------------------------------
   ⚠️  WAJIB DIISI SEBELUM DEPLOY.

   `serverUrl` diisi alamat Web App Google Apps Script yang menulis ke
   spreadsheet Anda. Cara mendapatkannya ada di PANDUAN-DEPLOY.md bagian A4:

     Apps Script → Deploy → New deployment → Web app
       Execute as     : Me
       Who has access : Anyone
     → salin "Web app URL", yang berakhiran /exec

   Nilai di bawah sengaja berupa PLACEHOLDER, bukan alamat sungguhan. Kalau
   lupa diganti, aplikasi akan gagal dengan jelas saat menekan "Tes Koneksi
   Server" — jauh lebih baik daripada memakai alamat lama yang terlihat benar
   lalu diam-diam menulis ke spreadsheet yang salah.

   Diisi di berkas ini, bukan di menu Pengaturan, supaya aplikasi LANGSUNG
   SIAP PAKAI di perangkat mana pun tanpa diatur manual. Staff tetap bisa
   menimpanya lewat menu Pengaturan bila suatu saat alamatnya berubah.

   ---------------------------------------------------------
   CATATAN KEAMANAN
   Kalau repositori ini publik, alamat di bawah dapat dibaca siapa saja. Web
   App di-deploy dengan akses "Anyone", sehingga pihak yang menemukannya bisa
   mengirim baris penilaian palsu ke spreadsheet.

   Yang TIDAK bisa dilakukan dari luar: membaca daftar penilaian, mengubahnya,
   atau menghapusnya (bersifat append-only), dan guideId yang tidak terdaftar
   di tab Guides akan ditolak.

   Bila alamat ini perlu dicabut:
   1. Apps Script → Deploy → Manage deployments → Archive deployment lama
   2. Deploy → New deployment → Web app  (menghasilkan URL baru)
   3. Perbarui nilai serverUrl di bawah, lalu commit
   ========================================================= */
window.APP_CONFIG = {
  serverUrl: 'https://GANTI-DENGAN-URL-EXEC-ANDA/exec',
};
