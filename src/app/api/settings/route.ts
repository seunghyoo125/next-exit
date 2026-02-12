import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SETTING_KEYS = ["ai_provider", "anthropic_api_key", "openai_api_key"] as const;

export async function GET() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return NextResponse.json({
    provider: map.ai_provider || "anthropic",
    anthropicApiKey: map.anthropic_api_key || "",
    openaiApiKey: map.openai_api_key || "",
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { provider, anthropicApiKey, openaiApiKey } = body as {
    provider?: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
  };

  const upserts: { key: string; value: string }[] = [];

  if (provider !== undefined) {
    upserts.push({ key: "ai_provider", value: provider });
  }
  if (anthropicApiKey !== undefined) {
    upserts.push({ key: "anthropic_api_key", value: anthropicApiKey });
  }
  if (openaiApiKey !== undefined) {
    upserts.push({ key: "openai_api_key", value: openaiApiKey });
  }

  for (const { key, value } of upserts) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  return NextResponse.json({ success: true });
}
