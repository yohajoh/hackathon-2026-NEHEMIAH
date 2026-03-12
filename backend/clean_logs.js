import { prisma } from './src/prisma.js';

async function cleanLogs() {
  const logs = await prisma.adminActivityLog.findMany({
    orderBy: { created_at: 'desc' },
  });
  
  let updatedCount = 0;

  for (const log of logs) {
    let newDesc = log.description;
    let changed = false;

    // Fix Old format: "Processed return for rental 0f1d..." => "Processed return for rental"
    if (newDesc.match(/Processed return for rental [0-9a-fA-F-]+/)) {
      // Find the rental info if possible! 
      const rentalId = newDesc.match(/[0-9a-fA-F-]{36}/)?.[0];
      if (rentalId) {
        const rental = await prisma.rental.findUnique({
          where: { id: rentalId },
          include: { user: true, physical_book: true }
        });
        if (rental) {
            newDesc = `Processed return for "${rental.user.name}" - Book: "${rental.physical_book.title}"`;
        } else {
            newDesc = newDesc.replace(/ [0-9a-fA-F-]{36}/, '');
        }
      } else {
        newDesc = newDesc.replace(/ [0-9a-fA-F-]{36}/, '');
      }
      changed = true;
    }

    // Fix Any generic UUIDs left laying around at the end of descriptions (like in soft-deletes or fallbacks)
    if (newDesc.match(/[0-9a-fA-F-]{36}/)) {
        newDesc = newDesc.replace(/[0-9a-fA-F-]{36}/g, '').replace(/\s*\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
        changed = true;
    }

    if (changed) {
      await prisma.adminActivityLog.update({
        where: { id: log.id },
        data: { description: newDesc }
      });
      updatedCount++;
      console.log(`Updated ID: ${log.id}`);
      console.log(`  OLD: ${log.description}`);
      console.log(`  NEW: ${newDesc}`);
    }
  }

  console.log(`\nFinished. Cleaned ${updatedCount} logs.`);
  await prisma.$disconnect();
}

cleanLogs().catch(console.error);
