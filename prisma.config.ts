import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://neondb_owner:npg_BP7FJ8EuiRsU@ep-purple-thunder-at2br0j0.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require",
  },
})
