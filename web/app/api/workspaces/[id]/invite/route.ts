import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { addDays } from "date-fns";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { normalizeWorkspaceTeamRole } from "@/lib/workspace-team-roles";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }, // params is now a Promise in Next.js 15+ (actually user is likely on 14/15, safe pattern)
) {
  // Await params if it's a promise, though usually in app dir it's direct.
  // But strictly following recent Next.js types if needed.
  // Let's assume params is standard object for now or handle appropriately.
  const { id: workspaceId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { targetUserId, teamRole } = body;
  const normalizedTeamRole = normalizeWorkspaceTeamRole(teamRole);

  if (!targetUserId) {
    return NextResponse.json(
      { error: "Target User ID is required" },
      { status: 400 },
    );
  }

  try {
    // 1. Check if inviter exists and has permission (owner only)
    const inviterMember = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    if (!inviterMember) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 },
      );
    }

    if (inviterMember.role !== "owner") {
      return NextResponse.json(
        { error: "Only the workspace owner can invite members" },
        { status: 403 },
      );
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    // 2. Check if target user is already a member
    const existingMember = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: targetUserId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 },
      );
    }

    // 3. Check if invite already exists
    // We need target user's email to store in workspace_invites (as per schema)
    // Or we can check if there's an active invite for this email
    const targetProfile = await prisma.profiles.findUnique({
      where: { id: targetUserId },
      include: { users: true },
    });

    if (!targetProfile || !targetProfile.users?.email) {
      return NextResponse.json(
        { error: "Target user not found or has no email" },
        { status: 404 },
      );
    }

    const targetEmail = targetProfile.users.email;

    const existingInvite = await prisma.workspace_invites.findFirst({
      where: {
        workspace_id: workspaceId,
        email: targetEmail,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "이미 초대가 전송된 사용자입니다." },
        { status: 409 },
      );
    }

    // 4. Create Invite
    const token = uuidv4();
    const expiresAt = addDays(new Date(), 7); // 7 days expiry

    const invite = await prisma.workspace_invites.create({
      data: {
        workspace_id: workspaceId,
        inviter_id: user.id,
        email: targetEmail,
        token: token,
        role: "member",
        team_role: normalizedTeamRole,
        expires_at: expiresAt,
      },
    });

    // 5. Create Notification
    const workspace = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    await prisma.notifications.create({
      data: {
        user_id: targetUserId,
        type: "INVITE",
        title: "워크스페이스 초대",
        message: normalizedTeamRole
          ? `'${workspace?.name}' 워크스페이스에 ${normalizedTeamRole} 역할로 초대되었습니다.`
          : `'${workspace?.name}' 워크스페이스에 초대되었습니다.`,
        link: `invite:${invite.id}`, // Custom protocol for client parsing
        is_read: false,
      },
    });

    return NextResponse.json({ success: true, inviteId: invite.id });
  } catch (error) {
    console.error("Invite User Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
