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
 * Satu pengantaran = satu baris penilaian yang masih aktif.
 *
 * Dulu penilaian digabung ke tingkat (guide, hari) dan diambil yang PALING
 * BURUK, karena satu pos hanya boleh menilai sekali sehari sehingga baris kedua
 * pasti koreksi. Sejak penilaian dihitung per pengantaran, baris kedua adalah
 * pengantaran yang benar-benar berbeda — jadi tidak boleh lagi saling menimpa.
 * Yang dikumpulkan sekarang JUMLAH dan CACAH, supaya rata-rata per pengantaran
 * bisa dihitung di mana pun angkanya dibutuhkan.
 */
function tambahPengantaran_(peta, kunci, n) {
  var s = peta[kunci];
  if (!s) s = peta[kunci] = { antar: 0, uniform: 0, idCard: 0, review: 0,
                              etika: 0, uniformPatuh: 0 };
  s.antar++;
  s.uniform += n.uniform;
  s.idCard  += n.idCard;
  s.review  += n.review;
  s.etika   += n.etika;
  // Kolom persen hanya mengenal patuh / tidak, sementara Uniform punya tiga
  // tingkat — cacahnya dihitung terpisah dari jumlah mutunya.
  if (n.uniform >= UNIFORM_PATUH) s.uniformPatuh++;
  return s;
}


/** Rata-rata per pengantaran; 0 pengantaran menghasilkan null, bukan 0. */
function rataPengantaran_(s, kolom) {
  if (!s || !s.antar) return null;
  return s[kolom] / s.antar;
}


/**
 * Rangkum penilaian satu bulan.
 * @return {{ harian: Object, perPos: Object, total: Object, tanggal: Array }}
 *   harian[guideId][tgl] = { antar, uniform, idCard, review, etika, uniformPatuh }
 *                          JUMLAH seluruh pengantaran guide itu pada hari itu
 *   perPos[guideId][pos] = idem, dikelompokkan per pos sebulan
 *   total[guideId]       = idem, seluruh bulan — dasar rata-rata per pengantaran
 *
 * perPos sengaja dipertahankan sebagai pengaman: kalau Pos 1 dan Pos 3 ternyata
 * menilai dengan standar berbeda, guide yang lebih sering ketemu satu pos jadi
 * diuntungkan atau dirugikan. Selisihnya harus bisa dilihat, bukan ditebak.
 */
function rangkumBulan_(bulan) {
  return rangkumSaring_(function (tgl) { return tgl.slice(0, 7) === bulan; });
}


/**
 * Rangkum penilaian dalam rentang tanggal, kedua ujung ikut ('yyyy-MM-dd').
 * Dipakai rekap mingguan: satu minggu Senin–Minggu bisa melintasi dua bulan,
 * jadi tidak bisa menumpang rangkumBulan_. Bentuk hasilnya sama persis.
 */
function rangkumRentang_(awal, akhir) {
  return rangkumSaring_(function (tgl) { return tgl >= awal && tgl <= akhir; });
}


/**
 * Inti bersama rangkumBulan_ dan rangkumRentang_ — SATU-SATUNYA tempat aturan
 * agregasi ditulis. Yang membedakan keduanya hanya tanggal mana yang diambil.
 * Jangan menyalin isi fungsi ini ke tempat lain: setiap kali aturan penilaian
 * berubah (seperti pada putaran per pengantaran), salinan yang terlupa akan
 * diam-diam menghitung dengan aturan lama.
 *
 * @param {function(string): boolean} cocok  menerima 'yyyy-MM-dd' zona spreadsheet
 */
function rangkumSaring_(cocok) {
  var sh = sheet_(SHEET_EVAL);
  var last = sh.getLastRow();
  var harian = {}, perPos = {}, total = {}, setTanggal = {};
  if (last < 2) return { harian: harian, perPos: perPos, total: total, tanggal: [] };

  var data = sh.getRange(2, 1, last - 1, HEADER_EVAL.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    // Baris yang sudah digantikan koreksi TIDAK ikut rekap. Barisnya tetap ada
    // di tab Evaluations sebagai jejak, tapi angkanya bukan lagi yang berlaku.
    if (String(r[KOL_STATUS - 1] || '').trim().toLowerCase() === STATUS_GANTI) continue;
    var waktu = new Date(r[1]);
    if (isNaN(waktu.getTime())) continue;

    var tgl = kodeTanggal_(waktu);
    if (!cocok(tgl)) continue;
    var pos = Number(r[2]) || 0;
    var gid = String(r[3]).trim();
    // normalUniform_ dipakai bersama pintu masuk data, supaya baris lama
    // (Ya/Tidak = 1/0) dan baris baru (-1/+1/+2) terbaca dengan skala sama.
    var n = {
      uniform: normalUniform_(r[5]),
      idCard:  Number(r[6]) ? 1 : 0,
      review:  Math.max(0, Number(r[7]) || 0),
      etika:   Math.min(ETIKA_MAKS, Math.max(ETIKA_MIN, Number(r[8]) || 0))
    };

    setTanggal[tgl] = true;
    if (!harian[gid]) harian[gid] = {};
    tambahPengantaran_(harian[gid], tgl, n);
    if (!perPos[gid]) perPos[gid] = {};
    tambahPengantaran_(perPos[gid], pos, n);
    tambahPengantaran_(total, gid, n);
  }

  var tanggal = Object.keys(setTanggal).sort();
  return { harian: harian, perPos: perPos, total: total, tanggal: tanggal };
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

  // Baris 2 memuat 'TGL: d-m-yyyy' di sel pertama tiap blok tanggal.
  //
  // SELURUH kolom dipindai, bukan melompat selebar blok. Lebar blok pernah
  // berubah (4 kolom sebelum kolom ANTAR ditambahkan, 5 sesudahnya), dan tab
  // bulan-bulan lama masih memakai lebar lama. Melompat dengan lebar tetap
  // membuat pembacaan tab lama meleset — dan REVIEW hanya ada di tab ini,
  // diketik tangan oleh tim, jadi salah baca berarti angkanya HILANG saat tab
  // disusun ulang. Yang tetap benar di kedua tata letak: REVIEW selalu kolom
  // ketiga blok, dua kolom setelah sel bertanda 'TGL:'.
  var barisTgl = sh.getRange(2, 1, 1, lastCol).getValues()[0];
  var kolTgl = {};                              // kolom REVIEW -> 'yyyy-mm-dd'
  for (var c = 2; c + 2 <= lastCol; c++) {
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
