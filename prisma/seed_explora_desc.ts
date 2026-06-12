import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating package descriptions and biaya ops...')

  // Deskripsi per paket
  const packageDescriptions: Record<string, string> = {
    // PASFOTO
    'Pasfoto Close Up': '✓ Soft file only\n✓ 1 outfit & 1 pose\n✓ Editing 10+ background\n✓ Retouch simple wajah\n✓ Maksimal take 5x\n✓ 1 edit foto terbaik\nFasilitas: Jas hitam, Kemeja putih, Dasi',
    'Pasfoto Fullbody': '✓ Soft file only\n✓ 1 outfit & 1 pose\n✓ Editing 10+ background\n✓ Retouch simple wajah\n✓ Maksimal take 5x\n✓ 1 edit foto terbaik\nFasilitas: Jas hitam, Kemeja putih, Dasi',
    // CETAK
    'Cetak Pasfoto 4x6 (4pcs)': '✓ Cetak 4x6 (4 pcs)\n✓ Bisa mix setengah',
    'Cetak Pasfoto 3x4 (8pcs)': '✓ Cetak 3x4 (8 pcs)\n✓ Bisa mix setengah',
    'Cetak Pasfoto 2x3 (16pcs)': '✓ Cetak 2x3 (16 pcs)\n✓ Bisa mix setengah',
    // FAMILY
    'Family Basic': '✓ All Soft file via Gdrive (Unlimited)\n✓ Waktu 20 menit\n✓ 1 Studio\n✓ Studio + Fotografer',
    'Family Standard': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 5 foto\n✓ Cetak 10RS + Frame 2 pcs\n✓ Waktu 30 menit\n✓ 1 Studio\n✓ Studio + Fotografer',
    'Family Premium': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 10 foto\n✓ Cetak 10RS + Frame 1 pcs\n✓ Cetak 12RS + Frame 1 pcs\n✓ Waktu 45 menit\n✓ 1 Studio\n✓ Studio + Fotografer',
    'Family Exclusive': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 15 foto\n✓ Cetak 16RS + Frame 1 pcs\n✓ Waktu 60 menit\n✓ 1 Studio\n✓ Studio + Fotografer',
    // GRADUATION
    'Graduation Basic': '✓ All Soft file via Gdrive (Unlimited)\n✓ Waktu 20 menit\n✓ 1 Studio\n✓ Studio + Fotografer',
    'Graduation Standard': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 5 foto\n✓ Cetak 10RS + Frame 2 pcs\n✓ Waktu 30 menit\n✓ 1 Studio\n✓ Studio + Fotografer',
    'Graduation Premium': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 10 foto\n✓ Cetak 10RS + Frame 1 pcs\n✓ Cetak 12RS + Frame 1 pcs\n✓ Waktu 45 menit\n✓ 1 Studio\n✓ Studio + Fotografer',
    'Graduation Exclusive': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 15 foto\n✓ Cetak 16RS + Frame 1 pcs\n✓ Waktu 60 menit\n✓ 1 Studio\n✓ Studio + Fotografer',
    // COUPLE
    'Couple Basic': '✓ All Soft file via Gdrive (Unlimited)\n✓ Waktu 20 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ Maks 2 orang',
    'Couple Standard': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 5 foto\n✓ Cetak 10RS + Frame 2 pcs\n✓ Waktu 30 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ Maks 2 orang',
    'Couple Premium': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 10 foto\n✓ Cetak 10RS + Frame 1 pcs\n✓ Cetak 12RS + Frame 1 pcs\n✓ Waktu 45 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ Maks 2 orang',
    'Couple Exclusive': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 15 foto\n✓ Cetak 16RS + Frame 1 pcs\n✓ Waktu 60 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ Maks 2 orang',
    // MATERNITY
    'Maternity Basic': '✓ All Soft file via Gdrive (Unlimited)\n✓ Waktu 20 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ Maks 2 orang',
    'Maternity Standard': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 5 foto\n✓ Cetak 10RS + Frame 2 pcs\n✓ Waktu 30 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ Maks 2 orang',
    'Maternity Premium': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 10 foto\n✓ Cetak 10RS + Frame 1 pcs\n✓ Cetak 12RS + Frame 1 pcs\n✓ Waktu 45 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ Maks 2 orang',
    'Maternity Exclusive': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 15 foto\n✓ Cetak 16RS + Frame 1 pcs\n✓ Waktu 60 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ Maks 2 orang',
    // GROUP
    'Group Basic (3-9 org)': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 2 foto\n✓ Waktu 20 menit\n✓ Studio + Fotografer\n✓ 3-9 orang',
    'Group Standard (3-9 org)': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 5 foto\n✓ Cetak 4r 1/orang\n✓ Waktu 30 menit\n✓ Studio + Fotografer\n✓ 3-9 orang',
    'Group Premium (3-9 org)': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 10 foto\n✓ Cetak 4r 1/orang\n✓ Cetak 10RS + Frame 1 pcs\n✓ Waktu 45 menit\n✓ Studio + Fotografer\n✓ 3-9 orang',
    'Group Exclusive (3-9 org)': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 20 foto\n✓ Cetak 4r 1/orang\n✓ Cetak 12RS + Frame 1 pcs\n✓ Waktu 60 menit\n✓ Studio + Fotografer\n✓ 3-9 orang',
    // SQUAD
    'Squad Basic (10-19 org)': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 2 foto\n✓ Waktu 20 menit\n✓ Studio + Fotografer\n✓ 10-19 orang (harga per orang)',
    'Squad Standard (10-19 org)': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 5 foto\n✓ Cetak 4r 1/orang\n✓ Waktu 30 menit\n✓ Studio + Fotografer\n✓ 10-19 orang (harga per orang)',
    'Squad Premium (10-19 org)': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 10 foto\n✓ Cetak 4r 1/orang\n✓ Cetak 10RS + Frame 1 pcs\n✓ Waktu 45 menit\n✓ Studio + Fotografer\n✓ 10-19 orang (harga per orang)',
    'Squad Exclusive (10-19 org)': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 20 foto\n✓ Cetak 4r 1/orang\n✓ Cetak 12RS + Frame 1 pcs\n✓ Waktu 60 menit\n✓ Studio + Fotografer\n✓ 10-19 orang (harga per orang)',
    // PERSONAL
    'Personal Standard': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 5 foto\n✓ Waktu 30 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ 1 orang',
    'Personal Premium': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 10 foto\n✓ Cetak 4r 2 pcs\n✓ Cetak 10RS + Frame 1 pcs\n✓ Waktu 45 menit\n✓ 1 Studio\n✓ Studio + Fotografer\n✓ 1 orang',
    'Personal Exclusive': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 15 foto\n✓ Cetak 4r 2 pcs\n✓ Cetak 10RS + Frame 1 pcs\n✓ Waktu 60 menit\n✓ Semua studio\n✓ Studio + Fotografer\n✓ 1 orang',
    // PREWEDDING
    'Prewedding Indoor Premium': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 25 foto\n✓ Cetak 16RS + Frame 1 pcs\n✓ Waktu 2 jam\n✓ Fotografer by owner\n✓ Background by discuss\n✓ Bonus pasfoto buku nikah\n* Tidak termasuk kostum dan MUA',
    'Prewedding Indoor Exclusive': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 35 foto\n✓ Cetak 16RS + Frame 1 pcs\n✓ Waktu 2,5 jam\n✓ Fotografer by owner\n✓ Background by discuss\n✓ Bonus pasfoto buku nikah\n* Tidak termasuk kostum dan MUA',
    'Prewedding Indoor Diamond': '✓ All Soft file via Gdrive (Unlimited)\n✓ Editing 50 foto\n✓ Cetak 16RS + Frame 1 pcs\n✓ Waktu 3 jam\n✓ Fotografer by owner\n✓ Background by discuss\n✓ Bonus pasfoto buku nikah\n* Tidak termasuk kostum dan MUA',
  }

  // Update descriptions
  for (const [name, description] of Object.entries(packageDescriptions)) {
    const pkg = await prisma.package.findFirst({ where: { name } })
    if (pkg) {
      await prisma.package.update({ where: { id: pkg.id }, data: { description } })
      console.log(`Updated: ${name}`)
    }
  }

  // BiayaOps per paket (harga modal supplier)
  // Harga supplier: 10rs=5000, 12rs=10000, 16rs=60000, 4r=3000 (estimasi)
  const packageBiayaOps: Record<string, Array<{ukuran: string, jenis: string, jumlah: number}>> = {
    'Family Standard': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 2 }],
    'Family Premium': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 1 }, { ukuran: '12RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Family Exclusive': [{ ukuran: '16RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Graduation Standard': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 2 }],
    'Graduation Premium': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 1 }, { ukuran: '12RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Graduation Exclusive': [{ ukuran: '16RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Couple Standard': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 2 }],
    'Couple Premium': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 1 }, { ukuran: '12RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Couple Exclusive': [{ ukuran: '16RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Maternity Standard': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 2 }],
    'Maternity Premium': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 1 }, { ukuran: '12RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Maternity Exclusive': [{ ukuran: '16RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Personal Premium': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Personal Exclusive': [{ ukuran: '10RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Prewedding Indoor Premium': [{ ukuran: '16RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Prewedding Indoor Exclusive': [{ ukuran: '16RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
    'Prewedding Indoor Diamond': [{ ukuran: '16RS', jenis: 'CETAK_FRAME', jumlah: 1 }],
  }

  for (const [name, ops] of Object.entries(packageBiayaOps)) {
    const pkg = await prisma.package.findFirst({ where: { name } })
    if (pkg) {
      // Hapus biaya ops lama
      await prisma.packageBiayaOps.deleteMany({ where: { packageId: pkg.id } })
      // Tambah biaya ops baru
      for (const op of ops) {
        await prisma.packageBiayaOps.create({
          data: { packageId: pkg.id, ukuran: op.ukuran, jenis: op.jenis, jumlah: op.jumlah }
        })
      }
      console.log(`BiayaOps updated: ${name}`)
    }
  }

  // BiayaOps Satuan (harga modal supplier)
  const biayaOpsSatuan = [
    { ukuran: '5r', jenis: 'CETAK', harga: 3000 },
    { ukuran: '6r', jenis: 'CETAK', harga: 4000 },
    { ukuran: '10RS', jenis: 'CETAK', harga: 5000 },
    { ukuran: '12RS', jenis: 'CETAK', harga: 10000 },
    { ukuran: '16RS', jenis: 'CETAK', harga: 60000 },
    { ukuran: '20RS', jenis: 'CETAK', harga: 140000 },
    { ukuran: '24RS', jenis: 'CETAK', harga: 190000 },
    { ukuran: '30RS', jenis: 'CETAK', harga: 225000 },
    { ukuran: '10RS', jenis: 'CETAK_FRAME', harga: 5000 },
    { ukuran: '12RS', jenis: 'CETAK_FRAME', harga: 10000 },
    { ukuran: '16RS', jenis: 'CETAK_FRAME', harga: 60000 },
  ]
  for (const b of biayaOpsSatuan) {
    const existing = await prisma.biayaOpsSatuan.findFirst({ where: { ukuran: b.ukuran, jenis: b.jenis } })
    if (!existing) await prisma.biayaOpsSatuan.create({ data: b })
  }

  console.log('Selesai!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
