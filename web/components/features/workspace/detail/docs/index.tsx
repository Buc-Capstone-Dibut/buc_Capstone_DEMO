"use client";

import { useWorkspaceStore } from "../../store/mock-data";
import { useState, useMemo } from "react";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { FileText, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DocsViewProps {
  projectId: string;
}

export function DocsView({ projectId }: DocsViewProps) {
  const docs = useWorkspaceStore((s) => s.docs);
  const createDoc = useWorkspaceStore((s) => s.createDoc);
  const updateDoc = useWorkspaceStore((s) => s.updateDoc);
  const projects = useWorkspaceStore((s) => s.projects);
  const project = projects.find(p => p.id === projectId);
  const projectDocs = docs.filter(d => d.projectId === projectId);

  const [activeDocId, setActiveDocId] = useState<string | null>(projectDocs[0]?.id || null);
  const [isCollaborative, setIsCollaborative] = useState(true);

  const activeDoc = projectDocs.find(d => d.id === activeDocId);

  // Editor instance
  const editor = useCreateBlockNote({
     initialContent: activeDoc?.content as PartialBlock[] || undefined
  });

  // Handle content change
  const handleChange = () => {
     if (activeDocId) {
        // Debounce would be good here in real app
        updateDoc(activeDocId, editor.document);
     }
  };

  const handleCreateDoc = () => {
     createDoc({
       projectId,
       title: 'Untitled',
       content: [{ type: "heading", content: "Untitled" }]
     });
  };

  return (
    <div className="flex h-full">
      {/* Docs Sidebar */}
      <div className="w-60 border-r bg-muted/5 flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-medium text-sm text-muted-foreground">Pages</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateDoc}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
           <div className="p-2 space-y-0.5">
              {projectDocs.map(doc => (
                 <button
                   key={doc.id}
                   onClick={() => {
                      setActiveDocId(doc.id);
                      // Reset editor content
                      if (editor) {
                          editor.replaceBlocks(editor.document, doc.content as PartialBlock[]);
                      }
                   }}
                   className={cn(
                     "flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-muted/50 transition-colors",
                     activeDocId === doc.id && "bg-muted font-medium"
                   )}
                 >
                   <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                   <span className="truncate">{doc.title}</span>
                 </button>
              ))}
           </div>
        </ScrollArea>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-background flex flex-col h-full overflow-hidden relative">
         {/* Top Bar for Collaboration Tools */}
         <div className="h-14 border-b flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-sm font-medium">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", isCollaborative ? "bg-green-500" : "bg-gray-400")} />
                  {isCollaborative ? "공동 작업 중" : "단독 편집 모드"}
               </div>
               <div className="flex items-center gap-2 border-l pl-4">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">협업 모드</span>
                  <Switch
                     checked={isCollaborative}
                     onCheckedChange={setIsCollaborative}
                     className="scale-75"
                  />
               </div>
            </div>

            {/* Presence Avatars */}
            <div className="flex items-center gap-3">
               <div className="flex -space-x-2">
                  {project?.members.map((member, i) => (
                     <TooltipProvider key={member.id}>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-transparent transition-all hover:-translate-y-1 hover:ring-primary/20 cursor-pointer">
                                 <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                                 <AvatarFallback>{member.name[0]}</AvatarFallback>
                              </Avatar>
                           </TooltipTrigger>
                           <TooltipContent>
                              <p className="text-xs font-medium">{member.name} {member.online ? "(온라인)" : "(오프라인)"}</p>
                           </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                  ))}
               </div>
               <div className="text-xs text-muted-foreground font-medium pl-2">
                  {project?.members.filter(m => m.online).length}명 접속 중
               </div>
            </div>
         </div>

         {activeDoc ? (
            <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full relative">
               {/* Visual Typing Indicator (Mock) */}
               {isCollaborative && (
                  <div className="absolute right-8 top-10 pointer-events-none transition-opacity animate-in fade-in duration-500 z-10">
                     <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm">
                        <div className="flex gap-1">
                           <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                           <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                           <span className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                        </div>
                        <span className="text-[10px] font-bold text-primary">Frontend님이 입력 중...</span>
                     </div>
                  </div>
               )}

               <div className="mb-10 group">
                 <input
                   className="text-5xl font-black border-none outline-none w-full bg-transparent placeholder:text-muted-foreground/30 tracking-tight"
                   value={activeDoc.title}
                   onChange={(e) => {
                      // Update logic
                   }}
                   placeholder="문서 제목을 입력하세요"
                 />
                 <div className="h-1 w-20 bg-primary/20 rounded-full mt-4 group-focus-within:w-40 transition-all duration-500" />
               </div>

               <div className="editor-wrapper min-h-[600px] prose prose-slate max-w-none">
                 <BlockNoteView
                    editor={editor}
                    onChange={handleChange}
                    theme="light"
                 />
               </div>
            </div>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
               <FileText className="h-12 w-12 opacity-20" />
               <p className="font-medium">문서를 선택하거나 새로운 문서를 생성하세요</p>
            </div>
         )}
      </div>
    </div>
  );
}
