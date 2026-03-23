"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type WorkspaceUserAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
  fallbackText?: string | null;
};

function getFallbackLabel(name?: string | null, fallbackText?: string | null) {
  const base = fallbackText?.trim() || name?.trim() || "?";
  return base.charAt(0).toUpperCase();
}

export function WorkspaceUserAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
  imageClassName,
  fallbackText,
}: WorkspaceUserAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarImage
        src={avatarUrl || ""}
        alt={name || "사용자 프로필"}
        className={imageClassName}
      />
      <AvatarFallback className={cn(fallbackClassName)}>
        {getFallbackLabel(name, fallbackText)}
      </AvatarFallback>
    </Avatar>
  );
}
