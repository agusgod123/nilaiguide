/* =========================================================
   segmen.mjs — pisahkan sumber JavaScript menjadi segmen KODE dan TEKS.

   Dipakai alat penataan ulang: penggantian nama hanya boleh menyentuh KODE,
   tidak boleh menyentuh isi string, komentar, atau literal regex. Sebaliknya,
   isi ${...} di dalam template literal ADALAH kode dan wajib ikut diproses.

   Jaminan: segmen(s).map(x => x.t).join('') === s

   Tiga jebakan yang sudah memakan waktu saat menulis berkas ini:
     1. Isi ${...} sempat dianggap teks — rujukan di dalamnya tidak tertransformasi.
     2. '/' setelah KATA KUNCI (return /re/) sempat dibaca sebagai pembagian;
        tanda kutip di dalam kelas karakter lalu membuka string palsu.
     3. Pelompat ekspresi ${...} sempat tidak melompati literal regex, sehingga
        ${s.replace(/"/g, '""')} membuat kutipnya kabur sampai akhir berkas.
   ========================================================= */

const KATA_KUNCI = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new',
  'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

/** '/' memulai literal regex bila token sebelumnya tanda baca atau kata kunci. */
function regexBoleh(ekor) {
  const t = ekor.replace(/\s+$/, '');
  if (!t) return true;
  if (/[(,=:[!&|?{};+\-*%~^<>]$/.test(t)) return true;
  const kata = t.match(/[A-Za-z_$][\w$]*$/);
  return !!kata && KATA_KUNCI.has(kata[0]);
}

/* ---- Pelompat: kembalikan indeks TEPAT SETELAH konstruksi ---- */
function lompatString(s, i) {
  const q = s[i];
  let j = i + 1;
  while (j < s.length) { if (s[j] === '\\') { j += 2; continue; } if (s[j] === q) return j + 1; j++; }
  return j;
}
function lompatRegex(s, i) {
  let j = i + 1, kelas = false;
  while (j < s.length) {
    if (s[j] === '\\') { j += 2; continue; }
    if (s[j] === '[') kelas = true;
    else if (s[j] === ']') kelas = false;
    else if (s[j] === '/' && !kelas) { j++; break; }
    j++;
  }
  while (j < s.length && /[gimsuyd]/.test(s[j])) j++;
  return j;
}
function lompatTemplate(s, i) {
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === '\\') { j += 2; continue; }
    if (s[j] === '`') return j + 1;
    if (s[j] === '$' && s[j + 1] === '{') { j = lompatEkspresi(s, j + 2); continue; }
    j++;
  }
  return j;
}
/** Sudah berada tepat di dalam ${ ; kembalikan indeks setelah } pasangannya. */
function lompatEkspresi(s, i) {
  let d = 1, j = i, ekor = '';
  while (j < s.length) {
    const c = s[j], n = s[j + 1];
    if (c === '/' && n === '/') { while (j < s.length && s[j] !== '\n') j++; continue; }
    if (c === '/' && n === '*') { j += 2; while (j < s.length && !(s[j] === '*' && s[j + 1] === '/')) j++; j += 2; continue; }
    if (c === '`') { j = lompatTemplate(s, j); ekor = '`'; continue; }
    if (c === '"' || c === "'") { j = lompatString(s, j); ekor = c; continue; }
    if (c === '/' && regexBoleh(ekor)) { j = lompatRegex(s, j); ekor = '/'; continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return j + 1; }
    if (!/\s/.test(c)) ekor = (ekor + c).slice(-40);
    j++;
  }
  return j;
}

export function segmen(s) {
  const seg = [];
  const push = (t, kode) => { if (t) seg.push({ t, kode }); };
  let i = 0, buf = '', ekor = '';
  const catat = t => { const b = t.replace(/\s+$/, ''); if (b) ekor = (ekor + b).slice(-40); };

  /** Pancarkan template literal; isi ${...} dipindai rekursif sebagai kode. */
  const pancarTemplate = (mulai) => {
    let j = mulai + 1, teks = '`';
    while (j < s.length) {
      if (s[j] === '\\') { teks += s[j] + (s[j + 1] ?? ''); j += 2; continue; }
      if (s[j] === '`') { push(teks + '`', false); return j + 1; }
      if (s[j] === '$' && s[j + 1] === '{') {
        push(teks, false); teks = '';
        const akhir = lompatEkspresi(s, j + 2);
        const tutup = s[akhir - 1] === '}';
        push(s.slice(j, j + 2), false);
        for (const sub of segmen(s.slice(j + 2, tutup ? akhir - 1 : akhir))) seg.push(sub);
        if (tutup) push('}', false);
        j = akhir; continue;
      }
      teks += s[j]; j++;
    }
    push(teks, false);
    return j;
  };

  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') { push(buf, true); catat(buf); buf = ''; let j = i; while (j < s.length && s[j] !== '\n') j++; push(s.slice(i, j), false); i = j; continue; }
    if (c === '/' && d === '*') { push(buf, true); catat(buf); buf = ''; let j = i + 2; while (j < s.length && !(s[j] === '*' && s[j + 1] === '/')) j++; push(s.slice(i, j + 2), false); i = j + 2; continue; }
    if (c === '`') { push(buf, true); catat(buf); buf = ''; i = pancarTemplate(i); catat('`'); continue; }
    if (c === '"' || c === "'") { push(buf, true); catat(buf); buf = ''; const j = lompatString(s, i); push(s.slice(i, j), false); i = j; catat(c); continue; }
    if (c === '/' && regexBoleh(ekor + buf)) { push(buf, true); catat(buf); buf = ''; const j = lompatRegex(s, i); push(s.slice(i, j), false); i = j; catat('/'); continue; }
    buf += c; i++;
  }
  push(buf, true);
  return seg;
}
