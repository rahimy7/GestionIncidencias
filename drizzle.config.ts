import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// 🔄 Cargar variables del archivo .env
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Please check your .env file.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts", // Cambia esto si usas otro path
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
