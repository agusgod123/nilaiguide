/**
 * ============================================================
 *  Jalur tulis — penerimaan penilaian dari aplikasi
 *  Berkas 4 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : doGet/doPost, validasi, idempotensi, tolak duplikat pos, proses koreksi.
 *  LARANGAN : Tidak boleh menyusun rekap. Rekap sengaja di luar jalur POST supaya
 *          balasan ke aplikasi lapangan tetap cepat (lihat 10_Trigger.gs).
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */


/* ================= GET ================= */
/**
 * ?action=guides  → daftar guide aktif (dipakai dropdown aplikasi)
 * ?action=health  → cek server hidup (tombol "Tes Koneksi Server")
 *
 * Sengaja TIDAK ada endpoint untuk membaca daftar penilaian: web app ini
 * dideploy sebagai "Anyone", jadi endpoint semacam itu akan membuat seluruh
 * data penilaian bisa diunduh siapa saja. Rekap dilihat dari spreadsheet ini.
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'health';

  if (action === 'guides') {
    var rows = sheet_(SHEET_GUIDES).getDataRange().getValues().slice(1);
    var guides = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r[0]) continue;
      if (String(r[4]).toUpperCase() === 'FALSE') continue;
      guides.push({
        guideId:   String(r[0]).trim(),
        guideName: String(r[1]).trim(),
        kategori:  String(r[2] || '').trim(),
        regu:      String(r[3] || '').trim(),
        aktif:     true
      });
    }
    return json_({ guides: guides });
  }

  var last = sheet_(SHEET_EVAL).getLastRow();
  return json_({
    ok: true,
    storage: 'google-sheets',
    total: Math.max(0, last - 1),
    serverTime: new Date().toISOString()
  });
}



/* ================= POST ================= */
/**
 * Menerima satu penilaian, atau batch { evaluations: [...] }.
 * Bersifat append-only dan idempoten: mengirim ulang evaluationId yang sama
 * tidak menggandakan baris, sehingga retry dari aplikasi selalu aman.
 *
 * Aplikasi mengirim body dengan Content-Type text/plain agar tidak memicu
 * preflight CORS — Apps Script tidak bisa menjawab permintaan OPTIONS.
 */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ accepted: [], rejected: [{ evaluationId: null, errors: ['JSON tidak valid'] }] });
  }

  var items = (body && Object.prototype.toString.call(body.evaluations) === '[object Array]')
    ? body.evaluations : [body];

  if (items.length > BATCH_MAKS) {
    return json_({ accepted: [], rejected: [{ evaluationId: null,
      errors: ['maksimal ' + BATCH_MAKS + ' entri per kiriman'] }] });
  }

  var accepted = [], rejected = [];

  // Kunci: mencegah dua pos menulis ke baris yang sama secara bersamaan.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    // Tidak dapat kunci → beri tahu aplikasi agar mencoba lagi nanti.
    return json_({ accepted: [], rejected: [], busy: true });
  }

  try {
    var sh = sheet_(SHEET_EVAL);
    var last = sh.getLastRow();
    // idAda   : evaluationId -> true
    // jamAktif: 'guideId|pos' -> [{ ms, id }] jam penilaian yang MASIH aktif.
    //           Menggantikan kunci harian lama: sejak penilaian dihitung per
    //           pengantaran, satu guide boleh dinilai berkali-kali sehari di
    //           pos yang sama, jadi yang tersisa hanya pengaman jeda.
    // barisId : evaluationId -> { row, status, kunci, kunciGP }  (untuk koreksi)
    var idAda = {}, jamAktif = {}, barisId = {};
    if (last > 1) {
      // Kolom A..D: evaluationId, timestamp, pos, guideId — plus kolom status.
      var kol = sh.getRange(2, 1, last - 1, 4).getValues();
      var stat = sh.getRange(2, KOL_STATUS, last - 1, 1).getValues();
      for (var i = 0; i < kol.length; i++) {
        var idBaris = String(kol[i][0]);
        if (!idBaris) continue;
        idAda[idBaris] = true;
        var w = new Date(kol[i][1]);
        if (isNaN(w.getTime())) continue;
        var k = kunciPos_(String(kol[i][3]), kol[i][2], kodeTanggal_(w));
        var kgp = kunciGuidePos_(String(kol[i][3]), kol[i][2]);
        // Baris dari sebelum kolom status ada dianggap aktif.
        var st = String(stat[i][0] || '').trim().toLowerCase();
        barisId[idBaris] = { row: i + 2, status: st, kunci: k, kunciGP: kgp };
        if (st !== STATUS_GANTI) {
          if (!jamAktif[kgp]) jamAktif[kgp] = [];
          jamAktif[kgp].push({ ms: w.getTime(), id: idBaris });
        }
      }
    }

    // Nama guide diambil dari tab Guides, bukan dari kiriman aplikasi: kalau
    // perangkat memakai daftar guide lama, nama yang salah akan membuat baris
    // itu tidak pernah cocok dengan siapa pun di rekap.
    var namaResmi = petaGuides_();

    var baris = [], bulanTersentuh = {}, ditandaiGanti = [];
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      var errs = validasi_(it, namaResmi);
      if (errs.length) {
        rejected.push({ evaluationId: (it && it.evaluationId) || null, errors: errs });
        continue;
      }
      if (idAda[String(it.evaluationId)]) {
        accepted.push({ evaluationId: it.evaluationId, synced: true, duplicate: true });
        continue;
      }
      var gid = String(it.guideId).trim();
      var tglIt = kodeTanggal_(new Date(it.timestamp));
      var kunci = kunciPos_(gid, it.pos, tglIt);
      var kunciGP = kunciGuidePos_(gid, it.pos);
      var msIt = new Date(it.timestamp).getTime();
      var koreksiDari = String(it.koreksiDari || '').trim();

      if (koreksiDari) {
        // KOREKSI SALAH PENCET.
        // Tetap append-only: baris lama TIDAK dihapus, hanya ditandai
        // 'diganti' dan dilewati saat rekap disusun. Jejaknya tetap ada.
        var asal = barisId[koreksiDari];
        if (!asal) {
          rejected.push({ evaluationId: it.evaluationId,
            errors: ['penilaian yang diperbaiki (' + koreksiDari + ') tidak ada di server'] });
          continue;
        }
        if (asal.status === STATUS_GANTI) {
          rejected.push({ evaluationId: it.evaluationId,
            errors: ['penilaian itu sudah pernah diperbaiki oleh penilaian lain'] });
          continue;
        }
        if (asal.kunci !== kunci) {
          // Koreksi hanya boleh menggantikan penilaian atas guide, pos, dan
          // tanggal yang sama. Kalau tidak, "koreksi" bisa dipakai menyelundupkan
          // penilaian kedua di pos yang sama pada hari yang sama.
          rejected.push({ evaluationId: it.evaluationId,
            errors: ['koreksi harus untuk guide, pos, dan tanggal yang sama'] });
          continue;
        }
        ditandaiGanti.push(asal.row);
        asal.status = STATUS_GANTI;          // cegah koreksi ganda dalam satu kiriman
        // Baris yang digantikan tidak boleh lagi memicu pengaman jeda — koreksi
        // menggantikan penilaian itu, bukan menambah pengantaran baru.
        buangJamAktif_(jamAktif, asal.kunciGP, koreksiDari);
      } else {
        // PENGAMAN JEDA, menggantikan "satu pos satu kali sehari".
        // Guide yang sama boleh dinilai berkali-kali sehari di pos yang sama —
        // itu memang pengantaran yang berbeda. Yang tidak masuk akal adalah dua
        // penilaian berselang beberapa menit: itu hampir pasti salah pencet.
        //
        // Pemeriksaannya di sini, bukan di aplikasi: hanya server yang memegang
        // data seluruh pos. Perangkat di Pos 1 tidak tahu apa yang baru dicatat
        // perangkat lain, jadi kalau ditegakkan di aplikasi, kiriman ganda antar
        // perangkat lolos begitu saja.
        //
        // Selisihnya diambil MUTLAK: entri offline bisa tiba belakangan dengan
        // cap waktu lebih awal, dan itu tetap pencetan ganda yang sama.
        var bentrok = bentrokJeda_(jamAktif, kunciGP, msIt);
        if (bentrok) {
          rejected.push({
            evaluationId: it.evaluationId,
            errors: [(namaResmi[gid] || gid) + ' baru saja dinilai di Pos ' + Number(it.pos) +
                     ' (' + Math.round(Math.abs(bentrok.ms - msIt) / 60000) + ' menit dari penilaian ini)' +
                     ' — jeda minimal ' + JEDA_TOLAK_MENIT + ' menit, jadi ini hampir pasti salah pencet.' +
                     ' Kalau memang pengantaran berikutnya, tunggu jedanya habis.' +
                     ' Untuk membetulkan nilainya, kirim koreksi (koreksiDari: ' + bentrok.id + ')'],
            sudahDinilai: true,
            terlaluCepat: true,
            aktifSaatIni: bentrok.id
          });
          continue;
        }
      }
      // Juga mencegah pencetan ganda di dalam SATU kiriman.
      if (!jamAktif[kunciGP]) jamAktif[kunciGP] = [];
      jamAktif[kunciGP].push({ ms: msIt, id: String(it.evaluationId) });
      barisId[String(it.evaluationId)] = { row: 0, status: STATUS_AKTIF,
                                           kunci: kunci, kunciGP: kunciGP };
      baris.push([
        String(it.evaluationId),
        String(it.timestamp),
        Number(it.pos),
        gid,
        namaResmi[gid] || String(it.guideName),
        normalUniform_(it.criteria.uniform),
        it.criteria.idCard ? 1 : 0,
        Math.min(REVIEW_MAKS, Math.max(0, Number(it.criteria.review) || 0)),
        Math.min(ETIKA_MAKS, Math.max(ETIKA_MIN, Number(it.criteria.etika) || 0)),
        String(it.catatan || '').slice(0, CATATAN_MAKS),
        new Date().toISOString(),
        koreksiDari,
        STATUS_AKTIF
      ]);
      idAda[String(it.evaluationId)] = true;
      bulanTersentuh[kodeBulan_(new Date(it.timestamp))] = true;
      accepted.push({ evaluationId: it.evaluationId, synced: true, duplicate: false });
    }

    if (baris.length) {
      // Tandai yang digantikan LEBIH DULU. Kalau baris barunya masuk duluan
      // lalu penandaan gagal, rekap akan memuat dua baris aktif untuk pos dan
      // hari yang sama — nilai ganda yang lebih buruk daripada koreksi gagal.
      for (var d = 0; d < ditandaiGanti.length; d++) {
        sh.getRange(ditandaiGanti[d], KOL_STATUS).setValue(STATUS_GANTI);
      }
      sh.getRange(sh.getLastRow() + 1, 1, baris.length, HEADER_EVAL.length).setValues(baris);
      SpreadsheetApp.flush();
      // Titipkan ke trigger: rekap harus disusun ulang. Rekapnya TIDAK dibangun
      // di sini supaya balasan ke aplikasi tetap cepat (lihat rekapOtomatis).
      tandaiRekapTertunda_(Object.keys(bulanTersentuh));
    }
  } catch (err) {
    // Gagal menulis → jangan balas "accepted", supaya aplikasi menahan data
    // di antrean dan mencobanya lagi.
    return json_({ accepted: [], rejected: [], error: String(err) });
  } finally {
    lock.releaseLock();
  }

  // serverTime ikut dikirim supaya aplikasi bisa mengukur seberapa meleset
  // jam perangkatnya. Jam HP yang salah membuat penilaian jatuh pada TANGGAL
  // yang salah di rekap, dan itu tidak bisa dilihat dari sisi perangkat sendiri.
  return json_({ accepted: accepted, rejected: rejected,
                 total: sheet_(SHEET_EVAL).getLastRow() - 1,
                 serverTime: new Date().toISOString() });
}


/* ================= Validasi ================= */

/**
 * @param {Object=} namaResmi peta guideId -> guideName dari tab Guides.
 *   Bila diberikan, guideId yang tidak terdaftar akan ditolak — baris seperti
 *   itu tidak akan pernah muncul di rekap, jadi lebih baik ditolak sejak awal
 *   supaya aplikasi menahannya dan petugas tahu ada yang salah.
 */
function validasi_(it, namaResmi) {
  var errs = [];
  if (!it || typeof it !== 'object') return ['body bukan objek'];
  if (!it.evaluationId) errs.push('evaluationId wajib');
  if (!it.guideId)      errs.push('guideId wajib');
  if (!it.guideName)    errs.push('guideName wajib');
  if (it.guideId && namaResmi && !namaResmi[String(it.guideId).trim()]) {
    errs.push('guideId "' + it.guideId + '" tidak ada di tab Guides');
  }
  if ([1, 2, 3].indexOf(Number(it.pos)) === -1) errs.push('pos harus 1, 2, atau 3');
  if (it.koreksiDari !== undefined && it.koreksiDari !== null && it.koreksiDari !== '') {
    if (typeof it.koreksiDari !== 'string') errs.push('koreksiDari harus berupa evaluationId');
    else if (it.koreksiDari === it.evaluationId) errs.push('koreksiDari tidak boleh dirinya sendiri');
  }
  if (!it.timestamp || isNaN(Date.parse(it.timestamp))) errs.push('timestamp harus ISO8601');
  if (!it.criteria || typeof it.criteria !== 'object') {
    errs.push('criteria wajib');
  } else {
    if (typeof it.criteria.idCard !== 'boolean') errs.push('criteria.idCard harus boolean');
    // UNIFORM kini tiga tingkat (-1 / +1 / +2), dulu Ya/Tidak.
    // Boolean TETAP diterima supaya perangkat yang belum sempat memperbarui
    // aplikasinya tidak ditolak permanen dan datanya hilang: true = +1
    // "pakaian sesuai", false = -1 "pakaian tidak sesuai".
    var uf = it.criteria.uniform;
    if (typeof uf !== 'boolean') {
      if (typeof uf !== 'number' || UNIFORM_NILAI.indexOf(uf) === -1) {
        errs.push('criteria.uniform harus boolean (aplikasi lama) atau salah satu dari ' +
                  UNIFORM_NILAI.join(', '));
      }
    }
    // Review sudah TIDAK diisi lewat aplikasi — kolomnya tetap ada di
    // spreadsheet dan diisi manual oleh tim. Kiriman lama yang masih
    // menyertakannya tetap diterima selama berupa angka.
    if (it.criteria.review !== undefined && it.criteria.review !== null) {
      var rv = Number(it.criteria.review);
      if (!isFinite(rv) || rv < 0) errs.push('criteria.review harus angka >= 0');
    }
    // Etika BOLEH tidak dikirim dan dianggap 0. Perangkat yang belum sempat
    // memperbarui aplikasinya tetap bisa mengirim — kalau ini diwajibkan,
    // penilaiannya akan ditolak permanen dan datanya hilang.
    if (it.criteria.etika !== undefined && it.criteria.etika !== null) {
      var et = Number(it.criteria.etika);
      if (!isFinite(et) || et < ETIKA_MIN || et > ETIKA_MAKS) {
        errs.push('criteria.etika harus angka antara ' + ETIKA_MIN + ' dan ' + ETIKA_MAKS);
      }
    }
  }
  return errs;
}


/**
 * Peta guideId -> guideName dari tab Guides (termasuk yang nonaktif, supaya
 * penilaian atas guide yang baru dinonaktifkan tetap bisa masuk).
 * Disimpan sebentar di cache agar tidak dibaca ulang tiap kiriman.
 */
/**
 * Kunci guide + pos + tanggal setempat.
 *
 * BUKAN lagi kunci keunikan — sejak penilaian dihitung per pengantaran, satu
 * guide boleh punya beberapa baris untuk pos dan hari yang sama. Yang tersisa:
 * dipakai KOREKSI untuk memastikan penggantinya masih atas guide, pos, dan
 * tanggal yang sama.
 */
function kunciPos_(guideId, pos, tgl) {
  return String(guideId).trim() + '|' + (Number(pos) || 0) + '|' + tgl;
}


/** Kunci pengaman jeda: guide + pos, lintas hari (jeda dihitung dari jam). */
function kunciGuidePos_(guideId, pos) {
  return String(guideId).trim() + '|' + (Number(pos) || 0);
}


/**
 * Cari penilaian aktif atas guide & pos yang sama yang jaraknya lebih dekat
 * dari JEDA_TOLAK_MENIT. Selisih diambil mutlak supaya entri offline yang tiba
 * belakangan dengan cap waktu lebih awal ikut tertangkap.
 *
 * Server hanya menegakkan ambang TOLAK. Rentang peringatan ditangani aplikasi,
 * supaya petugas bisa meneruskan pengantaran yang memang sah.
 * @return {{ms:number,id:string}|null}
 */
function bentrokJeda_(jamAktif, kunciGP, ms) {
  var daftar = jamAktif[kunciGP];
  if (!daftar || !daftar.length) return null;
  var batas = JEDA_TOLAK_MENIT * 60000;
  for (var i = 0; i < daftar.length; i++) {
    if (Math.abs(daftar[i].ms - ms) < batas) return daftar[i];
  }
  return null;
}


/** Lepas satu evaluationId dari daftar jam aktif (dipakai saat koreksi). */
function buangJamAktif_(jamAktif, kunciGP, id) {
  var daftar = jamAktif[kunciGP];
  if (!daftar) return;
  for (var i = daftar.length - 1; i >= 0; i--) {
    if (daftar[i].id === id) daftar.splice(i, 1);
  }
}


/**
 * Samakan nilai Uniform ke skala tiga tingkat (-1, +1, +2).
 *
 * Aturannya dipegang di sini, di pintu masuk data, dan dipakai ulang oleh rekap
 * supaya baris lama dan baru dibaca dengan skala yang sama persis.
 *
 * Data lama menyimpan Ya/Tidak sebagai 1/0. Skala baru tidak pernah memakai 0,
 * jadi 0 pasti berasal dari data lama dan berarti "tidak sesuai" = -1.
 */
function normalUniform_(v) {
  if (v === true)  return 1;
  if (v === false) return -1;
  var n = Number(v);
  if (!isFinite(n) || n === 0) return -1;
  if (n < UNIFORM_MIN)  return UNIFORM_MIN;
  if (n > UNIFORM_MAKS) return UNIFORM_MAKS;
  return Math.round(n);
}


function petaGuides_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) {}
  if (cache) {
    var simpan = cache.get('petaGuides');
    if (simpan) { try { return JSON.parse(simpan); } catch (e) {} }
  }

  var rows = sheet_(SHEET_GUIDES).getDataRange().getValues().slice(1);
  var peta = {};
  for (var i = 0; i < rows.length; i++) {
    var id = String(rows[i][0] || '').trim();
    if (id) peta[id] = String(rows[i][1] || '').trim();
  }
  if (cache) { try { cache.put('petaGuides', JSON.stringify(peta), 300); } catch (e) {} }
  return peta;
}
