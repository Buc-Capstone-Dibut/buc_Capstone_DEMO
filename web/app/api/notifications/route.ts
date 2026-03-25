import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

// GET: List Notifications
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 20, // Limit to recent 20
    });

    return NextResponse.json(notifications);
  } catch (error: unknown) {
    console.error("API: List Notifications Error", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

// PATCH: Mark as Read
export async function PATCH(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body; // Notification ID
    const userId = session.user.id;

    if (id) {
      // Mark single
      const result = await prisma.notifications.updateMany({
        where: {
          id,
          user_id: userId,
        },
        data: { is_read: true },
      });

      if (result.count === 0) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }
    } else {
      // Mark all
      await prisma.notifications.updateMany({
        where: { user_id: userId, is_read: false },
        data: { is_read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API: Notification Update Error", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

// DELETE: Delete Notification
export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await prisma.notifications.delete({
      where: {
        id: id,
        user_id: session.user.id, // Ensure ownership
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API: Delete Notification Error", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
