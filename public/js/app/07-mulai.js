/* =========================================================
   Perakitan — binding event, langganan Sync, init
   Berkas 8 dari 8 — lapisan UI Penilaian Guide Besakih

   TUGAS    : Satu-satunya berkas yang memasang listener DOM dan menjalankan
              init().
   LARANGAN : Tidak memuat logika bisnis; hanya menyambungkan DOM ke App.*.

   Seluruh berkas di js/app/ berbagi satu objek window.App dan dimuat
   berurutan oleh index.html. State yang berubah hanya hidup di App.state;
   fungsi lintas berkas dipanggil lewat App.nama().
   ========================================================= */
(function () {
  'use strict';

  const App = window.App;
  const { APP_VERSION, $, $$, ETIKA_MIN, ETIKA_MAKS, KRIT_ANGKA } = App;

  App.bind = function bind() {
    $('#btnMenu').addEventListener('click', App.openDrawer);
    $('#scrim').addEventListener('click', App.closeDrawer);
    $('#btnBack').addEventListener('click', () => App.go('home'));
    document.addEventListener('click', e => {
      const ulang = e.target.closest('[data-retry]');
      if (ulang) { App.cobaKirimLagi(ulang.dataset.retry); return; }
      const betul = e.target.closest('[data-fix]');
      if (betul) { App.mulaiKoreksi(betul.dataset.fix); return; }
      if (e.target.closest('[data-batal-koreksi]')) { App.batalKoreksi(); return; }
      const nav = e.target.closest('[data-nav]');
      if (nav) { App.go(nav.dataset.nav); }
      const gcard = e.target.closest('[data-guide]');
      if (gcard) {
        // guideId dulu — nama bisa kembar, id tidak pernah.
        const g = App.findGuideById(gcard.dataset.guideId) || App.findGuide(gcard.dataset.guide);
        if (g) {
          App.state.form.guide = g; $('#guideInput').value = g.guideName;
          App.showPicked(g); App.tampilkanKandidat(null); App.saveDraft(); App.go('nilai');
        }
      }
    });

    $('#btnNewEval').addEventListener('click', () => {
      // "Penilaian Baru" selalu berarti baru — kalau ada koreksi yang belum
      // selesai, formulirnya masih terkunci ke guide & pos penilaian lama.
      if (App.state.koreksi) App.batalKoreksi(true);
      App.state.form.pos = Number($('#homePos').value);
      $('#posSelect').value = App.state.form.pos;
      App.go('nilai');
    });
    $('#homePos').addEventListener('change', e => { App.state.form.pos = Number(e.target.value); Sync.Settings.set({ pos: App.state.form.pos }); App.saveDraft(); });
    $('#posSelect').addEventListener('change', e => {
      App.state.form.pos = Number(e.target.value);
      Sync.Settings.set({ pos: App.state.form.pos });
      $('#homePos').value = e.target.value;
      // Peringatan penilaian ganda terikat pada pos, jadi diperiksa ulang
      if (App.state.form.guide) App.showPicked(App.state.form.guide);
      App.saveDraft();
    });

    $('#guideInput').addEventListener('input', e => {
      const teks = String(e.target.value || '').trim();
      const q = teks.toLowerCase();
      // Nama yang diketik bisa dimiliki lebih dari satu orang. Yang sedang
      // tersaring diprioritaskan; kalau tetap lebih dari satu, jangan menebak —
      // tawarkan kandidatnya supaya staff memilih orangnya lewat guideId.
      const persis = (arr) => arr.filter(x => String(x.guideName).toLowerCase() === q);
      let cocok = persis(App.guidesTersaring());
      if (cocok.length !== 1) cocok = persis(App.state.guides);
      if (cocok.length > 1) {
        App.state.form.guide = null;
        $('#guidePicked').classList.add('hidden');
        App.tampilkanKandidat(cocok);
      } else {
        const g = cocok[0] || App.findGuide(teks);
        App.state.form.guide = g;
        if (g && g.guideName.toLowerCase() === q) App.showPicked(g);
        else $('#guidePicked').classList.add('hidden');
        App.tampilkanKandidat(null);
      }
      App.saveDraft();
      $('#draftNote').hidden = false;
    });
    $('#catatan').addEventListener('input', e => { App.state.form.catatan = e.target.value; App.saveDraft(); });

    $$('.criterion').forEach(c => {
      if (!KRIT_ANGKA[c.dataset.crit]) c.classList.add('unset');

      c.querySelectorAll('.seg').forEach(btn => btn.addEventListener('click', () => {
        App.state.form.crit[c.dataset.crit] = Number(btn.dataset.val) === 1;
        App.applyCritUI(); App.saveDraft(); App.haptic(15);
        $('#draftNote').hidden = false;
      }));

      // Penghitung Etika
      c.querySelectorAll('.stepbtn').forEach(btn => btn.addEventListener('click', () => {
        const kk = c.dataset.crit;
        const n = (Number(App.state.form.crit[kk]) || 0) + Number(btn.dataset.step);
        App.state.form.crit[kk] = Math.min(ETIKA_MAKS, Math.max(ETIKA_MIN, n));
        App.applyCritUI(); App.saveDraft(); App.haptic(15);
        $('#draftNote').hidden = false;
      }));
    });

    $('#formEval').addEventListener('submit', App.submitEval);

    $('#guideSearch').addEventListener('input', App.renderGuideCards);

    // Filter kategori & regu di layar Penilaian
    ['#filterKategori', '#filterRegu'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.addEventListener('change', () => {
        Sync.Settings.set({
          filterKategori: $('#filterKategori').value,
          filterRegu: $('#filterRegu').value,
        });
        // Kalau nama yang sudah diketik tak lagi masuk filter, kosongkan
        const g = App.findGuide($('#guideInput').value);
        if (!g || !App.cocokFilter(g, $('#filterKategori').value, $('#filterRegu').value)) {
          $('#guideInput').value = '';
          App.state.form.guide = null;
          $('#guidePicked').classList.add('hidden');
        }
        App.fillGuideInputs();
        App.saveDraft();
      });
    });

    // Filter kategori di layar Daftar Guide
    $$('.chip[data-gfilter]').forEach(ch => ch.addEventListener('click', () => {
      $$('.chip[data-gfilter]').forEach(x => x.classList.remove('active'));
      ch.classList.add('active');
      App.state.guideKategoriFilter = ch.dataset.gfilter;
      App.renderGuideCards();
    }));

    // Chip riwayat dan chip daftar guide harus terpisah — jangan pakai '.chip' polos
    $$('.chip[data-filter]').forEach(ch => ch.addEventListener('click', () => {
      $$('.chip[data-filter]').forEach(x => x.classList.remove('active'));
      ch.classList.add('active'); App.state.historyFilter = ch.dataset.filter; App.renderHistory();
    }));

    $('#btnExportCsv').addEventListener('click', App.exportCsv);
    $('#btnSyncNow').addEventListener('click', () => Sync.syncNow({ force: true }));
    $('#btnForceSync').addEventListener('click', () => Sync.syncNow({ force: true }));

    $('#btnTestServer').addEventListener('click', async () => {
      $('#testHint').textContent = 'Menghubungi server…';
      try {
        const r = await Sync.ping();
        $('#testHint').textContent = `✅ Terhubung · ${r.total} data di server`;
        App.toast('Server dapat dihubungi', 'ok', '📡');
        await App.loadGuides();
      } catch (e) {
        $('#testHint').textContent = '❌ Gagal: ' + e.message;
        App.toast('Server tidak dapat dihubungi', 'err', '❌');
      }
    });

    $('#btnBackup').addEventListener('click', async () => {
      App.download(`cadangan-penilaian-${Date.now()}.json`, await DB.exportJson(), 'application/json');
      App.toast('Cadangan JSON diunduh', 'ok', '📦');
    });

    $('#btnClearSynced').addEventListener('click', async () => {
      if (!confirm('Hapus semua data yang SUDAH terkirim dari perangkat ini?')) return;
      const n = await DB.clearSynced();
      App.toast(`${n} data terkirim dihapus`, 'ok', '🧹');
      App.refreshStats(); App.refreshStorage(); App.renderHistory();
    });

    $('#serverUrl').addEventListener('change', e => {
      Sync.Settings.set({ serverUrl: e.target.value.trim() });
      App.refreshServerNotice();
      App.toast('Alamat server disimpan', 'ok', '⚙️');
    });
    $('#optForceOffline').addEventListener('change', e => { Sync.Settings.set({ forceOffline: e.target.checked }); App.setNet(); });
    $('#optEncrypt').addEventListener('change', e => { Sync.Settings.set({ encrypt: e.target.checked }); DB.setEncryption(e.target.checked); App.toast('Berlaku untuk data baru', 'ok', '🔐'); });
    $('#optHaptic').addEventListener('change', e => Sync.Settings.set({ haptic: e.target.checked }));

    $('#btnShowTutorial').addEventListener('click', () => App.showTutorial(true));
    $('#tutSkip').addEventListener('click', App.endTutorial);
    $('#tutNext').addEventListener('click', () => {
      if (App.state.tutIndex < App.TUT.length - 1) { App.state.tutIndex++; App.renderTut(); } else App.endTutorial();
    });

    window.addEventListener('hashchange', () => App.go((location.hash || '#home').slice(1)));
    window.addEventListener('beforeunload', () => DB.backupNow());
  }

  App.bindSync = function bindSync() {
    Sync.onChange((state, d) => {
      App.setNet(state, d);
      if (state === 'done' && d.sent > 0) {
        // Rekap di spreadsheet disusun ulang oleh trigger tiap 5 menit, jadi
        // jeda singkat itu wajar dan bukan tanda data gagal masuk.
        App.toast(`${d.sent} data terkirim · rekap spreadsheet menyusul ±5 menit`, 'ok', '✅');
        App.haptic(20);
      }
      if (state === 'error') App.toast('Gagal kirim, akan dicoba lagi otomatis', 'warn', '⏳');
      if (state === 'ditolak') {
        // Ditolak server — bukan masalah jaringan, jadi jangan menjanjikan
        // "akan dicoba lagi otomatis" seolah-olah tinggal menunggu sinyal.
        App.toast(d.ditahan
          ? `${d.ditahan} penilaian ditahan — buka Riwayat untuk melihat alasannya`
          : `Ditolak server: ${d.message || 'lihat Riwayat'}`,
          'warn', '🚫');
      }
      if (state === 'offline') { /* badge saja */ }
      App.refreshStats();
      if (App.state.current === 'riwayat') App.renderHistory();
    });
  }

  App.init = async function init() {
    if (App.state.initialised) return;          // cegah inisialisasi ganda
    App.state.initialised = true;
    $$('[data-version]').forEach(el => el.textContent = APP_VERSION);

    const s = Sync.Settings.get();
    $('#serverUrl').value = s.serverUrl || '';
    $('#optForceOffline').checked = !!s.forceOffline;
    $('#optEncrypt').checked = s.encrypt !== false;
    $('#optHaptic').checked = s.haptic !== false;
    DB.setEncryption(s.encrypt !== false);
    App.state.form.pos = s.pos || 1;
    $('#homePos').value = String(App.state.form.pos);
    $('#posSelect').value = String(App.state.form.pos);
    // Filter guide diingat antar penilaian — staff satu pos biasanya
    // menangani kategori/regu yang sama sepanjang hari.
    if ($('#filterKategori')) $('#filterKategori').value = s.filterKategori || '';
    if ($('#filterRegu')) $('#filterRegu').value = s.filterRegu || '';

    App.bind();
    App.bindSync();

    const restored = await DB.restoreIfEmpty();
    if (restored) App.toast(`${restored} data dipulihkan dari cadangan`, 'warn', '♻️');

    await App.loadDraft();
    App.applyCritUI();
    App.setNet();
    await App.refreshStats();
    await App.loadGuides();
    App.go((location.hash || '#home').slice(1));
    App.showTutorial(false);
    Sync.start();

    // Service worker + pembaruan otomatis.
    // Strategi cache-first membuat perangkat bisa memakai versi lama setelah
    // aplikasi di-deploy ulang; blok ini memuat ulang halaman begitu versi baru
    // mengambil alih, sehingga staff tidak perlu membersihkan cache manual.
    const swBox = $('#aboutSw');
    if ('serviceWorker' in navigator) {
      // Tanyakan versi cache yang benar-benar aktif di perangkat ini.
      navigator.serviceWorker.addEventListener('message', ev => {
        if (ev.data && ev.data.versiCache && swBox) swBox.textContent = ev.data.versiCache;
      });
      const tanyaVersi = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage('versi');
        } else if (swBox) {
          swBox.textContent = 'belum dipasang (buka lewat HTTPS agar aktif)';
        }
      };
      setTimeout(tanyaVersi, 800);

      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      });
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          reg.update();
          setInterval(() => reg.update(), 60 * 60 * 1000); // cek pembaruan tiap jam
        })
        .catch(e => console.warn('[sw]', e));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init);
  else App.init();
})();
