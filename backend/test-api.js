const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { orderCode: '778895960538' },
    include: { seats: true }
  });
  console.log('Order:', order);
}
main().finally(() => prisma.$disconnect());
