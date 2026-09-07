import SquadForm from "@/components/features/community/squad-form";

export default function SquadWritePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">프로젝트 팀 만들기</h1>
        <p className="text-muted-foreground">
          함께 프로젝트를 진행할 팀원을 모집하세요. 팀원이 모이면 팀 공간으로
          협업을 이어갈 수 있습니다.
        </p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <SquadForm />
      </div>
    </div>
  );
}
