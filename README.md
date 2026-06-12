# StudioKasir — POS Photography Studio

Sistem kasir modern untuk photography studio. Dibangun dengan Next.js 15, Prisma, dan PostgreSQL.

---

## ✨ Fitur

- **Kasir POS** — Pilih paket, add-on, promo, customer; ringkasan real-time; simpan & cetak invoice
- **Riwayat Transaksi** — Tabel dengan filter, pagination, download PDF per-invoice
- **Pengeluaran** — Catat biaya operasional studio dengan breakdown per kategori
- **Laporan** — Chart mingguan & bulanan, analitik metode pembayaran & paket terlaris
- **Google Sheets Sync** — Auto-sync setiap transaksi, queue otomatis jika offline, retry satu klik
- **Admin** — Kelola paket, add-on, kode promo, pengaturan studio
- **Authentication** — NextAuth.js, dua role: Admin & Kasir

---

## 🚀 Quick Start

### 1. Prasyarat

- Node.js 18+
- PostgreSQL (lokal atau cloud seperti Supabase/Neon)

### 2. Install & Setup

```bash
# Clone / copy folder ini, masuk ke direktori project
cd studiokasir

# Install dependencies
npm install

# Buat file .env dari template
cp .env.example .env
```

### 3. Edit `.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/studiokasir"
NEXTAUTH_SECRET="isi-dengan-random-string-panjang"
NEXTAUTH_URL="http://localhost:3000"
```

> **Tips generate NEXTAUTH_SECRET:**
> ```bash
> openssl rand -base64 32
> ```

### 4. Setup Database

```bash
# Push schema ke database
npm run db:push

# Isi data awal (users, paket, addon, promo, customers)
npm run db:seed
```

### 5. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 👤 Demo Login

| Role  | Email                      | Password  |
|-------|----------------------------|-----------|
| Admin | admin@studiokasir.com      | admin123  |
| Kasir | kasir@studiokasir.com      | kasir123  |

---

## 📊 Google Sheets Sync (Opsional)

1. Buat Google Spreadsheet baru di [sheets.google.com](https://sheets.google.com)
2. Copy **Spreadsheet ID** dari URL (bagian antara `/d/` dan `/edit`)
3. Buka **Extensions → Apps Script**
4. Hapus kode default, paste kode dari halaman **Sheets Sync** di aplikasi
5. Deploy → **New deployment** → Web App
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy URL hasil deploy
7. Paste di **Admin → Pengaturan → Webhook URL**, klik Simpan & Test

Sheet bulanan otomatis dibuat: `JAN_2026`, `FEB_2026`, dst.

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Semua halaman setelah login
│   │   ├── layout.tsx         # Sidebar + topbar
│   │   ├── dashboard/         # Dashboard + chart
│   │   ├── kasir/             # POS utama
│   │   ├── transaksi/         # Riwayat transaksi
│   │   ├── pengeluaran/       # Manajemen pengeluaran
│   │   ├── laporan/           # Laporan & analitik
│   │   ├── sheets/            # Google Sheets sync
│   │   └── settings/          # Admin & pengaturan
│   └── api/                   # API routes
│       ├── auth/              # NextAuth handler
│       ├── transactions/      # CRUD + sync
│       ├── customers/         # CRUD customer
│       ├── packages/          # CRUD paket
│       ├── addons/            # CRUD add-on
│       ├── promos/            # CRUD promo
│       ├── expenses/          # CRUD pengeluaran
│       ├── reports/           # Laporan dashboard
│       ├── settings/          # Pengaturan studio
│       └── sync/retry/        # Batch retry queue
├── components/
│   ├── pos/invoice-modal.tsx  # Invoice + PDF download
│   ├── shared/                # Badge, StatCard, PageHeader, dll
│   └── ui/                    # Toast, Toaster
├── hooks/
│   └── use-store.ts           # Zustand: POS cart + sync queue
├── lib/
│   ├── auth.ts                # NextAuth config
│   ├── prisma.ts              # Prisma singleton
│   └── utils.ts               # formatRupiah, generateInvoiceNumber, dll
└── types/
    └── index.ts               # Type definitions
```

---

## 🛠 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run db:push      # Push schema (tanpa migrasi)
npm run db:migrate   # Buat migration file
npm run db:seed      # Isi data awal
npm run db:studio    # Buka Prisma Studio (GUI database)
```

---

## 🔧 Tech Stack

| Layer       | Teknologi                                   |
|-------------|---------------------------------------------|
| Framework   | Next.js 15 (App Router)                     |
| Language    | TypeScript                                  |
| Styling     | Tailwind CSS + Radix UI                     |
| Database    | PostgreSQL + Prisma ORM                     |
| Auth        | NextAuth.js v5 (JWT + Credentials)          |
| State       | Zustand                                     |
| Form        | React Hook Form + Zod                       |
| Charts      | Recharts                                    |
| PDF         | html2pdf.js                                 |
| Sync        | Google Apps Script Webhook                  |
