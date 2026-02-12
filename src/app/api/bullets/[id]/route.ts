import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { content, roleLevel, theme } = body;

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) {
      updateData.content = content;
    }
    if (roleLevel !== undefined) {
      updateData.roleLevel = roleLevel;
    }
    if (theme !== undefined) {
      updateData.theme = theme;
    }

    const updated = await prisma.bullet.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      section: updated.section,
      company: updated.company,
      roleTitle: updated.roleTitle,
      category: updated.category,
      roleLevel: updated.roleLevel,
      theme: updated.theme,
    });
  } catch (error) {
    console.error("Update bullet error:", error);
    return NextResponse.json(
      { error: "Failed to update bullet" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.bullet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete bullet" },
      { status: 500 }
    );
  }
}
