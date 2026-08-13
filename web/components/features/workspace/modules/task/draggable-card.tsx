"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, CustomFieldConfig } from "../../store/mock-data";
import { TaskCard } from "./card";

interface DraggableTaskCardProps {
  task: Task;
  customFields: CustomFieldConfig[];
  onClick: () => void;
  showTags: boolean;
  showAssignee: boolean;
  showDueDate: boolean;
  cardProperties?: string[];
  onDelete?: () => void;
  disableDrag?: boolean;
  dropIndicator?: "before";
  sortableId?: string;
  sourceColumnId?: string;
}

export function DraggableTaskCard({
  task,
  customFields,
  onClick,
  showTags,
  showAssignee,
  showDueDate,
  showPriority,
  cardProperties,
  onDelete,
  disableDrag = false,
  dropIndicator,
  sortableId,
  sourceColumnId,
}: DraggableTaskCardProps & { showPriority?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId || task.id,
    data: {
      type: "Task",
      task,
      taskId: task.id,
      columnId: sourceColumnId,
    },
    disabled: disableDrag,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-30">
        <TaskCard
          task={task}
          customFields={customFields}
          showTags={showTags}
          showAssignee={showAssignee}
          showDueDate={showDueDate}
          showPriority={showPriority}
          cardProperties={cardProperties}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-label={`${task.title} 작업. 스페이스 키로 이동을 시작하고 방향키로 위치를 변경할 수 있습니다.`}
      title="스페이스로 이동 시작 · 방향키로 위치 변경"
      className={`group/card relative touch-none ${
        disableDrag ? "" : "cursor-grab select-none active:cursor-grabbing"
      }`}
      {...(disableDrag ? {} : attributes)}
      {...(disableDrag ? {} : listeners)}
    >
      {dropIndicator === "before" ? (
        <div
          className="pointer-events-none absolute -top-[5px] inset-x-1 z-30 h-0.5 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--background))]"
          aria-hidden="true"
        />
      ) : null}
      <div onClick={onClick} className="w-full h-full relative z-10">
        <TaskCard
          task={task}
          customFields={customFields}
          showTags={showTags}
          showAssignee={showAssignee}
          showDueDate={showDueDate}
          showPriority={showPriority}
          cardProperties={cardProperties}
          onEdit={onClick}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
