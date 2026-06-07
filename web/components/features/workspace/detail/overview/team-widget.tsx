"use client";

import { useWorkspaceStore } from "../../store/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MoreHorizontal, Crown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamWidgetProps {
  projectId: string;
}

export function TeamWidget({ projectId }: TeamWidgetProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const project = projects.find(p => p.id === projectId);

  if (!project) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
           <CardTitle className="text-base">Team Members</CardTitle>
           <CardDescription>{project.members.length} active members</CardDescription>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8">
           <UserPlus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[250px] px-6">
           <div className="space-y-4 pb-4">
             {project.members.map((member) => (
               <div key={member.id} className="flex items-center justify-between group">
                 <div className="flex items-center gap-3">
                   <div className="relative">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {member.online && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                      )}
                   </div>
                   <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{member.name}</span>
                        {member.role === 'leader' && <Crown className="h-3 w-3 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                   </div>
                 </div>
                 <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                 </Button>
               </div>
             ))}
           </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
