import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Jalur diselesaikan relatif terhadap berkas ini, bukan direktori kerja,
// supaya alat ini bisa dipanggil dari mana saja.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const AKAR = path.resolve(HERE, '..');

const OUT = path.join(AKAR, 'server-gas');
const urut = fs.readdirSync(OUT).filter(f => /^\d\d_.*\.gs$/.test(f)).sort();
const h = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

import { segmen } from './segmen.mjs';
const tanpaKomentar = src => segmen(src)
  .map(({ t, kode }) => kode ? t : t.replace(/[^\n]/g, ' '))
  .join('');

/* Pecah teks-tanpa-komentar menjadi blok top-level dengan hitungan kurung. */
function blokKode(srcAsli) {
  const src = tanpaKomentar(srcAsli);
  const baris = src.split('\n');
  const hasil = new Map();
  let nama = null, buf = [], depth = 0, mulai = false;
  const hitung = s => { let d = 0; for (const ch of s) { if (ch === '{' || ch === '(' || ch === '[') d++; if (ch === '}' || ch === ')' || ch === ']') d--; } return d; };
  for (const b of baris) {
    const m = b.match(/^(function|var)\s+([A-Za-z0-9_$]+)/);
    if (m && depth === 0) {
      if (nama) hasil.set(nama, buf.join('\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, ''));
      nama = m[2]; buf = []; depth = 0; mulai = true;
    }
    if (nama) { buf.push(b); depth += hitung(b); if (mulai && depth === 0 && /[;}]\s*$/.test(b.trim())) { hasil.set(nama, buf.join('\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '')); nama = null; buf = []; mulai = false; } }
  }
  if (nama) hasil.set(nama, buf.join('\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, ''));
  return hasil;
}

const srcAsli = fs.readFileSync(process.env.CODE_GS_LAMA || path.join(AKAR, 'server-gas', 'Code.gs'), 'utf8');
const srcBaru = urut.map(f => fs.readFileSync(path.join(OUT, f), 'utf8')).join('\n');
const A = blokKode(srcAsli), B = blokKode(srcBaru);

let sama = 0; const beda = [], hilang = [];
for (const [nama, isi] of A) {
  if (!B.has(nama)) { hilang.push(nama); continue; }
  h(isi) === h(B.get(nama)) ? sama++ : beda.push(nama);
}
const tambahan = [...B.keys()].filter(n => !A.has(n));

console.log('=== 1. Badan kode tiap deklarasi (komentar diabaikan) ===');
console.log(`   identik : ${sama}/${A.size}`);
console.log(`   berbeda : ${beda.length ? beda.join(', ') : '—'}`);
console.log(`   hilang  : ${hilang.length ? hilang.join(', ') : '—'}`);
console.log(`   tambahan: ${tambahan.length ? tambahan.join(', ') : '—'}`);

/* === 2. Kesetaraan himpunan baris: tidak ada baris asli yang hilang === */
const bersih = t => t.split('\n').map(s => s.replace(/\s+$/, '')).filter(s => s !== '');
const kepalaBaru = /^\/\*\*\n \* =+\n(?: \*.*\n)+? \* =+\n \*\/\n/;
const isiTanpaKepala = urut.map(f => fs.readFileSync(path.join(OUT, f), 'utf8').replace(kepalaBaru, '')).join('\n');
const kepalaAsli = srcAsli.split('\n').slice(0, 39).join('\n');

const mA = new Map(), mB = new Map();
for (const l of bersih(srcAsli.split('\n').slice(39).join('\n'))) mA.set(l, (mA.get(l) || 0) + 1);
for (const l of bersih(isiTanpaKepala)) mB.set(l, (mB.get(l) || 0) + 1);
const kurang = [], lebih = [];
for (const [l, c] of mA) if ((mB.get(l) || 0) < c) kurang.push(l.trim().slice(0, 60));
for (const [l, c] of mB) if ((mA.get(l) || 0) < c) lebih.push(l.trim().slice(0, 60));

console.log('\n=== 2. Himpunan baris (di luar kepala berkas) ===');
console.log(`   baris asli unik : ${mA.size}`);
console.log(`   hilang di hasil : ${kurang.length ? kurang.slice(0, 5).join(' | ') : '— tidak ada'}`);
console.log(`   muncul baru     : ${lebih.length ? lebih.slice(0, 5).join(' | ') : '— tidak ada'}`);

const lulus = !beda.length && !hilang.length && !tambahan.length && !kurang.length && !lebih.length;
console.log('\n' + (lulus ? '✅ TERBUKTI: pemindahan murni, nol perubahan isi.' : '❌ ADA SELISIH — periksa di atas.'));
process.exit(lulus ? 0 : 1);
