/**
 * Uji logika backend Apps Script di luar Google, dengan tiruan (stub) API-nya.
 * Tujuannya menangkap kesalahan sebelum kode dikirim ke spreadsheet sungguhan.
 *
 *   node server-gas/test-gas.mjs
 *
 * Sumbernya 11 berkas bernomor di server-gas/, BUKAN Code.gs hasil gabungan —
 * berkas turunan itu sengaja tidak diuji supaya kesalahan tertangkap di sumber.
 * Tiap berkas dievaluasi TERPISAH ke dalam satu konteks yang sama, meniru cara
 * Apps Script memuat proyek multi-berkas. Kalau ada kode top-level yang
 * bergantung pada berkas bernomor lebih besar, tes ini yang lebih dulu gagal.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';

// fileURLToPath, bukan .pathname — di Windows .pathname menghasilkan "/D:/..."
// yang membuat path.resolve menempelkannya jadi "D:\D:\..." dan tes gagal jalan.
const APP = process.env.APP_DIR || path.resolve(url.fileURLToPath(new URL('..', import.meta.url)));
const DIR_GS = path.join(APP, 'server-gas');
const BERKAS_GS = fs.readdirSync(DIR_GS).filter(f => /^\d\d_.*\.gs$/.test(f)).sort();
const SUMBER_GS = BERKAS_GS.map(f => ({ nama: f, teks: fs.readFileSync(path.join(DIR_GS, f), 'utf8') }));

const hasil = [];
const cek = (id, ok, catatan = '') => {
  hasil.push({ id, ok });
  console.log(`${ok ? '✅' : '❌'} ${id}${catatan ? ' — ' + catatan : ''}`);
};

/* ---------------- Tiruan Spreadsheet ---------------- */
class FakeSheet {
  constructor(nama) {
    this.nama = nama; this.data = []; this.frozen = 0; this.widths = {};
    this.merges = []; this.frozenCols = 0;
    this.formats = {};        // 'r,c' -> format angka
    this.charts = [];
  }
  getLastRow() { return this.data.length; }
  getLastColumn() {
    return this.data.reduce((n, b) => Math.max(n, (b || []).length), 0);
  }
  clearContents() { this.data = []; return this; }
  getMaxRows() { return Math.max(this.data.length, 1000); }
  getMaxColumns() { return 26; }
  getDataRange() { return this.getRange(1, 1, Math.max(this.data.length, 1), 20); }
  getRange(row, col, numRows = 1, numCols = 1) {
    const sh = this;
    return {
      setValues(values) {
        values.forEach((baris, i) => {
          const r = row - 1 + i;
          if (!sh.data[r]) sh.data[r] = [];
          baris.forEach((v, j) => { sh.data[r][col - 1 + j] = v; });
        });
        return this;
      },
      getValues() {
        const out = [];
        for (let i = 0; i < numRows; i++) {
          const baris = sh.data[row - 1 + i] || [];
          out.push(Array.from({ length: numCols }, (_, j) => baris[col - 1 + j] ?? ''));
        }
        return out;
      },
      setValue(v) { return this.setValues([[v]]); },
      // Pemformatan murni tampilan: cukup dikenali supaya 11_Laporan.gs bisa
      // dijalankan utuh di sini. Yang diuji isinya, bukan rupanya.
      setBorder() { return this; },
      setFontFamily() { return this; },
      setFontStyle() { return this; },
      setVerticalAlignment() { return this; },
      setWrap() { return this; },
      breakApart() { return this; },
      // Sheets memperlakukan SETIAP sel di setFormulas sebagai rumus: teks biasa
      // diberi "=" di depannya lalu gagal dihitung. Ditiru di sini supaya
      // penyalahgunaan setFormulas tertangkap tes, bukan baru ketahuan di
      // spreadsheet sungguhan.
      setFormulas(values) {
        return this.setValues(values.map(baris => baris.map(v =>
          (v === '' || String(v).charAt(0) === '=') ? v : '#ERROR!')));
      },
      merge() { sh.merges.push({ row, col, numRows, numCols }); return this; },
      breakApart() {
        sh.merges = sh.merges.filter(m =>
          m.row + m.numRows - 1 < row || m.row > row + numRows - 1 ||
          m.col + m.numCols - 1 < col || m.col > col + numCols - 1);
        return this;
      },
      setFontWeight() { return this; }, setFontColor() { return this; },
      setBackground() { return this; }, setHorizontalAlignment() { return this; },
      setFontSize() { return this; }, setNote() { return this; },
      setNumberFormat(fmt) {
        for (let i = 0; i < numRows; i++) {
          for (let j = 0; j < numCols; j++) sh.formats[`${row + i},${col + j}`] = fmt;
        }
        return this;
      },
      // Dipakai pembanding di pembuat chart — cukup deskripsi rentangnya
      __rentang: { row, col, numRows, numCols, sheet: sh.nama },
    };
  }
  setFrozenRows(n) { this.frozen = n; }
  setFrozenColumns(n) { this.frozenCols = n; }
  setColumnWidth(i, w) { this.widths[i] = w; }
  deleteRow(r) { this.data.splice(r - 1, 1); }
  // Dipakai 11_Laporan.gs untuk memangkas kolom sisa agar muat satu halaman A4.
  deleteColumns(kol, jml) {
    this.data.forEach(b => { if (b) b.splice(kol - 1, jml); });
  }
  deleteRows(r, jml) { this.data.splice(r - 1, jml); }
  getMaxColumns() {
    return this.data.reduce((m, b) => Math.max(m, (b || []).length), 0) || 26;
  }
  getMaxRows() { return Math.max(this.data.length, 1); }
  setRowHeight(i, h) { this.heights = this.heights || {}; this.heights[i] = h; return this; }
  setRowHeights(r, jml, h) { return this; }
  setHiddenGridlines() { return this; }
  insertRowsAfter(r, jml) {
    for (let i = 0; i < jml; i++) this.data.splice(r, 0, []);
    return this;
  }
  getSheetId() { return this.nama.length; }
  getName() { return this.nama; }
  getParent() { return doc; }
  clear() { this.data = []; this.merges = []; return this; }
  clearFormats() { this.formats = {}; return this; }
  getNumberFormat(row, col) { return this.formats[`${row},${col}`] || ''; }

  /* --- Chart. clear() SENGAJA tidak membuangnya, meniru Sheets: kalau kode
         tidak membuangnya sendiri, grafik akan menumpuk tiap penyusunan ulang. --- */
  newChart() {
    const spec = { tipe: null, rentang: [], opsi: {}, posisi: null, numHeaders: null };
    const b = {
      setChartType(t) { spec.tipe = t; return b; },
      // 11_Laporan.gs memakai asLineChart(); dulu tidak pernah terpanggil di
      // sini karena bagian harian laporan selalu kosong di tiruan ini.
      asLineChart() { spec.tipe = 'LINE'; return b; },
      addRange(r) { spec.rentang.push(r.__rentang); return b; },
      setNumHeaders(n) { spec.numHeaders = n; return b; },
      setPosition(r, c, ox, oy) { spec.posisi = { row: r, col: c }; return b; },
      setOption(k, v) { spec.opsi[k] = v; return b; },
      build() { return spec; },
    };
    return b;
  }
  insertChart(c) { this.charts.push(c); return this; }
  getCharts() { return this.charts.slice(); }
  removeChart(c) { this.charts = this.charts.filter(x => x !== c); return this; }
}

class FakeSpreadsheet {
  constructor() { this.sheets = [new FakeSheet('Sheet1')]; this.tz = 'Asia/Makassar'; }
  getSpreadsheetTimeZone() { return this.tz; }
  setSpreadsheetTimeZone(tz) { this.tz = tz; }
  getSheetByName(n) { return this.sheets.find(s => s.nama === n) || null; }
  insertSheet(n) { const s = new FakeSheet(n); this.sheets.push(s); return s; }
  getSheets() { return this.sheets; }
  deleteSheet(s) { this.sheets = this.sheets.filter(x => x !== s); }
}

const doc = new FakeSpreadsheet();
let lockDipegang = false;
let gagalKunci = false;
const props = new Map();
let triggers = [];

const sandbox = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => doc,
    flush() {},
    getSpreadsheetTimeZone: () => doc.getSpreadsheetTimeZone(),
    getUi: () => { throw new Error('tidak ada UI di lingkungan uji'); },
    // Enum yang dipakai 11_Laporan.gs untuk garis tabel laporan cetak.
    BorderStyle: { SOLID: 'SOLID', SOLID_THICK: 'SOLID_THICK', DASHED: 'DASHED' },
    WrapStrategy: { WRAP: 'WRAP', OVERFLOW: 'OVERFLOW', CLIP: 'CLIP' },
    Dimension: { ROWS: 'ROWS', COLUMNS: 'COLUMNS' },
  },
  Utilities: {
    // Menghormati zona waktu betulan, seperti Apps Script. Versi lama tes ini
    // memakai UTC apa pun zonanya, sehingga salah-hitung tanggal karena beda
    // zona (mis. penilaian pagi di WITA) tidak akan pernah tertangkap di sini.
    formatDate(d, tz, pola) {
      const bagian = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(d).reduce((o, p) => (o[p.type] = p.value, o), {});
      if (pola === 'yyyy-MM') return `${bagian.year}-${bagian.month}`;
      if (pola === 'yyyy-MM-dd') return `${bagian.year}-${bagian.month}-${bagian.day}`;
      if (pola === 'yyyy-MM-dd-HH-mm') {
        return `${bagian.year}-${bagian.month}-${bagian.day}-${bagian.hour}-${bagian.minute}`;
      }
      // Pola 'MMM' di Apps Script mengikuti LOCALE PROYEK (berbahasa Inggris),
      // bukan zona waktu — ditiru di sini supaya kode yang menumpang locale
      // untuk nama bulan tetap ketahuan salah.
      const bulanInggris = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${Number(bagian.day)} ${bulanInggris[Number(bagian.month) - 1]} ${bagian.year} ${bagian.hour}:${bagian.minute}`;
    },
  },
  ScriptApp: {
    getProjectTriggers: () => triggers,
    newTrigger: (fn) => {
      const buat = () => { triggers.push({ getHandlerFunction: () => fn }); };
      const tb = { atHour: () => tb, everyDays: () => tb, everyMinutes: () => tb, create: buat };
      return { timeBased: () => tb };
    },
    deleteTrigger(t) { triggers = triggers.filter(x => x !== t); },
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: k => (props.has(k) ? props.get(k) : null),
      setProperty(k, v) { props.set(k, String(v)); return this; },
      deleteProperty(k) { props.delete(k); return this; },
    }),
  },
  CacheService: {
    getScriptCache: () => { throw new Error('cache tidak tersedia di lingkungan uji'); },
  },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: (t) => ({ getContent: () => t, setMimeType() { return this; } }),
  },
  LockService: {
    getScriptLock: () => ({
      waitLock() { if (gagalKunci) throw new Error('sibuk'); lockDipegang = true; },
      releaseLock() { lockDipegang = false; },
    }),
  },
  Charts: { ChartType: { LINE: 'LINE', COLUMN: 'COLUMN', BAR: 'BAR' } },
  Logger: { log() {} },
  console,
};
// createTextOutput.setMimeType harus mengembalikan objek yang sama
sandbox.ContentService.createTextOutput = (t) => {
  const o = { getContent: () => t };
  o.setMimeType = () => o;
  return o;
};

/* ---------------- Penilai rumus sederhana (untuk menguji dasbor) ----------------
   Rumus di tab Dasbor hanya "terlihat benar" kalau isinya diperiksa sebagai
   teks. Penilai kecil ini benar-benar MENGHITUNGNYA dari isi tab regu, jadi
   rumus yang menunjuk kolom salah atau rentang baris salah ikut tertangkap —
   bukan hanya rumus yang salah tulis. */
function selRentang(doc, shDefault, ref) {
  let target = shDefault, sisa = ref;
  const m = ref.match(/^'([^']+)'!(.+)$/);
  if (m) { target = doc.getSheetByName(m[1]); sisa = m[2]; }
  if (!target) throw new Error('tab tidak ada: ' + ref);
  const pos = (t) => {
    const mm = t.match(/^([A-Z]+)(\d+)$/);
    if (!mm) throw new Error('rujukan sel tidak sah: ' + t);
    let c = 0;
    for (const ch of mm[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
    return { r: Number(mm[2]), c };
  };
  const bagian = sisa.split(':');
  const p1 = pos(bagian[0]), p2 = bagian[1] ? pos(bagian[1]) : p1;
  const out = [];
  for (let r = p1.r; r <= p2.r; r++) {
    for (let c = p1.c; c <= p2.c; c++) out.push({ sh: target, r, c });
  }
  return out;
}

function hitungRumus(doc, sh, teks, kedalaman = 0) {
  if (typeof teks !== 'string' || teks.charAt(0) !== '=') return teks;
  if (kedalaman > 8) throw new Error('rumus berputar');
  let e = teks.slice(1);

  // IF(<kondisi>=0,"",<nilai>)  — satu-satunya bentuk IF yang dipakai dasbor
  const mIf = e.match(/^IF\((.+?)=0,"",(.+)\)$/);
  if (mIf) {
    return hitungEkspresi(doc, sh, mIf[1], kedalaman) === 0
      ? ''
      : hitungEkspresi(doc, sh, mIf[2], kedalaman);
  }
  return hitungEkspresi(doc, sh, e, kedalaman);
}

function hitungEkspresi(doc, sh, e, kedalaman) {
  // SUM(...) / COUNT(...) diganti angkanya lebih dulu
  e = e.replace(/(SUM|COUNT)\((?:'[^']+'!)?[A-Z]+\d+(?::[A-Z]+\d+)?\)/g, (cocok) => {
    const fungsi = cocok.slice(0, cocok.indexOf('('));
    const ref = cocok.slice(cocok.indexOf('(') + 1, -1);
    const sel = selRentang(doc, sh, ref);
    let jml = 0, n = 0;
    for (const s of sel) {
      const v = hitungRumus(doc, s.sh, (s.sh.data[s.r - 1] || [])[s.c - 1], kedalaman + 1);
      if (typeof v === 'number' && isFinite(v)) { jml += v; n++; }
    }
    return String(fungsi === 'COUNT' ? n : jml);
  });

  // Rujukan sel tunggal yang tersisa (mis. C5, D9) diganti nilainya
  e = e.replace(/(?:'[^']+'!)?\b([A-Z]{1,2}\d+)\b/g, (cocok) => {
    const sel = selRentang(doc, sh, cocok)[0];
    const v = hitungRumus(doc, sel.sh, (sel.sh.data[sel.r - 1] || [])[sel.c - 1], kedalaman + 1);
    return typeof v === 'number' && isFinite(v) ? String(v) : '0';
  });

  if (!/^[-+*/().\d\s]+$/.test(e)) throw new Error('ekspresi tidak dikenali: ' + e);
  // eslint-disable-next-line no-new-func
  return Number(new Function('return (' + e + ')')());
}

vm.createContext(sandbox);
for (const { nama, teks } of SUMBER_GS) {
  try { vm.runInContext(teks, sandbox, { filename: nama }); }
  catch (e) { console.error(`❌ ${nama} gagal dievaluasi: ${e.message}`); process.exit(1); }
}
const { setup, doGet, doPost, ujiCepat } = sandbox;
const J = (res) => JSON.parse(res.getContent());

/* ---------------- Uji struktur multi-berkas ---------------- */
// Risiko baru setelah Code.gs dipecah: seluruh berkas .gs berbagi SATU lingkup
// global, jadi nama fungsi kembar antar berkas saling menimpa TANPA peringatan.
// Dalam satu berkas hal itu terlihat mata; dalam 11 berkas tidak.
{
  const pemilik = new Map(), kembar = [];
  for (const { nama, teks } of SUMBER_GS) {
    for (const m of teks.matchAll(/^(?:function|var)\s+([A-Za-z0-9_$]+)/gm)) {
      if (pemilik.has(m[1])) kembar.push(`${m[1]} (${pemilik.get(m[1])} & ${nama})`);
      else pemilik.set(m[1], nama);
    }
  }
  cek('Tidak ada nama top-level kembar antar berkas .gs',
    kembar.length === 0, kembar.length ? kembar.join(', ') : `${pemilik.size} nama unik di ${SUMBER_GS.length} berkas`);
}
{
  // Aturan yang membuat urutan berkas tidak pernah kritis: di luar deklarasi
  // fungsi dan literal `var`, tidak boleh ada kode top-level yang DIJALANKAN
  // saat berkas dimuat. Kalau ada, urutan evaluasi jadi menentukan.
  const langgar = [];
  for (const { nama, teks } of SUMBER_GS) {
    teks.split('\n').forEach((b, i) => {
      if (/^[A-Za-z_$][A-Za-z0-9_$.]*\s*\(/.test(b) || /^(if|for|while|switch|try)\b/.test(b)) {
        langgar.push(`${nama}:${i + 1}`);
      }
    });
  }
  cek('Tidak ada kode top-level yang dijalankan saat berkas dimuat',
    langgar.length === 0, langgar.length ? langgar.join(', ') : 'urutan berkas tidak kritis');
}

/* ---------------- Uji ---------------- */
setup();
cek('setup() membuat tab Guides, Evaluations, Petunjuk',
  ['Guides', 'Evaluations', 'Petunjuk'].every(n => doc.getSheetByName(n)),
  doc.getSheets().map(s => s.nama).join(', '));
cek('setup() menghapus tab bawaan Sheet1', !doc.getSheetByName('Sheet1'));
const JML_GUIDE = sandbox.GUIDES_AWAL.length;   // ikut berkas data, jangan di-hardcode:
                                                // daftar guide bertambah setiap ada pemutakhiran
cek('setup() mengisi seluruh guide + header',
  doc.getSheetByName('Guides').getLastRow() === JML_GUIDE + 1,
  `${doc.getSheetByName('Guides').getLastRow() - 1} guide`);
cek('setup() memasang header Evaluations', doc.getSheetByName('Evaluations').getLastRow() === 1);

setup();
cek('setup() aman dijalankan dua kali (tidak menggandakan)',
  doc.getSheetByName('Guides').getLastRow() === JML_GUIDE + 1);

// Spreadsheet lama yang masih memakai skema "lisensi" harus ikut diperbarui
{
  const gs = doc.getSheetByName('Guides');
  gs.data = [['guideId', 'guideName', 'lisensi', 'aktif'], ['G-001', 'Guide Lama', 'HPI-001', true]];
  setup();
  const header = gs.getRange(1, 1, 1, 5).getValues()[0];
  cek('setup() memperbarui tab Guides berskema lama',
    header[2] === 'kategori' && header[3] === 'regu' && gs.getLastRow() === JML_GUIDE + 1,
    header.join(' | '));
}

// Tab yang cuma berisi header (mis. penulisan sebelumnya terputus) harus diisi ulang
{
  const gs = doc.getSheetByName('Guides');
  gs.data = [['guideId', 'guideName', 'kategori', 'regu', 'aktif']];
  setup();
  cek('setup() mengisi ulang tab Guides yang hanya berisi header',
    gs.getLastRow() === JML_GUIDE + 1, `${gs.getLastRow() - 1} guide`);
}

const health = J(doGet({ parameter: { action: 'health' } }));
cek('health membalas ok & total 0', health.ok === true && health.total === 0);

const g = J(doGet({ parameter: { action: 'guides' } }));
cek('guides mengembalikan seluruh yang aktif', g.guides.length === JML_GUIDE, `${g.guides.length} guide`);
cek('guides memuat kategori & regu',
  !!g.guides[0].guideId && !!g.guides[0].guideName && !!g.guides[0].kategori && !!g.guides[0].regu,
  JSON.stringify(g.guides[0]));

// Guide nonaktif harus tersaring
{
  const gs = doc.getSheetByName('Guides');
  gs.data.push(['G-900', 'Guide Nonaktif', 'Asing', 'A1', false]);
  const g2 = J(doGet({ parameter: { action: 'guides' } }));
  cek('Guide dengan aktif=FALSE tidak ikut terkirim', g2.guides.length === JML_GUIDE);
  gs.data.pop();
}

const post = (obj) => J(doPost({ postData: { contents: JSON.stringify(obj) } }));
const contoh = (id, pos = 1) => ({
  evaluationId: id, guideId: 'G-001', guideName: 'Gusti Alit Astawa', pos,
  timestamp: new Date().toISOString(),
  criteria: { idCard: true, uniform: false, review: 2 }, catatan: 'uji',
});

let r = post(contoh('uuid-1'));
cek('POST menyimpan penilaian', r.accepted.length === 1 && r.accepted[0].synced === true);
cek('Baris tersimpan di tab Evaluations', doc.getSheetByName('Evaluations').getLastRow() === 2);

const baris = doc.getSheetByName('Evaluations').getRange(2, 1, 1, 11).getValues()[0];
cek('Urutan kolom sesuai header (uniform, idCard, review)',
  baris[0] === 'uuid-1' && Number(baris[2]) === 1 && baris[3] === 'G-001' &&
  baris[5] === -1 && baris[6] === 1 && baris[7] === 2,
  JSON.stringify(baris.slice(0, 8)));
// Aplikasi lama mengirim Uniform sebagai boolean. Kirimannya TIDAK boleh
// ditolak — kalau ditolak, entri di perangkat yang belum diperbarui tertahan
// selamanya. false dipetakan ke -1 "pakaian tidak sesuai".
cek('Uniform boolean dari aplikasi lama dipetakan ke skala tiga tingkat',
  baris[5] === -1, `uniform=${baris[5]}`);

r = post(contoh('uuid-1'));
cek('Kirim ulang tidak menggandakan baris',
  r.accepted[0].duplicate === true && doc.getSheetByName('Evaluations').getLastRow() === 2);

r = post({ guideId: 'G-002', pos: 9, criteria: { idCard: 'ya', review: -1 } });
cek('Data tidak sah ditolak dengan alasan jelas',
  r.accepted.length === 0 && r.rejected.length === 1 && r.rejected[0].errors.length >= 4,
  r.rejected[0].errors.slice(0, 3).join('; '));

r = J(doPost({ postData: { contents: JSON.stringify({
  evaluations: [contoh('uuid-2', 2), contoh('uuid-3', 3)] }) } }));
cek('Batch beberapa entri sekaligus',
  r.accepted.length === 2 && doc.getSheetByName('Evaluations').getLastRow() === 4);

// Guide lain, karena G-001 pos 2 hari ini sudah dipakai uuid-2
r = post({ ...contoh('uuid-4'), guideId: 'G-002', guideName: 'I Gede Astawa', pos: '2' });
cek('pos berupa teks "2" tetap diterima sebagai angka',
  r.accepted.length === 1 &&
  doc.getSheetByName('Evaluations').getRange(5, 3, 1, 1).getValues()[0][0] === 2);

r = J(doPost({ postData: { contents: 'bukan json' } }));
cek('Body bukan JSON ditolak tanpa membuat script error',
  r.accepted.length === 0 && r.rejected.length === 1);

gagalKunci = true;
r = post(contoh('uuid-5'));
cek('Gagal dapat kunci → busy, tidak mengaku tersimpan',
  r.busy === true && r.accepted.length === 0);
gagalKunci = false;
cek('Kunci selalu dilepas kembali', lockDipegang === false);

const totalAkhir = J(doGet({ parameter: { action: 'health' } })).total;
cek('health menghitung jumlah baris dengan benar', totalAkhir === 4, `total ${totalAkhir}`);

/* ---------------- Rekap bulanan ---------------- */
{
  const ev = doc.getSheetByName('Evaluations');
  ev.data = [ev.data[0]];                       // sisakan header saja

  const T = (hari, jam) => `2026-07-${String(hari).padStart(2, '0')}T${jam}:00:00.000Z`;
  const buat = (id, gid, nama, pos, hari, uniform, idCard, review, etika) =>
    ev.data.push([id, T(hari, '02'), pos, gid, nama, uniform, idCard, review, etika || 0, '', T(hari, '02')]);

  // G-001 (Asing A1) tanggal 3: pos 1 bagus, pos 3 buruk -> harus terambil yang buruk
  buat('e1', 'G-001', 'Gusti Alit Astawa', 1, 3, 1, 1, 1, 2);
  buat('e2', 'G-001', 'Gusti Alit Astawa', 3, 3, 0, 0, 3, -4);
  // G-001 tanggal 5: sekali saja
  buat('e3', 'G-001', 'Gusti Alit Astawa', 2, 5, 1, 1, 0);
  // G-005 (Domestik D2) tanggal 4
  buat('e4', 'G-005', 'I Gede Darta', 1, 4, 0, 1, 2);
  // bulan lain — tidak boleh ikut
  ev.data.push(['e9', '2026-06-10T02:00:00.000Z', 1, 'G-001', 'Gusti Alit Astawa', 1, 1, 9, 0, '', '']);

  const pesan = sandbox.bangunRekap('2026-07');
  cek('bangunRekap() menghasilkan 4 tab regu + 1 tab per pos',
    ['Rekap A1 2026-07', 'Rekap A2 2026-07', 'Rekap D1 2026-07', 'Rekap D2 2026-07',
     'Rekap per Pos 2026-07'].every(n => doc.getSheetByName(n)), pesan);

  const a1 = doc.getSheetByName('Rekap A1 2026-07');
  const head3 = a1.getRange(3, 1, 1, 10).getValues()[0];
  cek('Header rekap memakai istilah lama (NAME / UNI FORM / ID / REVIEW)',
    head3[0] === 'NAME' && head3[1] === 'UNI FORM' && head3[2] === 'ID' && head3[3] === 'REVIEW',
    head3.slice(0, 4).join(' | '));

  // G-001 ada di baris 5 (nama paling awal secara abjad di regu A1)
  const barisG1 = a1.getRange(5, 1, 1, 14).getValues()[0];
  // Dulu nilai dua pos pada hari yang sama digabung dan diambil yang TERBURUK,
  // karena baris kedua pasti koreksi. Sekarang keduanya pengantaran tersendiri,
  // jadi angka hariannya dijumlahkan: +1 dan -1 menjadi 0, ID 1 + 0 = 1.
  cek('Nilai harian menjumlah seluruh pengantaran, tidak lagi diambil terburuk',
    barisG1[0] === 'Gusti Alit Astawa' && barisG1[1] === 0 && barisG1[2] === 1,
    `uniform=${barisG1[1]} id=${barisG1[2]} (pos 1 = +1/1, pos 3 = -1/0)`);
  cek('Review ikut dijumlah antar pengantaran, tidak terhapus',
    barisG1[3] === 4, `review=${barisG1[3]}`);
  cek('Cacah pengantaran dan cacah yang berpakaian sesuai ikut ditulis',
    barisG1[5] === 2 && barisG1[6] === 1,
    `antar=${barisG1[5]} patuh=${barisG1[6]} (dua pengantaran, satu berpakaian sesuai)`);

  cek('Tanggal tanpa penilaian dibiarkan kosong',
    barisG1[7] === 1 && barisG1[8] === 1 && barisG1[9] === 0,
    `tanggal 5: uniform=${barisG1[7]} id=${barisG1[8]} review=${barisG1[9]}`);

  /* ---- Etika: angka -5..+5, diambil yang paling rendah ---- */
  {
    const head3b = a1.getRange(3, 1, 1, 13).getValues()[0];
    cek('Tiap tanggal punya 6 kolom: 4 kriteria + ANTAR + PATUH',
      head3b[1] === 'UNI FORM' && head3b[2] === 'ID' &&
      head3b[3] === 'REVIEW' && head3b[4] === 'ETIKA' &&
      head3b[5] === 'ANTAR' && head3b[6] === 'PATUH',
      head3b.slice(1, 7).join(' | '));

    // e1 (pos 1) etika 2, e2 (pos 3) etika -4 pada tanggal yang sama -> 2 + -4
    const bEtika = a1.getRange(5, 1, 1, 9).getValues()[0];
    cek('Etika antar pengantaran dijumlah, tidak lagi diambil yang terendah',
      bEtika[4] === -2, `tanggal 3: etika 2 dan -4 -> ${bEtika[4]}`);
    cek('Etika ikut kosong bila hari itu tidak diperiksa',
      a1.getRange(6, 5, 1, 1).getValues()[0][0] === '');
  }

  const kolTotal = 1 + 2 * 6 + 1;               // 2 tanggal x 6 kolom -> TOTAL mulai kolom 14
  const rumus = a1.getRange(5, kolTotal, 1, 7).getValues()[0];
  cek('Kolom TOTAL berisi rumus SUM yang tetap hidup',
    String(rumus[0]).indexOf('=SUM(') === 0 && String(rumus[0]).indexOf('B5') > -1,
    String(rumus[0]));
  // RATA = dasar reward. Tetap RUMUS supaya ikut berubah saat tim membetulkan
  // angka REVIEW yang diketik manual di tab ini.
  cek('Blok TOTAL memuat ANTAR lalu RATA sebagai kolom terakhir',
    String(rumus[4]).indexOf('=SUM(') === 0 && String(rumus[6]).indexOf('=IFERROR(SUM(') === 0,
    `antar=${rumus[4]} rata=${rumus[6]}`);

  cek('Penilaian bulan lain tidak ikut terhitung',
    a1.getRange(2, 1, 1, 14).getValues()[0].filter(v => String(v).indexOf('TGL') === 0).length === 2,
    'hanya 2 tanggal di Juli');

  // Guide yang tidak pernah dinilai tetap muncul (agar terlihat siapa yang kosong)
  cek('Seluruh anggota regu tercantum walau belum pernah dinilai',
    a1.getLastRow() - 4 > 50, `${a1.getLastRow() - 4} baris guide di regu A1`);

  // Google menolak setFrozenColumns bila ada sel gabungan yang melintasi
  // batas kolom beku. Judul baris 1 karena itu tidak boleh di-merge.
  const bentrok = ['Rekap A1 2026-07', 'Rekap A2 2026-07', 'Rekap D1 2026-07', 'Rekap D2 2026-07']
    .map(n => doc.getSheetByName(n))
    .filter(s => s.frozenCols > 0 &&
      s.merges.some(m => m.row === 1 && m.col <= s.frozenCols && m.col + m.numCols - 1 > s.frozenCols));
  cek('Judul tidak di-merge melintasi kolom beku (jebakan setFrozenColumns)',
    bentrok.length === 0, bentrok.length ? bentrok.map(s => s.nama).join(', ') : 'aman');

  const perPos = doc.getSheetByName('Rekap per Pos 2026-07');
  const LEBAR_POS = 6;                     // Antar, Uniform, ID, Review, Etika, Rata Uni
  const KOL_POS = 2 + LEBAR_POS * 3 + 1;
  const headPos = perPos.getRange(2, 1, 1, KOL_POS).getValues()[0];
  cek('Tab per pos memisahkan Pos 1, 2, dan 3',
    headPos[2] === 'P1 Antar' && headPos[2 + LEBAR_POS] === 'P2 Antar' &&
    headPos[2 + LEBAR_POS * 2] === 'P3 Antar',
    headPos.slice(2, 4).join(' | '));
  // Kolom mutu per pos adalah pengaman: kalau Pos 1 dan Pos 3 menilai dengan
  // standar berbeda, selisihnya harus kelihatan, bukan ditebak.
  cek('Tiap pos melaporkan rata-rata mutu Uniform-nya sendiri',
    headPos[7] === 'P1 Rata Uni' && headPos[KOL_POS - 1] === 'Total Antar',
    headPos[7] + ' | ' + headPos[KOL_POS - 1]);

  const barisPos = perPos.getRange(3, 1, 2, KOL_POS).getValues();
  const g1pos = barisPos.find(b => b[0] === 'Gusti Alit Astawa');
  cek('Rincian per pos mencatat jumlah pengantaran tiap pos',
    g1pos && g1pos[2] === 1 && g1pos[2 + LEBAR_POS] === 1 &&
    g1pos[2 + LEBAR_POS * 2] === 1 && g1pos[KOL_POS - 1] === 3,
    g1pos ? `P1=${g1pos[2]} P2=${g1pos[2 + LEBAR_POS]} P3=${g1pos[2 + LEBAR_POS * 2]} total=${g1pos[KOL_POS - 1]}` : 'tidak ketemu');

  // Jalankan dua kali — tidak boleh menggandakan tab atau baris
  const jmlTabSebelum = doc.getSheets().length;
  sandbox.bangunRekap('2026-07');
  cek('bangunRekap() aman diulang (tab ditulis ulang, tidak bertambah)',
    doc.getSheets().length === jmlTabSebelum &&
    doc.getSheetByName('Rekap A1 2026-07').getRange(5, 1, 1, 1).getValues()[0][0] === 'Gusti Alit Astawa');

  /* ---- REVIEW manual tidak boleh hilang saat rekap disusun ulang ---- */
  {
    const tab = () => doc.getSheetByName('Rekap A1 2026-07');

    // Tim mengetik angka review di kolom REVIEW tanggal pertama (kolom D)
    // dan pada tanggal kedua (kolom J — blok tanggal kini selebar 6 kolom).
    tab().getRange(5, 4, 1, 1).setValues([[7]]);
    tab().getRange(5, 10, 1, 1).setValues([[3]]);

    sandbox.bangunRekap('2026-07');
    const sesudah = tab().getRange(5, 1, 1, 11).getValues()[0];
    cek('Angka REVIEW yang diketik manual bertahan setelah rekap disusun ulang',
      sesudah[3] === 7 && sesudah[9] === 3,
      `tanggal 1 review=${sesudah[3]}, tanggal 2 review=${sesudah[9]}`);
    cek('REVIEW manual tidak merusak kolom lain di barisnya',
      sesudah[0] === 'Gusti Alit Astawa' && sesudah[1] === 0 && sesudah[2] === 1 &&
      sesudah[4] === -2,
      `uniform=${sesudah[1]} id=${sesudah[2]} etika=${sesudah[4]}`);

    // Diulang sekali lagi: nilainya harus tetap, bukan menumpuk atau hilang
    sandbox.bangunRekap('2026-07');
    cek('REVIEW manual tetap utuh pada pembaruan berikutnya',
      tab().getRange(5, 4, 1, 1).getValues()[0][0] === 7);
  }

  // Cap waktu di ujung kanan baris judul — pembeda rekap segar vs rekap basi
  const jmlKolomA1 = 1 + 2 * 6 + 7;            // 2 tanggal x 6 kolom + blok TOTAL (7)
  cek('Rekap membawa cap waktu "Diperbarui:"',
    String(a1.getRange(1, jmlKolomA1, 1, 1).getValues()[0][0]).indexOf('Diperbarui:') === 0,
    String(a1.getRange(1, jmlKolomA1, 1, 1).getValues()[0][0]));

  // Sisa sel gabungan dari susunan kemarin tidak boleh menelan nilai hari ini
  const a2 = doc.getSheetByName('Rekap A2 2026-07');
  a2.merges.push({ row: 5, col: 2, numRows: 1, numCols: 3 });
  sandbox.bangunRekap('2026-07');
  cek('Sel gabungan sisa susunan lama dilepas sebelum rekap ditulis ulang',
    !a2.merges.some(m => m.row === 5), `${a2.merges.length} gabungan tersisa`);

  /* ---- Kehadiran: satu PENGANTARAN bernilai satu ---- */
  {
    const simpan = ev.data.slice();
    ev.data = [ev.data[0]];
    const B = (id, gid, pos, hari, jam, u, i, rv, et) =>
      ev.data.push([id, `2026-07-${String(hari).padStart(2, '0')}T${jam}:00:00.000Z`,
                    pos, gid, '?', u, i, rv, et || 0, '', '']);

    // G-001 tanggal 3: DUA pengantaran di pos 1 + satu di pos 2 -> 3 pengantaran.
    // Dulu dua penilaian di pos yang sama dianggap koreksi dan dihitung satu;
    // sekarang tiap penilaian adalah pengantaran tersendiri.
    B('k1', 'G-001', 1, 3, '02', 1, 1, 1);
    B('k2', 'G-001', 1, 3, '05', -1, 1, 3);     // pengantaran kedua di pos yang sama
    B('k3', 'G-001', 2, 3, '07', 1, 1, 0);
    // G-001 tanggal 4: tiga pengantaran di pos berbeda
    B('k4', 'G-001', 1, 4, '02', 1, 1, 0);
    B('k5', 'G-001', 2, 4, '03', 1, 1, 0);
    B('k6', 'G-001', 3, 4, '04', 1, 1, 0);
    // G-005 tanggal 3: sekali saja
    B('k7', 'G-005', 2, 3, '02', 1, 0, 2);

    const pesanHadir = sandbox.bangunRekap('2026-07');
    const kh = doc.getSheetByName('Rekap Kehadiran 2026-07');
    cek('bangunRekap() membuat tab Rekap Kehadiran', !!kh, pesanHadir.slice(-45));

    const headHadir = kh.getRange(3, 1, 1, 6).getValues()[0];
    cek('Tab kehadiran memakai satu kolom per tanggal',
      headHadir[0] === 'NAME' && headHadir[1] === 'REGU' &&
      headHadir[2] === '3-7' && headHadir[3] === '4-7' &&
      headHadir[4] === 'TOTAL ANTAR' && headHadir[5] === 'HARI HADIR',
      headHadir.join(' | '));

    // Gusti Alit Astawa (G-001) ada di baris 5 — nama paling awal secara abjad
    const bH = kh.getRange(5, 1, 1, 6).getValues()[0];
    cek('Dua pengantaran di pos yang SAMA dihitung dua, bukan satu',
      bH[0] === 'Gusti Alit Astawa' && bH[2] === 3,
      `tanggal 3: pos 1 dua kali + pos 2 sekali -> ${bH[2]} pengantaran (harus 3)`);
    cek('Tiga pengantaran pada hari yang sama dihitung 3', bH[3] === 3, `tanggal 4: ${bH[3]}`);
    cek('TOTAL ANTAR & HARI HADIR memakai rumus yang tetap hidup',
      String(bH[4]).indexOf('=SUM(C5:D5)') === 0 &&
      String(bH[5]).indexOf('=COUNTIF(C5:D5,">0")') === 0,
      `${bH[4]} / ${bH[5]}`);

    const kosong = kh.getRange(6, 1, 1, 4).getValues()[0];
    cek('Guide yang tidak pernah hadir tetap tercantum dengan sel kosong',
      kosong[0] === 'I Gede Astawa' && kosong[2] === '' && kosong[3] === '',
      kosong.slice(0, 4).join(' | '));

    // Baris penutup — dibaca MENURUN: hari itu berapa guide yang hadir
    const barisAkhir = 4 + JML_GUIDE;              // seluruh guide aktif
    const fJml = kh.getRange(barisAkhir + 2, 1, 1, 6).getValues()[0];
    const fPos = kh.getRange(barisAkhir + 3, 1, 1, 6).getValues()[0];
    cek('Ada baris "JUMLAH GUIDE HADIR" di bawah tabel',
      fJml[0] === 'JUMLAH GUIDE HADIR' && fPos[0] === 'TOTAL PENGANTARAN',
      `${fJml[0]} / ${fPos[0]}`);
    cek('Jumlah guide hadir per tanggal memakai COUNTIF sepanjang kolomnya',
      fJml[2] === `=COUNTIF(C5:C${barisAkhir},">0")` &&
      fJml[3] === `=COUNTIF(D5:D${barisAkhir},">0")`, fJml[2]);
    cek('Total pengantaran per tanggal memakai SUM',
      fPos[2] === `=SUM(C5:C${barisAkhir})`, fPos[2]);
    cek('Kolom penutup menghitung guide berbeda sebulan, bukan menjumlah harian',
      String(fJml[4]).indexOf('=COUNTIF(E5:E') === 0 &&
      String(fPos[4]).indexOf('=SUM(E5:E') === 0, `${fJml[4]} / ${fPos[4]}`);

    // Nilai rumusnya diperiksa juga secara terpisah, karena inilah angka yang
    // menjawab "hari itu berapa guide yang hadir".
    // Penjaga menyeluruh: label teks yang tidak sengaja ditulis lewat
    // setFormulas akan berubah menjadi #ERROR! di spreadsheet sungguhan.
    {
      const bermasalah = [];
      ['Rekap Kehadiran 2026-07', 'Rekap A1 2026-07', 'Rekap per Pos 2026-07',
       'Dasbor 2026-07'].forEach(n => {
        const t = doc.getSheetByName(n);
        if (!t) return;
        t.data.forEach((baris, r) => (baris || []).forEach((v, c) => {
          if (String(v) === '#ERROR!') bermasalah.push(`${n} baris ${r + 1} kolom ${c + 1}`);
        }));
      });
      cek('Tidak ada sel #ERROR! di tab rekap mana pun',
        bermasalah.length === 0, bermasalah.slice(0, 3).join('; ') || 'bersih');
    }

    cek('Rumus JUMLAH GUIDE HADIR menjangkau seluruh baris guide, bukan sebagian',
      fJml[2].includes('C5:C' + barisAkhir)
        && JML_GUIDE === doc.getSheetByName('Guides').getLastRow() - 1,
      `C5:C${barisAkhir} untuk ${JML_GUIDE} guide`);

    // Rincian per pos ikut memakai aturan yang sama
    const pp = doc.getSheetByName('Rekap per Pos 2026-07');
    const headPP = pp.getRange(2, 1, 1, KOL_POS).getValues()[0];
    cek('Tab per pos memakai istilah Antar, bukan Hadir',
      headPP[2] === 'P1 Antar' && headPP[KOL_POS - 1] === 'Total Antar',
      headPP[2] + ' | ' + headPP[KOL_POS - 1]);
    const barisPP = pp.getRange(3, 1, 3, KOL_POS).getValues()
      .find(b => b[0] === 'Gusti Alit Astawa');
    cek('P1 Antar mencacah PENGANTARAN, bukan hari',
      barisPP && barisPP[2] === 3,
      barisPP ? `P1=${barisPP[2]} (tgl 3 dua kali + tgl 4 sekali -> 3 pengantaran)` : 'tidak ketemu');
    // Dulu nilai per pos digabung per hari dan diambil yang terburuk; sekarang
    // tiap pengantaran berdiri sendiri dan nilainya dijumlahkan.
    cek('Nilai per pos menjumlah seluruh pengantaran, tidak lagi diambil terburuk',
      barisPP && barisPP[3] === 1 && barisPP[4] === 3,
      barisPP ? `P1 Uniform=${barisPP[3]} (+1, -1, +1 = 1) ID=${barisPP[4]}` : '-');
    cek('Rata-rata mutu Uniform per pos dihitung dari pengantaran',
      barisPP && Math.abs(barisPP[7] - 0.33) < 0.005,
      barisPP ? `P1 Rata Uni=${barisPP[7]} (1 dibagi 3 pengantaran)` : '-');
    cek('Total pengantaran sebulan benar',
      barisPP && barisPP[KOL_POS - 1] === 6,
      barisPP ? `${barisPP[KOL_POS - 1]} (tgl 3: 3 pengantaran, tgl 4: 3)` : '-');

    ev.data = simpan;
  }

  // Pemeriksaan mandiri: penilaian ada tapi guideId-nya tak dikenal
  {
    const simpan = ev.data.slice();
    ev.data = [ev.data[0], ['x1', '2026-07-03T02:00:00.000Z', 1, 'G-TIDAK-ADA', '?', 1, 1, 1, 0, '', '']];
    const pesanAneh = sandbox.bangunRekap('2026-07');
    cek('bangunRekap() memperingatkan bila tidak ada nilai yang masuk rekap',
      pesanAneh.indexOf('TIDAK ADA YANG MASUK REKAP') > -1, pesanAneh.slice(-90));
    ev.data = simpan;
  }

  ev.data = [ev.data[0]];                       // bersihkan lagi untuk uji berikutnya
}

/* ---------------- Zona waktu & pembaruan otomatis ---------------- */
{
  const ev = doc.getSheetByName('Evaluations');
  ev.data = [ev.data[0]];

  // Mulai dari tab rekap yang benar-benar bersih: skenario sebelumnya
  // meninggalkan angka REVIEW manual, dan angka itu sengaja dipertahankan
  // beserta tanggalnya — di sini yang diuji hanya soal zona waktu.
  doc.getSheets().filter(x => x.nama.indexOf('Rekap ') === 0)
    .forEach(x => doc.deleteSheet(x));

  // 2026-07-03T17:30Z = 4 Juli 01.30 WITA. Rekap harus memakai tanggal setempat,
  // bukan tanggal UTC — kalau tidak, penilaian sore hari lompat ke hari lain.
  ev.data.push(['tz1', '2026-07-03T17:30:00.000Z', 1, 'G-001', 'Gusti Alit Astawa', 1, 1, 2, 0, '', '']);
  sandbox.bangunRekap('2026-07');
  const tzA1 = doc.getSheetByName('Rekap A1 2026-07');
  cek('Tanggal rekap memakai zona waktu spreadsheet, bukan UTC',
    String(tzA1.getRange(2, 2, 1, 1).getValues()[0][0]) === 'TGL: 4-7-2026',
    String(tzA1.getRange(2, 2, 1, 1).getValues()[0][0]));

  // POST harus menitipkan bulan yang berubah, lalu trigger yang menyusun rekap
  props.clear();
  triggers = [];
  ev.data = [ev.data[0]];
  const kirim = J(doPost({ postData: { contents: JSON.stringify({
    evaluationId: 'auto-1', guideId: 'G-001', guideName: 'Gusti Alit Astawa', pos: 1,
    timestamp: '2026-09-10T02:00:00.000Z',
    criteria: { idCard: true, uniform: true, review: 3 },
  }) } }));
  cek('POST menitipkan bulan yang perlu dirangkum ulang',
    kirim.accepted.length === 1 && props.get('rekapTertunda') === '2026-09',
    `tertunda="${props.get('rekapTertunda')}"`);
  cek('POST tidak membangun rekap sendiri (balasan tetap cepat)',
    !doc.getSheetByName('Rekap A1 2026-09'));

  sandbox.rekapOtomatis();
  const sep = doc.getSheetByName('Rekap A1 2026-09');
  cek('rekapOtomatis() menyusun rekap bulan yang tertunda',
    !!sep && sep.getRange(5, 1, 1, 4).getValues()[0][0] === 'Gusti Alit Astawa' &&
    sep.getRange(5, 2, 1, 3).getValues()[0].join(',') === '1,1,3',
    sep ? sep.getRange(5, 1, 1, 4).getValues()[0].join(' | ') : 'tab tidak dibuat');
  cek('rekapOtomatis() menghapus tanda setelah selesai', !props.has('rekapTertunda'));

  const tabSebelum = doc.getSheets().length;
  sandbox.rekapOtomatis();
  cek('rekapOtomatis() diam saja bila tidak ada penilaian baru',
    doc.getSheets().length === tabSebelum);

  // Kalau kunci sedang dipegang proses lain, bulan itu harus DITANDAI ULANG —
  // kalau tandanya hilang begitu saja, pembaruan rekapnya tidak pernah terjadi.
  props.set('rekapTertunda', '2026-09');
  gagalKunci = true;
  sandbox.rekapOtomatis();
  gagalKunci = false;
  cek('Rekap yang gagal karena kunci ditandai ulang, bukan hilang',
    props.get('rekapTertunda') === '2026-09', `tertunda="${props.get('rekapTertunda')}"`);
  sandbox.rekapOtomatis();
  cek('Percobaan berikutnya berhasil menyusun rekap', !props.has('rekapTertunda'));

  // guideId asing harus ditolak, bukan diam-diam masuk lalu hilang dari rekap
  const asing = J(doPost({ postData: { contents: JSON.stringify({
    evaluationId: 'auto-2', guideId: 'G-999', guideName: 'Entah Siapa', pos: 1,
    timestamp: '2026-09-10T02:00:00.000Z',
    criteria: { idCard: true, uniform: true, review: 1 },
  }) } }));
  cek('guideId yang tidak ada di tab Guides ditolak',
    asing.accepted.length === 0 &&
    String(asing.rejected[0].errors).indexOf('tidak ada di tab Guides') > -1,
    String(asing.rejected[0].errors));

  // Nama dari perangkat berdaftar lama diperbaiki memakai tab Guides
  J(doPost({ postData: { contents: JSON.stringify({
    evaluationId: 'auto-3', guideId: 'G-002', guideName: 'Nama Salah Dari Aplikasi Lama', pos: 2,
    timestamp: '2026-09-11T02:00:00.000Z',
    criteria: { idCard: true, uniform: true, review: 1 },
  }) } }));
  const barisNama = ev.getRange(ev.getLastRow(), 1, 1, 11).getValues()[0];
  cek('guideName ditulis ulang memakai nama resmi dari tab Guides',
    barisNama[4] === 'I Gede Astawa', `tersimpan sebagai "${barisNama[4]}"`);

  // Batas wajar
  const batas = J(doPost({ postData: { contents: JSON.stringify({
    evaluationId: 'auto-4', guideId: 'G-002', guideName: 'I Gede Astawa', pos: 2,
    timestamp: '2026-09-12T02:00:00.000Z',
    criteria: { idCard: true, uniform: true, review: 9999 }, catatan: 'x'.repeat(2000),
  }) } }));
  const barisBatas = ev.getRange(ev.getLastRow(), 1, 1, 11).getValues()[0];
  const etikaLuar = J(doPost({ postData: { contents: JSON.stringify({
    evaluationId: 'auto-5', guideId: 'G-002', guideName: 'I Gede Astawa', pos: 2,
    timestamp: '2026-09-13T02:00:00.000Z',
    criteria: { idCard: true, uniform: true, etika: 9 },
  }) } }));
  cek('Etika di luar rentang -5..+5 ditolak, bukan diam-diam dipangkas',
    etikaLuar.rejected.length === 1 &&
    /etika/.test(String(etikaLuar.rejected[0].errors)),
    JSON.stringify(etikaLuar.rejected[0] || {}));

  /* ---- Uniform tiga tingkat: -1, +1, +2 ---- */
  {
    const kirimUni = (id, nilai) => J(doPost({ postData: { contents: JSON.stringify({
      evaluationId: id, guideId: 'G-002', guideName: 'I Gede Astawa', pos: 3,
      timestamp: '2026-11-0' + (id.slice(-1)) + 'T02:00:00.000Z',
      criteria: { idCard: true, uniform: nilai },
    }) } }));

    const bagus = kirimUni('uni-2', 2);
    cek('Uniform +2 "penampilan bagus" diterima dan tersimpan apa adanya',
      bagus.accepted.length === 1 &&
      ev.getRange(ev.getLastRow(), 6, 1, 1).getValues()[0][0] === 2,
      String(ev.getRange(ev.getLastRow(), 6, 1, 1).getValues()[0][0]));

    const kurang = kirimUni('uni-1', -1);
    cek('Uniform -1 "pakaian tidak sesuai" diterima',
      kurang.accepted.length === 1 &&
      ev.getRange(ev.getLastRow(), 6, 1, 1).getValues()[0][0] === -1,
      String(ev.getRange(ev.getLastRow(), 6, 1, 1).getValues()[0][0]));

    // 0 BUKAN nilai yang sah pada skala baru. Itu penting: kalau 0 diterima,
    // baris baru tidak bisa dibedakan dari baris lama, dan pemetaan
    // "0 berarti Tidak" yang dipakai rekap jadi menebak.
    const nol = kirimUni('uni-3', 0);
    cek('Uniform 0 ditolak — nilai itu hanya milik data lama, bukan skala baru',
      nol.accepted.length === 0 && nol.rejected.length === 1 &&
      /uniform/.test(String(nol.rejected[0].errors)),
      JSON.stringify(nol.rejected[0] || {}));

    const liar = kirimUni('uni-4', 5);
    cek('Uniform di luar tiga tingkat ditolak, bukan dipangkas diam-diam',
      liar.rejected.length === 1, JSON.stringify(liar.rejected[0] || {}));
  }

  // Baris lama menyimpan Ya/Tidak sebagai 1/0. Rekap harus membacanya pada
  // skala baru, kalau tidak "tidak sesuai" terhitung netral, bukan minus.
  cek('Data lama uniform=0 dibaca sebagai -1 oleh rekap',
    sandbox.normalUniform_(0) === -1 && sandbox.normalUniform_(1) === 1 &&
    sandbox.normalUniform_(false) === -1 && sandbox.normalUniform_(true) === 1,
    `0→${sandbox.normalUniform_(0)} 1→${sandbox.normalUniform_(1)}`);

  const etikaMinus = J(doPost({ postData: { contents: JSON.stringify({
    evaluationId: 'auto-6', guideId: 'G-002', guideName: 'I Gede Astawa', pos: 3,
    timestamp: '2026-09-13T02:00:00.000Z',
    criteria: { idCard: true, uniform: true, etika: -5 },
  }) } }));
  const barisMinus = ev.getRange(ev.getLastRow(), 1, 1, 11).getValues()[0];
  cek('Etika bernilai minus tersimpan apa adanya',
    etikaMinus.accepted.length === 1 && barisMinus[8] === -5, `etika=${barisMinus[8]}`);

  cek('Penilaian tanpa field review tetap diterima (aplikasi tidak lagi mengirimnya)',
    etikaMinus.accepted.length === 1 && barisMinus[7] === 0, `review=${barisMinus[7]}`);

  cek('review & catatan dipangkas ke batas wajar',
    batas.accepted.length === 1 && barisBatas[7] === 20 && barisBatas[9].length === 500,
    `review=${barisBatas[7]} panjang catatan=${barisBatas[9].length}`);

  /* ---- Pengaman jeda: berkali-kali sehari boleh, beruntun tidak ---- */
  {
    ev.data = [ev.data[0]];
    const kirim = (id, gid, pos, iso) => J(doPost({ postData: { contents: JSON.stringify({
      evaluationId: id, guideId: gid, guideName: 'x', pos,
      timestamp: iso, criteria: { idCard: true, uniform: true, review: 1 },
    }) } }));

    const p1 = kirim('sp-1', 'G-001', 1, '2026-10-05T02:00:00.000Z');
    cek('Penilaian pertama di sebuah pos diterima', p1.accepted.length === 1);

    // INTI perubahan: guide yang sama, pos yang sama, hari yang sama — dulu
    // ditolak mentah, sekarang diterima karena itu pengantaran berikutnya.
    const p1b = kirim('sp-2', 'G-001', 1, '2026-10-05T06:00:00.000Z');
    cek('Pengantaran berikutnya di pos yang sama pada hari yang sama DITERIMA',
      p1b.accepted.length === 1 && ev.getLastRow() === 3,
      p1b.rejected.length ? p1b.rejected[0].errors[0] : 'diterima');

    // Yang tetap ditahan: dua penilaian berselang beberapa menit.
    const cepat = kirim('sp-2b', 'G-001', 1, '2026-10-05T06:10:00.000Z');
    cek('Penilaian beruntun dalam jeda minimum ditolak sebagai kemungkinan salah pencet',
      cepat.accepted.length === 0 && cepat.rejected.length === 1 &&
      cepat.rejected[0].terlaluCepat === true,
      cepat.rejected[0] ? cepat.rejected[0].errors[0] : '-');
    cek('Barisnya benar-benar tidak ikut tertulis', ev.getLastRow() === 3);

    // Selisihnya MUTLAK: entri offline bisa tiba belakangan dengan cap waktu
    // lebih AWAL, dan itu pencetan ganda yang sama.
    const mundur = kirim('sp-2c', 'G-001', 1, '2026-10-05T05:50:00.000Z');
    cek('Cap waktu lebih awal dalam jeda yang sama juga ditolak',
      mundur.accepted.length === 0 && mundur.rejected.length === 1,
      mundur.rejected[0] ? mundur.rejected[0].errors[0] : '-');

    // Server hanya menegakkan ambang TOLAK. Rentang peringatan (15-60 menit)
    // sengaja DITERIMA di sini: lama satu siklus antar naik-turun belum pernah
    // terukur, jadi menolak keras di 60 menit berisiko membuang pengantaran
    // yang sah. Yang bertanya di rentang itu aplikasi, dan petugas memutuskan.
    const sedang = kirim('sp-2d', 'G-001', 1, '2026-10-05T06:25:00.000Z');
    cek('Jeda 25 menit diterima server — itu wilayah peringatan aplikasi',
      sedang.accepted.length === 1,
      sedang.rejected.length ? sedang.rejected[0].errors[0] : 'diterima');

    // Pos BERBEDA harus tetap boleh, bahkan pada menit yang sama
    const p2 = kirim('sp-3', 'G-001', 2, '2026-10-05T06:05:00.000Z');
    const p3 = kirim('sp-4', 'G-001', 3, '2026-10-05T06:06:00.000Z');
    cek('Pos berbeda tidak terkena jeda — jedanya per guide DAN per pos',
      p2.accepted.length === 1 && p3.accepted.length === 1 && ev.getLastRow() === 6);

    // Hari berikutnya jelas di luar jeda
    const besok = kirim('sp-5', 'G-001', 1, '2026-10-06T02:00:00.000Z');
    cek('Hari berikutnya pos yang sama boleh menilai lagi', besok.accepted.length === 1);

    // Kiriman ulang evaluationId yang SAMA tetap dianggap sudah tersimpan,
    // bukan ditolak — kalau tidak, antrean aplikasi akan macet selamanya.
    const ulang = kirim('sp-1', 'G-001', 1, '2026-10-05T02:00:00.000Z');
    cek('Kirim ulang evaluationId yang sama tetap "sudah tersimpan", bukan ditolak',
      ulang.accepted.length === 1 && ulang.accepted[0].duplicate === true &&
      ulang.rejected.length === 0);

    // Penggandaan di dalam satu kiriman borongan juga harus tertangkap
    const borong = J(doPost({ postData: { contents: JSON.stringify({ evaluations: [
      { evaluationId: 'sp-6', guideId: 'G-002', guideName: 'x', pos: 2,
        timestamp: '2026-10-07T02:00:00.000Z', criteria: { idCard: true, uniform: true, review: 0 } },
      { evaluationId: 'sp-7', guideId: 'G-002', guideName: 'x', pos: 2,
        timestamp: '2026-10-07T02:10:00.000Z', criteria: { idCard: true, uniform: true, review: 0 } },
    ] }) } }));
    cek('Dua entri beruntun dalam SATU kiriman: satu diterima, satu ditolak',
      borong.accepted.length === 1 && borong.rejected.length === 1,
      `${borong.accepted.length} diterima, ${borong.rejected.length} ditolak`);

    // Berjarak cukup, keduanya sah sekalipun pos dan harinya sama
    const borongJauh = J(doPost({ postData: { contents: JSON.stringify({ evaluations: [
      { evaluationId: 'sp-8', guideId: 'G-006', guideName: 'x', pos: 2,
        timestamp: '2026-10-07T02:00:00.000Z', criteria: { idCard: true, uniform: 1, review: 0 } },
      { evaluationId: 'sp-9', guideId: 'G-006', guideName: 'x', pos: 2,
        timestamp: '2026-10-07T04:00:00.000Z', criteria: { idCard: true, uniform: 2, review: 0 } },
    ] }) } }));
    cek('Dua pengantaran berjarak cukup dalam satu kiriman sama-sama diterima',
      borongJauh.accepted.length === 2 && borongJauh.rejected.length === 0,
      `${borongJauh.accepted.length} diterima`);

    // Cacah pengantaran, bukan cacah pos: 5 Okt G-001 dinilai di pos 1 (3x —
    // 02.00, 06.00, 06.25), pos 2, dan pos 3 -> 5 pengantaran. Dulu angka ini
    // mentok di 3, karena yang dicacah jumlah pos.
    sandbox.bangunRekap('2026-10');
    const khOkt = doc.getSheetByName('Rekap Kehadiran 2026-10');
    const bOkt = khOkt.getRange(5, 1, 1, 5).getValues()[0];
    cek('Kehadiran mencacah pengantaran dan boleh melebihi jumlah pos',
      bOkt[0] === 'Gusti Alit Astawa' && bOkt[2] === 5,
      `5 Okt: ${bOkt[2]} (pos 1 tiga kali, pos 2, pos 3)`);

    ev.data = [ev.data[0]];
    props.clear();
  }

  const borongan = J(doPost({ postData: { contents: JSON.stringify({
    evaluations: Array.from({ length: 201 }, (_, i) => ({
      evaluationId: 'b' + i, guideId: 'G-001', guideName: 'Gusti Alit Astawa', pos: 1,
      timestamp: '2026-09-11T02:00:00.000Z', criteria: { idCard: true, uniform: true, review: 0 },
    })) }) } }));
  cek('Kiriman borongan berlebihan ditolak karena batas jumlah, bukan aturan pos',
    borongan.accepted.length === 0 &&
    String(borongan.rejected[0].errors).indexOf('maksimal') > -1,
    String(borongan.rejected[0].errors));

  props.clear();
  ev.data = [ev.data[0]];
}

/* ---------------- Pemeriksaan kesehatan & trigger ---------------- */
{
  triggers = [];
  sandbox.pasangTriggerHarian();
  const nama = triggers.map(t => t.getHandlerFunction()).sort().join(',');
  cek('pasangTriggerHarian() memasang trigger 5 menit + harian',
    nama === 'rekapHarian,rekapOtomatis', nama);

  sandbox.pasangTriggerHarian();
  cek('Trigger tidak menumpuk bila dipasang dua kali', triggers.length === 2, `${triggers.length} trigger`);

  const ev = doc.getSheetByName('Evaluations');
  ev.data = [ev.data[0], ['s1', '2026-09-01T02:00:00.000Z', 1, 'G-XXX', '?', 1, 1, 1, 0, '', '']];
  const laporan = sandbox.periksaKesehatan();
  cek('periksaKesehatan() menunjuk guideId yang tercecer',
    laporan.indexOf('G-XXX') > -1 && laporan.indexOf('Total penilaian tersimpan : 1') > -1,
    laporan.split('\n').pop());
  ev.data = [ev.data[0]];
}

/* ---------------- Migrasi skema lama ---------------- */
{
  const ev = doc.getSheetByName('Evaluations');
  ev.data = [
    ['evaluationId', 'timestamp', 'pos', 'guideId', 'guideName', 'idCard', 'uniform', 'etika', 'catatan', 'receivedAt'],
    ['lama-1', '2026-06-01T02:00:00.000Z', 1, 'G-001', 'Gusti Alit Astawa', true, false, true, 'catatan lama', ''],
  ];
  setup();
  const h = ev.getRange(1, 1, 1, 11).getValues()[0];
  const b = ev.getRange(2, 1, 1, 11).getValues()[0];
  cek('Tab Evaluations skema lama dimigrasikan',
    h[5] === 'uniform' && h[6] === 'idCard' && h[7] === 'review' && h[8] === 'etika',
    h.slice(5, 9).join(' | '));
  // Kolom `etika` yang dulu dipindahkan ke `review` kini punya rumahnya sendiri
  cek('Nilai lama dipindahkan dengan benar (bukan dihapus)',
    b[5] === 0 && b[6] === 1 && b[8] === 1 && b[9] === 'catatan lama',
    `uniform=${b[5]} idCard=${b[6]} review=${b[7]} etika=${b[8]}`);
  ev.data = [ev.data[0]];
}

/* ---------------- resetGuides ---------------- */
{
  const gs = doc.getSheetByName('Guides');
  gs.data.push(['G-999', 'Guide Tambahan Manual', 'Asing', 'A1', true]);
  const sebelum = gs.getLastRow();
  const barisEvalSebelum = doc.getSheetByName('Evaluations').getLastRow();
  const pesan = sandbox.resetGuides();
  cek('resetGuides() menulis ulang daftar guide dari awal',
    sebelum === JML_GUIDE + 2 && doc.getSheetByName('Guides').getLastRow() === JML_GUIDE + 1, pesan);
  cek('resetGuides() tidak menyentuh data penilaian',
    doc.getSheetByName('Evaluations').getLastRow() === barisEvalSebelum);
}

/* ---------------- Zona waktu dikunci oleh setup() ---------------- */
{
  doc.setSpreadsheetTimeZone('Etc/GMT');              // seolah dibuat dengan locale lain
  const pesan = setup();
  cek('setup() mengunci zona waktu spreadsheet ke WITA',
    doc.getSpreadsheetTimeZone() === 'Asia/Makassar', doc.getSpreadsheetTimeZone());
  cek('Perubahan zona dilaporkan, bukan diam-diam',
    pesan.indexOf('Zona waktu diubah dari Etc/GMT') > -1,
    (pesan.split('\n').filter(b => b.indexOf('Zona waktu') > -1)[0] || '(tidak disebut)').trim());
  cek('periksaKesehatan() melaporkan zona waktu spreadsheet',
    sandbox.periksaKesehatan().indexOf('✅ Zona waktu spreadsheet : Asia/Makassar') > -1);
}

/* ---------------- Koreksi salah pencet (append-only) ---------------- */
{
  const P = (obj) => JSON.parse(doPost({ postData: { contents: JSON.stringify(obj) } }).getContent());
  const ev = doc.getSheetByName('Evaluations');
  const KOL_STATUS = 13;
  const TGL = '2032-05-06T03:00:00.000Z';        // tanggal yang belum dipakai blok lain
  const dasar = (id, extra) => Object.assign({
    evaluationId: id, guideId: 'G-003', guideName: 'I Gede Budiarsana', pos: 2,
    timestamp: TGL, criteria: { idCard: true, uniform: true, etika: 3 }, catatan: '',
  }, extra || {});

  const asli = P(dasar('kor-asli'));
  cek('Penilaian yang akan dikoreksi tersimpan', asli.accepted.length === 1);

  // Tanpa koreksiDari tetap ditolak — aturan satu pos sekali sehari utuh
  const ganda = P(dasar('kor-ganda'));
  cek('Penilaian kedua tanpa koreksiDari tetap ditolak',
    ganda.accepted.length === 0 && ganda.rejected[0].sudahDinilai === true,
    ganda.rejected[0].errors.join(' ').slice(0, 60));
  cek('Penolakan menyebutkan cara memperbaikinya',
    ganda.rejected[0].aktifSaatIni === 'kor-asli' &&
    /koreksiDari/.test(ganda.rejected[0].errors.join(' ')));

  // Koreksi yang sah
  const barisSebelum = ev.getLastRow();
  const koreksi = P(dasar('kor-baru', { koreksiDari: 'kor-asli', criteria: { idCard: false, uniform: true, etika: -2 } }));
  cek('Koreksi dengan koreksiDari diterima', koreksi.accepted.length === 1,
    JSON.stringify(koreksi.rejected));
  cek('Koreksi MENAMBAH baris, tidak menimpa (tetap append-only)',
    ev.getLastRow() === barisSebelum + 1, `${barisSebelum} → ${ev.getLastRow()}`);

  const cari = (id) => ev.data.slice(1).find(b => String(b[0]) === id);
  cek('Baris lama ditandai "diganti", bukan dihapus',
    !!cari('kor-asli') && String(cari('kor-asli')[KOL_STATUS - 1]) === 'diganti',
    cari('kor-asli') ? String(cari('kor-asli')[KOL_STATUS - 1]) : 'hilang');
  cek('Baris koreksi menyimpan jejak asalnya',
    String(cari('kor-baru')[KOL_STATUS - 2]) === 'kor-asli' &&
    String(cari('kor-baru')[KOL_STATUS - 1]) === 'aktif');

  // Rekap hanya memakai yang aktif
  const r = sandbox.rangkumBulan_('2032-05');
  const hari = r.harian['G-003'] && r.harian['G-003']['2032-05-06'];
  cek('Rekap memakai nilai koreksi, bukan nilai lama',
    !!hari && hari.idCard === 0 && hari.etika === -2,
    hari ? `idCard=${hari.idCard} etika=${hari.etika}` : 'tidak ada');
  cek('Baris yang diganti tidak ikut dicacah sebagai pengantaran tambahan',
    !!hari && hari.antar === 1, hari ? String(hari.antar) : 'tidak ada');

  // Koreksi berantai atas baris yang sama ditolak
  const lagi = P(dasar('kor-lagi', { koreksiDari: 'kor-asli' }));
  cek('Mengoreksi baris yang sudah diganti ditolak',
    lagi.accepted.length === 0 && /sudah pernah diperbaiki/.test(lagi.rejected[0].errors.join(' ')),
    lagi.rejected[0].errors.join(' '));

  // Tapi mengoreksi koreksinya (baris yang masih aktif) boleh
  const lanjut = P(dasar('kor-lanjut', { koreksiDari: 'kor-baru', criteria: { idCard: true, uniform: false, etika: 1 } }));
  cek('Koreksi atas baris yang masih aktif tetap boleh', lanjut.accepted.length === 1,
    JSON.stringify(lanjut.rejected));

  // koreksiDari yang menunjuk entah ke mana
  const hantu = P(dasar('kor-hantu', { koreksiDari: 'tidak-ada-id' }));
  cek('koreksiDari yang tidak ada di server ditolak dengan jelas',
    hantu.accepted.length === 0 && /tidak ada di server/.test(hantu.rejected[0].errors.join(' ')));

  // Koreksi tidak boleh dipakai menyelundupkan penilaian pos/hari lain
  const selundup = P(dasar('kor-selundup', { pos: 3, koreksiDari: 'kor-lanjut' }));
  cek('Koreksi lintas pos/tanggal ditolak',
    selundup.accepted.length === 0 &&
    /guide, pos, dan tanggal yang sama/.test(selundup.rejected[0].errors.join(' ')));

  cek('koreksiDari tidak boleh menunjuk dirinya sendiri',
    P(dasar('kor-diri', { koreksiDari: 'kor-diri' })).rejected[0]
      .errors.join(' ').indexOf('dirinya sendiri') > -1);

  cek('periksaKesehatan() melaporkan jumlah baris yang diganti',
    /Diganti oleh koreksi\s*:\s*[1-9]/.test(sandbox.periksaKesehatan()),
    (sandbox.periksaKesehatan().split('\n').find(b => b.indexOf('Diganti') > -1) || '').trim());
}

/* ---------------- Cap waktu rekap berbahasa Indonesia ---------------- */
{
  const cap = sandbox.capWaktu_();
  cek('Cap waktu rekap memakai nama bulan Indonesia, bukan locale proyek',
    /^Diperbarui: \d{1,2} (Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des) \d{4} \d{2}\.\d{2}$/.test(cap),
    cap);
  cek('Tidak ada nama bulan berbahasa Inggris yang tersisa',
    !/(Aug|Oct|Dec|May\s\d{4})/.test(cap), cap);
}

/* ---------------- Tab Dasbor: peringkat + grafik ketaatan ---------------- */
{
  const BLN = '2033-01';
  const P = (obj) => JSON.parse(doPost({ postData: { contents: JSON.stringify(obj) } }).getContent());
  const kirim = (id, gid, pos, tgl, uni, idc, etika) => P({
    evaluationId: id, guideId: gid, guideName: 'x', pos,
    timestamp: tgl + 'T03:00:00.000Z',
    criteria: { uniform: !!uni, idCard: !!idc, etika },
    catatan: '',
  });

  // Skenario terkendali. Tanggalnya belum dipakai blok lain, dan tiap guide
  // sengaja diberi pola berbeda supaya peringkatnya bisa diprediksi.
  // Enam tanggal, bukan empat: ambang peringkat kini MIN_PENGANTARAN_PERINGKAT
  // (5 pengantaran), jadi skenario empat hari tidak akan pernah masuk tabel.
  const TGL = ['2033-01-10', '2033-01-11', '2033-01-12',
               '2033-01-13', '2033-01-14', '2033-01-15'];
  //  G-001 Gusti Alit Astawa   — Asing  A1 — 6 pengantaran, taat penuh, etika +3
  //  G-006 I Gede Dauh         — Asing  A2 — 6 pengantaran, tidak taat, etika -4
  //  G-005 I Gede Darta        — Domestik D2 — 5 pengantaran, uniform saja
  //  G-018 I Gede Suweca       — Domestik D1 — 1 pengantaran → di bawah ambang
  TGL.forEach((t, i) => {
    kirim(`ds-a-${i}`, 'G-001', 1, t, 1, 1, 3);
    kirim(`ds-b-${i}`, 'G-006', 1, t, 0, 0, -4);
    if (i < 5) kirim(`ds-c-${i}`, 'G-005', 2, t, 1, 0, 0);
    if (i < 1) kirim(`ds-d-${i}`, 'G-018', 3, t, 1, 1, 1);
  });

  const pesan = sandbox.bangunRekap(BLN);
  const dsb = doc.getSheetByName('Dasbor ' + BLN);
  cek('bangunRekap() membuat tab Dasbor', !!dsb, pesan.slice(-70));

  const teksBaris = (r) => (dsb.data[r] || []).map(v => String(v ?? '')).join('|');
  const cariBaris = (teks) => dsb.data.findIndex(b => String((b || [])[0] ?? '').indexOf(teks) === 0);
  const sel = (r, c) => (dsb.data[r - 1] || [])[c - 1];

  /* ---- ringkasan harian: RUMUS, bukan angka mati ---- */
  cek('Kepala kolom dasbor memisahkan Asing & Domestik',
    teksBaris(2).indexOf('ASING (A1 + A2)') > -1 && teksBaris(2).indexOf('DOMESTIK (D1 + D2)') > -1,
    teksBaris(2).slice(0, 60));

  const barisTgl = dsb.data.findIndex(b => String((b || [])[0] ?? '') === TGL[0]) + 1;
  cek('Tiap tanggal punya barisnya sendiri', barisTgl >= 5, `baris ${barisTgl}`);
  cek('Kolom Hari memakai nama hari Indonesia',
    ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].indexOf(String(sel(barisTgl, 2))) > -1,
    String(sel(barisTgl, 2)));

  const rumusHadirAsing = String(sel(barisTgl, 3));
  cek('Ringkasan harian berupa RUMUS ke tab Rekap regu, bukan angka mati',
    rumusHadirAsing.charAt(0) === '=' && rumusHadirAsing.indexOf(`'Rekap A1 ${BLN}'!`) > -1,
    rumusHadirAsing.slice(0, 58));
  cek('Kolom Hadir memakai COUNT (sel kosong = tidak diperiksa)',
    rumusHadirAsing.indexOf('COUNT(') > -1, rumusHadirAsing.slice(0, 40));
  cek('Asing hanya menjumlah tab A1 & A2',
    rumusHadirAsing.indexOf('A1') > -1 && rumusHadirAsing.indexOf('A2') > -1 &&
    rumusHadirAsing.indexOf('D1') === -1 && rumusHadirAsing.indexOf('D2') === -1);
  // Kolom per kategori kini 10: Hadir, Antar, Uniform, ID, Patuh, % Uniform,
  // % ID, Mutu Uni, Etika, Review. Domestik karena itu mulai di kolom 13.
  const rumusHadirDom = String(sel(barisTgl, 13));
  cek('Domestik hanya menjumlah tab D1 & D2',
    rumusHadirDom.indexOf('D1') > -1 && rumusHadirDom.indexOf('D2') > -1 &&
    rumusHadirDom.indexOf('A1') === -1 && rumusHadirDom.indexOf('A2') === -1,
    rumusHadirDom.slice(0, 58));
  // Penyebutnya kolom ANTAR (D), bukan lagi jumlah guide (C): satu guide bisa
  // mengantar berkali-kali sehari dan tiap pengantaran dinilai sendiri.
  cek('Persentase dibagi jumlah PENGANTARAN dan dijaga dari pembagian nol',
    String(sel(barisTgl, 8)).indexOf('=IF(D') === 0, String(sel(barisTgl, 8)).slice(0, 30));
  cek('Kolom persen diberi format persen, bukan 0,9333',
    dsb.getNumberFormat(barisTgl, 8) === '0%' && dsb.getNumberFormat(barisTgl, 18) === '0%',
    dsb.getNumberFormat(barisTgl, 8));
  cek('Mutu Uniform bukan persen — skalanya -1..+2',
    dsb.getNumberFormat(barisTgl, 10) === '0.00', dsb.getNumberFormat(barisTgl, 10));

  const barisTotal = cariBaris('TOTAL') + 1;
  cek('Ada baris penutup TOTAL sebulan', barisTotal > barisTgl &&
    String(sel(barisTotal, 3)).indexOf('=SUM(C') === 0, String(sel(barisTotal, 3)).slice(0, 24));

  /* ---- rumusnya benar-benar DIHITUNG, bukan cuma diperiksa bentuknya ---- */
  const H = (r, c) => hitungRumus(doc, dsb, sel(r, c));
  // Hari pertama: Asing = G-001 (taat penuh) + G-006 (tidak taat sama sekali)
  cek('Rumus Hadir Asing menghitung 2 guide pada hari pertama', H(barisTgl, 3) === 2,
    String(H(barisTgl, 3)));
  cek('Kolom Antar mencacah pengantaran, bukan guide', H(barisTgl, 4) === 2,
    String(H(barisTgl, 4)));
  // Uniform kini bertanda: +1 untuk G-001, -1 untuk G-006, jadi jumlahnya 0.
  cek('Rumus Uniform Asing menjumlah nilai bertanda, ID tetap cacah',
    H(barisTgl, 5) === 0 && H(barisTgl, 6) === 1,
    `uniform=${H(barisTgl, 5)} id=${H(barisTgl, 6)}`);
  cek('Cacah PATUH dipisah dari jumlah mutunya', H(barisTgl, 7) === 1,
    String(H(barisTgl, 7)));
  cek('Persentase Asing terhitung 50%',
    Math.abs(H(barisTgl, 8) - 0.5) < 1e-9 && Math.abs(H(barisTgl, 9) - 0.5) < 1e-9,
    `${H(barisTgl, 8)} / ${H(barisTgl, 9)}`);
  cek('Mutu Uniform dibagi pengantaran, bukan jumlah guide',
    H(barisTgl, 10) === 0, String(H(barisTgl, 10)));
  cek('Rumus Etika Asing menjumlah nilai bertanda (+3 dan -4)',
    H(barisTgl, 11) === -1, String(H(barisTgl, 11)));
  // Domestik hari pertama: G-005 (uniform saja) + G-018 (taat penuh)
  cek('Rumus Domestik terpisah dan tidak tercampur Asing',
    H(barisTgl, 13) === 2 && H(barisTgl, 15) === 2 && H(barisTgl, 16) === 1,
    `hadir=${H(barisTgl, 13)} uniform=${H(barisTgl, 15)} id=${H(barisTgl, 16)}`);
  cek('Kolom GABUNGAN menyatukan kedua kategori',
    Math.abs(H(barisTgl, 23) - 0.75) < 1e-9 && Math.abs(H(barisTgl, 24) - 0.5) < 1e-9,
    `uniform ${H(barisTgl, 23)} · id ${H(barisTgl, 24)}`);
  // Hari keempat: G-005 & G-018 sudah tidak bertugas → Domestik kosong
  cek('Hari tanpa penilaian di satu kategori menghasilkan teks kosong, bukan #DIV/0',
    H(barisTgl + 5, 13) === 0 && H(barisTgl + 5, 18) === '',
    `hadir=${H(barisTgl + 5, 13)} persen="${H(barisTgl + 5, 18)}"`);
  cek('Baris TOTAL menjumlah seluruh tanggal',
    H(barisTotal, 3) === 12 && H(barisTotal, 4) === 12,
    `hadir=${H(barisTotal, 3)} antar=${H(barisTotal, 4)}`);
  cek('Persentase pada baris TOTAL dihitung ulang, bukan dijumlah',
    Math.abs(H(barisTotal, 8) - 0.5) < 1e-9, String(H(barisTotal, 8)));

  /* ---- grafik ---- */
  cek('Satu grafik ketaatan terpasang', dsb.getCharts().length === 1,
    `${dsb.getCharts().length} grafik`);
  const g = dsb.getCharts()[0];
  cek('Grafiknya garis, dua seri: % Uniform dan % ID',
    g.tipe === 'LINE' && g.rentang.length === 2 && g.rentang[1].numCols === 2,
    `${g.tipe}, ${g.rentang.length} rentang`);
  cek('Grafik memakai kolom GABUNGAN (23-24), bukan salah satu kategori',
    g.rentang[1].col === 23, `kolom ${g.rentang[1].col}`);
  cek('Grafik diletakkan di bawah tabel harian, tidak menimpanya',
    g.posisi.row > barisTotal, `baris ${g.posisi.row} vs total ${barisTotal}`);

  sandbox.bangunRekap(BLN);
  const dsb2 = doc.getSheetByName('Dasbor ' + BLN);
  cek('Grafik TIDAK menumpuk saat rekap disusun ulang', dsb2.getCharts().length === 1,
    `${dsb2.getCharts().length} grafik setelah dibangun dua kali`);

  /* ---- tabel peringkat ---- */
  const isiTabel = (judul) => {
    const b = dsb2.data.findIndex(row =>
      (row || []).some(v => String(v ?? '').indexOf(judul) > -1));
    if (b === -1) return null;
    const kol = (dsb2.data[b] || []).findIndex(v => String(v ?? '').indexOf(judul) > -1);
    const out = [];
    for (let r = b + 2; r < dsb2.data.length; r++) {
      const nama = (dsb2.data[r] || [])[kol + 1];
      if (!nama) break;
      out.push({ nama: String(nama), antar: (dsb2.data[r] || [])[kol + 3],
                 jumlah: (dsb2.data[r] || [])[kol + 4], ukuran: (dsb2.data[r] || [])[kol + 5] });
    }
    return out;
  };

  const tertinggi = isiTabel('NILAI TOTAL TERTINGGI');
  cek('Tabel nilai total tertinggi dipimpin guide paling taat',
    !!tertinggi && tertinggi[0].nama === 'Gusti Alit Astawa',
    tertinggi ? `${tertinggi[0].nama} (rata ${tertinggi[0].ukuran})` : 'tabel tidak ketemu');
  cek('Tabel memuat jumlah, rata-rata, DAN cacah pengantaran sekaligus',
    tertinggi[0].antar === 6 && tertinggi[0].jumlah === 6 * (1 + 1 + 3) &&
    Math.abs(tertinggi[0].ukuran - 5) < 0.01,
    `antar=${tertinggi[0].antar} jumlah=${tertinggi[0].jumlah} rata=${tertinggi[0].ukuran}`);

  const terendah = isiTabel('NILAI TOTAL TERENDAH');
  cek('Tabel nilai total terendah dipimpin guide paling bermasalah',
    terendah[0].nama === 'I Gede Dauh', terendah[0].nama);

  const taat = isiTabel('PALING TAAT BERPAKAIAN & ID');
  const takTaat = isiTabel('PALING TIDAK TAAT BERPAKAIAN & ID');
  cek('Peringkat ketaatan berpakaian & ID benar di kedua ujungnya',
    taat[0].nama === 'Gusti Alit Astawa' && Math.abs(taat[0].ukuran - 1) < 0.001 &&
    takTaat[0].nama === 'I Gede Dauh' && Math.abs(takTaat[0].ukuran) < 0.001,
    `taat: ${taat[0].nama} ${taat[0].ukuran} | tidak: ${takTaat[0].nama} ${takTaat[0].ukuran}`);
  cek('Guide yang hanya taat separuh kriteria ada di antara keduanya',
    (isiTabel('PALING TAAT BERPAKAIAN & ID').find(x => x.nama === 'I Gede Darta') || {}).ukuran === 0.5,
    String((taat.find(x => x.nama === 'I Gede Darta') || {}).ukuran));

  const etikaAtas = isiTabel('ETIKA TERTINGGI');
  const etikaBawah = isiTabel('ETIKA TERENDAH');
  cek('Peringkat etika memakai rata-rata bertanda, bukan nilai mutlak',
    etikaAtas[0].nama === 'Gusti Alit Astawa' && etikaAtas[0].ukuran === 3 &&
    etikaBawah[0].nama === 'I Gede Dauh' && etikaBawah[0].ukuran === -4,
    `${etikaAtas[0].ukuran} / ${etikaBawah[0].ukuran}`);

  /* ---- syarat minimal hadir ---- */
  const semuaTabelPeringkat = ['NILAI TOTAL TERTINGGI', 'NILAI TOTAL TERENDAH',
    'PALING TAAT BERPAKAIAN & ID', 'PALING TIDAK TAAT BERPAKAIAN & ID',
    'ETIKA TERTINGGI', 'ETIKA TERENDAH'];
  const munculDiPeringkat = semuaTabelPeringkat.some(j =>
    (isiTabel(j) || []).some(x => x.nama === 'I Gede Suweca'));
  cek('Guide dengan 1 pengantaran TIDAK menyusup ke peringkat', !munculDiPeringkat);
  const belum = isiTabel('BELUM CUKUP PENGANTARAN');
  cek('...tapi tetap didaftar di bagian "belum cukup pengantaran"',
    !!belum && belum.some(x => x.nama === 'I Gede Suweca'),
    belum ? belum.map(x => x.nama).join(', ') : 'tabel tidak ketemu');

  /* ---- review manual ikut terbaca ---- */
  const a1 = doc.getSheetByName(`Rekap A1 ${BLN}`);
  const barisGuide = a1.data.findIndex(b => String((b || [])[0] ?? '') === 'Gusti Alit Astawa') + 1;
  // Kolom REVIEW untuk tanggal pertama: 2 + 0*6 + 2 = kolom 4
  a1.getRange(barisGuide, 4).setValue(7);
  sandbox.bangunRekap(BLN);
  const dsb3 = doc.getSheetByName('Dasbor ' + BLN);
  const cariReview = () => {
    const b = dsb3.data.findIndex(row =>
      (row || []).some(v => String(v ?? '').indexOf('MENERIMA REVIEW PALING BANYAK') > -1));
    const kol = (dsb3.data[b] || []).findIndex(v => String(v ?? '').indexOf('MENERIMA REVIEW') > -1);
    return { nama: String((dsb3.data[b + 2] || [])[kol + 1] ?? ''),
             ukuran: (dsb3.data[b + 2] || [])[kol + 5] };
  };
  const rv = cariReview();
  cek('Peringkat review membaca angka yang diketik tim di tab Rekap',
    rv.nama === 'Gusti Alit Astawa' && rv.ukuran === 7,
    `${rv.nama} = ${rv.ukuran}`);
  // Nilai TOTAL = Uniform + ID + Etika + Review, jadi review 7 yang baru
  // diketik harus menaikkan jumlahnya dari 20 menjadi 27.
  const isiTabel3 = (judul) => {
    const b = dsb3.data.findIndex(row => (row || []).some(v => String(v ?? '').indexOf(judul) > -1));
    const kol = (dsb3.data[b] || []).findIndex(v => String(v ?? '').indexOf(judul) > -1);
    const out = [];
    for (let r = b + 2; r < dsb3.data.length; r++) {
      const nama = (dsb3.data[r] || [])[kol + 1];
      if (!nama) break;
      out.push({ nama: String(nama), jumlah: (dsb3.data[r] || [])[kol + 4],
                 ukuran: (dsb3.data[r] || [])[kol + 5] });
    }
    return out;
  };
  const puncak = isiTabel3('NILAI TOTAL TERTINGGI')[0];
  // 6 pengantaran x (uniform 1 + ID 1 + etika 3) = 30, ditambah review manual 7.
  // Rata-ratanya dibagi PENGANTARAN: 37 / 6.
  cek('Review manual ikut menaikkan nilai TOTAL, bukan hanya peringkat review',
    puncak.nama === 'Gusti Alit Astawa' && puncak.jumlah === 37 &&
    Math.abs(puncak.ukuran - 37 / 6) < 0.01,
    `jumlah=${puncak.jumlah} rata=${puncak.ukuran}`);

  cek('Pesan bangunRekap menyebut hasil dasbor',
    /dasbor: \d+ guide diperingkat/.test(sandbox.bangunRekap(BLN)),
    (sandbox.bangunRekap(BLN).match(/dasbor:[^|]*/) || [''])[0].trim());
}

const sebelumUji = doc.getSheetByName('Evaluations').getLastRow();
const uji = ujiCepat();
const sesudahUji = doc.getSheetByName('Evaluations').getLastRow();
cek('ujiCepat() bawaan berjalan & membersihkan barisnya',
  uji.indexOf('GAGAL') === -1 && sesudahUji === sebelumUji,
  `baris ${sebelumUji} → ${sesudahUji}`);

/* ---------------- Laporan bulanan cetak (11_Laporan.gs) ----------------
   Modul ini sebelumnya tidak diuji sama sekali, padahal ia MEMBACA hasil
   08_Peringkat.gs lewat lapisan pemetaan nama medan. Kalau pemetaannya meleset
   setelah satuan berubah jadi pengantaran, laporannya tetap tersusun rapi —
   hanya angkanya diam-diam nol. Itu kegagalan yang paling sulit terlihat. */
{
  const BLN = '2034-03';
  const P = (obj) => JSON.parse(doPost({ postData: { contents: JSON.stringify(obj) } }).getContent());
  const kirim = (id, gid, pos, tgl, uni, idc, etika) => P({
    evaluationId: id, guideId: gid, guideName: 'x', pos,
    timestamp: tgl + 'T03:00:00.000Z',
    criteria: { uniform: uni, idCard: !!idc, etika }, catatan: '',
  });

  // Angkanya dipilih supaya CACAH patuh dan JUMLAH nilai Uniform BERBEDA.
  // Versi pertama uji ini memakai data yang kebetulan membuat keduanya sama
  // besar, sehingga kolom yang keliru memakai jumlah nilai tetap lolos —
  // dan bug itu baru ketahuan di laporan sungguhan.
  //   G-001 : 6 pengantaran +2      -> patuh 6, jumlah nilai 12
  //   G-006 : 3 pengantaran -1, 3 +1 -> patuh 3, jumlah nilai 0
  //   total : antar 12, patuh 9, jumlah nilai 12, mutu 12/12 = 1,00
  ['01', '02', '03', '04', '05', '06'].forEach((d, i) => {
    kirim(`lap-a-${i}`, 'G-001', 1, `2034-03-${d}`, 2, 1, 3);
    kirim(`lap-b-${i}`, 'G-006', 1, `2034-03-${d}`, i % 2 === 0 ? -1 : 1, 0, -2);
  });
  sandbox.bangunRekap(BLN);

  let gagalLap = null;
  try { sandbox.bangunLaporan_(BLN); } catch (e) { gagalLap = e; }
  cek('bangunLaporan_() berjalan tanpa error pada model baru',
    !gagalLap, gagalLap ? String(gagalLap) : 'selesai');

  if (!gagalLap) {
    const namaLap = doc.getSheets().map(x => x.nama).find(n => n.indexOf('Laporan') === 0);
    cek('Tab laporan terbentuk', !!namaLap,
      namaLap || doc.getSheets().map(x => x.nama).join(', '));

    const shLap = doc.getSheetByName(namaLap);
    const teksLap = shLap.data.map(b => (b || []).map(v => String(v ?? '')).join('|')).join('\n');

    cek('Laporan memakai istilah pengantaran, bukan guide-hari',
      teksLap.indexOf('Jumlah pengantaran dinilai') > -1 && teksLap.indexOf('guide-hari') === -1,
      teksLap.indexOf('Jumlah pengantaran dinilai') > -1 ? 'istilah baru dipakai' : 'masih istilah lama');

    cek('Laporan melaporkan mutu berpakaian pada skala -1..+2',
      teksLap.indexOf('Mutu berpakaian') > -1);

    const cariLap = (label) => {
      const baris = shLap.data.find(b => String((b || [])[0] ?? '').indexOf(label) === 0);
      return baris ? baris.find((v, i) => i > 0 && v !== '' && v !== null && v !== undefined) : undefined;
    };
    cek('Jumlah pengantaran terbaca dari 08_Peringkat.gs, bukan nol',
      cariLap('Jumlah pengantaran dinilai') === 12,
      String(cariLap('Jumlah pengantaran dinilai')));
    cek('Cacah berseragam sesuai memakai PATUH, bukan jumlah nilai Uniform',
      cariLap('Pengantaran berseragam sesuai') === 9,
      `${cariLap('Pengantaran berseragam sesuai')} (harus 9, bukan 12 yang jumlah nilainya)`);
    const mutuLap = cariLap('Mutu berpakaian');
    cek('Mutu berpakaian dihitung dari jumlah nilai bertanda, bukan cacah',
      Math.abs(Number(mutuLap) - 1) < 0.001, String(mutuLap));

    // Baris penjumlah tabel ikut diperiksa. Ringkasan di bagian A sempat benar
    // sementara baris "SELURUH GUIDE" di tabel B masih memakai jumlah nilai —
    // memeriksa ringkasannya saja tidak cukup.
    const barisTabel = (label) => shLap.data.find(b => String((b || [])[0] ?? '') === label);
    const seluruh = barisTabel('SELURUH GUIDE');
    cek('Baris SELURUH GUIDE memakai cacah patuh, bukan jumlah nilai Uniform',
      !!seluruh && seluruh[3] === 9,
      seluruh ? `antar=${seluruh[2]} seragam sesuai=${seluruh[3]} (harus 9)` : 'baris tidak ketemu');
    cek('Baris SELURUH GUIDE tidak memuat angka rusak',
      !!seluruh && seluruh.slice(1, 9).every(v => typeof v !== 'number' || isFinite(v)),
      seluruh ? seluruh.slice(1, 9).join(' | ') : '-');

    const jumlahA1 = barisTabel('JUMLAH REGU A1');
    cek('Baris JUMLAH REGU juga memakai cacah patuh',
      !!jumlahA1 && jumlahA1[3] === 6,
      jumlahA1 ? `seragam sesuai=${jumlahA1[3]} (harus 6)` : 'baris tidak ketemu');

    // NaN masuk ke Sheets sebagai #NUM!. Satu guide terdaftar tanpa data sudah
    // cukup membuat seluruh ringkasan rusak, dan di spreadsheet asli ada
    // ratusan guide seperti itu — jadi ini harus dijaga menyeluruh.
    const adaNaN = shLap.data.some(b => (b || []).some(v => typeof v === 'number' && !isFinite(v)));
    cek('Tidak ada satu pun angka NaN/#NUM! di seluruh laporan', !adaNaN,
      adaNaN ? 'masih ada angka rusak' : 'bersih');
  }
}

/* ---------------- Laporan bagian C membaca kolom Dasbor yang BENAR ----------------
   Bagian C menyalin angka harian dari tab Dasbor. Dulu kolomnya ditunjuk dengan
   nomor tetap untuk susunan 18 kolom; sejak Dasbor melebar jadi 24 kolom, nomor
   itu menunjuk kolom lain tanpa satu pun error. Uji laporan sebelumnya tidak
   menangkapnya karena tiruan tab menyimpan RUMUS dan tanggal berupa TEKS,
   sehingga bagian C selalu kosong. Di sini rumus Dasbor dihitung jadi angka dan
   tanggalnya dijadikan Date — persis yang dilihat Apps Script. */
{
  const BLN = '2035-08';
  const P = (obj) => JSON.parse(doPost({ postData: { contents: JSON.stringify(obj) } }).getContent());
  const kirim = (id, gid, tgl, jam, uni, idc, etika) => P({
    evaluationId: id, guideId: gid, guideName: 'x', pos: 1,
    timestamp: `${tgl}T${jam}:00:00.000Z`,
    criteria: { uniform: uni, idCard: !!idc, etika }, catatan: '',
  });
  // 6 Agt: Asing 3 pengantaran (G-001 dua kali, G-006 sekali), Domestik 1 (G-018)
  // 7 Agt: Asing 1 pengantaran (G-001)
  // Angkanya dipilih supaya kolom lama dan kolom baru tidak mungkin kebetulan sama.
  kirim('lc-1', 'G-001', '2035-08-06', '01', 2, 1, 2);
  kirim('lc-2', 'G-001', '2035-08-06', '04', -1, 1, -1);
  kirim('lc-3', 'G-006', '2035-08-06', '01', 1, 0, 1);
  kirim('lc-4', 'G-018', '2035-08-06', '01', -1, 1, 3);
  kirim('lc-5', 'G-001', '2035-08-07', '01', 1, 0, 0);
  sandbox.bangunRekap(BLN);
  const d1 = doc.getSheetByName(`Rekap D1 ${BLN}`);
  const kolTgl = (d1.data[1] || []).findIndex(v => String(v ?? '') === 'TGL: 6-8-2035') + 1;
  const brsG18 = d1.data.findIndex(b => String((b || [])[0] ?? '') === 'I Gede Suweca') + 1;
  d1.getRange(brsG18, kolTgl + 2).setValue(4);          // review 4 untuk G-018, 6 Agt
  sandbox.bangunRekap(BLN);

  // Tab Dasbor seperti yang dibaca Apps Script: rumus -> angka, tanggal -> Date
  const DateCtx = vm.runInContext('Date', sandbox);
  const dsb = doc.getSheetByName('Dasbor ' + BLN);
  const terhitung = dsb.data.map(b => (b || []).map(v => hitungRumus(doc, dsb, v)));
  terhitung.forEach((b, i) => {
    const m = String(b[0] ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) b[0] = new DateCtx(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    dsb.data[i] = b;
  });

  const K = typeof sandbox.lapKolomDasbor_ === 'function'
    ? sandbox.lapKolomDasbor_(dsb.getRange(1, 1, dsb.getLastRow(), dsb.getLastColumn()).getValues())
    : null;
  cek('Kolom Dasbor dikenali lewat kepalanya', !!K,
    K ? `Hadir D=${K.hadirD} · Antar A=${K.antarA} · GABUNGAN=${K.gabU}/${K.gabId}` : 'tidak dikenali');

  const harian = sandbox.lapAmbilHarian_(BLN);
  cek('Bagian C membaca kedua tanggal dari tab Dasbor', harian.length === 2, `${harian.length} tanggal`);
  const h6 = harian[0] || {}, h7 = harian[1] || {};
  cek('Hadir Domestik dibaca dari kolom Hadir DOMESTIK, bukan Mutu Uni Asing',
    h6.hadirA === 2 && h6.hadirD === 1 && h6.hadir === 3,
    `6 Agt: hadir A=${h6.hadirA} D=${h6.hadirD} (harus 2 dan 1)`);
  cek('% Uniform & % ID-Card dibaca dari kolom GABUNGAN',
    Math.abs(h6.gabU - 0.5) < 1e-9 && Math.abs(h6.gabId - 0.75) < 1e-9 &&
    Math.abs(h7.gabU - 1) < 1e-9 && Math.abs(h7.gabId) < 1e-9,
    `6 Agt: ${h6.gabU} / ${h6.gabId} (harus 0.5 / 0.75) · 7 Agt: ${h7.gabU} / ${h7.gabId}`);
  cek('Etika & Review menjumlah kolom Etika/Review Asing dan Domestik',
    h6.etika === 5 && h6.review === 4, `6 Agt: etika=${h6.etika} (harus 5) review=${h6.review} (harus 4)`);
  cek('Cacah Antar, Patuh, ID ikut terbaca untuk baris TOTAL',
    h6.antar === 4 && h6.patuh === 2 && h6.idCard === 3 && h7.antar === 1,
    `6 Agt: antar=${h6.antar} patuh=${h6.patuh} id=${h6.idCard} · 7 Agt antar=${h7.antar}`);

  let gagalLap = null;
  try { sandbox.bangunLaporan_(BLN); } catch (e) { gagalLap = e; }
  cek('Laporan dengan bagian harian berisi tersusun tanpa error', !gagalLap,
    gagalLap ? String(gagalLap) : 'selesai');
  if (!gagalLap) {
    const lap = doc.getSheetByName('Laporan ' + BLN);
    const total = lap.data.find(b => String((b || [])[0] ?? '') === 'TOTAL');
    // Ditimbang PENGANTARAN: patuh 3 dari 5, ID 3 dari 5. Rata-rata persen
    // harian yang ditimbang jumlah guide memberi 62,5% dan 56,25%.
    cek('Baris TOTAL bagian C menghitung persen dari cacah pengantaran',
      !!total && Math.abs(total[5] - 0.6) < 1e-9 && Math.abs(total[6] - 0.6) < 1e-9,
      total ? `% Uniform=${total[5]} % ID=${total[6]} (harus 0.6 dan 0.6)` : 'baris TOTAL tidak ketemu');
    cek('Grafik ketaatan bagian C terpasang sekali', lap.getCharts().length === 1,
      `${lap.getCharts().length} grafik`);
  }
}

const gagal = hasil.filter(h => !h.ok);
console.log(`\n${hasil.length - gagal.length}/${hasil.length} pemeriksaan lulus`);
process.exit(gagal.length ? 1 : 0);
