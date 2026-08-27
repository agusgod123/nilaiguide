/* =========================================================
   Navigasi antar layar
   Berkas 2 dari 8 — lapisan UI Penilaian Guide Besakih

   TUGAS    : Pindah layar, judul header, buka/tutup laci menu.
   LARANGAN : Tidak boleh tahu isi layar mana pun.

   Seluruh berkas di js/app/ berbagi satu objek window.App dan dimuat
   berurutan oleh index.html. State yang berubah hanya hidup di App.state;
   fungsi lintas berkas dipanggil lewat App.nama().
   ========================================================= */
(function () {
  'use strict';

  const App = window.App;
  const { $, $$, TITLES } = App;

  App.go = function go(view) {
    if (!TITLES[view]) view = 'home';
    App.state.current = view;
    $$('.view').forEach(v => v.hidden = true);
    const el = $('#view-' + view);
    if (el) el.hidden = false;
    $('#appTitle').textContent = TITLES[view];
    $('#btnBack').classList.toggle('hidden', view === 'home');
    $('#btnMenu').classList.toggle('hidden', view !== 'home');
    App.closeDrawer();
    window.scrollTo(0, 0);
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);

    if (view === 'riwayat') App.renderHistory();
    if (view === 'guides') App.renderGuideCards();
    if (view === 'home') App.refreshStats();
    if (view === 'pengaturan') { App.refreshStorage(); App.refreshServerNotice(); App.tampilkanSelisihJam(); }
  }

  App.openDrawer = function openDrawer() {
    $('#drawer').hidden = false; $('#scrim').hidden = false;
    $('#btnMenu').setAttribute('aria-expanded', 'true');
    App.refreshStats();
  }

  App.closeDrawer = function closeDrawer() {
    $('#drawer').hidden = true; $('#scrim').hidden = true;
    $('#btnMenu').setAttribute('aria-expanded', 'false');
  }
})();
