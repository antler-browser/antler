import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
