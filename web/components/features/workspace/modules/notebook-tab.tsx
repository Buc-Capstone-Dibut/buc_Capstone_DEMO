import { cn } from "@/lib/utils";

interface NotebookTabProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  color?: string;
  icon?: React.ReactNode;
}

export function NotebookTab({
  label,
  active,
  onClick,
  color = "bg-blue-500",
  icon,
}: NotebookTabProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative -ml-px h-32 w-10 cursor-pointer select-none transition-all duration-300 group",
        active ? "translate-x-0" : "hover:translate-x-[2px]",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-start gap-2 rounded-r-xl border-y border-r border-black/10 pt-3 shadow-md",
          color,
          active
            ? "brightness-110 shadow-lg"
            : "brightness-90 hover:brightness-100",
        )}
      >
        <div className="text-white/90">{icon}</div>

        <div
          className="writing-vertical-rl text-xs font-semibold text-white/90 tracking-widest uppercase rotate-180 h-20 flex items-center justify-center"
          style={{ writingMode: "vertical-rl" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
