/* =========================================================
   Daftar guide — muat, saring, cocokkan nama
   Berkas 3 dari 8 — lapisan UI Penilaian Guide Besakih

   TUGAS    : Muat guides.json, penyaringan kategori/regu, pencocokan nama yang
              ambigu.
   LARANGAN : Nama ambigu tidak boleh ditebak diam-diam — "Darta" cocok untuk 14
              orang.

   Seluruh berkas di js/app/ berbagi satu objek window.App dan dimuat
   berurutan oleh index.html. State yang berubah hanya hidup di App.state;
   fungsi lintas berkas dipanggil lewat App.nama().
   ========================================================= */
(function () {
  'use strict';

  const App = window.App;
  const { $, esc } = App;

  /**
   * Daftar guide diambil berlapis, dari yang paling cepat tersedia:
   *   1. Cache di perangkat (hasil unduhan terakhir dari server)
   *   2. Salinan bawaan yang ikut terpasang bersama aplikasi (guides.json)
   *   3. Server — dipakai untuk memperbarui, bukan syarat agar daftar muncul
   *
   * Dengan begitu daftar nama SELALU ada, bahkan pada perangkat yang baru
   * dipasang dan belum pernah berhasil menghubungi server.
   */
  App.loadGuides = async function loadGuides() {
    const cached = DB.getGuides();
    if (cached && cached.list.length) {
      App.state.guides = cached.list;
      App.fillGuideInputs();
    } else {
      try {
        const res = await fetch('guides.json', { cache: 'no-cache' });
        const bawaan = await res.json();
        if (Array.isArray(bawaan) && bawaan.length) {
          App.state.guides = bawaan;
          App.fillGuideInputs();
        }
      } catch (e) {
        console.warn('[guides] salinan bawaan tidak terbaca', e);
      }
    }

    // Perbarui dari server di latar belakang
    try {
      const dariServer = await Sync.refreshGuides();
      if (Array.isArray(dariServer) && dariServer.length) {
        App.state.guides = dariServer;
        App.fillGuideInputs();
      }
    } catch {
      // Ditulis ke barisnya sendiri, bukan menimpa #guideHelp — di dalamnya ada
      // #guideCount yang masih dipakai fillGuideInputs().
      if (!App.state.guides.length) {
        const el = $('#guideAmbigu');
        if (el) {
          el.textContent = '⚠️ Daftar guide tidak dapat dimuat. Tutup lalu buka ulang aplikasi.';
          el.hidden = false;
        }
      }
    }
  }

  /** Ubah kode regu ("A1") menjadi label manusia ("Asing · Regu 1"). */
  App.labelRegu = function labelRegu(kode) {
    return String(kode || '').split(',').map(s => s.trim()).filter(Boolean).map(k => {
      const kat = k[0] === 'A' ? 'Asing' : 'Domestik';
      return `${kat} · Regu ${k.slice(1)}`;
    }).join(' + ');
  }

  /** Apakah guide termasuk dalam kategori/regu yang sedang dipilih. */
  App.cocokFilter = function cocokFilter(g, kategori, regu) {
    if (!kategori && !regu) return true;
    const kode = String(g.regu || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!kode.length) return false;
    return kode.some(k => {
      const kat = k[0] === 'A' ? 'Asing' : 'Domestik';
      return (!kategori || kat === kategori) && (!regu || k.slice(1) === regu);
    });
  }

  /** Daftar guide sesuai filter yang aktif di layar Penilaian. */
  App.guidesTersaring = function guidesTersaring() {
    const kat = $('#filterKategori') ? $('#filterKategori').value : '';
    const rg = $('#filterRegu') ? $('#filterRegu').value : '';
    return App.state.guides.filter(g => App.cocokFilter(g, kat, rg));
  }

  App.fillGuideInputs = function fillGuideInputs() {
    const list = App.guidesTersaring();
    const dl = $('#guideList');
    dl.innerHTML = list.map(g =>
      `<option value="${esc(g.guideName)}">${esc(App.labelRegu(g.regu))}</option>`
    ).join('');
    const total = App.state.guides.length;
    $('#guideCount').textContent = list.length === total
      ? `${total} guide aktif tersedia.`
      : `Menampilkan ${list.length} dari ${total} guide.`;
    if (App.state.current === 'guides') App.renderGuideCards();
  }

  /**
   * Cari guide dari teks yang diketik staff.
   * Yang sedang tersaring diprioritaskan, supaya pilihan filter menentukan
   * guide mana yang dimaksud bila ada nama mirip.
   */
  App.findGuide = function findGuide(name) {
    const q = String(name || '').trim().toLowerCase();
    if (!q) return null;
    const cari = (arr) => arr.find(g => g.guideName.toLowerCase() === q)
                       || arr.find(g => g.guideName.toLowerCase().includes(q))
                       || null;
    return cari(App.guidesTersaring()) || cari(App.state.guides);
  }

  /**
   * Penentuan guide saat penilaian DISIMPAN — sengaja lebih ketat daripada
   * findGuide yang dipakai untuk pratinjau saat mengetik.
   *
   * Banyak nama guide di sini hanya beda satu kata: mengetik "Darta" cocok
   * untuk 14 orang. Menebak yang pertama berarti penilaian tercatat atas nama
   * orang yang salah tanpa ada yang tahu — jadi ketikan yang masih ambigu
   * ditolak, bukan ditebak.
   */
  App.guideUntukSimpan = function guideUntukSimpan(name) {
    const teks = String(name || '').trim();
    const q = teks.toLowerCase();
    if (!q) return { error: 'Pilih nama guide dulu' };

    for (const arr of [App.guidesTersaring(), App.state.guides]) {
      const persis = arr.filter(g => g.guideName.toLowerCase() === q);
      if (persis.length === 1) return { guide: persis[0] };
      if (persis.length > 1) {
        return { error: `Ada ${persis.length} guide bernama "${teks}" — pilih lewat Daftar Guide` };
      }
      const mirip = arr.filter(g => g.guideName.toLowerCase().includes(q));
      if (mirip.length === 1) return { guide: mirip[0] };
      if (mirip.length > 1) {
        return { error: `"${teks}" cocok untuk ${mirip.length} guide — ketik nama lengkapnya`, kandidat: mirip };
      }
    }
    return { error: `Guide "${teks}" tidak ada dalam daftar` };
  }

  App.renderGuideCards = function renderGuideCards() {
    const q = ($('#guideSearch').value || '').toLowerCase();
    const list = App.state.guides
      .filter(g => !App.state.guideKategoriFilter || App.cocokFilter(g, App.state.guideKategoriFilter, ''))
      .filter(g => !q || g.guideName.toLowerCase().includes(q) || String(g.guideId).toLowerCase().includes(q));
    const box = $('#guideCards');
    const info = $('#guideTotal');
    if (info) info.textContent = `${list.length} dari ${App.state.guides.length} guide`;
    if (!list.length) {
      box.innerHTML = `<div class="empty"><span class="big">👥</span>Tidak ada guide yang cocok.</div>`;
      return;
    }
    // Batasi jumlah kartu yang digambar agar layar tetap ringan di perangkat lama.
    // Batas lama (120) menyembunyikan lebih dari separuh dari 296 guide bahkan
    // saat tanpa filter, jadi dinaikkan sampai seluruh daftar muat.
    const tampil = list.slice(0, 300);
    box.innerHTML = tampil.map(g => `
      <button class="card" data-guide="${esc(g.guideName)}">
        <span class="cstat">👤</span>
        <span class="cbody">
          <span class="cname">${esc(g.guideName)}</span>
          <span class="cmeta">${esc(g.guideId)} · ${esc(App.labelRegu(g.regu))}</span>
        </span>
      </button>`).join('')
      + (list.length > tampil.length
        ? `<div class="help">Menampilkan ${tampil.length} teratas. Ketik di kotak cari untuk mempersempit.</div>`
        : '');
  }
})();
