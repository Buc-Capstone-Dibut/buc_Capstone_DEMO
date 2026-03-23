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
}: DraggableTaskCardProps & { showPriority?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
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
      className="relative group/card touch-none"
    >
      {/* Content Container - Click works here without triggering drag */}
      <div onClick={onClick} className="w-full h-full relative z-10">
        <TaskCard
          task={task}
          customFields={customFields}
          showTags={showTags}
          showAssignee={showAssignee}
          showDueDate={showDueDate}
          showPriority={showPriority}
          cardProperties={cardProperties}
          dragHandleProps={
            disableDrag ? undefined : { ...listeners, ...attributes }
          }
          onEdit={onClick}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
