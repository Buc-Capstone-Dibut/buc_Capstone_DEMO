import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const targetId = "eb000eb7-8070-415d-81a5-d42a3489410c";
  console.log(`Checking profile for ID: ${targetId}`);

  const profile = await prisma.profiles.findUnique({
    where: { id: targetId },
  });

  if (profile) {
    console.log("✅ Profile found. Updating with rich data...");
    await prisma.profiles.update({
      where: { id: targetId },
      data: {
        nickname: "코딩하는대학생",
        avatar_url: "https://github.com/shadcn.png",
        bio: "열심히 코딩하는 개발자입니다.",
        tier: "Gold",
        tech_stack: ["React", "Next.js", "TypeScript", "Supabase"],
      },
    });
    console.log("✅ Profile updated successfully.");
  } else {
    console.log("❌ Profile NOT found.");

    // Check if user exists (can't check auth.users easily via Prisma default, but we assume auth exists if they are logged in)
    console.log("Attempting to fix...");
    await prisma.profiles.create({
      data: {
        id: targetId,
        handle: `user-${targetId.slice(0, 8).toLowerCase()}`,
        nickname: "복구된 유저",
        avatar_url: "",
      },
    });
    console.log("✅ Profile created manually.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
