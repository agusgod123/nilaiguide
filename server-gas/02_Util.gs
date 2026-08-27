/**
 * ============================================================
 *  Pembantu umum
 *  Berkas 3 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Akses spreadsheet, balasan JSON, penamaan tab, tanggal zona Asia/Makassar.
 *  LARANGAN : Tidak boleh tahu apa pun tentang aturan penilaian atau bentuk rekap.
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


/* ================= Utilitas ================= */

function ss_()  { return SpreadsheetApp.getActiveSpreadsheet(); }


function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


function sheet_(nama) {
  var sh = ss_().getSheetByName(nama);
  if (!sh) throw new Error('Tab "' + nama + '" belum ada. Jalankan fungsi setup() dulu.');
  return sh;
}


function pasangHeader_(sh, header, lebar) {
  sh.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0B5D3B')
    .setHorizontalAlignment('center');
  sh.setFrozenRows(1);
  for (var i = 0; i < lebar.length; i++) sh.setColumnWidth(i + 1, lebar[i]);
}


/**
 * Kosongkan tab bila sudah ada, atau buat baru.
 *
 * Sel gabungan TIDAK ikut hilang oleh clear(), padahal jumlah kolom tanggal
 * berubah tiap hari. Sisa gabungan dari susunan kemarin bisa menggeser atau
 * menelan nilai yang ditulis hari ini, jadi dilepas dulu.
 */
function siapkanTab_(nama) {
  var ss = ss_();
  var sh = ss.getSheetByName(nama);
  if (sh) {
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
    sh.clear();
    sh.clearFormats();
  } else {
    sh = ss.insertSheet(nama);
  }
  return sh;
}


/**
 * Label "kapan rekap ini dibangun", supaya rekap basi langsung ketahuan.
 *
 * Nama bulannya disusun dari BULAN_ID, bukan dari pola 'MMM'. Locale proyek
 * Apps Script berbahasa Inggris dan tidak ikut berubah walau zona waktu
 * spreadsheet dikunci, jadi 'MMM' menghasilkan "Aug" di tengah tab yang
 * seluruhnya berbahasa Indonesia.
 */
function capWaktu_() {
  var b = Utilities.formatDate(new Date(), ss_().getSpreadsheetTimeZone(),
                               'yyyy-MM-dd-HH-mm').split('-');
  return 'Diperbarui: ' + Number(b[2]) + ' ' + BULAN_ID[Number(b[1]) - 1] + ' ' + b[0] +
         ' ' + b[3] + '.' + b[4];
}


/** Nomor kolom -> huruf (1 -> A, 27 -> AA). */
function kolomHuruf_(n) {
  var s = '';
  while (n > 0) {
    var sisa = (n - 1) % 26;
    s = String.fromCharCode(65 + sisa) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}


/** 'YYYY-MM' dari objek Date, memakai zona waktu spreadsheet. */
function kodeBulan_(d) {
  return Utilities.formatDate(d, ss_().getSpreadsheetTimeZone(), 'yyyy-MM');
}


/** 'YYYY-MM-DD' */
function kodeTanggal_(d) {
  return Utilities.formatDate(d, ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
}


/** Ubah kolom regu ("A1, D1") menjadi array kode. */
function pecahRegu_(teks) {
  return String(teks || '').split(',').map(function (x) { return x.trim(); })
    .filter(function (x) { return x; });
}


function namaTabRekap_(kode, bulan) { return 'Rekap ' + kode + ' ' + bulan; }


/**
 * Susun ulang seluruh tab rekap untuk satu bulan.
 * @param {string=} bulan 'YYYY-MM'. Kosong = bulan berjalan.
 */
/* ================= Tab Dasbor (peringkat + grafik) ================= */

function namaTabDasbor_(bulan) { return 'Dasbor ' + bulan; }
