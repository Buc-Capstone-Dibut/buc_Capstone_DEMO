import { PrismaClient } from "../src/generated/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prismaGlobal_v2: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal_v2 ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal_v2 = prisma;
