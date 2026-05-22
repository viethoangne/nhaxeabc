const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = ['user', 'order', 'trip', 'bus', 'route', 'voucher', 'userVoucher', 'adminLog'];
  const counts = {};
  
  for (const m of models) {
    try {
      counts[m] = await prisma[m].count();
    } catch (e) {
      counts[m] = `Error: ${e.message}`;
    }
  }
  
  console.log("DATABASE COUNTS:");
  console.log(counts);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
