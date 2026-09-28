'use strict';
/**
 * Lapisan penyimpanan server.
 * Memakai SQLite bawaan Node (node:sqlite, Node >= 22.5).
 * Bila tidak tersedia, otomatis fallback ke penyimpanan file JSON.
 * Tidak ada dependensi npm sama sekali.
 */
const fs = require('fs');
const path = require('path');

// DATA_DIR bisa ditimpa lewat environment: rangkaian uji memakai folder
// sementara sendiri, supaya data uji tidak menumpuk di folder kerja dan tidak
// bertabrakan dengan aturan "satu pos sekali sehari" pada run berikutnya.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Implementasi SQLite                                                  */
/* ------------------------------------------------------------------ */
function createSqliteStore() {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(DATA_DIR, 'besakih.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      evaluationId TEXT PRIMARY KEY,
      guideId      TEXT NOT NULL,
      guideName    TEXT NOT NULL,
      pos          INTEGER NOT NULL,
      timestamp    TEXT NOT NULL,
      idCard       INTEGER NOT NULL,
      uniform      INTEGER NOT NULL,
      review       INTEGER NOT NULL DEFAULT 0,
      etika        INTEGER NOT NULL DEFAULT 0,
      catatan      TEXT,
      receivedAt   TEXT NOT NULL,
      koreksiDari  TEXT,
      status       TEXT NOT NULL DEFAULT 'aktif'
    );
    CREATE INDEX IF NOT EXISTS idx_eval_ts ON evaluations(timestamp);
  `);

  // Basis data yang dibuat sebelum fitur koreksi ada belum punya dua kolom
  // terakhir. ALTER-nya dijalankan sekali dan aman diulang.
  for (const kolom of ["koreksiDari TEXT", "status TEXT NOT NULL DEFAULT 'aktif'"]) {
    try { db.exec(`ALTER TABLE evaluations ADD COLUMN ${kolom}`); } catch { /* sudah ada */ }
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO evaluations
      (evaluationId, guideId, guideName, pos, timestamp, idCard, uniform, review, etika,
       catatan, receivedAt, koreksiDari, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')
  `);
  const tandai = db.prepare("UPDATE evaluations SET status = 'diganti' WHERE evaluationId = ?");

  // Beberapa sistem berkas (mis. folder jaringan) mengizinkan pembuatan tabel
  // tapi menolak penulisan. Kalau itu terjadi, seluruh penilaian akan ditolak
  // tanpa pesan yang jelas — jadi kemampuan menulis diuji lebih dulu di sini.
  const uji = '__uji_tulis__';
  insert.run(uji, '-', '-', 1, '-', 0, 0, 0, 0, '', new Date().toISOString(), null);
  db.prepare('DELETE FROM evaluations WHERE evaluationId = ?').run(uji);

  return {
    kind: 'sqlite',
    saveEvaluation(e) {
      const info = insert.run(
        e.evaluationId, e.guideId, e.guideName, e.pos, e.timestamp,
        e.criteria.idCard ? 1 : 0, store.normalUniform(e.criteria.uniform),
        Number(e.criteria.review) || 0, Number(e.criteria.etika) || 0,
        e.catatan || '', new Date().toISOString(), e.koreksiDari || null
      );
      return { duplicate: info.changes === 0 };
    },
    /** Tandai satu penilaian sudah digantikan koreksi. Barisnya tetap ada. */
    tandaiDiganti(evaluationId) { tandai.run(evaluationId); },
    listEvaluations(limit = 500) {
      return db.prepare(
        'SELECT * FROM evaluations ORDER BY timestamp DESC LIMIT ?'
      ).all(limit).map(rowToEval);
    },
    count() {
      return db.prepare('SELECT COUNT(*) AS n FROM evaluations').get().n;
    },
  };
}

function rowToEval(r) {
  return {
    evaluationId: r.evaluationId,
    guideId: r.guideId,
    guideName: r.guideName,
    pos: r.pos,
    timestamp: r.timestamp,
    criteria: { idCard: !!r.idCard, uniform: Number(r.uniform),
                review: Number(r.review) || 0, etika: Number(r.etika) || 0 },
    catatan: r.catatan || '',
    receivedAt: r.receivedAt,
    koreksiDari: r.koreksiDari || null,
    status: r.status || 'aktif',
  };
}

/* ------------------------------------------------------------------ */
/* Implementasi file JSON (fallback)                                    */
/* ------------------------------------------------------------------ */
function createJsonStore() {
  const FILE = path.join(DATA_DIR, 'evaluations.json');
  let rows = [];
  try {
    if (fs.existsSync(FILE)) rows = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch { rows = []; }

  const flush = () => fs.writeFileSync(FILE, JSON.stringify(rows, null, 2));

  return {
    kind: 'json',
    saveEvaluation(e) {
      if (rows.some(r => r.evaluationId === e.evaluationId)) return { duplicate: true };
      rows.push({ ...e, receivedAt: new Date().toISOString(),
                  koreksiDari: e.koreksiDari || null, status: 'aktif' });
      flush();
      return { duplicate: false };
    },
    tandaiDiganti(evaluationId) {
      const r = rows.find(x => x.evaluationId === evaluationId);
      if (r) { r.status = 'diganti'; flush(); }
    },
    listEvaluations(limit = 500) {
      return [...rows].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
    },
    count() { return rows.length; },
  };
}

let store;
try {
  store = createSqliteStore();
  console.log('[storage] menggunakan SQLite (node:sqlite)');
} catch (err) {
  store = createJsonStore();
  console.log('[storage] SQLite tidak dapat dipakai -> fallback file JSON (' + err.message + ')');
}

/**
 * Samakan nilai Uniform ke skala tiga tingkat (-1, +1, +2).
 * Aturannya harus sama persis dengan server-gas/03_Ingest.gs: data lama
 * menyimpan Ya/Tidak sebagai 1/0, dan 0 tidak pernah dipakai skala baru,
 * jadi 0 berarti "tidak sesuai" = -1.
 */
store.normalUniform = function normalUniform(v) {
  if (v === true) return 1;
  if (v === false) return -1;
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return -1;
  return Math.max(-1, Math.min(2, Math.round(n)));
};

store.UNIFORM_NILAI = [-1, 1, 2];

module.exports = store;
