/**
 * ============================================================
 *  Pemasangan & migrasi
 *  Berkas 5 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : setup() sekali jalan, migrasi tab Evaluations, isi ulang tab Guides.
 *  LARANGAN : Tidak boleh dipanggil otomatis oleh trigger — hanya manual dari editor.
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


/* ================= Setup sekali jalan ================= */

function setup() {
  var ss = ss_();

  // --- Zona waktu ---
  // Dilaporkan apa adanya di nilai kembalian, tidak diam-diam: kalau zonanya
  // memang selama ini salah, rekap yang disusun ulang akan memindahkan
  // sebagian baris ke tanggal yang benar — angka lama bisa bergeser, dan orang
  // yang menjalankan setup berhak tahu sebelum bertanya-tanya.
  var zonaPesan = '';
  var zonaLama = ss.getSpreadsheetTimeZone();
  if (zonaLama !== ZONA_WAKTU) {
    try {
      ss.setSpreadsheetTimeZone(ZONA_WAKTU);
      zonaPesan = '\n⚠️ Zona waktu diubah dari ' + zonaLama + ' ke ' + ZONA_WAKTU +
                  ' (WITA). Rekap akan disusun ulang memakai batas hari yang benar, ' +
                  'jadi sebagian tanggal pada data lama bisa bergeser.';
    } catch (e) {
      zonaPesan = '\n⚠️ Zona waktu masih ' + zonaLama + ' dan gagal diubah (' + e + '). ' +
                  'Perbaiki manual lewat File → Settings → Time zone = ' + ZONA_WAKTU + '.';
    }
  }

  // --- Tab Guides ---
  // Ditulis ulang bila tab masih kosong ATAU headernya belum sesuai skema
  // terbaru (mis. spreadsheet lama yang masih memakai kolom "lisensi").
  var g = ss.getSheetByName(SHEET_GUIDES) || ss.insertSheet(SHEET_GUIDES);
  var headerSekarang = g.getLastRow() > 0
    ? g.getRange(1, 1, 1, HEADER_GUIDES.length).getValues()[0].join('|')
    : '';
  // getLastRow() < 2 berarti tab kosong atau hanya berisi header — daftar guide
  // yang kosong sama saja dengan rusak, jadi ikut ditulis ulang.
  if (g.getLastRow() < 2 || headerSekarang !== HEADER_GUIDES.join('|')) {
    resetGuides();
  }

  // --- Tab Evaluations ---
  var e = ss.getSheetByName(SHEET_EVAL) || ss.insertSheet(SHEET_EVAL);
  if (e.getLastRow() === 0) {
    pasangHeader_(e, HEADER_EVAL, LEBAR_EVAL);
  } else {
    migrasiEvaluations_(e);
  }

  // --- Tab Petunjuk ---
  var p = ss.getSheetByName(SHEET_INFO) || ss.insertSheet(SHEET_INFO);
  if (p.getLastRow() === 0) {
    var teks = [
      ['PENILAIAN GUIDE KAWASAN BESAKIH — Basis Data'],
      [''],
      ['Spreadsheet ini adalah "server" aplikasi penilaian guide di lapangan.'],
      [''],
      ['Tab Guides      : daftar guide. Tambah baris untuk guide baru.'],
      ['                  Isi kolom aktif dengan FALSE untuk menonaktifkan tanpa menghapus.'],
      ['Tab Evaluations : hasil penilaian dari lapangan — DIISI OTOMATIS oleh aplikasi.'],
      ['                  Jangan mengubah atau menghapus baris di tab ini.'],
      ['                  Kolom status: "aktif" = angka yang berlaku,'],
      ['                  "diganti" = sudah dibetulkan lewat koreksi dari aplikasi'],
      ['                  (barisnya sengaja tidak dihapus, tapi tidak ikut rekap).'],
      ['Tab Rekap ...   : ringkasan bulanan, DISUSUN ULANG oleh trigger tiap 5 menit.'],
      ['                  Boleh dicoret-coret; isinya ditimpa lagi saat rekap disusun.'],
      ['Tab Dasbor ...  : peringkat guide + grafik ketaatan harian.'],
      ['                  Ringkasan harian Asing & Domestik berupa RUMUS ke tab Rekap,'],
      ['                  jadi ikut berubah begitu kolom REVIEW diperbaiki.'],
      ['                  Peringkat diurut pakai rata-rata, minimal hadir 3 hari.'],
      [''],
      ['KALAU HASIL TIDAK TERLIHAT'],
      ['- Yang paling dulu terisi adalah tab Evaluations. Cek ke sana lebih dulu.'],
      ['- Tiap tab rekap punya cap "Diperbarui: ..." di pojok kanan atas.'],
      ['  Kalau capnya lama, rekapnya memang belum disusun ulang — bukan datanya hilang.'],
      ['- Menu "Penilaian Guide" → "Periksa Kesehatan Data" menyusun ulang sekarang juga.'],
      [''],
      ['CATATAN PENTING'],
      ['- Jangan menulis URL /exec di repositori GitHub yang bersifat publik.'],
      ['- Kalau script diubah: Deploy → Manage deployments → Edit → New version,'],
      ['  supaya URL tidak berubah dan perangkat staff tidak perlu diatur ulang.'],
      ['- Aplikasi hanya menambah baris (append-only), jadi data lama aman.']
    ];
    p.getRange(1, 1, teks.length, 1).setValues(teks);
    p.setColumnWidth(1, 700);
    p.getRange('A1').setFontWeight('bold').setFontSize(13).setFontColor('#0B5D3B');
    p.getRange('A10').setFontWeight('bold');
  }

  // Buang tab bawaan "Sheet1" / "Sheet 1" kalau masih kosong
  ['Sheet1', 'Sheet 1', 'Sheet'].forEach(function (nama) {
    var s = ss.getSheetByName(nama);
    if (s && ss.getSheets().length > 1 && s.getLastRow() === 0) ss.deleteSheet(s);
  });

  // Pembaruan rekap otomatis dipasang di sini juga. Sebelumnya ini langkah
  // terpisah yang mudah terlewat — akibatnya tab rekap tidak pernah diperbarui
  // dan hasil dari lapangan terlihat "tidak masuk" padahal datanya ada.
  var otomatis;
  try {
    pasangTriggerHarian();
    otomatis = 'Pembaruan rekap otomatis: aktif (tiap 5 menit + tiap malam).';
  } catch (e) {
    otomatis = 'Pembaruan rekap otomatis BELUM aktif (' + e + ').\n' +
               'Jalankan menu Penilaian Guide → Nyalakan Pembaruan Otomatis.';
  }

  return 'Setup selesai. ' + otomatis + zonaPesan +
         '\nLanjut ke Deploy → New deployment → Web app.';
}


/**
 * Sesuaikan tab Evaluations lama ke skema terbaru.
 *
 * Versi awal memakai urutan  idCard | uniform | etika  dengan nilai TRUE/FALSE.
 * Versi sekarang memakai      uniform | idCard | review dengan angka 1/0/n,
 * mengikuti cara penilaian yang dipakai di lapangan selama ini.
 * Nilai lama dipindahkan, tidak dihapus.
 */
function migrasiEvaluations_(e) {
  var lebarLama = Math.max(e.getLastColumn(), 1);
  var header = e.getRange(1, 1, 1, lebarLama).getValues()[0].map(function (x) {
    return String(x || '').trim();
  });
  if (header.join('|') === HEADER_EVAL.join('|')) return false;   // sudah sesuai

  // Dipetakan berdasarkan NAMA kolom, bukan posisi. Skema tab ini sudah
  // berganti beberapa kali — kolom bertambah, urutan uniform/idCard sempat
  // tertukar — dan pemetaan posisional akan salah pada salah satu di antaranya.
  var idx = {};
  for (var h = 0; h < header.length; h++) if (header[h]) idx[header[h]] = h;

  var jmlBaris = e.getLastRow() - 1;
  var baru = [];
  if (jmlBaris > 0) {
    var data = e.getRange(2, 1, jmlBaris, lebarLama).getValues();
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      var ambil = function (nama) { return idx[nama] === undefined ? '' : r[idx[nama]]; };
      var yaTidak = function (v) { return (v === true || Number(v) === 1) ? 1 : 0; };
      var angka = function (v) {
        if (v === true) return 1;                    // skema paling lama: TRUE/FALSE
        return Math.min(REVIEW_MAKS, Math.max(0, Number(v) || 0));
      };
      // Baris lama belum punya kolom koreksi: semuanya dianggap aktif.
      var st = String(ambil('status') || '').trim().toLowerCase();
      baru.push([
        ambil('evaluationId'), ambil('timestamp'), Number(ambil('pos')) || 0,
        ambil('guideId'), ambil('guideName'),
        yaTidak(ambil('uniform')), yaTidak(ambil('idCard')),
        angka(ambil('review')), angka(ambil('etika')),
        ambil('catatan'), ambil('receivedAt'),
        ambil('koreksiDari'), st === STATUS_GANTI ? STATUS_GANTI : STATUS_AKTIF
      ]);
    }
  }

  e.clearContents();
  pasangHeader_(e, HEADER_EVAL, LEBAR_EVAL);
  if (baru.length) e.getRange(2, 1, baru.length, HEADER_EVAL.length).setValues(baru);
  Logger.log('Tab Evaluations dimigrasikan ke skema ' + HEADER_EVAL.join('/') + '.');
  return true;
}



/**
 * Tulis ulang tab Guides dari GUIDES_AWAL.
 * Dipakai saat daftar guide diperbarui dari kantor. Data penilaian di tab
 * Evaluations TIDAK tersentuh.
 */
function resetGuides() {
  var ss = ss_();
  var g = ss.getSheetByName(SHEET_GUIDES) || ss.insertSheet(SHEET_GUIDES);
  g.clear();
  pasangHeader_(g, HEADER_GUIDES, [90, 230, 130, 110, 70]);
  g.getRange(2, 1, GUIDES_AWAL.length, HEADER_GUIDES.length).setValues(GUIDES_AWAL);
  SpreadsheetApp.flush();
  try { CacheService.getScriptCache().remove('petaGuides'); } catch (e) {}
  var pesan = GUIDES_AWAL.length + ' guide dimuat ke tab Guides.';
  Logger.log(pesan);
  return pesan;
}

/* ==================================================================
   REKAP BULANAN — meniru format "NILAI REWARD" yang dipakai selama ini
   ==================================================================
   Satu tab per regu per bulan:
     baris  = nama guide
     kolom  = tanggal x (UNI FORM, ID, REVIEW, ETIKA), lalu blok TOTAL berumus

   Penggabungan bila satu guide dinilai di beberapa pos pada hari sama:
     UNI FORM & ID : diambil yang PALING BURUK (0 mengalahkan 1)
     ETIKA         : diambil yang PALING RENDAH, sesuai keputusan tim
     REVIEW        : TIDAK diisi aplikasi — lihat catatan di bawah
   Rincian per pos tetap bisa dilihat di tab "Rekap per Pos".

   KOLOM REVIEW DIISI MANUAL.
   Angka yang sudah diketik tim di kolom REVIEW dibaca lebih dulu lalu
   ditulis kembali setiap kali rekap disusun ulang, sehingga tidak pernah
   hilang walau tab ini dibangun ulang tiap malam. Kuncinya nama guide +
   tanggal, jadi tetap aman meski urutan barisnya bergeser.
   ================================================================== */
