import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function debugProfiles() {
  const userId = "025fb6cc-8c82-4c8a-bb71-34e08e09e817";
  console.log(`Target User ID: ${userId}`);

  console.log("\n--- Checking via Supabase JS (Service Role) ---");
  const { data: sbProfile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) console.log("Supabase Error:", error.message);
  else console.log("Supabase Found:", sbProfile ? sbProfile.nickname : "None");

  console.log("\n--- Checking via Prisma Client ---");
  try {
    let pProfile = await prisma.profiles.findUnique({
      where: { id: userId },
    });
    console.log("Prisma Found:", pProfile ? pProfile.nickname : "None");

    if (!pProfile) {
      console.log("⚠️ Profile missing! Creating it now...");
      pProfile = await prisma.profiles.create({
        data: {
          id: userId,
          handle: `user-${userId.slice(0, 8).toLowerCase()}`,
          nickname: "RestoredUser",
          avatar_url: null,
          reputation: 0,
          tier: "씨앗",
          updated_at: new Date(),
        },
      });
      console.log("✅ Profile restored:", pProfile.nickname);
    }

    // List any profiles to see if we are in the right DB
    const count = await prisma.profiles.count();
    console.log(`Prisma Total Profiles: ${count}`);

    console.log("Fetching a valid post...");
    const post = await prisma.posts.findFirst();

    if (!post) {
      console.error("❌ No posts found in database. Cannot create comment.");
      return;
    }
    console.log("✅ Post found:", post.title, `(ID: ${post.id})`);

    console.log("Attempting to create comment...");
    const comment = await prisma.comments.create({
      data: {
        post_id: post.id,
        author_id: userId,
        content: "Test comment from script",
      },
    });

    console.log("✅ Comment created successfully:", comment.id);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.log("Prisma Error:", message);
  } finally {
    await prisma.$disconnect();
  }
}

debugProfiles();
