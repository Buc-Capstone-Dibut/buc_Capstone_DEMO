export const WORKSPACE_VOICE_ROOM_ALIASES = ["dev-room", "lounge"] as const;

export type WorkspaceVoiceRoomAlias =
  (typeof WORKSPACE_VOICE_ROOM_ALIASES)[number];

const WORKSPACE_VOICE_ROOM_LABELS: Record<WorkspaceVoiceRoomAlias, string> = {
  "dev-room": "개발실",
  lounge: "라운지",
};

export function isWorkspaceVoiceRoomAlias(
  value: string,
): value is WorkspaceVoiceRoomAlias {
  return (WORKSPACE_VOICE_ROOM_ALIASES as readonly string[]).includes(value);
}

export function buildWorkspaceVoiceRoomName(
  workspaceId: string,
  roomAlias: WorkspaceVoiceRoomAlias,
) {
  return `workspace:${workspaceId}:${roomAlias}`;
}

export function parseWorkspaceVoiceRoomName(roomName: string) {
  const match = /^workspace:([^:]+):(dev-room|lounge)$/.exec(roomName);
  if (!match) return null;

  return {
    workspaceId: match[1],
    roomAlias: match[2] as WorkspaceVoiceRoomAlias,
  };
}

export function getWorkspaceVoiceRoomLabel(roomAlias: WorkspaceVoiceRoomAlias) {
  return WORKSPACE_VOICE_ROOM_LABELS[roomAlias];
}

export function getWorkspaceVoiceRoomsApiPath(workspaceId: string) {
  return `/api/livekit/rooms?workspaceId=${encodeURIComponent(workspaceId)}`;
}
