const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updates = [
    // ADMIN - manajemen false, generate false
    { role: 'ADMIN', menu: 'manajemen', canAccess: false },
    { role: 'ADMIN', menu: 'generate', canAccess: false },
    // CASHIER - manajemen false, generate false
    { role: 'CASHIER', menu: 'manajemen', canAccess: false },
    { role: 'CASHIER', menu: 'generate', canAccess: false },
    // SUPERADMIN - semua true
    { role: 'SUPERADMIN', menu: 'manajemen', canAccess: true },
    { role: 'SUPERADMIN', menu: 'generate', canAccess: true },
  ];

  for (const u of updates) {
    await prisma.roleAccess.upsert({
      where: { role_menu: { role: u.role, menu: u.menu } },
      update: { canAccess: u.canAccess },
      create: { role: u.role, menu: u.menu, canAccess: u.canAccess },
    });
    console.log(`✅ ${u.role} - ${u.menu}: ${u.canAccess}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
