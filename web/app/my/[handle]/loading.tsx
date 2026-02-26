import { Loader2 } from "lucide-react";

export default function MyProfileLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin mr-2" />
      프로필을 불러오는 중...
    </div>
  );
}
