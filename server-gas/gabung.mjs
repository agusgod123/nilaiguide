/**
 * gabung.mjs — sambung berkas .gs bernomor menjadi satu Code.gs.
 *
 * Dipakai untuk jalur DEPLOY MANUAL (tempel ke editor Apps Script). Kalau
 * memakai clasp, berkas dikirim apa adanya dan alat ini tidak diperlukan.
 *
 *   node server-gas/gabung.mjs            → tulis server-gas/Code.gs
 *   node server-gas/gabung.mjs --periksa  → hanya laporkan, tanpa menulis
 *
 * Code.gs hasil TIDAK dikomit (lihat .gitignore) — ia berkas turunan.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const BERKAS_GS = fs.readdirSync(DIR).filter(f => /^\d\d_.*\.gs$/.test(f)).sort();

export function gabungkan() {
  return BERKAS_GS.map(f => fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\s+$/, '')).join('\n\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isi = gabungkan();
  const kepala =
`/* ============================================================
 *  BERKAS TURUNAN — JANGAN DIEDIT LANGSUNG.
 *  Dihasilkan oleh: node server-gas/gabung.mjs
 *  Sumbernya ${BERKAS_GS.length} berkas bernomor di folder server-gas/.
 *  Berkas ini hanya untuk ditempel ke editor Apps Script bila tidak
 *  memakai clasp. Perubahan di sini akan tertimpa.
 * ============================================================ */

`;
  if (process.argv.includes('--periksa')) {
    console.log(`${BERKAS_GS.length} berkas, ${isi.split('\n').length} baris:`);
    for (const f of BERKAS_GS) console.log('  ' + f);
  } else {
    fs.writeFileSync(path.join(DIR, 'Code.gs'), kepala + isi + '\n', 'utf8');
    console.log(`✓ Code.gs ditulis — ${BERKAS_GS.length} berkas, ${isi.split('\n').length} baris.`);
    console.log('  Tempel isinya ke editor Apps Script, lalu jalankan setup().');
  }
}
