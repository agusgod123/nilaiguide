/**
 * ============================================================
 *  Pembacaan & peringkasan data mentah
 *  Berkas 6 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Baca tab Guides & Evaluations, rangkum per guide per hari, baca REVIEW manual.
 *  LARANGAN : Tidak boleh menulis ke tab mana pun. Murni baca → struktur data.
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


/** Baca tab Guides menjadi daftar objek. */
function bacaGuides_() {
  var rows = sheet_(SHEET_GUIDES).getDataRange().getValues().slice(1);
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    if (String(r[4]).toUpperCase() === 'FALSE') continue;
    out.push({
      guideId: String(r[0]).trim(),
      guideName: String(r[1]).trim(),
      kategori: String(r[2] || '').trim(),
      regu: pecahRegu_(r[3])
    });
  }
  return out;
}


/**
 * Rangkum penilaian satu bulan.
 * @return {{ harian: Object, perPos: Object, kehadiran: Object, tanggal: Array }}
 *   harian[guideId][tgl]    = { uniform, idCard, review }   (digabung lintas pos)
 *   perPos[guideId][pos]    = { jml, uniform, idCard, review }
 *   kehadiran[guideId][tgl] = berapa POS yang memeriksa guide itu hari itu (1..3)
 *
 * SATU POS BERNILAI SATU. Diperiksa berkali-kali di pos yang sama pada hari
 * yang sama tetap dihitung satu — pemeriksaan kedua biasanya koreksi, bukan
 * kehadiran tambahan. Karena itu penggabungan dilakukan pada tingkat
 * (guide, pos, tanggal) lebih dulu, baru dijumlahkan.
 */
function rangkumBulan_(bulan) {
  var sh = sheet_(SHEET_EVAL);
  var last = sh.getLastRow();
  var harian = {}, perPosHari = {}, setTanggal = {};
  if (last < 2) return { harian: harian, perPos: {}, kehadiran: {}, tanggal: [] };

  var data = sh.getRange(2, 1, last - 1, HEADER_EVAL.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    // Baris yang sudah digantikan koreksi TIDAK ikut rekap. Barisnya tetap ada
    // di tab Evaluations sebagai jejak, tapi angkanya bukan lagi angka yang
    // berlaku.
    if (String(r[KOL_STATUS - 1] || '').trim().toLowerCase() === STATUS_GANTI) continue;
    var waktu = new Date(r[1]);
    if (isNaN(waktu.getTime())) continue;
    if (kodeBulan_(waktu) !== bulan) continue;

    var tgl = kodeTanggal_(waktu);
    var pos = Number(r[2]) || 0;
    var gid = String(r[3]).trim();
    var uniform = Number(r[5]) ? 1 : 0;
    var idCard = Number(r[6]) ? 1 : 0;
    var review = Math.max(0, Number(r[7]) || 0);
    var etika = Math.min(ETIKA_MAKS, Math.max(ETIKA_MIN, Number(r[8]) || 0));

    setTanggal[tgl] = true;

    if (!harian[gid]) harian[gid] = {};
    var sel = harian[gid][tgl];
    if (!sel) {
      harian[gid][tgl] = { uniform: uniform, idCard: idCard, review: review, etika: etika };
    } else {
      sel.uniform = Math.min(sel.uniform, uniform);   // paling buruk
      sel.idCard = Math.min(sel.idCard, idCard);      // paling buruk
      sel.review = Math.max(sel.review, review);      // jangan hilangkan review
      sel.etika = Math.min(sel.etika, etika);         // paling rendah
    }

    // Gabungan pada tingkat (guide, pos, tanggal) — dasar hitungan kehadiran
    if (!perPosHari[gid]) perPosHari[gid] = {};
    if (!perPosHari[gid][pos]) perPosHari[gid][pos] = {};
    var ph = perPosHari[gid][pos][tgl];
    if (!ph) {
      perPosHari[gid][pos][tgl] = { uniform: uniform, idCard: idCard, review: review, etika: etika };
    } else {
      ph.uniform = Math.min(ph.uniform, uniform);
      ph.idCard = Math.min(ph.idCard, idCard);
      ph.review = Math.max(ph.review, review);
      ph.etika = Math.min(ph.etika, etika);
    }
  }

  // Turunkan rincian per pos dan kehadiran harian dari gabungan di atas
  var perPos = {}, kehadiran = {};
  for (var g in perPosHari) {
    perPos[g] = {};
    kehadiran[g] = {};
    for (var p in perPosHari[g]) {
      var hari = perPosHari[g][p];
      var jml = 0, jUniform = 0, jIdCard = 0, jReview = 0, jEtika = 0;
      for (var t in hari) {
        jml++;                                   // satu hari di pos ini = satu kehadiran
        jUniform += hari[t].uniform;
        jIdCard += hari[t].idCard;
        jReview += hari[t].review;
        jEtika += hari[t].etika;
        kehadiran[g][t] = (kehadiran[g][t] || 0) + 1;
      }
      perPos[g][p] = { jml: jml, uniform: jUniform, idCard: jIdCard, review: jReview, etika: jEtika };
    }
  }

  var tanggal = Object.keys(setTanggal).sort();
  return { harian: harian, perPos: perPos, kehadiran: kehadiran, tanggal: tanggal };
}


/**
 * Baca angka REVIEW yang sudah ada di sebuah tab rekap SEBELUM tab itu
 * ditulis ulang.
 *
 * Review tidak lagi diisi lewat aplikasi — tim mengetiknya langsung di tab
 * rekap. Karena tab ini dibangun ulang setiap malam, angka tersebut harus
 * diselamatkan lebih dulu lalu dikembalikan, kalau tidak akan hilang tiap
 * hari. Kuncinya nama guide + tanggal (bukan nomor baris), jadi tetap cocok
 * walau urutan baris atau jumlah tanggalnya berubah.
 *
 * @return peta 'Nama Guide|yyyy-mm-dd' -> angka
 */
function bacaReviewManual_(namaTab) {
  var peta = {};
  var sh = ss_().getSheetByName(namaTab);
  if (!sh) return peta;

  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 5 || lastCol < 4) return peta;

  // Baris 2 memuat 'TGL: d-m-yyyy' di kolom pertama tiap blok 4 kolom.
  var barisTgl = sh.getRange(2, 1, 1, lastCol).getValues()[0];
  var kolTgl = {};                              // kolom REVIEW -> 'yyyy-mm-dd'
  for (var c = 2; c + 2 <= lastCol; c += 4) {
    var m = String(barisTgl[c - 1] || '').match(/TGL:\s*(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (!m) continue;
    kolTgl[c + 2] = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  var kolom = Object.keys(kolTgl);
  if (!kolom.length) return peta;

  var data = sh.getRange(5, 1, lastRow - 4, lastCol).getValues();
  for (var i = 0; i < data.length; i++) {
    var nama = String(data[i][0] || '').trim();
    if (!nama) continue;
    for (var k = 0; k < kolom.length; k++) {
      var kol = Number(kolom[k]);
      var n = Number(data[i][kol - 1]);
      if (!isFinite(n) || n === 0) continue;     // kosong / 0 tidak perlu disimpan
      peta[nama + '|' + kolTgl[kol]] = n;
    }
  }
  return peta;
}


/**
 * Kumpulkan angka REVIEW yang diketik tim, dari SELURUH tab regu.
 *
 * REVIEW tidak pernah dikirim aplikasi — satu-satunya sumbernya adalah ketikan
 * manual di tab rekap regu. Guide yang merangkap beberapa regu muncul di lebih
 * dari satu tab, dan angkanya bisa saja hanya diketik di salah satunya; diambil
 * yang paling besar, mengikuti aturan "jangan hilangkan review" yang sudah
 * dipakai rangkumBulan_.
 *
 * @return peta 'Nama Guide|yyyy-mm-dd' -> angka
 */
function kumpulkanReviewManual_(bulan) {
  var gabung = {};
  for (var i = 0; i < REGU_INFO.length; i++) {
    var peta = bacaReviewManual_(namaTabRekap_(REGU_INFO[i].kode, bulan));
    for (var k in peta) {
      if (gabung[k] === undefined || peta[k] > gabung[k]) gabung[k] = peta[k];
    }
  }
  return gabung;
}
