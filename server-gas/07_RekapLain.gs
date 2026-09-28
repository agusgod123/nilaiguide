/**
 * ============================================================
 *  Tab Rekap Kehadiran & Rekap per Pos
 *  Berkas 8 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Dua tab turunan yang berdiri sendiri dari tab regu.
 *  LARANGAN : —
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


/**
 * Tab kehadiran harian — satu pengantaran bernilai satu.
 *
 * Baris  = seluruh guide aktif (yang belum pernah hadir pun ikut tercantum,
 *          supaya terlihat siapa yang tidak pernah diperiksa)
 * Kolom  = tanggal, berisi berapa PENGANTARAN guide itu dinilai hari tersebut
 * Kosong = tidak bertugas atau tidak diperiksa sama sekali hari itu
 *
 * Dulu angkanya 1..3 (berapa pos yang memeriksa) dan mentok di 3. Sekarang
 * tidak ada batas atas: guide yang mengantar enam kali sehari berangka 6.
 * Tab inilah tempat cacah pengantaran harian dibaca — tab rekap regu hanya
 * memuat JUMLAH nilainya, sehingga tanpa tab ini angka 4 di sana tidak bisa
 * dibedakan antara dua pengantaran bagus atau empat pengantaran biasa.
 */
function bangunRekapKehadiran_(bulan, ringkasan, guides) {
  var sh = siapkanTab_('Rekap Kehadiran ' + bulan);
  var tanggal = ringkasan.tanggal;
  var kolTotal = 3 + tanggal.length;             // NAME, REGU, tanggal..., lalu 2 kolom total
  var jmlKolom = kolTotal + 1;

  sh.getRange(1, 1).setValue('KEHADIRAN GUIDE — ' + bulan);
  sh.getRange(1, 1, 1, jmlKolom)
    .setFontWeight('bold').setFontSize(12)
    .setFontColor('#FFFFFF').setBackground('#0B5D3B');
  sh.getRange(1, jmlKolom).setValue(capWaktu_())
    .setFontWeight('normal').setFontSize(9).setHorizontalAlignment('right');

  sh.getRange(2, 1).setValue(
    'Angka = berapa PENGANTARAN guide itu dinilai pada hari tersebut. Satu guide ' +
    'boleh dinilai berkali-kali sehari, termasuk di pos yang sama, karena tiap ' +
    'pengantaran dihitung sendiri. Penilaian yang sudah dibetulkan lewat koreksi ' +
    'tidak ikut dihitung.')
    .setFontSize(9).setFontColor('#5C6360');

  var head = ['NAME', 'REGU'];
  for (var i = 0; i < tanggal.length; i++) {
    var bagian = tanggal[i].split('-');
    head.push(Number(bagian[2]) + '-' + Number(bagian[1]));
  }
  head.push('TOTAL ANTAR', 'HARI HADIR');
  sh.getRange(3, 1, 1, head.length).setValues([head])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0B5D3B')
    .setHorizontalAlignment('center');

  var urut = guides.slice().sort(function (a, b) {
    return a.guideName.toLowerCase() < b.guideName.toLowerCase() ? -1 : 1;
  });

  var adaIsi = 0;
  if (urut.length) {
    var baris = [];
    for (var a = 0; a < urut.length; a++) {
      var g = urut[a];
      var k = ringkasan.harian[g.guideId] || {};
      var row = [g.guideName, g.regu.join(', ')];
      for (var d = 0; d < tanggal.length; d++) {
        var sel = k[tanggal[d]];
        var n = sel ? sel.antar : 0;
        row.push(n || '');                       // kosong, bukan 0, bila tidak hadir
        if (n) adaIsi++;
      }
      row.push('', '');                          // tempat rumus
      baris.push(row);
    }
    sh.getRange(5, 1, baris.length, head.length).setValues(baris);

    if (tanggal.length) {
      var awal = kolomHuruf_(3), akhir = kolomHuruf_(2 + tanggal.length);
      var rumus = [];
      for (var b = 0; b < baris.length; b++) {
        var nb = 5 + b;
        rumus.push([
          '=SUM(' + awal + nb + ':' + akhir + nb + ')',
          '=COUNTIF(' + awal + nb + ':' + akhir + nb + ',">0")'
        ]);
      }
      sh.getRange(5, kolTotal, rumus.length, 2).setFormulas(rumus)
        .setFontWeight('bold').setBackground('#FFF6E0');
    }

    // --- Baris penutup: dibaca MENURUN, menjawab "hari itu berapa guide hadir" ---
    // Tabel di atas dibaca menyamping (satu guide, banyak tanggal). Dua baris
    // ini kebalikannya: satu tanggal, berapa banyak guide.
    if (tanggal.length) {
      var barisAkhir = 4 + baris.length;
      var fJml = ['JUMLAH GUIDE HADIR', ''];
      var fPos = ['TOTAL PENGANTARAN', ''];
      for (var kc = 3; kc <= 2 + tanggal.length; kc++) {
        var h = kolomHuruf_(kc);
        fJml.push('=COUNTIF(' + h + '5:' + h + barisAkhir + ',">0")');
        fPos.push('=SUM(' + h + '5:' + h + barisAkhir + ')');
      }
      var hTotal = kolomHuruf_(kolTotal);
      fJml.push('=COUNTIF(' + hTotal + '5:' + hTotal + barisAkhir + ',">0")', '');
      fPos.push('=SUM(' + hTotal + '5:' + hTotal + barisAkhir + ')', '');

      var barisJml = barisAkhir + 2;
      // Label ditulis dengan setValues, RUMUS saja yang lewat setFormulas.
      // setFormulas memperlakukan setiap sel sebagai rumus — teks biasa akan
      // diberi "=" di depannya dan berubah menjadi #ERROR!.
      sh.getRange(barisJml, 1, 2, 2).setValues([
        [fJml[0], ''],
        [fPos[0], '']
      ]);
      sh.getRange(barisJml, 3, 2, jmlKolom - 2).setFormulas([
        fJml.slice(2),
        fPos.slice(2)
      ]);
      sh.getRange(barisJml, 1, 2, jmlKolom)
        .setFontWeight('bold').setBackground('#E7F3EC');
      sh.getRange(barisJml, 1, 2, 1).setHorizontalAlignment('left');
      // Kolom TOTAL POS pada baris pertama berarti "guide berbeda sebulan"
      sh.getRange(barisJml, kolTotal).setNote(
        'Berapa guide BERBEDA yang hadir sepanjang bulan ini — ' +
        'bukan penjumlahan angka harian, karena satu guide bisa hadir berkali-kali.');
    }
  }

  sh.setFrozenRows(3);
  sh.setFrozenColumns(2);
  sh.setColumnWidth(1, 210);
  sh.setColumnWidth(2, 90);
  for (var c = 3; c <= 2 + tanggal.length; c++) sh.setColumnWidth(c, 34);
  sh.setColumnWidth(kolTotal, 82);
  sh.setColumnWidth(kolTotal + 1, 82);
  return { baris: urut.length, terisi: adaIsi };
}


/**
 * Tab rincian: capaian tiap guide dipisah per pos pemeriksaan.
 *
 * Kolom "Rata Uni" per pos adalah PENGAMAN, bukan hiasan. Sejak tiap penilaian
 * dihitung sebagai satu pengantaran, guide yang lebih sering ketemu satu pos
 * akan condong ke standar pos itu. Kalau Pos 1 dan Pos 3 ternyata menilai
 * dengan ukuran berbeda — misalnya seragam sudah lusuh saat sampai Pos 3 —
 * selisihnya harus kelihatan di sini, bukan ditebak.
 */
function bangunRekapPerPos_(bulan, ringkasan, guides) {
  var sh = siapkanTab_('Rekap per Pos ' + bulan);
  var head = ['NAME', 'REGU'];
  for (var p = 1; p <= 3; p++) {
    head.push('P' + p + ' Antar', 'P' + p + ' Uniform', 'P' + p + ' ID',
              'P' + p + ' Review', 'P' + p + ' Etika', 'P' + p + ' Rata Uni');
  }
  head.push('Total Antar');

  sh.getRange(1, 1).setValue('RINCIAN PER POS PEMERIKSAAN — ' + bulan);
  sh.getRange(1, 1, 1, head.length)
    .setFontWeight('bold').setFontSize(12)
    .setFontColor('#FFFFFF').setBackground('#0B5D3B');
  sh.getRange(1, head.length).setValue(capWaktu_())
    .setFontWeight('normal').setFontSize(9).setHorizontalAlignment('right');
  sh.getRange(2, 1, 1, head.length).setValues([head])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0B5D3B')
    .setHorizontalAlignment('center');

  var baris = [];
  for (var i = 0; i < guides.length; i++) {
    var g = guides[i];
    var pp = ringkasan.perPos[g.guideId];
    if (!pp) continue;                       // hanya yang pernah dinilai bulan ini
    var row = [g.guideName, g.regu.join(', ')];
    var total = 0;
    for (var pos = 1; pos <= 3; pos++) {
      var d = pp[pos];
      if (!d) { row.push('', '', '', '', '', ''); continue; }
      var rata = rataPengantaran_(d, 'uniform');
      row.push(d.antar, d.uniform, d.idCard, d.review, d.etika || 0,
               rata === null ? '' : Math.round(rata * 100) / 100);
      total += d.antar;
    }
    row.push(total);
    baris.push(row);
  }
  if (baris.length) {
    var kolAkhir = baris[0].length - 1;
    baris.sort(function (a, b) { return b[kolAkhir] - a[kolAkhir]; });   // paling sering dinilai di atas
    sh.getRange(3, 1, baris.length, head.length).setValues(baris);
  }
  sh.setFrozenRows(2);
  sh.setColumnWidth(1, 210);
  sh.setColumnWidth(2, 90);
  for (var c = 3; c <= head.length; c++) sh.setColumnWidth(c, 78);
  return baris.length;
}
