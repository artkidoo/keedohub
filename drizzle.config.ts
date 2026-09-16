import { defineConfig } from "drizzle-kit";

// drizzle-kit does not load .env itself; Node's loader covers it when present.
try {
  process.loadEnvFile();
} catch {
  // .env is optional for generate; migrate needs DATABASE_URL.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Only used by drizzle-kit commands; the app itself reads DATABASE_URL at runtime.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/keedohub",
  },
  verbose: true,
  strict: true,
});
