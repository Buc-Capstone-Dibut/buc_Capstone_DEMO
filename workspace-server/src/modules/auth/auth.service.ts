import { Socket } from "socket.io";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../config/env";
import { prisma } from "../../database/prisma";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type SocketIdentity = {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
};

type SupabaseUser = {
  id: string;
  email?: string;
};

type WorkspaceAccessRow = {
  role: string | null;
  lifecycle_status: string | null;
};

const AUTH_TIMEOUT_MS = 5_000;

function normalizeRole(role: string | null): WorkspaceRole {
  const normalized = (role || "member").toLowerCase();
  if (
    normalized === "owner" ||
    normalized === "admin" ||
    normalized === "viewer"
  ) {
    return normalized;
  }
  return "member";
}

function getHandshakeValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export class AuthService {
  static async verifyAccessToken(token: string): Promise<SupabaseUser | null> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !token) {
      return null;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
      });

      if (!response.ok) {
        return null;
      }

      const user = (await response.json()) as SupabaseUser;
      return typeof user.id === "string" && user.id ? user : null;
    } catch (error) {
      console.warn("[AUTH] Supabase token verification failed", error);
      return null;
    }
  }

  static async getWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<SocketIdentity | null> {
    try {
      const rows = await prisma.$queryRaw<WorkspaceAccessRow[]>`
        SELECT
          wm.role,
          w.lifecycle_status::text AS lifecycle_status
        FROM "public"."workspace_members" wm
        INNER JOIN "public"."workspaces" w ON w.id = wm.workspace_id
        WHERE wm.workspace_id = ${workspaceId}::uuid
          AND wm.user_id = ${userId}::uuid
        LIMIT 1
      `;
      const access = rows[0];
      if (!access || access.lifecycle_status === "COMPLETED") {
        return null;
      }

      return {
        userId,
        workspaceId,
        role: normalizeRole(access.role),
      };
    } catch (error) {
      console.error("[AUTH] Workspace membership verification failed", error);
      return null;
    }
  }

  static async authenticateSocket(
    socket: Socket,
  ): Promise<SocketIdentity | null> {
    const token = getHandshakeValue(socket.handshake.auth?.token);
    const workspaceId = getHandshakeValue(socket.handshake.auth?.workspaceId);
    if (!token || !workspaceId) {
      return null;
    }

    const user = await this.verifyAccessToken(token);
    if (!user) {
      return null;
    }

    return this.getWorkspaceAccess(user.id, workspaceId);
  }
}

export function getSocketIdentity(socket: Socket): SocketIdentity {
  const identity = socket.data.identity as SocketIdentity | undefined;
  if (!identity) {
    throw new Error("인증되지 않은 실시간 연결입니다.");
  }
  return identity;
}
