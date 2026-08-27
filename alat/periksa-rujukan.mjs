import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Jalur diselesaikan relatif terhadap berkas ini, bukan direktori kerja,
// supaya alat ini bisa dipanggil dari mana saja.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const AKAR = path.resolve(HERE, '..');
import { segmen } from './segmen.mjs';

const DIR = path.join(AKAR, 'public', 'js', 'app');
const berkas = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();
const NAMA = JSON.parse(fs.readFileSync(path.join(HERE, 'app-dek.json'),'utf8')).map(d => d.nama);
const esc$ = n => n.replace(/\$/g, '\\$');

/* Samarkan string & komentar dengan spasi SEPANJANG ASLINYA, newline tetap,
   supaya nomor baris dan jangkar ^ / $ tetap sahih. */
const samarkan = src => segmen(src)
  .map(({ t, kode }) => kode ? t : t.replace(/[^\n]/g, ' '))
  .join('');

let masalah = 0;
const asal = new Map();

for (const f of berkas) {
  const kode = samarkan(fs.readFileSync(path.join(DIR, f), 'utf8'));

  const sah = new Set(['App']);
  for (const m of kode.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_$]+)/g)) sah.add(m[1]);
  for (const m of kode.matchAll(/const\s*\{([^}]*)\}\s*=\s*App/g))
    m[1].split(',').map(x => x.trim()).filter(Boolean).forEach(x => sah.add(x));
  for (const m of kode.matchAll(/function\s+([A-Za-z0-9_$]+)/g)) sah.add(m[1]);
  for (const m of kode.matchAll(/function\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g))       // parameter
    m[1].split(',').map(x => x.trim().split(/[=\s:]/)[0]).filter(Boolean).forEach(x => sah.add(x));
  for (const m of kode.matchAll(/(?:\(([^)]*)\)|([A-Za-z0-9_$]+))\s*=>/g))          // parameter arrow
    (m[1] ?? m[2] ?? '').split(',').map(x => x.trim().split(/[=\s:]/)[0]).filter(Boolean).forEach(x => sah.add(x));
  for (const m of kode.matchAll(/catch\s*\(\s*([A-Za-z0-9_$]+)/g)) sah.add(m[1]);
  for (const m of kode.matchAll(/^\s{4}([A-Za-z0-9_$]+):/gm)) sah.add(m[1]);        // kunci App.state

  // Pola yang sama dengan transformasi: kunci objek (name:) dan akses properti
  // (.name) memang sengaja TIDAK diubah, jadi keduanya bukan rujukan menggantung.
  const telanjang = NAMA.filter(n => !sah.has(n) &&
    new RegExp(`(?<![.\\w$])${esc$(n)}(?![\\w$])(?!\\s*:)`).test(kode));
  if (telanjang.length) { masalah++; console.log(`❌ ${f}  → ${telanjang.join(', ')}`); }
  else console.log(`✅ ${f}`);

  for (const n of NAMA)
    if (new RegExp(`^\\s*(?:const|let|var)\\s+${esc$(n)}(?![\\w$])`, 'm').test(kode) ||
        new RegExp(`App\\.${esc$(n)}\\s*=[^=]`, 'm').test(kode) ||
        new RegExp(`^\\s{4}${esc$(n)}:`, 'm').test(kode))
      asal.set(n, (asal.get(n) || []).concat(f));
}

const nol = NAMA.filter(n => !asal.has(n));
const dobel = [...asal].filter(([, fs]) => new Set(fs).size > 1);
console.log(`\ndefinisi: ${asal.size}/${NAMA.length} nama terdefinisi`);
if (nol.length)   { masalah++; console.log('❌ tak terdefinisi  :', nol.join(', ')); }
if (dobel.length) { masalah++; console.log('❌ terdefinisi ganda:', dobel.map(([n, f]) => `${n} (${[...new Set(f)].join('+')})`).join(', ')); }
console.log(masalah ? '\n❌ ADA MASALAH' : '\n✅ Tidak ada rujukan menggantung, tidak ada definisi ganda.');
process.exit(masalah ? 1 : 0);
