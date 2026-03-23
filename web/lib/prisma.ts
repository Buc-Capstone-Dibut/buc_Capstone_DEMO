import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  // Prisma recommends a global singleton in dev to avoid exhausting connections.
  // eslint-disable-next-line no-var
  var prismaGlobal_v2: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal_v2 ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal_v2 = prisma;
