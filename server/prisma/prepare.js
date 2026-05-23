import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// If DATABASE_URL starts with postgresql:// or postgres://, set provider to postgresql.
// Otherwise, set to sqlite.
const dbUrl = process.env.DATABASE_URL || '';
const targetProvider = (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) ? 'postgresql' : 'sqlite';

console.log(`[Prisma Prepare] DATABASE_URL: ${dbUrl ? 'CONECTADA' : 'NO SETEADA'}`);
console.log(`[Prisma Prepare] Proveedor Objetivo: ${targetProvider}`);

const newSchema = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${targetProvider}"`
);

if (newSchema !== schema) {
  fs.writeFileSync(schemaPath, newSchema, 'utf8');
  console.log(`[Prisma Prepare] Schema actualizado con éxito a provider "${targetProvider}"`);
} else {
  console.log(`[Prisma Prepare] El Schema ya estaba usando el provider "${targetProvider}"`);
}
