/**
 * ============================================================
 *  Konstanta bersama
 *  Berkas 1 dari 11 — proyek Apps Script "Penilaian Guide Besakih"
 * ============================================================
 *
 *  TUGAS    : Nama tab, indeks kolom, batas nilai, nama hari/bulan Indonesia.
 *  LARANGAN : Tidak boleh memuat logika, panggilan SpreadsheetApp, atau kode top-level
 *          selain literal. Berkas ini dievaluasi paling awal.
 *
 *  Seluruh berkas .gs berbagi SATU lingkup global — tidak ada import/export.
 *  Awalan angka pada nama berkas menandakan urutan evaluasi yang diinginkan.
 *  Karena tidak ada kode top-level selain literal, urutan itu sebenarnya tidak
 *  kritis; awalan angka dipakai supaya alur baca dari atas ke bawah masuk akal.
 * ============================================================
 */

var SHEET_EVAL    = 'Evaluations';

var SHEET_GUIDES  = 'Guides';

var SHEET_INFO    = 'Petunjuk';


// Zona waktu Bali (WITA, UTC+8). SELURUH pengelompokan tanggal memakai zona
// spreadsheet — kunci "satu pos sekali sehari", kolom tanggal rekap, kode bulan.
// Spreadsheet yang terlanjur dibuat dengan locale lain memotong hari pada jam
// yang salah, dan salahnya baru ketahuan lewat rekap yang meleset berminggu
// kemudian. setup() menguncinya supaya tidak bergantung pada locale pembuatnya.
var ZONA_WAKTU    = 'Asia/Makassar';


// Dua kolom terakhir untuk KOREKSI penilaian (salah pencet).
//   koreksiDari : evaluationId penilaian yang diperbaiki baris ini
//   status      : 'aktif' atau 'diganti'
// Baris tidak pernah dihapus — tab ini tetap append-only. Yang diperbaiki
// hanya ditandai 'diganti' dan dilewati saat rekap disusun, jadi jejak
// koreksinya tetap ada dan bisa ditelusuri.
var HEADER_EVAL   = ['evaluationId', 'timestamp', 'pos', 'guideId', 'guideName',
                     'uniform', 'idCard', 'review', 'etika', 'catatan', 'receivedAt',
                     'koreksiDari', 'status'];

var LEBAR_EVAL    = [290, 190, 50, 90, 200, 80, 70, 70, 70, 240, 190, 290, 80];

var KOL_KOREKSI   = 12;    // indeks kolom koreksiDari (1-based)

var KOL_STATUS    = 13;    // indeks kolom status (1-based)

var STATUS_AKTIF  = 'aktif';

var STATUS_GANTI  = 'diganti';


// ================= Skala penilaian =================
// UNIFORM tiga tingkat, menggantikan Ya/Tidak lama. Nilainya ikut dijumlahkan
// ke nilai total seperti Etika, jadi "penampilan bagus" benar-benar bernilai
// lebih, bukan sekadar label.
var UNIFORM_NILAI = [-1, 1, 2];

var UNIFORM_MIN   = -1;

var UNIFORM_MAKS  = 2;

var UNIFORM_LABEL = { '-1': 'pakaian tidak sesuai',
                      '1': 'pakaian sesuai',
                      '2': 'penampilan bagus' };

// Ambang "patuh" untuk kolom persen di rekap. Skala baru punya tiga tingkat,
// tapi kolom persen hanya mengenal patuh / tidak — +1 ke atas dihitung patuh.
var UNIFORM_PATUH = 1;


// Pengaman salah pencet, MENGGANTIKAN aturan "satu pos satu kali sehari".
// Sejak penilaian dihitung per pengantaran, satu guide boleh dinilai berkali-
// kali sehari di pos yang sama — jadi tidak ada lagi kunci harian yang menahan
// pencetan ganda. Yang tersisa: dua penilaian atas guide dan pos yang sama
// dalam jeda sesingkat ini hampir pasti salah pencet, bukan pengantaran baru.
// Satu siklus antar naik-turun jauh lebih lama dari ini.
var JEDA_PENILAIAN_MENIT = 30;


// Syarat minimal hadir agar seorang guide masuk tabel peringkat di tab Dasbor.
// Tanpa batas ini, guide yang kebetulan dinilai SEKALI dengan nilai sempurna
// akan menempati peringkat 1 dan menggeser orang yang taat sepanjang bulan.
// Yang di bawah batas tetap didaftar di bagian terpisah supaya tidak hilang.
// Sejak satuannya pengantaran (bukan hari), ambangnya ikut naik: beberapa
// pengantaran bisa terjadi dalam satu hari, sehingga "3" terlalu mudah
// ditembus hanya dalam sehari bertugas.
var MIN_PENGANTARAN_PERINGKAT = 5;

var JML_PERINGKAT      = 10;   // berapa baris per tabel peringkat


// Nama hari, dipakai kolom "Hari" di ringkasan harian dasbor. Ditulis sendiri
// karena locale proyek Apps Script berbahasa Inggris (lihat BULAN_ID).
var HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];


// Nama bulan ditulis sendiri, tidak menumpang locale proyek Apps Script.
// Locale proyek berbahasa Inggris, sehingga cap waktu berbunyi "3 Aug 2026".
var BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

var HEADER_GUIDES = ['guideId', 'guideName', 'kategori', 'regu', 'aktif'];


// Batas wajar, disamakan dengan aplikasi supaya kiriman aneh tidak masuk rekap.
var REVIEW_MAKS   = 20;     // kolom Review — tidak lagi diisi lewat aplikasi

var ETIKA_MIN     = -5;     // Etika boleh minus: -5 pelanggaran berat

var ETIKA_MAKS    = 5;      //                    +5 sangat baik

var CATATAN_MAKS  = 500;

var BATCH_MAKS    = 200;


// Bulan yang perlu dirangkum ulang, dititipkan oleh doPost dan dikerjakan
// oleh trigger `rekapOtomatis`. Lihat bagian "Pembaruan otomatis".
var PROP_TERTUNDA = 'rekapTertunda';


var REGU_INFO = [
  { kode: 'A1', kategori: 'Asing',    nomor: 1 },
  { kode: 'A2', kategori: 'Asing',    nomor: 2 },
  { kode: 'D1', kategori: 'Domestik', nomor: 1 },
  { kode: 'D2', kategori: 'Domestik', nomor: 2 }
];
