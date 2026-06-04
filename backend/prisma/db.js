import { PrismaClient } from '@prisma/client';

const isTest = process.env.NODE_ENV === 'test';

const prisma = new PrismaClient({
  log: isTest ? ['warn', 'error'] : ['query', 'info', 'warn', 'error'],
});

export default prisma;
