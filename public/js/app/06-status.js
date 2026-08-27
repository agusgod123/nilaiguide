/* =========================================================
   Statistik, status jaringan & penyimpanan, tutorial
   Berkas 7 dari 8 — lapisan UI Penilaian Guide Besakih

   TUGAS    : Angka ringkas di beranda, status server/jaringan, koreksi jam
              perangkat, tutorial.
   LARANGAN : —

   Seluruh berkas di js/app/ berbagi satu objek window.App dan dimuat
   berurutan oleh index.html. State yang berubah hanya hidup di App.state;
   fungsi lintas berkas dipanggil lewat App.nama().
   ========================================================= */
(function () {
  'use strict';

  const App = window.App;
  const { $, esc } = App;

  App.refreshStats = async function refreshStats() {
    const c = await DB.counts();
    $('#statTotal').textContent = c.today;
    $('#statPending').textContent = c.pending;
    $('#statSynced').textContent = c.synced;
    $('#drawerSync').textContent = `Menunggu sync: ${c.pending}`;
    $('#syncHint').textContent = c.pending ? `${c.pending} data menunggu dikirim` : 'Semua data sudah terkirim';
    $('#btnSyncNow').toggleAttribute('disabled', c.pending === 0);

    // Entri yang ditahan tidak masuk hitungan "Menunggu Sync" — kalau tidak
    // diberi tempat sendiri di layar utama, staff tidak akan pernah tahu ada
    // penilaian yang berhenti dikirim.
    App.tampilkanSelisihJam();

    const el = $('#homeDitahan');
    if (el) {
      el.hidden = !c.buntu;
      if (c.buntu) {
        el.innerHTML =
          `<strong>🚫 ${c.buntu} penilaian ditahan</strong>` +
          `<p>Ditolak server berkali-kali, jadi pengiriman otomatis dihentikan. Datanya aman. ` +
          `Buka <em>Riwayat</em> untuk melihat alasannya dan mengirim ulang.</p>`;
      }
    }
  }

  /**
   * Jam perangkat yang meleset membuat penilaian jatuh pada TANGGAL yang salah
   * di rekap — dan tidak terlihat dari perangkat itu sendiri, karena seluruh
   * tampilan aplikasi memakai jam yang sama melesetnya. Selisihnya dipelajari
   * dari balasan server (lihat catatWaktuServer di sync.js).
   */
  App.tampilkanSelisihJam = function tampilkanSelisihJam() {
    const ms = DB.selisihJam();
    const parah = DB.jamMencurigakan();
    const menit = Math.round(Math.abs(ms) / 60000);
    const arah = ms > 0 ? 'ketinggalan' : 'kecepatan';
    const teks = menit >= 60
      ? `${Math.floor(menit / 60)} jam ${menit % 60} menit`
      : `${menit} menit`;

    const beranda = $('#jamNotice');
    if (beranda) {
      beranda.hidden = !parah;
      if (parah) {
        beranda.innerHTML =
          `<strong>🕐 Jam perangkat ini meleset ${esc(teks)}</strong>` +
          `<p>Jamnya ${arah} dibanding jam server. Penilaian tetap dicatat pada waktu yang benar ` +
          `(aplikasi mengoreksinya sendiri), tapi sebaiknya jam HP dibetulkan lewat ` +
          `Pengaturan HP → Tanggal &amp; waktu → otomatis.</p>`;
      }
    }

    const kotak = $('#jamStatus');
    if (kotak) {
      kotak.hidden = !ms;
      if (ms) {
        kotak.innerHTML = parah
          ? `<strong>🕐 Jam perangkat meleset ${esc(teks)}</strong>` +
            `<p>Cap waktu penilaian sudah dikoreksi otomatis sebesar selisih itu. Betulkan jam HP ` +
            `supaya koreksi ini tidak lagi diperlukan.</p>`
          : `<strong>🕐 Jam perangkat selaras</strong>` +
            `<p>Selisih dengan jam server ${esc(teks)} — masih dalam batas wajar.</p>`;
      }
    }
  }

  App.setNet = function setNet(state, detail) {
    const badge = $('#netBadge');
    const label = badge.querySelector('.netlabel');
    badge.classList.remove('offline', 'syncing');
    if (state === 'syncing') { badge.classList.add('syncing'); label.textContent = 'Mengirim…'; return; }
    if (!Sync.isOnline()) { badge.classList.add('offline'); label.textContent = 'Offline'; return; }
    label.textContent = 'Online';
  }

  App.refreshServerNotice = function refreshServerNotice() {
    const el = $('#serverNotice');
    if (el) el.hidden = !Sync.needsServerUrl();

    // Tampilkan alamat yang BENAR-BENAR dipakai, supaya kolom yang sengaja
    // dibiarkan kosong tidak disangka "belum diatur".
    const box = $('#serverAktif');
    if (!box) return;
    const manual = String(Sync.Settings.get().serverUrl || '').trim();
    const bawaan = String((window.APP_CONFIG && window.APP_CONFIG.serverUrl) || '').trim();
    const aktif = Sync.baseUrl();
    const belumAda = Sync.needsServerUrl();

    box.classList.toggle('kosong', belumAda);
    box.querySelector('strong').textContent = belumAda
      ? 'Belum terhubung ke server mana pun'
      : 'Sedang terhubung ke:';
    $('#serverAktifUrl').textContent = belumAda ? '—' : aktif;
    $('#serverAktifSumber').textContent = belumAda
      ? 'Isi kolom di bawah dengan alamat server.'
      : (manual ? 'Diisi manual di perangkat ini.'
                : (bawaan ? 'Alamat bawaan aplikasi — tidak perlu diubah.'
                          : 'Server tempat aplikasi ini dibuka.'));
  }

  App.refreshStorage = async function refreshStorage() {
    const info = await DB.storageInfo();
    const pct = Math.round(info.ratio * 100);
    const bar = $('.storagebar');
    bar.querySelector('i').style.width = pct + '%';
    bar.classList.toggle('full', info.ratio > 0.85);
    const mb = n => (n / 1048576).toFixed(2) + ' MB';
    $('#storageText').textContent = info.ratio > 0.85
      ? `⚠️ Penyimpanan hampir penuh (${mb(info.used)} / ${mb(info.quota)}) — segera sync!`
      : `Penyimpanan lokal: ${mb(info.used)} dari ${mb(info.quota)}`;

    // Keadaan cadangan dilaporkan, bukan didiamkan. Cadangan yang berhenti
    // diperbarui adalah kegagalan senyap paling berbahaya di aplikasi ini:
    // yang dipakai restoreIfEmpty() saat IndexedDB rusak justru cadangan itu.
    const st = DB.statusCadangan();
    const kotak = $('#backupStatus');
    if (kotak) {
      if (!st) {
        kotak.hidden = true;
      } else if (st.gagal) {
        kotak.hidden = false;
        kotak.className = 'notice';
        kotak.innerHTML = `<strong>⚠️ Cadangan lokal gagal disimpan</strong><p>${esc(st.pesan || '')}</p>`;
      } else if (st.sebagian) {
        kotak.hidden = false;
        kotak.className = 'notice';
        kotak.innerHTML = `<strong>ℹ️ Cadangan dipangkas</strong>` +
          `<p>${st.disimpan} dari ${st.total} penilaian tercadangkan. Yang belum terkirim ` +
          `(${st.belum}) selalu diutamakan; yang sudah terkirim dilewati karena salinannya ` +
          `sudah ada di server. Tekan <em>Hapus Data Terkirim</em> untuk melegakan ruang.</p>`;
      } else {
        kotak.hidden = true;
      }
    }
    $('#aboutStorage').textContent = DB.isEncryptionActive() ? 'IndexedDB (terenkripsi AES-256)' : 'IndexedDB';
  }

  const TUT = [
    { i: '👋', t: 'Selamat Datang', b: 'Aplikasi ini untuk menilai guide di pos pemeriksaan Kawasan Besakih. Tidak perlu login.' },
    { i: '📝', t: 'Langkah 1 — Pilih', b: 'Tekan tombol hijau “Penilaian Baru”, lalu pilih pos dan nama guide.' },
    { i: '✅', t: 'Langkah 2 — Nilai', b: 'Tekan Ya atau Tidak untuk Uniform dan ID‑Card. Untuk Etika, tekan − atau + (−5 sampai +5); biarkan 0 bila biasa saja. Lalu tekan SIMPAN.' },
    { i: '📶', t: 'Langkah 3 — Tenang', b: 'Tanpa sinyal pun data tetap tersimpan. Saat Wi‑Fi menyala, data terkirim sendiri (⏳ menjadi ✅).' },
  ];

  App.showTutorial = function showTutorial(force) {
    if (!force && localStorage.getItem('besakih.tutorialDone')) return;
    App.state.tutIndex = 0; App.renderTut(); $('#tutorial').hidden = false;
  }

  App.renderTut = function renderTut() {
    const s = TUT[App.state.tutIndex];
    $('#tutIcon').textContent = s.i;
    $('#tutTitle').textContent = s.t;
    $('#tutBody').textContent = s.b;
    $('#tutDots').innerHTML = TUT.map((_, i) => `<i class="${i === App.state.tutIndex ? 'on' : ''}"></i>`).join('');
    $('#tutNext').textContent = App.state.tutIndex === TUT.length - 1 ? 'Mulai' : 'Lanjut';
  }

  App.endTutorial = function endTutorial() {
    localStorage.setItem('besakih.tutorialDone', '1');
    $('#tutorial').hidden = true;
  }

  /* Diekspor supaya berkas lain bisa men-destructure-nya dari App. */
  Object.assign(App, { TUT });
})();
