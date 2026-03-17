"use client";

export function DibeotCharacter({ typeName }: { typeName: string }) {
  return (
    <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-[28px] bg-primary/10 shadow-inner shadow-primary/5 md:mx-0">
      <div className="absolute -top-2 left-5 h-6 w-6 rounded-full bg-primary/20" />
      <div className="absolute -top-2 right-5 h-6 w-6 rounded-full bg-primary/20" />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-[24px] bg-background shadow-sm">
        <div className="absolute left-4 top-7 h-2.5 w-2.5 rounded-full bg-foreground/80" />
        <div className="absolute right-4 top-7 h-2.5 w-2.5 rounded-full bg-foreground/80" />
        <div className="absolute top-[44px] h-2 w-6 rounded-full bg-primary/40" />
        <div className="absolute bottom-4 h-5 w-10 rounded-b-[16px] rounded-t-[8px] bg-primary/20" />
        <span className="absolute -bottom-9 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
          디벗
        </span>
      </div>
      <span className="sr-only">{typeName} 디벗 캐릭터</span>
    </div>
  );
}
