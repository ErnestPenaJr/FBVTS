import { defineConfig } from 'drizzle-kit'

// Netlify DB (Neon) injects NETLIFY_DATABASE_URL; fall back to a hand-set
// DATABASE_URL for standalone tooling outside `netlify dev`.
const url = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL

export default defineConfig({
  schema: './netlify/db/schema.ts',
  out: './netlify/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: url! },
})
