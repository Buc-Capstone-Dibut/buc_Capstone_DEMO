import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProfile() {
  console.log("Attempting to fix/create profile...");
  const userId = "025fb6cc-8c82-4c8a-bb71-34e08e09e817"; // User ID from logs

  const newProfile = {
    id: userId,
    nickname: "User_" + userId.substring(0, 5),
    avatar_url: null,
    reputation: 0,
    tier: "씨앗",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log(`Upserting profile for user: ${userId}`);
  const { data, error } = await supabase
    .from("profiles")
    .upsert(newProfile)
    .select()
    .single();

  if (error) {
    console.error("Error creating profile:", error);
  } else {
    console.log("Success! Profile created:", data);
  }
}

fixProfile();
