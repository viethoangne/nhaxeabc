const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trips = await prisma.trip.findMany();
  console.log('--- DB TRIPS REPORT ---');
  console.log('Total Trips:', trips.length);
  if (trips.length > 0) {
    console.log('Sample Trip:', JSON.stringify(trips[0], null, 2));
    const dates = [...new Set(trips.map(t => t.departDate.toISOString().split('T')[0]))];
    console.log('Available Dates:', dates);
    const routes = [...new Set(trips.map(t => t.from + ' -> ' + t.to))];
    console.log('Available Routes:', routes);
  } else {
    console.log('No trips found in database!');
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
