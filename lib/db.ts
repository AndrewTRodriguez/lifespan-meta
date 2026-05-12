import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set. Pull it via `vercel env pull .env.local`.');
}

export const sql = neon(process.env.DATABASE_URL);
