/**
 * ============================================================
 *  Perhitungan & penulisan tabel peringkat
 *  Berkas 9 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Hitung nilai per guide, urutkan, tulis tabel peringkat di tab Dasbor.
 *  LARANGAN : Syarat MIN_PENGANTARAN_PERINGKAT ditegakkan di sini; yang di bawah batas
 *          TIDAK dibuang, hanya dipindah ke tabel "belum cukup hari".
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


/**
 * Hitung angka per guide untuk seluruh tabel peringkat.
 *
 * Nilai TOTAL = Uniform + ID + Etika + Review, sama persis dengan blok TOTAL di
 * tab rekap regu, supaya angka di dasbor bisa langsung dicocokkan ke sana.
 *
 * Dua ukuran dilaporkan berdampingan dan itu disengaja:
 *   - jumlah    : untuk menelusuri angkanya ke tab rekap
 *   - rata-rata : untuk membandingkan antar guide secara adil
 *
 * Pembaginya PENGANTARAN, bukan hari. Banyaknya pengantaran ditentukan urutan
 * giliran, bukan kualitas guide-nya, jadi reward yang disandarkan pada jumlah
 * akan memihak guide yang kebagian giliran lebih banyak.
 *
 * @return array objek per guide (hanya guide aktif yang punya data)
 */
function peringkatGuide_(ringkasan, guides, reviewPeta) {
  var out = [];
  for (var i = 0; i < guides.length; i++) {
    var g = guides[i];
    var harian = ringkasan.harian[g.guideId] || {};
    var hari = 0, antar = 0, sU = 0, sUPatuh = 0, sID = 0, sEtika = 0;
    var sReview = 0, hariReview = 0;

    // Tanggal yang punya penilaian
    for (var tgl in harian) {
      var sel = harian[tgl];
      // REVIEW diketik tim per HARI di tab rekap, bukan per pengantaran, jadi
      // granularitasnya memang berbeda dari kriteria lain. Dibiarkan begitu:
      // satu-satunya sumbernya ketikan manual, dan memecahnya per pengantaran
      // berarti mengarang angka yang tidak pernah diisi siapa pun.
      var rvw = reviewPeta[g.guideName + '|' + tgl];
      if (rvw === undefined) rvw = sel.review || 0;
      hari++;
      antar += sel.antar;
      sU += sel.uniform;
      sUPatuh += sel.uniformPatuh;
      sID += sel.idCard;
      sEtika += sel.etika || 0;
      sReview += rvw;
      if (rvw > 0) hariReview++;
    }

    // Tanggal yang HANYA punya review manual (tidak ada penilaian dari
    // aplikasi hari itu) tetap dihitung untuk peringkat review — angka itu
    // sudah diketik tim dan tidak boleh hilang hanya karena tidak ada
    // penilaian pendampingnya.
    var awalan = g.guideName + '|';
    for (var kunci in reviewPeta) {
      if (kunci.indexOf(awalan) !== 0) continue;
      var tglR = kunci.slice(awalan.length);
      if (harian[tglR]) continue;
      var n = reviewPeta[kunci];
      if (n > 0) { sReview += n; hariReview++; }
    }

    if (!hari && !hariReview) continue;              // tidak ada data sama sekali

    var total = sU + sID + sEtika + sReview;
    out.push({
      guideId: g.guideId,
      nama: g.guideName,
      regu: g.regu.join(', '),
      kategori: g.kategori,
      hari: hari,
      antar: antar,
      uniform: sU,
      // Cacah pengantaran yang berpakaian sesuai — dipakai kolom persen, yang
      // tidak boleh memakai jumlah nilai karena skalanya -1..+2.
      uniformPatuh: sUPatuh,
      idCard: sID,
      etika: sEtika,
      review: sReview,
      hariReview: hariReview,
      total: total,
      rataTotal: antar ? total / antar : 0,
      // Ketaatan memakai CACAH yang patuh, bukan jumlah nilainya: Uniform kini
      // bernilai -1/+1/+2, sehingga menjumlahkannya lalu membagi 2 kesempatan
      // akan menghasilkan persentase di luar 0..100%.
      taat: antar ? (sUPatuh + sID) / (2 * antar) : 0,
      // Mutu berpakaian pada skalanya sendiri (-1..+2) — inilah yang membedakan
      // "pakaian sesuai" dari "penampilan bagus", yang hilang di kolom persen.
      rataUniform: antar ? sU / antar : 0,
      rataEtika: antar ? sEtika / antar : 0
    });
  }
  return out;
}


/** Urutkan salinan daftar, lalu ambil sekian teratas. */
function ambilPeringkat_(daftar, kunci, naik, jml) {
  var salinan = daftar.slice();
  salinan.sort(function (a, b) {
    var beda = naik ? a[kunci] - b[kunci] : b[kunci] - a[kunci];
    // Pengantaran lebih banyak dimenangkan saat nilainya sama: peringkat yang
    // disandarkan pada rata-rata harus mengutamakan bukti yang lebih banyak.
    if (beda) return beda;
    if (a.antar !== b.antar) return b.antar - a.antar;
    return a.nama.toLowerCase() < b.nama.toLowerCase() ? -1 : 1;
  });
  return salinan.slice(0, jml);
}


/** Judul satu bagian, membentang selebar tabel. */
function tulisJudulBagian_(sh, baris, kol, teks) {
  sh.getRange(baris, 1).setValue(teks);
  sh.getRange(baris, 1, 1, kol)
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0B5D3B');
  return baris + 2;
}


/**
 * Satu tabel peringkat, 7 kolom mulai dari `kolAwal`.
 * @return nomor baris terakhir yang terpakai
 */
function tulisTabelPeringkat_(sh, baris, kolAwal, tabel) {
  var ukuranLabel = {
    total:  'Rata-rata/antar',
    taat:   '% Taat',
    etika:  'Rata-rata Etika',
    review: 'Jumlah Review'
  };
  sh.getRange(baris, kolAwal).setValue(tabel.judul);
  sh.getRange(baris, kolAwal, 1, 7).setFontWeight('bold').setBackground('#EEF2F7');

  var kepala = ['#', 'Nama Guide', 'Regu', 'Antar', 'Jumlah Nilai',
                ukuranLabel[tabel.ukuran], 'Rincian'];
  sh.getRange(baris + 1, kolAwal, 1, 7).setValues([kepala])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#4A6B58');

  if (!tabel.data.length) {
    sh.getRange(baris + 2, kolAwal).setValue('(belum ada data)');
    return baris + 2;
  }

  var isi = [];
  for (var i = 0; i < tabel.data.length; i++) {
    var x = tabel.data[i];
    var ukuran, rincian;
    if (tabel.ukuran === 'taat') {
      ukuran = x.taat;
      // Uniform tidak lagi bisa ditulis "sekian dari sekian": nilainya -1/+1/+2,
      // jadi mutunya dilaporkan sebagai rata-rata, sementara ID tetap cacah.
      rincian = 'Mutu uniform ' + (Math.round(x.rataUniform * 100) / 100) +
                ' · ID ' + x.idCard + '/' + x.antar;
    } else if (tabel.ukuran === 'etika') {
      ukuran = Math.round(x.rataEtika * 100) / 100;
      rincian = 'Total etika ' + x.etika;
    } else if (tabel.ukuran === 'review') {
      ukuran = x.review;
      rincian = x.hariReview + ' hari menerima review';
    } else {
      ukuran = Math.round(x.rataTotal * 100) / 100;
      rincian = 'U ' + x.uniform + ' · ID ' + x.idCard + ' · Etika ' + x.etika + ' · Review ' + x.review;
    }
    isi.push([i + 1, x.nama, x.regu, x.antar, x.total, ukuran, rincian]);
  }
  sh.getRange(baris + 2, kolAwal, isi.length, 7).setValues(isi);
  if (tabel.ukuran === 'taat') {
    sh.getRange(baris + 2, kolAwal + 5, isi.length, 1).setNumberFormat('0%');
  }
  return baris + 1 + isi.length;
}
