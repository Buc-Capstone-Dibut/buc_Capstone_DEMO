import { supabase } from "@/lib/supabase/client";

export const uploadCommunityImage = async (file: File): Promise<string> => {
  // const supabase = createClientComponentClient<Database>(); // Use singleton

  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()
    .toString(36)
    .substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `post-images/${fileName}`;

  const { error } = await supabase.storage
    .from("community-uploads")
    .upload(filePath, file);

  if (error) {
    console.error("Image upload failed:", error);
    if (error.message?.toLowerCase().includes("bucket")) {
      throw new Error(
        "이미지 저장소 버킷이 없습니다. `community-uploads` 버킷을 먼저 생성해주세요.",
      );
    }
    throw new Error(error.message || "이미지 업로드 실패");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("community-uploads").getPublicUrl(filePath);

  return publicUrl;
};
