"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Users, MessageSquare } from "lucide-react";
import { useWorkspaceStore } from "../../store/mock-data";

interface LiveHuddleProps {
  projectId: string;
  onClose: () => void;
}

export function LiveHuddle({ projectId, onClose }: LiveHuddleProps) {
  const projects = useWorkspaceStore((s) => s.projects);
  const project = projects.find(p => p.id === projectId);

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  // Mock participants (simulating current session)
  const participants = project?.members.slice(0, 4) || [];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white relative">
       {/* Top Bar */}
       <div className="h-14 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
             <span className="font-semibold">Dev Room (Voice)</span>
             <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400">{participants.length} connected</span>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800">
                <Users className="h-5 w-5" />
             </Button>
          </div>
       </div>

       {/* Video Grid */}
       <div className="flex-1 p-6 grid grid-cols-2 gap-4 auto-rows-fr overflow-y-auto">
          {participants.map((user) => (
             <div key={user.id} className="bg-slate-900 rounded-xl relative overflow-hidden ring-1 ring-slate-800 flex items-center justify-center group">
                <div className="text-center">
                   <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-slate-800">
                      <AvatarFallback className="bg-slate-700 text-2xl font-bold text-slate-300">{user.name.charAt(0)}</AvatarFallback>
                   </Avatar>
                   <div className="font-semibold">{user.name}</div>
                </div>
                {/* Status Icons */}
                <div className="absolute bottom-4 left-4 flex gap-2">
                   <div className="p-1 rounded bg-black/50 backdrop-blur">
                      <Mic className="h-3 w-3" />
                   </div>
                </div>
             </div>
          ))}
       </div>

       {/* Control Bar */}
       <div className="h-20 bg-slate-900 flex items-center justify-center gap-4 border-t border-slate-800 flex-shrink-0">
          <Button
            variant={micOn ? "secondary" : "destructive"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setMicOn(!micOn)}
          >
             {micOn ? <Mic /> : <MicOff />}
          </Button>
          <Button
            variant={videoOn ? "secondary" : "destructive"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setVideoOn(!videoOn)}
          >
             {videoOn ? <Video /> : <VideoOff />}
          </Button>
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white">
             <MonitorUp />
          </Button>
          <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full ml-4" onClick={onClose}>
             <PhoneOff />
          </Button>
       </div>
    </div>
  );
}
