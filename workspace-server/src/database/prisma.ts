import "../config/env";
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var workspacePrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.workspacePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.workspacePrisma = prisma;
}
