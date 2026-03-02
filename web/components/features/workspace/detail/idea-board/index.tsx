import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const IdeaBoardSDK = dynamic(
  () => import("./idea-board-sdk"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 gap-4">
        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
        </div>
        <div className="text-sm font-medium text-gray-500 animate-pulse">
          아이디어 보드를 열심히 가져오고 있어요!
        </div>
      </div>
    ),
  }
);

interface IdeaBoardProps {
  projectId: string;
  readOnly?: boolean;
}

export function IdeaBoard({ projectId, readOnly = false }: IdeaBoardProps) {
  return <IdeaBoardSDK projectId={projectId} readOnly={readOnly} />;
}
