/* =========================================================
   sync.js — Sinkronisasi offline → online (PRD §8)
   1. Deteksi jaringan  2. Queue  3. Retry exponential backoff
   4. Append-only (tanpa konflik)
   ========================================================= */
(function (global) {
  'use strict';

  const SETTINGS_KEY = 'besakih.settings';
  const MAX_ATTEMPTS = 6;
  const BASE_DELAY = 2000;      // 2s, 4s, 8s, 16s, 32s, 64s
  const MAX_DELAY = 5 * 60_000;
  const AUTO_INTERVAL = 60_000; // cek berkala tiap 1 menit

  const listeners = new Set();
  let running = false;
  let retryTimer = null;
  let backoffStep = 0;

  const defaults = {
    serverUrl: '', forceOffline: false, encrypt: true, haptic: true, pos: 1,
    filterKategori: '', filterRegu: '',
  };

  const Settings = {
    get() {
      try { return { ...defaults, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) }; }
      catch { return { ...defaults }; }
    },
    set(patch) {
      const next = { ...Settings.get(), ...patch };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    },
  };

  const trim = u => String(u || '').trim().replace(/\/+$/, '');

  /**
   * Urutan penentuan alamat backend:
   * 1. Yang diisi staff di menu Pengaturan
   * 2. `serverUrl` pada config.js (untuk deploy statis, mis. GitHub Pages)
   * 3. Origin tempat aplikasi dibuka (mis. `node server/server.js` di lokal)
   */
  function baseUrl() {
    return trim(Settings.get().serverUrl)
        || trim(global.APP_CONFIG && global.APP_CONFIG.serverUrl)
        || global.location.origin;
  }

  /** True bila aplikasi di-host statis (tanpa backend di origin yang sama). */
  function needsServerUrl() {
    if (trim(Settings.get().serverUrl) || trim(global.APP_CONFIG && global.APP_CONFIG.serverUrl)) return false;
    return /\.github\.io$/i.test(global.location.hostname)
        || /\.pages\.dev$/i.test(global.location.hostname)
        || global.location.protocol === 'file:';
  }

  /**
   * Jenis backend. Google Apps Script hanya punya SATU URL (…/exec) tanpa path,
   * jadi endpoint-nya dibedakan lewat query parameter.
   */
  function serverKind() {
    return /script\.google(usercontent)?\.com/i.test(baseUrl()) ? 'gas' : 'rest';
  }

  /** URL endpoint sesuai jenis backend. */
  function endpoint(nama) {
    const b = baseUrl();
    if (serverKind() === 'gas') {
      return nama === 'evaluations' ? b : `${b}?action=${nama}`;
    }
    return nama === 'evaluations' ? `${b}/api/evaluations` : `${b}/api/${nama}`;
  }

  /**
   * Header POST. Apps Script tidak menjawab preflight `OPTIONS`, sehingga
   * `application/json` akan diblokir CORS. `text/plain` membuat permintaan
   * tergolong "simple request" — isi body tetap JSON dan dibaca lewat
   * `e.postData.contents`.
   */
  function postHeaders() {
    return serverKind() === 'gas'
      ? { 'Content-Type': 'text/plain;charset=utf-8' }
      : { 'Content-Type': 'application/json' };
  }

  function emit(state, detail) {
    listeners.forEach(fn => { try { fn(state, detail || {}); } catch (e) { console.warn(e); } });
  }

  function isOnline() {
    return navigator.onLine !== false && !Settings.get().forceOffline;
  }

  async function fetchWithTimeout(url, opts = {}, ms = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
  }

  /** Ambil daftar guide dari server, simpan ke cache. Aman dipanggil offline. */
  async function refreshGuides() {
    try {
      const res = await fetchWithTimeout(endpoint('guides'), { cache: 'no-store' }, 12000);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (Array.isArray(data.guides) && data.guides.length) {
        await DB.setGuides(data.guides);
        return data.guides;
      }
      throw new Error('daftar kosong');
    } catch (e) {
      const cached = DB.getGuides();
      if (cached) return cached.list;
      throw e;
    }
  }

  /**
   * Catat seberapa meleset jam perangkat dari jam server.
   *
   * serverTime diambil di tengah-tengah permintaan, jadi patokannya titik
   * tengah antara sebelum dan sesudah — tanpa itu, seluruh waktu perjalanan
   * jaringan ikut terhitung sebagai "jam perangkat ketinggalan".
   */
  function catatWaktuServer(body, t0, t1) {
    if (!body || !body.serverTime) return;
    const server = Date.parse(body.serverTime);
    if (!isFinite(server)) return;
    DB.setSelisihJam(server - (t0 + t1) / 2);
  }

  async function ping() {
    const t0 = Date.now();
    const res = await fetchWithTimeout(endpoint('health'), { cache: 'no-store' }, 15000);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.json();
    catatWaktuServer(body, t0, Date.now());
    return body;
  }

  /** True bila server mengonfirmasi evaluationId tersimpan (bukan sekadar HTTP 200). */
  function diterima_(body, evaluationId) {
    return !!(body && Array.isArray(body.accepted)
      && body.accepted.some(a => a && a.evaluationId === evaluationId));
  }

  /**
   * Kirim semua entri pending satu per satu (append-only, idempotent by evaluationId).
   * @param {{force?:boolean, silent?:boolean}} opts
   */
  async function syncNow(opts = {}) {
    if (running) return { skipped: 'sedang berjalan' };
    if (!opts.force && !isOnline()) { emit('offline'); return { skipped: 'offline' }; }

    const queue = await DB.pending();
    if (!queue.length) { emit('idle', { pending: 0 }); return { sent: 0, failed: 0 }; }

    running = true;
    emit('syncing', { pending: queue.length });

    // Dipisah supaya backoff hanya mengikuti masalah JARINGAN. Penolakan
    // server bukan alasan memperlambat: entri yang ditolak berhenti sendiri
    // setelah DB.MAKS_TOLAKAN kali, dan yang lain di antrean tidak boleh ikut
    // tertunda karenanya.
    let sent = 0, failed = 0, ditolakJml = 0, ditahanJml = 0, gagalJaringan = 0;
    let lastError = null, alasanTerakhir = null;

    for (const item of queue) {
      const payload = {
        evaluationId: item.evaluationId,
        guideId: item.guideId,
        guideName: item.guideName,
        pos: Number(item.pos),
        timestamp: item.timestamp,
        criteria: {
          idCard: !!item.criteria.idCard,
          // Entri lama di antrean menyimpan boolean; dikirim apa adanya karena
          // server memetakannya sendiri (true=+1, false=-1). Entri baru sudah
          // berupa angka pada skala tiga tingkat.
          uniform: typeof item.criteria.uniform === 'boolean'
            ? item.criteria.uniform
            : Number(item.criteria.uniform),
          etika: Math.min(5, Math.max(-5, Number(item.criteria.etika) || 0)),
        },
        catatan: item.catatan || '',
      };
      // Hanya disertakan bila entri ini memang koreksi — kiriman biasa tidak
      // boleh membawa kolom kosong yang bisa disalahartikan backend lama.
      if (item.koreksiDari) payload.koreksiDari = String(item.koreksiDari);
      const t0 = Date.now();
      try {
        const res = await fetchWithTimeout(endpoint('evaluations'), {
          method: 'POST',
          headers: postHeaders(),
          body: JSON.stringify(payload),
        }, serverKind() === 'gas' ? 30000 : 12000);

        if (res.status >= 500 || res.status === 429) throw new Error('Server sibuk (' + res.status + ')');

        const body = await res.json().catch(() => null);
        catatWaktuServer(body, t0, Date.now());

        // Server sedang terkunci (mis. pos lain menulis bersamaan) — coba lagi nanti.
        if (body && body.busy) throw new Error('Server sedang sibuk menulis');

        const ditolak = body && Array.isArray(body.rejected)
          && body.rejected.some(r => !r.evaluationId || r.evaluationId === item.evaluationId);
        if (res.status === 400 || (ditolak && !diterima_(body, item.evaluationId))) {
          // Ditolak server (data tidak sah, atau pos itu sudah menilai guide ini
          // hari ini). Alasannya dicatat apa adanya, bukan JSON mentah: teks
          // inilah yang dibaca staff di layar Riwayat.
          //
          // Entri TIDAK dibuang dan `syncState` tetap 0, jadi ia dicoba lagi
          // pada siklus berikutnya. Itu disengaja untuk penolakan yang bisa
          // pulih sendiri: backend belum diperbarui, atau guide baru belum
          // terdaftar di tab Guides.
          //
          // Tapi percobaannya TIDAK lagi tak berhingga. Setelah
          // DB.MAKS_TOLAKAN penolakan, DB.markFailed menandai entri itu
          // `buntu`: ia keluar dari antrean otomatis (berhenti memutar
          // percobaan tiap 60 detik selamanya) dan muncul di layar Riwayat
          // dengan alasannya + tombol "Coba lagi". Datanya tetap utuh.
          //
          // `continue`, bukan `break`: satu entri bermasalah tidak boleh
          // menahan antrean di belakangnya.
          const r = (body && Array.isArray(body.rejected))
            ? (body.rejected.find(x => x && x.evaluationId === item.evaluationId) || body.rejected[0])
            : null;
          const alasan = r && Array.isArray(r.errors) && r.errors.length
            ? r.errors.join('; ')
            : ('HTTP ' + res.status);
          const tanda = await DB.markFailed(item.evaluationId, alasan, { ditolak: true });
          ditolakJml++; failed++;
          alasanTerakhir = alasan;
          if (tanda && tanda.buntu) {
            ditahanJml++;
            // Koreksi yang ditolak permanen: kembalikan penilaian lama menjadi
            // berlaku lagi. Perangkat sudah menandainya "diganti" begitu staff
            // menekan SIMPAN — kalau penggantinya tidak pernah diterima,
            // tanda itu membuat perangkat dan spreadsheet berbeda isi.
            if (item.koreksiDari) {
              try { await DB.batalkanDiganti(item.koreksiDari); }
              catch (e) { console.warn('[sync] gagal membatalkan tanda diganti', e); }
            }
          }
          continue;
        }

        if (!res.ok) throw new Error('HTTP ' + res.status);

        // Baru tandai ✅ kalau server benar-benar mengonfirmasi evaluationId ini.
        // Status 200 saja tidak cukup: Apps Script tetap membalas 200 walau
        // penulisan ke spreadsheet gagal, dan data akan hilang tanpa jejak.
        if (!diterima_(body, item.evaluationId)) {
          throw new Error('Server tidak mengonfirmasi penyimpanan');
        }

        await DB.markSynced(item.evaluationId);
        sent++;
        emit('progress', { sent, total: queue.length });
      } catch (err) {
        // Jaringan / timeout / server sibuk — BUKAN penolakan. Sengaja tidak
        // diberi tanda `ditolak`, supaya perangkat yang berminggu-minggu di
        // luar jangkauan tidak menahan penilaiannya sendiri.
        lastError = err.message || String(err);
        await DB.markFailed(item.evaluationId, lastError);
        gagalJaringan++; failed++;
        break; // jaringan bermasalah: hentikan, jadwalkan retry
      }
    }

    running = false;

    if (gagalJaringan > 0) {
      backoffStep = Math.min(backoffStep + 1, MAX_ATTEMPTS);
      scheduleRetry();
      emit('error', { sent, failed, ditolak: ditolakJml, ditahan: ditahanJml, message: lastError });
    } else if (ditolakJml > 0) {
      // Tidak ada masalah jaringan — memperlambat antrean tidak ada gunanya.
      // Pemicu berkala 60 detik sudah cukup untuk penolakan yang bisa pulih.
      backoffStep = 0;
      emit('ditolak', { sent, failed, ditolak: ditolakJml, ditahan: ditahanJml,
                        message: alasanTerakhir });
    } else {
      backoffStep = 0;
      emit('done', { sent });
    }
    return { sent, failed, ditolak: ditolakJml, ditahan: ditahanJml,
             lastError: lastError || alasanTerakhir };
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    const delay = Math.min(BASE_DELAY * Math.pow(2, backoffStep - 1), MAX_DELAY);
    console.log(`[sync] retry dalam ${Math.round(delay / 1000)} detik`);
    retryTimer = setTimeout(() => { if (isOnline()) syncNow(); }, delay);
  }

  /* ------------------ Pemicu otomatis ------------------ */
  function start() {
    global.addEventListener('online', () => { backoffStep = 0; emit('online'); setTimeout(() => syncNow(), 800); });
    global.addEventListener('offline', () => emit('offline'));
    document.addEventListener('visibilitychange', () => { if (!document.hidden && isOnline()) syncNow(); });
    setInterval(() => { if (isOnline()) syncNow(); }, AUTO_INTERVAL);
    if (isOnline()) setTimeout(() => syncNow(), 1500);
  }

  global.Sync = {
    Settings, baseUrl, serverKind, endpoint, needsServerUrl,
    isOnline, syncNow, refreshGuides, ping, start,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get isRunning() { return running; },
  };
})(window);
