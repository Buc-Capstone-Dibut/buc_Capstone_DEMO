"use client";

import { useSocketStore } from "../../store/socket-store";
import { Hash, Plus, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

interface ChannelSidebarProps {
  projectId: string;
}

export function ChannelSidebar({ projectId }: ChannelSidebarProps) {
  const { channels, activeChannelId, joinChannel, createChannel } =
    useSocketStore();
  const { user } = useAuth({ loadProfile: false });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");

  const handleCreate = () => {
    if (!newChannelName.trim() || !user) return;
    createChannel(projectId, newChannelName, newChannelDesc, user.id);
    setNewChannelName("");
    setNewChannelDesc("");
    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-muted/10 w-64 border-r">
      {/* Header / Trigger Area based on user request */}
      <div className="px-3 flex items-center justify-between group cursor-pointer mb-2 mt-4">
        <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          Channels
        </span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div
              onClick={(e) => e.stopPropagation()}
              role="button"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted/50 rounded"
            >
              <Plus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Channel Name</Label>
                <Input
                  placeholder="e.g. implementation"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="What's this channel about?"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Create Channel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 space-y-0.5">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => joinChannel(channel.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors",
                activeChannelId === channel.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {channel.type === "PUBLIC" ? (
                <Hash className="h-4 w-4 opacity-70" />
              ) : (
                <Volume2 className="h-4 w-4 opacity-70" />
              )}
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
          {channels.length === 0 && (
            <div className="px-4 py-2 text-xs text-muted-foreground">
              No channels
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
