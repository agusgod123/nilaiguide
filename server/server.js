'use strict';
/**
 * Server Aplikasi Penilaian Guide Kawasan Besakih
 * Zero-dependency: hanya modul bawaan Node.js.
 *
 * Jalankan:  node server/server.js
 * Buka:      http://localhost:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const store = require('./storage');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Satu berkas untuk satu daftar. Dulu ada salinan kembar di server/guides.json
// yang harus disunting bersamaan dengan yang di public/ — dan salinan kembar
// yang harus disamakan manual pada akhirnya selalu berbeda.
const GUIDES_FILE = path.join(PUBLIC_DIR, 'guides.json');

/**
 * Endpoint PEMBACAAN penilaian dimatikan kecuali ADMIN_TOKEN diisi.
 *
 * PRD §5 dan keputusan di KONTEKS-PROYEK §8 sudah menetapkan tidak ada
 * endpoint pembacaan penilaian: backend produksi (Apps Script) sengaja tidak
 * punya. Berkas ini menyimpang — GET /api/evaluations dan .csv membuka seluruh
 * data tanpa kunci apa pun, dengan CORS bintang pula. Selama produksi memakai
 * Apps Script itu tidak berbahaya, tapi begitu server ini dinyalakan untuk
 * sesuatu, seluruh penilaian ikut terbuka.
 *
 *   ADMIN_TOKEN=rahasia node server/server.js
 *   curl -H "Authorization: Bearer rahasia" http://localhost:3000/api/evaluations
 */
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || '').trim();

// Zona waktu Bali — disamakan dengan ZONA_WAKTU di server-gas/Code.gs supaya
// batas hari "satu pos sekali sehari" jatuh di jam yang sama di kedua backend.
const ZONA_WAKTU = 'Asia/Makassar';
const fmtTanggal = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_WAKTU, year: 'numeric', month: '2-digit', day: '2-digit',
});
const tanggalWita = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : fmtTanggal.format(d);
};
const kunciPos = (guideId, pos, tgl) => `${String(guideId).trim()}|${Number(pos) || 0}|${tgl}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/* ---------------------------- util ---------------------------- */
/**
 * @param {{cors?: boolean}=} opsi cors:false untuk balasan yang TIDAK boleh
 *   dibaca halaman dari origin lain — yaitu endpoint pembacaan penilaian.
 *   Header bintang di sana berarti situs mana pun bisa mengambil isinya lewat
 *   browser siapa pun yang kebetulan membuka server ini.
 */
function send(res, status, body, headers = {}, opsi = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  const cors = opsi.cors !== false ? {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  } : {};
  res.writeHead(status, {
    ...cors,
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(payload);
}

/** Balasan seragam untuk endpoint pembacaan yang tidak berhak diakses. */
function tolakBaca(res, alasan) {
  return send(res, 403, { error: alasan }, {}, { cors: false });
}

/**
 * Apakah permintaan ini boleh membaca daftar penilaian?
 * @return {string} '' bila boleh, atau alasan penolakannya.
 */
function bolehBaca(req, url) {
  if (!ADMIN_TOKEN) {
    return 'endpoint pembacaan dimatikan — jalankan server dengan ADMIN_TOKEN=... untuk menyalakannya';
  }
  const header = String(req.headers.authorization || '');
  const dariHeader = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const token = dariHeader || String(url.searchParams.get('token') || '').trim();
  if (!token) return 'perlu header Authorization: Bearer <ADMIN_TOKEN>';
  // Panjang berbeda = pasti berbeda; timingSafeEqual menuntut panjang sama.
  const a = Buffer.from(token), b = Buffer.from(ADMIN_TOKEN);
  const cocok = a.length === b.length && require('crypto').timingSafeEqual(a, b);
  return cocok ? '' : 'token tidak cocok';
}

/** Daftar guide dari public/guides.json, dibaca ulang bila berkasnya berubah. */
let guidesCache = { mtime: 0, peta: null, list: [] };
function bacaGuides() {
  try {
    const mtime = fs.statSync(GUIDES_FILE).mtimeMs;
    if (guidesCache.peta && guidesCache.mtime === mtime) return guidesCache;
    const list = JSON.parse(fs.readFileSync(GUIDES_FILE, 'utf8'));
    const peta = Object.create(null);
    for (const g of list) if (g && g.guideId) peta[String(g.guideId).trim()] = String(g.guideName || '');
    guidesCache = { mtime, peta, list };
  } catch (e) {
    console.warn('[guides] gagal dibaca:', e.message);
    if (!guidesCache.peta) guidesCache = { mtime: 0, peta: null, list: [] };
  }
  return guidesCache;
}

function readBody(req, limitBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limitBytes) { reject(new Error('payload terlalu besar')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(new Error('JSON tidak valid')); }
    });
    req.on('error', reject);
  });
}

/** Validasi satu entri penilaian sesuai model data PRD §7 */
function validateEvaluation(e) {
  const errors = [];
  if (!e || typeof e !== 'object') return ['body bukan objek'];
  if (!e.evaluationId || typeof e.evaluationId !== 'string') errors.push('evaluationId wajib (string/uuid)');
  if (!e.guideId || typeof e.guideId !== 'string') errors.push('guideId wajib');
  if (!e.guideName || typeof e.guideName !== 'string') errors.push('guideName wajib');
  if (![1, 2, 3].includes(Number(e.pos))) errors.push('pos harus 1, 2, atau 3');
  if (!e.timestamp || isNaN(Date.parse(e.timestamp))) errors.push('timestamp harus ISO8601');
  const c = e.criteria;
  if (!c || typeof c !== 'object') errors.push('criteria wajib');
  else {
    if (typeof c.idCard !== 'boolean') errors.push('criteria.idCard harus boolean');
    // UNIFORM kini tiga tingkat (-1 / +1 / +2). Boolean tetap diterima supaya
    // perangkat yang belum diperbarui tidak ditolak permanen: true = +1, false = -1.
    if (typeof c.uniform !== 'boolean' &&
        !(typeof c.uniform === 'number' && store.UNIFORM_NILAI.includes(c.uniform))) {
      errors.push('criteria.uniform harus boolean (aplikasi lama) atau salah satu dari ' +
                  store.UNIFORM_NILAI.join(', '));
    }
    // Etika berupa angka -5..+5 (0 = biasa saja), bukan ya/tidak.
    // Boleh tidak dikirim (dianggap 0) supaya perangkat berversi lama tidak
    // ditolak permanen dan datanya hilang.
    if (c.etika !== undefined && c.etika !== null) {
      const et = Number(c.etika);
      if (!Number.isFinite(et) || et < -5 || et > 5) {
        errors.push('criteria.etika harus angka antara -5 dan 5');
      }
    }
    // Review sudah tidak diisi lewat aplikasi — kolomnya tetap ada di
    // spreadsheet dan diisi manual oleh tim. Kiriman lama yang masih
    // menyertakannya tetap diterima selama berupa angka.
    if (c.review !== undefined && c.review !== null &&
        !Number.isFinite(Number(c.review))) {
      errors.push('criteria.review harus angka');
    }
  }
  return errors;
}

function toCsv(rows) {
  const head = ['evaluationId', 'timestamp', 'pos', 'guideId', 'guideName', 'uniform', 'idCard', 'review', 'etika', 'catatan'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.join(',')];
  for (const r of rows) {
    lines.push([
      r.evaluationId, r.timestamp, r.pos, r.guideId, r.guideName,
      store.normalUniform(r.criteria.uniform),
      r.criteria.idCard ? 1 : 0,
      Number(r.criteria.review) || 0,
      Number(r.criteria.etika) || 0,
      r.catatan || '',
    ].map(esc).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

/* ------------------------- static files ------------------------- */
function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'terlarang' });

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) => {
        if (e2) return send(res, 404, { error: 'tidak ditemukan' });
        send(res, 200, html, { 'Content-Type': MIME['.html'] });
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    // service worker & html jangan di-cache browser agar update cepat terdeteksi
    if (rel === '/sw.js' || ext === '.html') headers['Cache-Control'] = 'no-cache';
    send(res, 200, data, headers);
  });
}

/* ----------------------------- router ----------------------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  if (req.method === 'OPTIONS') return send(res, 204, '');

  // Health check — dipakai aplikasi untuk memastikan server benar-benar reachable
  if (p === '/api/health' && req.method === 'GET') {
    return send(res, 200, { ok: true, storage: store.kind, total: store.count(), serverTime: new Date().toISOString() });
  }

  // Daftar guide aktif
  if (p === '/api/guides' && req.method === 'GET') {
    const { list } = bacaGuides();
    if (!list.length) return send(res, 500, { error: 'gagal membaca daftar guide' });
    return send(res, 200, { guides: list.filter(g => g.aktif !== false) });
  }

  // Terima penilaian — menerima 1 objek ATAU { evaluations: [...] } untuk batch
  if (p === '/api/evaluations' && req.method === 'POST') {
    let body;
    try { body = await readBody(req); }
    catch (e) { return send(res, 400, { error: e.message }); }

    const items = Array.isArray(body?.evaluations) ? body.evaluations : [body];
    if (items.length === 0) return send(res, 400, { error: 'tidak ada entri' });

    // Aturan yang sama dengan server-gas/Code.gs. Sebelumnya berkas ini tidak
    // menegakkan keduanya, jadi backend cadangan diam-diam menerima data yang
    // ditolak backend produksi — dan bedanya baru ketahuan lewat rekap.
    const { peta: namaResmi } = bacaGuides();
    const semua = store.listEvaluations(100000);
    // aktifPos: kunci -> evaluationId baris yang masih berlaku
    // barisId  : evaluationId -> { status, kunci }  (untuk memvalidasi koreksi)
    const aktifPos = new Map();
    const barisId = new Map();
    for (const r of semua) {
      const kunci = kunciPos(r.guideId, r.pos, tanggalWita(r.timestamp));
      const status = String(r.status || 'aktif').toLowerCase();
      barisId.set(r.evaluationId, { status, kunci });
      if (status !== 'diganti') aktifPos.set(kunci, r.evaluationId);
    }
    const idAda = new Set(semua.map(r => r.evaluationId));
    const perluDitandai = [];

    const accepted = [], rejected = [];
    for (const item of items) {
      const errs = validateEvaluation(item);
      if (errs.length) { rejected.push({ evaluationId: item?.evaluationId ?? null, errors: errs }); continue; }
      item.pos = Number(item.pos);
      const gid = String(item.guideId).trim();

      // guideId yang tidak terdaftar tidak akan pernah muncul di rekap mana
      // pun, jadi lebih baik ditolak sejak awal daripada mengendap tak terlihat.
      if (namaResmi && !namaResmi[gid]) {
        rejected.push({ evaluationId: item.evaluationId,
                        errors: [`guideId "${gid}" tidak ada di daftar guide`] });
        continue;
      }

      // Kiriman ulang dengan evaluationId yang SAMA tetap "accepted duplicate":
      // kalau ditolak, antrean di aplikasi macet selamanya.
      if (idAda.has(item.evaluationId)) {
        accepted.push({ evaluationId: item.evaluationId, synced: true, duplicate: true });
        continue;
      }

      const tgl = tanggalWita(item.timestamp);
      const kunci = kunciPos(gid, item.pos, tgl);
      const koreksiDari = String(item.koreksiDari || '').trim();

      if (koreksiDari) {
        // KOREKSI SALAH PENCET — aturan sama persis dengan Code.gs.
        // Tetap append-only: baris lama ditandai 'diganti', tidak dihapus.
        if (koreksiDari === item.evaluationId) {
          rejected.push({ evaluationId: item.evaluationId,
                          errors: ['koreksiDari tidak boleh dirinya sendiri'] });
          continue;
        }
        const asal = barisId.get(koreksiDari);
        if (!asal) {
          rejected.push({ evaluationId: item.evaluationId,
                          errors: [`penilaian yang diperbaiki (${koreksiDari}) tidak ada di server`] });
          continue;
        }
        if (asal.status === 'diganti') {
          rejected.push({ evaluationId: item.evaluationId,
                          errors: ['penilaian itu sudah pernah diperbaiki oleh penilaian lain'] });
          continue;
        }
        if (asal.kunci !== kunci) {
          rejected.push({ evaluationId: item.evaluationId,
                          errors: ['koreksi harus untuk guide, pos, dan tanggal yang sama'] });
          continue;
        }
        perluDitandai.push(koreksiDari);
        asal.status = 'diganti';
      } else {
        // SATU POS HANYA MENILAI SATU KALI PER HARI. Pos lain tetap boleh.
        if (aktifPos.has(kunci)) {
          rejected.push({
            evaluationId: item.evaluationId,
            errors: [`${namaResmi?.[gid] || gid} sudah dinilai di Pos ${item.pos} pada ${tgl}` +
                     ' — satu pos hanya menilai satu kali per hari.' +
                     ` Untuk membetulkan nilainya, kirim koreksi (koreksiDari: ${aktifPos.get(kunci)})`],
            sudahDinilai: true,
            aktifSaatIni: aktifPos.get(kunci),
          });
          continue;
        }
      }
      aktifPos.set(kunci, item.evaluationId);
      barisId.set(item.evaluationId, { status: 'aktif', kunci });

      // Nama guide diambil dari daftar resmi: perangkat bisa memakai salinan lama.
      if (namaResmi?.[gid]) item.guideName = namaResmi[gid];

      // Tandai yang digantikan LEBIH DULU: kalau baris barunya masuk lalu
      // penandaan gagal, akan ada dua baris aktif untuk pos & hari yang sama.
      for (const id of perluDitandai.splice(0)) store.tandaiDiganti(id);
      const { duplicate } = store.saveEvaluation(item);
      idAda.add(item.evaluationId);
      accepted.push({ evaluationId: item.evaluationId, synced: true, duplicate });
    }

    const status = accepted.length === 0 ? 400 : 200;
    console.log(`[POST /api/evaluations] diterima=${accepted.length} ditolak=${rejected.length}`);
    return send(res, status,
      { accepted, rejected, total: store.count(), serverTime: new Date().toISOString() });
  }

  // Rekap di server — HANYA untuk admin yang memegang ADMIN_TOKEN.
  if (p === '/api/evaluations' && req.method === 'GET') {
    const alasan = bolehBaca(req, url);
    if (alasan) return tolakBaca(res, alasan);
    return send(res, 200,
      { evaluations: store.listEvaluations(Number(url.searchParams.get('limit')) || 500) },
      {}, { cors: false });
  }

  if (p === '/api/evaluations.csv' && req.method === 'GET') {
    const alasan = bolehBaca(req, url);
    if (alasan) return tolakBaca(res, alasan);
    return send(res, 200, toCsv(store.listEvaluations(5000)), {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="penilaian-guide-besakih.csv"',
    }, { cors: false });
  }

  if (p.startsWith('/api/')) return send(res, 404, { error: 'endpoint tidak dikenal' });

  serveStatic(req, res, p);
});

server.listen(PORT, () => {
  console.log('======================================================');
  console.log(' Penilaian Guide Kawasan Besakih — server berjalan');
  console.log(` Lokal   : http://localhost:${PORT}`);
  for (const [name, addrs] of Object.entries(require('os').networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) console.log(` Jaringan: http://${a.address}:${PORT}  (${name})`);
    }
  }
  console.log('======================================================');
});
