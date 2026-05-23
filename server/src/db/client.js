// TikiCasino - Prisma Database Client
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set default SQLite path for development if DATABASE_URL not set
if (!process.env.DATABASE_URL) {
  const dbPath = path.join(__dirname, '../../prisma/dev.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log(`Using SQLite database at: ${dbPath}`);
} else if (process.env.DATABASE_URL.startsWith('file:')) {
  // Normalize relative SQLite path to absolute path
  const relativePath = process.env.DATABASE_URL.replace('file:', '');
  if (!path.isAbsolute(relativePath)) {
    const absolutePath = path.resolve(__dirname, '../../', relativePath);
    process.env.DATABASE_URL = `file:${absolutePath}`;
    console.log(`[Prisma Client] SQLite URL normalizada a absoluta: ${absolutePath}`);
  }
}

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
