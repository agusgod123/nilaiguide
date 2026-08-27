/**
 * ============================================================
 *  Tab Rekap A1 / A2 / D1 / D2
 *  Berkas 7 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Susun empat tab regu berformat NILAI REWARD; kembalikan tanggalList.
 *  LARANGAN : Nomor kolom untuk satu tanggal BERBEDA antar tab — jangan ditebak,
 *          pakai tanggalList yang dikembalikan fungsi ini (jebakan #11).
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


/** Bangun satu tab rekap untuk satu regu. */
function bangunRekapRegu_(info, bulan, ringkasan, guides) {
  var anggota = guides.filter(function (g) { return g.regu.indexOf(info.kode) > -1; })
    .sort(function (a, b) { return a.guideName.toLowerCase() < b.guideName.toLowerCase() ? -1 : 1; });

  // Selamatkan REVIEW yang diketik manual SEBELUM tabnya dikosongkan
  var namaTab = namaTabRekap_(info.kode, bulan);
  var reviewManual = bacaReviewManual_(namaTab);

  // Hanya tanggal yang benar-benar ada penilaian bagi anggota regu ini
  var punya = {};
  anggota.forEach(function (g) {
    var h = ringkasan.harian[g.guideId];
    if (h) Object.keys(h).forEach(function (t) { punya[t] = true; });
  });
  // Tanggal yang hanya punya angka REVIEW manual tetap ditampilkan, supaya
  // angka yang sudah diketik tim tidak lenyap hanya karena hari itu tidak
  // ada penilaian dari aplikasi.
  Object.keys(reviewManual).forEach(function (k) {
    punya[k.split('|')[1]] = true;
  });
  var tanggal = Object.keys(punya).sort();

  var sh = siapkanTab_(namaTab);
  var jmlKolom = 1 + (tanggal.length + 1) * 4;   // nama + (tanggal + TOTAL) x 4

  // --- baris 1: judul ---
  // Sengaja TIDAK di-merge: sel gabungan yang melintasi batas kolom beku
  // membuat setFrozenColumns gagal ("can't freeze columns which contain only
  // part of a merged cell"). Warna latar tetap dipasang di seluruh baris.
  sh.getRange(1, 1).setValue(
    'REKAP PENILAIAN GUIDE — ' + info.kategori.toUpperCase() +
    ' REGU ' + info.nomor + ' — ' + bulan);
  sh.getRange(1, 1, 1, jmlKolom)
    .setFontWeight('bold').setFontSize(12)
    .setFontColor('#FFFFFF').setBackground('#0B5D3B');
  // Cap waktu di ujung kanan baris judul — ikut terbeku bersama baris 1..3,
  // jadi selalu kelihatan walau digulir jauh ke bawah.
  sh.getRange(1, jmlKolom).setValue(capWaktu_())
    .setFontWeight('normal').setFontSize(9).setHorizontalAlignment('right');

  // --- baris 2: tanggal ---
  sh.getRange(2, 1).setValue('REGU: ' + info.nomor + ' (' + info.kategori + ')')
    .setFontWeight('bold');
  for (var i = 0; i < tanggal.length; i++) {
    var kol = 2 + i * 4;
    var bagian = tanggal[i].split('-');
    sh.getRange(2, kol, 1, 4).merge()
      .setValue('TGL: ' + Number(bagian[2]) + '-' + Number(bagian[1]) + '-' + bagian[0])
      .setHorizontalAlignment('center').setFontWeight('bold');
  }
  var kolTotal = 2 + tanggal.length * 4;
  sh.getRange(2, kolTotal, 1, 4).merge().setValue('TOTAL')
    .setHorizontalAlignment('center').setFontWeight('bold')
    .setBackground('#C8942B').setFontColor('#FFFFFF');

  // --- baris 3: sub-header ---
  var head = ['NAME'];
  for (var t = 0; t <= tanggal.length; t++) head.push('UNI FORM', 'ID', 'REVIEW', 'ETIKA');
  sh.getRange(3, 1, 1, head.length).setValues([head])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0B5D3B')
    .setHorizontalAlignment('center');

  // --- baris 5 dst: data ---
  var terisi = 0;                    // berapa sel harian yang benar-benar berisi
  if (anggota.length) {
    var baris = [];
    for (var a = 0; a < anggota.length; a++) {
      var g = anggota[a];
      var row = [g.guideName];
      var h = ringkasan.harian[g.guideId] || {};
      for (var d = 0; d < tanggal.length; d++) {
        var sel = h[tanggal[d]];
        // Angka REVIEW yang diketik tim selalu menang atas nilai dari
        // Evaluations — itulah satu-satunya sumbernya sekarang.
        var rvw = reviewManual[g.guideName + '|' + tanggal[d]];
        if (sel) {
          row.push(sel.uniform, sel.idCard,
                   rvw === undefined ? sel.review : rvw, sel.etika || 0);
          terisi++;
        } else if (rvw !== undefined) {
          row.push('', '', rvw, '');     // hanya ada review manual hari itu
        } else {
          row.push('', '', '', '');      // kosong = tidak bertugas / tidak diperiksa
        }
      }
      row.push('', '', '', '');          // tempat rumus TOTAL
      baris.push(row);
    }
    sh.getRange(5, 1, baris.length, head.length).setValues(baris);

    // Rumus TOTAL per kriteria — tetap hidup bila sel diperbaiki manual
    if (tanggal.length) {
      var rumus = [];
      for (var b = 0; b < anggota.length; b++) {
        var nb = 5 + b;
        var satu = [];
        for (var k = 0; k < 4; k++) {
          var sel2 = [];
          for (var dd = 0; dd < tanggal.length; dd++) {
            sel2.push(kolomHuruf_(2 + dd * 4 + k) + nb);
          }
          satu.push('=SUM(' + sel2.join(',') + ')');
        }
        rumus.push(satu);
      }
      sh.getRange(5, kolTotal, rumus.length, 4).setFormulas(rumus)
        .setFontWeight('bold').setBackground('#FFF6E0');
    }
  }

  sh.setFrozenRows(3);
  sh.setFrozenColumns(1);
  sh.setColumnWidth(1, 210);
  for (var c = 2; c <= jmlKolom; c++) sh.setColumnWidth(c, 58);
  // tanggalList & baris dipakai tab Dasbor untuk menyusun rumus yang menunjuk
  // TEPAT ke sel-sel tab ini. Tiap tab regu punya daftar tanggalnya sendiri
  // (hanya hari yang ada datanya bagi anggotanya), jadi nomor kolom untuk satu
  // tanggal berbeda antar tab — tidak boleh ditebak.
  return {
    anggota: anggota.length, terisi: terisi, tanggal: tanggal.length,
    namaTab: namaTab, tanggalList: tanggal,
    barisAwal: 5, barisAkhir: 4 + anggota.length
  };
}
