/**
 * ============================================================
 *  Tab Dasbor — ringkasan harian & grafik
 *  Berkas 10 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Ringkasan harian berupa rumus lintas tab, plus grafik ketaatan.
 *  LARANGAN : WAJIB dijalankan PALING AKHIR: rumusnya menunjuk sel tab regu, jadi
 *          tab itu harus sudah final. sh.clear() TIDAK membuang chart —
 *          removeChart harus dipanggil lebih dulu (jebakan #10).
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


/**
 * Rumus SUM/COUNT yang menunjuk satu kolom kriteria pada satu tanggal, di
 * seluruh tab regu suatu kategori.
 *
 * Sengaja berupa RUMUS, bukan angka: kolom REVIEW diketik manual di tab regu,
 * jadi ringkasan harian harus ikut berubah begitu tim memperbaikinya — tanpa
 * menunggu rekap disusun ulang.
 *
 * @param {Object} infoRegu   kode regu -> hasil bangunRekapRegu_
 * @param {Array}  kodeRegu   mis. ['A1','A2']
 * @param {string} tgl        'yyyy-mm-dd'
 * @param {number} offset     0=UNI FORM, 1=ID, 2=REVIEW, 3=ETIKA
 * @param {string} fungsi     'SUM' atau 'COUNT'
 */
function rumusKategori_(infoRegu, kodeRegu, tgl, offset, fungsi) {
  var bagian = [];
  for (var i = 0; i < kodeRegu.length; i++) {
    var info = infoRegu[kodeRegu[i]];
    if (!info || !info.anggota) continue;
    var idx = info.tanggalList.indexOf(tgl);
    if (idx === -1) continue;                        // tab ini tidak punya tanggal itu
    var kol = kolomHuruf_(2 + idx * 4 + offset);
    bagian.push(fungsi + "('" + info.namaTab + "'!" +
                kol + info.barisAwal + ':' + kol + info.barisAkhir + ')');
  }
  return bagian.length ? '=' + bagian.join('+') : '=0';
}


/**
 * Susun tab Dasbor: ringkasan harian per kategori (rumus hidup), dua grafik
 * ketaatan, dan tujuh tabel peringkat.
 */
function bangunDasbor_(bulan, ringkasan, guides, infoRegu) {
  var nama = namaTabDasbor_(bulan);
  var tanggal = ringkasan.tanggal.slice();
  var sh = siapkanTab_(nama);

  // Chart TIDAK ikut terhapus oleh clear(); kalau tidak dibuang lebih dulu,
  // tiap penyusunan ulang akan menumpuk grafik baru di atas yang lama.
  try {
    var lama = sh.getCharts();
    for (var c = 0; c < lama.length; c++) sh.removeChart(lama[c]);
  } catch (e) { Logger.log('Grafik lama tidak dapat dibuang: ' + e); }

  var KOL = 18;
  var ASING = ['A1', 'A2'], DOMESTIK = ['D1', 'D2'];

  /* ---------- baris 1: judul ---------- */
  // Tidak di-merge: sel gabungan yang melintasi kolom beku membuat
  // setFrozenColumns gagal.
  sh.getRange(1, 1).setValue('DASBOR PENILAIAN GUIDE — ' + bulan);
  sh.getRange(1, 1, 1, KOL)
    .setFontWeight('bold').setFontSize(12)
    .setFontColor('#FFFFFF').setBackground('#0B5D3B');
  sh.getRange(1, KOL).setValue(capWaktu_())
    .setFontWeight('normal').setFontSize(9).setHorizontalAlignment('right');

  /* ---------- baris 2: catatan ---------- */
  sh.getRange(2, 1).setValue(
    'Angka ASING & DOMESTIK berupa rumus ke tab Rekap regu — ikut berubah begitu kolom REVIEW diperbaiki. ' +
    'Guide yang merangkap Asing dan Domestik terhitung di KEDUA kategori, jadi Asing + Domestik bisa lebih besar dari jumlah guide sesungguhnya.');
  sh.getRange(2, 1, 1, KOL).setFontSize(9).setFontColor('#6B6B6B');

  /* ---------- baris 3: kepala kelompok ---------- */
  sh.getRange(3, 1).setValue('');
  sh.getRange(3, 3, 1, 7).merge().setValue('ASING (A1 + A2)')
    .setHorizontalAlignment('center').setFontWeight('bold').setBackground('#E7F3EC');
  sh.getRange(3, 10, 1, 7).merge().setValue('DOMESTIK (D1 + D2)')
    .setHorizontalAlignment('center').setFontWeight('bold').setBackground('#FFF6E0');
  sh.getRange(3, 17, 1, 2).merge().setValue('GABUNGAN')
    .setHorizontalAlignment('center').setFontWeight('bold').setBackground('#EEF2F7');

  /* ---------- baris 4: kepala kolom ---------- */
  var kepala = ['Tanggal', 'Hari'];
  for (var k = 0; k < 2; k++) {
    kepala.push('Hadir', 'Uniform', 'ID', '% Uniform', '% ID', 'Etika', 'Review');
  }
  kepala.push('% Uniform', '% ID');
  sh.getRange(4, 1, 1, KOL).setValues([kepala])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0B5D3B')
    .setHorizontalAlignment('center');

  /* ---------- baris 5 dst: satu baris per tanggal ---------- */
  var b0 = 5;
  var bAkhir = b0 + tanggal.length - 1;
  if (tanggal.length) {
    // Label tanggal & nama hari lewat setValues — setFormulas akan
    // memperlakukan teks biasa sebagai rumus dan menjadikannya #ERROR!.
    var label = [];
    for (var d = 0; d < tanggal.length; d++) {
      var bagianTgl = tanggal[d].split('-');
      var hariKe = new Date(Number(bagianTgl[0]), Number(bagianTgl[1]) - 1, Number(bagianTgl[2])).getDay();
      label.push([tanggal[d], HARI_ID[hariKe]]);
    }
    sh.getRange(b0, 1, label.length, 2).setValues(label);

    var rumus = [];
    for (var r = 0; r < tanggal.length; r++) {
      var t = tanggal[r], nb = b0 + r, satu = [];
      var blok = [ASING, DOMESTIK];
      for (var kb = 0; kb < 2; kb++) {
        var kodeRegu = blok[kb];
        var kolHadir = kolomHuruf_(3 + kb * 7) + nb;
        var kolUni   = kolomHuruf_(4 + kb * 7) + nb;
        var kolId    = kolomHuruf_(5 + kb * 7) + nb;
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 0, 'COUNT'));   // Hadir
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 0, 'SUM'));     // Uniform
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 1, 'SUM'));     // ID
        satu.push('=IF(' + kolHadir + '=0,"",' + kolUni + '/' + kolHadir + ')');
        satu.push('=IF(' + kolHadir + '=0,"",' + kolId + '/' + kolHadir + ')');
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 3, 'SUM'));     // Etika
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 2, 'SUM'));     // Review
      }
      // Gabungan: dipakai grafik. Guide yang merangkap terhitung dua kali di
      // pembilang DAN penyebut, jadi persentasenya nyaris tidak bergeser.
      var hd = 'C' + nb + '+J' + nb;
      satu.push('=IF(' + hd + '=0,"",(D' + nb + '+K' + nb + ')/(' + hd + '))');
      satu.push('=IF(' + hd + '=0,"",(E' + nb + '+L' + nb + ')/(' + hd + '))');
      rumus.push(satu);
    }
    sh.getRange(b0, 3, rumus.length, KOL - 2).setFormulas(rumus);

    /* ---------- baris penutup: TOTAL / RATA-RATA ---------- */
    var bTotal = bAkhir + 1;
    sh.getRange(bTotal, 1, 1, 2).setValues([['TOTAL', 'sebulan']]);
    var totalRumus = [];
    for (var kb2 = 0; kb2 < 2; kb2++) {
      var oh = kolomHuruf_(3 + kb2 * 7), ou = kolomHuruf_(4 + kb2 * 7);
      var oi = kolomHuruf_(5 + kb2 * 7), oe = kolomHuruf_(8 + kb2 * 7);
      var orv = kolomHuruf_(9 + kb2 * 7);
      var selH = oh + bTotal;
      totalRumus.push('=SUM(' + oh + b0 + ':' + oh + bAkhir + ')');
      totalRumus.push('=SUM(' + ou + b0 + ':' + ou + bAkhir + ')');
      totalRumus.push('=SUM(' + oi + b0 + ':' + oi + bAkhir + ')');
      totalRumus.push('=IF(' + selH + '=0,"",' + ou + bTotal + '/' + selH + ')');
      totalRumus.push('=IF(' + selH + '=0,"",' + oi + bTotal + '/' + selH + ')');
      totalRumus.push('=SUM(' + oe + b0 + ':' + oe + bAkhir + ')');
      totalRumus.push('=SUM(' + orv + b0 + ':' + orv + bAkhir + ')');
    }
    var hdT = 'C' + bTotal + '+J' + bTotal;
    totalRumus.push('=IF(' + hdT + '=0,"",(D' + bTotal + '+K' + bTotal + ')/(' + hdT + '))');
    totalRumus.push('=IF(' + hdT + '=0,"",(E' + bTotal + '+L' + bTotal + ')/(' + hdT + '))');
    sh.getRange(bTotal, 3, 1, KOL - 2).setFormulas([totalRumus]);
    sh.getRange(bTotal, 1, 1, KOL).setFontWeight('bold').setBackground('#FFF6E0');

    // Persen ditampilkan sebagai persen, bukan 0,9333333
    [6, 7, 13, 14, 17, 18].forEach(function (kol) {
      sh.getRange(b0, kol, tanggal.length + 1, 1).setNumberFormat('0%');
    });
  } else {
    sh.getRange(b0, 1).setValue('Belum ada penilaian pada bulan ini.');
  }

  /* ---------- grafik ---------- */
  var barisGrafik = bAkhir + 3;
  if (tanggal.length >= 2) {
    barisGrafik = pasangGrafikKetaatan_(sh, b0, bAkhir, bAkhir + 3);
  }

  /* ---------- tabel peringkat ---------- */
  var reviewPeta = kumpulkanReviewManual_(bulan);
  var daftar = peringkatGuide_(ringkasan, guides, reviewPeta);
  var cukup = daftar.filter(function (x) { return x.hari >= MIN_HARI_PERINGKAT; });
  var kurang = daftar.filter(function (x) { return x.hari < MIN_HARI_PERINGKAT; });

  var baris = barisGrafik;
  baris = tulisJudulBagian_(sh, baris, KOL,
    'PERINGKAT — diurut memakai RATA-RATA, minimal hadir ' + MIN_HARI_PERINGKAT + ' hari (' +
    cukup.length + ' guide memenuhi, ' + kurang.length + ' belum)');

  var pasangan = [
    [{ judul: '🏆 NILAI TOTAL TERTINGGI', data: ambilPeringkat_(cukup, 'rataTotal', false, JML_PERINGKAT), ukuran: 'total' },
     { judul: '⚠️ NILAI TOTAL TERENDAH', data: ambilPeringkat_(cukup, 'rataTotal', true, JML_PERINGKAT), ukuran: 'total' }],
    [{ judul: '👔 PALING TAAT BERPAKAIAN & ID', data: ambilPeringkat_(cukup, 'taat', false, JML_PERINGKAT), ukuran: 'taat' },
     { judul: '👔 PALING TIDAK TAAT BERPAKAIAN & ID', data: ambilPeringkat_(cukup, 'taat', true, JML_PERINGKAT), ukuran: 'taat' }],
    [{ judul: '🤝 ETIKA TERTINGGI', data: ambilPeringkat_(cukup, 'rataEtika', false, JML_PERINGKAT), ukuran: 'etika' },
     { judul: '🤝 ETIKA TERENDAH', data: ambilPeringkat_(cukup, 'rataEtika', true, JML_PERINGKAT), ukuran: 'etika' }],
    [{ judul: '⭐ MENERIMA REVIEW PALING BANYAK',
       data: ambilPeringkat_(daftar.filter(function (x) { return x.review > 0; }), 'review', false, JML_PERINGKAT),
       ukuran: 'review' },
     { judul: 'BELUM CUKUP HARI (< ' + MIN_HARI_PERINGKAT + ' hari, tidak diperingkat)',
       data: ambilPeringkat_(kurang, 'hari', false, JML_PERINGKAT), ukuran: 'total' }]
  ];

  for (var pi = 0; pi < pasangan.length; pi++) {
    var kiri = tulisTabelPeringkat_(sh, baris, 1, pasangan[pi][0]);
    var kanan = tulisTabelPeringkat_(sh, baris, 9, pasangan[pi][1]);
    baris = Math.max(kiri, kanan) + 1;
  }

  sh.setFrozenRows(4);
  sh.setFrozenColumns(2);
  sh.setColumnWidth(1, 110);
  sh.setColumnWidth(2, 72);
  for (var cw = 3; cw <= KOL; cw++) sh.setColumnWidth(cw, 74);

  return {
    tanggal: tanggal.length,
    diperingkat: cukup.length,
    belumCukup: kurang.length,
    grafik: tanggal.length >= 2
  };
}


/**
 * Grafik garis ketaatan harian: dua garis, % taat Uniform dan % taat ID.
 *
 * Dibungkus try/catch dengan sengaja: grafik adalah hiasan, angka-angkanya yang
 * penting. Kalau pembuatan chart gagal (mis. kuota atau versi API), rekap tidak
 * boleh ikut gagal — cukup dicatat di Logger.
 *
 * @return baris pertama yang aman dipakai lagi di bawah grafik
 */
function pasangGrafikKetaatan_(sh, b0, bAkhir, barisAnchor) {
  var TINGGI_BARIS = 19;                      // ruang yang disisakan untuk grafik
  try {
    var grafik = sh.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(sh.getRange(b0, 1, bAkhir - b0 + 1, 1))     // tanggal
      .addRange(sh.getRange(b0, 17, bAkhir - b0 + 1, 2))    // % Uniform, % ID gabungan
      .setNumHeaders(0)
      .setPosition(barisAnchor, 1, 0, 0)
      .setOption('title', 'Ketaatan harian — % Uniform sesuai vs % ID-Card sesuai')
      .setOption('width', 900)
      .setOption('height', 320)
      .setOption('pointSize', 4)
      .setOption('vAxis', { format: 'percent', viewWindow: { min: 0, max: 1 } })
      // Warna garis SENGAJA tidak memakai hijau/emas merek aplikasi. Hijau
      // #0B5D3B terlalu gelap dan terlalu kelabu sebagai garis grafik di latar
      // putih (gagal ambang kecerahan & kejenuhan), dan pasangannya dengan emas
      // tidak cukup terpisah untuk mata yang buta warna. Biru–jingga di bawah
      // lulus seluruh pemeriksaan. Identitas merek tetap dibawa warna judul dan
      // kepala tabel, bukan warna garis data.
      .setOption('series', {
        0: { labelInLegend: '% Uniform sesuai', color: '#2a78d6' },
        1: { labelInLegend: '% ID-Card sesuai', color: '#eb6834' }
      })
      .build();
    sh.insertChart(grafik);
  } catch (e) {
    Logger.log('Grafik ketaatan gagal dibuat: ' + e);
    sh.getRange(barisAnchor, 1).setValue(
      'Grafik gagal dibuat (' + e + '). Angka di atas tetap benar — ' +
      'buat grafik manual dari kolom Tanggal + GABUNGAN bila perlu.');
    return barisAnchor + 2;
  }
  return barisAnchor + TINGGI_BARIS;
}
