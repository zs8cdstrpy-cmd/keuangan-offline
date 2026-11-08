# 💰 Keuangan Offline

Aplikasi pencatatan keuangan **100% offline**, gratis, dan open source. Data disimpan otomatis di browser (localStorage) — tidak perlu internet setelah dibuka sekali.

Terinspirasi dari aplikasi populer seperti **Money Manager**, **Wallet**, **Expense Tracker**, dan **Money Lover**.

## ✨ Fitur Utama

| Fitur | Keterangan |
|-------|------------|
| **Multi Akun / Dompet** | Tunai, Bank, E-Wallet, dll. |
| **Kategori Lengkap** | Pemasukan & Pengeluaran (bisa ditambah/edit) |
| **Transaksi** | Pemasukan, Pengeluaran, Transfer antar akun |
| **Autosave** | Setiap perubahan langsung disimpan |
| **Input Manual** | Form lengkap + tanggal + catatan |
| **Input Otomatis** | Transaksi berulang (harian/mingguan/bulanan/tahunan) |
| **Import CSV** | Import transaksi dari file CSV |
| **Backup / Restore** | Download & restore data JSON |
| **Laporan** | Ringkasan bulan + breakdown per kategori |
| **Filter** | Filter transaksi by akun, jenis, bulan |
| **PWA Ready** | Bisa di-install seperti aplikasi native |

## 🚀 Cara Pakai

### Opsi 1: Langsung buka di browser (paling mudah)
1. Clone atau download repo ini
2. Buka file `index.html` di browser (Chrome / Firefox / Edge / Safari)
3. Selesai. Data tersimpan otomatis di browser Anda.

### Opsi 2: GitHub Pages (gratis)
1. Fork repo ini
2. Settings → Pages → Source: Deploy from branch `main` / `root`
3. Akses lewat `https://username.github.io/nama-repo`

### Opsi 3: Local server (opsional)
```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

## 📁 Struktur File

```
keuangan-offline/
├── index.html      # Struktur halaman
├── styles.css      # Styling modern & responsif
├── app.js          # Logika aplikasi + localStorage
├── manifest.json   # PWA manifest
└── README.md
```

## 📥 Format Import CSV

```
tanggal,jenis,jumlah,akun,kategori,catatan
2026-11-01,pengeluaran,50000,Dompet Tunai,Makanan,Makan siang
2026-11-02,pemasukan,5000000,Rekening Bank,Gaji,Gaji bulanan
```

- `jenis`: `pemasukan` / `pengeluaran` (atau `income` / `expense`)
- Tanggal format: `YYYY-MM-DD`

## 🔒 Privasi

- Semua data **hanya** tersimpan di perangkat Anda (localStorage browser)
- Tidak ada server, tidak ada akun, tidak ada tracking
- Cocok untuk yang menginginkan privasi penuh

## 🛠️ Teknologi

- HTML5 + CSS3 + Vanilla JavaScript (tanpa framework)
- localStorage untuk persistence
- Progressive Web App (PWA) ready
- Responsive (mobile & desktop)

## 📝 Lisensi

MIT License — bebas digunakan, dimodifikasi, dan didistribusikan.

---

Dibuat untuk kebutuhan pencatatan keuangan pribadi & operasional sederhana.
