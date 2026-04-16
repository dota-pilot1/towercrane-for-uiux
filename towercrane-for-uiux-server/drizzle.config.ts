import type { Config } from 'drizzle-kit'

export default {
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_FILE ?? './data/towercrane-catalog.sqlite',
  },
} satisfies Config
