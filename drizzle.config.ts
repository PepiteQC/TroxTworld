import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'pepite127', // 👈 Ton mot de passe postgres
    database: 'troxt_db',
    ssl: false,
  },
  verbose: true,
  strict: true,
});
