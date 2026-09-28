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
 * @param {number} offset     0=UNI FORM, 1=ID, 2=REVIEW, 3=ETIKA, 4=ANTAR, 5=PATUH
 * @param {string} fungsi     'SUM' atau 'COUNT'
 */
function rumusKategori_(infoRegu, kodeRegu, tgl, offset, fungsi) {
  return '=' + ekspresiKategori_(infoRegu, kodeRegu, tgl, offset, fungsi);
}


/** Sama, tanpa '=' di depan — supaya bisa disisipkan ke dalam rumus lain. */
function ekspresiKategori_(infoRegu, kodeRegu, tgl, offset, fungsi) {
  var bagian = [];
  for (var i = 0; i < kodeRegu.length; i++) {
    var info = infoRegu[kodeRegu[i]];
    if (!info || !info.anggota) continue;
    var idx = info.tanggalList.indexOf(tgl);
    if (idx === -1) continue;                        // tab ini tidak punya tanggal itu
    var kol = kolomHuruf_(2 + idx * 6 + offset);     // blok tanggal 6 kolom
    bagian.push(fungsi + "('" + info.namaTab + "'!" +
                kol + info.barisAwal + ':' + kol + info.barisAkhir + ')');
  }
  return bagian.length ? bagian.join('+') : '0';
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

  var LEBAR_KAT = 10;                 // kolom per kategori
  var KOL = 2 + LEBAR_KAT * 2 + 2;    // Tanggal, Hari, 2 kategori, GABUNGAN
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
  sh.getRange(3, 3, 1, LEBAR_KAT).merge().setValue('ASING (A1 + A2)')
    .setHorizontalAlignment('center').setFontWeight('bold').setBackground('#E7F3EC');
  sh.getRange(3, 3 + LEBAR_KAT, 1, LEBAR_KAT).merge().setValue('DOMESTIK (D1 + D2)')
    .setHorizontalAlignment('center').setFontWeight('bold').setBackground('#FFF6E0');
  sh.getRange(3, 3 + LEBAR_KAT * 2, 1, 2).merge().setValue('GABUNGAN')
    .setHorizontalAlignment('center').setFontWeight('bold').setBackground('#EEF2F7');

  /* ---------- baris 4: kepala kolom ---------- */
  var kepala = ['Tanggal', 'Hari'];
  // Hadir  = berapa GUIDE berbeda yang dinilai hari itu
  // Antar  = berapa PENGANTARAN — inilah penyebut semua rata-rata di baris ini
  // Patuh  = berapa pengantaran yang berpakaian sesuai (nilai >= +1)
  // Mutu Uni = rata-rata nilai Uniform pada skalanya sendiri (-1..+2); kolom
  //            persen tidak bisa membedakan "sesuai" dari "penampilan bagus"
  for (var k = 0; k < 2; k++) {
    kepala.push('Hadir', 'Antar', 'Uniform', 'ID', 'Patuh',
                '% Uniform', '% ID', 'Mutu Uni', 'Etika', 'Review');
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
        var pangkal  = 3 + kb * LEBAR_KAT;
        var kolAntar = kolomHuruf_(pangkal + 1) + nb;
        var kolUni   = kolomHuruf_(pangkal + 2) + nb;
        var kolId    = kolomHuruf_(pangkal + 3) + nb;
        var kolPatuh = kolomHuruf_(pangkal + 4) + nb;
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 0, 'COUNT'));   // Hadir (guide)
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 4, 'SUM'));     // Antar
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 0, 'SUM'));     // Uniform
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 1, 'SUM'));     // ID
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 5, 'SUM'));     // Patuh
        // Penyebutnya PENGANTARAN, bukan jumlah guide: satu guide bisa
        // mengantar berkali-kali sehari, dan tiap pengantaran dinilai sendiri.
        satu.push('=IF(' + kolAntar + '=0,"",' + kolPatuh + '/' + kolAntar + ')');
        satu.push('=IF(' + kolAntar + '=0,"",' + kolId + '/' + kolAntar + ')');
        satu.push('=IF(' + kolAntar + '=0,"",' + kolUni + '/' + kolAntar + ')');
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 3, 'SUM'));     // Etika
        satu.push(rumusKategori_(infoRegu, kodeRegu, t, 2, 'SUM'));     // Review
      }
      // Gabungan: dipakai grafik. Guide yang merangkap terhitung dua kali di
      // pembilang DAN penyebut, jadi persentasenya nyaris tidak bergeser.
      var aA = kolomHuruf_(4) + nb, aD = kolomHuruf_(4 + LEBAR_KAT) + nb;
      var pA = kolomHuruf_(7) + nb, pD = kolomHuruf_(7 + LEBAR_KAT) + nb;
      var iA = kolomHuruf_(6) + nb, iD = kolomHuruf_(6 + LEBAR_KAT) + nb;
      var an = aA + '+' + aD;
      satu.push('=IF(' + an + '=0,"",(' + pA + '+' + pD + ')/(' + an + '))');
      satu.push('=IF(' + an + '=0,"",(' + iA + '+' + iD + ')/(' + an + '))');
      rumus.push(satu);
    }
    sh.getRange(b0, 3, rumus.length, KOL - 2).setFormulas(rumus);

    /* ---------- baris penutup: TOTAL / RATA-RATA ---------- */
    var bTotal = bAkhir + 1;
    sh.getRange(bTotal, 1, 1, 2).setValues([['TOTAL', 'sebulan']]);
    var totalRumus = [];
    var jum = function (kol) { return '=SUM(' + kol + b0 + ':' + kol + bAkhir + ')'; };
    for (var kb2 = 0; kb2 < 2; kb2++) {
      var pk = 3 + kb2 * LEBAR_KAT;
      var oh = kolomHuruf_(pk), oa = kolomHuruf_(pk + 1), ou = kolomHuruf_(pk + 2);
      var oi = kolomHuruf_(pk + 3), op = kolomHuruf_(pk + 4);
      var oe = kolomHuruf_(pk + 8), orv = kolomHuruf_(pk + 9);
      var selA = oa + bTotal;
      totalRumus.push(jum(oh));   // Hadir: guide-hari, bukan guide berbeda
      totalRumus.push(jum(oa));
      totalRumus.push(jum(ou));
      totalRumus.push(jum(oi));
      totalRumus.push(jum(op));
      totalRumus.push('=IF(' + selA + '=0,"",' + op + bTotal + '/' + selA + ')');
      totalRumus.push('=IF(' + selA + '=0,"",' + oi + bTotal + '/' + selA + ')');
      totalRumus.push('=IF(' + selA + '=0,"",' + ou + bTotal + '/' + selA + ')');
      totalRumus.push(jum(oe));
      totalRumus.push(jum(orv));
    }
    var anT = kolomHuruf_(4) + bTotal + '+' + kolomHuruf_(4 + LEBAR_KAT) + bTotal;
    var pT = kolomHuruf_(7) + bTotal + '+' + kolomHuruf_(7 + LEBAR_KAT) + bTotal;
    var iT = kolomHuruf_(6) + bTotal + '+' + kolomHuruf_(6 + LEBAR_KAT) + bTotal;
    totalRumus.push('=IF(' + anT + '=0,"",(' + pT + ')/(' + anT + '))');
    totalRumus.push('=IF(' + anT + '=0,"",(' + iT + ')/(' + anT + '))');
    sh.getRange(bTotal, 3, 1, KOL - 2).setFormulas([totalRumus]);
    sh.getRange(bTotal, 1, 1, KOL).setFontWeight('bold').setBackground('#FFF6E0');

    // Persen ditampilkan sebagai persen, bukan 0,9333333
    [8, 9, 18, 19, 23, 24].forEach(function (kol) {
      sh.getRange(b0, kol, tanggal.length + 1, 1).setNumberFormat('0%');
    });
    // Mutu Uniform bukan persen — skalanya -1..+2.
    [10, 20].forEach(function (kol) {
      sh.getRange(b0, kol, tanggal.length + 1, 1).setNumberFormat('0.00');
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
  var cukup = daftar.filter(function (x) { return x.antar >= MIN_PENGANTARAN_PERINGKAT; });
  var kurang = daftar.filter(function (x) { return x.antar < MIN_PENGANTARAN_PERINGKAT; });

  var baris = barisGrafik;
  baris = tulisJudulBagian_(sh, baris, KOL,
    'PERINGKAT — diurut memakai RATA-RATA PER PENGANTARAN, minimal ' +
    MIN_PENGANTARAN_PERINGKAT + ' pengantaran (' +
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
     { judul: 'BELUM CUKUP PENGANTARAN (< ' + MIN_PENGANTARAN_PERINGKAT + ', tidak diperingkat)',
       data: ambilPeringkat_(kurang, 'antar', false, JML_PERINGKAT), ukuran: 'total' }]
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
      .addRange(sh.getRange(b0, 23, bAkhir - b0 + 1, 2))    // % Uniform, % ID gabungan
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
