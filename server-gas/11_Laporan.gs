/**
 * ============================================================
 *  Laporan bulanan siap cetak (A4 tegak)
 *  Berkas 12 dari 12 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Menyusun satu tab `Laporan YYYY-MM` yang ditata untuk kertas
 *             A4 TEGAK — kop, ringkasan sebulan, ringkasan per regu,
 *             ringkasan harian + grafik, tujuh tabel peringkat, lalu daftar
 *             lengkap tiap regu (A1, A2, D1, D2), ditutup blok tanda tangan.
 *             Opsional: mengekspor tab itu menjadi berkas PDF di Drive.
 *
 *  LARANGAN : Tidak menghitung ulang aturan penilaian. Angka per guide
 *             diambil dari 08_Peringkat.gs; angka harian disalin dari tab
 *             Dasbor. Berkas ini hanya MENATA. Kalau ada angka yang salah,
 *             perbaiki di berkas asalnya — jangan ditambal di sini.
 *
 *             WAJIB dijalankan SETELAH bangunDasbor_ (lihat 10_Trigger.gs).
 *             Ringkasan hariannya menyalin nilai dari tab Dasbor, jadi tab
 *             itu harus sudah final.
 *
 *  Angka laporan sengaja ditulis sebagai NILAI MATI, bukan rumus. Laporan
 *  adalah cetakan sesaat untuk arsip: kalau kolom REVIEW manual diperbaiki
 *  bulan depan, lembar yang sudah ditandatangani tidak boleh ikut berubah.
 *  (Itu kebalikan dari tab Dasbor, yang memang sengaja memakai rumus.)
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 */


/* =========================================================================
   BAGIAN 0 — Yang boleh diubah tanpa menyentuh logika
   ========================================================================= */

/** Kop surat. Ganti sesuai nama resmi instansi. */
const LAP_INSTANSI = 'PENGELOLA KAWASAN SUCI BESAKIH';
const LAP_JUDUL    = 'LAPORAN BULANAN PENILAIAN GUIDE';
const LAP_KOTA     = 'Besakih';

/** Blok tanda tangan. Dua kolom; tambah/kurangi sesuai kebutuhan. */
const LAP_TTD = [
  { jabatan: 'Mengetahui,',  peran: 'Koordinator Lapangan' },
  { jabatan: 'Disusun oleh,', peran: 'Petugas Rekap' }
];

/** Awalan nama tab laporan. */
const LAP_PREFIX = 'Laporan ';

/**
 * Tata letak halaman A4 tegak.
 *
 * Lebar cetak A4 tegak dengan margin 0,5 inci kiri-kanan ≈ 698 px.
 * Sembilan kolom di bawah berjumlah 608 px, jadi muat TANPA diperkecil —
 * itu penting, karena begitu Google memperkecil isi supaya muat lebarnya,
 * tinggi barisnya ikut mengecil dan hitungan LAP_BARIS_HALAMAN meleset.
 *
 * LAP_BARIS_HALAMAN: Apps Script TIDAK punya API pemutus halaman, jadi
 * "tiap regu mulai di halaman baru" dikerjakan dengan menyisipkan baris
 * kosong sampai batas halaman berikutnya. Angkanya perlu DIKALIBRASI SEKALI:
 * cetak sekali, hitung baris terakhir yang masih muat di halaman 1, lalu
 * isikan di sini. 48 adalah tebakan awal untuk tinggi baris 19 px.
 */
const LAP_LEBAR         = [172, 52, 56, 56, 56, 56, 52, 52, 56]; // total 608 px
const LAP_TINGGI_BARIS  = 19;
const LAP_BARIS_HALAMAN = 48;
const LAP_KOL           = LAP_LEBAR.length;                      // 9 kolom, A..I
const LAP_BARIS_MIN     = 1500;                                  // ruang tulis; sisanya dibuang di akhir

/** Berapa nama yang ditampilkan di tiap tabel peringkat. */
const LAP_TOP_N = 10;

/**
 * Dasar pengurutan tabel "nilai total".
 *   'rata'   — rata-rata nilai per hari hadir (sama seperti tab Dasbor sekarang)
 *   'jumlah' — jumlah nilai sebulan (sesuai kata "jumlah nilai" di permintaan awal)
 *
 * Ini keputusan yang masih menggantung di §4 dokumen konteks. Sengaja dibuat
 * saklar supaya bisa diputuskan tanpa mengubah kode.
 */
const LAP_URUT_TOTAL = 'rata';

/** Urutan daftar per regu: 'nama' (mudah dicari) atau 'total' (peringkat). */
const LAP_URUT_DAFTAR = 'nama';

/**
 * Ikut menampilkan guide yang sebulan itu tidak pernah dinilai (hari = 0).
 *
 * peringkatGuide_() sengaja melewati mereka — untuk peringkat memang tidak
 * ada gunanya. Untuk laporan arsip biasanya justru perlu, supaya terlihat
 * siapa yang tidak pernah muncul. Kolom persen pada baris itu ditulis "—",
 * bukan 0%, supaya tidak terbaca sebagai "melanggar".
 */
const LAP_TAMPILKAN_NOL = true;

/** Warna. Sama dengan keputusan grafik di tab Dasbor (jebakan warna merek). */
const LAP_WARNA = {
  judul   : '#0B5D3B',   // hijau merek — aman untuk teks, tidak untuk garis grafik
  kepala  : '#e9edf0',
  garis   : '#9aa5ad',
  redup   : '#6b7780',
  seriU   : '#2a78d6',
  seriId  : '#eb6834'
};

/**
 * Peta kolom tab Dasbor.
 *
 * Susunan tab Dasbor: Tanggal, Hari, tujuh kolom ASING (Hadir, Uniform, ID,
 * %Uniform, %ID, Etika, Review), tujuh kolom DOMESTIK dengan urutan sama,
 * lalu dua kolom GABUNGAN (%Uniform, %ID) → 18 kolom, A..R.
 *
 * Kalau susunan itu berubah, ubah angka di sini — jangan menebak di kode.
 */
const LAP_KOL_DASBOR = {
  tanggal: 1,  hari: 2,
  hadirA : 3,  etikaA: 8,  reviewA: 9,
  hadirD : 10, etikaD: 15, reviewD: 16,
  gabU   : 17, gabId : 18
};

/**
 * Nama medan yang dicari pada hasil peringkatGuide_().
 *
 * Sudah dicocokkan dengan 08_Peringkat.gs: nama, regu, hari, uniform, idCard,
 * etika, review, total. Daftar alias di bawah hanya jaring pengaman kalau
 * salah satunya kelak berganti nama — cukup tambahkan namanya di sini,
 * TIDAK perlu menyentuh bagian lain berkas ini.
 * Jalankan ujiLaporan() untuk melihat medan mana yang akhirnya terpakai.
 *
 * Catatan: 'id' sengaja TIDAK dimasukkan ke daftar idcard, supaya tidak
 * tertukar dengan guideId.
 */
const LAP_PETA = {
  nama   : ['nama', 'namaGuide', 'name', 'guide'],
  regu   : ['regu', 'reguList', 'reguTeks', 'regus'],
  hari   : ['hari', 'hariHadir', 'jmlHari', 'hadir'],
  uniform: ['uniform', 'jmlUniform', 'totalUniform', 'seragam'],
  idcard : ['idCard', 'idcard', 'kartu', 'jmlId', 'totalId'],
  etika  : ['etika', 'jmlEtika', 'totalEtika'],
  review : ['review', 'jmlReview', 'totalReview'],
  total  : ['total', 'nilaiTotal', 'jumlah', 'jml']
};

/** Regu yang dicetak, berurutan, beserta judul bagiannya. */
const LAP_REGU = [
  { kode: 'A1', judul: 'REGU A1 — GUIDE ASING 1',     kategori: 'Asing' },
  { kode: 'A2', judul: 'REGU A2 — GUIDE ASING 2',     kategori: 'Asing' },
  { kode: 'D1', judul: 'REGU D1 — GUIDE DOMESTIK 1',  kategori: 'Domestik' },
  { kode: 'D2', judul: 'REGU D2 — GUIDE DOMESTIK 2',  kategori: 'Domestik' }
];


/* =========================================================================
   BAGIAN 1 — Pembantu kecil (tanpa ketergantungan ke berkas lain)
   ========================================================================= */

/** Spreadsheet aktif. Memakai ss_() dari 02_Util.gs bila ada. */
function lapSs_() {
  return (typeof ss_ === 'function') ? ss_() : SpreadsheetApp.getActive();
}

/** Nama tab laporan untuk satu bulan. */
function namaTabLaporan_(bulan) {
  return LAP_PREFIX + bulan;
}

/** Nama tab dasbor. Memakai namaTabDasbor_() dari 02_Util.gs bila ada. */
function lapNamaDasbor_(bulan) {
  return (typeof namaTabDasbor_ === 'function') ? namaTabDasbor_(bulan) : 'Dasbor ' + bulan;
}

/** Zona waktu spreadsheet. */
function lapZona_() {
  return (typeof ZONA_WAKTU === 'string' && ZONA_WAKTU) ? ZONA_WAKTU : 'Asia/Makassar';
}

/** Kode bulan 'YYYY-MM' untuk hari ini, di zona spreadsheet. */
function lapBulanIni_() {
  return Utilities.formatDate(new Date(), lapZona_(), 'yyyy-MM');
}

/** Kode bulan 'YYYY-MM' untuk bulan sebelumnya. */
function lapBulanLalu_() {
  const kini = new Date();
  const d = new Date(kini.getFullYear(), kini.getMonth() - 1, 15);
  return Utilities.formatDate(d, lapZona_(), 'yyyy-MM');
}

/** '2026-08' → 'Agustus 2026'. Memakai BULAN_ID dari 00_Konstanta.gs bila ada. */
function lapBulanTeks_(bulan) {
  const bagian = String(bulan).split('-');
  const idx = Number(bagian[1]) - 1;
  const cadangan = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
  const daftar = (typeof BULAN_ID !== 'undefined' && BULAN_ID && BULAN_ID.length >= 12)
    ? BULAN_ID : cadangan;
  return (daftar[idx] || bagian[1]) + ' ' + bagian[0];
}

/** Batas minimal hari untuk masuk peringkat. */
function lapMinHari_() {
  return (typeof MIN_HARI_PERINGKAT === 'number') ? MIN_HARI_PERINGKAT : 3;
}

/** Pembagian yang aman dari nol. */
function lapBagi_(atas, bawah) {
  return (bawah > 0) ? (atas / bawah) : 0;
}

/** Angka dari nilai apa pun; bukan angka → 0. */
function lapNum_(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

/**
 * Persentase yang dinormalkan jadi pecahan 0..1.
 * Tab Dasbor bisa menyimpannya sebagai 0,93 atau sebagai 93 — keduanya diterima.
 */
function lapPersen_(v) {
  const n = lapNum_(v);
  return (n > 1.5) ? n / 100 : n;
}

/** Daftar regu dari nilai yang bisa berupa larik, 'A1,D2', atau 'A1 D2'. */
function lapReguList_(v) {
  if (Array.isArray(v)) return v.map(function (x) { return String(x).trim().toUpperCase(); });
  return String(v == null ? '' : v)
    .split(/[,;/ ]+/)
    .map(function (x) { return x.trim().toUpperCase(); })
    .filter(function (x) { return x.length > 0; });
}

/** Mencari medan bernilai angka pada satu objek, menurut daftar nama kandidat. */
function lapMedanAngka_(obj, kandidat) {
  for (let i = 0; i < kandidat.length; i++) {
    const v = obj[kandidat[i]];
    if (typeof v === 'number' && isFinite(v)) return { kunci: kandidat[i], nilai: v };
  }
  return null;
}

/** Mencari medan bernilai teks/larik pada satu objek. */
function lapMedanTeks_(obj, kandidat) {
  for (let i = 0; i < kandidat.length; i++) {
    const v = obj[kandidat[i]];
    if (Array.isArray(v) && v.length) return { kunci: kandidat[i], nilai: v };
    if (typeof v === 'string' && v.trim()) return { kunci: kandidat[i], nilai: v };
  }
  return null;
}


/* =========================================================================
   BAGIAN 2 — Titik sambung ke modul lain
   Hanya DUA fungsi di bawah ini yang menyentuh berkas .gs yang lain.
   Kalau laporan gagal, hampir pasti masalahnya ada di sini.
   ========================================================================= */

/**
 * Mengambil rekap per guide untuk satu bulan.
 *
 * peringkatGuide_() BUKAN pembaca data — ia penghitung murni dengan tanda
 * tangan (ringkasan, guides, reviewPeta). Ketiga bahannya disiapkan persis
 * seperti yang dilakukan bangunDasbor_ di 09_Dasbor.gs, supaya angka laporan
 * dijamin sama dengan angka dasbor.
 *
 * peringkatGuide_() melewati guide yang sebulan itu tidak punya data sama
 * sekali. Untuk laporan, daftar lengkap dari bacaGuides_() dipakai sebagai
 * kerangka, lalu angkanya ditempelkan — jadi guide yang tidak pernah muncul
 * tetap terdaftar dengan hari = 0 (lihat LAP_TAMPILKAN_NOL).
 *
 * Mengembalikan larik objek berbentuk:
 *   { guideId, nama, regu:['A1'], kategori, hari, uniform, idcard, etika,
 *     review, hariReview, total, rataTotal, taat, rataEtika }
 */
function lapAmbilGuide_(bulan) {
  const hilang = [];
  if (typeof bacaGuides_             !== 'function') hilang.push('bacaGuides_');
  if (typeof rangkumBulan_           !== 'function') hilang.push('rangkumBulan_');
  if (typeof kumpulkanReviewManual_  !== 'function') hilang.push('kumpulkanReviewManual_');
  if (typeof peringkatGuide_         !== 'function') hilang.push('peringkatGuide_');
  if (hilang.length) {
    throw new Error('Fungsi berikut tidak ditemukan: ' + hilang.join(', ') +
      '. Pastikan 05_Ringkasan.gs dan 08_Peringkat.gs ikut tertempel.');
  }

  const guides     = bacaGuides_();
  const ringkasan  = rangkumBulan_(bulan);
  const reviewPeta = kumpulkanReviewManual_(bulan);
  const mentah     = peringkatGuide_(ringkasan, guides, reviewPeta);

  if (!Array.isArray(mentah)) {
    throw new Error('peringkatGuide_() tidak mengembalikan larik. ' +
      'Jalankan ujiLaporan() untuk melihat bentuknya.');
  }

  /* --- angka per guide, nama medan dinormalkan lewat LAP_PETA --- */
  function rapikan(g) {
    const nama    = lapMedanTeks_(g, LAP_PETA.nama);
    const regu    = lapMedanTeks_(g, LAP_PETA.regu);
    const hari    = lapMedanAngka_(g, LAP_PETA.hari);
    const uniform = lapMedanAngka_(g, LAP_PETA.uniform);
    const idcard  = lapMedanAngka_(g, LAP_PETA.idcard);
    const etika   = lapMedanAngka_(g, LAP_PETA.etika);
    const review  = lapMedanAngka_(g, LAP_PETA.review);
    const total   = lapMedanAngka_(g, LAP_PETA.total);

    const nH = hari ? hari.nilai : 0;
    const nU = uniform ? uniform.nilai : 0;
    const nI = idcard  ? idcard.nilai  : 0;
    const nE = etika   ? etika.nilai   : 0;
    const nR = review  ? review.nilai  : 0;
    // Nilai total = Uniform + ID + Etika + Review (aturan bisnis §2).
    const nT = total ? total.nilai : (nU + nI + nE + nR);

    return {
      guideId  : g.guideId || '',
      nama     : nama ? String(nama.nilai) : '(tanpa nama)',
      regu     : regu ? lapReguList_(regu.nilai) : [],
      kategori : g.kategori || '',
      hari     : nH,
      uniform  : nU,
      idcard   : nI,
      etika    : nE,
      review   : nR,
      hariReview: lapNum_(g.hariReview),
      total    : nT,
      // Rata-rata & ketaatan diambil apa adanya dari 08_Peringkat.gs bila ada,
      // supaya laporan tidak pernah berselisih dengan dasbor.
      rataTotal: (typeof g.rataTotal === 'number') ? g.rataTotal : lapBagi_(nT, nH),
      taat     : (typeof g.taat === 'number') ? g.taat : lapBagi_(nU + nI, 2 * nH),
      rataEtika: (typeof g.rataEtika === 'number') ? g.rataEtika : lapBagi_(nE, nH)
    };
  }

  const peta = {};
  mentah.forEach(function (g) {
    const r = rapikan(g);
    peta[r.guideId || r.nama] = r;
  });

  if (!LAP_TAMPILKAN_NOL) return Object.keys(peta).map(function (k) { return peta[k]; });

  /* --- kerangka daftar lengkap, angka ditempelkan --- */
  return (guides || []).map(function (g) {
    const kunci = g.guideId || g.guideName;
    if (peta[kunci]) return peta[kunci];
    return {
      guideId: g.guideId || '',
      nama   : String(g.guideName || '(tanpa nama)'),
      regu   : lapReguList_(g.regu),
      kategori: g.kategori || '',
      hari: 0, uniform: 0, idcard: 0, etika: 0, review: 0, hariReview: 0,
      total: 0, rataTotal: 0, taat: 0, rataEtika: 0
    };
  });
}


/**
 * Membaca ringkasan harian dari tab Dasbor bulan itu.
 *
 * Nilainya DISALIN, bukan dirumuskan — lihat catatan di kepala berkas.
 * Kalau tab Dasbor belum ada atau susunannya tak dikenali, mengembalikan
 * larik kosong dan bagian harian dilewati dengan keterangan, bukan error.
 */
function lapAmbilHarian_(bulan) {
  const sh = lapSs_().getSheetByName(lapNamaDasbor_(bulan));
  if (!sh) return [];

  const nBaris = sh.getLastRow();
  const nKolom = sh.getLastColumn();
  if (nBaris < 3 || nKolom < LAP_KOL_DASBOR.gabId) return [];

  const nilai = sh.getRange(1, 1, nBaris, nKolom).getValues();

  // Cari baris kepala: sel kolom A yang berbunyi "Tanggal".
  let baris0 = -1;
  for (let i = 0; i < Math.min(nilai.length, 25); i++) {
    if (String(nilai[i][0]).trim().toLowerCase() === 'tanggal') { baris0 = i + 1; break; }
  }
  if (baris0 < 0) return [];

  const K = LAP_KOL_DASBOR;
  const hasil = [];
  for (let i = baris0; i < nilai.length; i++) {
    const sel = nilai[i][K.tanggal - 1];
    if (sel === '' || sel === null) continue;
    // Baris TOTAL dan baris keterangan di bawahnya bukan data harian.
    if (!(sel instanceof Date)) {
      if (String(sel).trim().toUpperCase().indexOf('TOTAL') === 0) break;
      continue;
    }
    const hadirA = lapNum_(nilai[i][K.hadirA - 1]);
    const hadirD = lapNum_(nilai[i][K.hadirD - 1]);
    hasil.push({
      tanggal: sel,
      hari   : String(nilai[i][K.hari - 1] || ''),
      hadirA : hadirA,
      hadirD : hadirD,
      hadir  : hadirA + hadirD,
      gabU   : lapPersen_(nilai[i][K.gabU - 1]),
      gabId  : lapPersen_(nilai[i][K.gabId - 1]),
      etika  : lapNum_(nilai[i][K.etikaA - 1]) + lapNum_(nilai[i][K.etikaD - 1]),
      review : lapNum_(nilai[i][K.reviewA - 1]) + lapNum_(nilai[i][K.reviewD - 1])
    });
  }
  return hasil;
}


/* =========================================================================
   BAGIAN 3 — Perhitungan turunan (murni, tidak menyentuh spreadsheet)
   ========================================================================= */

/** Menjumlahkan sekelompok guide jadi satu baris ringkasan. */
function lapJumlahkan_(daftar) {
  const j = { guide: daftar.length, hari: 0, uniform: 0, idcard: 0, etika: 0, review: 0, total: 0 };
  daftar.forEach(function (g) {
    j.hari    += g.hari;
    j.uniform += g.uniform;
    j.idcard  += g.idcard;
    j.etika   += g.etika;
    j.review  += g.review;
    j.total   += g.total;
  });
  // Ketaatan berpakaian & ID = (Uniform + ID) ÷ (2 × hari hadir)   — aturan §2
  j.taat = lapBagi_(j.uniform + j.idcard, 2 * j.hari);
  j.pU   = lapBagi_(j.uniform, j.hari);
  j.pId  = lapBagi_(j.idcard, j.hari);
  return j;
}

/** Guide yang termasuk satu regu. */
function lapSaringRegu_(guide, kode) {
  return guide.filter(function (g) { return g.regu.indexOf(kode) >= 0; });
}

/** Guide yang termasuk satu kategori ('Asing' → regu berawalan A). */
function lapSaringKategori_(guide, kategori) {
  const awalan = (kategori === 'Asing') ? 'A' : 'D';
  return guide.filter(function (g) {
    return g.regu.some(function (r) { return r.charAt(0) === awalan; });
  });
}

/** Satu tabel peringkat: menyaring, mengurutkan, memotong LAP_TOP_N. */
function lapPeringkat_(guide, opsi) {
  const minHari = opsi.abaikanMinHari ? 0 : lapMinHari_();
  const layak = guide.filter(function (g) {
    if (!opsi.abaikanMinHari && g.hari < minHari) return false;
    // Guide yang sebulan itu HANYA punya review manual (hari = 0) tetap sah
    // untuk peringkat review — angkanya sudah diketik tim, lihat 08_Peringkat.gs.
    return opsi.saring ? opsi.saring(g) : g.hari > 0;
  });

  const berskor = layak.map(function (g) {
    return { g: g, jumlah: opsi.jumlah(g), rata: opsi.rata(g) };
  });

  const kunci = opsi.pakaiJumlah ? 'jumlah' : 'rata';
  berskor.sort(function (a, b) {
    const beda = opsi.naik ? (a[kunci] - b[kunci]) : (b[kunci] - a[kunci]);
    if (beda !== 0) return beda;
    return a.g.nama.localeCompare(b.g.nama, 'id');
  });

  return {
    baris  : berskor.slice(0, LAP_TOP_N),
    dipakai: layak.length,
    dilewat: guide.length - layak.length
  };
}

/** Ketujuh tabel peringkat, sesuai tab Dasbor. */
function lapSemuaPeringkat_(guide) {
  const pakaiJumlah = (LAP_URUT_TOTAL === 'jumlah');
  // Rata-rata diambil apa adanya dari 08_Peringkat.gs — bukan dihitung ulang,
  // supaya urutan di laporan tidak pernah berbeda dari urutan di tab Dasbor.
  const total  = { jumlah: function (g) { return g.total; },
                   rata  : function (g) { return g.rataTotal; },
                   pakaiJumlah: pakaiJumlah };
  const taat   = { jumlah: function (g) { return g.uniform + g.idcard; },
                   rata  : function (g) { return g.taat; } };
  const etika  = { jumlah: function (g) { return g.etika; },
                   rata  : function (g) { return g.rataEtika; } };
  const review = { jumlah: function (g) { return g.review; },
                   rata  : function (g) { return lapBagi_(g.review, g.hari); },
                   pakaiJumlah: true, abaikanMinHari: true,
                   saring: function (g) { return g.review > 0; } };

  function ragam(dasar, tambahan) {
    const o = {};
    Object.keys(dasar).forEach(function (k) { o[k] = dasar[k]; });
    Object.keys(tambahan).forEach(function (k) { o[k] = tambahan[k]; });
    return o;
  }

  return [
    { judul: 'Nilai total tertinggi',            satuan: 'Nilai',   hasil: lapPeringkat_(guide, ragam(total,  { naik: false })) },
    { judul: 'Nilai total terendah',             satuan: 'Nilai',   hasil: lapPeringkat_(guide, ragam(total,  { naik: true  })) },
    { judul: 'Paling taat berpakaian & ID',      satuan: 'Sesuai',  hasil: lapPeringkat_(guide, ragam(taat,   { naik: false })) },
    { judul: 'Paling tidak taat berpakaian & ID',satuan: 'Sesuai',  hasil: lapPeringkat_(guide, ragam(taat,   { naik: true  })) },
    { judul: 'Nilai etika tertinggi',            satuan: 'Etika',   hasil: lapPeringkat_(guide, ragam(etika,  { naik: false })) },
    { judul: 'Nilai etika terendah',             satuan: 'Etika',   hasil: lapPeringkat_(guide, ragam(etika,  { naik: true  })) },
    { judul: 'Review terbanyak',                 satuan: 'Review',  hasil: lapPeringkat_(guide, ragam(review, { naik: false })) }
  ];
}


/* =========================================================================
   BAGIAN 4 — Pembantu penulisan (semua menerima & mengembalikan nomor baris)
   ========================================================================= */

/** Menulis satu baris penuh selebar LAP_KOL. */
function lapBaris_(sh, r, nilai) {
  const isi = nilai.slice(0, LAP_KOL);
  while (isi.length < LAP_KOL) isi.push('');
  sh.getRange(r, 1, 1, LAP_KOL).setValues([isi]);
  return r + 1;
}

/** Judul bagian: tebal, huruf sedikit lebih besar, bergaris bawah. */
function lapJudulBagian_(sh, r, teks) {
  sh.getRange(r, 1, 1, LAP_KOL).merge()
    .setValue(teks)
    .setFontSize(11).setFontWeight('bold').setFontColor(LAP_WARNA.judul)
    .setVerticalAlignment('middle');
  sh.getRange(r, 1, 1, LAP_KOL)
    .setBorder(null, null, true, null, null, null, LAP_WARNA.judul, SpreadsheetApp.BorderStyle.SOLID);
  return r + 2;
}

/** Baris kepala tabel: abu-abu, tebal, rata tengah kecuali kolom pertama. */
function lapKepalaTabel_(sh, r, header) {
  const n = header.length;
  sh.getRange(r, 1, 1, n).setValues([header])
    .setFontWeight('bold').setFontSize(8)
    .setBackground(LAP_WARNA.kepala)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true)
    .setBorder(true, true, true, true, true, true, LAP_WARNA.garis, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(r, 1).setHorizontalAlignment('left');
  return r + 1;
}

/** Menulis blok data tabel sekaligus, lalu memasang garis & format angka. */
function lapIsiTabel_(sh, r, data, format) {
  if (!data.length) return r;
  const n = data[0].length;
  sh.getRange(r, 1, data.length, n).setValues(data)
    .setFontSize(8)
    .setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, LAP_WARNA.garis, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(r, 2, data.length, n - 1).setHorizontalAlignment('center');
  if (format) {
    Object.keys(format).forEach(function (kol) {
      sh.getRange(r, Number(kol), data.length, 1).setNumberFormat(format[kol]);
    });
  }
  return r + data.length;
}

/** Catatan kecil abu-abu di bawah tabel. */
function lapCatatan_(sh, r, teks) {
  sh.getRange(r, 1, 1, LAP_KOL).merge()
    .setValue(teks)
    .setFontSize(7).setFontStyle('italic').setFontColor(LAP_WARNA.redup)
    .setWrap(true);
  return r + 2;
}

/**
 * Melompat ke awal halaman berikutnya.
 * Apps Script tidak punya API pemutus halaman — satu-satunya cara adalah
 * menyisipkan baris kosong. Lihat catatan LAP_BARIS_HALAMAN di atas.
 */
function lapHalamanBaru_(r) {
  const sisa = (r - 1) % LAP_BARIS_HALAMAN;
  return (sisa === 0) ? r : r + (LAP_BARIS_HALAMAN - sisa);
}


/* =========================================================================
   BAGIAN 5 — Bagian-bagian laporan
   ========================================================================= */

/** Kop laporan. */
function lapTulisKop_(sh, r, bulan) {
  sh.getRange(r, 1, 1, LAP_KOL).merge().setValue(LAP_INSTANSI)
    .setHorizontalAlignment('center').setFontSize(10).setFontWeight('bold')
    .setFontColor(LAP_WARNA.redup);
  r++;
  sh.getRange(r, 1, 1, LAP_KOL).merge().setValue(LAP_JUDUL)
    .setHorizontalAlignment('center').setFontSize(14).setFontWeight('bold')
    .setFontColor(LAP_WARNA.judul);
  r++;
  sh.getRange(r, 1, 1, LAP_KOL).merge().setValue('Periode ' + lapBulanTeks_(bulan))
    .setHorizontalAlignment('center').setFontSize(11);
  r++;
  sh.getRange(r, 1, 1, LAP_KOL)
    .setBorder(null, null, true, null, null, null, LAP_WARNA.judul, SpreadsheetApp.BorderStyle.SOLID_THICK);
  return r + 2;
}

/** Ringkasan sebulan: pasangan keterangan–nilai. */
function lapTulisRingkasan_(sh, r, guide, harian) {
  r = lapJudulBagian_(sh, r, 'A.  RINGKASAN SEBULAN');

  const semua = lapJumlahkan_(guide);
  const dinilai = guide.filter(function (g) { return g.hari > 0; }).length;

  const isi = [
    ['Guide terdaftar',                       guide.length,   '0'],
    ['Guide yang sempat dinilai',             dinilai,        '0'],
    ['Hari operasi tercatat',                 harian.length,  '0'],
    ['Jumlah kehadiran (guide-hari)',         semua.hari,     '0'],
    ['Berseragam sesuai',                     semua.uniform,  '0'],
    ['Memakai ID-Card',                       semua.idcard,   '0'],
    ['Ketaatan berpakaian',                   semua.pU,       '0.0%'],
    ['Ketaatan ID-Card',                      semua.pId,      '0.0%'],
    ['Ketaatan berpakaian & ID (gabungan)',   semua.taat,     '0.0%'],
    ['Jumlah nilai etika',                    semua.etika,    '0'],
    ['Jumlah nilai review',                   semua.review,   '0'],
    ['Jumlah nilai total',                    semua.total,    '0']
  ];

  isi.forEach(function (b) {
    sh.getRange(r, 1, 1, 5).merge().setValue(b[0]).setFontSize(9);
    sh.getRange(r, 6, 1, 4).merge().setValue(b[1])
      .setFontSize(9).setFontWeight('bold').setHorizontalAlignment('right')
      .setNumberFormat(b[2]);
    sh.getRange(r, 1, 1, LAP_KOL)
      .setBorder(null, null, true, null, null, null, '#dfe3e6', SpreadsheetApp.BorderStyle.DOTTED);
    r++;
  });

  return r + 1;
}

/** Tabel ringkasan per regu, lengkap dengan subtotal Asing/Domestik. */
function lapTulisTabelRegu_(sh, r, guide) {
  r = lapJudulBagian_(sh, r, 'B.  REKAP PER REGU');

  r = lapKepalaTabel_(sh, r, ['Regu', 'Guide', 'Hari hadir', 'Uniform sesuai',
                              'ID-Card sesuai', '% Taat (U+ID)', 'Etika', 'Review', 'Nilai total']);

  const data = [];
  const tebal = [];
  let n = 0;

  ['Asing', 'Domestik'].forEach(function (kategori) {
    LAP_REGU.filter(function (x) { return x.kategori === kategori; })
      .forEach(function (x) {
        const j = lapJumlahkan_(lapSaringRegu_(guide, x.kode));
        data.push([x.kode, j.guide, j.hari, j.uniform, j.idcard, j.taat, j.etika, j.review, j.total]);
        n++;
      });
    const jk = lapJumlahkan_(lapSaringKategori_(guide, kategori));
    data.push(['Sub ' + kategori.toUpperCase(), jk.guide, jk.hari, jk.uniform, jk.idcard,
               jk.taat, jk.etika, jk.review, jk.total]);
    tebal.push(n);
    n++;
  });

  const semua = lapJumlahkan_(guide);
  data.push(['SELURUH GUIDE', semua.guide, semua.hari, semua.uniform, semua.idcard,
             semua.taat, semua.etika, semua.review, semua.total]);
  tebal.push(n);

  const r0 = r;
  r = lapIsiTabel_(sh, r, data, { 2: '0', 3: '0', 4: '0', 5: '0', 6: '0.0%', 7: '0', 8: '0', 9: '0' });
  tebal.forEach(function (i) {
    sh.getRange(r0 + i, 1, 1, LAP_KOL).setFontWeight('bold').setBackground('#f4f6f7');
  });

  r = lapCatatan_(sh, r,
    'Catatan: 15 guide bertugas di regu Asing sekaligus Domestik, sehingga terhitung pada kedua ' +
    'kategori. Jumlah baris "Sub ASING" + "Sub DOMESTIK" karena itu melebihi baris "SELURUH GUIDE". ' +
    'Persentase gabungan hampir tidak terpengaruh, karena orang yang sama terhitung dua kali di ' +
    'pembilang maupun penyebut.');
  return r;
}

/** Ringkasan harian + grafik ketaatan (salinan nilai dari tab Dasbor). */
function lapTulisHarian_(sh, r, harian, bulan) {
  r = lapJudulBagian_(sh, r, 'C.  RINGKASAN HARIAN & GRAFIK KETAATAN');

  if (!harian.length) {
    return lapCatatan_(sh, r,
      'Tab "' + lapNamaDasbor_(bulan) + '" belum tersedia atau susunannya tidak dikenali, ' +
      'sehingga bagian ini dilewati. Jalankan menu "Perbarui Rekap Bulan Ini" lebih dulu, ' +
      'lalu susun ulang laporan.');
  }

  const kepala = r;
  r = lapKepalaTabel_(sh, r, ['Tanggal', 'Hari', 'Hadir Asing', 'Hadir Domestik', 'Hadir total',
                              '% Uniform', '% ID-Card', 'Etika', 'Review']);

  const data = harian.map(function (h) {
    return [h.tanggal, h.hari, h.hadirA, h.hadirD, h.hadir, h.gabU, h.gabId, h.etika, h.review];
  });
  const r0 = r;
  r = lapIsiTabel_(sh, r, data,
    { 1: 'dd/MM', 3: '0', 4: '0', 5: '0', 6: '0.0%', 7: '0.0%', 8: '0', 9: '0' });
  sh.getRange(r0, 1, data.length, 1).setHorizontalAlignment('center');

  // Baris total sebulan.
  const jml = harian.reduce(function (a, h) {
    a.hadirA += h.hadirA; a.hadirD += h.hadirD; a.hadir += h.hadir;
    a.etika += h.etika; a.review += h.review;
    a.gabU += h.gabU * h.hadir; a.gabId += h.gabId * h.hadir;
    return a;
  }, { hadirA: 0, hadirD: 0, hadir: 0, etika: 0, review: 0, gabU: 0, gabId: 0 });

  r = lapIsiTabel_(sh, r, [['TOTAL', '', jml.hadirA, jml.hadirD, jml.hadir,
                            lapBagi_(jml.gabU, jml.hadir), lapBagi_(jml.gabId, jml.hadir),
                            jml.etika, jml.review]],
                   { 3: '0', 4: '0', 5: '0', 6: '0.0%', 7: '0.0%', 8: '0', 9: '0' });
  sh.getRange(r - 1, 1, 1, LAP_KOL).setFontWeight('bold').setBackground('#f4f6f7');

  r += 1;

  // Grafik: dua seri persentase, sumbu-X tanggal. Warna sengaja biru/jingga —
  // hijau merek terlalu gelap sebagai garis, dan pasangannya dengan emas
  // kurang terpisah untuk mata yang buta warna (keputusan tab Dasbor).
  const grafik = sh.newChart().asLineChart()
    .addRange(sh.getRange(kepala, 1, data.length + 1, 1))
    .addRange(sh.getRange(kepala, 6, data.length + 1, 2))
    .setNumHeaders(1)
    .setPosition(r, 1, 0, 0)
    .setOption('title', 'Ketaatan berpakaian & ID-Card — ' + lapBulanTeks_(bulan))
    .setOption('width', 600)
    .setOption('height', 260)
    .setOption('colors', [LAP_WARNA.seriU, LAP_WARNA.seriId])
    .setOption('legend', { position: 'bottom' })
    .setOption('pointSize', 3)
    .setOption('vAxis', { format: 'percent', viewWindow: { min: 0, max: 1 } })
    .build();
  sh.insertChart(grafik);

  // Sediakan ruang barisnya, supaya grafik tidak menimpa bagian berikutnya.
  return r + Math.ceil(280 / LAP_TINGGI_BARIS);
}

/** Tujuh tabel peringkat. */
function lapTulisPeringkat_(sh, r, guide) {
  r = lapJudulBagian_(sh, r, 'D.  PERINGKAT GUIDE');

  const tabel = lapSemuaPeringkat_(guide);
  const dasar = (LAP_URUT_TOTAL === 'jumlah') ? 'jumlah' : 'rata-rata';

  tabel.forEach(function (t) {
    sh.getRange(r, 1, 1, LAP_KOL).merge().setValue(t.judul)
      .setFontSize(9).setFontWeight('bold');
    r++;

    r = lapKepalaTabel_(sh, r, ['Nama guide', 'Regu', 'Hari hadir', t.satuan, 'Rata-rata/hari']);

    if (!t.hasil.baris.length) {
      r = lapCatatan_(sh, r, 'Belum ada guide yang memenuhi syarat.');
      return;
    }

    const data = t.hasil.baris.map(function (b, i) {
      return [(i + 1) + '.  ' + b.g.nama, b.g.regu.join('/'), b.g.hari, b.jumlah, b.rata];
    });
    r = lapIsiTabel_(sh, r, data, { 3: '0', 4: '0.##', 5: '0.00' });
    sh.getRange(r - data.length, 1, data.length, 1).setHorizontalAlignment('left');
    r++;
  });

  r = lapCatatan_(sh, r,
    'Peringkat diurutkan memakai ' + dasar + ', dengan syarat minimal ' + lapMinHari_() +
    ' hari hadir. Guide di bawah batas itu tidak dibuang dari data, hanya tidak ikut ditampilkan ' +
    'di tabel ini. Tabel "Review terbanyak" dikecualikan dari syarat hari. Kolom "Hari hadir" ' +
    'sengaja ditampilkan agar terlihat bila ada nama yang menonjol hanya karena bertugas sedikit hari.');
  return r;
}

/** Daftar lengkap satu regu. */
function lapTulisDaftarRegu_(sh, r, guide, regu, huruf) {
  r = lapJudulBagian_(sh, r, huruf + '.  ' + regu.judul);

  const daftar = lapSaringRegu_(guide, regu.kode).slice();
  if (LAP_URUT_DAFTAR === 'total') {
    daftar.sort(function (a, b) { return b.total - a.total || a.nama.localeCompare(b.nama, 'id'); });
  } else {
    daftar.sort(function (a, b) { return a.nama.localeCompare(b.nama, 'id'); });
  }

  r = lapKepalaTabel_(sh, r, ['Nama guide', 'Regu', 'Hari hadir', 'Uniform sesuai',
                              'ID-Card sesuai', '% Taat (U+ID)', 'Etika', 'Review', 'Nilai total']);

  if (!daftar.length) return lapCatatan_(sh, r, 'Tidak ada guide terdaftar pada regu ini.');

  const data = daftar.map(function (g) {
    return [g.nama, g.regu.join('/'), g.hari, g.uniform, g.idcard,
            (g.hari > 0 ? g.taat : '—'), g.etika, g.review, g.total];
  });
  const r0 = r;
  r = lapIsiTabel_(sh, r, data, { 3: '0', 4: '0', 5: '0', 6: '0.0%', 7: '0', 8: '0', 9: '0' });
  sh.getRange(r0, 1, data.length, 1).setHorizontalAlignment('left');

  const j = lapJumlahkan_(daftar);
  r = lapIsiTabel_(sh, r, [['JUMLAH REGU ' + regu.kode, '', j.hari, j.uniform, j.idcard,
                            j.taat, j.etika, j.review, j.total]],
                   { 3: '0', 4: '0', 5: '0', 6: '0.0%', 7: '0', 8: '0', 9: '0' });
  sh.getRange(r - 1, 1, 1, LAP_KOL).setFontWeight('bold').setBackground('#f4f6f7');
  return r + 1;
}

/** Blok tanda tangan. */
function lapTulisTandaTangan_(sh, r) {
  const tgl = Utilities.formatDate(new Date(), lapZona_(), 'd MMMM yyyy');
  sh.getRange(r, 6, 1, 4).merge().setValue(LAP_KOTA + ', ' + tgl)
    .setFontSize(9).setHorizontalAlignment('center');
  r += 2;

  const lebar = Math.floor(LAP_KOL / LAP_TTD.length);
  const jarak = LAP_KOL - lebar;
  LAP_TTD.forEach(function (t, i) {
    const kol = 1 + Math.round(i * jarak / Math.max(1, LAP_TTD.length - 1));
    sh.getRange(r, kol, 1, lebar).merge().setValue(t.jabatan)
      .setFontSize(9).setHorizontalAlignment('center');
    sh.getRange(r + 1, kol, 1, lebar).merge().setValue(t.peran)
      .setFontSize(9).setHorizontalAlignment('center');
    sh.getRange(r + 5, kol, 1, lebar).merge().setValue('(  ...............................................  )')
      .setFontSize(9).setHorizontalAlignment('center');
  });
  return r + 7;
}


/* =========================================================================
   BAGIAN 6 — Penyusun utama
   ========================================================================= */

/**
 * Menyiapkan tab laporan: buat bila belum ada, bersihkan bila sudah.
 *
 * sh.clear() TIDAK membuang chart (jebakan #10) — grafik lama harus
 * dibuang sendiri, kalau tidak ia menumpuk setiap kali laporan disusun ulang.
 */
function lapSiapkanTab_(bulan) {
  const ss = lapSs_();
  const nama = namaTabLaporan_(bulan);
  let sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
  } else {
    sh.getCharts().forEach(function (c) { sh.removeChart(c); });
    sh.clear();
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
  }

  // Lebar kolom dikunci agar isinya muat A4 tegak tanpa diperkecil.
  for (let i = 0; i < LAP_LEBAR.length; i++) sh.setColumnWidth(i + 1, LAP_LEBAR[i]);
  if (sh.getMaxColumns() > LAP_KOL) sh.deleteColumns(LAP_KOL + 1, sh.getMaxColumns() - LAP_KOL);

  // Baris kosong yang TERFORMAT ikut tercetak sebagai halaman kosong di PDF,
  // jadi pemformatan menyeluruh baru dikerjakan di akhir bangunLaporan_(),
  // sepanjang baris yang benar-benar terpakai.
  if (sh.getMaxRows() < LAP_BARIS_MIN) {
    sh.insertRowsAfter(sh.getMaxRows(), LAP_BARIS_MIN - sh.getMaxRows());
  }
  sh.setHiddenGridlines(true);
  return sh;
}

/**
 * Menyusun tab `Laporan YYYY-MM`.
 *
 * @param {string} bulan 'YYYY-MM'. Kosong → bulan berjalan.
 * @return {Sheet} tab laporan yang baru disusun.
 */
function bangunLaporan_(bulan) {
  bulan = bulan || lapBulanIni_();

  const guide  = lapAmbilGuide_(bulan);
  const harian = lapAmbilHarian_(bulan);
  const sh     = lapSiapkanTab_(bulan);

  let r = 2;
  r = lapTulisKop_(sh, r, bulan);
  r = lapTulisRingkasan_(sh, r, guide, harian);
  r = lapTulisTabelRegu_(sh, r, guide);

  r = lapHalamanBaru_(r);
  r = lapTulisHarian_(sh, r, harian, bulan);

  r = lapHalamanBaru_(r);
  r = lapTulisPeringkat_(sh, r, guide);

  const huruf = ['E', 'F', 'G', 'H'];
  LAP_REGU.forEach(function (regu, i) {
    r = lapHalamanBaru_(r);
    r = lapTulisDaftarRegu_(sh, r, guide, regu, huruf[i]);
  });

  r = lapTulisTandaTangan_(sh, r + 2);

  // Rapikan hanya sepanjang yang terpakai, lalu buang sisa barisnya —
  // baris kosong yang terformat akan tercetak sebagai halaman kosong di PDF.
  const akhir = Math.min(sh.getMaxRows(), lapHalamanBaru_(r + 2) - 1);
  sh.setRowHeights(1, akhir, LAP_TINGGI_BARIS);
  sh.getRange(1, 1, akhir, LAP_KOL)
    .setFontFamily('Arial').setVerticalAlignment('middle');
  if (sh.getMaxRows() > akhir) sh.deleteRows(akhir + 1, sh.getMaxRows() - akhir);
  sh.setFrozenRows(0);
  SpreadsheetApp.flush();
  return sh;
}


/* =========================================================================
   BAGIAN 7 — Ekspor PDF (opsional; butuh izin tambahan, lihat catatan)
   ========================================================================= */

/**
 * Mengekspor tab laporan menjadi PDF dan menyimpannya di folder yang sama
 * dengan spreadsheet.
 *
 * PERLU IZIN TAMBAHAN di appsscript.json:
 *   https://www.googleapis.com/auth/script.external_request
 *   https://www.googleapis.com/auth/drive
 * Setelah izin ditambah, skrip harus diotorisasi ulang DAN deployment web app
 * di-Deploy ulang (New version). Uji satu penilaian dari aplikasi sesudahnya.
 *
 * Kalau tidak mau menambah izin: lewati fungsi ini dan cetak manual dari
 * spreadsheet (File → Print, A4, Portrait, margin 0,5").
 *
 * @return {string} URL berkas PDF di Drive.
 */
function eksporLaporanPdf_(bulan) {
  bulan = bulan || lapBulanIni_();
  const ss = lapSs_();
  const sh = ss.getSheetByName(namaTabLaporan_(bulan));
  if (!sh) throw new Error('Tab "' + namaTabLaporan_(bulan) + '" belum ada. Susun laporannya dulu.');

  const param = [
    'format=pdf',
    'gid=' + sh.getSheetId(),
    'size=A4',
    'portrait=true',
    'fitw=true',
    'scale=1',
    'sheetnames=false',
    'printtitle=false',
    'pagenumbers=true',
    'gridlines=false',
    'fzr=false',
    'top_margin=0.55',
    'bottom_margin=0.55',
    'left_margin=0.5',
    'right_margin=0.5',
    'horizontal_alignment=CENTER',
    'vertical_alignment=TOP'
  ].join('&');

  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?' + param;
  const balasan = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (balasan.getResponseCode() !== 200) {
    throw new Error('Ekspor PDF gagal (HTTP ' + balasan.getResponseCode() + '). ' +
      'Biasanya karena izin drive/script.external_request belum ditambahkan di appsscript.json.');
  }

  const blob = balasan.getBlob()
    .setName('Laporan Penilaian Guide ' + lapBulanTeks_(bulan) + '.pdf');

  let berkas;
  try {
    berkas = DriveApp.getFileById(ss.getId()).getParents().next().createFile(blob);
  } catch (e) {
    berkas = DriveApp.createFile(blob);   // spreadsheet di My Drive akar
  }
  return berkas.getUrl();
}


/* =========================================================================
   BAGIAN 8 — Item menu & uji cepat
   Tambahkan pemanggilnya ke onOpen() di 10_Trigger.gs (lihat README).
   ========================================================================= */

/** Menu: susun laporan bulan berjalan. */
function menuLaporanSekarang() {
  lapJalankan_(lapBulanIni_(), false);
}

/** Menu: susun laporan bulan lalu. */
function menuLaporanBulanLalu() {
  lapJalankan_(lapBulanLalu_(), false);
}

/** Menu: susun laporan bulan berjalan lalu ekspor jadi PDF. */
function menuLaporanPdf() {
  lapJalankan_(lapBulanIni_(), true);
}

/** Jalan bersama untuk ketiga item menu. */
function lapJalankan_(bulan, pdf) {
  const ui = SpreadsheetApp.getUi();
  try {
    const sh = bangunLaporan_(bulan);
    lapSs_().setActiveSheet(sh);

    let pesan = 'Tab "' + sh.getName() + '" sudah disusun.\n\n' +
      'Cetak lewat File → Print, dengan setelan:\n' +
      '  • Kertas A4, Portrait\n' +
      '  • Margin 0,5 inci\n' +
      '  • Scale: Normal (100%)\n' +
      '  • Matikan gridlines & notes\n\n' +
      'Setelan cetak itu tersimpan pada tab, jadi cukup diatur sekali.';

    if (pdf) pesan += '\n\nBerkas PDF: ' + eksporLaporanPdf_(bulan);

    ui.alert('Laporan ' + lapBulanTeks_(bulan), pesan, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Laporan gagal disusun', String(e && e.message ? e.message : e), ui.ButtonSet.OK);
  }
}

/**
 * Uji cepat tanpa menulis apa pun.
 *
 * Jalankan ini SEBELUM memakai laporan pertama kali: ia mencetak medan mana
 * yang berhasil dikenali dari peringkatGuide_() beserta satu baris contoh,
 * supaya kesalahan pemetaan ketahuan sekarang, bukan setelah laporan
 * ditandatangani.
 */
function ujiLaporan() {
  const bulan = lapBulanIni_();
  const catat = [];
  catat.push('Bulan diuji            : ' + bulan + ' (' + lapBulanTeks_(bulan) + ')');
  catat.push('Zona waktu             : ' + lapZona_());
  catat.push('Batas hari peringkat   : ' + lapMinHari_());
  catat.push('Urutan tabel total     : ' + LAP_URUT_TOTAL);

  const perlu = ['bacaGuides_', 'rangkumBulan_', 'kumpulkanReviewManual_', 'peringkatGuide_'];
  const ada = [typeof bacaGuides_, typeof rangkumBulan_,
               typeof kumpulkanReviewManual_, typeof peringkatGuide_];
  const hilang = perlu.filter(function (n, i) { return ada[i] !== 'function'; });
  if (hilang.length) {
    catat.push('❌ Fungsi tidak ditemukan   : ' + hilang.join(', '));
    Logger.log(catat.join('\n'));
    return catat.join('\n');
  }

  const guides = bacaGuides_();
  catat.push('bacaGuides_            : ' + guides.length + ' guide terdaftar');

  const mentah = peringkatGuide_(rangkumBulan_(bulan), guides, kumpulkanReviewManual_(bulan));
  catat.push('peringkatGuide_        : ' + (Array.isArray(mentah)
    ? mentah.length + ' guide punya data bulan ini' : 'BUKAN larik (' + typeof mentah + ') ❌'));

  if (Array.isArray(mentah) && mentah.length) {
    catat.push('Medan tersedia         : ' + Object.keys(mentah[0]).join(', '));
    const c = mentah[0];
    ['nama', 'regu', 'hari', 'uniform', 'idcard', 'etika', 'review', 'total'].forEach(function (k) {
      const cari = (k === 'nama' || k === 'regu') ? lapMedanTeks_ : lapMedanAngka_;
      const t = cari(c, LAP_PETA[k]);
      catat.push('  ' + (k + '            ').slice(0, 10) + ' → ' +
        (t ? (t.kunci + ' = ' + t.nilai) : '❌ tidak ketemu, tambahkan namanya ke LAP_PETA.' + k));
    });

    const rapi = lapAmbilGuide_(bulan);
    const j = lapJumlahkan_(rapi);
    catat.push('Hasil normalisasi      : ' + rapi.length + ' guide, ' + j.hari +
      ' guide-hari, ketaatan ' + (j.taat * 100).toFixed(1) + '%');
    LAP_REGU.forEach(function (x) {
      catat.push('  regu ' + x.kode + '              : ' + lapSaringRegu_(rapi, x.kode).length + ' guide');
    });
  }

  const harian = lapAmbilHarian_(bulan);
  catat.push('Ringkasan harian       : ' + (harian.length
    ? harian.length + ' tanggal terbaca dari "' + lapNamaDasbor_(bulan) + '"'
    : '⚠️ kosong — tab Dasbor belum ada, atau LAP_KOL_DASBOR perlu disesuaikan'));

  const teks = catat.join('\n');
  Logger.log(teks);
  return teks;
}
