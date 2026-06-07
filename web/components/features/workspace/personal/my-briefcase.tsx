"use client";

import { useWorkspaceStore } from "../store/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, FileText, CheckSquare, Plus, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MyBriefcase() {
  const privateDocs = useWorkspaceStore((s) => s.privateDocs);
  const tasks = useWorkspaceStore((s) => s.tasks); // Simplified: using tasks store for private todos mock for now or adding local state

  // Mock Personal Todos (Local state for simplicity in demo)
  const personalTodos = [
     { id: 1, title: 'Review hackathon requirements', done: false },
     { id: 2, title: 'Update portfolio links', done: true },
  ];

  return (
    <div className="h-full flex flex-col bg-background/50">
       <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-6">
             <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                <Briefcase className="h-5 w-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold">My Briefcase</h2>
                <p className="text-sm text-muted-foreground">Private space for your thoughts</p>
             </div>
          </div>
       </div>

       <div className="flex-1 grid md:grid-cols-2 gap-6 p-6 overflow-hidden">
          {/* Private Docs Column */}
          <Card className="flex flex-col h-full border-dashed">
             <div className="p-4 border-b flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-2 font-semibold">
                   <FileText className="h-4 w-4" /> Private Docs
                </div>
                <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
             </div>
             <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                   {privateDocs.map(doc => (
                      <div key={doc.id} className="p-3 rounded-lg border bg-card hover:border-purple-300 transition-colors cursor-pointer group">
                         <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{doc.title}</span>
                            <MoreHorizontal className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                         </div>
                         <p className="text-xs text-muted-foreground">Updated {doc.updatedAt}</p>
                      </div>
                   ))}
                   <div className="p-3 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer">
                      + New Draft
                   </div>
                </div>
             </ScrollArea>
          </Card>

          {/* Personal Todos Column */}
          <Card className="flex flex-col h-full border-dashed">
             <div className="p-4 border-b flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-2 font-semibold">
                   <CheckSquare className="h-4 w-4" /> Personal Todos
                </div>
                <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
             </div>
             <div className="p-4 space-y-4">
                {personalTodos.map(todo => (
                   <div key={todo.id} className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded border flex items-center justify-center cursor-pointer ${todo.done ? 'bg-purple-500 border-purple-500 text-white' : 'border-muted-foreground'}`}>
                         {todo.done && <Plus className="h-3 w-3 rotate-45" />}
                      </div>
                      <span className={`text-sm ${todo.done ? 'line-through text-muted-foreground' : ''}`}>{todo.title}</span>
                   </div>
                ))}
                <Input placeholder="Add a personal task..." className="h-9 text-sm" />
             </div>
          </Card>
       </div>
    </div>
  );
}
