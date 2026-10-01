/**
 * ============================================================
 *  Tab Rekap Mingguan (Senin–Minggu)
 *  Berkas 13 dari 13 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Menyusun satu tab per minggu, mis. `Rekap Mingguan 28 Sep-4 Okt 2026`:
 *             ringkasan per regu di atas, lalu SELURUH guide aktif (urut regu,
 *             lalu nama) dengan UNI FORM · ID · REVIEW · ETIKA · ANTAR · PATUH ·
 *             NILAI TOTAL · RATA · % UNIFORM · % ID · MUTU UNI · HARI HADIR.
 *
 *  LARANGAN : Tidak menghitung ulang aturan penilaian. Rangkuman diambil dari
 *             rangkumRentang_ (05_Ringkasan.gs), angka per guide dari
 *             peringkatGuide_ (08_Peringkat.gs), REVIEW dari
 *             kumpulkanReviewManual_ — bahan yang sama dengan tab Dasbor.
 *             Berkas ini hanya MEMOTONG rentang tanggal dan MENATA.
 *
 *  Satu minggu = Senin s.d. Minggu menurut zona spreadsheet (WITA), dan BOLEH
 *  melintasi bulan: 28 Sep–4 Okt 2026 adalah satu minggu utuh. Karena itu angka
 *  mingguan tidak menjumlah tepat ke angka bulanan, dan memang tidak
 *  dimaksudkan begitu — reward tetap memakai rekap bulanan.
 *
 *  Tab ini ditulis ulang utuh setiap disusun. REVIEW TIDAK diketik di sini:
 *  angkanya dibaca dari tab Rekap regu bulanan, dan ketikan di tab ini akan
 *  hilang begitu tab disusun ulang.
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 * ============================================================
 */


/* ================= Tanggal & minggu =================
   Seluruh hitungan memakai kode tanggal 'yyyy-MM-dd' menurut zona spreadsheet
   (kodeTanggal_), lalu aritmetika kalender murni lewat UTC. Jam lokal skrip
   tidak pernah dipakai: zona proyek Apps Script bisa berbeda dari zona
   spreadsheet, dan selisih itu cukup untuk menggeser Senin ke Minggu. */

/** 'yyyy-MM-dd' digeser n hari (boleh negatif). */
function geserTanggal_(tgl, n) {
  var b = String(tgl).split('-');
  var d = new Date(Date.UTC(Number(b[0]), Number(b[1]) - 1, Number(b[2]) + n));
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' +
         ('0' + d.getUTCDate()).slice(-2);
}


/** Indeks hari: 0 = Minggu … 6 = Sabtu, cocok dengan HARI_ID. */
function hariKe_(tgl) {
  var b = String(tgl).split('-');
  return new Date(Date.UTC(Number(b[0]), Number(b[1]) - 1, Number(b[2]))).getUTCDay();
}


/** Senin dari minggu yang memuat tanggal itu. Hari Minggu ikut Senin SEBELUMNYA. */
function seninDari_(tgl) {
  return geserTanggal_(tgl, -((hariKe_(tgl) + 6) % 7));
}


/** '2026-09-28' -> '28 Sep', atau '28 Sep 2026' bila pakaiTahun. Memakai BULAN_ID. */
function tanggalPendek_(tgl, pakaiTahun) {
  var b = String(tgl).split('-');
  return Number(b[2]) + ' ' + BULAN_ID[Number(b[1]) - 1] + (pakaiTahun ? ' ' + b[0] : '');
}


/**
 * Minggu yang memuat tanggal itu.
 * @return {{ senin: string, minggu: string, label: string }}
 *   label: '5-11 Okt 2026', '28 Sep-4 Okt 2026', atau '29 Des 2025-4 Jan 2026'
 */
function mingguDari_(tgl) {
  var senin = seninDari_(tgl), minggu = geserTanggal_(senin, 6);
  var label;
  if (senin.slice(0, 7) === minggu.slice(0, 7)) {
    label = Number(senin.slice(8)) + '-' + tanggalPendek_(minggu, true);
  } else {
    label = tanggalPendek_(senin, senin.slice(0, 4) !== minggu.slice(0, 4)) + '-' +
            tanggalPendek_(minggu, true);
  }
  return { senin: senin, minggu: minggu, label: label };
}


function namaTabMingguan_(tgl) { return 'Rekap Mingguan ' + mingguDari_(tgl).label; }


/**
 * Tanggal ketikan petugas -> 'yyyy-MM-dd', atau null bila tidak sah.
 *
 * Menerima urutan hari-bulan-tahun kebiasaan Indonesia (15-9-2026, 15/09/2026,
 * 15.9.2026) dan ISO (2026-09-15). Tanggal mustahil seperti 31-2-2026 DITOLAK,
 * bukan digeser diam-diam ke awal Maret seperti perilaku bawaan Date.
 */
function bacaTanggalKetikan_(teks) {
  var s = String(teks == null ? '' : teks).trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/), y, bln, h;
  if (m) {
    y = Number(m[1]); bln = Number(m[2]); h = Number(m[3]);
  } else {
    m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (!m) return null;
    h = Number(m[1]); bln = Number(m[2]); y = Number(m[3]);
  }
  var d = new Date(Date.UTC(y, bln - 1, h));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== bln - 1 || d.getUTCDate() !== h) return null;
  return y + '-' + ('0' + bln).slice(-2) + '-' + ('0' + h).slice(-2);
}


/* ================= Hitungan (murni, tanpa menulis) ================= */

/**
 * Angka satu minggu untuk seluruh guide aktif.
 *
 * @param {string} senin  'yyyy-MM-dd' hari Senin minggu itu
 * @param {Array}  guides hasil bacaGuides_()
 * @return {{ senin, minggu, tanggal: Array, perGuide: Object }}
 *   perGuide[guideId] = objek hasil peringkatGuide_ (hanya guide yang punya
 *   data minggu itu — penilaian atau review)
 */
function hitungMingguan_(senin, guides) {
  var minggu = geserTanggal_(senin, 6);
  var ringkasan = rangkumRentang_(senin, minggu);

  // REVIEW diketik di tab Rekap regu BULANAN. Minggu yang melintasi bulan
  // butuh dua bulan, lalu dipotong ke tanggal minggu ini saja: peringkatGuide_
  // ikut menghitung "hari yang hanya punya review", sehingga review di luar
  // minggu ini akan ikut terjumlah kalau petanya tidak dipotong.
  var review = {};
  var bulanList = [senin.slice(0, 7)];
  if (minggu.slice(0, 7) !== bulanList[0]) bulanList.push(minggu.slice(0, 7));
  for (var i = 0; i < bulanList.length; i++) {
    var peta = kumpulkanReviewManual_(bulanList[i], guides);
    for (var k in peta) {
      var tgl = k.slice(k.lastIndexOf('|') + 1);
      if (tgl >= senin && tgl <= minggu) review[k] = peta[k];
    }
  }

  var perGuide = {};
  peringkatGuide_(ringkasan, guides, review).forEach(function (x) { perGuide[x.guideId] = x; });
  return { senin: senin, minggu: minggu, tanggal: ringkasan.tanggal, perGuide: perGuide };
}


/** Jumlahkan sekelompok guide. `daftar` berisi objek peringkatGuide_ atau undefined. */
function jumlahkanMingguan_(daftar) {
  var j = { anggota: daftar.length, dinilai: 0, antar: 0, hari: 0, uniform: 0,
            patuh: 0, idCard: 0, etika: 0, review: 0, total: 0 };
  for (var i = 0; i < daftar.length; i++) {
    var x = daftar[i];
    if (!x) continue;
    if (x.antar > 0) j.dinilai++;
    j.antar   += x.antar;
    j.hari    += x.hari;
    j.uniform += x.uniform;
    j.patuh   += x.uniformPatuh;
    j.idCard  += x.idCard;
    j.etika   += x.etika;
    j.review  += x.review;
    j.total   += x.total;
  }
  return j;
}


/**
 * Satu baris tabel, 14 kolom. Turunan (RATA, %, MUTU) dikosongkan bila tidak
 * ada pengantaran — 0% akan terbaca "melanggar", padahal artinya "tidak dinilai".
 */
function barisMingguan_(label, regu, s) {
  var ada = s.antar > 0;
  return [label, regu,
          ada ? s.uniform : '', ada ? s.idCard : '',
          (ada || s.review) ? s.review : '', ada ? s.etika : '',
          ada ? s.antar : '', ada ? s.patuh : '',
          (ada || s.review) ? s.total : '',
          ada ? s.total / s.antar : '',
          ada ? s.patuh / s.antar : '', ada ? s.idCard / s.antar : '',
          ada ? s.uniform / s.antar : '',
          ada ? s.hari : ''];
}


/* ================= Penulisan tab ================= */

var KEPALA_MINGGUAN = ['NAME', 'REGU', 'UNI FORM', 'ID', 'REVIEW', 'ETIKA', 'ANTAR', 'PATUH',
                       'NILAI TOTAL', 'RATA', '% UNIFORM', '% ID', 'MUTU UNI', 'HARI HADIR'];


/**
 * Tulis tab satu minggu. Tata letaknya:
 *   1     judul + cap waktu            (dibekukan)
 *   2     keterangan singkat           (dibekukan)
 *   3     kepala kolom                 (dibekukan)
 *   4     SELURUH GUIDE                (dibekukan — angka utama selalu terlihat)
 *   5-10  A1, A2, SUB ASING, D1, D2, SUB DOMESTIK
 *   11    label daftar guide
 *   12+   seluruh guide aktif, urut regu lalu nama
 *
 * @return {{ nama, anggota, dinilai, antar, tanggal, pU, pId }}
 */
function tulisTabMingguan_(m, guides, hariIni) {
  var KOL = KEPALA_MINGGUAN.length;
  var info = mingguDari_(m.senin);
  var nama = namaTabMingguan_(m.senin);
  var sh = siapkanTab_(nama);

  // Urut regu (sesuai REGU_INFO), lalu nama — sama seperti tab Rekap regu.
  var kodeRegu = REGU_INFO.map(function (r) { return r.kode; });
  var urut = guides.slice().sort(function (a, b) {
    var ra = kodeRegu.indexOf(a.regu[0]), rb = kodeRegu.indexOf(b.regu[0]);
    if (ra < 0) ra = kodeRegu.length;
    if (rb < 0) rb = kodeRegu.length;
    if (ra !== rb) return ra - rb;
    var na = a.guideName.toLowerCase(), nb = b.guideName.toLowerCase();
    return na < nb ? -1 : (na > nb ? 1 : 0);
  });
  var angka = function (g) { return m.perGuide[g.guideId]; };

  /* ---------- ringkasan ---------- */
  var label = function (teks, j) { return teks + ' · ' + j.dinilai + '/' + j.anggota + ' dinilai'; };
  var semua = jumlahkanMingguan_(urut.map(angka));
  var ringkas = [barisMingguan_(label('SELURUH GUIDE', semua), 'semua', semua)];
  var jenisBaris = ['seluruh'];
  ['Asing', 'Domestik'].forEach(function (kategori) {
    var kodeKat = [];
    REGU_INFO.forEach(function (r) {
      if (r.kategori !== kategori) return;
      kodeKat.push(r.kode);
      var anggota = urut.filter(function (g) { return g.regu.indexOf(r.kode) > -1; });
      var j = jumlahkanMingguan_(anggota.map(angka));
      ringkas.push(barisMingguan_(label('REGU ' + r.kode, j), r.kode, j));
      jenisBaris.push('regu');
    });
    // Guide dihitung SEKALI per kategori walau (pernah) merangkap dua regu.
    var diKat = urut.filter(function (g) {
      return g.regu.some(function (r) { return kodeKat.indexOf(r) > -1; });
    });
    var jk = jumlahkanMingguan_(diKat.map(angka));
    ringkas.push(barisMingguan_(label('SUB ' + kategori.toUpperCase(), jk), kodeKat.join(', '), jk));
    jenisBaris.push('sub');
  });

  /* ---------- daftar guide ---------- */
  var daftar = urut.map(function (g) {
    var x = angka(g);
    var s = x ? { antar: x.antar, hari: x.hari, uniform: x.uniform, patuh: x.uniformPatuh,
                  idCard: x.idCard, etika: x.etika, review: x.review, total: x.total }
              : { antar: 0, hari: 0, uniform: 0, patuh: 0, idCard: 0, etika: 0, review: 0, total: 0 };
    return barisMingguan_(g.guideName, g.regu.join(', '), s);
  });

  var b0 = 4;                                    // baris SELURUH GUIDE
  var bDaftar = b0 + ringkas.length + 1;         // baris pertama daftar guide
  var bAkhir = bDaftar + Math.max(daftar.length, 1) - 1;
  pastikanUkuran_(sh, bAkhir, KOL);

  /* ---------- baris 1-3 ---------- */
  // Judul TIDAK di-merge: sel gabungan yang melintasi kolom beku membuat
  // setFrozenColumns gagal (lihat 06_RekapRegu.gs).
  var samaTahun = info.senin.slice(0, 4) === info.minggu.slice(0, 4);
  var status = (hariIni >= info.senin && hariIni <= info.minggu) ? '  (minggu berjalan)'
             : (hariIni < info.senin ? '  (belum dimulai)' : '');
  sh.getRange(1, 1).setValue('REKAP MINGGUAN PENILAIAN GUIDE — Senin ' +
    tanggalPendek_(info.senin, !samaTahun) + ' s.d. Minggu ' + tanggalPendek_(info.minggu, true) + status);
  sh.getRange(1, 1, 1, KOL).setFontWeight('bold').setFontSize(12)
    .setFontColor('#FFFFFF').setBackground('#0B5D3B');
  sh.getRange(1, KOL).setValue(capWaktu_())
    .setFontWeight('normal').setFontSize(9).setHorizontalAlignment('right');

  sh.getRange(2, 1).setValue(
    'Senin–Minggu (WITA), boleh lintas bulan. RATA = (Uni Form + ID + Review + Etika) ÷ Antar. ' +
    'REVIEW dibaca dari tab Rekap regu bulanan — perbaiki di sana; tab ini ditulis ulang otomatis.')
    .setFontSize(9).setFontColor('#5C6360');

  sh.getRange(3, 1, 1, KOL).setValues([KEPALA_MINGGUAN])
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#0B5D3B')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sh.getRange(3, 8).setNote('Berapa pengantaran yang berpakaian sesuai (Uniform +1 atau +2).');
  sh.getRange(3, 13).setNote('Rata-rata nilai Uniform pada skalanya sendiri, -1 s.d. +2. ' +
    'Kolom % UNIFORM tidak bisa membedakan "pakaian sesuai" dari "penampilan bagus".');
  sh.getRange(3, 14).setNote('Baris guide: berapa hari guide itu dinilai minggu ini. ' +
    'Baris ringkasan: jumlah guide-hari.');

  /* ---------- isi ---------- */
  var warna = { seluruh: '#FFF6E0', sub: '#E7F3EC', regu: '#EEF2F7' };
  sh.getRange(b0, 1, ringkas.length, KOL).setValues(ringkas).setFontWeight('bold')
    .setBackgrounds(jenisBaris.map(function (j) {
      var baris = [];
      for (var k = 0; k < KOL; k++) baris.push(warna[j]);
      return baris;
    }));
  sh.getRange(bDaftar - 1, 1).setValue('DAFTAR GUIDE — urut regu, lalu nama. ' +
    'Sel kosong = tidak dinilai minggu ini.')
    .setFontWeight('bold').setFontSize(9).setFontColor('#5C6360');
  if (daftar.length) sh.getRange(bDaftar, 1, daftar.length, KOL).setValues(daftar);

  /* ---------- format angka ---------- */
  var nAngka = bAkhir - b0 + 1;
  sh.getRange(b0, 3, nAngka, KOL - 2).setHorizontalAlignment('center');
  sh.getRange(b0, 10, nAngka, 1).setNumberFormat('0.00');      // RATA
  sh.getRange(b0, 11, nAngka, 2).setNumberFormat('0%');        // % UNIFORM, % ID
  sh.getRange(b0, 13, nAngka, 1).setNumberFormat('0.00');      // MUTU UNI

  sh.setFrozenRows(b0);
  sh.setFrozenColumns(1);
  sh.setColumnWidth(1, 240);
  sh.setColumnWidth(2, 56);
  for (var c = 3; c <= KOL; c++) sh.setColumnWidth(c, 66);
  // Buang baris & kolom kosong bawaan tab baru (1000 x 26). Batas sel satu
  // spreadsheet dihitung dari ukuran kisi, bukan dari sel yang terisi, dan
  // tab mingguan bertambah satu tiap minggu.
  pangkasUkuran_(sh, bAkhir, KOL);

  return { nama: nama, anggota: semua.anggota, dinilai: semua.dinilai, antar: semua.antar,
           tanggal: m.tanggal.length,
           pU: semua.antar ? semua.patuh / semua.antar : null,
           pId: semua.antar ? semua.idCard / semua.antar : null };
}


/** Tambah baris/kolom bila kisi tab lebih kecil dari yang akan ditulis. */
function pastikanUkuran_(sh, baris, kolom) {
  if (sh.getMaxRows() < baris) sh.insertRowsAfter(sh.getMaxRows(), baris - sh.getMaxRows());
  if (sh.getMaxColumns() < kolom) sh.insertColumnsAfter(sh.getMaxColumns(), kolom - sh.getMaxColumns());
}


/** Buang baris/kolom di luar area terpakai. */
function pangkasUkuran_(sh, baris, kolom) {
  if (sh.getMaxRows() > baris) sh.deleteRows(baris + 1, sh.getMaxRows() - baris);
  if (sh.getMaxColumns() > kolom) sh.deleteColumns(kolom + 1, sh.getMaxColumns() - kolom);
}


/* ================= Titik masuk ================= */

/**
 * Susun ulang tab rekap untuk minggu yang memuat `tgl`.
 *
 * @param {string|Date=} tgl  tanggal mana saja di minggu itu — 'yyyy-MM-dd',
 *                            '15-9-2026', atau Date. Kosong = minggu berjalan.
 * @return {string} pesan hasil
 */
function bangunRekapMingguan(tgl) {
  // Dipanggil langsung oleh trigger, argumen pertamanya objek event — itu
  // bukan tanggal, jadi diperlakukan seperti kosong.
  if (tgl && typeof tgl === 'object' && !(tgl instanceof Date)) tgl = null;
  var hariIni = kodeTanggal_(new Date());
  var kode = !tgl ? hariIni : (tgl instanceof Date ? kodeTanggal_(tgl) : bacaTanggalKetikan_(tgl));
  if (!kode) throw new Error('Tanggal "' + tgl + '" tidak dikenali. Contoh: 2026-10-05 atau 5-10-2026.');

  var lock = LockService.getScriptLock();
  // Kunci yang sama dengan bangunRekap: REVIEW dibaca dari tab Rekap regu, dan
  // tab itu kosong sesaat ketika sedang disusun ulang oleh proses lain.
  try { lock.waitLock(30000); } catch (e) { throw new Error('SIBUK: sedang dipakai proses lain'); }
  try {
    var guides = bacaGuides_();
    var m = hitungMingguan_(seninDari_(kode), guides);
    var h = tulisTabMingguan_(m, guides, hariIni);
    SpreadsheetApp.flush();

    var persen = function (x) { return x === null ? '—' : Math.round(x * 100) + '%'; };
    var pesan = h.nama + ' selesai. ' + h.antar + ' pengantaran dari ' + h.dinilai + '/' +
                h.anggota + ' guide, ' + h.tanggal + ' hari berdata | % Uniform ' + persen(h.pU) +
                ' · % ID ' + persen(h.pId);
    // Sama dengan pemeriksaan bangunRekap: ada penilaian tapi tidak satu pun
    // menempel ke guide terdaftar berarti ada yang salah, bukan "belum ada data".
    if (h.tanggal && !h.dinilai) {
      pesan += ' ⚠️ ADA PENILAIAN TAPI TIDAK ADA YANG MASUK REKAP —' +
               ' periksa apakah guideId di tab Evaluations terdaftar di tab Guides.';
    }
    Logger.log(pesan);
    return pesan;
  } finally {
    lock.releaseLock();
  }
}


/* ================= Menu ================= */

function menuRekapMingguIni() {
  tampilkanMingguan_(kodeTanggal_(new Date()));
}


function menuRekapMingguLalu() {
  tampilkanMingguan_(geserTanggal_(kodeTanggal_(new Date()), -7));
}


function menuRekapMingguPilihan() {
  var ui = SpreadsheetApp.getUi();
  var jawab = ui.prompt('Rekap minggu lain',
    'Ketik tanggal mana saja di minggu yang ingin direkap, mis. 15-9-2026.\n' +
    'Satu minggu = Senin s.d. Minggu.', ui.ButtonSet.OK_CANCEL);
  if (jawab.getSelectedButton() !== ui.Button.OK) return;
  var tgl = bacaTanggalKetikan_(jawab.getResponseText());
  if (!tgl) {
    ui.alert('Tanggal "' + jawab.getResponseText() + '" tidak dikenali. Contoh: 15-9-2026.');
    return;
  }
  tampilkanMingguan_(tgl);
}


/** Susun, buka tabnya, lalu tampilkan hasilnya sebagai pesan — bukan dialog error mentah. */
function tampilkanMingguan_(tgl) {
  var ui = SpreadsheetApp.getUi();
  try {
    var pesan = bangunRekapMingguan(tgl);
    var sh = ss_().getSheetByName(namaTabMingguan_(tgl));
    if (sh) ss_().setActiveSheet(sh);
    ui.alert(pesan);
  } catch (e) {
    ui.alert('Rekap mingguan tidak jadi disusun: ' + e.message);
  }
}
