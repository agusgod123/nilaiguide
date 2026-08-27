/**
 * ============================================================
 *  Orkestrasi — urutan rekap, trigger, menu
 *  Berkas 11 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Satu-satunya tempat yang menentukan URUTAN pembangunan tab.
 *  LARANGAN : Dasbor selalu terakhir. Jangan menyusun rekap dari dalam doPost.
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


function bangunRekap(bulan) {
  bulan = bulan || kodeBulan_(new Date());
  var lock = LockService.getScriptLock();
  // Dilempar, bukan dikembalikan sebagai teks: pemanggilnya (rekapOtomatis)
  // harus tahu rekap TIDAK jadi disusun supaya bulan ini ditandai ulang.
  try { lock.waitLock(30000); } catch (e) { throw new Error('SIBUK: sedang dipakai proses lain'); }

  try {
    var guides = bacaGuides_();
    var ringkasan = rangkumBulan_(bulan);
    var hasil = [], totalTerisi = 0, infoRegu = {};
    for (var i = 0; i < REGU_INFO.length; i++) {
      var n = bangunRekapRegu_(REGU_INFO[i], bulan, ringkasan, guides);
      infoRegu[REGU_INFO[i].kode] = n;
      hasil.push(REGU_INFO[i].kode + ':' + n.anggota + '/' + n.terisi);
      totalTerisi += n.terisi;
    }
    var nPos = bangunRekapPerPos_(bulan, ringkasan, guides);
    var hadir = bangunRekapKehadiran_(bulan, ringkasan, guides);

    // Dasbor disusun PALING AKHIR, dan itu wajib: ringkasan hariannya berupa
    // rumus yang menunjuk sel-sel tab regu, jadi tab-tab itu harus sudah ada
    // dengan jumlah kolom tanggal yang final. Angka REVIEW yang diketik tim
    // juga baru bisa dibaca setelah tab regu selesai ditulis ulang.
    var dasbor = bangunDasbor_(bulan, ringkasan, guides, infoRegu);
    SpreadsheetApp.flush();

    // Pemeriksaan mandiri: ada penilaian bulan ini tapi tidak satu pun nilai
    // harian mendarat di tab regu = ada yang salah (mis. guideId di tab
    // Evaluations tidak ada di tab Guides). Lebih baik berteriak daripada
    // menampilkan rekap kosong yang disangka "memang belum ada data".
    var peringatan = '';
    if (ringkasan.tanggal.length && totalTerisi === 0) {
      peringatan = ' ⚠️ ADA PENILAIAN TAPI TIDAK ADA YANG MASUK REKAP —' +
                   ' periksa apakah guideId di tab Evaluations terdaftar di tab Guides.';
    }

    var pesan = 'Rekap ' + bulan + ' selesai. ' + hasil.join(' ') +
                ' (anggota/terisi) | tanggal terisi: ' + ringkasan.tanggal.length +
                ' | guide dinilai: ' + nPos +
                ' | kehadiran tercatat: ' + hadir.terisi + ' guide-hari' +
                ' | dasbor: ' + dasbor.diperingkat + ' guide diperingkat, ' +
                dasbor.belumCukup + ' belum cukup hari' +
                (dasbor.grafik ? ', grafik terpasang' : ', grafik dilewati (< 2 tanggal)') +
                peringatan;
    Logger.log(pesan);
    return pesan;
  } finally {
    lock.releaseLock();
  }
}


/* ================= Pembaruan otomatis ================= */
/**
 * Rekap TIDAK dibangun langsung di dalam doPost: menyusun empat tab regu
 * memakan waktu belasan detik, sedangkan aplikasi di lapangan menunggu balasan
 * dan akan menganggap penilaian gagal bila terlalu lama. Jadi doPost hanya
 * menitipkan "bulan mana yang berubah", lalu trigger tiap 5 menit yang
 * mengerjakannya.
 */
function tandaiRekapTertunda_(daftarBulan) {
  if (!daftarBulan || !daftarBulan.length) return;
  try {
    var props = PropertiesService.getScriptProperties();
    var kumpul = {};
    String(props.getProperty(PROP_TERTUNDA) || '').split(',').forEach(function (b) {
      if (b) kumpul[b] = true;
    });
    daftarBulan.forEach(function (b) { if (b) kumpul[b] = true; });
    props.setProperty(PROP_TERTUNDA, Object.keys(kumpul).join(','));
  } catch (e) {
    Logger.log('gagal menandai rekap tertunda: ' + e);
  }
}


/** Dijalankan trigger tiap 5 menit. Tidak melakukan apa pun bila tak ada perubahan. */
function rekapOtomatis() {
  var props;
  try { props = PropertiesService.getScriptProperties(); } catch (e) { return; }
  var tertunda = String(props.getProperty(PROP_TERTUNDA) || '').split(',')
    .filter(function (b) { return b; });
  if (!tertunda.length) return;

  // Dibersihkan lebih dulu supaya penilaian yang masuk saat rekap sedang
  // disusun tetap tercatat sebagai perubahan baru untuk putaran berikutnya.
  props.deleteProperty(PROP_TERTUNDA);
  for (var i = 0; i < tertunda.length; i++) {
    try { bangunRekap(tertunda[i]); }
    catch (e) { Logger.log('rekapOtomatis ' + tertunda[i] + ': ' + e); tandaiRekapTertunda_([tertunda[i]]); }
  }
}


/** Dipanggil trigger harian — jaring pengaman kalau trigger 5 menit terlewat. */
function rekapHarian() {
  bangunRekap();
}


/* ================= Menu & trigger ================= */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Penilaian Guide')
    .addItem('Perbarui Rekap Bulan Ini', 'menuRekapSekarang')
    .addItem('Perbarui Rekap Bulan Lalu', 'menuRekapBulanLalu')
    .addSeparator()
    .addItem('Nyalakan Pembaruan Otomatis', 'pasangTriggerHarian')
    .addItem('Periksa Kesehatan Data', 'menuPeriksa')
    .addSeparator()
    .addItem('Susun Laporan Bulan Ini', 'menuLaporanSekarang')
    .addItem('Susun Laporan Bulan Lalu', 'menuLaporanBulanLalu')
    .addToUi();
}


/** Bungkus supaya kegagalan tampil sebagai pesan, bukan dialog error mentah. */
function jalankanRekap_(bulan) {
  try { return bangunRekap(bulan); }
  catch (e) { return 'Rekap tidak jadi disusun: ' + e.message; }
}


function menuRekapSekarang() {
  SpreadsheetApp.getUi().alert(jalankanRekap_());
}


function menuRekapBulanLalu() {
  var d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  SpreadsheetApp.getUi().alert(jalankanRekap_(kodeBulan_(d)));
}


/**
 * Pasang dua trigger sekaligus (yang lama dibuang dulu agar tidak menumpuk):
 *   - tiap 5 menit : menyusun ulang rekap HANYA bila ada penilaian baru
 *   - tiap malam   : jaring pengaman kalau trigger 5 menit sempat terlewat
 */
function pasangTriggerHarian() {
  var otomatis = ['rekapHarian', 'rekapOtomatis'];
  var lama = ScriptApp.getProjectTriggers();
  for (var i = 0; i < lama.length; i++) {
    if (otomatis.indexOf(lama[i].getHandlerFunction()) > -1) ScriptApp.deleteTrigger(lama[i]);
  }
  ScriptApp.newTrigger('rekapOtomatis').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('rekapHarian').timeBased().atHour(23).everyDays(1).create();

  var pesan = 'Pembaruan otomatis menyala.\n\n' +
              '• Rekap disusun ulang paling lambat 5 menit setelah penilaian masuk.\n' +
              '• Ditambah satu penyusunan menyeluruh tiap malam pukul 23.00.';
  try { SpreadsheetApp.getUi().alert(pesan); } catch (e) {}
  Logger.log(pesan);
  return pesan;
}


/**
 * Laporan singkat kondisi data — dipakai saat rekap terlihat kosong padahal
 * penilaian sudah dikirim dari lapangan.
 */
function periksaKesehatan() {
  var ev = sheet_(SHEET_EVAL);
  var last = ev.getLastRow();
  var jml = Math.max(0, last - 1);
  var peta = petaGuides_();
  var bulanIni = kodeBulan_(new Date());

  var yatim = {}, bulanan = {}, terbaru = '', diganti = 0;
  if (jml) {
    var data = ev.getRange(2, 1, jml, HEADER_EVAL.length).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][KOL_STATUS - 1] || '').trim().toLowerCase() === STATUS_GANTI) diganti++;
      var gid = String(data[i][3]).trim();
      if (!peta[gid]) yatim[gid] = (yatim[gid] || 0) + 1;
      var w = new Date(data[i][1]);
      if (!isNaN(w.getTime())) {
        var b = kodeBulan_(w);
        bulanan[b] = (bulanan[b] || 0) + 1;
        if (String(data[i][1]) > terbaru) terbaru = String(data[i][1]);
      }
    }
  }

  var idYatim = Object.keys(yatim);
  var baris = [
    'Total penilaian tersimpan : ' + jml,
    'Diganti oleh koreksi      : ' + diganti + ' (barisnya tetap ada, tidak ikut rekap)',
    'Penilaian bulan ini (' + bulanIni + ') : ' + (bulanan[bulanIni] || 0),
    'Penilaian terakhir masuk  : ' + (terbaru || '—'),
    'Trigger otomatis aktif    : ' + ScriptApp.getProjectTriggers()
      .filter(function (t) { return t.getHandlerFunction() === 'rekapOtomatis'; }).length + ' buah',
    'Guide terdaftar di tab Guides : ' + Object.keys(peta).length,
    ss_().getSpreadsheetTimeZone() === ZONA_WAKTU
      ? '✅ Zona waktu spreadsheet : ' + ZONA_WAKTU + ' (WITA)'
      : '⚠️ Zona waktu spreadsheet : ' + ss_().getSpreadsheetTimeZone() +
        ' — seharusnya ' + ZONA_WAKTU + '. Tanggal rekap & aturan "satu pos sekali sehari"' +
        ' memakai zona ini, jadi batas harinya sedang meleset. Jalankan setup() untuk memperbaiki.',
    idYatim.length
      ? '⚠️ guideId tidak dikenal  : ' + idYatim.join(', ') + ' — baris ini tidak akan muncul di rekap'
      : '✅ Semua guideId dikenal — tidak ada baris yang tercecer'
  ].join('\n');

  Logger.log(baris);
  return baris;
}


function menuPeriksa() {
  SpreadsheetApp.getUi().alert(periksaKesehatan() + '\n\n' + jalankanRekap_());
}


/* ================= Uji mandiri (opsional) ================= */
/**
 * Jalankan fungsi ini dari editor Apps Script untuk memastikan tulis-baca
 * berfungsi tanpa perlu membuka aplikasi. Baris ujinya dihapus lagi di akhir.
 */
function ujiCepat() {
  var id = 'TEST-' + new Date().getTime();
  var res = JSON.parse(doPost({ postData: { contents: JSON.stringify({
    evaluationId: id,
    guideId: 'G-001',
    guideName: 'Gusti Alit Astawa',
    pos: 1,
    timestamp: new Date().toISOString(),
    criteria: { idCard: true, uniform: false, review: 2 },
    catatan: 'baris uji otomatis'
  }) } }).getContent());

  var ulang = JSON.parse(doPost({ postData: { contents: JSON.stringify({
    evaluationId: id, guideId: 'G-001', guideName: 'Gusti Alit Astawa', pos: 1,
    timestamp: new Date().toISOString(),
    criteria: { idCard: true, uniform: false, review: 2 }
  }) } }).getContent());

  var salah = JSON.parse(doPost({ postData: { contents: JSON.stringify({
    guideId: 'G-002', pos: 9, criteria: { idCard: 'ya', review: -1 }
  }) } }).getContent());

  var guides = JSON.parse(doGet({ parameter: { action: 'guides' } }).getContent());

  // bersihkan baris uji
  var sh = sheet_(SHEET_EVAL);
  var kol = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).getValues();
  for (var i = kol.length - 1; i >= 0; i--) {
    if (String(kol[i][0]) === id) sh.deleteRow(i + 2);
  }

  var hasil = [
    'tulis pertama  : ' + (res.accepted.length === 1 && !res.accepted[0].duplicate ? 'OK' : 'GAGAL'),
    'kirim ulang    : ' + (ulang.accepted.length === 1 && ulang.accepted[0].duplicate ? 'OK (tidak ganda)' : 'GAGAL'),
    'data tidak sah : ' + (salah.rejected.length === 1 && salah.accepted.length === 0 ? 'OK (ditolak)' : 'GAGAL'),
    'daftar guide   : ' + guides.guides.length + ' guide aktif',
    'baris uji sudah dihapus kembali.'
  ].join('\n');

  Logger.log(hasil);
  return hasil;
}
