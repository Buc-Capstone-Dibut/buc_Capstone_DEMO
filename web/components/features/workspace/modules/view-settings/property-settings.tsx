"use client";

import { Tag as TagIcon, Users, Calendar as CalendarIcon, List, SlidersHorizontal, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface DraggablePropertySettingsProps {
  properties: string[];
  visibility: Record<string, boolean>;
  onToggle: (prop: string) => void;
}

export function DraggablePropertySettings({
  properties,
  visibility,
  onToggle
}: DraggablePropertySettingsProps) {
  const normalizedProperties = [
    "title",
    ...properties.filter((prop) => prop !== "title"),
  ];

  return (
    <div className="space-y-1">
      {normalizedProperties.map((prop) => (
        <PropertySettingItem
          key={prop}
          id={prop}
          visible={prop === "title" ? true : !!visibility[prop]}
          onToggle={() => onToggle(prop)}
          isLocked={prop === "title"}
        />
      ))}
    </div>
  );
}

function PropertySettingItem({ id, visible, onToggle, isLocked }: { id: string, visible: boolean, onToggle: () => void, isLocked?: boolean }) {
   // Map IDs to Labels
   const labels: Record<string, string> = {
      'title': '제목',
      'tags': '태그',
      'assignee': '담당자',
      'priority': '우선순위',
      'dueDate': '기간',
   };

   const icon = (id === 'tags') ? <TagIcon className="h-3.5 w-3.5" /> :
                (id === 'assignee') ? <Users className="h-3.5 w-3.5" /> :
                (id === 'dueDate') ? <CalendarIcon className="h-3.5 w-3.5" /> :
                (id === 'title') ? <List className="h-3.5 w-3.5" /> :
                (id === 'priority') ? <AlertCircle className="h-3.5 w-3.5" /> :
                <SlidersHorizontal className="h-3.5 w-3.5" />;

   return (
      <div
         className="flex items-center justify-between rounded-md px-2 py-1.5"
      >
         <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{icon}</span>
            <span>{labels[id] || id}</span>
         </div>
         <Switch
            checked={visible}
            onCheckedChange={isLocked ? undefined : onToggle}
            disabled={isLocked}
            className={`h-4 w-7 ${isLocked ? "opacity-50 cursor-not-allowed !bg-muted" : ""}`}
         />
      </div>
   );
}
