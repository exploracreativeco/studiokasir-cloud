const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.findFirst().then(u => {
  console.log('userId:', u.id);
  console.log('email:', u.email);
  process.exit(0);
})
