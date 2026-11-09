import { PrismaClient } from "@prisma/client";
import { seedDemo } from "@/lib/db/seed";

const prisma = new PrismaClient();

seedDemo(prisma)
  .then((r) => console.log(`Seeded Demo Lender Ltd: ${r.borrowers} borrowers, ${r.users} users.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
