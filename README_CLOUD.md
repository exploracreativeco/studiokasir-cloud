# StudioKasir Cloud Setup

## Perbedaan dari versi offline
- Database: PostgreSQL (Supabase) bukan SQLite
- Port: 7733
- Deploy: Railway/Vercel/VPS
- Feature flags semua aktif

## Langkah Setup

### 1. Jalankan cleanup
```powershell
cd C:\StudioKasirCloud
.\setup_cloud.ps1
```

### 2. Setup Supabase
1. Buka supabase.com → buat project baru
2. Settings → Database → Connection String
3. Copy URI dan URI+pgbouncer

### 3. Setup .env
```powershell
Copy-Item ".env.example" ".env"
# Edit .env dengan connection string Supabase
notepad .env
```

### 4. Install dependencies & push schema
```powershell
npm install
npx prisma generate
npx prisma db push
```

### 5. Build & run
```powershell
npm run build
npm run start
# App berjalan di http://localhost:7733
```

### 6. Deploy ke Railway
1. Push ke GitHub
2. railway.app → New Project → Deploy from GitHub
3. Set environment variables dari .env
4. Railway otomatis deploy

## Catatan penting
- Semua contains search perlu tambah `mode: 'insensitive'` untuk PostgreSQL
- Logo base64 tersimpan di DB (field @db.Text)
- Backup DB via Supabase dashboard
