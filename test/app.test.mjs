/**
 * Uji fungsional aplikasi (tanpa browser) memakai jsdom + fake-indexeddb.
 * Menjalankan index.html sungguhan beserta db.js, sync.js, app.js.
 *
 *   npm i jsdom fake-indexeddb
 *   node server/server.js      # terminal 1
 *   node test/app.test.mjs     # terminal 2
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import 'fake-indexeddb/auto';

// fileURLToPath, bukan .pathname — di Windows .pathname memberi "/D:/..."
const APP = process.env.APP_DIR || path.resolve(url.fileURLToPath(new URL('..', import.meta.url)));

/**
 * Tanpa BASE, rangkaian uji menyalakan servernya SENDIRI di port acak dengan
 * folder data sementara, lalu mematikannya di akhir.
 *
 * Dulu server harus dinyalakan manual di terminal lain dan datanya menumpuk di
 * server/data. Itu jadi masalah begitu server REST ikut menegakkan aturan
 * "satu pos hanya menilai satu guide sekali per hari": run kedua pada hari yang
 * sama akan bertabrakan dengan data run pertama, dan tesnya gagal karena
 * sisa data — bukan karena kodenya salah.
 *
 * BASE tetap dihormati untuk menguji server yang sedang berjalan:
 *   BASE=http://localhost:3199 node test/app.test.mjs
 */
let serverProc = null;
let dataDir = null;
async function siapkanServer() {
  if (process.env.BASE) return process.env.BASE;
  const port = 3200 + Math.floor(Math.random() * 600);
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'besakih-uji-'));
  serverProc = spawn(process.execPath, [path.join(APP, 'server', 'server.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: 'ignore',
  });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + '/api/health')).ok) return base;
    } catch { /* belum siap */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('server uji tidak kunjung siap di ' + base);
}
function tutupServer() {
  if (serverProc) { try { serverProc.kill(); } catch {} serverProc = null; }
  if (dataDir) { try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {} dataDir = null; }
}
process.on('exit', tutupServer);

const BASE = await siapkanServer();

const results = [];
const check = (id, ok, note = '') => { results.push({ id, ok, note }); console.log(`${ok ? '✅' : '❌'} ${id}${note ? ' — ' + note : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- siapkan DOM ---------- */
const html = fs.readFileSync(path.join(APP, 'public', 'index.html'), 'utf8');

/**
 * Urutan skrip DIBACA dari index.html, bukan ditulis ulang di sini. Setelah
 * app.js dipecah jadi delapan modul, daftar yang dijiplak manual pasti akan
 * meleset dari yang sungguhan dipakai browser — dan tesnya tetap hijau sambil
 * menguji susunan yang salah. Membacanya dari sumber membuat hal itu mustahil.
 */
const BERKAS_SKRIP = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
if (!BERKAS_SKRIP.length) { console.error('❌ tidak ada tag <script src> di index.html'); process.exit(1); }

const vc = new VirtualConsole();
const jsErrors = [];
vc.on('jsdomError', e => jsErrors.push(e.message));
vc.on('error', (...a) => jsErrors.push(a.join(' ')));

const dom = new JSDOM(html, {
  url: BASE + '/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const { window } = dom;

// polyfill lingkungan browser yang tidak ada di jsdom
window.indexedDB = globalThis.indexedDB;
window.IDBKeyRange = globalThis.IDBKeyRange;
Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
window.isSecureContext = true;
window.fetch = (...a) => fetch(...a);
// AbortController/AbortSignal WAJIB berasal dari realm yang sama dengan fetch
// di atas. jsdom punya versinya sendiri, dan sejak Node 24 undici menolak
// sinyal dari realm lain: «Expected signal ("AbortSignal {}") to be an
// instance of AbortSignal». Akibatnya SETIAP panggilan lewat fetchWithTimeout
// gagal, daftar guide kosong, dan puluhan pemeriksaan sesudahnya ikut roboh
// dengan sebab yang menyesatkan. Di browser sungguhan keduanya memang serealm,
// jadi ini murni cacat rig pengujian — bukan cacat aplikasi.
window.AbortController = globalThis.AbortController;
window.AbortSignal = globalThis.AbortSignal;
// Blob dibungkus supaya isi berkas yang diunduh bisa diperiksa, bukan hanya namanya
const blobTerakhir = { isi: '' };
window.Blob = class extends globalThis.Blob {
  constructor(bagian, opsi) { super(bagian, opsi); blobTerakhir.isi = bagian.join(''); }
};
// jsdom versi baru tidak lagi memasang TextEncoder/TextDecoder di window
window.TextEncoder = globalThis.TextEncoder;
window.TextDecoder = globalThis.TextDecoder;
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
window.confirm = () => true;
window.alert = () => {};
window.scrollTo = () => {};   // jsdom belum mengimplementasikan scrollTo
let online = true;
Object.defineProperty(window.navigator, 'onLine', { get: () => online, configurable: true });
const downloads = [];
window.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };

/* Pemeriksaan statis config.js — dijalankan sebelum aplikasi dimuat.
   Menjaga agar alamat server tidak pernah tidak sengaja terkirim dalam
   keadaan kosong, yang membuat aplikasi tidak siap pakai di perangkat baru. */
const isiConfig = fs.readFileSync(path.join(APP, 'public', 'config.js'), 'utf8');
const cocokUrl = isiConfig.match(/serverUrl:\s*'([^']*)'/);
check('config.js berisi alamat server (aplikasi siap pakai tanpa setting manual)',
  !!cocokUrl && /^https?:\/\/\S+$/.test(cocokUrl[1]),
  cocokUrl && cocokUrl[1] ? cocokUrl[1].slice(0, 42) + '…' : '(kosong)');

// jalankan skrip aplikasi berurutan
for (const f of BERKAS_SKRIP) {
  window.eval(fs.readFileSync(path.join(APP, 'public', f), 'utf8'));
}

/* Selama pengujian, arahkan ke server Node lokal — bukan ke Apps Script
   sungguhan di config.js — supaya pengujian tidak menyentuh data produksi. */
window.localStorage.setItem('besakih.settings', JSON.stringify({ serverUrl: BASE }));
if (window.document.readyState === 'loading') {
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
}
await sleep(1500);

const $ = s => window.document.querySelector(s);
const $$ = s => Array.from(window.document.querySelectorAll(s));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const setVal = (el, v) => { el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); el.dispatchEvent(new window.Event('change', { bubbles: true })); };

/* ---------- AC-1 ---------- */
check('AC-1 aplikasi terbuka tanpa login',
  $$('input[type=password]').length === 0 && !$('#view-home').hidden);

/* ---------- Tutorial ---------- */
check('Tutorial tampil pada pemakaian pertama', !$('#tutorial').hidden);
for (let i = 0; i < 4; i++) { click($('#tutNext')); }
check('Tutorial dapat diselesaikan & tidak muncul lagi',
  $('#tutorial').hidden && window.localStorage.getItem('besakih.tutorialDone') === '1');

/* ---------- AC-2 ---------- */
const nOpt = $$('#guideList option').length;
check('AC-2 daftar guide >= 10 & dapat dipilih', nOpt >= 10, `${nOpt} guide dari server`);

/* ---------- Filter Kategori & Regu ---------- */
{
  const semua = $$('#guideList option').length;
  const pilih = (kat, regu) => {
    setVal($('#filterKategori'), kat);
    setVal($('#filterRegu'), regu);
    return $$('#guideList option').length;
  };

  const asing = pilih('Asing', '');
  const domestik = pilih('Domestik', '');
  check('Filter kategori memperkecil daftar guide',
    asing > 0 && domestik > 0 && asing < semua && domestik < semua,
    `semua ${semua} · Asing ${asing} · Domestik ${domestik}`);

  const a1 = pilih('Asing', '1');
  const a2 = pilih('Asing', '2');
  check('Filter regu mempersempit lagi', a1 > 0 && a2 > 0 && a1 < asing && a2 < asing,
    `Asing-1 ${a1} · Asing-2 ${a2}`);

  // Dulu 15 record memuat regu ganda ("A1, A2") karena dikira satu orang
  // merangkap. Ternyata itu dua orang berbeda yang kebetulan bernama sama, dan
  // penggabungan itulah yang membuat penilaian orang kedua ditolak sebagai
  // duplikat pos. Sekarang tiap orang punya guideId sendiri.
  const daftar = (await (await fetch(BASE + '/api/guides')).json()).guides;
  const rangkap = daftar.filter(g => (g.regu || '').indexOf(',') > -1);
  check('Tidak ada lagi record guide yang regunya digabung', rangkap.length === 0,
    rangkap.map(g => `${g.guideId} ${g.regu}`).join(', ')
      || `${daftar.length} record, satu regu masing-masing`);

  // Kemampuan regu ganda tetap ada di kode untuk berjaga-jaga. Uji logikanya
  // langsung, bukan menumpang data — dulu pemeriksaan ini dibungkus `if` dan
  // begitu contohnya hilang dari data, ia berhenti jalan tanpa bersuara.
  const ganda = { regu: 'A1, D2' };
  check('Guide beregu ganda tetap cocok di setiap regunya',
    window.App.cocokFilter(ganda, 'Asing', '1') &&
    window.App.cocokFilter(ganda, 'Domestik', '2') &&
    !window.App.cocokFilter(ganda, 'Asing', '2'),
    window.App.labelRegu(ganda.regu));

  pilih('', '');
  check('Filter dikosongkan menampilkan seluruh guide', $$('#guideList option').length === semua);

  // Filter tersimpan agar tidak perlu diatur ulang
  pilih('Domestik', '2');
  check('Pilihan filter tersimpan di Pengaturan',
    window.Sync.Settings.get().filterKategori === 'Domestik' &&
    window.Sync.Settings.get().filterRegu === '2');
  pilih('', '');
}

/* ---------- AC-6 burger menu ---------- */
click($('#btnMenu'));
check('AC-6 burger menu terbuka', !$('#drawer').hidden && $$('.navitem').length === 6);
const views = ['nilai', 'guides', 'riwayat', 'pengaturan', 'tentang', 'home'];
let ok = true;
for (const v of views) {
  click($(`.navitem[data-nav="${v}"]`) || $('#btnNewEval'));
  const nav = $$('.navitem').find(n => n.dataset.nav === v);
  if (nav) click(nav);
  await sleep(30);
  if ($('#view-' + v).hidden) { ok = false; console.log('   layar gagal:', v); }
}
check('AC-6 semua layar (Penilaian, Guide, Riwayat, Pengaturan, Tentang) dapat dibuka', ok);

/* ---------- AC-3 simpan lokal ---------- */
click($('#btnNewEval'));
await sleep(50);
setVal($('#guideInput'), 'I Wayan Sweta');
click($('[data-crit=idCard] .seg.yes'));
click($('[data-crit=uniform] .seg.no'));
click($('[data-crit=etika] .stepbtn[data-step="1"]'));
click($('[data-crit=etika] .stepbtn[data-step="1"]'));
setVal($('#catatan'), 'uji otomatis');
// Draft ditulis tertunda (DB.simpanDraft menunda ±400 ms) karena enkripsinya
// asinkron dan saveDraft() dipanggil pada setiap ketikan.
await sleep(600);
const draftMentah = window.localStorage.getItem('besakih.draft');
check('Draft otomatis tersimpan sebelum submit', !!draftMentah);
// §5: isi draft sama dengan isi penilaian, jadi tidak boleh tergeletak polos
// sementara penilaiannya dienkripsi.
check('Draft tersimpan terenkripsi, bukan teks polos',
  !!draftMentah && !draftMentah.includes('I Wayan Sweta') && !draftMentah.includes('uji otomatis'),
  (draftMentah || '').slice(0, 46) + '…');
check('Draft terenkripsi tetap bisa dibaca kembali oleh aplikasi',
  (await window.DB.bacaDraft() || {}).catatan === 'uji otomatis');

$('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(700);
let counts = await window.DB.counts();
check('AC-3 penilaian tersimpan di IndexedDB', counts.total === 1, `${counts.total} entri`);

const saved = (await window.DB.all())[0];
const dariServer = (await (await fetch(BASE + '/api/guides')).json()).guides;
const seharusnya = dariServer.find(g => g.guideName === 'I Wayan Sweta');
check('Model data sesuai PRD §7',
  !!saved.evaluationId && saved.guideId === seharusnya.guideId && saved.pos === 1 &&
  !isNaN(Date.parse(saved.timestamp)) &&
  saved.criteria.idCard === true && saved.criteria.uniform === false && saved.criteria.etika === 2,
  JSON.stringify({ guideId: saved.guideId, pos: saved.pos, criteria: saved.criteria }));

/* ---------- Etika boleh minus & dibatasi -5..+5 ---------- */
click($('#btnNewEval'));
await sleep(50);
for (let i = 0; i < 9; i++) click($('[data-crit=etika] .stepbtn[data-step="-1"]'));
check('Etika bisa turun sampai -5 dan berhenti di situ',
  $('#etikaNilai').textContent === '-5', $('#etikaNilai').textContent);
check('Tombol − mati setelah menyentuh batas bawah',
  $('[data-crit=etika] .stepbtn[data-step="-1"]').hasAttribute('disabled'));
for (let i = 0; i < 12; i++) click($('[data-crit=etika] .stepbtn[data-step="1"]'));
check('Etika berhenti di +5 dan diberi tanda plus',
  $('#etikaNilai').textContent === '+5', $('#etikaNilai').textContent);
check('Kriteria Review sudah tidak ada di layar penilaian',
  $('[data-crit=review]') === null);

/* ---------- Enkripsi ---------- */
check('Enkripsi AES-256-GCM aktif', window.DB.isEncryptionActive() === true);
const raw = await new Promise(res => {
  const r = window.indexedDB.open('besakih-guide-eval');
  r.onsuccess = () => {
    const t = r.result.transaction('evaluations', 'readonly');
    t.objectStore('evaluations').getAll().onsuccess = e => res(e.target.result[0]);
  };
});
check('Data lokal terenkripsi (nama guide tidak terbaca mentah)',
  raw.enc === true && !JSON.stringify(raw).includes('Wayan'));

// Kunci harus punya salinan di IndexedDB, berdampingan dengan datanya. Kalau
// kunci hanya ada di localStorage, sekali localStorage dibersihkan browser
// SELURUH penilaian lama berubah jadi "(data rusak)" walau isinya masih utuh.
{
  const kunciMeta = await new Promise(res => {
    const r = window.indexedDB.open('besakih-guide-eval');
    r.onsuccess = () => {
      const t = r.result.transaction('meta', 'readonly');
      t.objectStore('meta').get('cryptoKey').onsuccess = e => res(e.target.result);
    };
  });
  const kunciLocal = window.localStorage.getItem('besakih.cryptoKey');
  check('Kunci enkripsi punya salinan di IndexedDB (tahan localStorage dibersihkan)',
    !!(kunciMeta && kunciMeta.v && kunciMeta.v.k) &&
    JSON.stringify(kunciMeta.v) === JSON.stringify(JSON.parse(kunciLocal)),
    kunciMeta && kunciMeta.v ? 'salinan cocok dengan localStorage' : 'salinan tidak ada');
}

/* ---------- AC-5 sync ---------- */
await window.Sync.syncNow({ force: true });
await sleep(600);
counts = await window.DB.counts();
check('AC-5 data terkirim & status menjadi ✅', counts.synced === 1 && counts.pending === 0,
  `terkirim ${counts.synced}, tertunda ${counts.pending}`);

const health = await (await fetch(BASE + '/api/health')).json();
check('Data benar-benar tersimpan di server', health.total >= 1, `total server ${health.total}`);

/* ---------- Validasi form ---------- */
click($('#btnNewEval')); await sleep(30);
setVal($('#guideInput'), 'Nama Tidak Terdaftar');
$('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(300);
check('Guide tidak valid ditolak (tidak tersimpan)', (await window.DB.counts()).total === 1);

// Ketikan ambigu tidak boleh ditebak: "Darta" cocok untuk 14 nama, dan menebak
// yang pertama berarti penilaian tercatat atas nama orang yang salah.
setVal($('#guideInput'), 'Darta');
$('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(300);
check('Nama ambigu tidak disimpan diam-diam ke guide pertama yang mirip',
  (await window.DB.counts()).total === 1);
check('Kandidat nama yang mungkin dimaksud ditawarkan',
  !$('#guideAmbigu').hidden && $('#guideAmbigu').textContent.includes('Maksud Anda'),
  $('#guideAmbigu').textContent.slice(0, 60));
check('#guideCount tidak ikut terhapus saat kandidat tampil', !!$('#guideCount'));

// Hitungan "Total Hari Ini" harus memakai tanggal setempat, bukan potongan ISO
{
  const lokal = window.DB.tanggalLokal;
  const p = n => String(n).padStart(2, '0');
  const d = new Date('2026-08-02T23:30:00.000Z');   // 3 Agustus 07.30 di WITA
  check('tanggalLokal() memakai zona perangkat, bukan potongan ISO/UTC',
    lokal(d.toISOString()) === `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    `${d.toISOString().slice(0, 10)} (UTC) → ${lokal(d.toISOString())} (setempat)`);
}

setVal($('#guideInput'), 'I Wayan Jiguh');
$('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(300);
check('Kriteria belum lengkap ditolak', (await window.DB.counts()).total === 1);

/* ---------- AC-4 offline ---------- */
online = false;
window.dispatchEvent(new window.Event('offline'));
await sleep(100);
check('AC-4 badge offline tampil & UI tetap responsif',
  $('#netBadge').classList.contains('offline') && $('#netBadge .netlabel').textContent === 'Offline');

click($('[data-crit=idCard] .seg.no'));
click($('[data-crit=uniform] .seg.yes'));
click($('[data-crit=etika] .stepbtn[data-step="1"]'));
$('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(600);
counts = await window.DB.counts();
check('AC-4 penilaian tetap tersimpan saat offline', counts.total === 2 && counts.pending === 1,
  `total ${counts.total}, tertunda ${counts.pending}`);

const skipped = await window.Sync.syncNow();
check('Sync tidak dipaksa berjalan saat offline', skipped.skipped === 'offline');

/* ---------- AC-5 kembali online ---------- */
online = true;
window.dispatchEvent(new window.Event('online'));
await sleep(2500);
counts = await window.DB.counts();
check('AC-5 antrean terkirim otomatis begitu online', counts.pending === 0 && counts.synced === 2,
  `tertunda ${counts.pending}, terkirim ${counts.synced}`);

/* ---------- Riwayat ---------- */
const navRiwayat = $$('.navitem').find(n => n.dataset.nav === 'riwayat');
click(navRiwayat); await sleep(400);
const icons = $$('#historyList .card .cstat').map(e => e.textContent.trim());
check('Riwayat menampilkan status sync per entri', icons.length === 2 && icons.every(i => i === '✅'), icons.join(' '));

click($('.chip[data-filter=pending]')); await sleep(300);
check('Filter "Tertunda" bekerja', $$('#historyList .card').length === 0);
click($('.chip[data-filter=synced]')); await sleep(300);
check('Filter "Terkirim" bekerja', $$('#historyList .card').length === 2);

/* ---------- Export rekap CSV ---------- */
downloads.length = 0;
blobTerakhir.isi = '';
click($('#btnExportCsv'));
await sleep(400);
check('Export rekap menghasilkan file', downloads.length === 1 && /^rekap-penilaian-.*\.csv$/.test(downloads[0]),
  downloads[0] || '-');

const csv = blobTerakhir.isi;
const barisCsv = csv.split('\r\n');
// DUMP_CSV=1 mencetak isi berkasnya, berguna saat menyetel format ekspor
if (process.env.DUMP_CSV) console.log('\n----- isi rekap-penilaian.csv -----\n' + csv.replace(/^﻿/, '') + '\n-----\n');
// Excel berbahasa Indonesia memakai ';' sebagai pemisah daftar; tanpa penanda
// ini seluruh berkas menumpuk di satu kolom saat dibuka.
check('CSV memakai pemisah yang dikenali Excel Indonesia',
  barisCsv[0] === '﻿sep=;' || barisCsv[0] === 'sep=;', JSON.stringify(barisCsv[0]));
check('Rekap memuat bagian per guide, per pos, dan per tanggal',
  ['REKAP HARIAN PER GUIDE', 'REKAP PER POS PEMERIKSAAN', 'REKAP PER TANGGAL', 'RINCIAN SEMUA PENILAIAN']
    .every(j => csv.includes(j)));
check('Rekap mencantumkan nama guide yang dinilai perangkat ini',
  csv.includes('I Wayan Jiguh'), csv.split('\r\n').find(b => b.includes('I Wayan Jiguh')) || '-');
check('Rincian membawa waktu UTC & evaluationId untuk cross-check ke spreadsheet',
  csv.includes('Waktu (UTC, sama dgn spreadsheet)') &&
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(csv));
check('Angka tidak dikutip agar langsung bisa dijumlah di Excel',
  !/;"[01]"/.test(csv));
check('Rekap CSV membawa kolom KEHADIRAN & ETIKA',
  csv.includes('KEHADIRAN') && csv.includes('ETIKA'));
check('Rekap per pos memakai satuan guide-hari, bukan jumlah penilaian',
  csv.includes('Hadir (guide-hari)'));


// Nilai entri yang tidak terbaca tidak boleh ikut dihitung sebagai 0
{
  const semua = await window.DB.all();
  const jmlBaik = semua.filter(e => !e.corrupt).length;
  const barisRincian = csv.slice(csv.indexOf('RINCIAN SEMUA PENILAIAN')).split('\r\n')
    .filter(b => /^\d{4}-\d{2}-\d{2};/.test(b));
  check('Rincian memuat semua entri yang terbaca',
    barisRincian.length === jmlBaik, `${barisRincian.length} baris untuk ${jmlBaik} entri`);
}

downloads.length = 0;
const navSet = $$('.navitem').find(n => n.dataset.nav === 'pengaturan');
click(navSet); await sleep(200);
click($('#btnBackup')); await sleep(300);
check('Export cadangan JSON berfungsi', downloads.length === 1 && /\.json$/.test(downloads[0]));

/* ---------- Pengaturan ---------- */
setVal($('#serverUrl'), 'https://server-lain.contoh.id/');
check('Alamat server tersimpan & dinormalisasi',
  window.Sync.baseUrl() === 'https://server-lain.contoh.id');
setVal($('#serverUrl'), '');
check('Alamat kosong jatuh ke alamat bawaan config.js',
  window.Sync.baseUrl() === String(window.APP_CONFIG.serverUrl).replace(/\/+$/, ''),
  window.Sync.baseUrl().slice(0, 42) + '…');

/* ---------- config.js sebagai fallback (deploy statis) ---------- */
window.APP_CONFIG.serverUrl = 'https://contoh-api.onrender.com/';
check('config.js dipakai bila Pengaturan kosong',
  window.Sync.baseUrl() === 'https://contoh-api.onrender.com');
setVal($('#serverUrl'), 'https://prioritas.contoh.id');
check('Pengaturan staff mengalahkan config.js',
  window.Sync.baseUrl() === 'https://prioritas.contoh.id');
setVal($('#serverUrl'), '');
check('Peringatan "alamat server belum diisi" tidak muncul di perangkat baru',
  window.Sync.needsServerUrl() === false && $('#serverNotice').hidden === true);

// Alamat yang sedang dipakai harus terlihat, walau kolomnya sengaja kosong
check('Alamat server aktif ditampilkan meski kolom isian kosong',
  $('#serverUrl').value === '' &&
  $('#serverAktifUrl').textContent === window.Sync.baseUrl() &&
  $('#serverAktifSumber').textContent.indexOf('bawaan') > -1,
  $('#serverAktifUrl').textContent.slice(0, 40) + '… / ' + $('#serverAktifSumber').textContent);

setVal($('#serverUrl'), 'https://ditimpa.contoh.id');
check('Sumber alamat berubah jadi "diisi manual" saat ditimpa',
  $('#serverAktifUrl').textContent === 'https://ditimpa.contoh.id' &&
  $('#serverAktifSumber').textContent.indexOf('manual') > -1);
setVal($('#serverUrl'), '');

// kembalikan ke server uji lokal untuk sisa pemeriksaan
window.APP_CONFIG.serverUrl = '';
setVal($('#serverUrl'), BASE);

$('#optForceOffline').checked = true;
$('#optForceOffline').dispatchEvent(new window.Event('change', { bubbles: true }));
check('Mode Offline Paksa mematikan sync', window.Sync.isOnline() === false);
$('#optForceOffline').checked = false;
$('#optForceOffline').dispatchEvent(new window.Event('change', { bubbles: true }));

/* ---------- Backup & pemulihan (§10) ---------- */
await window.DB.backupNow();
const cadangan = window.localStorage.getItem('besakih.backup');
check('Backup ke localStorage tersedia', !!cadangan);

const cleared = await window.DB.clearSynced();
check('Hapus data terkirim berfungsi', cleared === 2 && (await window.DB.counts()).total === 0);

// Penghapusan yang disengaja TIDAK boleh dibangkitkan lagi: clearSynced() ikut
// memperbarui cadangan, jadi tidak ada lagi yang bisa dipulihkan.
check('Hapus data terkirim tidak dibangkitkan oleh pemulihan otomatis',
  (await window.DB.restoreIfEmpty()) === 0 && (await window.DB.counts()).total === 0);

// Kerusakan sungguhan: isi IndexedDB lenyap sementara cadangan masih utuh.
window.localStorage.setItem('besakih.backup', cadangan);
const restored = await window.DB.restoreIfEmpty();
check('Pemulihan otomatis dari cadangan berfungsi', restored === 2 && (await window.DB.counts()).total === 2,
  `${restored} entri dipulihkan`);

/* ---------- Retry / backoff ---------- */
window.Sync.Settings.set({ serverUrl: 'http://127.0.0.1:59999' });
const evalId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
await window.DB.save({
  evaluationId: evalId, guideId: 'G-003', guideName: 'I Gede Budiarsana', pos: 3,
  timestamp: new Date().toISOString(), criteria: { idCard: true, uniform: true, etika: 0 }, catatan: '',
});
const failRes = await window.Sync.syncNow({ force: true });
check('Kegagalan jaringan ditangani & entri tetap tertunda',
  failRes.failed === 1 && (await window.DB.counts()).pending === 1, failRes.lastError || '');
window.Sync.Settings.set({ serverUrl: '' });
const retryRes = await window.Sync.syncNow({ force: true });
check('Retry setelah server pulih berhasil', retryRes.sent === 1 && (await window.DB.counts()).pending === 0);

/* ---------- Duplikat / idempotensi ---------- */
const before = (await (await fetch(BASE + '/api/health')).json()).total;
await fetch(BASE + '/api/evaluations', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    evaluationId: evalId, guideId: 'G-003', guideName: 'I Gede Budiarsana', pos: 3,
    timestamp: new Date().toISOString(), criteria: { idCard: true, uniform: true, etika: 0 },
  }),
});
const after = (await (await fetch(BASE + '/api/health')).json()).total;
check('Pengiriman ulang tidak menggandakan data di server (append-only)', before === after, `${before} → ${after}`);

/* ---------- Daftar guide tetap ada walau server gagal ---------- */
{
  // Tiru perangkat baru: tidak ada cache, dan setiap panggilan ke server gagal.
  const aslinya = window.fetch;
  window.localStorage.removeItem('besakih.guides');
  window.fetch = async (url, opts) => {
    const u = String(url);
    if (u.indexOf('guides.json') > -1) return aslinya(u, opts); // salinan bawaan
    throw new Error('server tidak terjangkau');
  };

  const dom2 = new JSDOM(html, { url: BASE + '/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w2 = dom2.window;
  w2.indexedDB = globalThis.indexedDB;
  w2.IDBKeyRange = globalThis.IDBKeyRange;
  Object.defineProperty(w2, 'crypto', { value: webcrypto, configurable: true });
  w2.isSecureContext = true;
  w2.TextEncoder = globalThis.TextEncoder;
  w2.TextDecoder = globalThis.TextDecoder;
  w2.scrollTo = () => {};
  w2.alert = () => {};
  w2.confirm = () => true;
  // guides.json dibaca langsung dari berkas, meniru berkas yang ikut terpasang
  w2.fetch = async (url) => {
    const u = String(url);
    if (u.indexOf('guides.json') > -1) {
      const teks = fs.readFileSync(path.join(APP, 'public', 'guides.json'), 'utf8');
      return { ok: true, status: 200, json: async () => JSON.parse(teks) };
    }
    throw new Error('server tidak terjangkau');
  };
  for (const f of BERKAS_SKRIP) {
    w2.eval(fs.readFileSync(path.join(APP, 'public', f), 'utf8'));
  }
  if (w2.document.readyState === 'loading') {
    w2.document.dispatchEvent(new w2.Event('DOMContentLoaded'));
  }
  await sleep(1200);

  const jml = w2.document.querySelectorAll('#guideList option').length;
  // Jangan di-hardcode: daftar guide bertambah setiap ada pemutakhiran.
  const jmlBawaan = JSON.parse(
    fs.readFileSync(path.join(APP, 'public', 'guides.json'), 'utf8')).length;
  check('Daftar guide tetap muncul walau server tidak terjangkau', jml === jmlBawaan,
    `${jml} dari ${jmlBawaan} guide di salinan bawaan`);
  check('Tidak menampilkan pesan "daftar guide belum tersedia"',
    w2.document.querySelector('#guideHelp').textContent.indexOf('tidak dapat dimuat') === -1);

  window.fetch = aslinya;
}

/* ---------- Adapter Google Apps Script ---------- */
{
  const GAS = 'https://script.google.com/macros/s/AKfycbXXXX/exec';
  const asli = window.fetch;
  let terakhir = null;
  let balasan = () => ({ ok: true, status: 200, body: { accepted: [], rejected: [] } });

  window.fetch = async (url, opts = {}) => {
    if (String(url).indexOf('script.google.com') === -1) return asli(url, opts);
    terakhir = { url: String(url), opts, body: opts.body ? JSON.parse(opts.body) : null };
    const r = balasan(terakhir);
    return {
      ok: r.ok, status: r.status,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    };
  };

  window.Sync.Settings.set({ serverUrl: GAS });
  check('Mendeteksi backend Apps Script dari URL', window.Sync.serverKind() === 'gas');
  check('Endpoint memakai query parameter, bukan path',
    window.Sync.endpoint('guides') === GAS + '?action=guides' &&
    window.Sync.endpoint('health') === GAS + '?action=health' &&
    window.Sync.endpoint('evaluations') === GAS);

  // Daftar guide lewat Apps Script
  balasan = () => ({ ok: true, status: 200, body: { guides: [
    { guideId: 'G-900', guideName: 'Guide Dari Sheets', lisensi: 'X', aktif: true },
  ] } });
  const dariSheets = await window.Sync.refreshGuides();
  check('Daftar guide terbaca dari Apps Script',
    dariSheets.length === 1 && dariSheets[0].guideId === 'G-900');

  // Simpan satu penilaian baru untuk diuji kirim
  const idGas = 'gas-' + Date.now();
  await window.DB.save({
    evaluationId: idGas, guideId: 'G-900', guideName: 'Guide Dari Sheets', pos: 2,
    timestamp: new Date().toISOString(),
    criteria: { idCard: true, uniform: true, etika: 0 }, catatan: '',
  });

  // 1) Apps Script membalas 200 TAPI tidak mengonfirmasi → tidak boleh dianggap terkirim
  balasan = () => ({ ok: true, status: 200, body: { accepted: [], rejected: [] } });
  let r = await window.Sync.syncNow({ force: true });
  check('HTTP 200 tanpa konfirmasi TIDAK dianggap terkirim',
    r.sent === 0 && r.failed === 1 && (await window.DB.counts()).pending === 1,
    r.lastError || '');

  // 2) busy → kegagalan sementara, tetap di antrean
  balasan = () => ({ ok: true, status: 200, body: { accepted: [], rejected: [], busy: true } });
  r = await window.Sync.syncNow({ force: true });
  check('Respons busy diperlakukan sebagai gagal sementara',
    r.sent === 0 && (await window.DB.counts()).pending === 1);

  // 3) Content-Type harus text/plain agar lolos CORS Apps Script
  check('POST ke Apps Script memakai Content-Type text/plain',
    terakhir.opts.headers['Content-Type'] === 'text/plain;charset=utf-8');
  check('Body tetap JSON sesuai model data PRD',
    terakhir.body.evaluationId === idGas && terakhir.body.pos === 2 &&
    terakhir.body.criteria.uniform === true);

  // 4) Konfirmasi benar → baru ditandai terkirim
  balasan = (req) => ({ ok: true, status: 200, body: {
    accepted: [{ evaluationId: req.body.evaluationId, synced: true, duplicate: false }],
    rejected: [],
  } });
  r = await window.Sync.syncNow({ force: true });
  check('Konfirmasi evaluationId → ditandai terkirim',
    r.sent === 1 && (await window.DB.counts()).pending === 0);

  // 5) Ditolak permanen → tidak diulang selamanya
  const idTolak = 'gas-tolak-' + Date.now();
  await window.DB.save({
    evaluationId: idTolak, guideId: 'G-900', guideName: 'Guide Dari Sheets', pos: 3,
    timestamp: new Date().toISOString(),
    criteria: { idCard: true, uniform: true, etika: 1 }, catatan: '',
  });
  balasan = (req) => ({ ok: true, status: 200, body: {
    accepted: [], rejected: [{ evaluationId: req.body.evaluationId, errors: ['pos harus 1, 2, atau 3'] }],
  } });
  r = await window.Sync.syncNow({ force: true });
  const ditandai = (await window.DB.all()).find(e => e.evaluationId === idTolak);
  // Alasan penolakan ditampilkan apa adanya — teks inilah yang dibaca staff di
  // layar Riwayat, jadi tidak boleh berupa JSON mentah.
  check('Alasan penolakan server terbaca manusia, bukan JSON mentah',
    r.failed === 1 && ditandai.lastError === 'pos harus 1, 2, atau 3',
    ditandai.lastError || '');

  window.fetch = asli;
  setVal($('#serverUrl'), '');
  check('Kembali ke mode REST saat alamat dikosongkan', window.Sync.serverKind() === 'rest');
}

/* ---------- Atribut [hidden] benar-benar menyembunyikan ---------- */
{
  const css = fs.readFileSync(path.join(APP, 'public', 'css', 'styles.css'), 'utf8');
  const hasRule = /\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/.test(css);
  const displayed = ['#drawer', '#tutorial', '#view-riwayat', '#serverNotice']
    .filter(sel => {
      const el = $(sel);
      if (!el || !el.hidden) return false;
      return window.getComputedStyle(el).display !== 'none';
    });
  check('Elemen [hidden] benar-benar tersembunyi (drawer, tutorial, view)',
    hasRule && displayed.length === 0, displayed.join(', ') || 'aturan CSS ada');
}

/* ---------- Kehadiran: satu pos bernilai satu ----------
   Sengaja diletakkan paling akhir: blok ini menambah satu penilaian, dan
   pemeriksaan lain di atas bergantung pada jumlah data yang tetap. */
{
  // Nama yang belum dipakai pemeriksaan lain, supaya hasilnya tidak bergantung
  // pada sisa data dari bagian sebelumnya.
  const NAMA = 'I Nengah Tapak';
  const POS = 3;
  const simpanPenilaian = async () => {
    click($('#btnNewEval')); await sleep(50);
    setVal($('#posSelect'), String(POS));
    $('#posSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
    setVal($('#guideInput'), NAMA);
    click($('[data-crit=idCard] .seg.yes'));
    click($('[data-crit=uniform] .seg.yes'));
    $('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await sleep(400);
  };

  const awal = (await window.DB.counts()).total;
  await simpanPenilaian();
  const sesudahSatu = (await window.DB.counts()).total;
  check('Penilaian pertama tersimpan', sesudahSatu === awal + 1, `${awal} -> ${sesudahSatu}`);

  const gid = (await window.DB.all()).find(e => e.guideName === NAMA).guideId;
  const kembar = await window.DB.penilaianKembar(gid, POS, new Date().toISOString());
  check('penilaianKembar() menemukan penilaian di pos & hari yang sama',
    !!kembar && kembar.guideName === NAMA, kembar ? `Pos ${kembar.pos}` : 'tidak ketemu');
  check('Pos berbeda tidak dianggap kembar',
    (await window.DB.penilaianKembar(gid, 1, new Date().toISOString())) === null);
  check('Hari berbeda tidak dianggap kembar',
    (await window.DB.penilaianKembar(gid, POS, '2020-01-01T02:00:00.000Z')) === null);

  // Penilaian kedua di POS YANG SAMA harus DITAHAN — satu pos menilai satu kali
  // sehari, dan server pasti menolaknya, jadi tidak ada gunanya diteruskan.
  await simpanPenilaian();
  check('Penilaian ulang di pos yang sama DITAHAN aplikasi',
    (await window.DB.counts()).total === sesudahSatu,
    `${sesudahSatu} -> ${(await window.DB.counts()).total}`);
  check('Alasannya diterangkan, bukan sekadar gagal diam-diam',
    !$('#guideAmbigu').hidden && $('#guideAmbigu').textContent.includes('sudah dinilai di Pos'),
    $('#guideAmbigu').textContent.slice(0, 70));

  // ...tetapi POS LAIN tetap boleh menilai guide yang sama pada hari yang sama
  click($('#btnNewEval')); await sleep(50);
  setVal($('#posSelect'), String(POS === 3 ? 1 : 3));
  $('#posSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
  setVal($('#guideInput'), NAMA);
  click($('[data-crit=idCard] .seg.yes'));
  click($('[data-crit=uniform] .seg.yes'));
  $('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(400);
  check('Pos LAIN tetap boleh menilai guide yang sama pada hari yang sama',
    (await window.DB.counts()).total === sesudahSatu + 1,
    `${sesudahSatu} -> ${(await window.DB.counts()).total}`);

  // ...tetapi kehadirannya tetap dihitung satu
  blobTerakhir.isi = '';
  click($('[data-nav=riwayat]')); await sleep(200);
  click($('#btnExportCsv')); await sleep(400);
  const csvKembar = blobTerakhir.isi;
  const batas = csvKembar.indexOf('RINCIAN SEMUA PENILAIAN');
  const barisRekap = csvKembar.slice(0, batas).split('\r\n')
    .filter(b => b.includes(NAMA) && /^\d{4}-\d{2}-\d{2};/.test(b));
  const barisRinci = csvKembar.slice(batas).split('\r\n')
    .filter(b => b.includes(NAMA) && /^\d{4}-\d{2}-\d{2};/.test(b));
  const kolom = (barisRekap[0] || '').split(';');
  // Kolom: Tanggal|Nama|guideId|Regu|UNI FORM|ID|ETIKA|KEHADIRAN|Pos|Jml
  check('Dua pos berbeda pada hari yang sama = KEHADIRAN 2',
    barisRekap.length === 1 && barisRinci.length === 2 && kolom[7] === '2',
    barisRekap[0]
      ? `kehadiran ${kolom[7]} dari pos "${kolom[8]}", ${barisRinci.length} baris rincian`
      : 'baris rekap tidak ketemu');
}

/* ---------- Entri yang ditolak berkali-kali BERHENTI dicoba (KONTEKS §9.1) ----
   Diletakkan di akhir berkas: blok ini menambah data dan mengubah alamat
   server, jadi tidak boleh mengganggu pemeriksaan di atasnya. */
{
  const GAS2 = 'https://script.google.com/macros/s/AKfycbTOLAK/exec';
  const asli = window.fetch;
  let mode = 'tolak';                       // 'tolak' | 'jaringan' | 'terima'

  window.fetch = async (url, opts = {}) => {
    if (String(url).indexOf('script.google.com') === -1) return asli(url, opts);
    const body = opts.body ? JSON.parse(opts.body) : null;
    if (mode === 'jaringan') throw new Error('jaringan mati');
    if (mode === 'terima') {
      return { ok: true, status: 200, json: async () => ({
        accepted: [{ evaluationId: body.evaluationId, synced: true, duplicate: false }], rejected: [] }) };
    }
    return { ok: true, status: 200, json: async () => ({
      accepted: [],
      rejected: [{ evaluationId: body.evaluationId, errors: ['guideId "G-999" tidak ada di tab Guides'] }],
    }) };
  };
  window.Sync.Settings.set({ serverUrl: GAS2 });

  // --- 1) Gagal JARINGAN tidak boleh membuat entri menyerah ---
  const idJaringan = 'uji-jaringan-' + Date.now();
  await window.DB.save({
    evaluationId: idJaringan, guideId: 'G-001', guideName: 'Gusti Alit Astawa', pos: 1,
    timestamp: new Date('2031-02-03T02:00:00.000Z').toISOString(),
    criteria: { idCard: true, uniform: true, etika: 0 }, catatan: '',
  });
  mode = 'jaringan';
  for (let i = 0; i < window.DB.MAKS_TOLAKAN + 2; i++) await window.Sync.syncNow({ force: true });
  const stlhJaringan = (await window.DB.all()).find(e => e.evaluationId === idJaringan);
  check('Gagal jaringan berkali-kali TIDAK menahan entri',
    !stlhJaringan.buntu && (await window.DB.pending()).some(e => e.evaluationId === idJaringan),
    `${window.DB.MAKS_TOLAKAN + 2}x gagal jaringan, buntu=${!!stlhJaringan.buntu}`);

  // Bersihkan supaya tidak ikut terhitung di bagian penolakan
  mode = 'terima';
  await window.Sync.syncNow({ force: true });

  // --- 2) Ditolak server MAKS_TOLAKAN kali → berhenti dicoba ---
  const idTahan = 'uji-tahan-' + Date.now();
  await window.DB.save({
    evaluationId: idTahan, guideId: 'G-002', guideName: 'I Gede Astawa', pos: 2,
    timestamp: new Date('2031-02-04T02:00:00.000Z').toISOString(),
    criteria: { idCard: true, uniform: true, etika: 0 }, catatan: '',
  });
  mode = 'tolak';
  let hasil = null;
  for (let i = 0; i < window.DB.MAKS_TOLAKAN; i++) hasil = await window.Sync.syncNow({ force: true });

  const ditahan = (await window.DB.all()).find(e => e.evaluationId === idTahan);
  check('Ditolak server MAKS_TOLAKAN kali → entri ditandai ditahan',
    !!ditahan.buntu && ditahan.tolakan === window.DB.MAKS_TOLAKAN,
    `tolakan=${ditahan.tolakan}, buntu=${!!ditahan.buntu}`);
  check('Alasan penolakan ikut tersimpan, bukan hilang',
    /tidak ada di tab Guides/.test(ditahan.lastError || ''), ditahan.lastError || '');
  check('syncNow melaporkan berapa yang ditahan', hasil.ditahan === 1, JSON.stringify(hasil));

  // --- 3) Entri yang ditahan keluar dari antrean otomatis ---
  const antrean = await window.DB.pending();
  check('Entri ditahan TIDAK ikut antrean otomatis lagi',
    !antrean.some(e => e.evaluationId === idTahan), `${antrean.length} di antrean`);
  const c = await window.DB.counts();
  check('counts() memisahkan "ditahan" dari "menunggu"', c.buntu === 1, JSON.stringify(c));

  // Percobaan berikutnya tidak boleh menyentuh entri itu sama sekali
  const sblm = ditahan.attempts;
  await window.Sync.syncNow({ force: true });
  const stlh = (await window.DB.all()).find(e => e.evaluationId === idTahan);
  check('Sync berikutnya tidak mengulang entri yang ditahan',
    stlh.attempts === sblm, `attempts ${sblm} → ${stlh.attempts}`);

  // --- 4) Layar Riwayat menampilkannya + tombol Coba lagi ---
  click($('[data-nav=riwayat]')); await sleep(250);
  check('Spanduk "ditahan" muncul di layar Riwayat',
    !$('#ditahanBar').hidden && $('#ditahanBar').textContent.includes('ditahan'),
    $('#ditahanBar').textContent.slice(0, 52));
  click($('.chip[data-filter=ditahan]')); await sleep(250);
  const kartu = $$('#historyList .card');
  check('Filter "Ditahan" menampilkan tepat entri yang ditahan',
    kartu.length === 1 && kartu[0].textContent.includes('I Gede Astawa'),
    `${kartu.length} kartu`);
  const tombol = $(`#historyList [data-retry="${idTahan}"]`);
  check('Tiap entri ditahan punya tombol "Coba lagi"', !!tombol);
  check('AC-7 tombol "Coba lagi" tetap >= 48px', !!tombol &&
    /min-height:48px/.test(fs.readFileSync(path.join(APP, 'public', 'css', 'styles.css'), 'utf8')
      .match(/\.chip\{[^}]*\}/)[0].replace(/\s/g, '')));

  // --- 5) Tombol mengembalikannya ke antrean ---
  mode = 'terima';
  click(tombol); await sleep(700);
  const pulih = (await window.DB.all()).find(e => e.evaluationId === idTahan);
  check('Tombol "Coba lagi" mengembalikan entri ke antrean lalu terkirim',
    !pulih.buntu && pulih.synced === true,
    `buntu=${!!pulih.buntu} synced=${pulih.synced}`);
  check('Spanduk "ditahan" hilang setelah tidak ada yang ditahan',
    (await window.DB.counts()).buntu === 0);

  // kembalikan keadaan
  window.fetch = asli;
  window.Sync.Settings.set({ serverUrl: BASE });
  click($('.chip[data-filter=all]')); await sleep(150);
}

/* ---------- Cadangan tidak boleh gagal diam-diam (KONTEKS §9.9) ---------- */
{
  // Tiru kuota localStorage yang penuh HANYA untuk kunci cadangan — inilah
  // keadaan yang dulu ditelan diam-diam oleh catch di backupNow(), sehingga
  // cadangan berhenti diperbarui tanpa ada yang tahu.
  const asliLS = window.localStorage;
  const penuh = {
    getItem: k => asliLS.getItem(k),
    removeItem: k => asliLS.removeItem(k),
    key: i => asliLS.key(i),
    clear: () => asliLS.clear(),
    get length() { return asliLS.length; },
    setItem(k, v) {
      if (k === 'besakih.backup') {
        const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e;
      }
      return asliLS.setItem(k, v);
    },
  };
  Object.defineProperty(window, 'localStorage', { value: penuh, configurable: true });
  const ok = await window.DB.backupNow();
  Object.defineProperty(window, 'localStorage', { value: asliLS, configurable: true });

  check('backupNow() melaporkan gagal, bukan mengembalikan diam-diam', ok === false);
  const st = window.DB.statusCadangan();
  check('Kegagalan cadangan tercatat untuk ditampilkan ke staff',
    !!st && st.gagal === true && !!st.pesan, (st && st.pesan || '').slice(0, 60));

  click($('.navitem[data-nav=pengaturan]')); await sleep(300);
  check('Peringatan cadangan gagal tampil di layar Pengaturan',
    !$('#backupStatus').hidden && $('#backupStatus').textContent.includes('gagal'),
    $('#backupStatus').textContent.slice(0, 50));

  await window.DB.backupNow();   // pulihkan status supaya bersih
}

/* ---------- Aturan di server REST disamakan dengan Apps Script (KONTEKS §9.7) ---- */
{
  const kirim = (body) => fetch(BASE + '/api/evaluations', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json().then(j => ({ status: r.status, body: j })));

  // 1) Endpoint pembacaan tidak lagi terbuka tanpa kunci
  const baca = await fetch(BASE + '/api/evaluations');
  check('GET /api/evaluations tidak lagi terbuka tanpa ADMIN_TOKEN',
    baca.status === 403, `HTTP ${baca.status}`);
  check('Balasan penolakan baca TIDAK memasang CORS bintang',
    baca.headers.get('access-control-allow-origin') === null,
    String(baca.headers.get('access-control-allow-origin')));
  const bacaCsv = await fetch(BASE + '/api/evaluations.csv');
  check('GET /api/evaluations.csv juga tertutup', bacaCsv.status === 403, `HTTP ${bacaCsv.status}`);

  // 2) guideId yang tidak terdaftar ditolak, seperti di Code.gs
  const dasar = (id, gid, pos, tgl) => ({
    evaluationId: id, guideId: gid, guideName: 'Uji Server', pos,
    timestamp: tgl, criteria: { idCard: true, uniform: true, etika: 0 }, catatan: '',
  });
  const asing = await kirim(dasar('srv-asing-' + Date.now(), 'G-XYZ', 1, '2031-03-01T02:00:00.000Z'));
  check('Server menolak guideId yang tidak terdaftar',
    asing.body.accepted.length === 0 &&
    /tidak ada di daftar guide/.test(asing.body.rejected[0].errors.join(' ')),
    asing.body.rejected[0] ? asing.body.rejected[0].errors.join(' ') : '');

  // 3) Satu pos hanya menilai satu guide sekali per hari
  const t1 = '2031-03-02T02:00:00.000Z';
  const a = await kirim(dasar('srv-a-' + Date.now(), 'G-001', 1, t1));
  check('Penilaian pertama diterima server', a.body.accepted.length === 1);
  const b = await kirim(dasar('srv-b-' + Date.now(), 'G-001', 1, t1));
  check('Pos yang sama pada hari yang sama DITOLAK server',
    b.body.accepted.length === 0 && b.body.rejected[0].sudahDinilai === true,
    b.body.rejected[0] ? b.body.rejected[0].errors.join(' ') : '');
  const c2 = await kirim(dasar('srv-c-' + Date.now(), 'G-001', 2, t1));
  check('Pos LAIN pada hari yang sama tetap diterima', c2.body.accepted.length === 1);

  // 4) Kiriman ulang evaluationId yang sama tetap "accepted duplicate" —
  //    kalau ditolak, antrean di aplikasi macet selamanya.
  const idUlang = 'srv-ulang-' + Date.now();
  await kirim(dasar(idUlang, 'G-002', 3, '2031-03-03T02:00:00.000Z'));
  const ulang = await kirim(dasar(idUlang, 'G-002', 3, '2031-03-03T02:00:00.000Z'));
  check('Kiriman ulang evaluationId yang sama tetap diterima (idempoten)',
    ulang.body.accepted.length === 1 && ulang.body.accepted[0].duplicate === true,
    JSON.stringify(ulang.body.accepted[0] || {}));

  // 5) Nama guide ditimpa dari daftar resmi, bukan dari kiriman perangkat
  const namaResmi = (await (await fetch(BASE + '/api/guides')).json())
    .guides.find(g => g.guideId === 'G-001').guideName;
  check('Server memakai nama resmi dari daftar guide, bukan kiriman perangkat',
    namaResmi !== 'Uji Server', namaResmi);

  // 6) Satu daftar guide, bukan salinan kembar
  check('guides.json tidak lagi kembar di server/ dan public/',
    !fs.existsSync(path.join(APP, 'server', 'guides.json')) &&
    fs.existsSync(path.join(APP, 'public', 'guides.json')));
}

/* ---------- Koreksi salah pencet dari aplikasi ---------- */
{
  const NAMA = 'I Gede Dauh';      // G-006, belum dipakai blok lain
  const POS = '2';
  const isiForm = (idCard, uniform, langkahEtika) => {
    setVal($('#posSelect'), POS);
    $('#posSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
    setVal($('#guideInput'), NAMA);
    click($(`[data-crit=idCard] .seg.${idCard ? 'yes' : 'no'}`));
    click($(`[data-crit=uniform] .seg.${uniform ? 'yes' : 'no'}`));
    for (let i = 0; i < Math.abs(langkahEtika); i++) {
      click($(`[data-crit=etika] .stepbtn[data-step="${langkahEtika > 0 ? 1 : -1}"]`));
    }
    $('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  };

  /* --- (a) Salah pencet yang ketahuan SEBELUM terkirim: ditimpa di perangkat,
         tanpa meninggalkan jejak koreksi di server --- */
  window.Sync.Settings.set({ forceOffline: true });
  click($('#btnNewEval')); await sleep(60);
  isiForm(true, true, 2); await sleep(500);

  const sblm = (await window.DB.counts()).total;
  const asli = (await window.DB.all()).find(e => e.guideName === NAMA);
  check('Penilaian yang akan dibetulkan tersimpan & belum terkirim',
    !!asli && asli.synced === false && asli.criteria.idCard === true);

  click($('[data-nav=riwayat]')); await sleep(250);
  const tblPerbaiki = $(`#historyList [data-fix="${asli.evaluationId}"]`);
  check('Penilaian hari ini punya tombol "Perbaiki" di Riwayat', !!tblPerbaiki);

  click(tblPerbaiki); await sleep(300);
  check('Formulir terisi ulang dengan nilai penilaian yang dibetulkan',
    $('#guideInput').value === NAMA && $('#posSelect').value === POS &&
    !$('#koreksiBar').hidden, $('#koreksiBar').textContent.slice(0, 46));
  check('Guide & pos dikunci selama mengoreksi (server hanya terima yang sama)',
    $('#guideInput').disabled === true && $('#posSelect').disabled === true);

  click($('[data-crit=idCard] .seg.no'));                  // betulkan: ID ternyata tidak ada
  click($('[data-crit=etika] .stepbtn[data-step="-1"]'));  // etika 2 -> 1
  $('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(500);

  const sesudah = await window.DB.all();
  const ditimpa = sesudah.find(e => e.evaluationId === asli.evaluationId);
  check('Koreksi sebelum terkirim TIDAK menambah entri baru',
    (await window.DB.counts()).total === sblm, `${sblm} → ${(await window.DB.counts()).total}`);
  check('Nilainya benar-benar berubah, evaluationId dipertahankan',
    ditimpa.criteria.idCard === false && ditimpa.criteria.etika === 1,
    `idCard=${ditimpa.criteria.idCard} etika=${ditimpa.criteria.etika}`);
  check('Tidak ada jejak koreksi yang perlu dikirim ke server',
    !ditimpa.koreksiDari && !ditimpa.diganti);
  check('Mode koreksi berakhir setelah disimpan', $('#koreksiBar').hidden &&
    $('#guideInput').disabled === false);

  /* --- (b) Salah pencet yang ketahuan SETELAH terkirim: kirim pengganti --- */
  window.Sync.Settings.set({ forceOffline: false });
  await window.Sync.syncNow({ force: true }); await sleep(400);
  const terkirim = (await window.DB.all()).find(e => e.evaluationId === asli.evaluationId);
  check('Penilaian hasil koreksi terkirim ke server', terkirim.synced === true,
    terkirim.lastError || '');

  click($('[data-nav=riwayat]')); await sleep(250);
  click($(`#historyList [data-fix="${asli.evaluationId}"]`)); await sleep(300);
  click($('[data-crit=uniform] .seg.no'));
  $('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(900);

  const semua = await window.DB.all();
  const lama = semua.find(e => e.evaluationId === asli.evaluationId);
  const baru = semua.find(e => e.koreksiDari === asli.evaluationId);
  check('Koreksi setelah terkirim membuat penilaian pengganti',
    !!baru && baru.criteria.uniform === false, baru ? 'ada' : 'tidak ada');
  check('Penilaian lama ditandai diganti, TIDAK dihapus (append-only)',
    !!lama && lama.diganti === true && lama.digantikanOleh === baru.evaluationId);
  check('Server menerima koreksinya', baru.synced === true, baru.lastError || '');

  // Penilaian yang sudah diganti tidak boleh lagi menghalangi maupun ikut rekap
  check('Penilaian yang diganti tidak lagi dianggap kembar',
    (await window.DB.penilaianKembar('G-006', 2, window.DB.sekarangISO()))
      .evaluationId === baru.evaluationId);
  check('Yang sudah diganti tidak punya tombol Perbaiki lagi', await (async () => {
    click($('[data-nav=riwayat]')); await sleep(250);
    return !$(`#historyList [data-fix="${asli.evaluationId}"]`);
  })());

  blobTerakhir.isi = '';
  click($('#btnExportCsv')); await sleep(400);
  const csv = blobTerakhir.isi;
  const batasRinci = csv.indexOf('RINCIAN SEMUA PENILAIAN');
  const barisRekapDauh = csv.slice(0, batasRinci).split('\r\n')
    .filter(b => b.includes(NAMA) && /^\d{4}-\d{2}-\d{2};/.test(b));
  check('Rekap CSV memakai nilai koreksi, bukan nilai lama',
    barisRekapDauh.length === 1 && barisRekapDauh[0].split(';')[4] === '0',
    barisRekapDauh[0] || 'tidak ketemu');
  check('Penilaian yang dibetulkan tetap tercantum sebagai jejak di CSV',
    csv.includes('PENILAIAN YANG SUDAH DIBETULKAN'));

  click($('.chip[data-filter=all]')); await sleep(120);
}

/* ---------- Koreksi yang ditolak permanen tidak boleh meninggalkan
             perangkat & spreadsheet dalam keadaan berbeda ---------- */
{
  const GAS3 = 'https://script.google.com/macros/s/AKfycbKOREKSI/exec';
  const asli = window.fetch;
  let tolak = false;
  window.fetch = async (url, opts = {}) => {
    if (String(url).indexOf('script.google.com') === -1) return asli(url, opts);
    const body = JSON.parse(opts.body);
    if (tolak && body.koreksiDari) {
      return { ok: true, status: 200, json: async () => ({ accepted: [], rejected: [
        { evaluationId: body.evaluationId, errors: ['koreksi harus untuk guide, pos, dan tanggal yang sama'] },
      ] }) };
    }
    return { ok: true, status: 200, json: async () => ({
      accepted: [{ evaluationId: body.evaluationId, synced: true, duplicate: false }], rejected: [] }) };
  };
  window.Sync.Settings.set({ serverUrl: GAS3 });

  const idLama = 'kor-lama-' + Date.now();
  await window.DB.save({
    evaluationId: idLama, guideId: 'G-007', guideName: 'I Gede Kariasa', pos: 1,
    timestamp: window.DB.sekarangISO(),
    criteria: { idCard: true, uniform: true, etika: 0 }, catatan: '',
  });
  await window.Sync.syncNow({ force: true }); await sleep(300);

  // Koreksi yang akan ditolak terus
  tolak = true;
  click($('[data-nav=riwayat]')); await sleep(250);
  click($(`#historyList [data-fix="${idLama}"]`)); await sleep(300);
  click($('[data-crit=uniform] .seg.no'));
  $('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(700);

  check('Segera setelah SIMPAN, penilaian lama ditandai diganti',
    ((await window.DB.all()).find(e => e.evaluationId === idLama) || {}).diganti === true);

  for (let i = 0; i < window.DB.MAKS_TOLAKAN; i++) await window.Sync.syncNow({ force: true });
  const lama = (await window.DB.all()).find(e => e.evaluationId === idLama);
  const koreksiBaru = (await window.DB.all()).find(e => e.koreksiDari === idLama);
  check('Koreksi yang ditolak permanen ditahan', koreksiBaru.buntu === true,
    `tolakan=${koreksiBaru.tolakan}`);
  check('Penilaian lama kembali berlaku — perangkat tidak berbeda dengan server',
    lama.diganti === false && lama.digantikanOleh === null,
    `diganti=${lama.diganti}`);
  check('Penilaian lama muncul lagi sebagai penilaian yang berlaku',
    ((await window.DB.penilaianKembar('G-007', 1, window.DB.sekarangISO())) || {}).evaluationId === idLama);

  window.fetch = asli;
  window.Sync.Settings.set({ serverUrl: BASE });
  click($('.chip[data-filter=all]')); await sleep(120);
}

/* ---------- Jam perangkat yang meleset (KONTEKS §9.4) ---------- */
{
  const asli = window.fetch;
  const MELESET = 40 * 60 * 1000;                 // HP ketinggalan 40 menit
  window.fetch = async (url, opts = {}) => {
    if (String(url).indexOf('/api/health') === -1) return asli(url, opts);
    return { ok: true, status: 200, json: async () => ({
      ok: true, storage: 'uji', total: 0,
      serverTime: new Date(Date.now() + MELESET).toISOString(),
    }) };
  };

  window.DB.setSelisihJam(0);
  check('Sebelum menghubungi server, selisih jam dianggap nol',
    window.DB.selisihJam() === 0 && window.DB.jamMencurigakan() === false);

  await window.Sync.ping();
  const selisih = window.DB.selisihJam();
  check('Selisih jam dipelajari dari balasan server',
    Math.abs(selisih - MELESET) < 5000, `${Math.round(selisih / 60000)} menit`);
  check('Selisih sebesar itu ditandai mencurigakan', window.DB.jamMencurigakan() === true);

  const beda = Date.parse(window.DB.sekarangISO()) - Date.now();
  check('Cap waktu penilaian berikutnya dikoreksi sebesar selisih itu',
    Math.abs(beda - MELESET) < 5000, `${Math.round(beda / 60000)} menit`);

  click($('.navitem[data-nav=home]')); await sleep(300);
  check('Staff diberi tahu jam perangkatnya meleset',
    !$('#jamNotice').hidden && $('#jamNotice').textContent.includes('40 menit'),
    $('#jamNotice').textContent.slice(0, 46));

  // Selisih kecil tidak boleh dianggap masalah — itu cuma derau jaringan
  window.DB.setSelisihJam(3000);
  check('Selisih beberapa detik TIDAK dipakai mengoreksi maupun diperingatkan',
    window.DB.jamMencurigakan() === false &&
    Math.abs(Date.parse(window.DB.sekarangISO()) - Date.now()) < 1000);

  window.DB.setSelisihJam(0);
  window.fetch = asli;
}

/* ---------- Error JS ---------- */
check('Tidak ada error JavaScript fatal', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));

/* ---------- Realm rig pengujian ----------
   Penjaga untuk jebakan yang sempat membuat 40+ pemeriksaan gagal berjamaah
   dengan sebab menyesatkan di Node 24. Kalau seseorang kelak menghapus baris
   window.AbortController = globalThis.AbortController, pemeriksaan ini yang
   gagal lebih dulu — bukan AC-2 yang tampak seperti masalah daftar guide. */
{
  check('AbortController jendela serealm dengan fetch',
    window.AbortController === globalThis.AbortController,
    window.AbortController === globalThis.AbortController ? 'sama' : 'BEDA REALM — fetchWithTimeout akan gagal');

  let lolos = false;
  try {
    const c = new window.AbortController();
    await window.fetch(BASE + '/api/health', { signal: c.signal });
    lolos = true;
  } catch (e) { lolos = false; var pesan = e.message; }
  check('fetch menerima signal dari AbortController jendela', lolos, lolos ? '' : pesan);
}

/* ---------- Struktur modul app/ ----------
   Risiko yang lahir justru KARENA app.js dipecah. Ketiganya tidak mungkin
   terjadi selama semuanya masih satu berkas, jadi tidak ada tes lama yang
   menjaganya. */
{
  const dirApp = path.join(APP, 'public', 'js', 'app');
  const modul = fs.readdirSync(dirApp).filter(f => f.endsWith('.js')).sort();

  // 1. index.html memuat SEMUA modul, berurutan, tidak ada yang tertinggal.
  const dimuat = BERKAS_SKRIP.filter(f => f.startsWith('js/app/')).map(f => f.replace('js/app/', ''));
  check('index.html memuat seluruh modul app/ sesuai urutan nomornya',
    dimuat.length === modul.length && dimuat.every((f, i) => f === modul[i]),
    `${dimuat.length} dimuat / ${modul.length} ada`);

  // 2. Service worker men-cache daftar yang sama — kalau meleset, HP offline
  //    menerima aplikasi yang separuh modulnya hilang.
  const sw = fs.readFileSync(path.join(APP, 'public', 'sw.js'), 'utf8');
  const kurang = modul.filter(f => !sw.includes(`js/app/${f}`));
  check('sw.js men-cache seluruh modul app/', kurang.length === 0,
    kurang.length ? 'belum di-cache: ' + kurang.join(', ') : `${modul.length} modul`);

  // 3. Satu lingkup global bersama: nama top-level kembar akan saling menimpa
  //    TANPA peringatan. Dalam satu berkas hal itu terlihat mata; dalam delapan
  //    berkas tidak.
  const pemilik = new Map(), kembar = [];
  for (const f of modul)
    for (const m of fs.readFileSync(path.join(dirApp, f), 'utf8')
                      .matchAll(/^  (?:const|let|var|(?:async )?function)\s+([A-Za-z0-9_$]+)/gm)) {
      if (m[1] === 'App') continue;          // binding namespace, memang ada di tiap modul
      if (pemilik.has(m[1])) kembar.push(`${m[1]} (${pemilik.get(m[1])} & ${f})`);
      else pemilik.set(m[1], f);
    }
  check('Tidak ada nama top-level kembar antar modul app/', kembar.length === 0,
    kembar.length ? kembar.join(', ') : `${pemilik.size} nama unik di ${modul.length} modul`);

  // 4. State yang berubah hanya boleh hidup di App.state. Dua modul yang
  //    masing-masing memegang salinannya sendiri akan berselisih diam-diam.
  const stateKeys = Object.keys(window.App.state);
  const salinan = modul.filter(f => f !== '00-inti.js').filter(f => {
    const src = fs.readFileSync(path.join(dirApp, f), 'utf8');
    return stateKeys.some(k => new RegExp(`^  (?:let|var) ${k}\\b`, 'm').test(src));
  });
  check('State yang berubah hanya dideklarasikan di 00-inti.js', salinan.length === 0,
    salinan.length ? 'salinan tandingan di ' + salinan.join(', ') : `${stateKeys.length} kunci di App.state`);
}

/* ---------- Nama kembar: dua orang berbeda, nama identik ---------- */
// 15 record lama menggabungkan dua orang berbeda ke SATU guideId (regu "A2, D2"),
// sehingga penilaian orang kedua ditolak server sebagai duplikat pos lalu hilang
// diam-diam. Setelah record dipecah, nama boleh kembar — jadi nama tidak lagi
// cukup untuk menentukan siapa yang dinilai; pemilihan harus lewat guideId.
{
  ['#filterKategori', '#filterRegu'].forEach(sel => { if ($(sel)) setVal($(sel), ''); });
  await sleep(50);
  const kembar = window.App.state.guides.filter(g => g.guideName === 'I Wayan Suparta');
  check('Dua orang berbeda boleh bernama "I Wayan Suparta"',
    kembar.length === 2 && kembar[0].guideId !== kembar[1].guideId
      && kembar[0].regu !== kembar[1].regu,
    kembar.map(g => `${g.guideId}/${g.regu}`).join(' '));

  const sebelum = (await window.DB.counts()).total;
  click($('#btnNewEval')); await sleep(60);
  setVal($('#guideInput'), 'I Wayan Suparta');
  await sleep(60);
  check('Nama kembar tidak ditebak — kandidatnya ditawarkan',
    !window.App.state.form.guide && !$('#guideAmbigu').hidden
      && $$('#guideAmbigu .chip').length === 2,
    `${$$('#guideAmbigu .chip').length} kandidat`);

  // Tanpa guideId, klik kandidat kembali menebak lewat nama — dan buntu lagi.
  const target = kembar[1];
  const chip = $$('#guideAmbigu .chip').find(c => c.dataset.guideId === target.guideId);
  check('Chip kandidat membawa guideId, bukan sekadar nama', !!chip,
    $$('#guideAmbigu .chip').map(c => c.dataset.guideId).join(' '));
  click(chip); await sleep(80);
  check('Memilih kandidat mengunci penilaian ke orang yang benar',
    !!window.App.state.form.guide && window.App.state.form.guide.guideId === target.guideId,
    (window.App.state.form.guide || {}).guideId || '-');

  click($('[data-crit=idCard] .seg.yes'));
  click($('[data-crit=uniform] .seg.yes'));
  $('#formEval').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(700);
  const simpan = (await window.DB.all()).find(e => e.guideId === target.guideId);
  check('Penilaian guide bernama kembar tersimpan atas guideId yang tepat',
    (await window.DB.counts()).total === sebelum + 1 && !!simpan
      && simpan.guideName === 'I Wayan Suparta',
    simpan ? `${simpan.guideId} · ${simpan.guideName}` : 'tidak tersimpan');
}

/* ---------- ringkasan ---------- */
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} pemeriksaan lulus`);
tutupServer();
process.exit(failed.length ? 1 : 0);
